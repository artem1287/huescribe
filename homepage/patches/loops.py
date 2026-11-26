"""Version B: looping 'PromptLift in use' animations on every app screenshot, like the demo at the top.
Reads the live Version B (argv[1]) and writes the patched file (argv[2]). Only these screenshots change:
step 1 (pick), step 2 (choose), step 3 (paste) and the call-to-action picture. Each loop pauses while pointed at."""
import sys

src, dst = sys.argv[1], sys.argv[2]
s = open(src).read()


def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit(f'expected {count}, found {n}: {old[:90]!r}')
    s = s.replace(old, new)


PTR = ('<svg width="22" height="22" viewBox="0 0 24 24" style="position: relative; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.3))">'
       '<path d="M4 2l15 8.5-6.5 1.6L9.6 19z" fill="#151515" stroke="#fcfcfc" stroke-width="1.5" stroke-linejoin="round"></path></svg>')
TICK = ('<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" '
        'stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>')


def cursor(n):
    return f'<span class="pl-lp pl-cur pl-c{n}-cur" aria-hidden="true"><i class="pl-lp pl-ring pl-c{n}-ring"></i>{PTR}</span>'


def toast(n, text):
    return (f'<span class="pl-lp pl-ltoast pl-c{n}-toast" aria-hidden="true"><span style="display: inline-flex; color: var(--how-green)">'
            f'{TICK}</span>{text}</span>')


# ---- step 1: pick. The outline lands on one card, then ↑ grows it to the whole section ----
old = '<img loading="lazy" decoding="async" class="pl-pickimg" src="/_blob/af805dcc0d0d1f23a4bf47d6f1ea8026" alt="" style="display: block; width: 100%; height: auto">'
rep(old, old + '\n<div class="pl-shotlayer" aria-hidden="true" style="position: absolute; left: 0; right: 0; top: 34px; aspect-ratio: 2560 / 1500">'
    '<span class="pl-lp pl-c1-box"></span>' + cursor(1) + '</div>')

# ---- step 2: choose. The pointer turns on Colors and Layout, then adds the part to the list ----
rep('⌘↵</span></span>\n</div>\n</article>\n<article class="pl-howcard pl-howwide"',
    '⌘↵</span></span>\n' + cursor(2) + toast(2, 'Added to your list') + '\n</div>\n</article>\n<article class="pl-howcard pl-howwide"')

# ---- step 3: paste. "Copy again", then ⌘ V, the prompt types in and the AI app answers ----
rep(' paste and send</span>\n</div>\n</article>', ' paste and send</span>\n' + cursor(3) + '\n</div>\n</article>')

# ---- call to action: the list. Pick where it goes, describe it, copy ----
old_img = ('<img src="/_blob/517672711a9d24d0b843fba34168982b" alt="The PromptLift side panel with a picked pricing section in the list, ready to copy as one prompt" '
           'loading="lazy" decoding="async" style="width: 62%; height: auto; display: block; border-radius: 10px; box-shadow: 0 0 0 1px rgba(21,21,21,0.08), 0 24px 48px -16px rgba(21,21,21,0.35)">')
rep(old_img,
    '<div class="pl-cta-shot" style="position: relative; width: 62%; border-radius: 10px; box-shadow: 0 0 0 1px rgba(21,21,21,0.08), 0 24px 48px -16px rgba(21,21,21,0.35)">\n'
    '<div class="pl-c4-scroll" style="position: relative">\n'
    '<img src="/_blob/517672711a9d24d0b843fba34168982b" alt="The PromptLift side panel with a picked pricing section in the list, ready to copy as one prompt" '
    'loading="lazy" decoding="async" style="width: 100%; height: auto; display: block; border-radius: 10px">\n'
    '<span class="pl-lp pl-c4-chip" aria-hidden="true"></span>'
    '<span class="pl-lp pl-c4-field pl-c4-in" aria-hidden="true"><span class="pl-lp pl-c4-txt pl-c4-inT">top of my homepage</span></span>'
    '<span class="pl-lp pl-c4-field pl-c4-ta" aria-hidden="true"><span class="pl-lp pl-c4-txt pl-c4-taT">my 3 best sellers, each with a price</span></span>'
    + toast(4, 'Copied to your clipboard') + cursor(4) + '\n</div>\n</div>')
# The scroll-in tilt moves from the picture to its new box, so the overlays tilt with it.
rep('.pl-video > div:first-child,.pl-cta-frame img{animation-fill-mode', '.pl-video > div:first-child,.pl-cta-shot{animation-fill-mode')
rep('.pl-cta-frame img{animation-name:pl-img-tilt}', '.pl-cta-shot{animation-name:pl-img-tilt}')

