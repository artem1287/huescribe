"""Round nov22b (applied to round_nov22a.py, the hero demo generator): the AI app window becomes a realistic dark code
editor: file tree, the stylesheet being edited (red/green diff lines), and an agent chat (pasted prompt, Thinking…,
Read/Edited steps, a reply in the visitor's language, a preview, the input box). The app's own chrome stays in English
(translate="no"), as such apps are; only the pasted prompt and the reply are translated.
Run once: it edits round_nov22a.py in place; then run round_nov22a.py.
"""
p = '/home/claude/homepage/patches/round_nov22a.py'
s = open(p).read()


def cut(a, b, new):
    global s
    i = s.index(a); j = s.index(b, i) + len(b); s = s[:i] + new + s[j:]


ADDS = 7
cut("# ---------------------------------------------------------------- the AI app", 'assert res + 0.6 < END, "the loop ends before the result has been seen"\n', r'''# ---------------------------------------------------------------- the AI app (a code editor with an agent chat)
ai = done + 0.25
add(kf("pl-h-ai", [(0, "opacity:0;translate:0 24px;scale:.98"), (ai, "opacity:0;translate:0 24px;scale:.98"), (ai + 0.3, "opacity:1;translate:0 0;scale:1"),
                   (END, "opacity:1;translate:0 0;scale:1"), (END + 0.35, "opacity:0;translate:0 24px;scale:.98")]))
paste, send = ai + 0.35, ai + 0.8
add(kf("pl-h-pasted", [(0, "opacity:0;scale:.9"), (paste, "opacity:0;scale:.9"), (paste + 0.12, "opacity:1;scale:1"), (send, "opacity:1;scale:1"), (send + 0.08, "opacity:0;scale:1")]))
add(kf("pl-h-ph", [(0, "opacity:1"), (paste, "opacity:1"), (paste + 0.05, "opacity:0"), (send + 0.05, "opacity:0"), (send + 0.15, "opacity:1")]))
add(kf("pl-h-send", [(0, "background:#3a3a3f;scale:1"), (paste, "background:#3a3a3f"), (paste + 0.1, "background:#f2f2f2;scale:1"), (send - 0.02, "scale:1"),
                     (send + 0.04, "scale:.85;background:#f2f2f2"), (send + 0.14, "scale:1;background:#3a3a3f")]))


def pop(name, t, hide=None, rise="6px"):
    steps = [(0, f"opacity:0;translate:0 {rise};max-height:0"), (t, f"opacity:0;translate:0 {rise};max-height:0"), (t + 0.18, "opacity:1;translate:0 0;max-height:220px")]
    if hide:
        steps += [(hide, "opacity:1;translate:0 0;max-height:220px"), (hide + 0.15, "opacity:0;translate:0 0;max-height:0")]
    add(kf(name, steps))


pop("pl-h-umsg", send + 0.05)
think, read, edit = send + 0.55, send + 1.15, send + 1.45
pop("pl-h-think", think, hide=read)
pop("pl-h-step1", read)
pop("pl-h-step2", edit)
ADDS = 7
for i in range(ADDS):
    t = edit + 0.1 + i * 0.12
    add(kf(f"pl-h-add{i + 1}", [(0, "max-height:0;opacity:0"), (t, "max-height:0;opacity:0"), (t + 0.12, "max-height:17px;opacity:1;background:rgba(110,190,110,.32)"),
                                (t + 0.6, "background:rgba(110,190,110,.16)")]))
add(kf("pl-h-del", [(0, "max-height:17px;opacity:1;background:transparent"), (edit, "max-height:17px;background:transparent"), (edit + 0.1, "max-height:17px;opacity:1;background:rgba(230,90,90,.3)"),
                    (edit + 0.55, "max-height:17px;opacity:1"), (edit + 0.75, "max-height:0;opacity:0")]))
edited = edit + 0.1 + ADDS * 0.12 + 0.1
add(kf("pl-h-spin", [(0, "opacity:1"), (edited, "opacity:1"), (edited + 0.05, "opacity:0")]))
add(kf("pl-h-tick", [(0, "opacity:0"), (edited, "opacity:0"), (edited + 0.1, "opacity:1")]))
add(kf("pl-h-dirty", [(0, "opacity:0"), (edit + 0.1, "opacity:0"), (edit + 0.2, "opacity:1")]))
res = edited + 0.25
pop("pl-h-reply", res)
for i in range(3):
    t = res + 0.25 + i * 0.12
    add(kf(f"pl-h-new{i + 1}", [(0, "opacity:0;translate:0 8px;scale:.9"), (t, "opacity:0;translate:0 8px;scale:.9"),
                                (t + 0.18, "opacity:1;translate:0 -2px;scale:1.02"), (t + 0.28, "opacity:1;translate:0 0;scale:1")]))
assert res + 1.2 < END, "the loop ends before the result has been seen"
''')

