"""Build Version B of the PromptLift homepage (project/VersionB.dc.html) from Version A's parts
plus the new sections. Run from /home/claude/homepage: python3 build_b.py"""
import re, json

A = open('project/Main.dc.html').read()
lines = A.split('\n')

def between(start_marker, end_marker, inclusive_end=True):
    a = A.index(start_marker)
    b = A.index(end_marker, a) + (len(end_marker) if inclusive_end else 0)
    return A[a:b]

# ---------- assets ----------
BLOB = {
    'pick': '/_blob/fabea59671d3ee1f6ff10b3d78ce39a8',
    'choose': '/_blob/6476dc4c0b1752a664772674231e2024',
    'copied': '/_blob/b07e094b29d9d14b3078e737f0a01af5',
    'list': '/_blob/517672711a9d24d0b843fba34168982b',
    'daisies': '/_blob/ec904d631ee344ec7a3c2b7a3eb17350',
}
OLD = {'/_blob/af805dcc0d0d1f23a4bf47d6f1ea8026': BLOB['pick'],
       '/_blob/9d2893ab7cb4e22e62c556d146eb7a39': BLOB['choose'],
       '/_blob/b3a987337b64fc25a9f74a372afb9d9d': BLOB['copied']}

# ---------- reused parts from Version A ----------
css_a = A[A.index('<style>') + 7:A.index('</style>')]
apps = between('<section aria-labelledby="pl-apps"', '</section>')
how = between('<section aria-labelledby="pl-how"', '</section>\n\n', inclusive_end=False)
# the how section contains a nested section; take up to the outer close
how_start = A.index('<section aria-labelledby="pl-how"')
inner_end = A.index('</section>', A.index('<section aria-labelledby="pl-what"'))
how_end = A.index('</section>', inner_end + 10) + len('</section>')
how = A[how_start:how_end]
guides = between('<section aria-labelledby="pl-guides"', '</section>')
faq_items = re.findall(r'<details class="pl-faq".*?</details>', A, re.S)
for o, n in OLD.items():
    how = how.replace(o, n)

ARROW = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"></path></svg>'
DOWNLOAD = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M6 11l6 6 6-6M5 21h14"></path></svg>'
PLAY = '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"></path></svg>'
CHECK = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>'
POINTER = '<svg viewBox="0 0 24 24" aria-hidden="true" style="width: 100%; height: 100%; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.35))"><path d="M4 2l15 8.5-6.5 1.6L9.6 19z" fill="#151515" stroke="#fcfcfc" stroke-width="1.5" stroke-linejoin="round"></path></svg>'


def roll(text):
    """Button label that rolls up on hover (ideogram.ai): the text slides up and fades, a copy rises in."""
    return (f'<span class="pl-roll"><span class="pl-roll-a">{text}</span>'
            f'<span class="pl-roll-b" aria-hidden="true">{text}</span></span>')


def btn(href, text, kind='main', icon=''):
    return f'<a href="{href}" class="pl-button pl-button-{kind}">{icon}{roll(text)}</a>'


# ---------- 1. hero ----------
hero = f'''
<!-- Hero: flowers (Unsplash, Wolfgang Weiser) under a soft light wash, two playful radial glows in the accent family.
     The last two words of each headline line blur in from below (lovable.dev blur-in: 1200ms, cubic-bezier(0.455,0.03,0.515,0.955), once on load). -->
<section aria-labelledby="pl-headline" class="pl-band pl-hero">
<div class="pl-hero-photo" aria-hidden="true"></div>
<div class="pl-inner" style="position: relative; display: flex; flex-direction: column; align-items: flex-start; gap: 22px">
<h1 id="pl-headline" class="pl-display pl-hero-title" style="margin: 0; max-width: 760px; color: var(--pl-text)">
<span class="pl-line">Lift the designs <span class="pl-blurin" style="--i: 0">you love</span></span>
<span class="pl-line">into your <span class="pl-blurin" style="--i: 1">own site.</span></span>
</h1>
<p class="pl-lede" style="margin: 0; max-width: 620px; font-size: 18px; line-height: 1.55; color: #3f3f3a">PromptLift is a Chrome extension that turns any part of a website you like (its colors, fonts, layout or animation) into a ready-to-paste prompt for your AI app, such as Claude Code, Cursor, ChatGPT, Lovable, v0 or Bolt.</p>
<div style="display: flex; flex-wrap: wrap; gap: 10px">
{btn('#get', 'Add PromptLift to Chrome', 'main', DOWNLOAD)}
{btn('#demo', 'Watch the demo', 'quiet', PLAY)}
</div>

</div>
</section>
'''

# ---------- 2. demo: cinematic film (default) + try it ----------
def chips_scene():
    out = []
    for i, (name, on) in enumerate([('Colors', 1), ('Fonts', 0), ('Layout', 2), ('Motion', 0)]):
        cls = f' pl-cine-chip-on{on}' if on else ''
        out.append(f'<span class="pl-cine-chip{cls}"><span class="pl-cine-chk">{CHECK}</span>{name}</span>')
    return ''.join(out)

cine = f'''
<div class="pl-cine" role="img" aria-label="Film, about 10 seconds: someone points at the pricing section of a website and clicks it; PromptLift opens and Colors and Layout are switched on; the prompt is copied; it is pasted into an AI app, which updates the pricing page; the result shows the same layout in the person's own colors.">
<div class="pl-cine-glow" aria-hidden="true"></div>
<!-- Scene 1: pick on a site you like (camera pushes in) -->
<div class="pl-scene pl-s1" aria-hidden="true">
<div class="pl-cam pl-cam1">
<div class="pl-win pl-win-site">
<div class="pl-win-bar"><i></i><i></i><i></i><span>fieldnote.app/pricing</span></div>
<div class="pl-fn">
<div class="pl-fn-nav"><b>Fieldnote</b><span>Features · Pricing · Blog</span></div>
<div class="pl-fn-h">Simple plans for every notebook.</div>
<div class="pl-fn-cards pl-target">
<div class="pl-fn-card"><small>Starter</small><b>$0</b><span>100 notes</span><em>Get started</em></div>
<div class="pl-fn-card pl-fn-dark"><small>Pro</small><b>$8</b><span>Unlimited notes</span><em class="pl-fn-hot">Try Pro free</em></div>
<div class="pl-fn-card"><small>Team</small><b>$14</b><span>Shared notebooks</span><em>Contact sales</em></div>
<span class="pl-cine-outline"></span><span class="pl-cine-label">Section: pricing cards (3 cards)</span>
</div>
</div>
</div>
<span class="pl-cine-cursor">{POINTER}<i></i></span>
</div>
</div>
<!-- Scene 2: choose what to copy (whips in from the right) -->
<div class="pl-scene pl-s2" aria-hidden="true">
<div class="pl-panel-card">
<div class="pl-pc-top"><span class="pl-pc-logo">&gt;_</span><span><b>Pick what to copy</b><small>fieldnote.app · Claude Code</small></span></div>
<div class="pl-pc-thumb"><i></i><i class="d"></i><i></i></div>
<b class="pl-pc-name">Section: pricing cards (3 cards)</b>
<div class="pl-pc-chips">{chips_scene()}</div>
<span class="pl-cine-btn pl-cine-add">Add to my list <kbd>⌘↵</kbd></span>
</div>
</div>
<!-- Scene 3: copy (push in on the badge) -->
<div class="pl-scene pl-s3" aria-hidden="true">
<div class="pl-panel-card pl-copied-card">
<span class="pl-cine-badge">{CHECK.replace('width="12" height="12"', 'width="28" height="28"')}</span>
<b>Copied to your clipboard</b>
<small>1 part · ready for Claude Code</small>
<ol><li>Open Claude Code</li><li>Paste with <kbd>⌘</kbd><kbd>V</kbd> and send</li></ol>
</div>
</div>
<!-- Scene 4: paste into your AI app (rises up) -->
<div class="pl-scene pl-s4" aria-hidden="true">
<div class="pl-win pl-win-ai">
<div class="pl-win-bar pl-dark-bar"><i></i><i></i><i></i><span>your AI app</span></div>
<div class="pl-ai-body">
<span class="pl-tl" style="--k: 0">&lt;design_detail from="fieldnote.app"&gt;</span>
<span class="pl-tl" style="--k: 1">3 equal columns, 12px apart; the middle card is dark</span>
<span class="pl-tl" style="--k: 2">buttons: pills in my accent color</span>
<span class="pl-tl" style="--k: 3">&lt;where_on_my_site&gt;my pricing page&lt;/where_on_my_site&gt;</span>
<span class="pl-ai-done">{CHECK} pricing.html updated</span>
</div>
</div>
</div>
<!-- Scene 5: your site, same layout in your colors (pulls back) -->
<div class="pl-scene pl-s5" aria-hidden="true">
<div class="pl-cam pl-cam5">
<div class="pl-win pl-win-site pl-win-yours">
<div class="pl-win-bar"><i></i><i></i><i></i><span>yoursite.com/pricing</span></div>
<div class="pl-fn pl-yours">
<div class="pl-fn-nav"><b>Your site</b><span>Work · Pricing · About</span></div>
<div class="pl-fn-h">Pricing that fits your work.</div>
<div class="pl-fn-cards">
<div class="pl-fn-card"><small>Basic</small><b>[$]</b><span>[What’s included]</span><em>Choose</em></div>
<div class="pl-fn-card pl-fn-dark"><small>Plus</small><b>[$]</b><span>[What’s included]</span><em class="pl-fn-hot">Choose</em></div>
<div class="pl-fn-card"><small>Studio</small><b>[$]</b><span>[What’s included]</span><em>Choose</em></div>
</div>
</div>
</div>
</div>
<span class="pl-cine-title">Lifted.</span>
</div>
<!-- chapters -->
<div class="pl-chapters" aria-hidden="true">
<span style="--c: 0"><i></i>Pick</span><span style="--c: 1"><i></i>Choose</span><span style="--c: 2"><i></i>Copy</span><span style="--c: 3"><i></i>Paste</span><span style="--c: 4"><i></i>Done</span>
</div>
</div>
'''

