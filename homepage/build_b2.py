"""Version B, take 2: Version A's page as-is, plus only what the prompt asked for.

Changes on top of project/Main.dc.html (Version A), nothing else:
  1. "Made with PromptLift" uses the framer.com layout: title centered on top, two moving rows under it
     (top row drifts left, bottom row drifts right).
  2. Button hover (ideogram.ai): the label slides up and fades while a copy rises in; the button turns darker.
  3. Headline fade-in (lovable.dev blur-in): only the last two words of each line ("you love", "own site.")
     blur in from below while their color fades from green to ink.
  4. Text content for people and AI search: page title, meta tags, structured data (JSON-LD), clearer wording
     in a few existing lines, and two more FAQ answers in the existing FAQ format.
  5. The bottom part: final call to action (webflow.com layout), the fine print (legal), and the footer with the
     big wordmark (ideogram.ai).
  Web: viewport/description/Open Graph tags, font preconnect, lazy-loaded images below the fold,
  reduced-motion fallbacks for every new animation.
Writes project/VersionB.dc.html.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).parent
A = (ROOT / 'project' / 'Main.dc.html').read_text()
s = A


def rep(old, new, count=1):
    """Replace exactly `count` occurrences, or fail loudly so a silent miss can't ship."""
    global s
    found = s.count(old)
    if found != count:
        raise SystemExit(f'expected {count} match(es), found {found}: {old[:80]!r}')
    s = s.replace(old, new)


def roll(text):
    """Button label that rolls up on hover (ideogram.ai)."""
    return (f'<span class="pl-roll"><span class="pl-roll-a">{text}</span>'
            f'<span class="pl-roll-b" aria-hidden="true">{text}</span></span>')


DOWNLOAD = ('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
            'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M6 11l6 6 6-6M5 21h14"></path></svg>')
# Version A's main button, unchanged in look; only the classes (hover) and the rolling label are new.
MAIN_BTN_STYLE = ('display: inline-flex; align-items: center; gap: 8px; min-height: 44px; box-sizing: border-box; '
                  'padding: 12px 22px 13px 22px; border-radius: var(--pl-radius-pill); border: 1px solid var(--pl-accent); '
                  'background: var(--pl-accent); color: var(--pl-on-accent); font-size: 16px; font-weight: 500; text-decoration: none')


def main_btn(text='Add PromptLift to Chrome', href='#get'):
    return f'<a href="{href}" class="pl-btn pl-btn-main" style="{MAIN_BTN_STYLE}">\n{DOWNLOAD}\n{roll(text)}\n</a>'


# ---------- head: title, meta, structured data (web + AI search) ----------
DESC = ('PromptLift is a Chrome extension that turns the colors, fonts, layout and animations of any website into a '
        'ready-to-paste prompt for Claude Code, Cursor, ChatGPT, Lovable, v0, Bolt and other AI apps.')
rep('<title>PromptLift — homepage, version A</title>',
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
    '<title>PromptLift: turn any website design into a prompt for your AI app</title>\n'
    f'<meta name="description" content="{DESC}">\n'
    '<meta name="theme-color" content="#fcfcfc">\n'
    '<meta property="og:type" content="website">\n'
    '<meta property="og:title" content="PromptLift: turn any website design into a prompt for your AI app">\n'
    f'<meta property="og:description" content="{DESC}">\n'
    '<meta name="twitter:card" content="summary_large_image">')
rep('<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>')

# ---------- 2 + 3. hero: headline fade-in on the last two words of each line; rolling button labels ----------
rep('>Lift the designs you love into your own site.</h1>',
    '>Lift the designs <span class="pl-blurin" style="--i: 0">you love</span> into your <span class="pl-blurin" style="--i: 1">own site.</span></h1>')
rep('<a href="#get" style="display: inline-flex', '<a href="#get" class="pl-btn pl-btn-main" style="display: inline-flex')
rep('<a href="#demo" style="display: inline-flex', '<a href="#demo" class="pl-btn pl-btn-quiet" style="display: inline-flex')
rep('</svg>\nAdd PromptLift to Chrome\n</a>', '</svg>\n' + roll('Add PromptLift to Chrome') + '\n</a>')
rep('</svg>\nWatch a quick demo\n</a>', '</svg>\n' + roll('Watch a quick demo') + '\n</a>')

