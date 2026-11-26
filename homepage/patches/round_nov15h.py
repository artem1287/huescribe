"""Nov 15 (eighth round): the FAQ and closing sections are only as tall as their content (no 950px minimum), with 48 + 48px between them. Usage: round_nov15h.py in out"""
import sys
s = open(sys.argv[1]).read()
anchor = "/* ===== Version B, 2026-11-15 (seventh round) ===== */"
if s.count(anchor) != 1: raise SystemExit("anchor missing")
s = s.replace(anchor, """/* ===== Version B, 2026-11-15 (eighth round) ===== */
/* The FAQ and the closing call to action are as tall as their content: no 950px minimum, so no empty band between them */
@media (min-width: 901px){section.pl-faqband,section[aria-labelledby="pl-cta-title"]{min-height:0 !important}}
/* ...and they sit closer together: 48px under the questions plus 48px above the closing section (96px in all) */
main section.pl-faqband{padding-bottom:48px !important}
main section[aria-labelledby="pl-cta-title"]{padding-top:48px !important}

""" + anchor, 1)
open(sys.argv[2], "w").write(s)