try_it = '''
<div class="pl-try">
<div class="pl-try-site">
<div class="pl-win-bar"><i></i><i></i><i></i><span>A sample site · click a part</span></div>
<div class="pl-fn pl-try-fn">
<div class="pl-fn-nav"><b>Fieldnote</b><span>Features · Pricing · Blog</span></div>
<button type="button" class="pl-tpart {{ headCls }}" onClick="{{ pickHead }}" aria-pressed="{{ headOn }}"><span class="pl-fn-h" style="display: block">Simple plans for every notebook.</span><span class="pl-tpart-tag">Headline</span></button>
<button type="button" class="pl-tpart {{ cardsCls }}" onClick="{{ pickCards }}" aria-pressed="{{ cardsOn }}"><span class="pl-fn-cards" style="display: grid">
<span class="pl-fn-card"><small>Starter</small><b>$0</b><span>100 notes</span><em>Get started</em></span>
<span class="pl-fn-card pl-fn-dark"><small>Pro</small><b>$8</b><span>Unlimited notes</span><em class="pl-fn-hot">Try Pro free</em></span>
<span class="pl-fn-card"><small>Team</small><b>$14</b><span>Shared notebooks</span><em>Contact sales</em></span>
</span><span class="pl-tpart-tag">Pricing cards</span></button>
<button type="button" class="pl-tpart pl-tpart-btn {{ btnCls }}" onClick="{{ pickBtn }}" aria-pressed="{{ btnOn }}"><span class="pl-fn-cta">Start your notebook</span><span class="pl-tpart-tag">Button</span></button>
</div>
</div>
<div class="pl-try-panel">
<div class="pl-pc-top"><span class="pl-pc-logo">&gt;_</span><span><b>Pick what to copy</b><small>{{ partName }}</small></span></div>
<div class="pl-try-chips" role="group" aria-label="What to copy">
<sc-for list="{{ details }}" as="d" hint-placeholder-count="4">
<button type="button" class="pl-try-chip" aria-pressed="{{ d.pressed }}" onClick="{{ d.toggle }}"><span class="pl-try-chk">✓</span>{{ d.label }}</button>
</sc-for>
</div>
<label class="pl-try-label" for="pl-try-out">Your prompt (a sample: on a real site PromptLift reads the actual values)</label>
<textarea id="pl-try-out" class="pl-try-out" readonly="readonly" value="{{ promptText }}"></textarea>
<div style="display: flex; flex-wrap: wrap; align-items: center; gap: 10px">
<button type="button" class="pl-button pl-button-main" onClick="{{ copyPrompt }}"><span class="pl-roll"><span class="pl-roll-a">{{ copyLabel }}</span><span class="pl-roll-b" aria-hidden="true">{{ copyLabel }}</span></span></button>
<span class="pl-try-note" role="status">{{ copyNote }}</span>
</div>
</div>
<div class="pl-try-own">
<b>Try it on your own website</b>
<p>A web page can't look inside another website (browsers block that for your safety), so the real thing runs as a Chrome extension: add it, open any site and click what you like.</p>
''' + btn('#get', 'Add PromptLift to Chrome', 'main', DOWNLOAD) + '''
</div>
</div>
'''

demo = f'''
<!-- Demo: a short film by default ("Watch it"), and a hands-on sample ("Try it") -->
<section id="demo" aria-labelledby="pl-demo-title" class="pl-band pl-demo">
<div class="pl-inner">
<h2 id="pl-demo-title" class="pl-sr-only">Demo</h2>
<div class="pl-tabs" role="tablist" aria-label="Demo">
<button type="button" role="tab" id="pl-tab-watch" aria-controls="pl-panel-watch" aria-selected="{{{{ watchSel }}}}" class="pl-tab" onClick="{{{{ showWatch }}}}">Watch it</button>
<button type="button" role="tab" id="pl-tab-try" aria-controls="pl-panel-try" aria-selected="{{{{ trySel }}}}" class="pl-tab" onClick="{{{{ showTry }}}}">Try it yourself</button>
</div>
<sc-if value="{{{{ watching }}}}" hint-placeholder-val="{{{{ true }}}}">
<div id="pl-panel-watch" role="tabpanel" aria-labelledby="pl-tab-watch">{cine}</div>
</sc-if>
<sc-if value="{{{{ trying }}}}" hint-placeholder-val="{{{{ false }}}}">
<div id="pl-panel-try" role="tabpanel" aria-labelledby="pl-tab-try">{try_it}</div>
</sc-if>
</div>
</section>
'''

# ---------- 3. apps strip ----------
apps = apps.replace('style="width: 100%; margin-top: 56px;', 'style="width: 100%;')
apps = apps.replace('>Prompts written for the AI app you use</h2>', '>Writes prompts for the AI app you already use</h2>')
apps_band = f'<div class="pl-band pl-band-tight"><div class="pl-inner">{apps}</div></div>'

# ---------- 4. what is PromptLift (plain facts for people and AI search) ----------
FACTS = [
    ('What it is', 'A Chrome extension that describes the design of any part of a web page as a prompt for an AI app.'),
    ('Who it’s for', 'People building websites with AI tools: founders, designers, marketers and developers who want a look they saw elsewhere without starting from scratch.'),
    ('What it copies', 'Colors and how they relate, fonts and type sizes, layout and spacing, and movement: hover, press, scroll and load animations.'),
    ('Works with', 'Claude Code, Cursor, ChatGPT, Gemini, Claude, Windsurf, Copilot, Lovable, v0 and Bolt.'),
    ('Browser', 'Google Chrome (opens as a side panel).'),
    ('Privacy', 'Runs in your browser. No account, no PromptLift server; the prompt goes to your clipboard.'),
    ('Price', '[Add the price before launch]'),
]
USES = ['Rebuild a pricing section’s layout in your own colors', 'Match a site’s type scale and spacing', 'Recreate a hover or scroll animation', 'Borrow a color scheme without copying its exact colors', 'Combine parts from several sites into one look']
facts_rows = '\n'.join(f'<div class="pl-fact"><dt>{k}</dt><dd>{v}</dd></div>' for k, v in FACTS)
uses = '\n'.join(f'<li>{u}</li>' for u in USES)
facts = f'''
<!-- What is PromptLift: plain, quotable facts (for people and for AI search) -->
<section aria-labelledby="pl-what-is" class="pl-band">
<div class="pl-inner pl-facts-grid">
<div class="pl-sec-head" style="align-self: start">
<h2 id="pl-what-is" class="pl-display" style="margin: 0">What is PromptLift?</h2>
<p style="margin: 0; font-size: 16px; line-height: 1.6; color: #3f3f3a; max-width: 440px">A design-to-prompt tool: point at a part of any website, choose what to take, and paste a precise brief into your AI app. It describes the design; it never copies a site’s text, images or logos.</p>
<h3 style="margin: 12px 0 0; font-size: 16px; color: var(--pl-text)">Good for</h3>
<ul class="pl-uses">{uses}</ul>
</div>
<dl class="pl-facts">{facts_rows}</dl>
</div>
</section>
'''

