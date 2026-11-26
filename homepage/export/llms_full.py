"""Turn the built homepage into plain markdown for AI assistants (llms-full.txt).

Keeps the words a person reads: the headline, each section's heading and text, the use cases, the comparison table,
the step details and every FAQ answer. Leaves out what isn't content: the animated demo, the made-up sample sites,
hidden decoration, scripts, styles and icons.
"""
import re

from bs4 import BeautifulSoup, NavigableString

SKIP = {"script", "style", "svg", "noscript", "template", "button", "label", "input"}


def _text(el):
    """Visible text of an inline element, whitespace tidied."""
    return re.sub(r"\s+", " ", el.get_text(" ", strip=True)).replace(" .", ".").replace(" ,", ",").strip()


def _hidden(el):
    while el is not None and getattr(el, "attrs", None) is not None:
        cls = el.get("class") or []
        if el.get("aria-hidden") == "true" or el.get("id") == "demo" or "pl-marquee" in cls or "pl-sr-only" in cls:
            return True
        el = el.parent
    return False


def page_to_markdown(html):
    soup = BeautifulSoup(html, "html.parser")
    title = soup.title.get_text(strip=True) if soup.title else "Huescribe"
    desc = soup.find("meta", attrs={"name": "description"})
    out = [f"# {title}", ""]
    if desc:
        out += [f"> {desc['content']}", ""]
    seen = set()

    def emit(line):
        key = re.sub(r"\W+", "", line.lower())
        if key and key not in seen:
            seen.add(key)
            out.append(line)

    main = soup.find("main") or soup.body
    def wanted(tag):
        cls = tag.get("class") or []
        return tag.name in ("h1", "h2", "h3", "p", "li", "table", "details") or "pl-featline" in cls or (
            tag.get("id") == "pl-apps")

    for el in main.find_all(wanted):
        if el.get("id") == "pl-apps":  # the supported apps are plain names in a row
            names = [_text(n) for n in el.parent.select(".pl-app-name")]
            emit(f"\n## {_text(el)}\n\n" + ", ".join(names) + ".")
            continue
        if _hidden(el) or el.find_parent(list(SKIP)) or el.find_parent("table") or el.find_parent("details"):
            continue
        if el.name == "details":
            q = el.find("summary")
            a = " ".join(_text(p) for p in el.find_all("p"))
            if q and a:
                emit(f"\n### {_text(q)}\n\n{a}")
            continue
        if el.name == "table":
            rows = [[_text(c) for c in tr.find_all(["th", "td"])] for tr in el.find_all("tr")]
            if rows:
                rows[0][0] = rows[0][0] or " "
                emit("\n| " + " | ".join(rows[0]) + " |\n|" + "---|" * len(rows[0]) + "\n" +
                     "\n".join("| " + " | ".join(r) + " |" for r in rows[1:]) + "\n")
            continue
        # Skip containers whose text is repeated by their own children (a <li> holding <p>s, say).
        if el.name in ("p", "li") and el.find(["p", "li", "h2", "h3"]):
            continue
        t = _text(el)
        if not t or len(t) < 3:
            continue
        if el.name == "h1":
            emit(f"\n## {t}\n")
        elif el.name == "h2":
            emit(f"\n## {t}\n")
        elif el.name == "h3":
            emit(f"\n### {t}\n")
        elif el.name == "li":
            key = el.select_one(".pl-sheet-key")
            if key:  # step details: "key: what it does"
                rest = _text(el)[len(_text(key)):].strip()
                t = f"**{_text(key)}**: {rest}"
            emit(f"- {t}")
        else:
            emit(t)
    md = "\n".join(out)
    md = re.sub(r"\n{3,}", "\n\n", md).strip() + "\n"
    return md


if __name__ == "__main__":
    import sys
    print(page_to_markdown(open(sys.argv[1], encoding="utf-8").read()))
