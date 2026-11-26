"""Round nov19e: footer back to the faded wordmark; "Borrow the good parts" gets the large logo.

- Footer: restored exactly as it was before round_nov19d (the faded "Picked" wordmark with even spacing).
- Final call to action: a new format. One wide rounded card on the cosmos photo (darkened), centered: the logo tile
  large, the headline, one line and the button. Replaces the text-left / panel-screenshot-right layout.
"""
import sys

P = "/home/claude/homepage/project/VersionB.dc.html"
BEFORE = "/tmp/VersionB.before19d.html"
s = open(P, encoding="utf-8").read()
old = open(BEFORE, encoding="utf-8").read()


def block(text, start, end):
    a = text.index(start)
    return text[a:text.index(end, a) + len(end)]


# ---------- 1. Footer back ----------
cur_footer = block(s, '<footer class="pl-footer', '</footer>')
s = s.replace(cur_footer, block(old, '<footer class="pl-footer', '</footer>'))
a = s.index('\n/* ===== Version B, 2026-11-19: footer with the logo large')
b = s.index('.pl-footer-tile{width:1.9em;height:1.9em}}\n', a) + len('.pl-footer-tile{width:1.9em;height:1.9em}}\n')
s = s[:a] + '\n' + s[b:]
if 'pl-footer-big' in s or 'pl-footer-tile' in s:
    sys.exit('footer leftovers')

# ---------- 2. New call to action ----------
MARK = ('<svg viewBox="10 10 44 44"><defs><mask id="pl-cta-hole" maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">'
        '<rect width="64" height="64" fill="#fff"></rect><circle cx="32" cy="32" r="10.5" fill="#000"></circle></mask></defs>'
        '<g fill="currentColor" mask="url(#pl-cta-hole)"><circle cx="42.61" cy="21.39" r="11"></circle><circle cx="42.61" cy="42.61" r="11"></circle>'
        '<circle cx="21.39" cy="42.61" r="11"></circle><circle cx="21.39" cy="21.39" r="11"></circle></g>'
        '<path d="M27 31q5 6 10 0" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"></path></svg>')
cta = block(s, '<section aria-labelledby="pl-cta-title" class="pl-cta-row"', '</section>')
btn = block(cta, '<a href="https://chromewebstore.google.com/search/Huescribe"', '</a>')
start = s.index(cta)
comment_start = s.rfind('<!-- Final call to action', 0, start)
s = (s[:comment_start]
     + '<!-- Final call to action: one wide card on the cosmos photo, the logo large in the middle -->\n'
     + '<section aria-labelledby="pl-cta-title" class="pl-cta-row pl-cta-logo-row" style="width: 100%; max-width: 1300px; margin: 0 auto; padding: 96px 0; box-sizing: border-box">\n'
     + '<div class="pl-cta-card">\n'
     + '<span class="pl-cta-logo" aria-hidden="true">' + MARK + '</span>\n'
     + '<h2 id="pl-cta-title" class="pl-display">Borrow the good parts.</h2>\n'
     + '<p class="pl-cta-line">Add it to Chrome and copy your first prompt.</p>\n'
     + btn + '\n</div>\n</section>'
     + s[start + len(cta):])

s = s.replace('</style>',
              '\n/* ===== Version B, 2026-11-19: final call to action with the logo large, centered on the cosmos photo ===== */\n'
              '.pl-cta-logo-row{display:block !important}\n'
              '.pl-cta-card{position:relative;isolation:isolate;overflow:hidden;display:flex;flex-direction:column;align-items:center;text-align:center;gap:20px;'
              'padding:clamp(48px,7vw,96px) 24px;border-radius:16px;background:#3b3a2c url(/_blob/ad089e0a77baace4033d5906642d8977) 50% 70% / cover no-repeat}\n'
              '.pl-cta-card::before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(rgba(21,21,21,.35),rgba(21,21,21,.6))}\n'
              '.pl-cta-logo{display:grid;place-items:center;width:clamp(128px,16vw,208px);aspect-ratio:1;border-radius:22%;background:#B9D96A;color:#151515;'
              'box-shadow:0 24px 48px -16px rgba(0,0,0,.45);margin-bottom:12px}\n'
              '.pl-cta-logo svg{width:74%;height:74%;display:block}\n'
              '.pl-cta-card h2{margin:0;color:#ffffff !important}\n'
              '.pl-cta-line{margin:0 0 8px;font-size:17px;line-height:1.5;color:rgba(255,255,255,.88)}\n'
              '@media (max-width:900px){.pl-cta-card{border-radius:12px}}\n</style>', 1)

open(P, "w", encoding="utf-8").write(s)
print("ok")