# ---------- 5. how it works (from A), with colorful filler visuals ----------
how = how.replace('<section aria-labelledby="pl-how" style="width: 100%; margin-top: 16px; padding: 96px 0; box-sizing: border-box">',
                  '<section aria-labelledby="pl-how" class="pl-band"><div class="pl-inner">')
how = how + '</div>'
how = how.replace('<div style="max-width: 1300px; margin: 0 auto; display: flex; flex-direction: column; gap: 32px">',
                  '<div style="display: flex; flex-direction: column; gap: 32px">', 1)
how = how.replace('background: var(--how-panel); border-radius: 10px; overflow: hidden', 'background: var(--how-panel); border-radius: 10px; overflow: hidden; isolation: isolate" data-aurora="1', 3)

# ---------- 6. made with PromptLift: two moving rows (framer layout, title centered) ----------
PALS = [('#b9d96a', '#ffd38a', '#f7f3e8'), ('#a8d8ff', '#b9d96a', '#f3f7fb'), ('#ffb7a1', '#ffe08a', '#fbf4ef'),
        ('#c9b8ff', '#a8e6cf', '#f5f3fb'), ('#b9d96a', '#9ad7e0', '#f1f7f4'), ('#ffd0e1', '#c9e6a0', '#fbf3f6')]
def mock_site(i, big=True):
    a, b, bg = PALS[i % 6]
    cls = 'pl-mock-big' if big else 'pl-mock-small'
    return (f'<li class="pl-mock {cls}" style="--a: {a}; --b: {b}; --bg: {bg}">'
            f'<span class="pl-mock-bar"><i></i><i></i><i></i></span>'
            f'<span class="pl-mock-hero"><span class="pl-mock-h"></span><span class="pl-mock-p"></span><span class="pl-mock-btn"></span></span>'
            f'<span class="pl-mock-grid"><i></i><i></i><i></i></span>'
            f'<span class="pl-mock-tag">[Placeholder: a site made with PromptLift]</span></li>')
row_top = ''.join(mock_site(i, True) for i in range(6))
row_bot = ''.join(mock_site(i + 3, False) for i in range(6))
made = f'''
<!-- Made with PromptLift (framer.com call-to-action band): title and button centered on top; underneath, two moving rows,
     the top one (6 wide cards, 700px) drifting left and the bottom one (6 small cards, 220px) drifting right. Real sites go in the placeholders. -->
<section aria-labelledby="pl-made" class="pl-band pl-made">
<div class="pl-inner" style="display: flex; flex-direction: column; align-items: center; gap: 40px">
<header style="display: flex; flex-direction: column; align-items: center; gap: 16px; text-align: center; max-width: 1200px">
<h2 id="pl-made" class="pl-display" style="margin: 0">Made with PromptLift</h2>
<p style="margin: 0; font-size: 16px; line-height: 1.55; color: #3f3f3a">Sites people built from details they lifted elsewhere.</p>
{btn('#get', 'Add PromptLift to Chrome', 'main', DOWNLOAD)}
</header>
</div>
<div class="pl-marquee" aria-label="Sites made with PromptLift (placeholders)">
<ul class="pl-mq-row pl-mq-left">{row_top}{row_top.replace('<li class="pl-mock', '<li aria-hidden="true" class="pl-mock')}</ul>
<ul class="pl-mq-row pl-mq-right">{row_bot}{row_bot.replace('<li class="pl-mock', '<li aria-hidden="true" class="pl-mock')}</ul>
</div>
</section>
'''

# ---------- 7. guides (from A), colorful covers ----------
guides = guides.replace('<section aria-labelledby="pl-guides" style="width: 100%; padding: 96px 0; box-sizing: border-box">',
                        '<section aria-labelledby="pl-guides" class="pl-band"><div class="pl-inner">')
guides = guides[:-len('</section>')] + '</div></section>'
guides = guides.replace('<div style="position: relative; aspect-ratio: 9 / 16;', '<div data-cover="1" style="isolation: isolate; position: relative; aspect-ratio: 9 / 16;')

# ---------- 8. FAQ: scrollable list ----------
extra = [
    ('How is it different from DevTools or a screenshot?', 'DevTools shows the raw code of one element and a screenshot only shows pixels. PromptLift reads the part you picked (its structure, spacing, fonts, color relationships and movement) and writes them up as clear instructions your AI app can follow.'),
    ('Is PromptLift free?', '[Add the price before launch.]'),
]
tpl = faq_items[0]
def faq(q, a):
    t = re.sub(r'(<summary[^>]*>).*?(<span class="pl-faq-icon")', lambda m: m.group(1) + q + m.group(2), tpl, flags=re.S)
    return re.sub(r'(<p [^>]*>).*?(</p>)', lambda m: m.group(1) + a + m.group(2), t, flags=re.S)
items = faq_items[:3] + [faq(*extra[0])] + faq_items[3:] + [faq(*extra[1])]
faq_html = '\n'.join(items)
faq_sec = f'''
<!-- FAQ: title on the left (sticky), the questions in their own scrolling box on the right -->
<section aria-labelledby="pl-faq-title" class="pl-band">
<div class="pl-inner pl-faqgrid2">
<div class="pl-sec-head" style="align-self: start">
<h2 id="pl-faq-title" class="pl-display" style="margin: 0">Frequently asked questions</h2>
<p style="margin: 0; font-size: 15px; line-height: 1.55; color: #55554f">{len(items)} answers. Scroll the list or use the arrow keys.</p>
</div>
<div class="pl-faq-scroll" tabindex="0" aria-label="Questions and answers (scrollable)">
{faq_html}
</div>
</div>
</section>
'''

# ---------- 9. final call to action (webflow.com layout) ----------
cta = f'''
<!-- Final call to action (webflow.com): text on the left (5 of 12 columns), a big picture on the right -->
<section aria-labelledby="pl-cta-title" class="pl-band pl-cta">
<div class="pl-inner pl-cta-row">
<div class="pl-cta-text">
<h2 id="pl-cta-title" class="pl-display" style="margin: 0">Start building your site from the designs you admire</h2>
<p style="margin: 0; font-size: 16px; line-height: 1.6; color: #3f3f3a">Add PromptLift to Chrome, click what you like on any website, and paste the prompt into your AI app.</p>
<div class="pl-cta-box"><span>Ready to try it?</span>{btn('#get', 'Add PromptLift to Chrome', 'main', DOWNLOAD)}</div>
</div>
<div class="pl-cta-pic">
<div class="pl-cta-frame">
<img src="{BLOB['list']}" alt="The PromptLift side panel with a picked pricing section in the list, ready to copy as one prompt" style="width: 62%; height: auto; display: block; border-radius: 10px; box-shadow: 0 0 0 1px rgba(21,21,21,0.08), 0 24px 48px -16px rgba(21,21,21,0.35)">
</div>
</div>
</div>
</section>
'''

