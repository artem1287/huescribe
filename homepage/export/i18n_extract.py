"""Find the translatable pieces of the built English page.

A piece is either the inner HTML of an element that holds text directly and only inline children (so a sentence
with a <b> or a link inside stays one piece), or a translatable attribute (alt, aria-label, title, placeholder,
meta content). Scripts, styles and SVG are skipped. Returns pieces in page order, de-duplicated.
"""
import json
import re
import sys

from bs4 import BeautifulSoup, NavigableString, Tag

INLINE = {"a", "b", "strong", "em", "i", "span", "kbd", "code", "br", "small", "sup", "sub", "u", "mark", "abbr", "time", "s"}
SKIP = {"script", "style", "svg", "noscript", "template"}
ATTRS = ("alt", "aria-label", "title", "placeholder")
META = {"description", "og:title", "og:description", "twitter:title", "twitter:description", "og:image:alt", "twitter:image:alt"}


def has_text(el):
    return any(isinstance(c, NavigableString) and c.strip() and not c.__class__.__name__ == "Comment" for c in el.children)


def all_inline(el):
    for c in el.descendants:
        if isinstance(c, Tag) and (c.name not in INLINE or c.name in SKIP):
            return False
    return True


def pieces(html):
    soup = BeautifulSoup(html, "html.parser")
    out = []

    def add(s):
        s = s.strip()
        if s and re.search(r"[A-Za-z]", s) and s not in out:
            out.append(s)
    if soup.title: add(soup.title.string or "")
    for m in soup.find_all("meta"):
        if (m.get("name") or m.get("property")) in META: add(m.get("content", ""))
    body = soup.body or soup
    for el in body.find_all(True):
        if el.name in SKIP or el.find_parent(SKIP):
            continue
        for a in ATTRS:
            if el.has_attr(a): add(el[a])
        if el.name in INLINE and el.parent and el.parent.name != "[document]" and all_inline(el.parent) and has_text(el.parent):
            continue  # part of its parent's piece
        if has_text(el) and all_inline(el):
            add(el.decode_contents())
        elif has_text(el):
            # mixed block: take each direct text run on its own
            for c in el.children:
                if isinstance(c, NavigableString) and c.strip(): add(str(c))
    return out


if __name__ == "__main__":
    ps = pieces(open(sys.argv[1], encoding="utf-8").read())
    json.dump(ps, open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(len(ps), "pieces,", sum(len(re.sub("<[^>]+>", "", p).split()) for p in ps), "words")
