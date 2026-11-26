"""Nov 15 (seventh round): even spacing between sections; the FAQ rewritten and reordered (and its structured data to match).
Usage: round_nov15g.py in out"""
import json, re, sys
s = open(sys.argv[1]).read()

# ---------- FAQ: most-asked first (the first seven show before the fade), sharper answers ----------
FAQ = [
 ("What does PromptLift do?",
  "It’s a Chrome extension that turns design you admire into words your AI app can act on. Click a part of any website (a section, a button, an animation) and PromptLift writes it up as one ready-to-paste prompt for Claude Code, Cursor, ChatGPT, Lovable, v0, Bolt and more, so your app can bring that feel to your own site."),
 ("Do I need to know how to code?",
  "No. You paste the prompt into your AI app and it does the building. No site yet? The same prompt tells your app to start one and to ask you what it’s for."),
 ("Which AI apps does it work with?",
  "Claude Code, Cursor, ChatGPT, Gemini, Claude, Windsurf, Copilot, Lovable, v0 and Bolt. Pick yours at the top of the panel. For the changes to land, the app needs to be able to see or edit your site’s code."),
 ("Is PromptLift free?", None),  # price still to be added: stays a placeholder and stays out of the structured data
 ("Is it okay to borrow from another site?",
  "PromptLift is built for borrowing ideas, not cloning pages. It describes layout, spacing, type sizes and movement, always shifts colors a little, and tells your AI app to use your own words, pictures and brand. Leave other sites’ logos, text and photos where you found them. This isn’t legal advice."),
 ("Will my site end up looking like someone else’s?",
  "No. The prompt asks your AI app to keep your fonts, colors and content wherever they fit and to change only the parts you picked. You decide what each part brings along: colors, fonts, layout or motion."),
 ("What if the result isn’t quite right?",
  "Tell your AI app what to change, the way you would with any request. Or go back, adjust what you picked (say, turn Fonts off) and make a fresh prompt. Nothing on your site changes until your app makes the edit."),
 ("Can I mix parts from different websites?",
  "Yes. Your list keeps every part you add, from any site, until you turn it into a prompt or close the browser. The prompt then asks your AI app to make them feel like one site: one button style, one sense of movement."),
 ("Can it catch animations and hover effects?",
  "Yes. Turn on Motion to describe how a part moves: timing, easing and what sets it off, including animations that play as the page loads. Movement drawn in code (like a canvas) can’t be rebuilt exactly, so you get a filmstrip and a description to work from."),
 ("Where does my data go?",
  "Nowhere but your clipboard. PromptLift runs in your browser: it reads the page you’re on and that page’s style files, then puts the prompt on your clipboard. There’s no account and no PromptLift server, and it switches off when you close the panel."),
 ("Which browsers and sites does it work on?",
  "Google Chrome, where it opens as a side panel next to the page. It works on most sites. Chrome’s own pages (like settings and the Web Store) don’t allow extensions, and a tab that was open before PromptLift started may need a reload, which the panel offers."),
 ("Will a prompt use up a lot of my AI credits?",
  "A prompt is plain text, and the panel tells you how many characters each one is. Take only the details you need (say, just Layout) to keep it lean."),
 ("How is it different from DevTools or a screenshot?",
  "DevTools shows the raw code of one element; a screenshot only shows pixels. PromptLift reads the part you picked (structure, spacing, fonts, color relationships and movement) and turns it into plain instructions your AI app can follow."),
]
DETAILS = '<details class="pl-faq" name="pl-faq" style="border-top: 1px solid var(--pl-line)">'
SUMMARY = '<summary style="display: flex; align-items: center; justify-content: space-between; gap: 24px; min-height: 44px; padding: 20px 0; font-size: 17px; font-weight: 500; color: var(--pl-text); cursor: pointer; list-style: none">'
ICON = '<span class="pl-faq-icon" style="flex: none; display: inline-flex; color: #6f6f6a"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg></span></summary>'
P = '<p style="margin: -6px 0 0; padding: 0 48px 22px 0; max-width: 640px; font-size: 15px; line-height: 1.6; color: #55554f">'
for part in (DETAILS, SUMMARY, ICON, P):
    if part not in s: raise SystemExit("FAQ markup changed: " + part[:50])
items = "\n".join(f"{DETAILS}\n{SUMMARY}{q}{ICON}\n{P}{a or '[Add the price before launch.]'}</p>\n</details>" for q, a in FAQ)
start = s.index('<div id="pl-faqlist"')
start = s.index('>', start) + 1
end = s.index('</div>\n<label for="pl-faq-more"', start)
old_n = s[start:end].count('<details')
s = s[:start] + "\n" + items + "\n" + s[end:]
print("FAQ items:", old_n, "->", len(FAQ))
# Structured data mirrors the visible answers (the price question waits for a real answer)
ld = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
      {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in FAQ if a]}
s, n = re.subn(r'<script type="application/ld\+json">\{"@context": "https://schema.org", "@type": "FAQPage".*?</script>',
               lambda m: '<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False) + '</script>', s, count=1, flags=re.S)
if n != 1: raise SystemExit("FAQ structured data not found")

# ---------- Spacing ----------
anchor = "/* ===== Version B, 2026-11-15 (sixth round) ===== */"
if s.count(anchor) != 1: raise SystemExit("anchor missing")
s = s.replace(anchor, """/* ===== Version B, 2026-11-15 (seventh round) ===== */
/* Even spacing: every section below the top has the same 96px above and below its content on desktop (72px on phones and
   tablets). Desktop sections stay at least 950px tall and grow when their content needs more, so nothing scrolls inside
   and nothing touches the next section. */
@media (min-width: 901px){
section[aria-labelledby="pl-how"],section[aria-labelledby="pl-made"],section[aria-labelledby="pl-guides"],.pl-faqband,section[aria-labelledby="pl-cta-title"]{height:auto !important;min-height:950px;padding-top:96px !important;padding-bottom:96px !important;overflow:visible !important}
}
@media (max-width: 900px){
section[aria-labelledby="pl-how"],section[aria-labelledby="pl-made"],section[aria-labelledby="pl-guides"],section.pl-faqband,section[aria-labelledby="pl-cta-title"]{padding-top:72px !important;padding-bottom:72px !important}
}

""" + anchor, 1)
open(sys.argv[2], "w").write(s)
