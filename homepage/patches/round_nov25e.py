"""Round nov25e: even spacing between sections, and animations keep looping on touch screens.

Spacing: 128px between big sections on wide screens and 96px on phones (it was 96 to 192px), a tighter
CTA heading, and less empty room between the hero buttons and the demo on phones.
Looping: the "pause while the pointer is on it" rules now apply only to devices with a real mouse. On a
phone a tap leaves :hover stuck, which froze the demo and the How-it-works pictures until another tap."""
P = "/home/claude/homepage/project/VersionB.dc.html"
s = open(P, encoding="utf-8").read()

CSS = """
/* ===== round nov25e: section spacing and loops on touch screens ===== */
section[aria-labelledby="pl-how"]{padding-bottom:64px !important}
section[aria-labelledby="pl-made"]{padding-top:64px !important;padding-bottom:64px !important}
section.pl-faqband[aria-labelledby="pl-faq-title"]{padding-top:64px !important;padding-bottom:64px !important}
.pl-reads{margin-top:-8px}
.pl-cta-text > .pl-display{margin-bottom:0 !important}
@media (max-width:900px){
section[aria-labelledby="pl-how"]{padding-top:64px !important;padding-bottom:48px !important}
section[aria-labelledby="pl-made"]{padding-top:48px !important;padding-bottom:48px !important}
section.pl-faqband[aria-labelledby="pl-faq-title"]{padding-top:48px !important;padding-bottom:56px !important}
.pl-marquee{margin-top:32px !important}
}
@media (max-width:640px){
.pl-anim.pl-h{margin-top:24px !important}
}
/* Touch screens: no pause on (stuck) hover, so every animation keeps looping; the "Hover to pause" hint is hidden */
@media (hover:none),(pointer:coarse){
.pl-anim:hover *{animation-play-state:running !important}
.pl-howcard:hover :is(.pl-lp,.pl-kup,.pl-picktoast,.pl-chip,.pl-addbtn,.pl-key,.pl-reply,.pl-done),.pl-cta-frame:hover .pl-lp,.pl-cta-frame:hover .pl-c4-scroll,.pl-marquee:hover .pl-mq-row{animation-play-state:running}
.pl-howcard:hover :is(.pl-c1-tag,.pl-c1-read,.pl-c1-read > span,.pl-c2-val,.pl-c3-copied,.pl-c3-think,.pl-c3-step,.pl-c3-cards,.pl-c3-cards i){animation-play-state:running}
.pl-pausehint{display:none !important}
}
"""
if "round nov25e" in s:
    raise SystemExit("already there")
i = s.index("</style>")
s = s[:i] + CSS + s[i:]
open(P, "w", encoding="utf-8").write(s)
print("round_nov25e applied")
