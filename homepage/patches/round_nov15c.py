"""Nov 15 (third round): new How heading; breathing room in the sample-sites section. Usage: round_nov15c.py in out"""
import sys
s = open(sys.argv[1]).read()
def rep(old, new, count):
    global s
    if s.count(old) != count: raise SystemExit(f"expected {count} of {old[:60]!r}, found {s.count(old)}")
    s = s.replace(old, new)
rep("From “ooh, nice” to your own site in three moves", "Three steps from a site you admire to your own", 4)
rep("/* ===== Version B, 2026-11-15 (second round) ===== */",
"""/* ===== Version B, 2026-11-15 (third round) ===== */
/* Sample sites: both rows scaled to 78% (same height, 307px), so the 950px section has about 60px of room above its title
   and below the rows instead of touching the cards above */
.pl-marquee .pl-ss{zoom:.78}

/* ===== Version B, 2026-11-15 (second round) ===== */""", 1)
open(sys.argv[2], "w").write(s)