# ---------- 1. Made with PromptLift: framer layout, two moving rows ----------
PALS = [('#b9d96a', '#ffd38a', '#f7f3e8'), ('#a8d8ff', '#b9d96a', '#f3f7fb'), ('#ffb7a1', '#ffe08a', '#fbf4ef'),
        ('#c9b8ff', '#a8e6cf', '#f5f3fb'), ('#b9d96a', '#9ad7e0', '#f1f7f4'), ('#ffd0e1', '#c9e6a0', '#fbf3f6')]


def site_card(i, big):
    a, b, bg = PALS[i % 6]
    size = 'pl-mock-big' if big else 'pl-mock-small'
    return (f'<li class="pl-mock {size}" style="--a: {a}; --b: {b}; --bg: {bg}">'
            '<span class="pl-mock-bar"><i></i><i></i><i></i></span>'
            '<span class="pl-mock-hero"><span class="pl-mock-h"></span><span class="pl-mock-p"></span><span class="pl-mock-btn"></span></span>'
            '<span class="pl-mock-grid"><i></i><i></i><i></i></span>'
            f'<span class="pl-mock-tag">[Site {i % 6 + 1}: screenshot of a site made with PromptLift]</span></li>')


def row(big, offset):
    one = ''.join(site_card(i + offset, big) for i in range(6))
    # The row repeats once so the loop is seamless; the copy is hidden from screen readers.
    return one + one.replace('<li class="pl-mock', '<li aria-hidden="true" class="pl-mock')


made_start = s.index('<!-- Websites made with PromptLift')
made_end = s.index('</section>', made_start) + len('</section>')
s = s[:made_start] + f'''<!-- Websites made with PromptLift (framer.com layout): title, line and button centered on top; under them two moving rows,
     the top one drifting left and the bottom one drifting right. Pointing at a row pauses it. Real sites go in the placeholders. -->
<section aria-labelledby="pl-made" style="width: 100%; padding: 96px 0 0; box-sizing: border-box">
<header style="display: flex; flex-direction: column; align-items: center; gap: 16px; text-align: center">
<h2 id="pl-made" class="pl-display" style="margin: 0; color: var(--pl-text)">Made with PromptLift</h2>
<p style="margin: 0; font-size: 16px; line-height: 1.55; color: #55554f">Real sites people built with PromptLift from design details they liked elsewhere.</p>
{main_btn()}
</header>
<div class="pl-marquee" role="region" aria-label="Sites made with PromptLift">
<ul class="pl-mq-row pl-mq-left">{row(True, 0)}</ul>
<ul class="pl-mq-row pl-mq-right">{row(False, 3)}</ul>
</div>
</section>''' + s[made_end:]
# The old rail's scroll buttons are gone; their script stays harmless (no element to scroll).

# ---------- 4. text content: a few clearer lines, two more FAQ answers ----------
rep('>You click a part of any website you like (a section, a button, an animation) and PromptLift writes it up as one prompt for your AI app, so it can bring that design into your own site.</p>',
    '>PromptLift is a Chrome extension. You click a part of any website you like (a section, a button, an animation) and it writes that design up as one ready-to-paste prompt for your AI app, such as Claude Code, Cursor, ChatGPT, Lovable, v0 or Bolt, so the app can bring it into your own site.</p>')
rep('>Short videos, under a minute each.</p>', '>Short PromptLift video guides, under a minute each.</p>')

faq_blocks = re.findall(r'<details class="pl-faq".*?</details>', s, re.S)
tpl = faq_blocks[0]


def faq(q, a):
    t = re.sub(r'(<summary[^>]*>).*?(<span class="pl-faq-icon")', lambda m: m.group(1) + q + m.group(2), tpl, flags=re.S)
    return re.sub(r'(<p [^>]*>).*?(</p>)', lambda m: m.group(1) + a + m.group(2), t, flags=re.S)


extra_after_first = faq('How is it different from DevTools or a screenshot?',
                        'DevTools shows the raw code of one element, and a screenshot only shows pixels. PromptLift reads the part you picked (its structure, spacing, fonts, color relationships and movement) and writes it up as clear instructions your AI app can follow.')
