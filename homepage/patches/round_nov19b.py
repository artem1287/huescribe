"""Round nov19b: fewer words, plainer words.

- Removed the "One extension, a lot of uses" and "Other ways to give your AI a design reference" sections (and their CSS).
- Rewrote the hero line, the three steps (cards and detail sheets), "what it reads", sample sites, CTA and fine print
  in short, plain sentences.
- FAQ cut from 20 questions to 9 short answers; the "Show all questions" toggle is gone since all of them fit.
- Structured data (HowTo, FAQPage) rewritten to match the visible text.
"""
import json
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


# ---------- 1. Remove the two sections ----------
a = s.index('<section aria-labelledby="pl-uses" class="pl-uses-band">')
b = s.index('<section aria-labelledby="pl-faq-title"')
s = s[:a] + s[b:]

# Their CSS
rep('section[aria-labelledby="pl-made"],.pl-uses-band,section.pl-faqband', 'section[aria-labelledby="pl-made"],section.pl-faqband')
s = re.sub(r'\.pl-uses-band\{contain-intrinsic-size:[^}]*\}', '', s)
lines = s.split('\n')
drop = ('.pl-compare-band', '.pl-cmp', '.pl-uses', '.pl-use{', '.pl-use:', '.pl-use ', '@media (max-width:900px){.pl-cmp',
        '@media (max-width:900px){.pl-compare', '@media (max-width:900px){.pl-uses', '@media (prefers-reduced-motion: reduce){.pl-use{')
lines = [l for l in lines if not l.startswith(drop)
         and l not in ('/* Comparison: a plain table; Huescribe\'s column tinted; scrolls sideways on narrow screens */',
                       '/* Use cases: nine cards on the same 12-column modular grid as the feature cards (three per row on desktop) */')]
s = '\n'.join(lines)
if 'pl-cmp' in s or 'pl-uses' in s:
    sys.exit('leftover uses/compare markup or CSS')

# ---------- 2. Hero and apps ----------
rep('A Chrome extension: click the parts you like on any website, and it writes them up as a prompt for Claude Code, Cursor, Lovable, v0 or Bolt.',
    'Pick the parts you like on any website and get a prompt for Claude Code, Cursor, Lovable, v0 or Bolt.')
rep('Works with the AI app you already use', 'Works with your AI app')

# ---------- 3. Three steps ----------
rep('>Three steps from a site you admire to your own</h2>', '>How it works</h2>')
rep('Spot it: more detail', 'Pick: more detail')
rep('01 · Spot it', '01 · Pick')
rep('</span>Spot it</span>', '</span>Pick</span>')
rep('Point at anything that catches your eye.</h3>', 'Click what you like.</h3>', 2)
rep('Open the Huescribe panel on any website and click what you like. An outline follows your pointer and shows what you’re about to pick, with its name and size.',
    'Open the panel on any site. An outline shows what you’re about to pick.')
rep('Pick the part under your pointer: a button, a card, a heading, a whole pricing table.', 'Pick a button, a card, a whole section.')
rep('Grow the pick to the whole section around it, or step back down to the part you started with.', 'Grow to the section around it, or back.')
rep('Draw a box around any area, even one that spans several parts.', 'Box any area.')
rep('Stop picking. Everything you added stays in your list.', 'Stop. Your list stays.')
rep('Things that move count too: pick a button with a nice hover, then turn on Motion in the next step.', 'Hover effects count too.')

rep('Choose the ingredients: more detail', 'Choose: more detail')
rep('02 · Choose the ingredients', '02 · Choose')
rep('</span>Choose the ingredients</span>', '</span>Choose</span>')
rep('Take the colors, leave the fonts. Your call.</h3>', 'Take the colors, skip the fonts.</h3>', 2)
rep('Every pick asks what you want from it. Turn on only what you need: the prompt stays short, and your site keeps the rest of its own style.',
    'Turn on only what you need. Your site keeps the rest.')
rep('The palette and how it’s used, shifted a little so it’s never a clone.', 'The palette, shifted a little.')
rep('Type sizes, weights and spacing, matched to the fonts you already use.', 'Sizes and weights, on your own fonts.')
rep('Columns, gaps, alignment and the breathing room around things.', 'Columns and spacing.')
rep('Hovers, presses and animations: timing, easing and what sets them off.', 'Hovers and animations, with timing.')
rep('Just one detail instead, such as a gradient or a single hover effect.', 'One detail, like a gradient.')
rep('to add the pick to your list and move on to the next one.', 'to add it to your list.')

