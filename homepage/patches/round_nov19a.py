"""Round nov19a: the "Picked" wordmark, and words that search engines and AI assistants pick up.

- Footer wordmark: "Hue" sits in the picker's outline (light green fill, green line, two square handles), then "scribe".
- New section after the use cases: "Other ways to give your AI a design reference", a short answer plus a comparison
  table (screenshot, DevTools / CSS inspector, DESIGN.md and design-token extractors, component copiers, Huescribe).
  Tables are what AI answers lift for "X vs Y" questions. Categories only, no other products named.
- Five new FAQ answers in the words people use when they ask an AI: generic "vibe-coded" look, DESIGN.md / AGENTS.md /
  Cursor rules, design-token extractors, no account or API key, Codex / Replit / Stitch / Figma Make. FAQPage data
  updated to match (20 questions).
- Structured data: HowTo for the three steps, WebSite, wider SoftwareApplication keywords, and "Updated" in the footer.
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


# ---------- 1. Footer wordmark: "Picked" ----------
rep('<div class="pl-wordmark" aria-hidden="true">Huescribe</div>',
    '<div class="pl-wordmark" aria-hidden="true"><span class="pl-wm-pick">Hue</span>scribe</div>')
rep('<span><a href="#legal">The fine print</a></span>',
    '<span>Updated <time datetime="2026-11-19">November 19, 2026</time> · <a href="#legal">The fine print</a></span>')

# ---------- 2. Comparison section ----------
YES = '<span class="pl-cmp-yes">'
rows = [
    ("Pick just the parts you like", "Crop it", "One element at a time", "The whole site", "One component", YES + "Any mix, from any sites</span>"),
    ("Hover effects and animations", "Can’t show them", "Read by hand", "Sometimes", "Sometimes", YES + "Yes, with timing and easing</span>"),
    ("Keeps your words, pictures and brand", "Up to your prompt", "Up to you", "Up to your prompt", "Brings theirs along", YES + "Yes, the prompt asks for it</span>"),
    ("What your AI app gets", "A picture", "Raw CSS", "A full style file", "Their HTML and CSS", YES + "A short brief written for it</span>"),
]
cols = ["A screenshot", "DevTools or a CSS inspector", "DESIGN.md and design-token extractors", "Component copiers", "Huescribe"]
head = "".join(f'<th scope="col"{" class=\"pl-cmp-us\"" if c == "Huescribe" else ""}>{c}</th>' for c in cols)
body = "".join(
    "<tr><th scope=\"row\">" + r[0] + "</th>" + "".join(
        f'<td{" class=\"pl-cmp-us\"" if i == 4 else ""}>{v}</td>' for i, v in enumerate(r[1:])) + "</tr>"
    for r in rows)
section = f'''<section aria-labelledby="pl-compare" class="pl-compare-band">
<h2 id="pl-compare" class="pl-display" style="margin: 0; color: var(--pl-text); font-weight: 400">Other ways to give your AI a design reference</h2>
<p class="pl-uses-lead">A screenshot shows the look but not the hover. DevTools shows raw CSS for one element at a time. DESIGN.md files and design-token extractors capture a whole site’s design system. Huescribe sits in between: you pick the parts you like, and it writes them up, motion included, as a brief your AI app follows.</p>
<div class="pl-cmp-wrap" tabindex="0" role="region" aria-label="Comparison of ways to give an AI coding tool a design reference">
<table class="pl-cmp"><caption class="pl-sr-only">How Huescribe compares with other ways to show an AI coding tool a design you like</caption>
<thead><tr><th scope="col"><span class="pl-sr-only">What matters</span></th>{head}</tr></thead>
<tbody>{body}</tbody></table>
</div>
</section>
'''
anchor = '<section aria-labelledby="pl-faq-title" class="pl-faqband"'
rep(anchor, section + anchor)

# ---------- 3. Five new FAQ answers ----------
ICON = ('<span class="pl-faq-icon" style="flex: none; display: inline-flex; color: #6f6f6a"><svg width="18" height="18" viewBox="0 0 24 24" '
        'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
        '<path d="M12 5v14M5 12h14"></path></svg></span>')
NEW_FAQ = [
    ("How do I stop my vibe-coded site from looking generic?",
     "AI apps fall back on the same safe layouts when all they get is words like “modern” or “clean”. Give them a real visual reference instead: pick a section you like on any site, and Huescribe describes its spacing, type, colors and motion precisely, so the result looks designed, not generated."),
    ("Can I save the prompt as a DESIGN.md file or a Cursor rule?",
     "Yes. The prompt is plain text, so you can keep it in a DESIGN.md or AGENTS.md file, or as a Cursor rule in .cursor/rules. Your coding agent then follows that design reference on every request, not just once."),
    ("How is it different from DESIGN.md generators and design token extractors?",
     "Those export a whole site’s design system: every color, font and spacing value. Huescribe works at the level of the parts you like, such as one hero section, one pricing table or one hover effect. It describes how they look and move, where they go on your site, and keeps the rest of your style."),
    ("Does it need an account or an API key?",
     "No. Huescribe runs entirely in your browser. There’s no sign-up, no API key and no Huescribe server: it reads the page you’re on and puts the prompt on your clipboard."),
    ("Does it work with Codex, Replit, Google Stitch or Figma Make?",
     "Yes. The prompt is plain text, so it works anywhere you can paste one, including Codex, Replit, Google Stitch, Figma Make and Windsurf. The panel’s app menu also tunes the wording for ten apps, among them Claude Code, Cursor, ChatGPT, Lovable, v0 and Bolt."),
]
items = "".join(
    f'<details class="pl-faq" name="pl-faq" style="border-top: 1px solid var(--pl-line)">\n'
    f'<summary style="display: flex; align-items: center; justify-content: space-between; gap: 24px; min-height: 44px; padding: 20px 0; '
    f'font-size: 17px; font-weight: 500; color: var(--pl-text); cursor: pointer; list-style: none">{q}{ICON}</summary>\n'
    f'<p style="margin: -6px 0 0; padding: 0 48px 22px 0; max-width: 640px; font-size: 15px; line-height: 1.6; color: #55554f">{a}</p>\n'
    f'</details>\n'
    for q, a in NEW_FAQ)
# After the vibe-coding question (the closest topic), so the most-asked ones stay near the top.
m = re.search(r'(<details class="pl-faq" name="pl-faq"[^>]*>\n<summary[^>]*>What is vibe coding, and where does Huescribe fit\?.*?</details>\n)', s, re.S)
if not m:
    sys.exit("vibe coding FAQ item not found")
s = s[:m.end()] + items + s[m.end():]

# FAQPage structured data: same questions, same order as on the page.
ld = re.search(r'<script type="application/ld\+json">(\{"@context": "https://schema.org", "@type": "FAQPage".*?)</script>', s, re.S)
faq = json.loads(ld.group(1))
names = [q["name"] for q in faq["mainEntity"]]
at = names.index("What is vibe coding, and where does Huescribe fit?") + 1
for i, (q, a) in enumerate(NEW_FAQ):
    faq["mainEntity"].insert(at + i, {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}})
s = s[:ld.start(1)] + json.dumps(faq, ensure_ascii=False) + s[ld.end(1):]

# ---------- 4. More structured data ----------
rep('"keywords": "website design to prompt, AI prompt generator for web design, vibe coding, design prompt, Claude Code, Cursor, Lovable, v0, Bolt, color palette extractor, font finder, CSS inspector, design tokens, web design inspiration"',
    '"keywords": "website design to prompt, AI prompt generator for web design, vibe coding, design prompt, design reference for AI, '
    'copy UI component to AI, DESIGN.md, design system extractor, design tokens, Claude Code, Cursor, Codex, Lovable, v0, Bolt, Replit, '
    'color palette extractor, font finder, CSS inspector, hover effect, animation, web design inspiration"')
howto = {
    "@context": "https://schema.org", "@type": "HowTo",
    "name": "How to turn a website design you like into an AI prompt",
    "description": "Use the Huescribe Chrome extension to pick parts of any website and paste them into your AI coding app as one design prompt.",
    "tool": [{"@type": "HowToTool", "name": "Google Chrome with the Huescribe extension"}, {"@type": "HowToTool", "name": "An AI coding app such as Claude Code, Cursor, Lovable, v0 or Bolt"}],
    "step": [
        {"@type": "HowToStep", "position": 1, "name": "Point at anything that catches your eye", "text": "Open the Huescribe side panel on a site you like and click the part you want: a section, a button, a hover effect or an animation. Press the up arrow to grow the pick to the whole section, or drag a box around any area."},
        {"@type": "HowToStep", "position": 2, "name": "Take the colors, leave the fonts", "text": "Turn on what you want from it: colors, fonts, layout or motion. Add parts from as many sites as you like to your list."},
        {"@type": "HowToStep", "position": 3, "name": "Paste one tidy brief into your AI app", "text": "Copy the prompt and paste it into your AI app. It brings the look to your own site while keeping your words, pictures and brand."},
    ],
}
website = {"@context": "https://schema.org", "@type": "WebSite", "name": "Huescribe", "inLanguage": "en",
           "description": "Huescribe is a Chrome extension that turns any website’s design into an AI prompt for vibe coding."}
first_ld = '<script type="application/ld+json">{"@context": "https://schema.org", "@type": "SoftwareApplication"'
rep(first_ld, '<script type="application/ld+json">' + json.dumps(website, ensure_ascii=False) + '</script>\n'
    '<script type="application/ld+json">' + json.dumps(howto, ensure_ascii=False) + '</script>\n' + first_ld)

# ---------- 5. Styles ----------
css = """
/* ===== Version B, 2026-11-19: the "Picked" wordmark and the comparison table ===== */
/* Footer wordmark: "Hue" in the picker's outline (fill, line, two square handles), scaled with the wordmark */
.pl-wm-pick{position:relative;display:inline-block;margin-right:.08em;padding:0 .04em;border-radius:.03em;background:rgba(185,217,106,.22);box-shadow:0 0 0 .018em rgba(91,111,42,.42)}
.pl-wm-pick::before,.pl-wm-pick::after{content:"";position:absolute;width:.07em;height:.07em;box-sizing:border-box;background:#fcfcfc;border:.012em solid rgba(91,111,42,.55);border-radius:.01em}
.pl-wm-pick::before{left:-.035em;top:-.035em}.pl-wm-pick::after{right:-.035em;bottom:-.035em}
/* Comparison: a plain table; Huescribe's column tinted; scrolls sideways on narrow screens */
.pl-compare-band{width:100%;max-width:1300px;margin:0 auto;padding:96px 0;box-sizing:border-box}
.pl-cmp-wrap{margin-top:36px;overflow-x:auto;overscroll-behavior-x:contain;border:1px solid var(--how-line);border-radius:12px;background:var(--how-card)}
.pl-cmp-wrap:focus-visible{outline:2px solid var(--pl-accent-ink);outline-offset:2px}
.pl-cmp{width:100%;min-width:860px;border-collapse:collapse;font-size:14.5px;line-height:1.45;color:var(--how-text)}
.pl-cmp th,.pl-cmp td{padding:16px 18px;text-align:left;vertical-align:top;border-bottom:1px solid var(--how-line)}
.pl-cmp tbody tr:last-child > *{border-bottom:0}
.pl-cmp thead th{font-size:13px;font-weight:600;color:#151515}
.pl-cmp tbody th{width:22%;font-weight:500;color:#151515}
.pl-cmp .pl-cmp-us{background:var(--how-green-tint)}
.pl-cmp-yes{font-weight:600;color:#151515}
@media (max-width:900px){.pl-compare-band{padding:72px 0}.pl-cmp-wrap{margin-right:-20px;border-right:0;border-radius:12px 0 0 12px}}
/* the whole wordmark shows, so both handles of the outline are visible; the label column stays put while the table scrolls */
.pl-footer .pl-wordmark{margin-bottom:0;padding-bottom:.1em;font-size:clamp(56px,16vw,250px)}
@media (max-width:900px){.pl-cmp{min-width:820px}.pl-cmp tbody th,.pl-cmp thead th:first-child{position:sticky;left:0;z-index:1;width:132px;background:var(--how-card);box-shadow:1px 0 0 var(--how-line)}}
"""
anchor_css = "/* ===== Version B, 2026-11-15 (eleventh round) ===== */"
rep(anchor_css, css.strip("\n") + "\n\n" + anchor_css)

open(P, "w", encoding="utf-8").write(s)
print("ok", len(faq["mainEntity"]), "FAQ items")
