"""Nov 15 (eleventh round): a "use cases" section in the modular grid (9 cards) that carries the remaining search terms
in plain sentences, plus a check that all 65 terms (the 50 researched + 15 unique) appear in the page's visible text.
Usage: round_nov15k.py in out"""
import html
import re
import sys

s = open(sys.argv[1]).read()


def rep(old, new, count=1):
    global s
    if s.count(old) != count:
        raise SystemExit(f"expected {count} of {old[:70]!r}, found {s.count(old)}")
    s = s.replace(old, new)


CARDS = [
    ("A design prompt for Claude Code, Cursor and Lovable",
     "Turn a website into a Cursor design prompt, a Claude Code design prompt, a Lovable design prompt, a v0 design prompt or a Bolt design prompt. "
     "PromptLift is an AI prompt generator for web design that writes for the AI coding tool, AI coding assistant or AI website builder you use, ChatGPT included."),
    ("Make my website look like another site",
     "Website style transfer, not cloning: match a website’s style on your own pages, with your own words and brand. "
     "You recreate a website design’s feel, never its content."),
    ("Find the fonts and color palette of any website",
     "A font finder and color palette extractor in one click. PromptLift reads the fonts on a website, its typography and its color palette, "
     "and writes them up as design tokens your AI app can use."),
    ("Catch hover effects and CSS animations",
     "A hover effect inspector and animation inspector in one: extract animations from a website, with their hover effects, timing and easing, "
     "as instructions your AI can rebuild."),
    ("Web design inspiration, straight to code",
     "Found a landing page design, a pricing page design or a hero section design you love? Take that UI inspiration to code: "
     "pick it, and your AI design to code tool does the rest. Design for vibe coding, made simple."),
    ("An AI-ready design brief, not raw CSS",
     "A design brief generator: instead of making you extract CSS from a website or copy CSS from a website by hand, PromptLift writes an AI-ready design brief, "
     "a design reference for AI with the layout and spacing that matter. Use it as a style guide from any website, or as a design system extractor for your own project. "
     "Unlike screenshot to code tools, it also sees movement."),
    ("Redesign and improve your site with AI",
     "Redesign my website with AI, one section at a time, and improve website design with AI without starting over. "
     "No-code website design works too: if you don’t write code, your AI website builder does."),
    ("For designers and developers",
     "A Chrome extension for designers and a Chrome extension for developers: a side panel design inspector next to the page and a smoother design handoff. "
     "Think of it as a DevTools alternative and a CSS inspector alternative; if you’ve used CSS Peeper, PromptLift goes a step further and writes the prompt."),
    ("Copy website design? Borrow it instead",
     "People search for ways to copy website design or clone website with AI. PromptLift does something better: design to prompt. "
     "It works as UI to prompt, component to prompt and website to prompt, giving you a prompt from any webpage that borrows ideas, not content."),
]

cards_html = "".join(
    f'<article class="pl-use"><h3>{t}</h3><p>{d}</p></article>' for t, d in CARDS)
SECTION = (
    '<section aria-labelledby="pl-uses" class="pl-uses-band">\n'
    '<h2 id="pl-uses" class="pl-display" style="margin: 0; color: var(--pl-text); font-weight: 400">One extension, a lot of uses</h2>\n'
    '<p class="pl-uses-lead">From vibe coding a new landing page to giving your AI a design reference: here’s what people use PromptLift for.</p>\n'
    f'<div class="pl-uses">{cards_html}</div>\n</section>\n')
anchor = '<section aria-labelledby="pl-faq-title" class="pl-faqband"'
rep(anchor, SECTION + anchor)

CSS = """/* ===== Version B, 2026-11-15 (eleventh round) ===== */
/* Use cases: nine cards on the same 12-column modular grid as the feature cards (three per row on desktop) */
.pl-uses-band{width:100%;max-width:1300px;margin:0 auto;padding:96px 0;box-sizing:border-box}
.pl-uses-lead{margin:16px 0 0;max-width:640px;font-size:16px;line-height:1.55;color:#55554f}
.pl-uses{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:24px;margin-top:40px}
.pl-use{grid-column:span 4;display:flex;flex-direction:column;gap:10px;padding:24px;border-radius:12px;background:var(--how-card);border:1px solid var(--how-line);transition:border-color .4s cubic-bezier(.4,0,.2,1),background-color .4s cubic-bezier(.4,0,.2,1)}
.pl-use:hover{border-color:var(--how-green-line);background:var(--how-green-tint)}
.pl-use h3{margin:0 !important;font-family:Inter,ui-sans-serif,system-ui,sans-serif !important;font-size:18px !important;font-weight:500 !important;line-height:1.25 !important;letter-spacing:-.015em !important;color:var(--how-card-title)}
.pl-use p{margin:0;font-size:14.5px;line-height:1.6;color:var(--how-text)}
@media (max-width:900px){.pl-uses-band{padding:72px 0}.pl-uses{grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px}.pl-use{grid-column:span 1}}
@media (max-width:560px){.pl-uses{grid-template-columns:minmax(0,1fr)}}
@media (prefers-reduced-motion: reduce){.pl-use{transition:none}}

"""
rep("/* ===== Version B, 2026-11-15 (tenth round) ===== */", CSS + "/* ===== Version B, 2026-11-15 (tenth round) ===== */")

# ---------- check: every term is in the visible text (the head counts for the title only) ----------
TERMS = [
    # the 50 researched terms
    "website design", "AI prompt", "design prompt", "AI prompt generator for web design", "Chrome extension",
    "Chrome extension for designers", "Chrome extension for developers", "website to prompt", "UI to prompt", "component to prompt",
    "Claude Code", "Cursor", "Lovable", "v0", "Bolt", "ChatGPT", "AI coding tool", "AI coding assistant", "AI website builder", "vibe coding",
    "color palette", "color palette extractor", "fonts on a website", "font finder", "typography", "layout and spacing", "CSS animations",
    "hover effects", "design tokens", "CSS inspector",
    "redesign my website with AI", "web design inspiration", "recreate a website design", "improve website design with AI",
    "landing page design", "pricing page design", "hero section design", "design for vibe coding", "no-code website design", "AI design to code",
    "screenshot to code", "DevTools alternative", "CSS inspector alternative", "CSS Peeper", "design handoff",
    "extract CSS from a website", "design system extractor",
    "copy website design", "copy CSS from a website", "clone website with AI",
    # the 15 unique terms
    "website style transfer", "design brief generator", "AI-ready design brief", "design reference for AI",
    "make my website look like another site", "match a website’s style", "Cursor design prompt", "Claude Code design prompt",
    "Lovable design prompt", "v0 design prompt", "Bolt design prompt", "hover effect inspector", "animation inspector",
    "style guide from any website", "UI inspiration to code",
]
body = s[s.index("<main"):]
body = re.sub(r"<style.*?</style>|<script.*?</script>", " ", body, flags=re.S)
text = html.unescape(re.sub(r"<[^>]+>", " ", body))
text = re.sub(r"\s+", " ", text).lower().replace("'", "’")
missing = [t for t in TERMS if t.lower().replace("'", "’") not in text]
print(f"terms on the page: {len(TERMS) - len(missing)}/{len(TERMS)}")
if missing:
    raise SystemExit("missing: " + "; ".join(missing))
open(sys.argv[2], "w").write(s)