cut("/* the AI app */", ".pl-h-new1{animation-name:pl-h-new1}.pl-h-new2{animation-name:pl-h-new2}.pl-h-new3{animation-name:pl-h-new3}\n", r'''/* the AI app: a dark code editor (files, the stylesheet, an agent chat) */
.pl-h-aiwrap{position:absolute;z-index:6;inset-inline-start:24px;bottom:14px;width:660px;max-width:calc(100% - 48px)}
.pl-h-ai{display:flex;flex-direction:column;height:330px;border-radius:12px;background:#18181b;color:#d4d4d8;box-shadow:0 0 0 1px rgba(255,255,255,.06),0 30px 60px -18px rgba(0,0,0,.55);overflow:hidden;opacity:0;font-family:Inter,ui-sans-serif,system-ui,sans-serif;animation-name:pl-h-ai}
.pl-h-aibar{display:flex;align-items:center;gap:10px;height:32px;flex:none;padding:0 12px;background:#111113;border-bottom:1px solid #26262b;font-size:11px;color:#8b8b94}
.pl-h-aibar .pl-h-dots i{background:#3f3f46}
.pl-h-aibar > span:nth-child(2){flex:1;text-align:center}
.pl-h-ide{flex:1;min-height:0;display:flex}
.pl-h-files{width:112px;flex:none;padding:8px 0;background:#141416;border-inline-end:1px solid #26262b;font-size:10.5px;color:#9b9ba4}
.pl-h-files b{display:block;padding:0 12px 6px;font-size:9px;letter-spacing:.08em;color:#6b6b74;font-weight:600}
.pl-h-files span{display:flex;align-items:center;gap:6px;height:22px;padding:0 12px;white-space:nowrap}
.pl-h-files span i{width:7px;height:7px;border-radius:2px;flex:none}
.pl-h-files .on{background:#26262b;color:#ececf0}
.pl-h-ed{flex:1;min-width:0;display:flex;flex-direction:column;background:#18181b}
.pl-h-tabs{display:flex;height:28px;flex:none;background:#141416;border-bottom:1px solid #26262b;font-size:10.5px}
.pl-h-tabs span{display:flex;align-items:center;gap:6px;padding:0 12px;color:#8b8b94;border-inline-end:1px solid #26262b}
.pl-h-tabs .on{background:#18181b;color:#ececf0;box-shadow:inset 0 1px 0 #b9d96a}
.pl-h-tabs em{width:6px;height:6px;border-radius:50%;background:#d4d4d8;opacity:0;animation-name:pl-h-dirty}
.pl-h-src{flex:1;min-height:0;overflow:hidden;padding:6px 0;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10.5px;line-height:17px;direction:ltr;text-align:left}
.pl-h-src > span{display:flex;white-space:pre;overflow:hidden;max-height:17px}
.pl-h-src u{width:30px;flex:none;padding-right:10px;text-align:right;text-decoration:none;color:#55555e}
.pl-h-src .add{max-height:0;opacity:0}
.pl-h-src .add u::after{content:"+";margin-left:2px;color:#7cc47c}.pl-h-src .del u::after{content:"\2212";margin-left:2px;color:#e06c6c}
.pl-h-src .del{animation-name:pl-h-del}
.pl-h-add1{animation-name:pl-h-add1}.pl-h-add2{animation-name:pl-h-add2}.pl-h-add3{animation-name:pl-h-add3}.pl-h-add4{animation-name:pl-h-add4}.pl-h-add5{animation-name:pl-h-add5}.pl-h-add6{animation-name:pl-h-add6}.pl-h-add7{animation-name:pl-h-add7}
.pl-h-src .s{color:#e5c07b}.pl-h-src .p{color:#82aaff}.pl-h-src .v{color:#c3e88d}
.pl-h-chat{width:236px;flex:none;display:flex;flex-direction:column;background:#141416;border-inline-start:1px solid #26262b}
.pl-h-chathead{display:flex;align-items:center;justify-content:space-between;height:28px;flex:none;padding:0 10px;border-bottom:1px solid #26262b;font-size:10.5px;color:#ececf0;font-weight:550}
.pl-h-chathead span{padding:2px 7px;border-radius:999px;background:#26262b;color:#a1a1aa;font-size:9.5px;font-weight:500}
.pl-h-msgs{flex:1;min-height:0;overflow:hidden;display:flex;flex-direction:column;justify-content:flex-end;gap:8px;padding:10px}
.pl-h-msgs > div{overflow:hidden;opacity:0;max-height:0;flex:none}
.pl-h-umsg{animation-name:pl-h-umsg}.pl-h-think{animation-name:pl-h-think}.pl-h-step1{animation-name:pl-h-step1}.pl-h-step2{animation-name:pl-h-step2}.pl-h-reply{animation-name:pl-h-reply}
.pl-h-bubble{padding:8px;border-radius:9px;background:#26262b;display:flex;flex-direction:column;gap:5px}
.pl-h-chip{align-self:flex-start;display:inline-flex;align-items:center;gap:5px;padding:2px 7px;border-radius:5px;background:#33333a;color:#c4c4cc;font-size:9.5px}
.pl-h-chip svg{width:10px;height:10px;fill:none;stroke:currentColor;stroke-width:2}
.pl-h-code{display:flex;flex-direction:column;gap:2px;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:9px;line-height:1.45;color:#a1a1aa}
.pl-h-code > span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pl-h-code > span b{font-weight:400;color:#b9d96a}
.pl-h-shim{font-size:10.5px;background:linear-gradient(90deg,#6b6b74 0%,#6b6b74 35%,#f4f4f5 50%,#6b6b74 65%,#6b6b74 100%) 0 0/250% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:pl-h-shim 1.1s linear infinite}
@keyframes pl-h-shim{from{background-position:100% 0}to{background-position:-150% 0}}
.pl-h-step{display:flex;align-items:center;gap:6px;font-size:10px;color:#a1a1aa}
.pl-h-step b{font-weight:500;color:#e4e4e7}.pl-h-step em{font-style:normal;color:#7cc47c}.pl-h-step em + em{color:#e06c6c}
.pl-h-st{position:relative;width:12px;height:12px;flex:none}
.pl-h-st svg{position:absolute;inset:0;width:12px;height:12px;fill:none;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round}
.pl-h-st .ok{stroke:#7cc47c}.pl-h-st .spin{stroke:#a1a1aa;animation:pl-h-rot .8s linear infinite}
.pl-h-step2 .spin{animation:pl-h-rot .8s linear infinite,pl-h-spin 14.5s infinite both}.pl-h-step2 .ok{opacity:0;animation-name:pl-h-tick}
@keyframes pl-h-rot{to{rotate:360deg}}
.pl-h-reply p{margin:0 0 7px;font-size:10.5px;line-height:1.5;color:#e4e4e7}
.pl-h-new{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px;padding:5px;border-radius:7px;background:#f8f4ec}
.pl-h-new > span{display:flex;flex-direction:column;gap:3px;padding:5px;border-radius:5px;background:#ffffff;box-shadow:0 0 0 1px #e4ead3;opacity:0}
.pl-h-new > span:nth-child(2){background:#1f2a12}
.pl-h-new i{display:block;height:3px;border-radius:2px;background:#d9dccf}.pl-h-new > span:nth-child(2) i{background:#4c5a33}
.pl-h-new i:first-child{width:60%}.pl-h-new i.pill{height:7px;border-radius:999px;background:#b9d96a !important;margin-top:2px}
.pl-h-new1{animation-name:pl-h-new1}.pl-h-new2{animation-name:pl-h-new2}.pl-h-new3{animation-name:pl-h-new3}
.pl-h-comp{position:relative;flex:none;margin:0 8px 8px;min-height:54px;box-sizing:border-box;padding:7px 8px;border-radius:9px;background:#1d1d21;box-shadow:inset 0 0 0 1px #33333a;font-size:10.5px;color:#6b6b74}
.pl-h-comp > span:first-child{display:block;animation-name:pl-h-ph}
.pl-h-pasted{position:absolute;top:7px;inset-inline-start:8px;opacity:0;animation-name:pl-h-pasted}
.pl-h-compfoot{position:absolute;inset-inline:8px;bottom:6px;display:flex;align-items:center;justify-content:space-between;font-size:9.5px;color:#8b8b94}
.pl-h-send{display:grid;place-items:center;width:20px;height:20px;border-radius:50%;background:#3a3a3f;color:#18181b;animation-name:pl-h-send}
.pl-h-send svg{width:11px;height:11px;fill:none;stroke:currentColor;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round}
@media (max-width:1180px){.pl-h-files{display:none}.pl-h-aiwrap{width:560px}}
''')