rep('Hand it off: more detail', 'Paste: more detail')
rep('03 · Hand it off', '03 · Paste')
rep('</span>Hand it off</span>', '</span>Paste</span>')
rep('One tidy brief your AI app understands.</h3>', 'One prompt for your AI app.</h3>', 2)
rep('Your list gathers picks from as many sites as you like. When you’re ready, Huescribe writes them up as one prompt for the AI app you use.',
    'Pick from as many sites as you like. Huescribe writes it all up as one prompt.')
rep('Choose Claude Code, Cursor, ChatGPT, Lovable, v0, Bolt or another at the top of the panel; the prompt is written for it.',
    'Pick yours at the top of the panel.')
rep('Say where each part belongs, like “my pricing page”. Optional, but it helps.', 'Optional. Like “my pricing page”.')
rep('Your own standing notes, added to every prompt you make.', 'Notes added to every prompt.')
rep('Make the prompt. It lands on your clipboard, and the panel shows how long it is.', 'Copy the prompt.')
rep('Paste it into your AI app and send. Undo and “Copy again” stay on hand.', 'Paste it into your AI app.')
rep('Nothing changes on your site until your AI app makes the edit, so you can review every change first.',
    'Nothing on your site changes until your AI app edits it.')
rep('Everything you picked becomes one clear prompt, written for the app you use. Then your list clears for the next find.',
    'Everything you picked, in one prompt.')

# ---------- 4. What it reads ----------
rep('What Huescribe picks up from a page', 'What it reads')
rep('The palette and its contrast, nudged a little so you never end up with a copy.', 'Palette and contrast, shifted a little.')
rep('Sizes and weights, mapped onto the fonts you already use.', 'Sizes and weights, on your own fonts.')
rep('Layout, columns, spacing and the breathing room between them.', 'Columns, gaps and alignment.')
rep('CSS animations, hover effects and easing, down to the millisecond.', 'Hovers and animations, to the millisecond.')
rep('Your brand, words and pictures stay yours. Only the feel moves in.', 'Your words, images and brand stay yours.')

# ---------- 5. Sample sites ----------
rep('Ideas, transplanted', 'Sample sites')
rep('Made-up sample sites, each built around one detail borrowed from somewhere else.', 'Made-up sites, each with one borrowed detail.')

# ---------- 6. FAQ: 9 short answers ----------
FAQ = [
    ("What does Huescribe do?",
     "It’s a Chrome extension. Click part of any website and it writes a prompt your AI app can use to build that design on your site."),
    ("Do I need to know how to code?",
     "No. Your AI app does the building."),
    ("Which AI apps does it work with?",
     "Claude Code, Cursor, ChatGPT, Gemini, Claude, Windsurf, Copilot, Lovable, v0 and Bolt. The prompt is plain text, so Codex, Replit or any other app works too."),
    ("What is vibe coding?",
     "Building software by describing it to an AI app. Design is the hardest part to describe. Huescribe does that part."),
    ("Will my site look like someone else’s?",
     "No. Colors are shifted, and your words, images and brand stay. Only the parts you picked change."),
    ("Can it copy hover effects and animations?",
     "Yes. Turn on Motion and the prompt includes timing, easing and what triggers each one."),
    ("Does it need an account or an API key?",
     "No. It runs in your browser and sends nothing to a server. The prompt goes to your clipboard."),
    ("Can I save the prompt as a DESIGN.md or Cursor rule?",
     "Yes. It’s plain text, so save it anywhere your AI app reads instructions."),
    ("What if the result isn’t right?",
     "Tell your AI app what to change, or adjust your picks and copy a new prompt."),
]
a = s.index('<div class="pl-faqwrap">')
first = s.index('<details class="pl-faq"', a)
end_first = s.index('</details>', first) + len('</details>')
tpl = s[first:end_first]
q0, a0 = FAQ[0]
m_q = re.search(r'(list-style: none">)(.*?)(<span class="pl-faq-icon")', tpl)
m_a = re.search(r'(color: #55554f">)(.*?)(</p>)', tpl)
if not (m_q and m_a):
    sys.exit('FAQ template not understood')


