"""Nov 15 (ninth round): the three step cards get an expander button instead of "See it"; it opens a sheet that slides up
from the bottom with the step in more detail (native popover: no script, Esc / outside click / close button dismiss it).
Usage: round_nov15i.py in out"""
import re
import sys

s = open(sys.argv[1]).read()


def rep(old, new, count=1):
    global s
    if s.count(old) != count:
        raise SystemExit(f"expected {count} of {old[:70]!r}, found {s.count(old)}")
    s = s.replace(old, new)


def keys(*ks):
    return "".join(f'<kbd class="pl-k">{k}</kbd>' for k in ks)


STEPS = [
    ("spot", "01", "Spot it", "Point at anything that catches your eye.",
     "Open the PromptLift panel on any website and click what you like. An outline follows your pointer and shows what you’re about to pick, with its name and size.",
     [(keys("Click"), "Pick the part under your pointer: a button, a card, a heading, a whole pricing table."),
      (keys("↑", "↓"), "Grow the pick to the whole section around it, or step back down to the part you started with."),
      (keys("Drag"), "Draw a box around any area, even one that spans several parts."),
      (keys("Esc"), "Stop picking. Everything you added stays in your list.")],
     "Things that move count too: pick a button with a nice hover, then turn on Motion in the next step."),
    ("choose", "02", "Choose the ingredients", "Take the colors, leave the fonts. Your call.",
     "Every pick asks what you want from it. Turn on only what you need: the prompt stays short, and your site keeps the rest of its own style.",
     [("<b>Colors</b>", "The palette and how it’s used, shifted a little so it’s never a clone."),
      ("<b>Fonts</b>", "Type sizes, weights and spacing, matched to the fonts you already use."),
      ("<b>Layout</b>", "Columns, gaps, alignment and the breathing room around things."),
      ("<b>Motion</b>", "Hovers, presses and animations: timing, easing and what sets them off."),
      ("<b>Single parts</b>", "Just one detail instead, such as a gradient or a single hover effect.")],
     "Press " + keys("⌘", "↵") + " to add the pick to your list and move on to the next one."),
    ("hand", "03", "Hand it off", "One tidy brief your AI app understands.",
     "Your list gathers picks from as many sites as you like. When you’re ready, PromptLift writes them up as one prompt for the AI app you use.",
     [("<b>Your AI app</b>", "Choose Claude Code, Cursor, ChatGPT, Lovable, v0, Bolt or another at the top of the panel; the prompt is written for it."),
      ("<b>Where it goes</b>", "Say where each part belongs, like “my pricing page”. Optional, but it helps."),
      ("<b>My instructions</b>", "Your own standing notes, added to every prompt you make."),
      (keys("⌘", "↵"), "Make the prompt. It lands on your clipboard, and the panel shows how long it is."),
      (keys("⌘", "V"), "Paste it into your AI app and send. Undo and “Copy again” stay on hand.")],
     "Nothing changes on your site until your AI app makes the edit, so you can review every change first."),
]

PLUS = ('<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.75" '
        'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14"></path><path d="M5 12h14"></path></svg>')
CLOSE = ('<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" '
         'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>')

# The old "See it" pill (decoration) becomes the round expander mark
seeit = re.compile(r'<span aria-hidden="true" class="pl-seeit".*?</svg></span></span>', re.S)
found = seeit.findall(s)
if len(found) != 3:
    raise SystemExit(f"expected 3 See it pills, found {len(found)}")
s = seeit.sub(f'<span aria-hidden="true" class="pl-expander">{PLUS}</span>', s)

# Each card's whole-card link (to the demo) becomes the button that opens that step's sheet; the sheet follows it
cardlinks = re.findall(r'<a href="#demo" class="pl-cardlink" style="position: absolute; inset: 0; z-index: 4;[^>]*><span class="pl-sr-only">[^<]*</span></a>', s)
if len(cardlinks) != 3:
    raise SystemExit(f"expected 3 step card links, found {len(cardlinks)}")
for old, (key, num, label, title, lead, rows, tip) in zip(cardlinks, STEPS):
    rows_html = "".join(f'<li><span class="pl-sheet-key">{k}</span><span>{t}</span></li>' for k, t in rows)
    sheet = (f'<div id="pl-sheet-{key}" popover class="pl-sheet" role="dialog" aria-labelledby="pl-sheet-{key}-t">'
             f'<span class="pl-sheet-grab" aria-hidden="true"></span>'
             f'<button type="button" class="pl-sheet-close" popovertarget="pl-sheet-{key}" popovertargetaction="hide" aria-label="Close">{CLOSE}</button>'
             f'<span class="pl-sheet-num">{num} · {label}</span>'
             f'<h3 id="pl-sheet-{key}-t" class="pl-sheet-title">{title}</h3>'
             f'<p class="pl-sheet-lead">{lead}</p>'
             f'<ul class="pl-sheet-rows">{rows_html}</ul>'
             f'<p class="pl-sheet-tip">{tip}</p></div>')
    button = (f'<button type="button" class="pl-cardlink" popovertarget="pl-sheet-{key}" aria-haspopup="dialog" '
              f'style="position: absolute; inset: 0; z-index: 4; border-radius: 12px; font-size: 16px; border: 0; padding: 0; background: transparent; cursor: pointer">'
              f'<span class="pl-sr-only">{label}: more detail</span></button>')
    rep(old, button + sheet)

