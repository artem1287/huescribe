"""Round nov19c: even letter spacing in the "Picked" wordmark; photos on the "What it reads" cards.

- Footer wordmark: "Hue" no longer has padding or a margin, so the gap between "e" and "s" matches the other letters.
  The tracking is a little looser (-.03em instead of -.06em) so the outline fits in the e/s gap, and the outline is its
  own layer (.pl-wm-box) placed from Inter 600's measured glyph bounds, so it never moves the letters.
  Geometry (em, Inter 600): H left bearing .0757, e right bearing .0426, s left bearing .0437, "Hue" ink from .039 below
  the top of the text box to .0317 above its bottom. The outline sits halfway between the letters on every side.
- "What it reads": icons removed; each card is a photo (Unsplash License) with a dark fade under white text.
"""
import re
import sys

P = "/home/claude/homepage/project/VersionB.dc.html"
s = open(P, encoding="utf-8").read()


def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        sys.exit(f"expected {count} of {old[:80]!r}, found {n}")
    s = s.replace(old, new)


# ---------- 1. Wordmark ----------
rep('<span class="pl-wm-pick">Hue</span>scribe', '<span class="pl-wm-pick"><i class="pl-wm-box"></i>Hue</span>scribe')
old_css = s[s.index('.pl-wm-pick{position:relative;display:inline-block'):]
old_css = old_css[:old_css.index('.pl-wm-pick::before{left:-.035em;top:-.035em}.pl-wm-pick::after{right:-.035em;bottom:-.035em}')
                  + len('.pl-wm-pick::before{left:-.035em;top:-.035em}.pl-wm-pick::after{right:-.035em;bottom:-.035em}')]
rep(old_css,
    '.pl-footer .pl-wordmark{letter-spacing:-.03em}\n'
    '.pl-wm-pick{--ls:-.03em;--ring:max(1px,.012em);--c:calc((.0863em + var(--ls) - var(--ring)) / 2);--h:max(5px,.045em);position:relative;display:inline-block;isolation:isolate}\n'
    '.pl-wm-box{position:absolute;z-index:-1;left:calc(.0757em - var(--c));right:calc(var(--ls) + .0426em - var(--c));top:calc(.039em - var(--c));bottom:calc(.0317em - var(--c));border-radius:.012em;background:rgba(185,217,106,.22);box-shadow:inset 0 0 0 var(--ring) rgba(91,111,42,.42)}\n'
    '.pl-wm-box::before,.pl-wm-box::after{content:"";position:absolute;width:var(--h);height:var(--h);box-sizing:border-box;background:#fcfcfc;border:max(1px,.008em) solid rgba(91,111,42,.55)}\n'
    '.pl-wm-box::before{left:calc(var(--h) / -2);top:calc(var(--h) / -2)}.pl-wm-box::after{right:calc(var(--h) / -2);bottom:calc(var(--h) * -1 + var(--ring))}')

# ---------- 2. "What it reads": photos instead of icons ----------
a = s.index('<section aria-labelledby="pl-what"')
b = s.index('</section>', a)
sec = s[a:b]
icon = re.compile(r'<span style="display: grid; place-items: center; width: 40px; height: 40px;[^>]*>.*?</svg></span>\n', re.S)
if len(icon.findall(sec)) != 5:
    sys.exit('expected 5 icons')
PHOTOS = ["cdf9bf4df188605a6636082d99a3a729", "5bec822f016bd25a39bd17795180d9c8", "99f7f3b8f13e82b30b9bef2abc6395d6",
          "293aaaefe255997f6588c98e72fe67f4", "2ca17e0e5d2ffb07091ac22f5fc52443"]
it = iter(PHOTOS)
sec = icon.sub(lambda _: f'<img class="pl-featimg" src="/_blob/{next(it)}" alt="" loading="lazy" decoding="async">\n', sec)
s = s[:a] + sec + s[b:]

s = s.replace('</style>',
              '\n/* ===== Version B, 2026-11-19: "What it reads" cards are photos (no icons), text in white over a dark fade ===== */\n'
              '.pl-bento > .pl-featcard{isolation:isolate;overflow:hidden;justify-content:flex-end !important;min-height:260px;border:0 !important;background:#2a2a27 !important}\n'
              '.pl-featimg{position:absolute;inset:0;z-index:-2;width:100%;height:100%;object-fit:cover;transition:transform .8s cubic-bezier(.22,1,.36,1)}\n'
              '.pl-featcard::after{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(rgba(21,21,21,0) 30%,rgba(21,21,21,.78));pointer-events:none}\n'
              '.pl-featcard .pl-feattext h3{color:#ffffff !important}.pl-featcard .pl-featline{color:rgba(255,255,255,.86)}\n'
              '.pl-featcard:is(:hover,:focus-within) .pl-featimg{transform:scale(1.04)}\n'
              '.pl-featcard:focus-within{outline:2px solid var(--pl-accent-ink);outline-offset:2px}\n'
              '@media (max-width:900px){.pl-bento > .pl-featcard:nth-child(n){min-height:200px}}\n'
              '@media (prefers-reduced-motion: reduce){.pl-featimg{transition:none}}\n</style>', 1)

# ---------- 3. Credits ----------
rep('Flower photos on Unsplash (Unsplash License) by Nhi D, Daniel Klein, Dmytro Korobka, Angel Luciano and Tracy Brower.',
    'Photos on Unsplash (Unsplash License) by Nhi D, Daniel Klein, Dmytro Korobka, Angel Luciano, Tracy Brower, Andy Brown, '
    'Fabien Barral, Pawel Czerwinski, Davide Cantelli and Qingqing Cai.')

open(P, "w", encoding="utf-8").write(s)
print("ok")
