"""Round nov16c: the use-case cards keep a natural voice but carry the 65 search terms again."""
import re, sys
P = "/home/claude/homepage/project/VersionB.dc.html"
s = open(P, encoding="utf-8").read()
uses = [
    ("Prompts for Claude Code, Cursor and Lovable",
     "Need a Cursor design prompt, a Claude Code design prompt or a Lovable design prompt? Huescribe writes it the way your tool likes to read it, and the same goes for a v0 design prompt or a Bolt design prompt. Your AI coding assistant gets clear instructions instead of guesswork: an AI prompt generator for web design."),
    ("Make my site feel like that one",
     "“Make my website look like another site” is a common wish. Huescribe lets you match a website’s style without cloning it, a kind of website style transfer: you recreate a website design’s feel, and your words and brand stay yours."),
    ("Find a site’s fonts and colors",
     "Curious about the fonts on a website? Huescribe is a font finder and a color palette extractor in one. Click once and you get the fonts, type sizes and colors as clean design tokens your AI app can use."),
    ("Catch hover effects and animations",
     "Some of the best details only show up when you move the mouse. Like a hover effect inspector and animation inspector in one, Huescribe hovers, presses and watches, then writes down the timing and easing so your AI can rebuild it."),
    ("From inspiration to code",
     "Found a landing page design, a pricing page design or a hero section design you love? Pick it, paste the prompt and let your AI do the rest. Web design inspiration, straight into your code: that’s UI inspiration to code, and AI design to code without the guesswork."),
    ("A design brief, not a pile of CSS",
     "Why extract CSS from a website, or copy CSS from a website by hand? You get an AI-ready design brief instead: a design reference for AI with the layout and spacing that matter. Unlike screenshot to code tools, it notices how things move. Use it as a design brief generator, a style guide from any website, or a design system extractor."),
    ("Redesign one section at a time",
     "Want to redesign your website with AI without starting over? Do it one section at a time and improve website design with AI as you go. If you’ve ever typed “redesign my website with AI”, this is that. No-code website design works too: your AI website builder writes the code."),
    ("For designers and developers",
     "A Chrome extension for designers and a Chrome extension for developers. It sits in a side panel like DevTools, so it makes a handy DevTools alternative or CSS inspector alternative, and it smooths the design handoff by writing the prompt for you. If you’ve used CSS Peeper, this goes one step further. Design for vibe coding, made simple."),
    ("Borrow, don’t copy",
     "People search for ways to copy website design or clone website with AI. Huescribe borrows instead: website to prompt, UI to prompt, even component to prompt. It takes the idea and leaves the content alone."),
]
m = re.search(r'<div class="pl-uses">.*?</div>\n</section>', s, re.S)
if not m:
    sys.exit("uses grid not found")
cards = "".join(f'<article class="pl-use"><h3>{h}</h3><p>{p}</p></article>' for h, p in uses)
s = s[:m.start()] + f'<div class="pl-uses">{cards}</div>\n</section>' + s[m.end():]
open(P, "w", encoding="utf-8").write(s)
print("ok")