def item(q, ans):
    t = tpl[:m_q.start(2)] + q + tpl[m_q.end(2):]
    off = len(q) - (m_q.end(2) - m_q.start(2))
    return t[:m_a.start(2) + off] + ans + t[m_a.end(2) + off:]


b = s.index('</label></div></div>', a) + len('</label></div></div>')
s = s[:a] + ('<div class="pl-faqwrap"><div id="pl-faqlist" style="display: flex; flex-direction: column; width: 100%">\n'
             + '\n'.join(item(q, x) for q, x in FAQ) + '\n</div></div></div>') + s[b:]
rep('>Questions, answered</h2>', '>Questions</h2>')

# FAQPage data matches the list
faq_ld = {"@context": "https://schema.org", "@type": "FAQPage",
          "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": x}} for q, x in FAQ]}
s = re.sub(r'<script type="application/ld\+json">\{"@context": "https://schema.org", "@type": "FAQPage".*?</script>',
           lambda _: '<script type="application/ld+json">' + json.dumps(faq_ld, ensure_ascii=False) + '</script>', s, count=1, flags=re.S)

# HowTo data matches the steps
howto = {"@context": "https://schema.org", "@type": "HowTo",
         "name": "How to turn a website design you like into an AI prompt",
         "description": "Pick parts of any website with the Huescribe Chrome extension and paste them into your AI app as one prompt.",
         "tool": [{"@type": "HowToTool", "name": "Google Chrome with the Huescribe extension"},
                  {"@type": "HowToTool", "name": "An AI app such as Claude Code, Cursor, Lovable, v0 or Bolt"}],
         "step": [{"@type": "HowToStep", "position": 1, "name": "Click what you like",
                   "text": "Open the Huescribe panel on any site and click a button, a card or a whole section."},
                  {"@type": "HowToStep", "position": 2, "name": "Choose what to take",
                   "text": "Turn on colors, fonts, layout or motion. Your site keeps the rest."},
                  {"@type": "HowToStep", "position": 3, "name": "Paste the prompt",
                   "text": "Copy one prompt for everything you picked and paste it into your AI app."}]}
s = re.sub(r'<script type="application/ld\+json">\{"@context": "https://schema.org", "@type": "HowTo".*?</script>',
           lambda _: '<script type="application/ld+json">' + json.dumps(howto, ensure_ascii=False) + '</script>', s, count=1, flags=re.S)

# ---------- 7. CTA ----------
rep('The web is full of good ideas. Borrow a few.', 'Borrow the good parts.')
rep('Add Huescribe to Chrome, click any part of a website you like, and paste the design prompt into your AI app.',
    'Add it to Chrome and copy your first prompt.')
rep('<span>Your first prompt is one click away</span>', '<span>Chrome extension</span>')

# ---------- 8. Fine print ----------
rep('They are named only to say which apps Huescribe writes prompts for; Huescribe isn’t affiliated with, sponsored or endorsed by any of them.',
    'Huescribe isn’t affiliated with or endorsed by any of them.')
rep('Huescribe describes design (layout, spacing, type, color relationships, movement) and shifts colors slightly; it never takes a site’s text, photos, logos or code. You’re responsible for having the right to use anything you put on your site, and for respecting other sites’ terms and trademarks. When in doubt, ask a lawyer.',
    'Huescribe describes design. It never copies a site’s text, photos, logos or code. You’re responsible for what you put on your site.')
rep('The extension runs in your browser: it reads the page you’re on and that page’s style files, and puts the prompt on your clipboard. It has no account and sends nothing to a Huescribe server. This website sets no cookies and serves its fonts and images itself. Full details: ',
    'Everything runs in your browser. No account, nothing sent to a server. This website sets no cookies. Details: ')
rep('Huescribe is provided as is, without warranty. AI apps can make mistakes: review every change before you publish it. Full terms: ',
    'Provided as is, without warranty. AI apps make mistakes, so review changes before you publish. Full terms: ')
rep('Questions, takedown requests or accessibility problems? Write to us through the Support tab on ',
    'Questions or takedown requests: use the Support tab on ')

open(P, 'w', encoding='utf-8').write(s)
print('ok', len(s))
