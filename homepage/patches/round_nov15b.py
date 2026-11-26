"""Nov 15 (second round): lighter pressed buttons, thick right arrow shown on hover, text rewritten away from "copy",
equal sample-site rows, Stripe-style modular grid (bento feature cards + guide lines). Usage: round_nov15b.py in out"""
import re
import sys

s = open(sys.argv[1]).read()


def rep(old, new, count=None):
    """Replace every occurrence of old; fail loudly when it is missing (or the count differs)."""
    global s
    n = s.count(old)
    if n == 0 or (count is not None and n != count):
        raise SystemExit(f"expected {count or '>0'} of {old[:70]!r}, found {n}")
    s = s.replace(old, new)


# ---------- 1. Arrows: one thick arrow pointing right (Lucide arrow-right) ----------
OLD_PATHS = '<path d="M7 17 17 7"></path><path d="M8 7h9v9"></path>'
NEW_PATHS = '<path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path>'
n = s.count(OLD_PATHS)
s = re.sub(r'(<span class="pl-(?:arw|arrow)"[^>]*><svg[^>]*?)stroke-width="[\d.]+"', r'\1stroke-width="3"', s)
rep(OLD_PATHS, NEW_PATHS)
print("arrows redrawn:", n)

# ---------- 2. Text: away from "copy", livelier ----------
TEXT = [
    # How it works
    ("How PromptLift copies a design", "From “ooh, nice” to your own site in three moves"),
    ("Pick parts: see it in the demo", "Spot it: see it in the demo"),
    (">Pick parts</span>", ">Spot it</span>"),
    ("Click any part of any website.", "Point at anything that catches your eye."),
    ("Choose details: see it in the demo", "Choose the ingredients: see it in the demo"),
    (">Choose details</span>", ">Choose the ingredients</span>"),
    ("Copy only the details you want.", "Take the colors, leave the fonts. Your call."),
    ("Paste anywhere: see it in the demo", "Hand it off: see it in the demo"),
    (">Paste anywhere</span>", ">Hand it off</span>"),
    ("One prompt, ready for your AI app.", "One tidy brief your AI app understands."),
    ("PromptLift writes the parts you picked as one message for the app you use. Your list clears for the next one.",
     "Everything you picked becomes one clear prompt, written for the app you use. Then your list clears for the next find."),
    ("Pick what each prompt copies", "What PromptLift can lift"),
    # Made with PromptLift (the sites are samples, so the line says so)
    (">Made with PromptLift</h2>", ">Ideas, transplanted</h2>"),
    ("Real sites people built with PromptLift from design details they liked elsewhere.",
     "Sample sites showing where one borrowed detail can take a page."),
    # Quick guides
    (">Quick guides</h2>", ">Minute-long tours</h2>"),
    ("Short PromptLift video guides, under a minute each.", "Short videos. Each one teaches a single trick."),
    ("Click once, then press ↑ until the outline holds the whole section.", "Click once, then tap ↑ until the outline hugs the whole section."),
    (">Copy only the colors</h3>", ">Just the colors, please</h3>"),
    ("Turn on Colors and leave the rest off for a short prompt.", "Turn on Colors, leave the rest off, and keep the prompt short."),
    ("Watch the hover-and-press test find a button’s animation.", "Watch PromptLift hover, press and catch a button’s animation in the act."),
    (">Paste into your AI app</h3>", ">Hand it to your AI app</h3>"),
    ("Copy, open your AI app, paste and send.", "Open your AI app, paste, send. That’s the whole ritual."),
    # FAQ (the same sentences sit in the FAQPage JSON-LD, so every occurrence changes)
    (">Frequently asked questions</h2>", ">Questions, answered</h2>"),
    ("PromptLift is a Chrome extension. You click a part of any website you like (a section, a button, an animation) and it writes that design up as one ready-to-paste prompt for your AI app, such as Claude Code, Cursor, ChatGPT, Lovable, v0 or Bolt, so the app can bring it into your own site.",
     "It’s a Chrome extension that turns design you admire into words your AI app can act on. Click a part of any website (a section, a button, an animation) and PromptLift writes it up as one ready-to-paste prompt for Claude Code, Cursor, ChatGPT, Lovable, v0, Bolt and more, so your app can bring that feel to your own site."),
    ("Is it okay to copy another site’s design?", "Is it okay to borrow from another site?"),
    ("PromptLift is made for borrowing ideas, not cloning pages: it describes layout, spacing, type sizes and movement, always shifts colors slightly, and tells your AI app to use your own words, pictures and brand. Leave out other sites’ logos, text and photos. This isn’t legal advice.",
     "PromptLift is built for borrowing ideas, not cloning pages. It describes layout, spacing, type sizes and movement, always shifts colors a little, and tells your AI app to use your own words, pictures and brand. Leave other sites’ logos, text and photos where you found them. This isn’t legal advice."),
    ("Will my site end up looking like a copy?", "Will my site end up looking like someone else’s?"),
    ("No. The prompt asks your AI app to keep your fonts, colors and content wherever they fit, and to change only the parts you picked. You choose what to take from each part: colors, fonts, layout or motion.",
     "No. The prompt asks your AI app to keep your fonts, colors and content wherever they fit and to change only the parts you picked. You decide what each part brings along: colors, fonts, layout or motion."),
    ("DevTools shows the raw code of one element, and a screenshot only shows pixels. PromptLift reads the part you picked (its structure, spacing, fonts, color relationships and movement) and writes it up as clear instructions your AI app can follow.",
     "DevTools shows the raw code of one element; a screenshot only shows pixels. PromptLift reads the part you picked (structure, spacing, fonts, color relationships and movement) and turns it into plain instructions your AI app can follow."),
    ("until you copy it or close the browser.", "until you turn it into a prompt or close the browser."),
    ("Can it copy animations and hover effects?", "Can it catch animations and hover effects?"),
    ("can’t be copied exactly", "can’t be rebuilt exactly"),
    ("A prompt is plain text; after copying, the panel shows how many characters it is. Copy only the details you need (say, just Layout) to keep it short.",
     "A prompt is plain text, and the panel tells you how many characters each one is. Take only the details you need (say, just Layout) to keep it lean."),
    # Call to action
    ("Start building your site from the designs you admire", "The web is full of good ideas. Start lifting."),
    (">Ready to try it?</span>", ">Your first lift is a click away</span>"),
    # Fine print and structured data
    ("it doesn’t copy a site’s text, photos, logos or code", "it never takes a site’s text, photos, logos or code"),
    ("Choose what to copy: colors, fonts, layout or motion", "Choose what to take: colors, fonts, layout or motion"),
    # Demo panel: follows the extension's new wording (9.4.1); clipboard buttons keep "Copy"
    ("ready to copy as one prompt.", "ready to become one prompt."),
    (">Pick what to copy</b>", ">Pick what to lift</b>"),
    (">Choose what to copy</span>", ">Choose what to lift</span>"),
]
for old, new in TEXT:
    rep(old, new)

