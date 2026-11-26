"""Nov 15 (tenth round): search terms worked into the homepage: title and descriptions, a one-line hero description,
section labels, feature lines, image descriptions, four new FAQ answers, and structured data rebuilt from the visible FAQ.
Usage: round_nov15j.py in out"""
import html
import json
import re
import sys

s = open(sys.argv[1]).read()


def rep(old, new, count=1):
    global s
    if s.count(old) != count:
        raise SystemExit(f"expected {count} of {old[:70]!r}, found {s.count(old)}")
    s = s.replace(old, new)


TITLE = "PromptLift: turn any website design into an AI prompt"
DESC = ("Chrome extension for vibe coding: click any part of a website and get a ready-to-paste AI prompt with its colors, "
        "fonts, layout and animations, for Claude Code, Cursor, ChatGPT, Lovable, v0 and Bolt.")
rep("<title>PromptLift: turn any website design into a prompt for your AI app</title>", f"<title>{TITLE}</title>")
rep('<meta property="og:title" content="PromptLift: turn any website design into a prompt for your AI app">', f'<meta property="og:title" content="{TITLE}">')
s, n = re.subn(r'(<meta (?:name|property)="(?:description|og:description)" content=")[^"]*(">)', lambda m: m.group(1) + DESC + m.group(2), s)
if n != 2:
    raise SystemExit("descriptions not found")

# Hero: one plain sentence that says what this is, under the headline
rep('own site.</h1>', 'own site.</h1>\n<p class="pl-hero-sub">A Chrome extension that turns any website’s design into an AI prompt for Claude Code, Cursor, Lovable, v0 and Bolt.</p>')

TEXT = [
    (">Prompts written for the AI app you use</h2>", ">Design prompts written for the AI coding tool you use</h2>"),
    (">What PromptLift can lift</h3>", ">What PromptLift can lift from any website</h3>"),
    ("The palette and how it plays together, nudged so it’s never a clone.", "The color palette and its contrast, nudged so it’s never a clone."),
    ("Type scale, weights and rhythm, matched to the fonts you already use.", "Fonts, typography scale and weights, matched to the fonts you already use."),
    ("Columns, gaps and the breathing room between them.", "Layout, columns, spacing and the breathing room between them."),
    ("Hovers, reveals and easing, down to the millisecond.", "CSS animations, hover effects and easing, down to the millisecond."),
    ("Sample sites showing where one borrowed detail can take a page.", "Sample sites showing where one borrowed detail can take a page: web design inspiration, rebuilt with AI."),
    ("Short videos. Each one teaches a single trick.", "Short video guides. Each one teaches a single trick."),
    ("Add PromptLift to Chrome, click what you like on any website, and paste the prompt into your AI app.",
     "Add PromptLift to Chrome, click any part of a website you like, and paste the design prompt into your AI app."),
    ('alt="The PromptLift side panel with a picked pricing section in the list, ready to copy as one prompt"',
     'alt="The PromptLift side panel with a picked website section in the list, ready to become one AI prompt"'),
]
for old, new in TEXT:
    rep(old, new)

ALTS = {
    "8ff4c153ba1e52cdec1ffe92cc6af9e8": "PromptLift picking the features section of a website in Chrome",
    "5ff5e762ec4642b5ae9d1c95db56d699": "PromptLift side panel: choosing colors, fonts, layout or motion for a design prompt",
    "7142327a28c9159d278b61b6ab4d7d81": "PromptLift after the design prompt is on the clipboard, ready to paste into Claude Code",
}
for blob, alt in ALTS.items():
    rep(f'src="/_blob/{blob}" alt=""', f'src="/_blob/{blob}" alt="{alt}"')

# FAQ: four more answers, using the same markup as the others
DETAILS = '<details class="pl-faq" name="pl-faq" style="border-top: 1px solid var(--pl-line)">'
SUMMARY = '<summary style="display: flex; align-items: center; justify-content: space-between; gap: 24px; min-height: 44px; padding: 20px 0; font-size: 17px; font-weight: 500; color: var(--pl-text); cursor: pointer; list-style: none">'
ICON = '<span class="pl-faq-icon" style="flex: none; display: inline-flex; color: #6f6f6a"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg></span></summary>'
P = '<p style="margin: -6px 0 0; padding: 0 48px 22px 0; max-width: 640px; font-size: 15px; line-height: 1.6; color: #55554f">'


def item(q, a):
    return f"{DETAILS}\n{SUMMARY}{q}{ICON}\n{P}{a}</p>\n</details>\n"


VIBE = item("What is vibe coding, and where does PromptLift fit?",
            "Vibe coding means building software by describing what you want to an AI coding tool such as Cursor, Claude Code, Lovable, v0 or Bolt. "
            "The hard part is describing design. PromptLift does that for you: it turns the website design you like into a precise prompt, so the AI gets the colors, fonts, spacing and animations right.")
