"""Version B: the six main sections are each exactly 950px tall on desktop (wider than 900px).
Taller content scrolls inside its section; shorter content is centered in the 950px.
The app-name strip, the fine print and the footer keep their own heights. Phones keep the natural flow."""
import sys

src, dst = sys.argv[1], sys.argv[2]
s = open(src).read()


def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit(f'expected {count}, found {n}: {old[:90]!r}')
    s = s.replace(old, new)


# The top (title, buttons, demo) had no box of its own; wrap it so it can be sized.
rep('<!-- Title and buttons: max-width 658px, on the left; text left-aligned -->',
    '<!-- Top section box: 950px on desktop together with the page\'s 112px top padding -->\n<div class="pl-h950 pl-top950">\n<!-- Title and buttons: max-width 658px, on the left; text left-aligned -->')
rep('\n<!-- Supported AI apps:', '\n</div>\n<!-- Supported AI apps:')

css = r'''/* ===== Section height: each main section is 950px tall on desktop; what doesn't fit scrolls inside it ===== */
@media (min-width: 901px){
.pl-h950,section[aria-labelledby="pl-how"],section[aria-labelledby="pl-made"],section[aria-labelledby="pl-guides"],.pl-faqband,section[aria-labelledby="pl-cta-title"]{height:950px;box-sizing:border-box !important}
/* The top: 950px counted from the top of the page (112px of it is the page's own padding) */
.pl-top950{height:838px;width:100%;overflow-y:auto}
/* Taller than 950px: scroll inside */
.pl-top950,section[aria-labelledby="pl-how"],.pl-faqband{overflow-y:auto;overscroll-behavior-y:auto;scrollbar-width:thin;scrollbar-color:rgba(21,21,21,.25) transparent}
section[aria-labelledby="pl-how"]{margin-top:0 !important;padding-top:64px !important;padding-bottom:64px !important}
/* Shorter than 950px: content centered in the space */
section[aria-labelledby="pl-made"]{display:flex;flex-direction:column;justify-content:center;padding-top:0 !important}
section[aria-labelledby="pl-guides"]{display:flex;flex-direction:column;justify-content:center}
section[aria-labelledby="pl-cta-title"]{align-content:center}
}
'''
rep('/* Made with PromptLift rail + Quick guides */', css + '/* Made with PromptLift rail + Quick guides */')
open(dst, 'w').write(s)
print('ok', len(s))
