"""Nov 15 (fourth round): the rolling button labels come back; hover turns buttons lighter (pressed lighter still).
Usage: round_nov15d.py in out"""
import re, sys
s = open(sys.argv[1]).read()
def rep(old, new, count):
    global s
    if s.count(old) != count: raise SystemExit(f"expected {count} of {old[:60]!r}, found {s.count(old)}")
    s = s.replace(old, new)

# Markup: the label and a hidden twin that rolls in from below (buttons and "See it" pills)
n1 = len(re.findall(r'<span>([^<]+)</span>(?=<span class="pl-arw")', s))
s = re.sub(r'<span>([^<]+)</span>(?=<span class="pl-arw")',
           r'<span class="pl-roll"><span class="pl-roll-a">\1</span><span class="pl-roll-b" aria-hidden="true">\1</span></span>', s)
n2 = len(re.findall(r'<span>See it</span>(?=<span class="pl-arrow")', s))
s = re.sub(r'<span>See it</span>(?=<span class="pl-arrow")',
           '<span class="pl-roll"><span class="pl-roll-a">See it</span><span class="pl-roll-b">See it</span></span>', s)
print("rolling labels:", n1, "buttons,", n2, "See it pills")
if n1 != 4 or n2 != 3: raise SystemExit("unexpected label count")

# Hover: lighter than rest (rest #B9D96A, hover #cbe38a, pressed #dcecb0); the clear button lightens too
rep(".pl-btn-main:hover{background:#9fbf4c !important;border-color:#9fbf4c !important}", ".pl-btn-main:hover{background:#cbe38a !important;border-color:#cbe38a !important}", 1)
rep(".pl-btn-quiet:hover{background:rgba(21,21,21,.18) !important;color:#ffffff !important}", ".pl-btn-quiet:hover{background:rgba(255,255,255,.16) !important;color:#ffffff !important}", 1)
rep(".pl-howcard:is(:hover,:focus-within) .pl-seeit{background:#9fbf4c !important;border-color:#9fbf4c !important}", ".pl-howcard:is(:hover,:focus-within) .pl-seeit{background:#cbe38a !important;border-color:#cbe38a !important}", 1)
rep(".pl-btn-main:active{background:#d3e7a0 !important;border-color:#d3e7a0 !important}", ".pl-btn-main:active{background:#dcecb0 !important;border-color:#dcecb0 !important}", 1)
rep(".pl-btn-quiet:active{background:rgba(255,255,255,.24) !important}", ".pl-btn.pl-btn-quiet:active{background:rgba(255,255,255,.28) !important}", 1)
rep(".pl-howcard:active .pl-seeit{background:#d3e7a0 !important;border-color:#d3e7a0 !important}", ".pl-howcard:active .pl-seeit{background:#dcecb0 !important;border-color:#dcecb0 !important}", 1)
rep("/* Buttons: the fill turns darker on hover (labels stay still) */", "/* Buttons: on hover the label rolls up (a copy rises in from below) and the fill turns lighter */", 1)

rep("/* ===== Version B, 2026-11-15 (third round) ===== */", """/* ===== Version B, 2026-11-15 (fourth round) ===== */
/* Rolling labels (ideogram.ai), back at the user's request: the label slides up and fades, its twin rises in from below */
.pl-roll{position:relative;display:inline-grid;overflow:hidden}
.pl-roll-a,.pl-roll-b{grid-area:1/1;transition:transform .32s cubic-bezier(.22,1,.36,1),opacity .24s}
.pl-roll-b{transform:translateY(100%);opacity:0}
.pl-btn:hover .pl-roll-a,.pl-howcard:is(:hover,:focus-within) .pl-seeit .pl-roll-a{transform:translateY(-100%);opacity:0}
.pl-btn:hover .pl-roll-b,.pl-howcard:is(:hover,:focus-within) .pl-seeit .pl-roll-b{transform:none;opacity:1}
@media (prefers-reduced-motion: reduce){.pl-roll-a,.pl-roll-b{transition:none}.pl-btn:hover .pl-roll-a,.pl-howcard:hover .pl-seeit .pl-roll-a{transform:none;opacity:1}.pl-btn:hover .pl-roll-b,.pl-howcard:hover .pl-seeit .pl-roll-b{opacity:0}}

/* ===== Version B, 2026-11-15 (third round) ===== */""", 1)
open(sys.argv[2], "w").write(s)
