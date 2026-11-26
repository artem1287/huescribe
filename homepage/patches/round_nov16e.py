"""Round nov16e: the logo goes green and sans-serif. Demo-panel logos use the green tile; the footer's
giant wordmark is set in Inter Semibold, like the new logo lockup."""
import sys
P = "/home/claude/homepage/project/VersionB.dc.html"
s = open(P, encoding="utf-8").read()


def rep(old, new, count):
    global s
    n = s.count(old)
    if n != count:
        sys.exit(f"expected {count} of {old[:80]!r}, found {n}")
    s = s.replace(old, new)


rep('background: #ffffff; box-shadow: inset 0 0 0 1px rgba(17,17,19,0.12); color: #151515"', 'background: #b9d96a; color: #151515"', 4)
rep('<circle cx="32" cy="32" r="10.5" fill="#ffffff"></circle>', '<circle cx="32" cy="32" r="10.5" fill="#b9d96a"></circle>', 4)
rep('.pl-wordmark{font-family:Newsreader,Georgia,serif;font-size:clamp(90px,19vw,270px);line-height:.8;letter-spacing:-.05em;',
    '.pl-wordmark{font-family:Inter,system-ui,sans-serif;font-weight:600;font-size:clamp(80px,17vw,250px);line-height:.8;letter-spacing:-.06em;', 1)
rep('.pl-wordmark{font-family:"Newsreader",Georgia,"Times New Roman",serif !important}', '.pl-wordmark{font-family:"Inter",system-ui,sans-serif !important}', 1)
open(P, "w", encoding="utf-8").write(s)
print("ok")