# ---------- 10. the fine print (legal) ----------
legal = '''
<!-- The fine print: plain-language notices; bracketed items must be completed before launch -->
<section aria-labelledby="pl-legal" class="pl-band pl-legal">
<div class="pl-inner">
<h2 id="pl-legal" class="pl-h2" style="margin: 0 0 24px; font-size: 20px; color: var(--pl-text)">The fine print</h2>
<div class="pl-legal-grid">
<div><h3>Trademarks</h3><p>Claude, Claude Code, Cursor, ChatGPT, Gemini, Windsurf, Copilot, Lovable, v0, Bolt, Google Chrome and other names are trademarks of their owners. They are named only to say which apps PromptLift writes prompts for; PromptLift isn’t affiliated with, sponsored or endorsed by any of them.</p></div>
<div><h3>Using what you lift</h3><p>PromptLift describes design (layout, spacing, type, color relationships, movement) and shifts colors slightly; it doesn’t copy a site’s text, photos, logos or code. You’re responsible for having the right to use anything you put on your site, and for respecting other sites’ terms and trademarks. When in doubt, ask a lawyer.</p></div>
<div><h3>Privacy</h3><p>The extension runs in your browser: it reads the page you’re on and that page’s style files, and puts the prompt on your clipboard. It has no account and sends nothing to a PromptLift server. This website loads its fonts from Google Fonts, which receives your IP address. Full details: <a href="#privacy">[Privacy policy: add before launch]</a>.</p></div>
<div><h3>Terms and warranty</h3><p>PromptLift is provided as is, without warranty. AI apps can make mistakes: review every change before you publish it. Full terms: <a href="#terms">[Terms of use: add before launch]</a>. Cookies: <span>[Confirm before launch: this site sets no cookies]</span>.</p></div>
<div><h3>Credits</h3><p>Flower photo by Wolfgang Weiser on <a href="https://unsplash.com/photos/a-field-of-white-daisies-blooming-in-green-grass-SZiB3_eu1Aw">Unsplash</a> (Unsplash License). Fonts: Newsreader, Inter and JetBrains Mono, under the SIL Open Font License.</p></div>
<div><h3>Contact</h3><p>Questions, takedown requests or accessibility problems: <a href="#contact">[Contact email: add before launch]</a>.</p></div>
</div>
</div>
</section>
'''

# ---------- 11. footer (ideogram.ai): small print, then a giant faded wordmark on a gradient ----------
footer = '''
<footer class="pl-footer">
<div class="pl-inner pl-footer-row">
<span>© 2026 [Company name]. All rights reserved. <a href="#terms">Terms of use</a> and <a href="#privacy">Privacy policy</a>.</span>
<span><a href="#legal-top">The fine print</a></span>
</div>
<div class="pl-wordmark" aria-hidden="true">PromptLift</div>
</footer>
'''

