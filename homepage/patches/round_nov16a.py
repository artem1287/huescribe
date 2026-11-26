"""Round nov16a: rename PromptLift -> Huescribe, humanize the copy, remove every fill-in placeholder,
drop the video-guides section (it only had placeholders), point store buttons at the Chrome Web Store,
and swap in fresh app screenshots that show the new name and icon."""
import re, sys
P = "/home/claude/homepage/project/VersionB.dc.html"
s = open(P, encoding="utf-8").read()
STORE = "https://chromewebstore.google.com/search/Huescribe"


def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        sys.exit(f"expected {count} of {old[:90]!r}, found {n}")
    s = s.replace(old, new)


# ---------- screenshots ----------
for a, b in (("8ff4c153ba1e52cdec1ffe92cc6af9e8", "b458ee4198ae746817ab597def6c952f"),
             ("5ff5e762ec4642b5ae9d1c95db56d699", "1be1dd15724759687c9dc604ea2f54f5"),
             ("7142327a28c9159d278b61b6ab4d7d81", "61b26a5eaa88ab9884237632c301d40f"),
             ("c4f3390a7f742a1acb347bfbaccfac6f", "c070e37e3735e58063a7b2c8aa9d7574")):
    if a not in s:
        sys.exit("screenshot blob missing " + a)
    s = s.replace(a, b)

# ---------- hero ----------
rep("Lift the designs you love into your own site.", "See a design you love? Bring it to your own site.")
rep("A Chrome extension that turns any website’s design into an AI prompt for Claude Code, Cursor, Lovable, v0 and Bolt.",
    "A Chrome extension: click the parts you like on any website, and it writes them up as a prompt for Claude Code, Cursor, Lovable, v0 or Bolt.")
rep('href="#get"', f'href="{STORE}" rel="noopener"', 3)

# ---------- the demo panel mirrors the extension's new wording ----------
rep("Nothing yet: click something you like on the page. It lands here, ready to become one prompt.",
    "Nothing here yet. Click something you like on the page and it shows up here.")
rep(">Pick what to lift<", ">What do you want from it?<")
rep(">Choose what to lift<", ">Turn on at least one<")
rep("Your list is cleared for the next one.", "Your list is empty again, ready for the next idea.")

# ---------- sections ----------
rep("Design prompts written for the AI coding tool you use", "Works with the AI app you already use")
rep("What PromptLift can lift from any website", "What Huescribe picks up from a page")
rep("The color palette and its contrast, nudged so it’s never a clone.", "The palette and its contrast, nudged a little so you never end up with a copy.")
rep("Fonts, typography scale and weights, matched to the fonts you already use.", "Sizes and weights, mapped onto the fonts you already use.")
rep("Sample sites showing where one borrowed detail can take a page: web design inspiration, rebuilt with AI.",
    "Made-up sample sites, each built around one detail borrowed from somewhere else.")
rep("replace them with real sites made with PromptLift.", "they are samples on purpose.")

# The video-guides section held only placeholders: remove it.
a = s.index("<!-- Guides: short vertical videos")
b = s.index("</section>", s.index('<section aria-labelledby="pl-guides"')) + len("</section>")
s = s[:a] + s[b:]

