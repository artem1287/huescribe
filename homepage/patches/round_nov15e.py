"""Nov 15 (fifth round): the "Three steps" section no longer scrolls inside itself; it grows to fit (at least 950px).
Usage: round_nov15e.py in out"""
import sys
s = open(sys.argv[1]).read()
old = "/* ===== Version B, 2026-11-15 (fourth round) ===== */"
if s.count(old) != 1: raise SystemExit("anchor missing")
s = s.replace(old, """/* ===== Version B, 2026-11-15 (fifth round) ===== */
/* "Three steps from a site you admire to your own": no scrolling inside the section; it is as tall as its content (at least 950px) */
@media (min-width: 901px){section[aria-labelledby="pl-how"]{height:auto !important;min-height:950px;overflow:visible !important}}

""" + old, 1)
open(sys.argv[2], "w").write(s)
