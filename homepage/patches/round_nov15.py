"""Nov 15: white selection text, no text animations, cleanup and phone fixes. Usage: round_nov15.py in out"""
import re, sys
s = open(sys.argv[1]).read()
n0 = len(s)

def sub(pat, rep, count_expected=None, flags=0):
    global s
    s2, n = re.subn(pat, rep, s, flags=flags)
    if count_expected is not None and n != count_expected:
        raise SystemExit(f"expected {count_expected} got {n}: {pat[:70]}")
    s = s2
    return n

def drop(text):
    global s
    if text not in s: raise SystemExit("missing: " + text[:80])
    s = s.replace(text, "")

# --- 1. Rolling button labels -> plain labels
n = sub(r'<span class="pl-roll"><span class="pl-roll-a">([^<]*)</span><span class="pl-roll-b"[^>]*>[^<]*</span></span>', r'<span>\1</span>')
print("rolling labels removed:", n)
sub(r'\.pl-roll\{[^}]*\}\n?', '', 1)
sub(r'(?m)^\.pl-roll-a,\.pl-roll-b\{[^}]*\}\n?', '', 1)
sub(r'(?m)^\.pl-roll-b\{transform[^}]*\}\n?', '', 1)
sub(r'(?m)^\.pl-btn:hover \.pl-roll-a\{[^}]*\}\n?', '', 1)
sub(r'(?m)^\.pl-btn:hover \.pl-roll-b\{[^}]*\}\n?', '', 1)
sub(r'(?m)^\.pl-howcard:is\(:hover,:focus-within\) \.pl-seeit \.pl-roll-[ab]\{[^}]*\}\n?', '', 2)
sub(r'@media \(prefers-reduced-motion: reduce\)\{\.pl-howcard:is\(:hover,:focus-within\) \.pl-seeit \.pl-roll-a[^\n]*\n', '', 1)
sub(r'  \.pl-roll-a,\.pl-roll-b\{transition:none\}[^\n]*\n', '', 1)
s = s.replace("/* Buttons (ideogram.ai): label slides up and fades, a copy rises in; the button turns darker */",
              "/* Buttons: the fill turns darker on hover (labels stay still) */")
s = s.replace("the headline serif, and the\n   same hover as the main buttons (label rolls up, the fill turns darker), triggered by pointing at the card */",
              "the headline serif, and the\n   same hover as the main buttons (the fill turns darker), triggered by pointing at the card */")

# --- 2. Headline blur-in -> plain words (the h1 is white already)
n = sub(r'<span class="pl-blurin"[^>]*>([^<]*)</span>', r'\1')
print("blur-in spans removed:", n)
sub(r'/\* Headline \(lovable\.dev blur-in\)[^\n]*\n', '', 1)
sub(r'(?m)^\.pl-blurin\{[^\n]*\n', '', 1)
sub(r'@keyframes pl-blurin\{[^\n]*\n', '', 1)
sub(r'  \.pl-blurin\{animation:none[^\n]*\n', '', 1)
s = s.replace("/* Reduced motion: no rolling labels, no blur-in, rows you can scroll instead */", "/* Reduced motion: rows you can scroll instead */")

# --- 3. Typing effects -> text shown as it is
sub(r'\.pl-type1,\.pl-type2,\.pl-type3\{animation-name:pl-type1\}\n\.pl-type2\{animation-name:pl-type2\}\n\.pl-type3\{animation-name:pl-type3\}\n', '', 1)
sub(r'@keyframes pl-type[123]\{[^\n]*\n', '', 3)
sub(r',\.pl-howwide \.pl-typeline(?=,\.pl-howwide \.pl-reply)', '', 1)
sub(r'\.pl-howwide \.pl-typeline\{animation-name:pl-c3-type[^\n]*\n', '', 1)
sub(r'@keyframes pl-c3-type\{[^\n]*\n', '', 1)
s = s.replace(",.pl-key,.pl-typeline,.pl-reply", ",.pl-key,.pl-reply")
s = s.replace(".pl-c4-field,.pl-c4-txt,.pl-c4-toast{animation-duration:10s}", ".pl-c4-field,.pl-c4-toast{animation-duration:10s}")
s = s.replace("white-space:nowrap;clip-path:inset(0 100% 0 0)}", "white-space:nowrap}")
sub(r'\.pl-c4-inT\{animation-name:pl-c4-inT\}\.pl-c4-taT\{animation-name:pl-c4-taT\}\n', '', 1)
sub(r'@keyframes pl-c4-(inT|taT)\{[^\n]*\n', '', 2)
sub(r'@keyframes pl-typein\{[^\n]*\n', '', 1)
s = s.replace("the prompt types in line by line, the AI app replies", "the prompt appears, the AI app replies")
s = s.replace('class="pl-lp pl-c4-txt pl-c4-inT"', 'class="pl-c4-txt"').replace('class="pl-lp pl-c4-txt pl-c4-taT"', 'class="pl-c4-txt"')

