"""Round nov25c: the FAQ asks what people really ask about "copy a website's design for AI" tools (research 2026-11-25:
competing extensions charge $10–$79 a month, people weigh a screenshot against exact values, ask about their framework,
pages behind a login, and whether borrowing a design is OK).

Added: Is it free? / Why not just give my AI app a screenshot? / Does it work with React, Tailwind or my framework? /
Does it work on any website? Reworded: "Will my site look like someone else's?" → "Is it OK to borrow design from
another site?". Removed: "What is vibe coding?" (asked by people learning the term, not by people choosing a tool).
Kept: what it does, coding, AI apps, hover/animations, account/API key, DESIGN.md, result not right.
Rebuilds the list and the FAQPage structured data from QA below; re-runnable.
"""
import html
import json
import re

P = "/home/claude/homepage/project/VersionB.dc.html"
s = open(P, encoding="utf-8").read()

QA = [
    ("What does Huescribe do?",
     "It’s a Chrome extension. Click part of any website and it writes a prompt your AI app can use to build that design on your site."),
    ("Is it free?",
     "Yes. There’s no plan to buy and no usage limit, and you don’t need an API key."),
    ("Why not just give my AI app a screenshot?",
     "A screenshot shows the look but not the numbers, so the AI guesses colors, font sizes, spacing and hover timing. Huescribe reads the exact values from the page, and can add the picture too."),
    ("Do I need to know how to code?",
     "No. Your AI app does the building."),
    ("Which AI apps does it work with?",
     "Claude Code, Cursor, ChatGPT, Gemini, Claude, Windsurf, Copilot, Lovable, v0 and Bolt. The prompt is plain text, so Codex, Replit or any other app works too."),
    ("Does it work with React, Tailwind or my framework?",
     "Yes. The prompt describes the design, not code, and tells your AI app to build it with what your project already uses."),
    ("Is it OK to borrow design from another site?",
     "Huescribe takes ideas, not pages. It describes colors, sizes, spacing and motion, never copies text, images, logos or code, and tells your AI app to keep your own words and brand. Use it for inspiration, not to clone a whole site."),
    ("Can it copy hover effects and animations?",
     "Yes. Turn on Motion and the prompt includes timing, easing and what triggers each one."),
    ("Does it work on any website?",
     "On any page you open in Chrome, including pages you’re signed in to. Chrome doesn’t let extensions run on its own pages or the Chrome Web Store."),
    ("Does it need an account or an API key?",
     "No API key. You sign in once with Google, and your name and email stay in your browser. Nothing is sent to a server; the prompt goes to your clipboard."),
    ("Can I save the prompt as a DESIGN.md or Cursor rule?",
     "Yes. It’s plain text, so save it anywhere your AI app reads instructions."),
    ("What if the result isn’t right?",
     "Tell your AI app what to change, or adjust your picks and copy a new prompt."),
]

a = s.index('<div id="pl-faqlist"')
b = s.index('</div></div></div>', a)
first = re.search(r'<details class="pl-faq".*?</details>', s[a:b], re.S).group(0)
q0 = re.search(r'(<summary[^>]*>)(.*?)(<span class="pl-faq-icon")', first, re.S).group(2)
a0 = re.search(r'(</summary>\s*<p[^>]*>)(.*?)(</p>)', first, re.S).group(2)
items = []
for q, ans in QA:
    item = first.replace(f">{q0}<span class=\"pl-faq-icon\"", f">{html.escape(q, quote=False)}<span class=\"pl-faq-icon\"", 1)
    item = item.replace(f">{a0}</p>", f">{html.escape(ans, quote=False)}</p>", 1)
    items.append(item)
head = s[a:s.index('<details', a)]
s = s[:a] + head + "\n".join(items) + "\n" + s[b:]

ld = {"@context": "https://schema.org", "@type": "FAQPage",
      "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": ans}} for q, ans in QA]}
new_ld = '<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False) + '</script>'
s, n = re.subn(r'<script type="application/ld\+json">\{"@context": "https://schema.org", "@type": "FAQPage".*?</script>', new_ld, s, count=1, flags=re.S)
assert n == 1, "FAQPage block not found"
s = s.replace("while the 11 questions scroll past", f"while the {len(QA)} questions scroll past")
open(P, "w", encoding="utf-8").write(s)
print("round_nov25c applied:", len(QA), "questions")
