"""Version B, 2026-11-14 (second round): arrows on every button, a different flower photo per app block,
and sample sites in "Made with PromptLift" that look like real, professional websites.
Usage: python3 round_nov14b.py <in.dc.html> <out.dc.html>"""
import re
import sys

src, dst = sys.argv[1], sys.argv[2]
s = open(src).read()


def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit(f'expected {count}, found {n}: {old[:90]!r}')
    s = s.replace(old, new)


# ---------- 1. one up-right arrow on every button (leading icons go, so each button reads the same) ----------
ARROW = ('<span class="pl-arw" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
         'stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7"></path><path d="M8 7h9v9"></path></svg></span>')
DOWNLOAD = re.compile(r'<svg width="1[45]" height="1[45]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M6 11l6 6 6-6M5 21h14"></path></svg>\n?')
PLAY = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 5v14l11-7z"></path></svg>\n'
s, n_dl = DOWNLOAD.subn('', s)
rep(PLAY, '')
# every rolling label inside a .pl-btn gets the arrow right after it
s, n_btn = re.subn(r'(<a [^>]*class="pl-btn [^"]*"[^>]*>\s*<span class="pl-roll">.*?</span></span>)', lambda m: m.group(1) + ARROW, s, flags=re.S)
# "See it" pills: the arrow points up and to the right too
rep('<path d="M5 12h14M12 5l7 7-7 7"></path>', '<path d="M7 17 17 7"></path><path d="M8 7h9v9"></path>', 3)

# ---------- 2. sample sites: real-looking, professional pages (fictional brands; replace with real sites later) ----------
LAV, DAISY, ALP, COS = ('/_blob/3ebdee5b6df9c1f8efb5b38f2d8dd974', '/_blob/bed43d89031baa236a337d6280d4ea7d',
                        '/_blob/5e8aaabd596e55afc228002d927104cc', '/_blob/ad089e0a77baace4033d5906642d8977')
