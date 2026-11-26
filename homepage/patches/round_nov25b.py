"""Round nov25b: the "Questions" (FAQ) section is back (removed in round_nov19h), above the final call to action,
with its FAQPage structured data. The account answer now says you sign in with Google (10.3.0)."""
import re
import sys

P = "/home/claude/homepage/project/VersionB.dc.html"
OLD = "/tmp/VersionB.before19h.html"   # last version that had it
s = open(P, encoding="utf-8").read()
if 'pl-faq-title' in s.split('</style>', 1)[1]:
    sys.exit("FAQ is already there")
old = open(OLD, encoding="utf-8").read()
i = old.index('<!-- FAQ:'); j = old.index('</section>', old.index('<section aria-labelledby="pl-faq-title"', i)) + len('</section>')
faq = old[i:j]
ld = re.search(r'<script type="application/ld\+json">\{"@context": "https://schema.org", "@type": "FAQPage".*?</script>', old, re.S).group(0)

A_OLD = "No. It runs in your browser and sends nothing to a server. The prompt goes to your clipboard."
A_NEW = "No API key. You sign in once with Google, and your name and email stay in your browser. Nothing is sent to a server; the prompt goes to your clipboard."
Q_OLD, Q_NEW = "Does it need an account or an API key?", "Does it need an account or an API key?"
assert faq.count(A_OLD) == 1 and ld.count(A_OLD) == 1
faq, ld = faq.replace(A_OLD, A_NEW), ld.replace(A_OLD, A_NEW)

anchor = '<section aria-labelledby="pl-cta-title"'
k = s.index(anchor)
k = s.rfind('<!--', 0, k) if s.rfind('-->', 0, k) > s.rfind('</section>', 0, k) else k  # keep the CTA's own comment with it
s = s[:k] + faq + "\n\n\n" + s[k:]
# the structured data goes back next to the other JSON-LD blocks
m = list(re.finditer(r'<script type="application/ld\+json">.*?</script>', s, re.S))
s = s[:m[-1].end()] + "\n" + ld + s[m[-1].end():]
open(P, "w", encoding="utf-8").write(s)
print("round_nov25b applied: FAQ with", faq.count("<details"), "questions")
