"""Round nov25a.

1. "What it reads" is simpler: one row of four pills (Colors, Fonts, Layout, Motion) and one line, instead of five
   cards with an icon, a title and a sentence each.
2. "How it works": each animation shows more of what happens.
   01 Pick: hovering one card is labeled "Card: Fast"; ↑ grows it to "Section: features (3 cards)"; after the click a
      small card lists what Huescribe read (its colors, fonts, layout and hover).
   02 Choose: turning on Colors pops the palette it takes, Layout pops "3 columns · gap 24px", and Fonts (left off)
      says "Your fonts stay".
   03 Paste: Copy shows "Copied · 2 parts"; after the paste the AI app thinks, edits the file, replies, and a small
      preview of the new cards appears.
Re-runnable (it checks what is already there).
"""
import re

P = "/home/claude/homepage/project/VersionB.dc.html"
s = open(P, encoding="utf-8").read()

# ---------------------------------------------------------------- 1. What it reads: one row of pills
a = s.index('<div class="pl-bento"')
b = s.index("</div>\n</section>", a) + len("</div>")
ICON = {
    "Colors": '<circle cx="13.5" cy="6.5" r=".5" fill="currentColor"></circle><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"></circle><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"></circle><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"></circle><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"></path>',
    "Fonts": '<polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" x2="15" y1="20" y2="20"></line><line x1="12" x2="12" y1="4" y2="20"></line>',
    "Layout": '<rect width="7" height="7" x="3" y="3" rx="1"></rect><rect width="7" height="7" x="14" y="3" rx="1"></rect><rect width="7" height="7" x="14" y="14" rx="1"></rect><rect width="7" height="7" x="3" y="14" rx="1"></rect>',
    "Motion": '<path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>',
}
pills = "".join(
    f'<li class="pl-readpill"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{svg}</svg><span>{name}</span></li>'
    for name, svg in ICON.items())
s = s[:a] + (f'<div class="pl-reads"><ul class="pl-readrow">{pills}</ul>'
             '<p class="pl-readnote">Your words, images and brand stay yours.</p></div>') + s[b:]

# ---------------------------------------------------------------- 2. How it works: more in each animation
CHECK = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>'
SW = lambda c: f'<i style="background:{c}"></i>'

# 01 Pick: labels on the outline, and what it read
old = '<span class="pl-lp pl-c1-box"></span>'
if old in s:
    s = s.replace(old, '<span class="pl-lp pl-c1-box"><span class="pl-c1-tag pl-c1-tag1">Card: Fast</span><span class="pl-c1-tag pl-c1-tag2">Section: features (3 cards)</span></span>')
anchor = '<span class="pl-picktoast"'
if "pl-c1-read" not in s:
    s = s.replace(anchor, ('<div class="pl-lp pl-c1-read" aria-hidden="true"><b>What it read</b>'
                           f'<span class="pl-c1-r1"><em>Colors</em><span class="pl-sw">{SW("#5b4bd5")}{SW("#efeafd")}{SW("#151515")}{SW("#ff6a2b")}</span></span>'
                           '<span class="pl-c1-r2"><em>Fonts</em><span>Inter 600 · 15px</span></span>'
                           '<span class="pl-c1-r3"><em>Layout</em><span>3 columns · gap 24px</span></span>'
                           '<span class="pl-c1-r4"><em>Motion</em><span>Hover: lifts 4px in 200ms</span></span></div>') + anchor, 1)

# 02 Choose: what each choice takes
anchor = '<span class="pl-addbtn"'
if "pl-c2-val1" not in s:
    s = s.replace(anchor, (f'<span class="pl-lp pl-c2-val pl-c2-val1" aria-hidden="true"><span class="pl-sw">{SW("#5b4bd5")}{SW("#efeafd")}{SW("#151515")}{SW("#ff6a2b")}</span>5 colors</span>'
                           '<span class="pl-lp pl-c2-val pl-c2-val2" aria-hidden="true">3 columns · gap 24px</span>'
                           '<span class="pl-lp pl-c2-val pl-c2-val3" aria-hidden="true">Your fonts stay</span>') + anchor, 1)

# 03 Paste: copied, thinking, edit, preview
anchor = '<span class="pl-pastechip"'
if "pl-c3-copied" not in s:
    s = s.replace(anchor, f'<span class="pl-lp pl-c3-copied" aria-hidden="true"><span style="display: inline-flex; color: var(--how-green)">{CHECK}</span>Copied to your clipboard</span>' + anchor, 1)
anchor = '<span class="pl-reply">'
if "pl-c3-think" not in s:
    s = s.replace(anchor, ('<span class="pl-c3-think" translate="no">Thinking…</span>'
                           f'<span class="pl-c3-step" translate="no"><span style="display: inline-flex; color: #3f8f3f">{CHECK}</span>Edited <b>pricing.html</b> <em>+18 −6</em></span>') + anchor, 1)