# --- 4. Highlighted text: white on the dark site green (white on the light green #B9D96A would be 1.55:1, unreadable)
sub(r'/\* Version B: highlighted \(selected\) text[^\n]*\n::selection\{[^}]*\}',
    '/* Version B: highlighted (selected) text is white on the darker site green #5b6f2a (5.5:1) */\n::selection{background:#5b6f2a;color:#ffffff}', 1)

# --- 5. Dead CSS (classes no longer in the page, rules overridden later in the file)
sub(r'\.pl-mock\{.*?\n\.pl-mock-small \.pl-mock-tag\{display:none\}\n', '', 1, re.S)
sub(r'@media \(max-width:640px\)\{\.pl-mock-big[^\n]*\n', '', 1)
sub(r'/\* Made with PromptLift rail \+ Quick guides \*/\n\.pl-rail\{[^\n]*\n\.pl-rail:focus-visible[^\n]*\n\.pl-railbtn\{[^\n]*\n\.pl-railbtn:hover[^\n]*\n\.pl-railbtn:focus-visible[^\n]*\n', '/* Quick guides */\n', 1)
sub(r'/\* Every block that shows the app sits on the flower photo \(each cropped a little differently\) \*/\n(\.pl-(pickstage|choosestage|howstage|cta-frame)\{background:#6a96b0[^\n]*\n){4}', '', 1)
sub(r'\.pl-cta-frame::before\{content:"";[^\n]*\n', '', 1)
sub(r'\.pl-cta-frame::before\{content:none !important\}\n', '', 1)
sub(r'@keyframes pl-(fadeup|pop|press)\{[^\n]*\n', '', 3)
sub(r'\nmain \.pl-display\{font-family:"Newsreader"[^\n]*\n', '\n', 1)   # same values, set again with !important further up

# --- 6. Phones and tablets: the headline wraps, the demo is only as tall as its windows
s = s.replace("/* ===== Version B, 2026-11-14 ===== */",
"""/* ===== Version B, 2026-11-15 ===== */
/* Below 901px the headline wraps to the screen (it is 902px wide on desktop) and the demo keeps no empty space under it */
@media (max-width: 900px){
#pl-headline{width:auto !important;max-width:100%}
#demo{min-height:0 !important;padding:24px 0 !important}
/* the flower photo covers the whole top box, however tall it gets, edge to edge (the 950px layer is desktop only) */
main::before{display:none}
.pl-top950{box-sizing:border-box;width:calc(100% + 40px);margin:-112px -20px 0;padding:112px 20px 32px;background:#6a96b0 url(/_blob/73a529ddad7b2abea69173e4d7205e06) center bottom / cover no-repeat}
/* the AI app window sits under the demo here, so it stays visible instead of leaving an empty gap for most of the loop */
#demo .pl-ai,#demo .pl-result{animation:none !important;opacity:1 !important;transform:none !important}
}
/* Phones: the PromptLift panel sits under the site in the demo instead of being squeezed beside it */
@media (max-width: 640px){
#demo div:has(> .pl-panel){flex-direction:column}
#demo .pl-panel{width:100% !important;border-left:0 !important;border-top:1px solid rgba(17,17,19,0.08)}
}

/* ===== Version B, 2026-11-14 ===== */""", 1)

old = '<span style="display: flex; align-items: center; gap: 14px; font-size: 11px; color: #6b665d">Features'
if s.count(old) != 1: raise SystemExit("demo nav not found")
s = s.replace(old, '<span class="pl-fn-nav" style="display: flex; align-items: center; gap: 14px; font-size: 11px; color: #6b665d">Features')
s = s.replace("/* Phones: the PromptLift panel sits under", "/* Small phones: the demo site's menu shows only Sign in, so it doesn't run into the logo */\n@media (max-width: 480px){.pl-fn-nav{font-size:0 !important;gap:0 !important}.pl-fn-nav > span{display:none}.pl-fn-nav > span:last-child{display:inline;font-size:11px}}\n/* Phones: the PromptLift panel sits under", 1)
open(sys.argv[2], "w").write(s)
print("bytes", n0, "->", len(s))
