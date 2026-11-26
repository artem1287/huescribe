"""Language versions of the homepage: /<lang>/index.html for every translation in i18n/site/<lang>.json.

Called by build_site.py after the English page is written:
- adds the language picker to the footer of every page (English included) and alternate-language links to <head>;
- translates each page (i18n_site.translate_page), sets <html lang dir>, fixes relative paths (one folder down);
- headings in scripts Newsreader lacks (Cyrillic, CJK, Devanagari, Arabic) use Inter / the system sans.
Privacy and terms stay English; each page links to the English copies.
"""
import json
import os
import re

from i18n_site import LANGS, HREFLANG, translate_page

ORDER = ["en", "es", "pt", "fr", "de", "it", "tr", "id", "vi", "ru", "ar", "hi", "zh", "ja", "ko"]
SANS_HEADINGS = ("ru", "ar", "hi", "zh", "ja", "ko")
LANG_CSS = (
    # Language picker in the footer: a wrapping row of links, each at least 44px tall.
    ".pl-langs{display:flex;flex-wrap:wrap;justify-content:center;gap:0 14px;margin:0 auto;padding:4px 20px 0;max-width:1300px;font-size:14px}"
    ".pl-langs a{display:inline-flex;align-items:center;min-height:44px;color:inherit;text-decoration:none;opacity:.75}"
    ".pl-langs a:hover{opacity:1;text-decoration:underline;text-underline-offset:3px}"
    ".pl-langs a[aria-current]{opacity:1;font-weight:600}"
    # Scripts Newsreader doesn't cover: sans headings, a little less tight.
    + "".join(f"html:lang({c}) .pl-display," for c in SANS_HEADINGS).rstrip(",")
    + "{font-family:Inter,system-ui,-apple-system,'Segoe UI','Noto Sans','PingFang SC','Hiragino Sans','Apple SD Gothic Neo','Noto Sans Devanagari','Noto Sans Arabic',sans-serif !important;letter-spacing:-.02em !important;font-weight:600 !important}"
    # CJK: no negative tracking, a touch more line height.
    "html:is(:lang(zh),:lang(ja),:lang(ko)) .pl-display{letter-spacing:0 !important;line-height:1.2 !important}"
    "html:is(:lang(zh),:lang(ja),:lang(ko)) body{line-break:strict;word-break:normal;overflow-wrap:anywhere}"
    # Japanese: break lines between phrases, not inside words (Chrome 119+; others ignore it).
    "html:lang(ja) :is(h1,h2,h3,p,.pl-display){word-break:auto-phrase}"
    "html:lang(ko) :is(h1,h2,h3,p,.pl-display){word-break:keep-all}"
)


def href_for(target, current):
    """Relative link from the page of `current` to the page of `target`."""
    if current == "en":
        return "./" if target == "en" else f"{target}/"
    return "../" if target == "en" else f"../{target}/"


def picker(current, langs):
    links = []
    for c in [x for x in ORDER if x in langs]:
        native = LANGS[c][0]
        cur = ' aria-current="page"' if c == current else ""
        links.append(f'<a href="{href_for(c, current)}" hreflang="{HREFLANG.get(c, c)}" lang="{HREFLANG.get(c, c)}"{cur}>{native}</a>')
    return '<nav class="pl-langs" aria-label="Language">' + "".join(links) + "</nav>"


def alternates(current, langs):
    out = [f'<link rel="alternate" hreflang="{HREFLANG.get(c, c)}" href="{href_for(c, current)}">' for c in ORDER if c in langs]
    out.append(f'<link rel="alternate" hreflang="x-default" href="{href_for("en", current)}">')
    return "\n".join(out)


def one_folder_down(html):
    """Asset and page links in a /<lang>/ page point back up to the site root."""
    html = re.sub(r'(?<=["(\s,])(images|assets)/', r"../\1/", html)
    html = re.sub(r'href="(privacy|terms)\.html', r'href="../\1.html', html)
    return html


def build(out_dir, i18n_dir):
    langs = ["en"] + [c for c in ORDER if c != "en" and os.path.exists(os.path.join(i18n_dir, f"{c}.json"))]
    index_path = os.path.join(out_dir, "index.html")
    english = open(index_path, encoding="utf-8").read()
    english = english.replace("</style>", LANG_CSS + "\n</style>", 1)

    def finish(html, code):
        html = html.replace('</footer>', picker(code, langs) + '\n</footer>', 1)
        html = html.replace('</head>', alternates(code, langs) + '\n</head>', 1)
        return html

    open(index_path, "w", encoding="utf-8").write(finish(english, "en"))
    built = []
    for code in langs[1:]:
        table = json.load(open(os.path.join(i18n_dir, f"{code}.json"), encoding="utf-8"))
        html = translate_page(english, table)
        tag, direction = HREFLANG.get(code, code), LANGS[code][2]
        html = re.sub(r'<html lang="en"[^>]*>', f'<html lang="{tag}" dir="{direction}">', html, count=1)
        html = html.replace('"inLanguage": "en"', f'"inLanguage": "{tag}"')
        html = one_folder_down(finish(html, code))
        os.makedirs(os.path.join(out_dir, code), exist_ok=True)
        open(os.path.join(out_dir, code, "index.html"), "w", encoding="utf-8").write(html)
        built.append(code)
    return built
