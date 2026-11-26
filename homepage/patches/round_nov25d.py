"""Round nov25d: the FAQ list fades out again after the first questions, with "Show all questions" / "Show fewer"
under it (the checkbox + label from before round_nov19b; its CSS never left the page)."""
P = "/home/claude/homepage/project/VersionB.dc.html"
s = open(P, encoding="utf-8").read()
if 'class="pl-sr-only pl-faq-toggle"' in s:
    raise SystemExit("already there")
old = '<div class="pl-faqwrap"><div id="pl-faqlist" style="'
assert s.count(old) == 1
s = s.replace(old, '<div class="pl-faqwrap"><input type="checkbox" id="pl-faq-more" class="pl-sr-only pl-faq-toggle" aria-controls="pl-faqlist"><div id="pl-faqlist" class="pl-faqlist" style="')
i = s.index('<div id="pl-faqlist"')
j = s.index('</div></div></div>', i)
label = ('<label for="pl-faq-more" class="pl-faq-more"><span class="pl-faq-more-a">Show all questions</span><span class="pl-faq-more-b">Show fewer</span>'
         '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg></label>')
s = s[:j] + '</div>\n' + label + '</div></div>' + s[j + len('</div></div></div>'):]
open(P, "w", encoding="utf-8").write(s)
print("round_nov25d applied")
