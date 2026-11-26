"""Round nov18b (SEO and speed):
- The sample sites are pictures of made-up pages: their headings no longer join the page's own outline (Lighthouse
  "heading order"). The rows are hidden from assistive tech and the strip reads as one image with a description.
- Sections below the first screen skip rendering until they come near (content-visibility), so the first screen
  draws sooner and the off-screen marquee stops costing anything. The step cards (their sheets open in the top layer)
  and the closing section (scroll-driven animation) are left as they are."""
import sys
P = "/home/claude/homepage/project/VersionB.dc.html"
s = open(P, encoding="utf-8").read()


def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        sys.exit(f"expected {count} of {old[:80]!r}, found {n}")
    s = s.replace(old, new)


rep('<div class="pl-marquee" role="region" aria-label="Sites made with Huescribe">',
    '<div class="pl-marquee" role="img" aria-label="Twelve made-up sample sites, each borrowing one detail from somewhere else: '
    'a florist, a finance dashboard, an architecture studio, a coffee roaster, a meditation app, a running club, a parcel tracker, '
    'a ceramics shop, a bakery, a music school, a magazine and a solar installer.">')
rep('<ul class="pl-mq-row pl-mq-left">', '<ul class="pl-mq-row pl-mq-left" aria-hidden="true">')
rep('<ul class="pl-mq-row pl-mq-right">', '<ul class="pl-mq-row pl-mq-right" aria-hidden="true">')
css = ("\n/* ===== Version B, 2026-11-18: sections below the first screen render only when they come near (faster first paint) ===== */\n"
       '/* (each placeholder is the section\'s measured content height (inside its padding), so the page is the right length before they render) */\nsection[aria-labelledby="pl-made"],.pl-uses-band,section.pl-faqband,.pl-legal{content-visibility:auto}\nsection[aria-labelledby="pl-made"]{contain-intrinsic-size:auto 830px}.pl-uses-band{contain-intrinsic-size:auto 963px}section.pl-faqband{contain-intrinsic-size:auto 670px}.pl-legal{contain-intrinsic-size:auto 338px}\n@media (max-width:900px){section[aria-labelledby="pl-made"]{contain-intrinsic-size:auto 840px}.pl-uses-band{contain-intrinsic-size:auto 570px}section.pl-faqband{contain-intrinsic-size:auto 723px}.pl-legal{contain-intrinsic-size:auto 1030px}}\n'
       "/* Footer links are full-size touch targets (44px tall) */\n"
       ".pl-footer-row{align-items:center;padding-top:16px !important;padding-bottom:16px !important}.pl-footer-row a{display:inline-flex;align-items:center;min-height:44px}\n")
anchor = "/* ===== Version B, 2026-11-15 (eleventh round) ===== */"
rep(anchor, css.strip("\n") + "\n\n" + anchor)
open(P, "w", encoding="utf-8").write(s)
print("ok")