# ---- the old one-off hover sequences become the loops (and the old pointer goes) ----
for line in ['.pl-howcard:is(:hover,:focus-within) .pl-pickimg{transform:scale(1.05)}\n',
             '.pl-howcard:is(:hover,:focus-within) .pl-pickptr{left:30%;top:42%}\n',
             '.pl-howcard:is(:hover,:focus-within) .pl-kup{animation:pl-press .4s ease .6s both}\n',
             '.pl-howcard:is(:hover,:focus-within) .pl-picktoast{opacity:1;transform:translate(-50%,0)}\n',
             '.pl-howwide:is(:hover,:focus-within) .pl-key{animation:pl-press .35s ease both}\n',
             '.pl-howwide:is(:hover,:focus-within) .pl-key + .pl-key{animation-delay:.12s}\n',
             '.pl-howwide:is(:hover,:focus-within) .pl-reply{animation:pl-fadeup .4s ease 1.2s both}\n',
             '.pl-howwide:is(:hover,:focus-within) .pl-done{animation:pl-pop .4s cubic-bezier(.3,1.4,.5,1) 1.6s both}\n']:
    rep(line, '')
rep('.pl-howwide:is(:hover,:focus-within) .pl-typeline{animation:pl-typein .45s cubic-bezier(.4,0,.2,1) both;animation-delay:calc(.35s + var(--d) * .14s)}\n', '')

