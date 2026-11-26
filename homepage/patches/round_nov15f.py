"""Nov 15 (sixth round): a different set of sample sites in the second row; the rows end at the text column's edges;
the FAQ fades out with an arrow to show the rest; a cleaner bottom picture. Usage: round_nov15f.py in out"""
import re, sys
s = open(sys.argv[1]).read()
def rep(old, new, count=1):
    global s
    if s.count(old) != count: raise SystemExit(f"expected {count} of {old[:70]!r}, found {s.count(old)}")
    s = s.replace(old, new)

# ---------- 1. Second row: six new fictional sites (then the same six again, hidden, for the seamless loop) ----------
ALPINE = "/_blob/5e8aaabd596e55afc228002d927104cc"
NEW = [
 ('parcel', '<div class="ss-nav"><b class="ss-brand">Parcel</b><span>Product</span><span>Pricing</span><span>Docs</span><i class="ss-cta">Start shipping</i></div><div class="ss-split"><div class="ss-copy"><small>Shipping API</small><h4>Labels, tracking and returns in one call.</h4><p>Connect 40+ carriers and ship from your store in an afternoon.</p><span class="ss-btns"><i class="ss-cta">Get an API key</i><i class="ss-ghost">Read the docs</i></span></div><div class="ss-track"><b>Order #4821</b><span class="on">Label created</span><span class="on">Picked up · Denver</span><span class="on">In transit</span><span>Out for delivery</span></div></div>'),
 ('ondine', '<div class="ss-nav"><b class="ss-brand">Ondine</b><span>Women</span><span>Men</span><span>Sale</span><i class="ss-ghost">Bag (1)</i></div><h4>Swimwear made for long summers.</h4><div class="ss-prods"><div><span class="sw"></span><b>Marée one-piece</b><small>$128</small></div><div><span class="sw s2"></span><b>Lagon bikini</b><small>$96</small></div><div><span class="sw s3"></span><b>Rivage shorts</b><small>$74</small></div></div>'),
 ('bake', '<div class="ss-nav"><b class="ss-brand">Kettle &amp; Crumb</b><span>Menu</span><span>Orders</span><span>Visit</span><i class="ss-cta">Pre-order</i></div><div class="ss-split"><div class="ss-copy"><small>Bakery · Portland</small><h4>Bread out of the oven at 7, gone by noon.</h4><p>Order tonight, pick up warm tomorrow morning.</p><span class="ss-btns"><i class="ss-cta">See today’s bakes</i></span></div><div class="ss-menu"><span><b>Country sourdough</b><i>$9</i></span><span><b>Cardamom bun</b><i>$4.50</i></span><span><b>Rye &amp; seed loaf</b><i>$10</i></span><span><b>Almond croissant</b><i>$5</i></span></div></div>'),
 ('music', '<div class="ss-nav"><b class="ss-brand">Tallis</b><span>Lessons</span><span>Teachers</span><span>Recitals</span><i class="ss-cta">Book a trial</i></div><div class="ss-split"><div class="ss-copy"><small>Music school</small><h4>Learn the piano you always meant to.</h4><p>One-to-one lessons for adults and kids, in person or online.</p></div><div class="ss-sched"><span><b>Mon · 5 pm</b>Beginner piano</span><span><b>Wed · 6 pm</b>Jazz harmony</span><span><b>Sat · 10 am</b>Kids choir</span></div></div>'),
 ('mag', f'<div class="ss-nav"><b class="ss-brand">Fieldwork</b><span>Issues</span><span>Essays</span><span>Archive</span><i class="ss-ghost">Subscribe</i></div><div class="ss-mag"><div class="ss-lead"><span class="ss-pic" style="background-image:url({ALPINE})"></span><small>Issue 12 · Mountains</small><h4>The last shepherds of the high meadows</h4></div><div class="ss-side"><span><small>Essay</small><b>Why we still walk</b></span><span><small>Field notes</small><b>A week without maps</b></span><span><small>Interview</small><b>The botanist who counts snow</b></span></div></div>'),
 ('solar', '<div class="ss-nav"><b class="ss-brand">Brightside</b><span>How it works</span><span>Reviews</span><i class="ss-cta">Get a quote</i></div><div class="ss-split"><div class="ss-copy"><small>Home solar</small><h4>See what your roof could save.</h4><p>A free estimate in two minutes, no sales call.</p></div><div class="ss-calc"><small>Monthly power bill</small><b>$142</b><span class="ss-bar"><i></i></span><small>Estimated savings</small><b class="big">$1,310 / year</b></div></div>'),
]
row2 = "".join(f'<li class="pl-ss pl-ss-{k}">{h}</li>' for k, h in NEW) + "".join(f'<li aria-hidden="true" class="pl-ss pl-ss-{k}">{h}</li>' for k, h in NEW)
m = re.search(r'(<ul class="pl-mq-row pl-mq-right">)(.*?)(</ul>)', s, re.S)
if not m: raise SystemExit("second row not found")
s = s[:m.start(2)] + row2 + s[m.end(2):]

