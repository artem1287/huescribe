"""Round nov19d: "What it reads" back to icons; a new footer format with the logo large.

- "What it reads": the photo cards from round_nov19c are removed and the icon cards restored (markup taken from the
  file as it was before nov19c); the photo CSS and the extra photo credits are gone. The even wordmark spacing stays.
- Footer: the big logo tile (green, black four-petal face) next to the "Picked" wordmark in ink, on a light band;
  stacked and centered on phones. The small print row stays underneath.
"""
import sys

P = "/home/claude/homepage/project/VersionB.dc.html"
BEFORE = "/tmp/VersionB.before19c.html"
s = open(P, encoding="utf-8").read()
old = open(BEFORE, encoding="utf-8").read()


def rep(o, n, count=1):
    global s
    c = s.count(o)
    if c != count:
        sys.exit(f"expected {count} of {o[:80]!r}, found {c}")
    s = s.replace(o, n)


def section(text):
    a = text.index('<section aria-labelledby="pl-what"')
    return text[a:text.index('</section>', a)]


# ---------- 1. Undo the photo cards ----------
rep(section(s), section(old))
a = s.index('\n/* ===== Version B, 2026-11-19: "What it reads" cards are photos')
b = s.index('@media (prefers-reduced-motion: reduce){.pl-featimg{transition:none}}\n', a) + len('@media (prefers-reduced-motion: reduce){.pl-featimg{transition:none}}\n')
s = s[:a] + '\n' + s[b:]
rep('Photos on Unsplash (Unsplash License) by Nhi D, Daniel Klein, Dmytro Korobka, Angel Luciano, Tracy Brower, Andy Brown, '
    'Fabien Barral, Pawel Czerwinski, Davide Cantelli and Qingqing Cai.',
    'Flower photos on Unsplash (Unsplash License) by Nhi D, Daniel Klein, Dmytro Korobka, Angel Luciano and Tracy Brower.')
if 'pl-featimg' in s:
    sys.exit('photo cards left over')

# ---------- 2. Footer: logo large ----------
MARK = ('<svg viewBox="10 10 44 44" aria-hidden="true"><defs><mask id="pl-ft-hole" maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">'
        '<rect width="64" height="64" fill="#fff"></rect><circle cx="32" cy="32" r="10.5" fill="#000"></circle></mask></defs>'
        '<g fill="currentColor" mask="url(#pl-ft-hole)"><circle cx="42.61" cy="21.39" r="11"></circle><circle cx="42.61" cy="42.61" r="11"></circle>'
        '<circle cx="21.39" cy="42.61" r="11"></circle><circle cx="21.39" cy="21.39" r="11"></circle></g>'
        '<path d="M27 31q5 6 10 0" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"></path></svg>')
fa = s.index('<footer class="pl-footer">')
fb = s.index('</footer>', fa) + len('</footer>')
foot = s[fa:fb]
row = foot[foot.index('<div class="pl-footer-row">'):foot.index('<div class="pl-wordmark"')].rstrip()
s = s[:fa] + ('<footer class="pl-footer pl-footer-big">\n'
              '<div class="pl-footer-brand" aria-hidden="true"><span class="pl-footer-tile">' + MARK + '</span>'
              '<div class="pl-wordmark"><span class="pl-wm-pick"><i class="pl-wm-box"></i>Hue</span>scribe</div></div>\n'
              + row + '\n</footer>') + s[fb:]
s = s.replace('</style>',
              '\n/* ===== Version B, 2026-11-19: footer with the logo large (tile + "Picked" wordmark), small print below ===== */\n'
              '.pl-footer.pl-footer-big{background:linear-gradient(180deg,#fcfcfc 0%,#f4f7ea 100%);border-top:1px solid var(--pl-line)}\n'
              '.pl-footer-brand{max-width:1300px;margin:0 auto;padding:clamp(56px,8vw,112px) 20px clamp(40px,6vw,80px);display:flex;align-items:center;gap:.32em;font-size:clamp(44px,11.5vw,190px)}\n'
              '.pl-footer-tile{flex:none;display:grid;place-items:center;width:1.25em;height:1.25em;border-radius:22%;background:#B9D96A;color:#151515}\n'
              '.pl-footer-tile svg{width:74%;height:74%;display:block}\n'
              '.pl-footer-big .pl-footer-brand .pl-wordmark{font-size:1em;line-height:1;padding:0 !important;margin:0;text-align:left;color:#151515}\n'
              '.pl-footer-big .pl-footer-row{border-top:1px solid rgba(21,21,21,.08)}\n'
              '@media (max-width:700px){.pl-footer-brand{flex-direction:column;align-items:center;gap:.28em;font-size:clamp(48px,16.5vw,110px)}.pl-footer-tile{width:1.9em;height:1.9em}}\n</style>', 1)

open(P, "w", encoding="utf-8").write(s)
print("ok")