new_css = r'''
/* Version B: the accent goes on the how-it-works buttons and icons too */
:root{--how-btn:#B9D96A !important;--how-btn-text:#151515 !important;--how-icon:#151515 !important}

/* ===================== Version B ===================== */
.pl-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
::selection{background:#B9D96A;color:#151515}
/* Rectangular structure (the attached screenshot): one framed column with hairline sides; every band ends in a hairline. */
.pl-frame{max-width:1366px;margin:0 auto;border-left:1px solid var(--pl-line);border-right:1px solid var(--pl-line);background:var(--pl-bg)}
.pl-band{position:relative;padding:96px 32px;border-bottom:1px solid var(--pl-line);box-sizing:border-box}
.pl-band-tight{padding:40px 32px}
.pl-inner{max-width:1300px;margin:0 auto;position:relative}
.pl-sec-head{display:flex;flex-direction:column;gap:14px;margin-bottom:32px}
/* Buttons: pills; the label rolls up on hover (ideogram.ai: transform .32s cubic-bezier(.22,1,.36,1), opacity .24s) and the button turns darker. */
.pl-button{position:relative;display:inline-flex;align-items:center;gap:8px;min-height:46px;box-sizing:border-box;padding:12px 22px;border-radius:999px;font:500 16px/1.2 Inter,ui-sans-serif,system-ui,sans-serif;text-decoration:none;cursor:pointer;border:1px solid transparent;transition:background-color .24s ease,border-color .24s ease,color .24s ease}
.pl-button-main{background:var(--pl-accent);color:#151515;border-color:rgba(21,21,21,.08)}
.pl-button-main:hover{background:#9fbf4c;color:#151515}
.pl-button-quiet{background:var(--pl-bg);color:#151515;border-color:var(--pl-accent-ink)}
.pl-button-quiet:hover{background:#e8eddb;color:#151515}
.pl-button:focus-visible{outline:2px solid var(--pl-accent-ink);outline-offset:3px}
.pl-roll{position:relative;display:inline-grid;overflow:hidden}
.pl-roll-a,.pl-roll-b{grid-area:1/1;transition:transform .32s cubic-bezier(.22,1,.36,1),opacity .24s}
.pl-roll-b{transform:translateY(100%);opacity:0}
.pl-button:hover .pl-roll-a{transform:translateY(-100%);opacity:0}
.pl-button:hover .pl-roll-b{transform:none;opacity:1}
@media (prefers-reduced-motion: reduce){.pl-roll-a,.pl-roll-b{transition:none}.pl-button:hover .pl-roll-a{transform:none;opacity:1}.pl-button:hover .pl-roll-b{opacity:0}}
/* Hero: flowers under a light wash, plus two playful radial glows. */
.pl-hero{padding-top:120px;padding-bottom:120px;overflow:hidden;background:
 radial-gradient(60% 70% at 88% 12%, rgba(185,217,106,.55), rgba(185,217,106,0) 60%),
 radial-gradient(45% 55% at 8% 92%, rgba(255,214,120,.45), rgba(255,214,120,0) 60%),
 radial-gradient(30% 40% at 55% 40%, rgba(196,226,255,.35), rgba(196,226,255,0) 70%)}
.pl-hero-photo{position:absolute;inset:0;background-image:linear-gradient(180deg, rgba(252,252,252,.94) 0%, rgba(252,252,252,.86) 52%, rgba(252,252,252,.35) 100%), url("/_blob/ec904d631ee344ec7a3c2b7a3eb17350");background-size:cover;background-position:center 70%;z-index:0;mix-blend-mode:multiply}
.pl-hero .pl-inner{z-index:1}
.pl-hero-title .pl-line{display:block}
.pl-blurin{display:inline-block;background:linear-gradient(90deg,#151515 0%,#151515 45%,#5b6f2a 55%,#B9D96A 100%);background-size:220% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:pl-blurin 1200ms cubic-bezier(0.455,0.03,0.515,0.955) calc(var(--i) * 180ms + 150ms) both}
@keyframes pl-blurin{0%{background-position-x:100%;filter:blur(6px);opacity:0;transform:translateY(.35em)}100%{background-position-x:0%;filter:blur(0);opacity:1;transform:none}}
@media (prefers-reduced-motion: reduce){.pl-blurin{animation:none;color:inherit;background:none}}
/* Demo tabs */
.pl-tabs{display:inline-flex;gap:4px;padding:4px;border-radius:999px;background:#eef1e4;margin-bottom:20px}
.pl-tab{min-height:44px;padding:0 20px;border:0;border-radius:999px;background:transparent;font:500 15px Inter,ui-sans-serif,system-ui,sans-serif;color:#3f3f3a;cursor:pointer;transition:background-color .24s ease,color .24s ease}
.pl-tab[aria-selected="true"]{background:#151515;color:#fcfcfc}
.pl-tab:hover:not([aria-selected="true"]){background:#dfe6c8}
.pl-tab:focus-visible{outline:2px solid var(--pl-accent-ink);outline-offset:2px}
/* ---------- The film: 10s loop, five scenes with camera moves and cuts ---------- */
.pl-cine{position:relative;width:100%;aspect-ratio:16/9;border-radius:16px;overflow:hidden;container-type:inline-size;background:radial-gradient(120% 90% at 50% 110%,#2b3418 0%,#12140e 55%,#0b0c09 100%);box-shadow:0 0 0 1px rgba(21,21,21,.2),0 30px 60px -30px rgba(21,21,21,.6)}
.pl-cine *{box-sizing:border-box}
.pl-cine-glow{position:absolute;inset:-20%;background:radial-gradient(35% 35% at 30% 30%,rgba(185,217,106,.35),transparent 70%),radial-gradient(30% 30% at 75% 70%,rgba(255,214,120,.22),transparent 70%);animation:pl-glow 10s linear infinite}
@keyframes pl-glow{0%{transform:translate(0,0) rotate(0)}50%{transform:translate(4%,-3%) rotate(8deg)}100%{transform:translate(0,0) rotate(0)}}
.pl-scene{position:absolute;inset:0;display:grid;place-items:center;opacity:0;animation-duration:10s;animation-iteration-count:infinite;animation-timing-function:cubic-bezier(.16,1,.3,1)}
.pl-cine:hover .pl-scene,.pl-cine:hover .pl-scene *,.pl-cine:hover .pl-chapters i{animation-play-state:paused !important}
.pl-s1{animation-name:pl-s1}@keyframes pl-s1{0%{opacity:0}2%,18%{opacity:1;filter:none}21%,100%{opacity:0;filter:blur(8px)}}
.pl-s2{animation-name:pl-s2}@keyframes pl-s2{0%,18%{opacity:0;transform:translateX(30%) rotate(2deg)}22%,38%{opacity:1;transform:none}41%,100%{opacity:0;transform:scale(.92)}}
.pl-s3{animation-name:pl-s3}@keyframes pl-s3{0%,39%{opacity:0;transform:scale(1.25)}43%,53%{opacity:1;transform:scale(1)}56%,100%{opacity:0;transform:translateY(-20%)}}
.pl-s4{animation-name:pl-s4}@keyframes pl-s4{0%,54%{opacity:0;transform:translateY(25%)}58%,78%{opacity:1;transform:none}81%,100%{opacity:0;transform:scale(1.1);filter:blur(6px)}}
.pl-s5{animation-name:pl-s5}@keyframes pl-s5{0%,79%{opacity:0}83%,97%{opacity:1}100%{opacity:0}}
.pl-cam{width:100%;height:100%;display:grid;place-items:center;animation:10s cubic-bezier(.16,1,.3,1) infinite}
.pl-cam1{animation-name:pl-cam1;transform-origin:50% 70%}@keyframes pl-cam1{0%{transform:scale(.92)}16%,100%{transform:scale(1.22)}}
.pl-cam5{animation-name:pl-cam5}@keyframes pl-cam5{0%,80%{transform:scale(1.25)}95%,100%{transform:scale(1)}}
.pl-win{width:64cqw;border-radius:1.2cqw;background:#fbfaf6;overflow:hidden;box-shadow:0 2cqw 5cqw -2cqw rgba(0,0,0,.6),0 0 0 .1cqw rgba(255,255,255,.08)}
.pl-win-bar{display:flex;align-items:center;gap:.5cqw;height:2.6cqw;padding:0 1.1cqw;background:#f0eee7;font-size:.95cqw;color:#6b665d}
.pl-win-bar i{width:.7cqw;height:.7cqw;border-radius:50%;background:rgba(21,21,21,.18)}
.pl-win-bar span{margin-left:1cqw}
.pl-dark-bar{background:#1e201a;color:#a8ad9c}.pl-dark-bar i{background:rgba(255,255,255,.18)}
.pl-fn{padding:1.8cqw 2.2cqw 2.4cqw;font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#2a2926;background:#f7f6f2}
.pl-fn-nav{display:flex;justify-content:space-between;font-size:1cqw;color:#6b665d}.pl-fn-nav b{font-family:Georgia,serif;font-size:1.3cqw;color:#2a2926}
.pl-fn-h{margin:1.4cqw 0 1.2cqw;font-family:Georgia,serif;font-size:2.4cqw;line-height:1.15;letter-spacing:-.02em;text-align:left}
.pl-fn-cards{position:relative;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1cqw;padding:.8cqw;border-radius:.8cqw}
.pl-fn-card{display:flex;flex-direction:column;gap:.4cqw;padding:1.2cqw;border-radius:.9cqw;background:#fff;box-shadow:0 0 0 .08cqw #e8e4dc;font-size:.9cqw;text-align:left}
.pl-fn-card small{font-size:.85cqw;font-weight:600;color:#6b665d}.pl-fn-card b{font-family:Georgia,serif;font-size:1.9cqw;font-weight:400}
.pl-fn-card em{margin-top:.6cqw;padding:.5cqw 0;border-radius:99px;background:#ebe7df;font-style:normal;font-weight:600;text-align:center}
.pl-fn-dark{background:#2a2926;color:#f7f6f2}.pl-fn-dark small,.pl-fn-dark span{color:#c9c3b8}
.pl-fn-hot{background:#e0835a !important;color:#2a2926}
.pl-yours{background:#fcfcfc}.pl-yours .pl-fn-h,.pl-yours .pl-fn-nav b,.pl-yours .pl-fn-card b{font-family:Newsreader,Georgia,serif}
.pl-yours .pl-fn-dark{background:#151515}.pl-yours .pl-fn-hot{background:#B9D96A !important;color:#151515}
.pl-cine-outline{position:absolute;inset:0;border-radius:.9cqw;outline:.2cqw solid #B9D96A;box-shadow:0 0 0 .6cqw rgba(185,217,106,.3);opacity:0;animation:pl-outline 10s cubic-bezier(.16,1,.3,1) infinite}
@keyframes pl-outline{0%,8%{opacity:0}9%,19%{opacity:1}21%,100%{opacity:0}}
.pl-cine-label{position:absolute;right:0;top:-2.2cqw;padding:.45cqw .8cqw;border-radius:.5cqw;background:#B9D96A;color:#151515;font-size:.9cqw;font-weight:600;opacity:0;animation:pl-label 10s cubic-bezier(.16,1,.3,1) infinite}
@keyframes pl-label{0%,11%{opacity:0;transform:translateY(.6cqw)}12.5%,19%{opacity:1;transform:none}21%,100%{opacity:0}}
.pl-cine-cursor{position:absolute;width:2.2cqw;height:2.2cqw;left:80%;top:95%;animation:pl-cursor2 10s cubic-bezier(.16,1,.3,1) infinite}
.pl-cine-cursor i{position:absolute;left:-.8cqw;top:-.8cqw;width:2.4cqw;height:2.4cqw;border-radius:50%;background:#B9D96A;opacity:0;animation:pl-click 10s ease-out infinite}
@keyframes pl-cursor2{0%{left:82%;top:96%}8%{left:50%;top:66%;transform:scale(1)}10.5%{transform:scale(.8)}12%,100%{left:50%;top:66%;transform:scale(1)}}
@keyframes pl-click{0%,10%{opacity:0;transform:scale(.4)}10.6%{opacity:.7;transform:scale(.4)}13%{opacity:0;transform:scale(1.8)}100%{opacity:0}}
.pl-panel-card{width:30cqw;padding:1.6cqw;border-radius:1.4cqw;background:#fcfcfc;color:#151515;font-family:Inter,ui-sans-serif,system-ui,sans-serif;box-shadow:0 2.4cqw 5cqw -2cqw rgba(0,0,0,.7);display:flex;flex-direction:column;gap:1cqw;text-align:left}
.pl-pc-top{display:flex;align-items:center;gap:.8cqw}.pl-pc-top b{display:block;font-family:Newsreader,Georgia,serif;font-weight:400;font-size:1.6cqw}.pl-pc-top small{font-size:.9cqw;color:#5b6f2a}
.pl-pc-logo{display:grid;place-items:center;width:2.2cqw;height:2.2cqw;border-radius:.6cqw;background:#B9D96A;font:700 .9cqw ui-monospace,monospace;color:#151515}
.pl-pc-thumb{display:grid;grid-template-columns:repeat(3,1fr);gap:.4cqw;padding:.6cqw;border-radius:.6cqw;background:#f3f3f1}.pl-pc-thumb i{height:2.6cqw;border-radius:.3cqw;background:#fff;box-shadow:0 0 0 .08cqw #e4e4df}.pl-pc-thumb i.d{background:#2a2926}
.pl-pc-name{font-size:1.15cqw}
.pl-pc-chips{display:grid;grid-template-columns:repeat(2,1fr);gap:.5cqw}
.pl-cine-chip{display:flex;align-items:center;justify-content:center;gap:.4cqw;min-height:2.8cqw;border-radius:99px;background:#f3f3f1;color:#55554f;font-size:1cqw;font-weight:550}
.pl-cine-chk{display:none}
.pl-cine-chip-on1{animation:pl-chipon1 10s cubic-bezier(.16,1,.3,1) infinite}.pl-cine-chip-on1 .pl-cine-chk{animation:pl-chk1b 10s infinite}
.pl-cine-chip-on2{animation:pl-chipon2 10s cubic-bezier(.16,1,.3,1) infinite}.pl-cine-chip-on2 .pl-cine-chk{animation:pl-chk2b 10s infinite}
@keyframes pl-chipon1{0%,25%{background:#f3f3f1;color:#55554f;transform:none}26%{transform:scale(.94)}27%,100%{background:#B9D96A;color:#151515;transform:none}}
@keyframes pl-chipon2{0%,29%{background:#f3f3f1;color:#55554f;transform:none}30%{transform:scale(.94)}31%,100%{background:#B9D96A;color:#151515;transform:none}}
@keyframes pl-chk1b{0%,26%{display:none}27%,100%{display:inline-flex}}
@keyframes pl-chk2b{0%,30%{display:none}31%,100%{display:inline-flex}}
.pl-cine-btn{display:flex;align-items:center;justify-content:center;gap:.6cqw;min-height:3.2cqw;border-radius:99px;background:#B9D96A;color:#151515;font-size:1.1cqw;font-weight:600}
.pl-cine-btn kbd{font:500 .8cqw Inter,sans-serif;padding:.15cqw .4cqw;border-radius:.3cqw;background:rgba(21,21,21,.1)}
.pl-cine-add{animation:pl-addpress 10s cubic-bezier(.16,1,.3,1) infinite}
@keyframes pl-addpress{0%,33%{transform:none;background:#B9D96A}34.5%{transform:scale(.94);background:#9fbf4c}36%,100%{transform:none;background:#B9D96A}}
.pl-copied-card{align-items:flex-start;width:28cqw}
.pl-copied-card b{font-size:1.6cqw;font-family:Newsreader,Georgia,serif;font-weight:400}.pl-copied-card small{font-size:.95cqw;color:#55554f}
.pl-copied-card ol{margin:0;padding:.8cqw 1cqw .8cqw 2.4cqw;border-radius:.8cqw;background:#f3f3f1;font-size:1cqw;line-height:1.7;width:100%}
.pl-copied-card kbd{font:600 .8cqw Inter,sans-serif;padding:.1cqw .4cqw;border-radius:.3cqw;background:#fff;box-shadow:0 0 0 .08cqw #e4e4df}
.pl-cine-badge{display:grid;place-items:center;width:4cqw;height:4cqw;border-radius:50%;background:#B9D96A;color:#151515;animation:pl-badge2 10s cubic-bezier(.3,1.4,.5,1) infinite}
@keyframes pl-badge2{0%,42%{transform:scale(.3);opacity:0}45%{transform:scale(1.15);opacity:1}47%,100%{transform:none;opacity:1}}
.pl-win-ai{width:58cqw;background:#15170f}
.pl-ai-body{display:flex;flex-direction:column;gap:.8cqw;padding:2cqw;font:400 1.15cqw/1.5 "JetBrains Mono",ui-monospace,monospace;color:#e9ecdf;text-align:left;min-height:18cqw}
.pl-tl{display:block;white-space:nowrap;overflow:hidden;clip-path:inset(0 100% 0 0);animation:pl-tl 10s steps(28,end) infinite;animation-delay:calc(var(--k) * .35s)}
@keyframes pl-tl{0%,58%{clip-path:inset(0 100% 0 0)}62%,100%{clip-path:inset(0 0 0 0)}}
.pl-ai-done{align-self:flex-start;display:inline-flex;align-items:center;gap:.5cqw;margin-top:.6cqw;padding:.5cqw .9cqw;border-radius:99px;background:#B9D96A;color:#151515;font-family:Inter,sans-serif;font-weight:600;font-size:1cqw;opacity:0;animation:pl-done2 10s cubic-bezier(.3,1.4,.5,1) infinite}
@keyframes pl-done2{0%,71%{opacity:0;transform:scale(.8)}73.5%,100%{opacity:1;transform:none}}
.pl-cine-title{position:absolute;left:4cqw;bottom:9cqw;font-family:Newsreader,Georgia,serif;font-size:6cqw;letter-spacing:-.04em;color:#fcfcfc;text-shadow:0 1cqw 3cqw rgba(0,0,0,.5);animation:pl-ctitle 10s cubic-bezier(.16,1,.3,1) infinite}
@keyframes pl-ctitle{0%,85%{opacity:0;transform:translateY(2cqw);filter:blur(6px)}89%,97%{opacity:1;transform:none;filter:none}100%{opacity:0}}
.pl-chapters{position:absolute;left:2cqw;right:2cqw;bottom:1.6cqw;display:grid;grid-template-columns:repeat(5,1fr);gap:.8cqw;font:600 .95cqw Inter,sans-serif;color:rgba(252,252,252,.75)}
.pl-chapters span{display:flex;flex-direction:column-reverse;gap:.5cqw}
.pl-chapters i{display:block;height:.25cqw;border-radius:99px;background:rgba(252,252,252,.2);background-image:linear-gradient(#B9D96A,#B9D96A);background-repeat:no-repeat;background-size:0% 100%;animation:pl-chap 10s linear infinite;animation-delay:calc(var(--c) * 2s)}
@keyframes pl-chap{0%{background-size:0% 100%}20%{background-size:100% 100%}20.01%,100%{background-size:0% 100%}}
@media (prefers-reduced-motion: reduce){
.pl-cine *,.pl-cine-glow{animation:none !important}
.pl-scene{opacity:0}.pl-s5{opacity:1}.pl-cine-title{opacity:1}.pl-chapters i{background-size:100% 100%}
}
/* Try it */
.pl-try{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:20px;align-items:start}
.pl-try-site{border-radius:14px;overflow:hidden;box-shadow:0 0 0 1px var(--pl-line),0 20px 40px -24px rgba(21,21,21,.35);background:#f7f6f2}
.pl-try-site .pl-win-bar{height:36px;padding:0 14px;gap:6px;font-size:12px}.pl-try-site .pl-win-bar i{width:8px;height:8px}
.pl-try-fn{padding:20px 24px 28px;font-size:14px}.pl-try-fn .pl-fn-nav{font-size:12px}.pl-try-fn .pl-fn-nav b{font-size:16px}
.pl-try-fn .pl-fn-h{font-size:28px;margin:0}.pl-try-fn .pl-fn-cards{gap:12px;padding:0}.pl-try-fn .pl-fn-card{padding:14px;gap:5px;font-size:12px;border-radius:10px}
.pl-try-fn .pl-fn-card small{font-size:11px}.pl-try-fn .pl-fn-card b{font-size:22px}.pl-try-fn .pl-fn-card em{margin-top:6px;padding:6px 0;font-size:11px}
.pl-tpart{position:relative;display:block;width:100%;margin:14px 0 0;padding:10px;border:0;border-radius:10px;background:transparent;font:inherit;color:inherit;text-align:left;cursor:pointer;outline:1.5px dashed transparent;transition:outline-color .2s ease,background-color .2s ease}
.pl-tpart:hover{outline-color:#8fb33a;background:rgba(185,217,106,.08)}
.pl-tpart:focus-visible{outline:2px solid #5b6f2a}
.pl-tpart.on{outline:2px solid #5b6f2a;background:rgba(185,217,106,.14);box-shadow:0 0 0 5px rgba(185,217,106,.25)}
.pl-tpart-tag{position:absolute;right:8px;top:-11px;padding:3px 8px;border-radius:6px;background:#B9D96A;color:#151515;font:600 11px Inter,sans-serif;opacity:0;transition:opacity .2s ease}
.pl-tpart:hover .pl-tpart-tag,.pl-tpart.on .pl-tpart-tag{opacity:1}
.pl-tpart-btn{width:auto;display:inline-block}
.pl-fn-cta{display:inline-block;padding:10px 18px;border-radius:999px;background:#e0835a;color:#2a2926;font-weight:600;font-size:13px}
.pl-try-panel{display:flex;flex-direction:column;gap:14px;padding:20px;border-radius:14px;background:#fff;box-shadow:0 0 0 1px var(--pl-line),0 20px 40px -24px rgba(21,21,21,.35)}
.pl-try-panel .pl-pc-top b{font-size:20px}.pl-try-panel .pl-pc-top small{font-size:12px}.pl-try-panel .pl-pc-logo{width:28px;height:28px;border-radius:8px;font-size:11px}
.pl-try-chips{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.pl-try-chip{display:flex;align-items:center;justify-content:center;gap:6px;min-height:44px;border:0;border-radius:999px;background:#f3f3f1;color:#3f3f3a;font:550 14px Inter,sans-serif;cursor:pointer;transition:background-color .2s ease,color .2s ease}
.pl-try-chip:hover{background:#e6e6e0}
.pl-try-chip[aria-pressed="true"]{background:#B9D96A;color:#151515}
.pl-try-chip[aria-pressed="true"]:hover{background:#9fbf4c}
.pl-try-chip:focus-visible{outline:2px solid #5b6f2a;outline-offset:2px}
.pl-try-chk{display:none}.pl-try-chip[aria-pressed="true"] .pl-try-chk{display:inline}
.pl-try-label{font-size:12px;color:#55554f}
.pl-try-out{width:100%;min-height:210px;box-sizing:border-box;padding:12px;border-radius:10px;border:1px solid var(--pl-line);background:#f8f8f4;font:400 12.5px/1.6 "JetBrains Mono",ui-monospace,monospace;color:#151515;resize:vertical}
.pl-try-note{font-size:13px;color:#5b6f2a}
.pl-try-own{grid-column:1 / -1;display:flex;flex-wrap:wrap;align-items:center;gap:12px 24px;padding:18px 20px;border-radius:14px;background:#f2f8e3;box-shadow:inset 0 0 0 1px #d3e7a0}
.pl-try-own b{font-family:Newsreader,Georgia,serif;font-weight:400;font-size:22px}
.pl-try-own p{flex:1 1 420px;margin:0;font-size:14px;line-height:1.55;color:#3f3f3a}
@media (max-width:900px){.pl-try{grid-template-columns:minmax(0,1fr)}}
/* What is PromptLift */
.pl-facts-grid{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:64px}
.pl-facts{margin:0;border-top:1px solid var(--pl-line)}
.pl-fact{display:grid;grid-template-columns:minmax(0,160px) minmax(0,1fr);gap:24px;padding:18px 0;border-bottom:1px solid var(--pl-line)}
.pl-fact dt{font-size:14px;font-weight:600;color:var(--pl-accent-ink)}
.pl-fact dd{margin:0;font-size:16px;line-height:1.55;color:#151515}
.pl-uses{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:10px;font-size:15px;color:#3f3f3a}
.pl-uses li{display:flex;gap:10px;align-items:baseline}.pl-uses i{flex:none;width:8px;height:8px;border-radius:2px;background:var(--pl-accent);transform:translateY(-1px)}
@media (max-width:900px){.pl-facts-grid{grid-template-columns:minmax(0,1fr);gap:24px}.pl-fact{grid-template-columns:minmax(0,1fr);gap:4px}}
/* Colorful filler visuals (like the attached payments grid): soft ribbons of color behind the screenshots and on the video covers */
[data-aurora]::before,[data-cover]::before{content:"";position:absolute;inset:-30%;z-index:-1;background:
 radial-gradient(40% 35% at 20% 25%,rgba(185,217,106,.85),transparent 70%),
 radial-gradient(35% 40% at 80% 20%,rgba(255,196,140,.7),transparent 70%),
 radial-gradient(40% 40% at 75% 85%,rgba(196,180,255,.6),transparent 70%),
 radial-gradient(35% 35% at 15% 85%,rgba(140,215,230,.6),transparent 70%);filter:blur(10px)}
[data-cover]::before{opacity:.55}
/* Made with PromptLift: two moving rows */
.pl-made{padding-left:0;padding-right:0;overflow:hidden}
.pl-marquee{display:flex;flex-direction:column;gap:10px;margin-top:48px;mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent);-webkit-mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent)}
.pl-mq-row{display:flex;gap:10px;margin:0;padding:0;list-style:none;width:max-content;animation:60s linear infinite}
.pl-mq-left{animation-name:pl-mq-left}.pl-mq-right{animation-name:pl-mq-right;animation-duration:45s}
@keyframes pl-mq-left{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@keyframes pl-mq-right{from{transform:translateX(-50%)}to{transform:translateX(0)}}
.pl-marquee:hover .pl-mq-row{animation-play-state:paused}
.pl-mock{position:relative;flex:none;border-radius:15px;overflow:hidden;background:var(--bg);box-shadow:inset 0 0 0 1px rgba(21,21,21,.08);display:flex;flex-direction:column;gap:12px;padding:0 0 16px}
.pl-mock-big{width:700px;height:394px}.pl-mock-small{width:220px;height:150px;gap:6px;padding-bottom:8px}
.pl-mock::before{content:"";position:absolute;inset:-20%;background:radial-gradient(40% 50% at 80% 20%,var(--a),transparent 70%),radial-gradient(40% 50% at 15% 90%,var(--b),transparent 70%);opacity:.8}
.pl-mock > *{position:relative}
.pl-mock-bar{display:flex;gap:6px;padding:10px 12px;background:rgba(255,255,255,.6)}.pl-mock-bar i{width:7px;height:7px;border-radius:50%;background:rgba(21,21,21,.2)}
.pl-mock-hero{display:flex;flex-direction:column;gap:10px;padding:18px 28px}
.pl-mock-h{width:55%;height:26px;border-radius:6px;background:rgba(21,21,21,.85)}.pl-mock-p{width:75%;height:10px;border-radius:4px;background:rgba(21,21,21,.25)}.pl-mock-btn{width:120px;height:30px;border-radius:99px;background:#151515}
.pl-mock-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:0 28px;flex:1}.pl-mock-grid i{border-radius:10px;background:rgba(255,255,255,.75);box-shadow:0 0 0 1px rgba(21,21,21,.06)}
.pl-mock-small .pl-mock-hero{padding:6px 12px;gap:5px}.pl-mock-small .pl-mock-h{height:12px}.pl-mock-small .pl-mock-p{height:6px}.pl-mock-small .pl-mock-btn{width:50px;height:14px}.pl-mock-small .pl-mock-grid{padding:0 12px;gap:6px}
.pl-mock-tag{position:absolute !important;right:12px;bottom:10px;padding:3px 8px;border-radius:6px;background:rgba(255,255,255,.85);font-size:11px;font-weight:600;color:#3f3f3a}
.pl-mock-small .pl-mock-tag{display:none}
@media (prefers-reduced-motion: reduce){.pl-mq-row{animation:none}.pl-marquee{overflow-x:auto}}
/* FAQ: scrollable list */
.pl-faqgrid2{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:64px;align-items:start}
.pl-faqgrid2 .pl-sec-head{position:sticky;top:24px}
.pl-faq-scroll{max-height:560px;overflow-y:auto;overscroll-behavior:contain;padding:0 20px 0 24px;border-radius:14px;background:#fff;box-shadow:0 0 0 1px var(--pl-line);scrollbar-width:thin;scrollbar-color:#B9D96A transparent;mask-image:linear-gradient(180deg,#000 88%,transparent);-webkit-mask-image:linear-gradient(180deg,#000 88%,transparent)}
.pl-faq-scroll:focus-visible{outline:2px solid var(--pl-accent-ink);outline-offset:3px}
.pl-faq-scroll .pl-faq:first-child{border-top:0 !important}
.pl-faq[open]{box-shadow:inset 3px 0 0 #B9D96A;margin-left:-24px;padding-left:24px}
@media (max-width:900px){.pl-faqgrid2{grid-template-columns:minmax(0,1fr);gap:24px}.pl-faqgrid2 .pl-sec-head{position:static}}
/* Final call to action (webflow layout) */
.pl-cta-row{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:32px 0}
.pl-cta-text{flex:0 1 41.6667%;max-width:41.6667%;box-sizing:border-box;padding:0 16px 0 0;display:flex;flex-direction:column;align-items:flex-start;gap:20px}
.pl-cta-box{display:inline-flex;flex-wrap:wrap;align-items:center;gap:6.4px 14px;padding:16px 24px;border-radius:12px;background:#f2f8e3;font-size:16px;color:#151515}
.pl-cta-pic{flex:0 1 58%;max-width:760px;box-sizing:border-box;padding:0 0 0 16px}
.pl-cta-frame{position:relative;aspect-ratio:776/582;border-radius:8px;overflow:hidden;isolation:isolate;display:grid;place-items:center;background:#f7f5ee}
.pl-cta-frame::before{content:"";position:absolute;inset:-20%;z-index:-1;background:radial-gradient(40% 40% at 25% 30%,rgba(185,217,106,.9),transparent 70%),radial-gradient(35% 35% at 80% 25%,rgba(255,200,150,.75),transparent 70%),radial-gradient(40% 40% at 70% 85%,rgba(196,180,255,.6),transparent 70%),radial-gradient(30% 30% at 15% 85%,rgba(140,215,230,.6),transparent 70%);filter:blur(12px)}
@media (max-width:900px){.pl-cta-text,.pl-cta-pic{flex-basis:100%;max-width:100%;padding:0}}
/* The fine print */
.pl-legal{background:#f7f7f3}
.pl-legal-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:28px 40px}
.pl-legal h3{margin:0 0 8px;font-size:14px !important;font-weight:600 !important;color:#151515}
.pl-legal p{margin:0;font-size:13.5px;line-height:1.6;color:#4a4a44}
.pl-legal a{color:#151515;text-decoration-color:#B9D96A;text-decoration-thickness:2px;text-underline-offset:3px}
@media (max-width:900px){.pl-legal-grid{grid-template-columns:minmax(0,1fr)}}
/* Footer (ideogram.ai): small print, then a giant faded wordmark over a soft gradient into the accent */
.pl-footer{position:relative;overflow:hidden;background:linear-gradient(180deg,#fcfcfc 0%,#f6f8ee 38%,#e4efc4 70%,#c9e08a 100%)}
.pl-footer-row{display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px 24px;padding:28px 32px;font-size:14px;color:#3f3f3a;border-top:1px solid var(--pl-line)}
.pl-footer a{color:#3f3f3a;text-underline-offset:3px}
.pl-wordmark{font-family:Newsreader,Georgia,serif;font-size:clamp(90px,19vw,270px);line-height:.8;letter-spacing:-.05em;text-align:center;color:rgba(91,111,42,.16);padding:24px 0 0;margin-bottom:-.12em;user-select:none}
/* Accent in more places: links in text, the apps label */
main p a{text-decoration-color:#B9D96A;text-decoration-thickness:2px;text-underline-offset:3px}
@media (max-width:640px){.pl-band{padding:64px 20px}.pl-hero{padding-top:80px;padding-bottom:80px}.pl-mock-big{width:420px;height:236px}}
'''