a = ".pl-h-aiwrap{position:relative;inset:auto;width:100%;max-width:none;margin-top:16px}\n.pl-h-ai{animation:none;opacity:1}"
assert a in s
s = s.replace(a, a + "\n.pl-h-ed{display:none}.pl-h-chat{flex:1;width:auto;border:0}")
a = ".pl-h-code > span{clip-path:none}"
assert a in s
s = s.replace(a, ".pl-h-msgs > div:not(.pl-h-think),.pl-h-src .add{opacity:1;max-height:none}.pl-h-src .del,.pl-h-step2 .spin,.pl-h-pasted{display:none}.pl-h-step2 .ok{opacity:1}")

SRC = [
    ('', '<span class="s">.plans</span> {'),
    ('del', '  <span class="p">display</span>: <span class="v">flex</span>;'),
    ('add', '  <span class="p">display</span>: <span class="v">grid</span>;'),
    ('add', '  <span class="p">grid-template-columns</span>: <span class="v">repeat(3, 1fr)</span>;'),
    ('add', '  <span class="p">gap</span>: <span class="v">12px</span>;'),
    ('', '}'),
    ('', '<span class="s">.plan--pro</span> {'),
    ('add', '  <span class="p">background</span>: <span class="v">#2a2926</span>;'),
    ('', '}'),
    ('', '<span class="s">h1</span> {'),
    ('add', '  <span class="p">font</span>: <span class="v">28px/1.15 Georgia, serif</span>;'),
    ('add', '  <span class="p">letter-spacing</span>: <span class="v">-0.02em</span>;'),
    ('', '}'),
    ('', '<span class="s">.switch .knob</span> {'),
    ('add', '  <span class="p">transition</span>: <span class="v">transform 250ms ease-out</span>;'),
    ('', '}'),
]
lines, n, k = [], 0, 0
for kind, code in SRC:
    if kind != 'del':
        n += 1
    num = n if kind != 'del' else n + 1
    cls = ''
    if kind == 'add':
        k += 1; cls = f' class="add pl-h-add{k}"'
    if kind == 'del':
        cls = ' class="del"'
    lines.append(f'<span{cls}><u>{num}</u>{code}</span>')