FONTS = item("Can it find the fonts and color palette a website uses?",
             "Yes. Pick any part of a page and PromptLift reads its fonts, type sizes and weights, and its color palette and contrast, then writes them into the prompt as clear values your AI app can use. Keep just the colors, just the typography, or both.")
REDESIGN = item("Can I use it to redesign my own website?",
                "Yes. Gather the parts you like from a few sites, say where each belongs (like “my pricing page” or “the hero section”), and paste the prompt into the AI tool that builds your site. It updates your design while keeping your content and brand.")

anchor_q3 = f"{DETAILS}\n{SUMMARY}Which AI apps does it work with?"
rep(anchor_q3, VIBE + anchor_q3)                       # after "Do I need to know how to code?"
anchor_mix = f"{DETAILS}\n{SUMMARY}Can I mix parts from different websites?"
rep(anchor_mix, FONTS + REDESIGN + anchor_mix)
rep("How is it different from DevTools or a screenshot?", "How is it different from DevTools, a CSS inspector or screenshot-to-code?", 2)
rep("DevTools shows the raw code of one element; a screenshot only shows pixels. PromptLift reads the part you picked (structure, spacing, fonts, color relationships and movement) and turns it into plain instructions your AI app can follow.",
    "DevTools and CSS inspectors show the raw code of one element, and screenshot-to-code tools only see pixels. PromptLift reads the part you picked (structure, spacing, fonts, color relationships and movement) and turns it into plain instructions your AI app can follow, including hover effects and animations a screenshot can’t show.", 2)

# Structured data: the FAQPage mirrors the visible answers (the price question waits for a real answer)
faq_html = s[s.index('<div id="pl-faqlist"'):s.index('<label for="pl-faq-more"')]
pairs = re.findall(r'<summary[^>]*>(.*?)<span class="pl-faq-icon".*?</summary>\s*<p[^>]*>(.*?)</p>', faq_html, re.S)
pairs = [(html.unescape(re.sub("<[^>]+>", "", q)).strip(), html.unescape(re.sub("<[^>]+>", "", a)).strip()) for q, a in pairs]
pairs = [(q, a) for q, a in pairs if a and "before launch" not in a]
ld = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
    {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in pairs]}
s, n = re.subn(r'<script type="application/ld\+json">\{"@context": "https://schema.org", "@type": "FAQPage".*?</script>',
               lambda m: '<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False) + "</script>", s, count=1, flags=re.S)
if n != 1:
    raise SystemExit("FAQ structured data not found")
print("FAQ answers in structured data:", len(pairs))

# SoftwareApplication: description, features and the search terms it is about
m = re.search(r'<script type="application/ld\+json">(\{"@context": "https://schema.org", "@type": "SoftwareApplication".*?)</script>', s, re.S)
app = json.loads(m.group(1))
app["description"] = DESC
app["featureList"] = [
    "Pick any part of a website: a section, a button, a hover effect or an animation",
    "Choose what to take: color palette, fonts and typography, layout and spacing, or motion",
    "Writes one design prompt for Claude Code, Cursor, ChatGPT, Gemini, Claude, Windsurf, Copilot, Lovable, v0 or Bolt",
    "Runs in the browser with no account and no server",
]
app["keywords"] = ("website design to prompt, AI prompt generator for web design, vibe coding, design prompt, Claude Code, Cursor, "
                   "Lovable, v0, Bolt, color palette extractor, font finder, CSS inspector, design tokens, web design inspiration")
app["offers"] = app.get("offers")  # left as is (no price yet)
app = {k: v for k, v in app.items() if v is not None}
s = s[:m.start(1)] + json.dumps(app, ensure_ascii=False) + s[m.end(1):]

CSS = """/* ===== Version B, 2026-11-15 (tenth round) ===== */
/* Hero: one plain sentence under the headline that says what PromptLift is (for people and for search) */
.pl-hero-sub{margin:14px 0 0;max-width:900px;font-size:clamp(16px,1.3vw,18px);line-height:1.45;color:#ffffff;text-shadow:0 1px 2px rgba(21,21,21,.25)}
@media (min-width: 901px){#demo{margin-top:20px !important;--pl-demo-zoom:1.15}.pl-hero-sub{margin-top:10px}}
/* (the demo is 3% smaller and sits 20px under the buttons, so the top still fits in its 950px) */

"""
rep("/* ===== Version B, 2026-11-15 (ninth round) ===== */", CSS + "/* ===== Version B, 2026-11-15 (ninth round) ===== */")
open(sys.argv[2], "w").write(s)
print("ok")