css = r'''/* ===== Screenshots in use (like the demo at the top): each app screenshot plays its own short loop; pointing at it pauses it ===== */
.pl-pickptr{display:none}
.pl-cur{position:absolute;z-index:6;width:22px;height:22px;pointer-events:none;opacity:0;transform-origin:3px 3px}
.pl-ring{position:absolute;left:-9px;top:-9px;width:22px;height:22px;border-radius:50%;background:var(--pl-accent);opacity:0}
.pl-lp{animation-iteration-count:infinite;animation-timing-function:cubic-bezier(.4,0,.2,1);animation-fill-mode:both}
.pl-ltoast{position:absolute;left:50%;z-index:5;display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;background:#18181b;color:#fff;font-size:12px;font-weight:550;white-space:nowrap;box-shadow:0 6px 16px -6px rgba(0,0,0,.4);opacity:0;pointer-events:none}
.pl-howcard:hover :is(.pl-lp,.pl-kup,.pl-picktoast,.pl-chip,.pl-addbtn,.pl-key,.pl-typeline,.pl-reply,.pl-done),.pl-cta-frame:hover .pl-lp{animation-play-state:paused}

/* Step 1, 8s: point at a card, click (outline), press ↑ (the outline grows to the whole section), "Section added" */
.pl-c1-cur,.pl-c1-ring,.pl-c1-box,.pl-pickstage .pl-kup,.pl-picktoast{animation-duration:8s;animation-iteration-count:infinite;animation-fill-mode:both}
.pl-c1-cur{animation-name:pl-c1-cur}.pl-c1-ring{animation-name:pl-ring3;animation-duration:8s}
.pl-c1-box{position:absolute;box-sizing:border-box;border:2px dashed var(--pl-accent-ink);border-radius:8px;background:rgba(185,217,106,.14);box-shadow:0 0 0 4px rgba(185,217,106,.35);opacity:0;animation-name:pl-c1-box}
.pl-pickstage .pl-kup{animation-name:pl-c1-key}
.pl-picktoast{transition:none;animation-name:pl-c1-toast}
@keyframes pl-c1-cur{0%{left:70%;top:112%;opacity:0;transform:none}4%{opacity:1}14%{left:20%;top:42%;transform:none}16%{transform:scale(.82)}18%{transform:none}26%{left:20%;top:42%}36%{left:46%;top:78%;opacity:1}86%{left:46%;top:78%;opacity:1}92%{opacity:0}100%{left:70%;top:112%;opacity:0}}
@keyframes pl-ring3{0%,15%{opacity:0;transform:scale(.4)}16%{opacity:.6;transform:scale(.4)}21%,100%{opacity:0;transform:scale(1.8)}}
@keyframes pl-c1-box{0%,10%{opacity:0;left:6.3%;top:27.6%;width:27.8%;height:26.5%;border-style:dashed}13%{opacity:1}16.9%{border-style:dashed}17%{border-style:solid}30%{left:6.3%;top:27.6%;width:27.8%;height:26.5%}38%{left:3.75%;top:17.1%;width:92.5%;height:37.2%}88%{opacity:1;left:3.75%;top:17.1%;width:92.5%;height:37.2%;border-style:solid}94%{opacity:0}100%{opacity:0;left:6.3%;top:27.6%;width:27.8%;height:26.5%;border-style:dashed}}
@keyframes pl-c1-key{0%,29%,35%,100%{transform:none;background:#ffffff}31%{transform:translateY(1px);background:#e7e7e5}}
@keyframes pl-c1-toast{0%,40%{opacity:0;transform:translate(-50%,-6px)}44%,86%{opacity:1;transform:translate(-50%,0)}90%,100%{opacity:0;transform:translate(-50%,-6px)}}

/* Step 2, 8s: click Colors, click Layout, press "Add to my list", "Added to your list" */
.pl-c2-cur,.pl-c2-ring,.pl-c2-toast,.pl-choosestage .pl-chip:nth-of-type(1),.pl-choosestage .pl-chip:nth-of-type(2),.pl-choosestage .pl-addbtn{animation-duration:8s;animation-iteration-count:infinite;animation-fill-mode:both;animation-timing-function:cubic-bezier(.4,0,.2,1)}
.pl-c2-cur{animation-name:pl-c2-cur}.pl-c2-ring{animation-name:pl-c2-ring}
.pl-choosestage .pl-chip:nth-of-type(1){animation-name:pl-c2-a}.pl-choosestage .pl-chip:nth-of-type(2){animation-name:pl-c2-b}
.pl-choosestage .pl-addbtn{animation-name:pl-c2-add}
.pl-c2-toast{top:24px;animation-name:pl-c2-toast}
@keyframes pl-c2-cur{0%{left:70%;top:112%;opacity:0;transform:none}4%{opacity:1}14%{left:58px;top:106px;transform:none}16%{transform:scale(.82)}18%{transform:none}30%{left:calc(100% - 59px);top:174px}36%{left:calc(100% - 59px);top:174px;transform:none}38%{transform:scale(.82)}40%{transform:none}54%{left:50%;top:330px;transform:none}58%{transform:scale(.82)}60%{transform:none}84%{left:50%;top:330px;opacity:1}92%{opacity:0}100%{left:70%;top:112%;opacity:0}}
@keyframes pl-c2-ring{0%,15%,37%,57%{opacity:0;transform:scale(.4)}16%,38%,58%{opacity:.6;transform:scale(.4)}21%,43%,63%,100%{opacity:0;transform:scale(1.8)}}
@keyframes pl-c2-a{0%,15%,20%,100%{scale:1}17%{scale:.93}}
@keyframes pl-c2-b{0%,37%,42%,100%{scale:1}39%{scale:.93}}
@keyframes pl-c2-add{0%,57%,62%,100%{scale:1}59%{scale:.95}}
@keyframes pl-c2-toast{0%,60%{opacity:0;transform:translate(-50%,-6px)}64%,86%{opacity:1;transform:translate(-50%,0)}90%,100%{opacity:0;transform:translate(-50%,-6px)}}

/* Step 3, 10s: click "Copy again", press ⌘ V, the prompt types in line by line, the AI app replies and saves */
.pl-howstage{container-type:inline-size}
.pl-c3-cur,.pl-c3-ring,.pl-howwide .pl-key,.pl-howwide .pl-typeline,.pl-howwide .pl-reply,.pl-howwide .pl-done{animation-duration:10s;animation-iteration-count:infinite;animation-fill-mode:both;animation-timing-function:cubic-bezier(.4,0,.2,1)}
.pl-c3-cur{animation-name:pl-c3-cur}.pl-c3-ring{animation-name:pl-c3-ring}
.pl-howwide .pl-key{animation-name:pl-c3-key}.pl-howwide .pl-key + .pl-key{animation-name:pl-c3-key2}
.pl-howwide .pl-typeline{animation-name:pl-c3-type;animation-delay:calc(var(--d) * .3s)}
.pl-howwide .pl-reply{animation-name:pl-c3-reply}
.pl-howwide .pl-done{animation-name:pl-c3-done}
@keyframes pl-c3-cur{0%{left:30%;top:108%;opacity:0;transform:none}4%{opacity:1}12%{left:calc(28px + .21 * min(340px, 48cqw));top:calc(72px + .75 * min(340px, 48cqw));transform:none}14%{transform:scale(.82)}16%{transform:none}30%{left:72%;top:58%;opacity:1}38%{opacity:1}44%{left:72%;top:58%;opacity:0}100%{left:30%;top:108%;opacity:0}}
@keyframes pl-c3-ring{0%,13%{opacity:0;transform:scale(.4)}14%{opacity:.6;transform:scale(.4)}19%,100%{opacity:0;transform:scale(1.8)}}
@keyframes pl-c3-key{0%,33%,38%,100%{transform:none;background:#ffffff}35%{transform:translateY(1px);background:#e7e7e5}}
@keyframes pl-c3-key2{0%,35%,40%,100%{transform:none;background:#ffffff}37%{transform:translateY(1px);background:#e7e7e5}}
@keyframes pl-c3-type{0%,38%{clip-path:inset(0 100% 0 0)}44%,90%{clip-path:inset(0 0 0 0)}94%,100%{clip-path:inset(0 100% 0 0)}}
@keyframes pl-c3-reply{0%,58%{opacity:0;translate:0 6px}62%,90%{opacity:1;translate:0 0}94%,100%{opacity:0;translate:0 6px}}
@keyframes pl-c3-done{0%,66%{opacity:0;scale:.85}70%,90%{opacity:1;scale:1}94%,100%{opacity:0;scale:.85}}

/* Call to action, 10s: pick "Top of homepage" (it fills the field), scroll the panel, describe what to show, press "Copy prompt" */
.pl-cta-shot{container-type:inline-size}
.pl-c4-scroll{animation:pl-c4-scroll 10s cubic-bezier(.4,0,.2,1) infinite both}
.pl-cta-frame:hover .pl-c4-scroll{animation-play-state:paused}
.pl-c4-cur,.pl-c4-ring,.pl-c4-chip,.pl-c4-field,.pl-c4-txt,.pl-c4-toast{animation-duration:10s}
.pl-c4-cur{animation-name:pl-c4-cur}.pl-c4-ring{animation-name:pl-c4-ring}
.pl-c4-chip{position:absolute;left:7.3%;top:49%;width:31.9%;height:4%;box-sizing:border-box;border:2px solid var(--pl-accent-ink);border-radius:999px;background:rgba(185,217,106,.25);opacity:0;animation-name:pl-c4-chip}
.pl-c4-field{position:absolute;left:7.6%;width:84%;display:flex;align-items:center;box-sizing:border-box;padding-left:2.4cqw;background:#ffffff;border-radius:1.2cqw;opacity:0}
.pl-c4-in{top:42.3%;height:4.8%;animation-name:pl-c4-in}.pl-c4-ta{top:63.4%;height:4%;align-items:flex-start;animation-name:pl-c4-ta}
.pl-c4-txt{font-size:3.7cqw;color:#151515;white-space:nowrap;clip-path:inset(0 100% 0 0)}
.pl-c4-inT{animation-name:pl-c4-inT}.pl-c4-taT{animation-name:pl-c4-taT}
.pl-c4-toast{top:84%;animation-name:pl-c4-toast}
@keyframes pl-c4-scroll{0%,32%{transform:none}42%,92%{transform:translateY(-36%)}98%,100%{transform:none}}
@keyframes pl-c4-cur{0%{left:85%;top:60%;opacity:0;transform:none}4%{opacity:1}14%{left:23%;top:51%;transform:none}16%{transform:scale(.82)}18%{transform:none}30%{left:23%;top:51%}46%{left:40%;top:65.5%;transform:none}48%{transform:scale(.82)}50%{transform:none}62%{left:40%;top:65.5%}70%{left:65.5%;top:94.5%;transform:none}72%{transform:scale(.82)}74%{transform:none}88%{left:65.5%;top:94.5%;opacity:1}92%{opacity:0}100%{left:85%;top:60%;opacity:0}}
@keyframes pl-c4-ring{0%,15%,47%,71%{opacity:0;transform:scale(.4)}16%,48%,72%{opacity:.6;transform:scale(.4)}21%,53%,77%,100%{opacity:0;transform:scale(1.8)}}
@keyframes pl-c4-chip{0%,15%{opacity:0}17%,90%{opacity:1}94%,100%{opacity:0}}
@keyframes pl-c4-in{0%,17%{opacity:0}18%,90%{opacity:1}94%,100%{opacity:0}}
@keyframes pl-c4-inT{0%,18%{clip-path:inset(0 100% 0 0)}30%,90%{clip-path:inset(0 0 0 0)}94%,100%{clip-path:inset(0 100% 0 0)}}
@keyframes pl-c4-ta{0%,48%{opacity:0}49%,90%{opacity:1}94%,100%{opacity:0}}
@keyframes pl-c4-taT{0%,50%{clip-path:inset(0 100% 0 0)}62%,90%{clip-path:inset(0 0 0 0)}94%,100%{clip-path:inset(0 100% 0 0)}}
@keyframes pl-c4-toast{0%,74%{opacity:0;transform:translate(-50%,-6px)}77%,88%{opacity:1;transform:translate(-50%,0)}92%,100%{opacity:0;transform:translate(-50%,-6px)}}
@media (max-width:900px){.pl-cur{display:none}}
@media (prefers-reduced-motion: reduce){.pl-lp{animation:none !important;display:none}.pl-picktoast,.pl-c4-scroll{animation:none !important}}
'''
rep('/* Made with PromptLift rail + Quick guides */', css + '/* Made with PromptLift rail + Quick guides */')
open(dst, 'w').write(s)
print('ok', len(s))