extra_last = faq('Is PromptLift free?', '[Add the price before launch.]')
rep(faq_blocks[2], faq_blocks[2] + '\n' + extra_after_first)
rep(faq_blocks[-1], faq_blocks[-1] + '\n' + extra_last)

# Structured data built from the final FAQ text, so search engines and AI assistants read the same answers people see.
faq_now = re.findall(r'<details class="pl-faq".*?</details>', s, re.S)
qa = []
for d in faq_now:
    q = re.sub(r'<.*?>', '', re.search(r'<summary[^>]*>(.*?)<span class="pl-faq-icon"', d, re.S).group(1)).strip()
    a = re.sub(r'<.*?>', '', re.search(r'<p [^>]*>(.*?)</p>', d, re.S).group(1)).strip()
    if not a.startswith('['):
        qa.append({'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}})
app_ld = {
    '@context': 'https://schema.org', '@type': 'SoftwareApplication', 'name': 'PromptLift',
    'applicationCategory': 'DeveloperApplication', 'applicationSubCategory': 'Browser extension',
    'operatingSystem': 'Google Chrome', 'description': DESC,
    'featureList': ['Pick any part of a website: a section, a button or an animation',
                    'Choose what to copy: colors, fonts, layout or motion',
                    'Writes one prompt for Claude Code, Cursor, ChatGPT, Gemini, Claude, Windsurf, Copilot, Lovable, v0 or Bolt',
                    'Runs in the browser with no account and no server'],
}
faq_ld = {'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': qa}
rep('<script src="./support.js"></script>',
    '<script type="application/ld+json">' + json.dumps(app_ld, ensure_ascii=False) + '</script>\n'
    '<script type="application/ld+json">' + json.dumps(faq_ld, ensure_ascii=False) + '</script>\n'
    '<script src="./support.js"></script>')

# ---------- 5. the bottom part: call to action, fine print, footer ----------
cta = f'''
<!-- Final call to action (webflow.com layout): text on the left (5 of 12 columns), a big picture on the right -->
<section aria-labelledby="pl-cta-title" class="pl-cta-row" style="width: 100%; max-width: 1300px; margin: 0 auto; padding: 96px 0; box-sizing: border-box">
<div class="pl-cta-text">
<h2 id="pl-cta-title" class="pl-display" style="margin: 0; color: var(--pl-text)">Start building your site from the designs you admire</h2>
<p style="margin: 0; font-size: 16px; line-height: 1.6; color: #55554f">Add PromptLift to Chrome, click what you like on any website, and paste the prompt into your AI app.</p>
<div class="pl-cta-box"><span>Ready to try it?</span>{main_btn()}</div>
</div>
<div class="pl-cta-pic">
<div class="pl-cta-frame">
<img src="/_blob/517672711a9d24d0b843fba34168982b" alt="The PromptLift side panel with a picked pricing section in the list, ready to copy as one prompt" loading="lazy" decoding="async" style="width: 62%; height: auto; display: block; border-radius: 10px; box-shadow: 0 0 0 1px rgba(21,21,21,0.08), 0 24px 48px -16px rgba(21,21,21,0.35)">
</div>
</div>
</section>

<!-- The fine print: plain-language notices; bracketed items must be completed before launch -->
<section id="legal" aria-labelledby="pl-legal" class="pl-legal" style="align-self: stretch; margin-left: calc(50% - 50vw); margin-right: calc(50% - 50vw); padding: 64px calc(50vw - 50%); box-sizing: border-box">
<div style="max-width: 1300px; margin: 0 auto">
<h2 id="pl-legal" class="pl-h2" style="margin: 0 0 24px; font-size: 20px; color: var(--pl-text)">The fine print</h2>
<div class="pl-legal-grid">
<div><h3>Trademarks</h3><p>Claude, Claude Code, Cursor, ChatGPT, Gemini, Windsurf, Copilot, Lovable, v0, Bolt, Google Chrome and other names are trademarks of their owners. They are named only to say which apps PromptLift writes prompts for; PromptLift isn’t affiliated with, sponsored or endorsed by any of them.</p></div>
<div><h3>Using what you lift</h3><p>PromptLift describes design (layout, spacing, type, color relationships, movement) and shifts colors slightly; it doesn’t copy a site’s text, photos, logos or code. You’re responsible for having the right to use anything you put on your site, and for respecting other sites’ terms and trademarks. When in doubt, ask a lawyer.</p></div>
<div><h3>Privacy</h3><p>The extension runs in your browser: it reads the page you’re on and that page’s style files, and puts the prompt on your clipboard. It has no account and sends nothing to a PromptLift server. This website loads its fonts from Google Fonts, which receives your IP address. Full details: <a href="#privacy">[Privacy policy: add before launch]</a>.</p></div>
<div><h3>Terms and warranty</h3><p>PromptLift is provided as is, without warranty. AI apps can make mistakes: review every change before you publish it. Full terms: <a href="#terms">[Terms of use: add before launch]</a>. Cookies: [Confirm before launch: this site sets no cookies].</p></div>
<div><h3>Credits</h3><p>Fonts: Newsreader, Inter and JetBrains Mono, under the SIL Open Font License.</p></div>
<div><h3>Contact</h3><p>Questions, takedown requests or accessibility problems: <a href="#contact">[Contact email: add before launch]</a>.</p></div>
</div>
</div>
</section>
'''
footer = '''
<!-- Footer (ideogram.ai): small print, then a giant faded wordmark on a soft green gradient -->
<footer class="pl-footer">
<div class="pl-footer-row">
<span>© 2026 [Company name]. All rights reserved. <a href="#terms">Terms of use</a> and <a href="#privacy">Privacy policy</a>.</span>
<span><a href="#legal">The fine print</a></span>
</div>
<div class="pl-wordmark" aria-hidden="true">PromptLift</div>
</footer>
'''
rep('<!-- The main call to action: pill, raised -->\n', cta)
rep('</main>\n</x-dc>', '</main>\n' + footer + '</x-dc>')
# The footer now ends the page, so the page's own bottom padding goes.
rep('padding: 112px 20px 67px; box-sizing: border-box">', 'padding: 112px 20px 0; box-sizing: border-box">')

# ---------- web: lazy-load images below the fold ----------
first_how = s.index('aria-labelledby="pl-how"')
s = s[:first_how] + re.sub(r'<img (?![^>]*loading=)', '<img loading="lazy" decoding="async" ', s[first_how:])

# ---------- styles for the new parts ----------
css = r'''
/* ===== Version B additions (only what the prompt asked for) ===== */
/* Buttons (ideogram.ai): label slides up and fades, a copy rises in; the button turns darker */
.pl-btn{transition:background-color .24s ease,border-color .24s ease}
.pl-btn-main:hover{background:#9fbf4c !important;border-color:#9fbf4c !important}
.pl-btn-quiet:hover{background:#e8eddb !important}
.pl-btn:focus-visible{outline:2px solid var(--pl-accent-ink);outline-offset:3px}
.pl-roll{position:relative;display:inline-grid;overflow:hidden}
.pl-roll-a,.pl-roll-b{grid-area:1/1;transition:transform .32s cubic-bezier(.22,1,.36,1),opacity .24s}
.pl-roll-b{transform:translateY(100%);opacity:0}
.pl-btn:hover .pl-roll-a{transform:translateY(-100%);opacity:0}
.pl-btn:hover .pl-roll-b{transform:none;opacity:1}
/* Headline (lovable.dev blur-in): the last two words of each line blur in from below, their color fading from green to ink */
.pl-blurin{display:inline-block;background:linear-gradient(90deg,#151515 0%,#151515 45%,#5b6f2a 55%,#B9D96A 100%);background-size:220% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:pl-blurin 1200ms cubic-bezier(0.455,0.03,0.515,0.955) calc(var(--i) * 180ms + 150ms) both}
@keyframes pl-blurin{0%{background-position-x:100%;filter:blur(6px);opacity:0;transform:translateY(.35em)}100%{background-position-x:0%;filter:blur(0);opacity:1;transform:none}}
/* Made with PromptLift (framer.com): two moving rows, full width */
.pl-marquee{display:flex;flex-direction:column;gap:10px;margin:48px calc(50% - 50vw) 0;overflow:hidden;mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent);-webkit-mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent)}
.pl-mq-row{display:flex;gap:10px;margin:0;padding:0;list-style:none;width:max-content;animation:60s linear infinite;will-change:transform}
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
/* Final call to action (webflow.com): 5 of 12 columns of text, a big picture on the right */
.pl-cta-row{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:32px 0}
.pl-cta-text{flex:0 1 41.6667%;max-width:41.6667%;box-sizing:border-box;padding:0 16px 0 0;display:flex;flex-direction:column;align-items:flex-start;gap:20px}
.pl-cta-box{display:inline-flex;flex-wrap:wrap;align-items:center;gap:6.4px 14px;padding:16px 24px;border-radius:12px;background:#f2f8e3;font-size:16px;color:#151515}
.pl-cta-pic{flex:0 1 58%;max-width:760px;box-sizing:border-box;padding:0 0 0 16px}
.pl-cta-frame{position:relative;aspect-ratio:776/582;border-radius:8px;overflow:hidden;isolation:isolate;display:grid;place-items:center;background:#f7f5ee}
.pl-cta-frame::before{content:"";position:absolute;inset:-20%;z-index:-1;background:radial-gradient(40% 40% at 25% 30%,rgba(185,217,106,.9),transparent 70%),radial-gradient(35% 35% at 80% 25%,rgba(255,200,150,.75),transparent 70%),radial-gradient(40% 40% at 70% 85%,rgba(196,180,255,.6),transparent 70%),radial-gradient(30% 30% at 15% 85%,rgba(140,215,230,.6),transparent 70%);filter:blur(12px)}
@media (max-width:900px){.pl-cta-text,.pl-cta-pic{flex-basis:100%;max-width:100%;padding:0}}
/* The fine print */
.pl-legal{background:#f7f7f3;border-top:1px solid var(--pl-line)}
.pl-legal-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:28px 40px}
.pl-legal h3{margin:0 0 8px;font-size:14px !important;font-weight:600 !important;color:#151515}
.pl-legal p{margin:0;font-size:13.5px;line-height:1.6;color:#4a4a44}
.pl-legal a{color:#151515;text-decoration-color:#B9D96A;text-decoration-thickness:2px;text-underline-offset:3px}
@media (max-width:900px){.pl-legal-grid{grid-template-columns:minmax(0,1fr)}}
/* Footer (ideogram.ai): giant faded wordmark */
.pl-footer{position:relative;overflow:hidden;font-family:Inter,ui-sans-serif,system-ui,sans-serif;background:linear-gradient(180deg,#fcfcfc 0%,#f6f8ee 38%,#e4efc4 70%,#c9e08a 100%)}
.pl-footer-row{max-width:1300px;margin:0 auto;display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px 24px;padding:28px 20px;font-size:14px;color:#3f3f3a}
.pl-footer a{color:#3f3f3a;text-underline-offset:3px}
.pl-wordmark{font-family:Newsreader,Georgia,serif;font-size:clamp(90px,19vw,270px);line-height:.8;letter-spacing:-.05em;text-align:center;color:rgba(91,111,42,.16);padding:24px 0 0;margin-bottom:-.12em;user-select:none}
@media (max-width:640px){.pl-mock-big{width:420px;height:236px}}
/* Reduced motion: no rolling labels, no blur-in, rows you can scroll instead */
@media (prefers-reduced-motion: reduce){
  .pl-roll-a,.pl-roll-b{transition:none}.pl-btn:hover .pl-roll-a{transform:none;opacity:1}.pl-btn:hover .pl-roll-b{opacity:0}
  .pl-blurin{animation:none;color:inherit;background:none}
  .pl-mq-row{animation:none}.pl-marquee{overflow-x:auto}
}
'''
rep('<style>\n/* Made with PromptLift rail + Quick guides */', '<style>' + css + '/* Made with PromptLift rail + Quick guides */')

s = s.replace('"$preview":{"width":1440,"height":5330}', '"$preview":{"width":1440,"height":7239}')
(ROOT / 'project' / 'VersionB.dc.html').write_text(s)
print('written', len(s))
