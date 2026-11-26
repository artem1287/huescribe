"""Round nov19h: roomier wordmark box; no Questions section; last section full width with the white flower.

- Wordmark: letter spacing -.03em -> .02em for every letter (so the e/s gap is wider and the box gets more room on
  every side: about .047em instead of .022em); corner squares bigger (max(9px,.075em)), white with a solid dark-green
  border.
- "Questions" (FAQ) section removed, with its FAQPage structured data.
- "Borrow the good parts": full-width band on the cosmos photo (edge to edge), a large white flower mark faded into
  the background, the text and button on the left, and the app picture (the side panel with a picked section, from
  the original version of this section) rising from the bottom edge on the right.
"""
import re
import sys

P = "/home/claude/homepage/project/VersionB.dc.html"
OLD_CTA_SOURCE = "/tmp/VersionB.before19e.html"
s = open(P, encoding="utf-8").read()
old = open(OLD_CTA_SOURCE, encoding="utf-8").read()


def rep(o, n, count=1):
    global s
    c = s.count(o)
    if c != count:
        sys.exit(f"expected {count} of {o[:80]!r}, found {c}")
    s = s.replace(o, n)


def block(text, start, end):
    a = text.index(start)
    return text[a:text.index(end, a) + len(end)]


# ---------- 1. Wordmark ----------
rep('.pl-footer .pl-wordmark{letter-spacing:-.03em}', '.pl-footer .pl-wordmark{letter-spacing:.02em}')
rep('.pl-wm-pick{--ls:-.03em;', '.pl-wm-pick{--ls:.02em;')
rep('--h:max(5px,.045em);', '--h:max(9px,.075em);')
rep('box-shadow:inset 0 0 0 var(--ring) rgba(91,111,42,.42)}', 'box-shadow:inset 0 0 0 var(--ring) rgba(91,111,42,.5)}')
rep('background:#fcfcfc;border:max(1px,.008em) solid rgba(91,111,42,.55)}', 'background:#ffffff;border:max(2px,.016em) solid #5b6f2a;box-shadow:0 .01em .03em rgba(21,21,21,.18)}')

# ---------- 2. No Questions section ----------
faq = block(s, '<section aria-labelledby="pl-faq-title"', '</section>')
s = s.replace(faq, '')
s = re.sub(r'<script type="application/ld\+json">\{"@context": "https://schema.org", "@type": "FAQPage".*?</script>\n?', '', s, count=1, flags=re.S)
if 'pl-faq-title' in s.split('</style>', 1)[1] or '"FAQPage"' in s:
    sys.exit('FAQ leftovers')

# ---------- 3. Last section ----------
MARK = ('<svg viewBox="10 10 44 44"><defs><mask id="pl-cta-hole" maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">'
        '<rect width="64" height="64" fill="#fff"></rect><circle cx="32" cy="32" r="10.5" fill="#000"></circle></mask></defs>'
        '<g fill="currentColor" mask="url(#pl-cta-hole)"><circle cx="42.61" cy="21.39" r="11"></circle><circle cx="42.61" cy="42.61" r="11"></circle>'
        '<circle cx="21.39" cy="42.61" r="11"></circle><circle cx="21.39" cy="21.39" r="11"></circle></g>'
        '<path d="M27 31q5 6 10 0" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"></path></svg>')
cur = block(s, '<section aria-labelledby="pl-cta-title"', '</section>')
btn = block(cur, '<a href="https://chromewebstore.google.com/search/Huescribe"', '</a>')
pic = block(old, '<div class="pl-cta-pic">', '</div>\n</div>\n</div>')  # pic > frame > shot
new = ('<section aria-labelledby="pl-cta-title" class="pl-cta-row pl-cta-full">\n'
       '<span class="pl-cta-mark" aria-hidden="true">' + MARK + '</span>\n'
       '<div class="pl-cta-inner">\n'
       '<div class="pl-cta-text">\n'
       '<h2 id="pl-cta-title" class="pl-display">Borrow the good parts.</h2>\n'
       '<p class="pl-cta-line">Add it to Chrome and copy your first prompt.</p>\n'
       + btn + '\n</div>\n' + pic + '\n</div>\n</div>\n</section>')  # pic, then .pl-cta-inner
s = s.replace(cur, new)
cstart = s.rfind('<!-- Final call to action', 0, s.index(new))
cend = s.index('-->', cstart) + 3
s = s[:cstart] + '<!-- Final call to action: full-width band on the cosmos photo, a big white flower in the background, the app picture on the right -->' + s[cend:]

css_old_start = s.index('\n/* ===== Version B, 2026-11-19: final call to action with the logo large')
css_old_end = s.index('@media (max-width:900px){.pl-cta-card{border-radius:12px}}\n', css_old_start) + len('@media (max-width:900px){.pl-cta-card{border-radius:12px}}\n')
s = s[:css_old_start] + '\n' + s[css_old_end:]
s = s.replace('</style>',
              '\n/* ===== Version B, 2026-11-19: last section full width on the cosmos photo, white flower behind, app picture rising from the bottom ===== */\n'
              'section.pl-cta-full{position:relative;isolation:isolate;overflow:hidden;display:block !important;align-self:stretch;width:auto !important;max-width:none !important;'
              'margin-left:calc(50% - 50vw) !important;margin-right:calc(50% - 50vw) !important;padding-left:calc(50vw - 50%) !important;padding-right:calc(50vw - 50%) !important;padding-bottom:0 !important;'
              'min-height:0 !important;background:#3b3a2c url(/_blob/ad089e0a77baace4033d5906642d8977) 50% 65% / cover no-repeat}\n'
              'section.pl-cta-full::before{content:"";position:absolute;inset:0;z-index:-2;background:linear-gradient(90deg,rgba(21,21,21,.66),rgba(21,21,21,.28) 70%,rgba(21,21,21,.18))}\n'
              '.pl-cta-mark{position:absolute;z-index:-1;right:-120px;top:40px;width:440px;aspect-ratio:1;color:#ffffff;opacity:.92;pointer-events:none}\n'
              '.pl-cta-mark svg{display:block;width:100%;height:100%}\n'
              '.pl-cta-inner{max-width:1300px;margin:0 auto;display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:40px 0}\n'
              '.pl-cta-full .pl-cta-text{align-self:center;padding-bottom:72px !important;gap:20px}\n'
              '.pl-cta-full h2{color:#ffffff !important}\n'
              '.pl-cta-line{margin:0 0 4px;font-size:17px;line-height:1.5;color:rgba(255,255,255,.88)}\n'
              '.pl-cta-full .pl-cta-frame{background:none !important;border-radius:0;overflow:hidden}\n'
              '@media (max-width:900px){.pl-cta-full .pl-cta-text{padding-bottom:0 !important}.pl-cta-mark{width:220px;right:-64px;top:auto;bottom:24px}}\n</style>', 1)

open(P, "w", encoding="utf-8").write(s)
print("ok")