SITES = [
    # a florist: photo half, serif headline
    '''<li class="pl-ss pl-ss-flor"><div class="ss-nav"><b class="ss-brand">Fern &amp; Field</b><span>Bouquets</span><span>Weddings</span><span>Journal</span><i class="ss-cta">Order</i></div><div class="ss-split"><div class="ss-copy"><small>Seasonal flowers, Brooklyn</small><h4>Flowers picked this morning, at your door by noon.</h4><p>Hand-tied bouquets from local growers. Free delivery over $60.</p><span class="ss-btns"><i class="ss-cta">Shop bouquets</i><i class="ss-ghost">Subscriptions</i></span></div><div class="ss-photo" style="background-image:url(DAISY)"></div></div></li>''',
    # a finance dashboard: dark, numbers, a chart
    '''<li class="pl-ss pl-ss-fin"><div class="ss-nav"><b class="ss-brand">Ledgerly</b><span>Overview</span><span>Invoices</span><span>Reports</span><i class="ss-cta">New invoice</i></div><div class="ss-dash"><div class="ss-kpi"><small>Revenue · Oct</small><b>$48,210</b><em>+12.4%</em></div><div class="ss-kpi"><small>Outstanding</small><b>$6,930</b><em class="dn">−3.1%</em></div><div class="ss-kpi"><small>Paid on time</small><b>94%</b><em>+2 pts</em></div><div class="ss-chart"><svg viewBox="0 0 400 110" preserveAspectRatio="none"><path d="M0 92 L40 84 L80 88 L120 70 L160 74 L200 56 L240 60 L280 42 L320 46 L360 28 L400 22" fill="none" stroke="#7dd3a8" stroke-width="3"/><path d="M0 92 L40 84 L80 88 L120 70 L160 74 L200 56 L240 60 L280 42 L320 46 L360 28 L400 22 L400 110 L0 110Z" fill="rgba(125,211,168,.14)"/></svg></div></div></li>''',
    # an architecture studio: big type, image grid
    '''<li class="pl-ss pl-ss-arch"><div class="ss-nav"><b class="ss-brand">ATELIER BRUN</b><span>Projects</span><span>Studio</span><span>Contact</span></div><h4>Quiet buildings for<br>busy places.</h4><div class="ss-grid"><span style="background-image:url(ALP)"></span><span></span><span></span></div></li>''',
    # a coffee roaster: warm, product card
    '''<li class="pl-ss pl-ss-cafe"><div class="ss-nav"><b class="ss-brand">Northwind Coffee</b><span>Shop</span><span>Subscriptions</span><span>Visit</span><i class="ss-cta">Cart (2)</i></div><div class="ss-split"><div class="ss-copy"><small>New harvest</small><h4>Small-batch coffee, roasted every Tuesday.</h4><p>Single-origin beans from three farms we visit every year.</p><span class="ss-btns"><i class="ss-cta">Shop beans</i></span></div><div class="ss-cards"><div><span class="ss-bag"></span><b>Huila, Colombia</b><small>Cherry · cocoa · $19</small></div><div><span class="ss-bag b2"></span><b>Sidama, Ethiopia</b><small>Peach · jasmine · $21</small></div></div></div></li>''',
    # a wellness app: phone mock, soft colors
    '''<li class="pl-ss pl-ss-calm"><div class="ss-nav"><b class="ss-brand">Quiet Hours</b><span>Features</span><span>Pricing</span><i class="ss-cta">Get the app</i></div><div class="ss-split"><div class="ss-copy"><h4>Ten calm minutes, every evening.</h4><p>Guided wind-downs and a sleep journal that learns what helps you rest.</p><span class="ss-btns"><i class="ss-cta">Start free</i><i class="ss-ghost">4.8 ★ App Store</i></span></div><div class="ss-phone"><div style="background-image:url(LAV)"></div><b>Tonight</b><small>Slow breathing · 10 min</small></div></div></li>''',
    # a running-club landing: bold sans, photo band
    '''<li class="pl-ss pl-ss-run"><div class="ss-nav"><b class="ss-brand">STRIDE CLUB</b><span>Routes</span><span>Events</span><span>Members</span><i class="ss-cta">Join</i></div><div class="ss-band" style="background-image:url(COS)"><h4>Saturday 10K<br>through the gardens.</h4><i class="ss-cta">Save my spot</i></div><div class="ss-stats"><span><b>1,240</b> members</span><span><b>38</b> routes</span><span><b>Every</b> Saturday, 8 am</span></div></li>''',
]
SITES = [x.replace('DAISY', DAISY).replace('ALP', ALP).replace('COS', COS).replace('LAV', LAV) for x in SITES]


def row(order, small):
    cls = ' pl-ss-sm' if small else ''
    one = ''.join(SITES[i].replace('<li class="pl-ss ', f'<li class="pl-ss{cls} ', 1) for i in order)
    return one + one.replace('<li class="pl-ss', '<li aria-hidden="true" class="pl-ss')


start = s.index('<ul class="pl-mq-row pl-mq-left">')
end = s.index('</ul>', s.index('<ul class="pl-mq-row pl-mq-right">')) + len('</ul>')
s = s[:start] + (f'<ul class="pl-mq-row pl-mq-left">{row([0, 1, 2, 3, 4, 5], False)}</ul>\n'
                 f'<ul class="pl-mq-row pl-mq-right">{row([3, 4, 5, 0, 1, 2], True)}</ul>') + s[end:]
rep('<!-- Websites made with PromptLift (framer.com layout)',
    '<!-- Sample sites below are fictional placeholders (Fern & Field, Ledgerly, Atelier Brun, Northwind Coffee, Quiet Hours, Stride Club): replace them with real sites made with PromptLift. -->\n<!-- Websites made with PromptLift (framer.com layout)')

