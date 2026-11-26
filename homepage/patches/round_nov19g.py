"""Round nov19g: text selection is a soft lime highlighter (#d6eb9a) with ink text, instead of dark olive with white."""
import sys
P = "/home/claude/homepage/project/VersionB.dc.html"
s = open(P, encoding="utf-8").read()
o = "::selection{background:#5b6f2a;color:#ffffff}"
if s.count(o) != 1:
    sys.exit("selection rule not found")
open(P, "w", encoding="utf-8").write(s.replace(o, "::selection{background:#d6eb9a;color:#151515}"))
print("ok")