# ---------- 2. FAQ: show the first part, fade the rest, an arrow button opens it all (no script: a checkbox) ----------
a = s.index('aria-labelledby="pl-faq-title"')
lst = '<div style="display: flex; flex-direction: column; width: 100%">'
i = s.index(lst, a)
end = s.index('</div>\n</div>\n</section>', i)
s = (s[:i] + '<div class="pl-faqwrap"><input type="checkbox" id="pl-faq-more" class="pl-sr-only pl-faq-toggle" aria-controls="pl-faqlist">'
     + '<div id="pl-faqlist" class="pl-faqlist" style="display: flex; flex-direction: column; width: 100%">' + s[i+len(lst):end]
     + '</div>\n<label for="pl-faq-more" class="pl-faq-more"><span class="pl-faq-more-a">Show all questions</span><span class="pl-faq-more-b">Show fewer</span>'
     + '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg></label></div>'
     + s[end:])

# ---------- 3. CSS ----------
rep("/* ===== Version B, 2026-11-15 (fifth round) ===== */", """/* ===== Version B, 2026-11-15 (sixth round) ===== */
/* Sample sites end where the text column ends (its edge lines), with a clean cut instead of running to the screen edges */
.pl-marquee{margin:48px 0 0 !important;mask-image:none !important;-webkit-mask-image:none !important}
/* Second row: six more fictional sites */
.pl-ss-parcel{background:#f6f7fb}.pl-ss-parcel h4{font-size:31px;line-height:1.08;letter-spacing:-.03em;font-weight:600;color:#1b1f3b}.pl-ss-parcel .ss-cta{background:#4b4bd6}
.pl-ss .ss-track{display:flex;flex-direction:column;gap:14px;padding:22px;border-radius:12px;background:#fff;box-shadow:0 0 0 1px rgba(27,31,59,.08),0 12px 28px -18px rgba(27,31,59,.4);font-size:13px;color:#8a8ea8}
.pl-ss .ss-track b{color:#1b1f3b;font-size:14px}.pl-ss .ss-track span{display:flex;align-items:center;gap:10px}
.pl-ss .ss-track span::before{content:"";width:9px;height:9px;border-radius:50%;border:2px solid #c9cbe0}.pl-ss .ss-track span.on{color:#1b1f3b}.pl-ss .ss-track span.on::before{background:#4b4bd6;border-color:#4b4bd6}
.pl-ss-ondine{background:#f3ece2}.pl-ss-ondine h4{margin:22px 0 18px;font-family:Newsreader,Georgia,serif;font-size:32px;letter-spacing:-.02em;color:#2a2420}
.pl-ss .ss-prods{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.pl-ss .ss-prods div{display:flex;flex-direction:column;gap:3px;font-size:13px}
.pl-ss .ss-prods .sw{height:170px;margin-bottom:8px;border-radius:8px;background:#d97d5b}.pl-ss .ss-prods .s2{background:#2f5d62}.pl-ss .ss-prods .s3{background:#e8c27a}
.pl-ss-bake{background:#fff8ef}.pl-ss-bake h4{font-family:Newsreader,Georgia,serif;font-size:31px;line-height:1.08;letter-spacing:-.02em;color:#3a2516}.pl-ss-bake .ss-cta{background:#b4532a}
.pl-ss .ss-menu{display:flex;flex-direction:column;padding:8px 20px;border-radius:12px;background:#fff;box-shadow:0 0 0 1px rgba(58,37,22,.08)}
.pl-ss .ss-menu span{display:flex;justify-content:space-between;padding:14px 0;border-bottom:1px dashed rgba(58,37,22,.15);font-size:14px}.pl-ss .ss-menu span:last-child{border:0}.pl-ss .ss-menu i{color:#b4532a}
.pl-ss-music{background:#221a2e;color:#f1e9f7}.pl-ss-music .ss-nav{color:#b9a9cc;border-color:rgba(255,255,255,.1)}.pl-ss-music h4{font-size:33px;line-height:1.05;letter-spacing:-.03em;font-weight:600}.pl-ss-music p,.pl-ss-music small{color:#b9a9cc}.pl-ss-music .ss-cta{background:#f2b84b;color:#221a2e}
.pl-ss .ss-sched{display:flex;flex-direction:column;gap:10px}.pl-ss .ss-sched span{display:flex;flex-direction:column;gap:2px;padding:14px 16px;border-radius:10px;background:#2e2440;border:1px solid rgba(255,255,255,.08);font-size:14px}.pl-ss .ss-sched b{font-size:12px;color:#f2b84b;font-weight:600}
.pl-ss-mag{background:#fbfaf7}.pl-ss-mag .ss-brand{font-family:Newsreader,Georgia,serif;font-size:20px}
.pl-ss .ss-mag{display:grid;grid-template-columns:2fr 1fr;gap:24px;padding-top:20px}.pl-ss .ss-lead{display:flex;flex-direction:column;gap:8px}.pl-ss .ss-pic{height:196px;border-radius:6px;background:center/cover}
.pl-ss .ss-lead h4{font-family:Newsreader,Georgia,serif;font-size:24px;line-height:1.1;letter-spacing:-.02em}.pl-ss .ss-side{display:flex;flex-direction:column}.pl-ss .ss-side span{display:flex;flex-direction:column;gap:4px;padding:14px 0;border-top:1px solid rgba(21,21,21,.1)}.pl-ss .ss-side b{font-family:Newsreader,Georgia,serif;font-size:17px;font-weight:500;line-height:1.2}
.pl-ss-solar{background:#fffbea}.pl-ss-solar h4{font-size:34px;line-height:1.04;letter-spacing:-.03em;font-weight:700;color:#1f2a1c}.pl-ss-solar .ss-cta{background:#1f2a1c}
.pl-ss .ss-calc{display:flex;flex-direction:column;gap:8px;padding:24px;border-radius:14px;background:#fff;box-shadow:0 0 0 1px rgba(31,42,28,.08),0 14px 30px -20px rgba(31,42,28,.45)}.pl-ss .ss-calc b{font-size:24px;color:#1f2a1c}.pl-ss .ss-calc b.big{font-size:30px;color:#3d8b3d}
.pl-ss .ss-bar{height:8px;margin:4px 0 12px;border-radius:99px;background:#f1ead0}.pl-ss .ss-bar i{display:block;width:62%;height:100%;border-radius:inherit;background:#f5b301}
/* FAQ: the first part shows, the rest fades out; "Show all questions" with a down arrow opens the whole list (the arrow flips) */
.pl-faqlist{position:relative;max-height:620px;overflow:hidden}
.pl-faqlist::after{content:"";position:absolute;left:0;right:0;bottom:0;height:180px;background:linear-gradient(rgba(255,255,255,0),#ffffff 85%);pointer-events:none}
.pl-faq-toggle:checked + .pl-faqlist{max-height:none}.pl-faq-toggle:checked + .pl-faqlist::after{display:none}
.pl-faq-more{display:inline-flex;align-items:center;gap:8px;min-height:44px;margin-top:4px;padding:0 18px;border-radius:999px;border:1px solid var(--pl-line);background:#fff;font-size:15px;font-weight:500;color:var(--pl-text);cursor:pointer;transition:background-color .2s ease}
.pl-faq-more:hover{background:#f4f4f1}.pl-faq-more svg{transition:transform .3s cubic-bezier(.22,1,.36,1)}
.pl-faq-more-b{display:none}.pl-faq-toggle:checked ~ .pl-faq-more .pl-faq-more-a{display:none}.pl-faq-toggle:checked ~ .pl-faq-more .pl-faq-more-b{display:inline}.pl-faq-toggle:checked ~ .pl-faq-more svg{transform:rotate(180deg)}
.pl-faq-toggle:focus-visible ~ .pl-faq-more{outline:2px solid var(--pl-accent-ink);outline-offset:3px}
.pl-faqwrap{display:flex;flex-direction:column;align-items:flex-start}
@media (min-width: 901px){.pl-faqband{height:auto !important;min-height:950px;overflow:visible !important}}
@media (prefers-reduced-motion: reduce){.pl-faq-more svg{transition:none}}
/* Bottom picture: the panel sits lower in the photo with room above it and runs off the bottom edge, like a window rising
   into view, instead of touching both edges */
.pl-cta-frame{display:block !important}
.pl-cta-shot{position:absolute !important;left:21%;top:9%;bottom:0;width:58% !important;overflow:hidden;border-radius:12px 12px 0 0 !important;box-shadow:0 0 0 1px rgba(21,21,21,.08),0 30px 60px -20px rgba(21,21,21,.55) !important}

/* ===== Version B, 2026-11-15 (fifth round) ===== */""")
open(sys.argv[2], "w").write(s)
print("ok")
