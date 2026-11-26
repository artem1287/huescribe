"""Website translation: source strings out of the built English page, translated pages back in.

source:  python3 i18n_site.py source <built index.html> <out source.json>
  Writes [{"id", "text", "kind"}]. HTML tags inside a piece become numbered markers (⟨0⟩…⟨/0⟩, ⟨1/⟩) so a
  translator only sees words; brand and product names are listed in KEEP and never sent.
build:   used by build_site.py: translate_page(html, lang, table) -> translated html.

A translation file i18n/site/<lang>.json maps id -> translated text (markers kept). A missing id falls back to
English, so a half-done language still builds.
"""
import hashlib
import json
import re
import sys

from bs4 import BeautifulSoup, NavigableString, Tag, Comment

INLINE = {"a", "b", "strong", "em", "i", "span", "kbd", "code", "br", "small", "sup", "sub", "u", "mark", "abbr", "time", "s"}
SKIP = {"script", "style", "svg", "noscript", "template"}
ATTRS = ("alt", "aria-label", "title", "placeholder")
META = {"description", "og:title", "og:description", "twitter:title", "twitter:description", "og:image:alt", "twitter:image:alt"}
LD_KEYS = {"name", "description", "text"}

# Never translated: product, app and made-up brand names, keys, file names, code-like text.
KEEP = {
    "Huescribe", "Claude Code", "Cursor", "ChatGPT", "Gemini", "Claude", "Windsurf", "Copilot", "Lovable", "v0", "Bolt",
    "Fern &amp; Field", "Ledgerly", "ATELIER BRUN", "Northwind Coffee", "Quiet Hours", "STRIDE CLUB", "Parcel", "Ondine",
    "Kettle &amp; Crumb", "Tallis", "Fieldwork", "Brightside", "Marée one-piece", "Lagon bikini", "Rivage shorts",
    "acme.dev", "fieldnote.app/pricing", "V", "Esc", "pricing.html updated",
    # the footer language picker lists each language in its own name
    "English", "Español", "Português", "Français", "Deutsch", "Italiano", "Türkçe", "Bahasa Indonesia", "Tiếng Việt",
    "Claude Code ⌄", "Cursor ⌄", "Aa",
}

LANGS = {  # code: (native name, English name, dir)
    "en": ("English", "English", "ltr"), "zh": ("中文", "Chinese (Simplified)", "ltr"), "es": ("Español", "Spanish", "ltr"),
    "ar": ("العربية", "Arabic", "rtl"), "pt": ("Português", "Portuguese (Brazil)", "ltr"), "id": ("Bahasa Indonesia", "Indonesian", "ltr"),
    "fr": ("Français", "French", "ltr"), "ja": ("日本語", "Japanese", "ltr"), "ru": ("Русский", "Russian", "ltr"),
    "de": ("Deutsch", "German", "ltr"), "hi": ("हिन्दी", "Hindi", "ltr"), "ko": ("한국어", "Korean", "ltr"),
    "tr": ("Türkçe", "Turkish", "ltr"), "vi": ("Tiếng Việt", "Vietnamese", "ltr"), "it": ("Italiano", "Italian", "ltr"),
}
HREFLANG = {"zh": "zh-Hans", "pt": "pt-BR"}


def pid(text):
    return hashlib.sha1(text.encode("utf-8")).hexdigest()[:10]


def has_text(el):
    return any(isinstance(c, NavigableString) and not isinstance(c, Comment) and c.strip() for c in el.children)


def all_inline(el):
    return all(not isinstance(c, Tag) or (c.name in INLINE and c.name not in SKIP) for c in el.descendants)


def translatable(s):
    s = s.strip()
    return bool(s) and bool(re.search(r"[A-Za-z]", re.sub(r"<[^>]+>", "", s))) and s not in KEEP


# ---------- markers: tags out, numbered placeholders in ----------
TAG = re.compile(r"<(/?)([a-zA-Z0-9]+)([^>]*?)(/?)>")


def to_markers(html):
    tags, stack, out, pos = [], [], [], 0
    for m in TAG.finditer(html):
        out.append(html[pos:m.start()]); pos = m.end()
        closing, name = m.group(1), m.group(2).lower()
        selfclose = bool(m.group(4)) or name == "br"
        if closing:
            n = stack.pop() if stack else len(tags)
            out.append(f"⟨/{n}⟩")
        elif selfclose:
            tags.append(m.group(0)); out.append(f"⟨{len(tags) - 1}/⟩")
        else:
            tags.append(m.group(0)); stack.append(len(tags) - 1); out.append(f"⟨{len(tags) - 1}⟩")
    out.append(html[pos:])
    return "".join(out), tags