CSS = """/* ===== Version B, 2026-11-15 (ninth round) ===== */
/* Step cards: a round expander (plus) in place of "See it"; the whole card opens a sheet from the bottom with more detail.
   The sheet is a native popover: Esc, a click outside or the close button dismiss it, and focus returns to the card. */
.pl-expander{flex:none;display:inline-grid;place-items:center;width:40px;height:40px;border-radius:50%;background:#B9D96A;color:#151515;transition:background-color .24s ease,rotate .32s cubic-bezier(.22,1,.36,1)}
.pl-howcard:is(:hover,:focus-within) .pl-expander{background:#cbe38a;rotate:90deg}
.pl-howcard:active .pl-expander{background:#dcecb0}
.pl-howcard:has(.pl-sheet:popover-open) .pl-expander{rotate:45deg}
.pl-sheet{position:fixed;inset:auto 0 0 0;box-sizing:border-box;width:min(760px,100%);max-height:86vh;margin:0 auto;overflow-y:auto;overscroll-behavior:contain;padding:32px 32px 40px;border:0;border-radius:22px 22px 0 0;background:#fcfcfc;color:#151515;font-family:Inter,ui-sans-serif,system-ui,sans-serif;text-align:left;box-shadow:0 -24px 60px -24px rgba(21,21,21,.45);translate:0 0;transition:translate .45s cubic-bezier(.22,1,.36,1),overlay .45s allow-discrete,display .45s allow-discrete}
.pl-sheet:not(:popover-open){translate:0 100%}
@starting-style{.pl-sheet:popover-open{translate:0 100%}}
.pl-sheet::backdrop{background:rgba(21,21,21,.38);opacity:1;transition:opacity .45s ease,overlay .45s allow-discrete,display .45s allow-discrete}
.pl-sheet:not(:popover-open)::backdrop{opacity:0}
@starting-style{.pl-sheet:popover-open::backdrop{opacity:0}}
.pl-sheet-grab{display:block;width:44px;height:5px;margin:-16px auto 20px;border-radius:99px;background:rgba(21,21,21,.16)}
.pl-sheet-close{position:absolute;top:16px;right:16px;display:grid;place-items:center;width:44px;height:44px;border:1px solid rgba(21,21,21,.12);border-radius:50%;background:#fff;color:#151515;cursor:pointer;transition:background-color .2s ease}
.pl-sheet-close:hover{background:#f2f8e3}.pl-sheet-close:focus-visible{outline:2px solid #5b6f2a;outline-offset:2px}
.pl-sheet-num{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:12px;font-weight:500;color:#5b6f2a}
.pl-sheet-title{margin:8px 56px 0 0 !important;font-family:"Newsreader",Georgia,serif !important;font-size:clamp(26px,4vw,36px) !important;font-weight:400 !important;line-height:1.08 !important;letter-spacing:-.03em !important}
.pl-sheet-lead{margin:14px 0 0;max-width:620px;font-size:16px;line-height:1.6;color:#3f3f3a}
.pl-sheet-rows{margin:24px 0 0;padding:0;list-style:none;border-top:1px solid rgba(21,21,21,.1)}
.pl-sheet-rows li{display:grid;grid-template-columns:150px minmax(0,1fr);gap:16px;align-items:baseline;padding:14px 0;border-bottom:1px solid rgba(21,21,21,.1);font-size:15px;line-height:1.55;color:#3f3f3a}
.pl-sheet-key b{font-weight:600;color:#151515}
.pl-k{display:inline-grid;place-items:center;min-width:24px;height:24px;margin-right:4px;padding:0 7px;box-sizing:border-box;border:1px solid #e7e7e5;border-bottom-width:2px;border-radius:6px;background:#fff;font:600 12px/1 Inter,ui-sans-serif,system-ui,sans-serif;color:#111113}
.pl-sheet-tip{margin:22px 0 0;padding:14px 18px;border-radius:12px;background:#f2f8e3;font-size:14.5px;line-height:1.55;color:#2c3a14}
@media (max-width:560px){.pl-sheet{padding:28px 20px 32px}.pl-sheet-rows li{grid-template-columns:minmax(0,1fr);gap:4px}}
@media (prefers-reduced-motion: reduce){.pl-sheet,.pl-sheet::backdrop,.pl-expander{transition:none}}

"""
anchor = "/* ===== Version B, 2026-11-15 (eighth round) ===== */"
rep(anchor, CSS + anchor)
open(sys.argv[2], "w").write(s)
print("ok")