old = '<path d="M20 6 9 17l-5-5"></path></svg> pricing.html updated</span>'
if old in s and "pl-c3-cards" not in s:
    s = s.replace(old, old + '\n<span class="pl-c3-cards" aria-hidden="true"><i></i><i></i><i></i></span>', 1)

CSS = r"""
/* round nov25a: "What it reads" as one row of pills */
.pl-reads{display:flex;flex-wrap:wrap;align-items:center;gap:12px 20px}
.pl-readrow{display:flex;flex-wrap:wrap;gap:8px;margin:0;padding:0;list-style:none}
.pl-readpill{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 16px;box-sizing:border-box;border-radius:999px;border:1px solid var(--how-line);background:var(--how-panel);color:var(--how-card-title);font-size:15px;font-weight:500}
.pl-readpill svg{color:var(--how-green-ink)}
.pl-readnote{margin:0;font-size:14px;color:var(--how-text)}

/* round nov25a: more in each How-it-works animation */
.pl-sw{display:inline-flex;gap:3px}.pl-sw i{width:12px;height:12px;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(21,21,21,.12)}
/* 01 Pick: the outline's label, then what it read */
.pl-c1-tag{position:absolute;left:-2px;top:-24px;padding:3px 8px;border-radius:6px;background:var(--pl-accent);color:#151515;font-size:11px;font-weight:600;white-space:nowrap;animation-duration:8s;animation-iteration-count:infinite;animation-fill-mode:both}
.pl-c1-tag1{animation-name:pl-c1-tag1}.pl-c1-tag2{animation-name:pl-c1-tag2}
@keyframes pl-c1-tag1{0%,12%{opacity:0}14%,30%{opacity:1}32%,100%{opacity:0}}
@keyframes pl-c1-tag2{0%,32%{opacity:0}36%,86%{opacity:1}90%,100%{opacity:0}}
.pl-c1-read{position:absolute;right:16px;top:84px;z-index:3;width:min(236px,62%);display:flex;flex-direction:column;gap:6px;padding:12px;box-sizing:border-box;border-radius:12px;background:rgba(255,255,255,.96);box-shadow:0 0 0 1px rgba(21,21,21,.06),0 16px 32px -12px rgba(21,21,21,.35);font-size:12px;color:#151515;opacity:0;animation:pl-c1-read 8s infinite both}
.pl-c1-read b{font-size:11px;font-weight:600;color:#6f6f78;text-transform:uppercase;letter-spacing:.04em}
.pl-c1-read > span{display:flex;align-items:center;gap:8px;min-width:0;white-space:nowrap;opacity:0;animation:pl-c1-row 8s infinite both}
.pl-c1-read > span > span:not(.pl-sw){overflow:hidden;text-overflow:ellipsis}
.pl-c1-read em{flex:none;width:52px;font-style:normal;color:#6f6f78}
.pl-c1-r1{--a:48%}.pl-c1-r2{animation-name:pl-c1-row2 !important}.pl-c1-r3{animation-name:pl-c1-row3 !important}.pl-c1-r4{animation-name:pl-c1-row4 !important}
@keyframes pl-c1-read{0%,44%{opacity:0;translate:0 8px}48%,86%{opacity:1;translate:0 0}90%,100%{opacity:0;translate:0 8px}}
@keyframes pl-c1-row{0%,48%{opacity:0;translate:-6px 0}52%,86%{opacity:1;translate:0 0}90%,100%{opacity:0}}
@keyframes pl-c1-row2{0%,53%{opacity:0;translate:-6px 0}57%,86%{opacity:1;translate:0 0}90%,100%{opacity:0}}
@keyframes pl-c1-row3{0%,58%{opacity:0;translate:-6px 0}62%,86%{opacity:1;translate:0 0}90%,100%{opacity:0}}
@keyframes pl-c1-row4{0%,63%{opacity:0;translate:-6px 0}67%,86%{opacity:1;translate:0 0}90%,100%{opacity:0}}
/* 02 Choose: what each choice takes */
.pl-c2-val{position:absolute;z-index:5;display:inline-flex;align-items:center;gap:8px;padding:6px 10px;border-radius:8px;background:#ffffff;box-shadow:0 0 0 1px rgba(21,21,21,.06),0 8px 18px -8px rgba(21,21,21,.35);font-size:12px;font-weight:500;color:#151515;white-space:nowrap;opacity:0;animation-duration:8s;animation-iteration-count:infinite;animation-fill-mode:both}
.pl-c2-val1{left:14px;top:136px;animation-name:pl-c2-val1}
.pl-c2-val2{right:14px;top:204px;animation-name:pl-c2-val2}
.pl-c2-val3{left:6%;top:268px;color:#6f6f78;font-weight:450;animation-name:pl-c2-val3}
@keyframes pl-c2-val1{0%,17%{opacity:0;translate:0 -6px;scale:.9}21%,86%{opacity:1;translate:0 0;scale:1}90%,100%{opacity:0}}
@keyframes pl-c2-val2{0%,39%{opacity:0;translate:0 -6px;scale:.9}43%,86%{opacity:1;translate:0 0;scale:1}90%,100%{opacity:0}}
@keyframes pl-c2-val3{0%,46%{opacity:0;translate:0 -6px}50%,86%{opacity:1;translate:0 0}90%,100%{opacity:0}}
/* 03 Paste: copied, then the AI app thinks, edits and shows the new cards */
.pl-c3-copied{position:absolute;left:28px;top:6px;z-index:3;display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;background:#18181b;color:#ffffff;font-size:12px;font-weight:550;white-space:nowrap;box-shadow:0 6px 16px -6px rgba(0,0,0,.4);opacity:0;animation:pl-c3-copied 10s infinite both}
@keyframes pl-c3-copied{0%,14%{opacity:0;translate:0 6px}17%,30%{opacity:1;translate:0 0}33%,100%{opacity:0;translate:0 -6px}}
.pl-c3-think{display:block;overflow:hidden;font-size:13px;background:linear-gradient(90deg,#8a8a90 35%,#151515 50%,#8a8a90 65%) 0 0/250% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:pl-c3-think 10s infinite both,pl-c3-shim 1.1s linear infinite}
@keyframes pl-c3-think{0%,46%{opacity:0;max-height:0}48%,56%{opacity:1;max-height:20px}58%,100%{opacity:0;max-height:0}}
@keyframes pl-c3-shim{from{background-position:100% 0}to{background-position:-150% 0}}
.pl-c3-step{display:flex;align-items:center;gap:6px;overflow:hidden;font-size:12px;color:#55554f;animation:pl-c3-step 10s infinite both}
.pl-c3-step b{font-weight:500;color:#151515}.pl-c3-step em{font-style:normal;color:#3f8f3f}
@keyframes pl-c3-step{0%,55%{opacity:0;max-height:0}58%,90%{opacity:1;max-height:20px}94%,100%{opacity:0;max-height:0}}
.pl-c3-cards{display:grid;grid-template-columns:repeat(3,minmax(0,64px));gap:6px;padding:8px;border-radius:10px;background:#f8f4ec;align-self:flex-start;animation:pl-c3-cardsbox 10s infinite both}
@keyframes pl-c3-cardsbox{0%,71%{opacity:0}73%,90%{opacity:1}94%,100%{opacity:0}}
.pl-c3-cards i{height:28px;border-radius:6px;background:#ffffff;box-shadow:0 0 0 1px #e4ead3;opacity:0;animation:pl-c3-card 10s infinite both}
.pl-c3-cards i:nth-child(2){background:#1f2a12;animation-name:pl-c3-card2}.pl-c3-cards i:nth-child(3){animation-name:pl-c3-card3}
@keyframes pl-c3-card{0%,72%{opacity:0;scale:.8}75%,90%{opacity:1;scale:1}94%,100%{opacity:0}}
@keyframes pl-c3-card2{0%,74%{opacity:0;scale:.8}77%,90%{opacity:1;scale:1}94%,100%{opacity:0}}
@keyframes pl-c3-card3{0%,76%{opacity:0;scale:.8}79%,90%{opacity:1;scale:1}94%,100%{opacity:0}}
.pl-howcard:hover :is(.pl-c1-tag,.pl-c1-read,.pl-c1-read > span,.pl-c2-val,.pl-c3-copied,.pl-c3-think,.pl-c3-step,.pl-c3-cards,.pl-c3-cards i){animation-play-state:paused}
@media (max-width:640px){.pl-c1-read{top:auto;bottom:64px;right:10px;padding:10px;gap:4px;font-size:11px}.pl-c1-read em{width:46px}.pl-c1-r4{display:none !important}.pl-c2-val{font-size:11px}.pl-c2-val3{display:none}}
@media (max-width:480px){.pl-readrow{display:grid;grid-template-columns:1fr 1fr;width:100%}.pl-readpill{justify-content:center}}
@media (prefers-reduced-motion:reduce){
.pl-c1-tag1,.pl-c2-val3,.pl-c3-copied,.pl-c3-think{display:none}
.pl-c1-tag2,.pl-c1-read,.pl-c1-read > span,.pl-c2-val,.pl-c3-step,.pl-c3-cards,.pl-c3-cards i{animation:none !important;opacity:1;max-height:none}
}
"""
if "round nov25a" not in s:
    i = s.index("</style>")
    s = s[:i] + CSS + s[i:]
open(P, "w", encoding="utf-8").write(s)
print("round_nov25a applied")