# Feature cards: a short line under each title (the modular grid gives them room)
FEAT = {
    "Colors and contrast": "The palette and how it plays together, nudged so it’s never a clone.",
    "Fonts and sizes": "Type scale, weights and rhythm, matched to the fonts you already use.",
    "Layout and spacing": "Columns, gaps and the breathing room between them.",
    "Motion and timing": "Hovers, reveals and easing, down to the millisecond.",
    "Fits your site": "Your brand, words and pictures stay yours. Only the feel moves in.",
}
for title, line in FEAT.items():
    rep(f'<h3 style="margin: 0; font-size: 16px; color: var(--how-card-title)">{title}</h3>\n</article>',
        f'<span class="pl-feattext"><h3 style="margin: 0; font-size: 16px; color: var(--how-card-title)">{title}</h3>'
        f'<span class="pl-featline">{line}</span></span>\n</article>', 1)
rep('<h3 id="pl-what" style="margin: 0; font-size: 14px; color: var(--how-text)">What PromptLift can lift</h3>\n<div style="display: flex; flex-direction: row; flex-wrap: wrap; gap: 8px">',
    '<h3 id="pl-what" style="margin: 0; font-size: 14px; color: var(--how-text)">What PromptLift can lift</h3>\n<div class="pl-bento" style="display: flex; flex-direction: row; flex-wrap: wrap; gap: 8px">', 1)