css = f'''
/* ===== Version B, 2026-11-14 (second round) ===== */
/* Every button: one arrow pointing up and to the right after the label; on hover it moves a little that way */
.pl-arw{{display:inline-flex;transition:transform .32s cubic-bezier(.22,1,.36,1)}}
.pl-btn:hover .pl-arw{{transform:translate(2px,-2px)}}
.pl-howcard:hover .pl-arrow{{transform:translate(2px,-2px) !important}}
@media (prefers-reduced-motion: reduce){{.pl-arw{{transition:none}}.pl-btn:hover .pl-arw,.pl-howcard:hover .pl-arrow{{transform:none !important}}}}
/* A different flower photo behind each block that shows the app (Unsplash: Daniel Klein, Dmytro Korobka, Angel Luciano, Tracy Brower) */
.pl-pickstage{{background:#7d6fa8 url({LAV}) 50% 60% / cover no-repeat !important}}
.pl-choosestage{{background:#2f3a22 url({DAISY}) 60% 50% / cover no-repeat !important}}
.pl-howstage{{background:#5d7a3a url({ALP}) 50% 100% / cover no-repeat !important}}
.pl-cta-frame{{background:#7a6a4a url({COS}) 50% 70% / cover no-repeat !important}}
/* Sample sites (Made with PromptLift): fictional but realistic pages, drawn at 700×394 and scaled down for the small row */
.pl-ss{{position:relative;flex:none;width:700px;height:394px;box-sizing:border-box;overflow:hidden;border-radius:12px;box-shadow:0 0 0 1px rgba(21,21,21,.1),0 12px 30px -18px rgba(21,21,21,.35);font-family:Inter,ui-sans-serif,system-ui,sans-serif;background:#fff;color:#1c1c1a;list-style:none;padding:0 28px}}
.pl-ss-sm{{zoom:.3143}}
.pl-ss i{{font-style:normal}}
.pl-ss .ss-nav{{display:flex;align-items:center;gap:18px;height:56px;font-size:13px;color:#5b5b55;border-bottom:1px solid rgba(21,21,21,.08)}}
.pl-ss .ss-brand{{margin-right:auto;font-size:15px;color:inherit;letter-spacing:-.01em}}
.pl-ss .ss-cta{{display:inline-flex;align-items:center;height:34px;padding:0 16px;border-radius:999px;background:#1c1c1a;color:#fff;font-size:13px;font-weight:500}}
.pl-ss .ss-ghost{{display:inline-flex;align-items:center;height:34px;padding:0 16px;border-radius:999px;border:1px solid rgba(21,21,21,.2);font-size:13px}}
.pl-ss h4{{margin:0;font-weight:500}}
.pl-ss p{{margin:0;font-size:13px;line-height:1.55;color:#6a6a63}}
.pl-ss small{{font-size:11.5px;color:#7a7a72}}
.pl-ss .ss-split{{display:grid;grid-template-columns:1fr 1fr;gap:28px;height:calc(100% - 56px);align-items:center}}
.pl-ss .ss-copy{{display:flex;flex-direction:column;gap:12px}}
.pl-ss .ss-btns{{display:flex;gap:8px;margin-top:6px}}
.pl-ss-flor{{background:#f7f3ec}}
.pl-ss-flor h4{{font-family:Newsreader,Georgia,serif;font-size:31px;line-height:1.08;letter-spacing:-.02em}}
.pl-ss-flor .ss-cta{{background:#3b4a2f}}
.pl-ss-flor .ss-photo{{height:300px;border-radius:10px;background-size:cover;background-position:center}}
.pl-ss-fin{{background:#0f1720;color:#e7edf3;padding:0 28px}}
.pl-ss-fin .ss-nav{{color:#8b98a6;border-color:rgba(255,255,255,.08)}}
.pl-ss-fin .ss-cta{{background:#7dd3a8;color:#0f1720}}
.pl-ss-fin .ss-dash{{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;padding-top:22px}}
.pl-ss-fin .ss-kpi{{display:flex;flex-direction:column;gap:6px;padding:14px;border-radius:10px;background:#16212c;border:1px solid rgba(255,255,255,.06)}}
.pl-ss-fin .ss-kpi small{{color:#8b98a6}}.pl-ss-fin .ss-kpi b{{font-size:22px;letter-spacing:-.02em}}
.pl-ss-fin .ss-kpi em{{font-style:normal;font-size:12px;color:#7dd3a8}}.pl-ss-fin .ss-kpi em.dn{{color:#f2a48c}}
.pl-ss-fin .ss-chart{{grid-column:1/-1;height:150px;padding:12px;border-radius:10px;background:#16212c;border:1px solid rgba(255,255,255,.06)}}
.pl-ss-fin .ss-chart svg{{width:100%;height:100%}}
.pl-ss-arch{{background:#efede8}}
.pl-ss-arch .ss-brand{{letter-spacing:.18em;font-size:13px}}
.pl-ss-arch h4{{margin:26px 0 22px;font-size:40px;line-height:1.02;letter-spacing:-.035em;font-weight:600}}
.pl-ss-arch .ss-grid{{display:grid;grid-template-columns:2fr 1fr 1fr;gap:10px;height:170px}}
.pl-ss-arch .ss-grid span{{border-radius:4px;background:#cfcac0 center/cover}}
.pl-ss-arch .ss-grid span:nth-child(3){{background:#b9b2a6}}
.pl-ss-cafe{{background:#f4ede3}}
.pl-ss-cafe h4{{font-family:Newsreader,Georgia,serif;font-size:30px;line-height:1.08;letter-spacing:-.02em;color:#2b1d14}}
.pl-ss-cafe .ss-cta{{background:#7a3e1d}}
.pl-ss-cafe .ss-cards{{display:grid;grid-template-columns:1fr 1fr;gap:12px}}
.pl-ss-cafe .ss-cards div{{display:flex;flex-direction:column;gap:4px;padding:14px;border-radius:10px;background:#fff;box-shadow:0 0 0 1px rgba(43,29,20,.08)}}
.pl-ss-cafe .ss-cards b{{font-size:13px}}
.pl-ss-cafe .ss-bag{{height:120px;margin-bottom:8px;border-radius:8px;background:linear-gradient(#c79a6b,#a8754a)}}
.pl-ss-cafe .ss-bag.b2{{background:linear-gradient(#8fa58a,#64805e)}}
.pl-ss-calm{{background:#eef0f6}}
.pl-ss-calm h4{{font-size:32px;line-height:1.05;letter-spacing:-.03em;color:#232546}}
.pl-ss-calm .ss-cta{{background:#3d3f8f}}
.pl-ss-calm .ss-phone{{justify-self:center;display:flex;flex-direction:column;gap:6px;width:170px;height:300px;padding:12px;box-sizing:border-box;border-radius:28px;background:#fff;box-shadow:0 0 0 6px #232546,0 20px 40px -20px rgba(35,37,70,.5)}}
.pl-ss-calm .ss-phone div{{height:170px;border-radius:18px;background-size:cover;background-position:center}}
.pl-ss-calm .ss-phone b{{font-size:14px;color:#232546}}
.pl-ss-run{{background:#fafaf7}}
.pl-ss-run .ss-brand{{font-weight:800;letter-spacing:.06em}}
.pl-ss-run .ss-cta{{background:#e2553a}}
.pl-ss-run .ss-band{{display:flex;flex-direction:column;justify-content:flex-end;align-items:flex-start;gap:12px;height:230px;margin-top:16px;padding:20px;box-sizing:border-box;border-radius:10px;background-size:cover;background-position:center 60%;box-shadow:inset 0 -120px 80px -40px rgba(0,0,0,.55)}}
.pl-ss-run .ss-band h4{{font-size:30px;line-height:1.02;font-weight:800;letter-spacing:-.03em;color:#fff}}
.pl-ss-run .ss-stats{{display:flex;gap:28px;padding-top:16px;font-size:13px;color:#6a6a63}}
.pl-ss-run .ss-stats b{{color:#1c1c1a}}
'''
rep('\n/* ---------- Interactive app pictures ---------- */', css + '\n/* ---------- Interactive app pictures ---------- */')
# credits
rep('Flower photo by Nhi D on Unsplash (Unsplash License).',
    'Flower photos on Unsplash (Unsplash License) by Nhi D, Daniel Klein, Dmytro Korobka, Angel Luciano and Tracy Brower.')
open(dst, 'w').write(s)
print('downloads removed', n_dl, 'buttons with arrows', n_btn)