def from_markers(text, tags):
    def open_(m):
        i = int(m.group(1)); return tags[i] if i < len(tags) else ""

    def close(m):
        i = int(m.group(1))
        if i >= len(tags): return ""
        name = TAG.match(tags[i]).group(2)
        return f"</{name}>"
    text = re.sub(r"⟨(\d+)/⟩", open_, text)
    text = re.sub(r"⟨/(\d+)⟩", close, text)
    return re.sub(r"⟨(\d+)⟩", open_, text)


# ---------- walking the page ----------
def walk(soup, visit_html, visit_text, visit_attr):
    """Calls visit_* for every translatable spot; each returns a replacement or None."""
    if soup.title and soup.title.string:
        r = visit_text(soup.title.string)
        if r is not None: soup.title.string = r
    for m in soup.find_all("meta"):
        if (m.get("name") or m.get("property")) in META and m.get("content"):
            r = visit_attr(m["content"])
            if r is not None: m["content"] = r
    body = soup.body or soup
    for el in list(body.find_all(True)):
        if el.name in SKIP or el.find_parent(SKIP):
            continue
        # translate="no": product chrome and code that stay as they are in every language
        if el.get("translate") == "no" or el.find_parent(attrs={"translate": "no"}):
            continue
        for a in ATTRS:
            if el.has_attr(a):
                r = visit_attr(el[a])
                if r is not None: el[a] = r
        parent = el.parent
        if el.name in INLINE and isinstance(parent, Tag) and parent.name not in ("[document]", "body") and has_text(parent) and all_inline(parent):
            continue
        if has_text(el) and all_inline(el):
            inner = el.decode_contents()
            r = visit_html(inner)
            if r is not None:
                lead = inner[:len(inner) - len(inner.lstrip())]; trail = inner[len(inner.rstrip()):]
                el.clear(); el.append(BeautifulSoup(lead + r + trail, "html.parser"))
        elif has_text(el):
            for c in list(el.children):
                if isinstance(c, NavigableString) and not isinstance(c, Comment) and c.strip():
                    r = visit_text(str(c))
                    if r is not None:
                        lead = str(c)[:len(str(c)) - len(str(c).lstrip())]; trail = str(c)[len(str(c).rstrip()):]
                        c.replace_with(lead + r + trail)
    for sc in soup.find_all("script", type="application/ld+json"):
        data = json.loads(sc.string)

        def fix(o):
            if isinstance(o, dict):
                for k, v in o.items():
                    if k in LD_KEYS and isinstance(v, str):
                        r = visit_attr(v)
                        if r is not None: o[k] = r
                    else: fix(v)
            elif isinstance(o, list):
                for i, v in enumerate(o):
                    if isinstance(v, str):
                        r = visit_attr(v)
                        if r is not None: o[i] = r
                    else: fix(v)
        fix(data)
        sc.string = json.dumps(data, ensure_ascii=False)


def source(html):
    soup = BeautifulSoup(html, "html.parser")
    items, seen = [], set()

    def add(text, kind):
        t = text.strip()
        if not translatable(t): return None
        marked, _ = to_markers(t) if kind == "html" else (t, [])
        i = pid(t)
        if i not in seen:
            seen.add(i); items.append({"id": i, "kind": kind, "text": marked})
        return None
    walk(soup, lambda h: add(h, "html"), lambda t: add(t, "text"), lambda a: add(a, "attr"))
    return items


def translate_page(html, table):
    """table: id -> translated text with markers."""
    soup = BeautifulSoup(html, "html.parser")

    def tr(text, kind):
        t = text.strip()
        if not translatable(t): return None
        out = table.get(pid(t))
        if not out: return None
        if kind == "html":
            _, tags = to_markers(t)
            return from_markers(out, tags)
        return out
    walk(soup, lambda h: tr(h, "html"), lambda t: tr(t, "text"), lambda a: tr(a, "attr"))
    return str(soup)


if __name__ == "__main__":
    if sys.argv[1] == "source":
        items = source(open(sys.argv[2], encoding="utf-8").read())
        json.dump(items, open(sys.argv[3], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print(len(items), "strings")
