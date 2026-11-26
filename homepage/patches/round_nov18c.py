"""Round nov18c (SEO): the made-up sample sites' titles are no longer h4 headings (search engines would read
"Flowers picked this morning…" as part of this page's outline): they become <div class="ss-h4"> with the same look.
The meta description is cut to 155 characters so Google shows it whole."""
import re, sys
P = "/home/claude/homepage/project/VersionB.dc.html"
s = open(P, encoding="utf-8").read()
n_open, n_close = s.count("<h4>"), s.count("</h4>")
if n_open != 22 or n_close != 22 or s.count("<h4 ") != 0:
    sys.exit(f"unexpected h4 count {n_open}/{n_close}")
s = s.replace("<h4>", '<div class="ss-h4">').replace("</h4>", "</div>")
# CSS: every "h4" selector belongs to the sample sites (.pl-ss ...); point them at the new class.
before = len(re.findall(r"(?<=[\s>])h4(?=[\s{,:])", s))
s = re.sub(r"(?<=[\s>])h4(?=[\s{,:])", ".ss-h4", s)
if before < 5:
    sys.exit(f"expected the sample-site h4 rules, found {before}")
old_desc = "Chrome extension for vibe coding: click any part of a website and get a ready-to-paste AI prompt with its colors, fonts, layout and animations, for Claude Code, Cursor, ChatGPT, Lovable, v0 and Bolt."
new_desc = "Chrome extension for vibe coding: click any part of a website and get an AI prompt with its colors, fonts, layout and motion for Claude Code, Cursor or Lovable."
c = s.count(old_desc)
if c < 3:
    sys.exit(f"description found {c} times")
s = s.replace(old_desc, new_desc)
if len(new_desc) > 160:
    sys.exit(f"description too long: {len(new_desc)}")
open(P, "w", encoding="utf-8").write(s)
print("ok", before, "css rules,", c, "descriptions,", len(new_desc), "chars")