# ---------- 3. CSS ----------
# Both sample-site rows the same size (the second row was scaled to 31%)
rep(".pl-ss-sm{zoom:.3143}\n", "")
# The old up-right nudges give way to the new hover rules below
rep(".pl-btn:hover .pl-arw{transform:translate(2px,-2px)}\n", "")
rep(".pl-howcard:hover .pl-arrow{transform:translate(2px,-2px) !important}\n", "")
rep("@media (prefers-reduced-motion: reduce){.pl-arw{transition:none}.pl-btn:hover .pl-arw,.pl-howcard:hover .pl-arrow{transform:none !important}}\n", "")

CSS = """
/* ===== Version B, 2026-11-15 (second round) ===== */
/* Pressed buttons turn lighter than their resting color */
.pl-btn-main:active{background:#d3e7a0 !important;border-color:#d3e7a0 !important}
.pl-btn-quiet:active{background:rgba(255,255,255,.24) !important}
.pl-howcard:active .pl-seeit{background:#d3e7a0 !important;border-color:#d3e7a0 !important}
/* The arrow (thick, pointing right) only shows while the button is hovered or focused: it opens out after the label */
.pl-arw,.pl-arrow{display:inline-flex;overflow:hidden;max-width:0;margin-left:-8px;opacity:0;transform:translateX(-4px);transition:max-width .28s cubic-bezier(.22,1,.36,1),margin .28s cubic-bezier(.22,1,.36,1),opacity .2s ease,transform .28s cubic-bezier(.22,1,.36,1) !important}
.pl-arrow{margin-left:-6px}
.pl-btn:is(:hover,:focus-visible) .pl-arw,.pl-howcard:is(:hover,:focus-within) .pl-arrow{max-width:18px;margin-left:0;opacity:1;transform:none !important}
@media (prefers-reduced-motion: reduce){.pl-arw,.pl-arrow{transition:none !important}}
/* Modular grid (stripe.com): the feature cards become modules on a 12-column grid, 7 + 5 then 4 + 4 + 4,
   lining up with the 3fr/2fr cards above; each has its icon on top, a title and one line */
.pl-bento{display:grid !important;grid-template-columns:repeat(12,minmax(0,1fr));gap:24px !important}
.pl-bento > .pl-featcard{grid-column:span 4;flex-direction:column !important;align-items:flex-start !important;justify-content:space-between;gap:28px !important;min-height:176px}
.pl-bento > .pl-featcard:nth-child(1){grid-column:span 7}
.pl-bento > .pl-featcard:nth-child(2){grid-column:span 5}
.pl-feattext{display:flex;flex-direction:column;gap:6px}
.pl-featline{font-size:14px;line-height:1.5;color:var(--how-text)}
@media (max-width:900px){.pl-bento{grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px !important}.pl-bento > .pl-featcard,.pl-bento > .pl-featcard:nth-child(n){grid-column:span 1;min-height:0}.pl-bento > .pl-featcard:nth-child(1){grid-column:1 / -1}}
@media (max-width:560px){.pl-bento > .pl-featcard:nth-child(n){grid-column:1 / -1}}
/* Grid guide lines (stripe.com): thin dashed lines run down the page behind the content, at the edges of the 1300px column
   and at its quarters (edges only on phones); they show in the gaps between the modules */
main::after{content:"";position:absolute;z-index:0;pointer-events:none;top:950px;bottom:0;left:50%;width:min(1300px,calc(100% - 40px));transform:translateX(-50%);
  --pl-guide:linear-gradient(rgba(21,21,21,.09) 50%,transparent 0);
  background:var(--pl-guide) 0 0/1px 8px repeat-y,var(--pl-guide) 25% 0/1px 8px repeat-y,var(--pl-guide) 50% 0/1px 8px repeat-y,var(--pl-guide) 75% 0/1px 8px repeat-y,var(--pl-guide) 100% 0/1px 8px repeat-y}
@media (max-width:900px){main::after{top:0;background:var(--pl-guide) 0 0/1px 8px repeat-y,var(--pl-guide) 100% 0/1px 8px repeat-y}}
"""
rep("/* ===== Version B, 2026-11-15 ===== */", CSS.strip() + "\n\n/* ===== Version B, 2026-11-15 ===== */", 1)

open(sys.argv[2], "w").write(s)
left = [m for m in re.findall(r'>([^<>]*\b[Cc]op(?:y|ies|ied|ying)\b[^<>]*)<', s[s.index('<main'):])]
print("text with 'copy' left:", left)
