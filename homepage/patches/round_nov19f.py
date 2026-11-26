"""Round nov19f: larger serif headings (Newsreader .pl-display: hero headline and section titles).

Was clamp(28px, 3.48vw, 50px); now clamp(34px, 4.9vw, 72px). Placeholder heights re-measured by hand afterwards
(pl-made 850 / 837 on phones, FAQ 824 on phones).
"""
import sys

P = "/home/claude/homepage/project/VersionB.dc.html"
s = open(P, encoding="utf-8").read()
if "clamp(34px,4.9vw,72px)" in s:
    sys.exit("already applied")
s = s.replace("</style>", "\n/* ===== Version B, 2026-11-19: larger serif headings ===== */\n"
              "main h1.pl-display,main .pl-display{font-size:clamp(34px,4.9vw,72px) !important}\n</style>", 1)
open(P, "w", encoding="utf-8").write(s)
print("ok")