assert k == ADDS
SRCHTML = "".join(lines).replace("{", "{{").replace("}", "}}")  # it goes into an f-string
CHK = '<svg class="ok" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>'
SPIN = '<svg class="spin" viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-6.2-8.6"/></svg>'
CLIP = '<svg viewBox="0 0 24 24"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>'
ARROW = '<svg viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7"/></svg>'


def FILE(name, col, on=""):
    return f'<span class="{on}"><i style="background:{col}"></i>{name}</span>'


new_html = (
    '<!-- Window 2: the AI app (a code editor with an agent chat; its own chrome stays in English, translate="no") -->\n'
    '<div class="pl-ai-wrap pl-h-aiwrap"><div class="pl-h-ai">\n'
    '<div class="pl-h-aibar">{DOTS}<span translate="no">my-site — Cursor</span><span style="width: 42px"></span></div>\n'
    '<div class="pl-h-ide">\n'
    '<div class="pl-h-files" translate="no" aria-hidden="true"><b>MY-SITE</b>'
    + FILE("index.html", "#e8875a") + FILE("pricing.html", "#e8875a") + FILE("pricing.css", "#6aa7ff", "on") + FILE("app.js", "#e5c07b") + '</div>\n'
    '<div class="pl-h-ed" aria-hidden="true"><div class="pl-h-tabs" translate="no"><span>pricing.html</span><span class="on">pricing.css <em></em></span></div>\n'
    '<div class="pl-h-src" translate="no">' + SRCHTML + '</div></div>\n'
    '<div class="pl-h-chat"><div class="pl-h-chathead" translate="no">Chat<span>Agent ⌄</span></div>\n'
    '<div class="pl-h-msgs">\n'
    '<div class="pl-h-umsg"><div class="pl-h-bubble"><span class="pl-h-chip" translate="no">' + CLIP + 'Pasted · 6,240 chars</span><div class="pl-h-code">\n'
    '<span dir="auto"><b>&lt;where_on_my_site&gt;</b>my pricing page<b>&lt;/where…&gt;</b></span>\n'
    '<span dir="auto">3 equal columns, 12px apart; the middle one is dark</span>\n'
    '<span dir="auto">headings: Georgia 28px, letter spacing -0.02em</span>\n'
    '<span dir="auto">switch: the knob slides 250ms, ease-out, on click</span>\n'
    '</div></div></div>\n'
    '<div class="pl-h-think" translate="no"><span class="pl-h-shim">Thinking…</span></div>\n'
    '<div class="pl-h-step1" translate="no"><span class="pl-h-step"><span class="pl-h-st">' + CHK + '</span>Read <b>pricing.html</b></span></div>\n'
    '<div class="pl-h-step2" translate="no"><span class="pl-h-step"><span class="pl-h-st">' + SPIN + CHK + '</span>Edited <b>pricing.css</b> <em>+7</em> <em>−1</em></span></div>\n'
    '<div class="pl-h-reply"><p>Done. Your pricing page now has three equal columns, Georgia headings and a switch that slides on click.</p>'
    '<span class="pl-h-new" aria-hidden="true"><span class="pl-h-new1"><i></i><i></i><i class="pill"></i></span><span class="pl-h-new2"><i></i><i></i><i class="pill"></i></span><span class="pl-h-new3"><i></i><i></i><i class="pill"></i></span></span></div>\n'
    '</div>\n'
    '<div class="pl-h-comp" translate="no"><span>Ask anything</span><span class="pl-h-pasted pl-h-chip">' + CLIP + 'Pasted · 6,240 chars</span>'
    '<span class="pl-h-compfoot"><span>Agent · Auto</span><span class="pl-h-send">' + ARROW + '</span></span></div>\n'
    '</div>\n</div>\n</div></div>\n')
cut("<!-- Window 2: the AI app -->", "</div></div>\n<script>", new_html + "<script>")
open(p, 'w').write(s)
print("AI window rewritten in", p)