# ---------- uses: plain sentences instead of keyword lists ----------
uses = [
    ("Prompts for Claude Code, Cursor and Lovable",
     "Whatever you build with, whether it’s Claude Code, Cursor, Lovable, v0, Bolt or plain ChatGPT, Huescribe writes the design prompt the way that tool likes to read it. Think of it as an AI prompt generator for web design."),
    ("Make my site feel like that one",
     "You saw a site and thought: I want mine to feel like that. You get its style without cloning anything. Your words and your brand stay; only the feel changes."),
    ("Find a site’s fonts and colors",
     "Curious which fonts a site uses, or want its color palette? One click. You get the fonts, the type sizes and the colors as clean design tokens your AI app can use."),
    ("Catch hover effects and animations",
     "Some of the best details only show up when you move the mouse. Huescribe hovers, presses and watches, then writes down the timing and easing so your AI can rebuild the animation."),
    ("From inspiration to code",
     "Found a landing page, a pricing table or a hero section you love? Pick it, paste the prompt, and let your AI do the rest. Web design inspiration, straight into your code."),
    ("A design brief, not a pile of CSS",
     "No digging through CSS by hand. You get a short, readable design brief with the layout and spacing that matter. Unlike screenshot-to-code tools, it also notices how things move."),
    ("Redesign one section at a time",
     "No need to start over. Give your header a lift this week and your pricing page the next. If you don’t write code, your AI website builder handles that part."),
    ("For designers and developers",
     "It sits in a side panel next to the page, a bit like DevTools. But instead of raw CSS, it hands you something you can give straight to your AI. If you’ve used CSS Peeper, this goes one step further."),
    ("Borrow, don’t copy",
     "Lots of people search for a way to copy a website’s design. Huescribe takes a kinder route: it turns a page, a section or a single component into a prompt that borrows the idea and leaves the content alone."),
]
m = re.search(r'<div class="pl-uses">.*?</div>\n</section>', s, re.S)
if not m:
    sys.exit("uses grid not found")
cards = "".join(f'<article class="pl-use"><h3>{h}</h3><p>{p}</p></article>' for h, p in uses)
s = s[:m.start()] + f'<div class="pl-uses">{cards}</div>\n</section>' + s[m.end():]
rep("From vibe coding a new landing page to giving your AI a design reference: here’s what people use PromptLift for.",
    "From vibe coding a brand-new landing page to fixing up an old one, here’s what people use Huescribe for.")

# ---------- FAQ: drop the price question (it had no answer) ----------
q = s.index(">Is PromptLift free?<")
d0 = s.rindex("<details", 0, q)
d1 = s.index("</details>", q) + len("</details>\n")
s = s[:d0] + s[d1:]
rep("[Add the price before launch.]", "", 0)

# ---------- CTA ----------
rep("The web is full of good ideas. Start lifting.", "The web is full of good ideas. Borrow a few.")
rep("Your first lift is a click away", "Your first prompt is one click away")

# ---------- fine print: no placeholders ----------
rep("<h3>Using what you lift</h3>", "<h3>Using what you borrow</h3>")
rep('This website loads its fonts from Google Fonts, which receives your IP address. Full details: <a href="#privacy">[Privacy policy: add before launch]</a>.',
    'This website sets no cookies and serves its fonts and images itself. Full details: <a href="privacy.html">privacy policy</a>.')
rep('Full terms: <a href="#terms">[Terms of use: add before launch]</a>. Cookies: [Confirm before launch: this site sets no cookies].',
    'Full terms: <a href="terms.html">terms of use</a>.')
rep('Questions, takedown requests or accessibility problems: <a href="#contact">[Contact email: add before launch]</a>.',
    f'Questions, takedown requests or accessibility problems? Write to us through the Support tab on <a href="{STORE}" rel="noopener">Huescribe’s Chrome Web Store page</a>.')
rep('© 2026 [Company name]. All rights reserved. <a href="#terms">Terms of use</a> and <a href="#privacy">Privacy policy</a>.',
    '© 2026 Huescribe. <a href="terms.html">Terms of use</a> · <a href="privacy.html">Privacy policy</a>.')

rep("<!-- The fine print: plain-language notices; bracketed items must be completed before launch -->", "<!-- The fine print: plain-language notices -->")

# ---------- the name, everywhere else (meta, JSON-LD, alts, buttons, footer wordmark) ----------
s = s.replace("PromptLift", "Huescribe").replace("promptlift", "huescribe")

left = [k for k in ("PromptLift", "before launch", "[Company", "[Contact", "Is Huescribe free", "id=\"pl-guides\"", "YOUR-DOMAIN") if k in s]
for k in left: print(s[max(0, s.index(k) - 150):s.index(k) + 60])
if left:
    sys.exit("left in the page: " + ", ".join(left))
open(P, "w", encoding="utf-8").write(s)
print("ok", len(s))
