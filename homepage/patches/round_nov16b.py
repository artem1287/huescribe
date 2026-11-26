"""Round nov16b: the demo panel's logo becomes the four-petal mark; the headline breaks after the question."""
import re, sys
P = "/home/claude/homepage/project/VersionB.dc.html"
s = open(P, encoding="utf-8").read()
OLD_ICON = re.compile(r'<span aria-hidden="true" style="display: grid; place-items: center; width: 22px; height: 22px; border-radius: 6px; background: var\(--pl-accent\); color: #151515"><svg width="13" height="13" viewBox="0 0 24 24"[^>]*><path d="M5 9l3-3 3 3M8 6v10M13 12h6M13 16h4"></path></svg></span>')
n = len(OLD_ICON.findall(s))
if n != 4:
    sys.exit(f"expected 4 demo logos, found {n}")
MARK = ('<span aria-hidden="true" style="display: grid; place-items: center; width: 22px; height: 22px; border-radius: 6px; background: #ffffff; '
        'box-shadow: inset 0 0 0 1px rgba(17,17,19,0.12); color: #151515"><svg width="17" height="17" viewBox="10 10 44 44" aria-hidden="true">'
        '<g fill="currentColor"><circle cx="42.61" cy="21.39" r="11"></circle><circle cx="42.61" cy="42.61" r="11"></circle><circle cx="21.39" cy="42.61" r="11"></circle><circle cx="21.39" cy="21.39" r="11"></circle></g><circle cx="32" cy="32" r="10.5" fill="#ffffff"></circle>'
        '<path d="M27 31q5 6 10 0" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"></path></svg></span>')
s = OLD_ICON.sub(MARK, s)
old = "See a design you love? Bring it to your own site."
if s.count(old) != 1:
    sys.exit("headline not found")
s = s.replace(old, "See a design you love?<br>Bring it to your own site.")
open(P, "w", encoding="utf-8").write(s)
print("ok")