logic = r'''class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { tab: 'watch', part: 'cards', on: { colors: true, fonts: false, layout: true, motion: false }, copied: false, copyFail: false };
    this.rail = null;
  }
  // Sample values for the hands-on demo (a made-up site); the real extension reads them from any page.
  static PARTS = {
    head: { name: 'Headline', where: 'my homepage headline', colors: 'Text: soft near-black on a warm off-white background (about 13:1).', fonts: 'Serif display, 28px on desktop, weight 400, line height 1.15, letter spacing -0.02em.', layout: 'One line, left-aligned, 6px above the subtitle.', motion: 'Fades up 12px as the page loads, 600ms, ease-out.' },
    cards: { name: 'Section: pricing cards (3 cards)', where: 'my pricing page', colors: 'Cards white on a warm off-white page; the middle card is dark with light text; one warm accent for its button and badge.', fonts: 'Plan names 11px semibold; prices in a serif at 22px; details 12px.', layout: '3 equal columns, 12px apart; each card stacked, padding 14px, corners 10px.', motion: 'Each card lifts 2px when pointed at, 200ms.' },
    btn: { name: 'Button: Start your notebook', where: 'my main sign-up button', colors: 'Warm accent fill with dark text (about 6:1).', fonts: '13px, weight 600.', layout: 'Pill, 10px by 18px of padding.', motion: 'Darkens when pointed at, 150ms; shrinks to 96% while pressed.' },
  };
  promptText() {
    const p = Component.PARTS[this.state.part];
    const keys = ['colors', 'fonts', 'layout', 'motion'].filter((k) => this.state.on[k]);
    if (!keys.length) return 'Switch on at least one of Colors, Fonts, Layout or Motion.';
    const body = keys.map((k) => '- ' + k[0].toUpperCase() + k.slice(1) + ': ' + p[k]).join('\n');
    return 'Apply this design detail to my site; keep everything else as it is.\n\n<design_detail id="1" from="fieldnote.app">\n<what>' + p.name + '</what>\n<values>\n' + body + '\n</values>\n<where_on_my_site>' + p.where + '</where_on_my_site>\n<fit_to_my_site>Use my own fonts, colors and content.</fit_to_my_site>\n</design_detail>';
  }
  renderVals() {
    const s = this.state;
    const pick = (part) => () => this.setState({ part, copied: false, copyFail: false });
    const details = ['colors', 'fonts', 'layout', 'motion'].map((k) => ({
      label: k[0].toUpperCase() + k.slice(1),
      pressed: s.on[k] ? 'true' : 'false',
      toggle: () => this.setState({ on: { ...s.on, [k]: !s.on[k] }, copied: false, copyFail: false }),
    }));
    const text = this.promptText();
    return {
      watching: s.tab === 'watch', trying: s.tab === 'try',
      watchSel: s.tab === 'watch' ? 'true' : 'false', trySel: s.tab === 'try' ? 'true' : 'false',
      showWatch: () => this.setState({ tab: 'watch' }), showTry: () => this.setState({ tab: 'try' }),
      headCls: s.part === 'head' ? 'on' : '', cardsCls: s.part === 'cards' ? 'on' : '', btnCls: s.part === 'btn' ? 'on' : '',
      headOn: s.part === 'head' ? 'true' : 'false', cardsOn: s.part === 'cards' ? 'true' : 'false', btnOn: s.part === 'btn' ? 'true' : 'false',
      pickHead: pick('head'), pickCards: pick('cards'), pickBtn: pick('btn'),
      partName: Component.PARTS[s.part].name,
      details, promptText: text,
      copyLabel: s.copied ? 'Copied' : 'Copy prompt',
      copyNote: s.copyFail ? 'Copying is blocked here: select the text and copy it.' : (s.copied ? 'Paste it into your AI app.' : ''),
      copyPrompt: () => {
        const done = () => { this.setState({ copied: true, copyFail: false }); clearTimeout(this.t); this.t = setTimeout(() => this.setState({ copied: false }), 2500); };
        try { navigator.clipboard.writeText(text).then(done, () => this.setState({ copyFail: true })); } catch (e) { this.setState({ copyFail: true }); }
      },
    };
  }
  componentWillUnmount() { clearTimeout(this.t); }
}'''

