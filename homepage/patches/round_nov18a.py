"""Round nov18a: on phones and tablets the nine use cards are one swipeable row (scroll-snap) instead of a 2,600px stack;
a small hint under the row says it scrolls. Desktop is unchanged."""
import sys
P = "/home/claude/homepage/project/VersionB.dc.html"
s = open(P, encoding="utf-8").read()
old = "@media (max-width:900px){.pl-uses-band{padding:72px 0}.pl-uses{grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px}.pl-use{grid-column:span 1}}\n@media (max-width:560px){.pl-uses{grid-template-columns:minmax(0,1fr)}}"
new = '.pl-uses-hint{display:none;align-items:center;gap:6px;margin:4px 0 0;font-size:13px;color:#6f6f6a}\n@media (max-width:900px){.pl-uses-band{padding:72px 0}.pl-uses{display:flex;gap:12px;margin:32px -20px 0;padding:0 20px 14px;overflow-x:auto;overscroll-behavior-x:contain;scroll-snap-type:x mandatory;scroll-padding:0 20px;scrollbar-width:thin;scrollbar-color:rgba(21,21,21,.25) transparent}.pl-use{box-sizing:border-box;flex:0 0 min(82vw,340px);scroll-snap-align:start}.pl-uses-hint{display:flex}.pl-uses:focus-visible{outline:2px solid var(--pl-accent-ink);outline-offset:2px}}'
if s.count(old) != 1:
    sys.exit("uses media rules not found")
s = s.replace(old, new)
anchor = '<div class="pl-uses">'
if s.count(anchor) != 1:
    sys.exit("uses grid not found")
i = s.index("</div>\n</section>", s.index(anchor)) + len("</div>")
hint = ('\n<p class="pl-uses-hint" aria-hidden="true">Swipe for more <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
        'stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg></p>')
s = s[:i] + hint + s[i:]
# The row scrolls, so keyboard users can focus it and use the arrow keys
s = s.replace(anchor, '<div class="pl-uses" tabindex="0" role="region" aria-label="Ways people use Huescribe">', 1)
open(P, "w", encoding="utf-8").write(s)
print("ok")