head = A[:A.index('<style>')]
head = head.replace('<title>PromptLift — homepage, version A</title>',
  '<title>PromptLift: turn any website design into a prompt for your AI app (Chrome extension)</title>\n'
  '<meta name="description" content="PromptLift is a Chrome extension that turns the colors, fonts, layout and animations of any website into a ready-to-paste prompt for Claude Code, Cursor, ChatGPT, Lovable, v0, Bolt and other AI apps.">\n'
  '<script type="application/ld+json">' + json.dumps({
      "@context": "https://schema.org", "@type": "SoftwareApplication", "name": "PromptLift",
      "applicationCategory": "DeveloperApplication", "applicationSubCategory": "Browser extension",
      "operatingSystem": "Google Chrome",
      "description": "Chrome extension that turns any part of a website (colors, fonts, layout, animation) into a prompt for AI website builders and coding assistants.",
      "featureList": ["Pick any part of a web page", "Copy colors, fonts, layout or motion", "Prompts written for Claude Code, Cursor, ChatGPT, Gemini, Claude, Windsurf, Copilot, Lovable, v0 and Bolt", "Colors shifted slightly; uses your own fonts and content", "Runs in your browser with no account"],
  }) + '</script>')
head = head.replace('family=Newsreader:opsz,wght@6..72,400&amp;', 'family=Newsreader:opsz,wght@6..72,400;6..72,500&amp;')

faq_ld = json.dumps({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
    {"@type": "Question", "name": re.sub(r'<.*?>', '', re.search(r'<summary[^>]*>(.*?)<span', it, re.S).group(1)).strip(),
     "acceptedAnswer": {"@type": "Answer", "text": re.sub(r'<.*?>', '', re.search(r'<p [^>]*>(.*?)</p>', it, re.S).group(1)).strip()}}
    for it in items if '[Add the price' not in it]})
head = head.replace('</script>\n<script src="./support.js">', '</script>\n<script type="application/ld+json">' + faq_ld + '</script>\n<script src="./support.js">')

body = f'''<style>{css_a}
{new_css}
</style>
</helmet>
<main id="legal-top" style="font-family: Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; color: var(--pl-text); background: #f4f4f0; width: 100%; min-height: 100vh; box-sizing: border-box; overflow-x: clip">
<div class="pl-frame">
{hero}
{demo}
{apps_band}
{facts}
{how}
{made}
{guides}
{faq_sec}
{cta}
{legal}
{footer}
</div>
</main>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":1440,"height":9000}}}}'>
{logic}
</script>
</body>
</html>
'''
out = head + body
open('project/VersionB.dc.html', 'w').write(out)
print('written', len(out))
