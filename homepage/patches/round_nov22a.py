"""Round nov22a: the first app view (the hero demo) is faster and shows much more of the app.

One 14.5-second loop (was 12 s for a single pick):
  1. pick the pricing section -> sheet slides in -> Colors + Layout -> Add (row 1)
  2. pick the headline        -> Fonts -> Add (row 2)
  3. pick the Monthly/Yearly switch -> Motion -> Recording: press it, the knob slides, "1 movement caught" -> Stop (row 3)
  4. switch the AI app in the header: Claude Code -> Cursor (dropdown)
  5. Copy prompt (3 parts) -> "Copied" card
  6. the AI app window slides in, the prompt types out, "pricing.html updated" and a small preview of the new page pops in

Timings live in seconds below (T, WAYPOINTS, the kf() calls); percentages are computed. The pointer's targets are
measured from the page by a tiny script (data-pl-t elements), so it lands right at every width and in RTL; without the
script it falls back to the desktop positions.

Re-runnable: the HTML sits between <!-- hero demo start/end --> and the CSS between /* hero demo css start/end */.
"""
import re
import sys

P = "/home/claude/homepage/project/VersionB.dc.html"
s = open(P, encoding="utf-8").read()

T = 14.5  # loop length, seconds


def pc(t):
    return f"{t / T * 100:.2f}".rstrip("0").rstrip(".") + "%"


def kf(name, steps):
    """steps: [(seconds, css)]; 0 and T are added from the first/last step when missing."""
    steps = sorted(steps, key=lambda x: x[0])
    if steps[0][0] > 0:
        steps.insert(0, (0, steps[0][1]))
    if steps[-1][0] < T:
        steps.append((T, steps[0][1]))
    return f"@keyframes {name}{{" + "".join(f"{pc(t)}{{{css}}}" for t, css in steps) + "}"


def fade(name, on, off, hidden="opacity:0", shown="opacity:1", d=0.18):
    """Visible from on to off (each with a d-second transition)."""
    return kf(name, [(0, hidden), (on, hidden), (on + d, shown), (off, shown), (off + d, hidden)])


CSS = []
add = CSS.append

# ---------------------------------------------------------------- pointer
WAYPOINTS = [  # (seconds, target, click)
    (0.00, "start", False),
    (0.45, "sec", True),
    (1.10, "a-colors", True), (1.45, "a-layout", True), (1.85, "a-add", True),
    (2.45, "head", True),
    (3.05, "b-fonts", True), (3.45, "b-add", True),
    (4.05, "toggle", True),
    (4.70, "c-motion", True),
    (5.25, "toggle", True),
    (5.95, "r-stop", True),
    (6.55, "app", True), (6.95, "menu-cursor", True),
    (7.45, "copy", True),
]
CLICK = 0.08  # the press happens this long after arriving
cur, ring = [], [(0, "opacity:0;transform:scale(.4)")]
for i, (t, tg, click) in enumerate(WAYPOINTS):
    pos = f"left:var(--pl-x-{tg});top:var(--pl-y-{tg})"
    if i == 0:
        cur += [(0, f"{pos};opacity:0;transform:none"), (0.15, f"opacity:1")]
        continue
    cur.append((t, f"{pos};transform:none"))
    if click:
        cur += [(t + CLICK, "transform:scale(.8)"), (t + CLICK + 0.08, f"{pos};transform:none")]
        ring += [(t + CLICK - 0.01, "opacity:0;transform:scale(.4)"), (t + CLICK, "opacity:.6;transform:scale(.4)"),
                 (t + CLICK + 0.3, "opacity:0;transform:scale(1.8)")]
last = WAYPOINTS[-1]
cur += [(last[0] + 0.45, f"left:var(--pl-x-{last[1]});top:var(--pl-y-{last[1]});opacity:1"),
        (last[0] + 0.65, "opacity:0"), (T - 0.01, "left:var(--pl-x-start);top:var(--pl-y-start);opacity:0")]
add(kf("pl-h-cur", cur))
add(kf("pl-h-ring", ring))
CLK = {tg: t + CLICK for t, tg, c in WAYPOINTS if c}
CLK["toggle2"] = 5.25 + CLICK
CLK["toggle"] = 4.05 + CLICK
END = 13.9  # everything fades back to the start from here

# ---------------------------------------------------------------- site: outlines and the switch
for n, (hover, click) in {1: (0.30, CLK["sec"]), 2: (2.30, CLK["head"]), 3: (3.90, CLK["toggle"])}.items():
    add(kf(f"pl-h-out{n}", [(0, "opacity:0;border-style:dashed"), (hover, "opacity:0;border-style:dashed"),
                            (hover + 0.1, "opacity:1;border-style:dashed"), (click - 0.01, "border-style:dashed;box-shadow:none"),
                            (click, "border-style:solid;box-shadow:0 0 0 4px rgba(185,217,106,.35)"),
                            (7.62, "opacity:1;border-style:solid;box-shadow:0 0 0 4px rgba(185,217,106,.35)"),
                            (7.8, "opacity:0;border-style:solid;box-shadow:none")]))
    add(kf(f"pl-h-num{n}", [(0, "transform:scale(0)"), (click, "transform:scale(0)"), (click + 0.12, "transform:scale(1.15)"),
                            (click + 0.2, "transform:none"), (7.62, "transform:none"), (7.8, "transform:scale(0)")]))
knob = CLK["toggle2"]
add(kf("pl-h-knob", [(0, "inset-inline-start:3px"), (knob, "inset-inline-start:3px"), (knob + 0.25, "inset-inline-start:calc(50% + 1px)"),
                     (END, "inset-inline-start:calc(50% + 1px)"), (END + 0.4, "inset-inline-start:3px")]))
add(kf("pl-h-pm", [(0, "opacity:1;translate:0 0"), (knob + 0.12, "opacity:1;translate:0 0"), (knob + 0.3, "opacity:0;translate:0 -100%"), (END, "opacity:0;translate:0 -100%"), (END + 0.01, "opacity:0;translate:0 100%"), (END + 0.35, "opacity:1;translate:0 0")]))
add(kf("pl-h-py", [(0, "opacity:0;translate:0 100%"), (knob + 0.12, "opacity:0;translate:0 100%"), (knob + 0.3, "opacity:1;translate:0 0"), (END, "opacity:1;translate:0 0"), (END + 0.3, "opacity:0;translate:0 -100%")]))
add(kf("pl-h-m", [(0, "color:#2a2926"), (knob + 0.1, "color:#2a2926"), (knob + 0.2, "color:#8a857b"), (END, "color:#8a857b"), (END + 0.4, "color:#2a2926")]))
add(kf("pl-h-y", [(0, "color:#8a857b"), (knob + 0.1, "color:#8a857b"), (knob + 0.2, "color:#2a2926"), (END, "color:#2a2926"), (END + 0.4, "color:#8a857b")]))

# ---------------------------------------------------------------- panel
SLIDE_IN = "translate:calc(var(--pl-dir) * 100%) 0"
add(kf("pl-h-list", [(0, "opacity:1"), (7.6, "opacity:1"), (7.75, "opacity:0"), (END, "opacity:0"), (END + 0.3, "opacity:1")]))
add(kf("pl-h-empty", [(0, "opacity:1"), (1.95, "opacity:1"), (2.05, "opacity:0"), (END, "opacity:0"), (END + 0.3, "opacity:1")]))
for n, t in {1: 2.0, 2: 3.6, 3: 6.15}.items():
    add(kf(f"pl-h-row{n}", [(0, "opacity:0;translate:0 -8px;max-height:0;margin-top:-8px"),
                            (t, "opacity:0;translate:0 -8px;max-height:0;margin-top:-8px"),
                            (t + 0.15, "opacity:0;translate:0 -8px;max-height:64px;margin-top:0"),
                            (t + 0.32, "opacity:1;translate:0 0;max-height:64px;margin-top:0;box-shadow:0 0 0 2px #b9d96a"),
                            (t + 1.0, "box-shadow:0 0 0 1px rgba(17,17,19,.06),0 1px 2px rgba(17,17,19,.04)"),
                            (7.6, "opacity:1;translate:0 0;max-height:64px;margin-top:0")]))
# copy button label: Copy prompt -> (1 part) -> (2 parts) -> (3 parts)
for n, (on, off) in {0: (-1, 2.0), 1: (2.0, 3.6), 2: (3.6, 6.15), 3: (6.15, END)}.items():
    if n == 0:
        add(kf("pl-h-copy0", [(0, "opacity:1"), (2.0, "opacity:1"), (2.1, "opacity:0"), (END, "opacity:0"), (END + 0.3, "opacity:1")]))
    else:
        add(kf(f"pl-h-copy{n}", [(0, "opacity:0;translate:0 6px"), (on, "opacity:0;translate:0 6px"), (on + 0.12, "opacity:1;translate:0 0"),
                                 (off, "opacity:1;translate:0 0"), (off + 0.1, "opacity:0;translate:0 -6px")]))
add(kf("pl-h-copybtn", [(0, "opacity:.45;scale:1"), (2.0, "opacity:.45"), (2.1, "opacity:1;scale:1"), (CLK["copy"] - 0.01, "scale:1"),
                        (CLK["copy"] + 0.04, "scale:.95"), (CLK["copy"] + 0.14, "scale:1"), (END, "opacity:1"), (END + 0.3, "opacity:.45")]))
# AI app in the header and its menu
add(kf("pl-h-app1", [(0, "opacity:1"), (CLK["menu-cursor"], "opacity:1"), (CLK["menu-cursor"] + 0.08, "opacity:0"), (END, "opacity:0"), (END + 0.3, "opacity:1")]))
add(kf("pl-h-app2", [(0, "opacity:0"), (CLK["menu-cursor"], "opacity:0"), (CLK["menu-cursor"] + 0.08, "opacity:1"), (END, "opacity:1"), (END + 0.3, "opacity:0")]))
m_on, m_off = CLK["app"], CLK["menu-cursor"] + 0.06
add(kf("pl-h-menu", [(0, "opacity:0;translate:0 -6px;scale:.97"), (m_on, "opacity:0;translate:0 -6px;scale:.97"),
                     (m_on + 0.12, "opacity:1;translate:0 0;scale:1"), (m_off, "opacity:1;translate:0 0;scale:1"),
                     (m_off + 0.12, "opacity:0;translate:0 -4px;scale:.98")]))
add(kf("pl-h-hl", [(0, "top:4px"), (6.82, "top:4px"), (6.95, "top:36px")]))
# sheets: slide in over the list, slide out when added
for name, on, off in (("a", CLK["sec"] + 0.05, CLK["a-add"] + 0.06), ("b", CLK["head"] + 0.05, CLK["b-add"] + 0.06),
                      ("c", CLK["toggle"] + 0.05, CLK["r-stop"] + 0.06), ("r", CLK["c-motion"] + 0.05, CLK["r-stop"] + 0.06)):
    add(kf(f"pl-h-sheet-{name}", [(0, f"{SLIDE_IN};visibility:hidden"), (on, f"{SLIDE_IN};visibility:visible"),
                                  (on + 0.22, "translate:0 0;visibility:visible"), (off, "translate:0 0;visibility:visible"),
                                  (off + 0.22, f"{SLIDE_IN};visibility:visible"), (off + 0.23, f"{SLIDE_IN};visibility:hidden")]))
CHIP_OFF = "background:transparent;color:#6f6f78;box-shadow:none"
CHIP_ON = "background:#ffffff;color:#111113;box-shadow:0 0 0 1px rgba(17,17,19,.05),0 1px 3px rgba(0,0,0,.08)"
for name, t in (("a-colors", CLK["a-colors"]), ("a-layout", CLK["a-layout"]), ("b-fonts", CLK["b-fonts"]), ("c-motion", CLK["c-motion"])):
    add(kf(f"pl-h-{name}", [(0, f"{CHIP_OFF};scale:1"), (t, f"{CHIP_OFF};scale:1"), (t + 0.05, f"{CHIP_ON};scale:.94"),
                            (t + 0.15, f"{CHIP_ON};scale:1"), (END, CHIP_ON), (END + 0.01, CHIP_OFF)]))
    add(kf(f"pl-h-{name}-k", [(0, "width:0;opacity:0"), (t, "width:0;opacity:0"), (t + 0.12, "width:11px;opacity:1"), (END, "width:11px;opacity:1"), (END + 0.01, "width:0;opacity:0")]))
for name, t in (("a", CLK["a-colors"]), ("b", CLK["b-fonts"])):
    add(kf(f"pl-h-add-{name}", [(0, "opacity:.4"), (t, "opacity:.4"), (t + 0.1, "opacity:1"), (CLK[f"{name}-add"], "scale:1"),
                                (CLK[f"{name}-add"] + 0.04, "opacity:1;scale:.95"), (CLK[f"{name}-add"] + 0.14, "opacity:1;scale:1"), (END, "opacity:1"), (END + 0.01, "opacity:.4")]))
    add(kf(f"pl-h-need-{name}", [(0, "opacity:1"), (t, "opacity:1"), (t + 0.08, "opacity:0"), (END, "opacity:0"), (END + 0.01, "opacity:1")]))
caught = CLK["toggle2"] + 0.32
add(kf("pl-h-caught", [(0, "opacity:0;translate:0 4px"), (caught, "opacity:0;translate:0 4px"), (caught + 0.15, "opacity:1;translate:0 0")]))
add(kf("pl-h-cancel", [(0, "opacity:1"), (caught, "opacity:1"), (caught + 0.1, "opacity:0")]))
add(kf("pl-h-stop", [(0, "opacity:0;scale:1"), (caught, "opacity:0;scale:1"), (caught + 0.1, "opacity:1;scale:1"), (CLK["r-stop"], "scale:1"),
                     (CLK["r-stop"] + 0.04, "opacity:1;scale:.95"), (CLK["r-stop"] + 0.14, "opacity:1;scale:1")]))
add(kf("pl-h-dot", [(0, "opacity:1")] + [(t, "opacity:1" if i % 2 == 0 else "opacity:.25") for i, t in enumerate([4.9, 5.2, 5.5, 5.8, 6.1])]))
# copied
done = CLK["copy"] + 0.08
add(kf("pl-h-done", [(0, "opacity:0;translate:0 8px;scale:.98"), (done, "opacity:0;translate:0 8px;scale:.98"),
                     (done + 0.2, "opacity:1;translate:0 0;scale:1"), (END, "opacity:1;translate:0 0;scale:1"), (END + 0.3, "opacity:0;translate:0 0;scale:1")]))
add(kf("pl-h-badge", [(0, "transform:scale(.4);opacity:0"), (done + 0.1, "transform:scale(.4);opacity:0"),
                      (done + 0.22, "transform:scale(1.12);opacity:1"), (done + 0.32, "transform:none;opacity:1"), (END, "transform:none;opacity:1"), (END + 0.3, "opacity:0")]))

# ---------------------------------------------------------------- the AI app (a code editor with an agent chat)
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
    else:
        steps += [(END, "opacity:1;translate:0 0;max-height:220px"), (END + 0.3, "opacity:0;translate:0 0;max-height:220px")]
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
                                (t + 0.6, "max-height:17px;opacity:1;background:rgba(110,190,110,.16)"),
                                (END, "max-height:17px;opacity:1"), (END + 0.3, "max-height:0;opacity:0")]))
add(kf("pl-h-del", [(0, "max-height:17px;opacity:1;background:transparent"), (edit, "max-height:17px;background:transparent"), (edit + 0.1, "max-height:17px;opacity:1;background:rgba(230,90,90,.3)"),
                    (edit + 0.55, "max-height:17px;opacity:1"), (edit + 0.75, "max-height:0;opacity:0"),
                    (END, "max-height:0;opacity:0;background:transparent"), (END + 0.3, "max-height:17px;opacity:1;background:transparent")]))
edited = edit + 0.1 + ADDS * 0.12 + 0.1
add(kf("pl-h-spin", [(0, "opacity:1"), (edited, "opacity:1"), (edited + 0.05, "opacity:0"), (END, "opacity:0"), (END + 0.3, "opacity:1")]))
add(kf("pl-h-tick", [(0, "opacity:0"), (edited, "opacity:0"), (edited + 0.1, "opacity:1"), (END, "opacity:1"), (END + 0.3, "opacity:0")]))
add(kf("pl-h-dirty", [(0, "opacity:0"), (edit + 0.1, "opacity:0"), (edit + 0.2, "opacity:1"), (END, "opacity:1"), (END + 0.3, "opacity:0")]))
res = edited + 0.25
pop("pl-h-reply", res)
for i in range(3):
    t = res + 0.25 + i * 0.12
    add(kf(f"pl-h-new{i + 1}", [(0, "opacity:0;translate:0 8px;scale:.9"), (t, "opacity:0;translate:0 8px;scale:.9"),
                                (t + 0.18, "opacity:1;translate:0 -2px;scale:1.02"), (t + 0.28, "opacity:1;translate:0 0;scale:1"),
                                (END, "opacity:1;translate:0 0;scale:1"), (END + 0.3, "opacity:0;translate:0 0;scale:1")]))
assert res + 1.2 < END, "the loop ends before the result has been seen"

KEYFRAMES = "\n".join(CSS)

STYLE = r"""
/* hero demo css start */
/* ---------- the first app view (hero demo): three picks, the AI app switch, copy, paste, the result; a 14.5-second loop ---------- */
/* Generated by patches/round_nov22a.py: change timings there and run it again. */
.pl-h{--pl-dir:1}
[dir="rtl"] .pl-h{--pl-dir:-1}
.pl-h *{animation-duration:14.5s;animation-iteration-count:infinite;animation-timing-function:cubic-bezier(.4,0,.2,1);animation-fill-mode:both}
.pl-h-win{position:relative;max-width:1080px;margin:0 auto;display:flex;flex-direction:column;border-radius:var(--pl-radius-card);background:var(--pl-bg);box-shadow:0 1px 2px rgba(21,21,21,.06),0 16px 40px -12px rgba(21,21,21,.22);overflow:hidden}
.pl-h-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 12px;min-height:40px;border-bottom:1px solid var(--pl-line);font-size:12px;color:#55554f}
.pl-h-dots{display:flex;gap:6px}.pl-h-dots i{width:8px;height:8px;border-radius:50%;background:rgba(21,21,21,.18)}
.pl-h-body{position:relative;display:flex;
  /* the pointer's targets; the script below measures the real ones */
  --pl-x-start:62%;--pl-y-start:105%;--pl-x-sec:18%;--pl-y-sec:300px;--pl-x-head:22%;--pl-y-head:92px;--pl-x-toggle:120px;--pl-y-toggle:148px;
  --pl-x-a-colors:calc(100% - 275px);--pl-y-a-colors:196px;--pl-x-a-layout:calc(100% - 115px);--pl-y-a-layout:196px;--pl-x-a-add:calc(100% - 90px);--pl-y-a-add:422px;
  --pl-x-b-fonts:calc(100% - 195px);--pl-y-b-fonts:196px;--pl-x-b-add:calc(100% - 90px);--pl-y-b-add:422px;--pl-x-c-motion:calc(100% - 45px);--pl-y-c-motion:196px;
  --pl-x-r-stop:calc(100% - 90px);--pl-y-r-stop:422px;--pl-x-app:calc(100% - 230px);--pl-y-app:34px;--pl-x-menu-cursor:calc(100% - 120px);--pl-y-menu-cursor:96px;
  --pl-x-copy:calc(100% - 110px);--pl-y-copy:422px}
/* the made-up site */
.pl-h-site{position:relative;overflow:hidden;flex:1 1 auto;min-width:0;padding:16px 24px 18px;display:flex;flex-direction:column;gap:11px;background:#f8f4ec;font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#2a2926}
.pl-h-nav{display:flex;justify-content:space-between;align-items:center}
.pl-h-brand{display:inline-flex;align-items:center;gap:6px;font-family:Georgia,'Times New Roman',serif;font-size:16px;font-weight:700;letter-spacing:-.01em}
.pl-h-brand i{position:relative;width:16px;height:16px;border-radius:4px;background:linear-gradient(135deg,#e0835a,#c8603a);box-shadow:inset 0 -3px 0 rgba(0,0,0,.12)}
.pl-h-brand i::after{content:"";position:absolute;inset:3px 4px 4px 7px;border-radius:1px;background:#fbe9dc}
/* the made-up site: drifting warm color behind everything */
.pl-h-site > *{position:relative;z-index:1}
.pl-h-site > .pl-h-blob{position:absolute;z-index:0;border-radius:50%;filter:blur(28px);pointer-events:none}
.pl-h-blob1{width:260px;height:200px;top:-70px;inset-inline-end:-40px;background:rgba(232,140,98,.38);animation-name:pl-h-blob1}
.pl-h-blob2{width:240px;height:180px;bottom:-60px;inset-inline-start:-50px;background:rgba(160,186,120,.42);animation-name:pl-h-blob2}
.pl-h-blob3{width:160px;height:140px;top:90px;inset-inline-start:42%;background:rgba(196,172,232,.32);animation-name:pl-h-blob3}
@keyframes pl-h-blob1{0%,100%{translate:0 0;scale:1}50%{translate:-36px 22px;scale:1.15}}
@keyframes pl-h-blob2{0%,100%{translate:0 0;scale:1}50%{translate:40px -18px;scale:1.1}}
@keyframes pl-h-blob3{0%,100%{translate:0 0}50%{translate:-30px 30px}}
.pl-h-newpill{align-self:flex-start;display:inline-flex;align-items:center;gap:6px;padding:3px 9px 3px 3px;border-radius:999px;background:rgba(255,255,255,.75);box-shadow:0 0 0 1px rgba(42,41,38,.08);font-size:10.5px;color:#4a463f;margin-bottom:-4px}
.pl-h-newpill b{padding:2px 7px;border-radius:999px;background:#2a2926;color:#f8f4ec;font-size:9.5px;font-weight:600}
.pl-h-ico{display:grid;place-items:center;width:26px;height:26px;border-radius:8px;margin-bottom:2px}
.pl-h-ico svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.pl-h-ico.sage{background:#e6eddb;color:#56702f}.pl-h-ico.terra{background:#e0835a;color:#2a2926}.pl-h-ico.lilac{background:#ebe6f6;color:#6a59a8}
.pl-h-pricebox{position:relative;display:grid;overflow:hidden;height:28px}
.pl-h-pricebox > span{grid-area:1/1}
.pl-h-pm{animation-name:pl-h-pm}.pl-h-py{animation-name:pl-h-py;opacity:0}
.pl-h-proof{display:flex;align-items:center;gap:10px;font-size:10.5px;color:#6b665d}
.pl-h-avs{display:flex}.pl-h-avs i{width:20px;height:20px;border-radius:50%;box-shadow:0 0 0 2px #f8f4ec;margin-inline-start:-6px}.pl-h-avs i:first-child{margin-inline-start:0}
.pl-h-avs i:nth-child(1){background:linear-gradient(135deg,#f3b58f,#d9744b)}.pl-h-avs i:nth-child(2){background:linear-gradient(135deg,#b9d3a0,#6f8f4d)}.pl-h-avs i:nth-child(3){background:linear-gradient(135deg,#cdbff0,#7b68c2)}.pl-h-avs i:nth-child(4){background:linear-gradient(135deg,#f0d78a,#c99a2e)}
.pl-h-stars{display:flex;gap:1px;color:#e0a03a}.pl-h-stars svg{width:11px;height:11px;fill:currentColor}
.pl-h-pick{position:relative}
.pl-h-out{position:absolute;inset:-6px;border-radius:10px;border:2px dashed var(--pl-accent-ink);background:rgba(185,217,106,.10);opacity:0;pointer-events:none}
.pl-h-out i{position:absolute;top:-9px;inset-inline-start:-9px;display:grid;place-items:center;width:18px;height:18px;border-radius:6px;background:var(--pl-accent-ink);color:#fff;font:600 10px/1 Inter,sans-serif;font-style:normal;transform:scale(0)}
.pl-h-out1{animation-name:pl-h-out1}.pl-h-out1 i{animation-name:pl-h-num1}
.pl-h-out2{animation-name:pl-h-out2}.pl-h-out2 i{animation-name:pl-h-num2}
.pl-h-out3{animation-name:pl-h-out3}.pl-h-out3 i{animation-name:pl-h-num3}
.pl-h-head{display:flex;flex-direction:column;gap:4px;align-self:flex-start;margin-top:4px}
.pl-h-h1{font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.15;letter-spacing:-.02em}
.pl-h-lead{font-size:11.5px;color:#6b665d}
.pl-h-toggle{align-self:flex-start;display:grid;grid-template-columns:1fr 1fr;padding:3px;border-radius:999px;background:#ebe7df;font-size:11px;font-weight:600}
.pl-h-toggle > .pl-h-m,.pl-h-toggle > .pl-h-y{position:relative;z-index:1;padding:5px 12px;text-align:center;white-space:nowrap}
.pl-h-toggle b{font-weight:600;color:#c06a43}
.pl-h-m{animation-name:pl-h-m}.pl-h-y{animation-name:pl-h-y}
.pl-h-knob{position:absolute;z-index:0;top:3px;bottom:3px;width:calc(50% - 4px);border-radius:999px;background:#ffffff;box-shadow:0 1px 2px rgba(0,0,0,.12);animation-name:pl-h-knob}
.pl-h-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.pl-h-card{border-radius:12px;background:rgba(255,255,255,.88);box-shadow:0 0 0 1px #ebe5da,0 6px 16px -10px rgba(42,41,38,.25);padding:12px 14px 14px;display:flex;flex-direction:column;gap:5px}
.pl-h-card.dark{background:linear-gradient(160deg,#3a2f29,#221f1c 70%);color:#f7f6f2;box-shadow:0 14px 30px -12px rgba(224,131,90,.55),0 0 0 1px rgba(224,131,90,.35);transform:translateY(-6px)}
.pl-h-tier{font-size:11px;font-weight:600;color:#6b665d}.dark .pl-h-tier{color:#c9c3b8}
.pl-h-tier em{margin-inline-start:4px;padding:2px 6px;border-radius:999px;background:#e0835a;color:#2a2926;font-size:9px;font-style:normal}
.pl-h-price{font-family:Georgia,serif;font-size:22px}.pl-h-price small{font-family:Inter,sans-serif;font-size:10px;color:#8a857b}.dark .pl-h-price small{color:#a59f94}
.pl-h-feat{font-size:10.5px;line-height:1.5;color:#6b665d}.dark .pl-h-feat{color:#c9c3b8}
.pl-h-cta{margin-top:6px;text-align:center;padding:6px 0;border-radius:999px;background:#ebe7df;font-size:11px;font-weight:600}.dark .pl-h-cta{background:#e0835a;color:#2a2926}
.pl-h-fine{font-size:10.5px;color:#8a857b}
/* the Huescribe panel */
.pl-h-panel{width:340px;flex:none;position:relative;border-inline-start:1px solid rgba(17,17,19,.08);background:#fbfbfa;font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#111113;letter-spacing:-.003em}
.pl-h-stack{position:relative;height:446px;overflow:hidden}
.pl-h-layer{position:absolute;inset:0;display:flex;flex-direction:column;background:#fbfbfa}
.pl-h-top{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid rgba(17,17,19,.07)}
.pl-h-top svg.back{flex:none}
.pl-h-title{display:flex;flex-direction:column;min-width:0;flex:1}
.pl-h-title b{font-size:13px;font-weight:600;letter-spacing:-.015em}
.pl-h-title > span{font-size:10.5px;color:#6f6f78;white-space:nowrap}
.pl-h-app{position:relative;display:inline-grid;color:var(--pl-accent-ink)}
.pl-h-app > span{grid-area:1/1}
.pl-h-app1{animation-name:pl-h-app1}.pl-h-app2{animation-name:pl-h-app2;opacity:0}
.pl-h-more{width:24px;text-align:center;color:#6f6f78;font-size:14px}
.pl-h-main{padding:12px;display:flex;flex-direction:column;gap:10px;flex:1;min-height:0}
.pl-h-tip{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;background:#f4f4f3;box-shadow:inset 0 0 0 1px rgba(231,231,229,.7);font-size:10.5px;color:#6f6f78}
.pl-h-tip b{color:#111113;font-weight:600}
.pl-h-gdot{width:6px;height:6px;border-radius:50%;background:#16a34a;flex:none}
.pl-h-empty{display:flex;flex-direction:column;align-items:center;gap:4px;padding:28px 8px 8px;text-align:center;animation-name:pl-h-empty}
.pl-h-empty b{font-size:12.5px;font-weight:650}.pl-h-empty span{font-size:10.5px;line-height:1.5;color:#6f6f78;max-width:220px}
.pl-h-rows{position:absolute;inset-inline:12px;top:62px;display:flex;flex-direction:column;gap:8px}
.pl-h-row{box-sizing:border-box;display:flex;align-items:center;gap:8px;padding:9px 10px;border-radius:12px;background:#ffffff;box-shadow:0 0 0 1px rgba(17,17,19,.06),0 1px 2px rgba(17,17,19,.04);overflow:hidden;opacity:0}
.pl-h-row1{animation-name:pl-h-row1}.pl-h-row2{animation-name:pl-h-row2}.pl-h-row3{animation-name:pl-h-row3}
.pl-h-n{display:grid;place-items:center;width:18px;height:18px;flex:none;border-radius:5px;background:#f4f4f3;font-size:9.5px;font-weight:650;color:#6f6f78}
.pl-h-thumb{width:40px;height:26px;flex:none;border-radius:5px;background:#f7f6f2;box-shadow:inset 0 0 0 1px rgba(231,231,229,.9);display:grid;place-items:center;font:700 11px/1 Georgia,serif;color:#2a2926;overflow:hidden}
.pl-h-thumb.cards{grid-template-columns:repeat(3,1fr);gap:2px;padding:4px;box-sizing:border-box}
.pl-h-thumb i,.pl-h-prev i{display:block}
.pl-h-thumb.cards,.pl-h-prev.cards{place-items:stretch}
.pl-h-thumb.cards i{height:100%;border-radius:2px;background:#fff;box-shadow:0 0 0 1px #e8e4dc}.pl-h-thumb.cards i:nth-child(2){background:#2a2926;box-shadow:none}
.pl-h-thumb.sw i{width:26px;height:10px;border-radius:999px;background:#ebe7df;position:relative}.pl-h-thumb.sw i::after{content:"";position:absolute;inset-inline-end:2px;top:2px;width:11px;height:6px;border-radius:999px;background:#fff}
.pl-h-rowtxt{display:flex;flex-direction:column;min-width:0;flex:1}
.pl-h-rowtxt b{font-size:11.5px;font-weight:600;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pl-h-rowtxt span{font-size:10px;color:#6f6f78;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pl-h-tray{padding:10px 12px;border-top:1px solid rgba(17,17,19,.07);display:flex;align-items:center;justify-content:flex-end;gap:8px}
.pl-h-btn{position:relative;display:grid;place-items:center;min-height:36px;padding:0 14px;border-radius:9px;background:#18181b;color:#ffffff;font-size:12px;font-weight:550;box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 1px 2px rgba(0,0,0,.2);white-space:nowrap}
.pl-h-btn > span{grid-area:1/1}
.pl-h-btn.ghost{background:#ffffff;color:#111113;box-shadow:inset 0 0 0 1px #e7e7e5}
.pl-h-copybtn{min-width:180px;animation-name:pl-h-copybtn}
.pl-h-copy0{animation-name:pl-h-copy0}.pl-h-copy1{animation-name:pl-h-copy1;opacity:0}.pl-h-copy2{animation-name:pl-h-copy2;opacity:0}.pl-h-copy3{animation-name:pl-h-copy3;opacity:0}
.pl-h-list{animation-name:pl-h-list}
/* AI app menu */
.pl-h-menu{position:absolute;z-index:3;top:44px;inset-inline-start:52px;width:170px;padding:4px;border-radius:10px;background:#ffffff;box-shadow:0 0 0 1px rgba(17,17,19,.08),0 12px 28px -8px rgba(17,17,19,.25);font-size:11.5px;opacity:0;transform-origin:top;animation-name:pl-h-menu}
.pl-h-menu > span{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;height:32px;padding:0 10px}
.pl-h-menu svg{color:var(--pl-accent-ink)}
.pl-h-hl{position:absolute;z-index:0;inset-inline:4px;top:4px;height:32px;border-radius:7px;background:#f4f4f3;animation-name:pl-h-hl}
/* sheets */
.pl-h-sheet{z-index:2;translate:calc(var(--pl-dir) * 100%) 0;visibility:hidden;box-shadow:-12px 0 24px -16px rgba(17,17,19,.25)}
.pl-h-sheet-a{animation-name:pl-h-sheet-a}.pl-h-sheet-b{animation-name:pl-h-sheet-b}.pl-h-sheet-c{animation-name:pl-h-sheet-c}.pl-h-sheet-r{z-index:3;animation-name:pl-h-sheet-r}
.pl-h-prev{display:grid;place-items:center;height:64px;border-radius:8px;background:#f7f6f2;box-shadow:inset 0 0 0 1px rgba(231,231,229,.7);overflow:hidden}
.pl-h-prev.cards{grid-template-columns:repeat(3,1fr);gap:5px;padding:8px;box-sizing:border-box}
.pl-h-prev.cards i{height:100%;border-radius:4px;background:#fff;box-shadow:0 0 0 1px #e8e4dc}.pl-h-prev.cards i:nth-child(2){background:#2a2926;box-shadow:none}
.pl-h-prev.text span{font-family:Georgia,serif;font-size:17px;letter-spacing:-.02em;color:#2a2926}
.pl-h-prev.sw i{width:110px;height:26px;border-radius:999px;background:#ebe7df;position:relative}.pl-h-prev.sw i::after{content:"";position:absolute;inset-inline-start:3px;top:3px;width:52px;height:20px;border-radius:999px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.12)}
.pl-h-name{font-size:12.5px;font-weight:600;letter-spacing:-.01em}
.pl-h-chips{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:3px;padding:3px;border-radius:9px;background:#f4f4f3;box-shadow:inset 0 0 0 1px rgba(231,231,229,.7)}
.pl-h-chips > span{display:flex;align-items:center;justify-content:center;gap:2px;min-height:34px;border-radius:7px;font-size:11px;font-weight:550;color:#6f6f78;white-space:nowrap}
.pl-h-chips svg{flex:none;width:0;opacity:0;color:var(--pl-accent-ink)}
.pl-h-a-colors{animation-name:pl-h-a-colors}.pl-h-a-colors svg{animation-name:pl-h-a-colors-k}
.pl-h-a-layout{animation-name:pl-h-a-layout}.pl-h-a-layout svg{animation-name:pl-h-a-layout-k}
.pl-h-b-fonts{animation-name:pl-h-b-fonts}.pl-h-b-fonts svg{animation-name:pl-h-b-fonts-k}
.pl-h-c-motion{animation-name:pl-h-c-motion}.pl-h-c-motion svg{animation-name:pl-h-c-motion-k}
.pl-h-hint{display:flex;align-items:center;gap:6px;font-size:11px;color:#6f6f78}
.pl-h-need{flex:1;font-size:10.5px;color:#6f6f78}
.pl-h-need-a{animation-name:pl-h-need-a}.pl-h-need-b{animation-name:pl-h-need-b}
.pl-h-add-a{animation-name:pl-h-add-a}.pl-h-add-b{animation-name:pl-h-add-b}
/* recording */
.pl-h-rec{display:flex;align-items:center;gap:8px;padding:10px;border-radius:10px;background:#fef2f2;box-shadow:inset 0 0 0 1px #fecaca;font-size:11.5px}
.pl-h-rec i{width:8px;height:8px;border-radius:50%;background:#dc2626;flex:none;animation-name:pl-h-dot}
.pl-h-caught{display:flex;flex-direction:column;gap:6px;opacity:0;animation-name:pl-h-caught}
.pl-h-caught > span{font-size:10.5px;color:#6f6f78}
.pl-h-caught > b{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;background:#ffffff;box-shadow:0 0 0 1px rgba(17,17,19,.06);font-size:11px;font-weight:550}
.pl-h-cancel{animation-name:pl-h-cancel}.pl-h-stop{animation-name:pl-h-stop;opacity:0}
/* copied */
.pl-h-done{z-index:2;opacity:0;animation-name:pl-h-done}
.pl-h-card2{display:grid;grid-template-columns:auto 1fr;gap:6px 10px;padding:12px;border-radius:12px;background:#ffffff;box-shadow:0 0 0 1px rgba(17,17,19,.05),0 2px 4px rgba(17,17,19,.04),0 8px 20px -6px rgba(17,17,19,.08)}
.pl-h-badge{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:#16a34a;color:#ffffff;animation-name:pl-h-badge}
.pl-h-card2 ol{grid-column:1/-1;margin:2px 0 0;padding:8px 10px;padding-inline-start:26px;border-radius:8px;background:#f4f4f3;display:flex;flex-direction:column;gap:4px;font-size:11px}
.pl-h-k{margin-inline-end:2px;display:inline-grid;place-items:center;min-width:16px;height:16px;padding:0 4px;font-size:9.5px;font-weight:600;color:#111113;background:#ffffff;border:1px solid #e7e7e5;border-bottom-width:2px;border-radius:4px;box-sizing:border-box}
/* pointer */
.pl-h-cur{position:absolute;z-index:5;width:22px;height:22px;pointer-events:none;transform-origin:3px 3px;opacity:0;animation-name:pl-h-cur;animation-timing-function:cubic-bezier(.45,0,.2,1)}
.pl-h-cur span{position:absolute;left:-9px;top:-9px;width:22px;height:22px;border-radius:50%;background:var(--pl-accent);opacity:0;animation-name:pl-h-ring}
/* the AI app: a dark code editor (files, the stylesheet, an agent chat) */
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
.pl-h-in{width:2ch;flex:none}
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
@media (max-width:900px){
.pl-h-cur{display:none}
.pl-h-cards{grid-template-columns:minmax(0,1fr)}
.pl-h-panel{width:44%}
.pl-h-chips{grid-template-columns:repeat(2,minmax(0,1fr))}
.pl-h-copybtn{min-width:0}
.pl-h-aiwrap{position:relative;inset:auto;width:100%;max-width:none;margin-top:16px}
.pl-h-ai{animation:none;opacity:1}
.pl-h-ed{display:none}.pl-h-chat{flex:1;width:auto;border:0}
}
@media (max-width:640px){
.pl-h-body{flex-direction:column}
.pl-h-panel{width:100%;border-inline-start:0;border-top:1px solid rgba(17,17,19,.08)}
.pl-h-chips{grid-template-columns:repeat(4,minmax(0,1fr))}
}
@media (prefers-reduced-motion:reduce){
.pl-h *{animation:none !important}
.pl-h-cur,.pl-h-list,.pl-h-sheet{display:none}
.pl-h-out{opacity:1;border-style:solid}.pl-h-out i{transform:none}
.pl-h-done,.pl-h-ai,.pl-h-result,.pl-h-new > span{opacity:1}
.pl-h-msgs > div:not(.pl-h-think),.pl-h-src .add{opacity:1;max-height:none}.pl-h-src .del,.pl-h-step2 .spin,.pl-h-pasted{display:none}.pl-h-step2 .ok{opacity:1}
.pl-h-knob{inset-inline-start:calc(50% + 1px)}
.pl-h-app1{opacity:0}.pl-h-app2{opacity:1}
.pl-h-pm{opacity:0}.pl-h-py{opacity:1}
}
""" + KEYFRAMES + "\n/* hero demo css end */\n"

CHECK = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>'
BACK = '<svg class="back" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111113" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 18l-6-6 6-6"></path></svg>'
POINTER = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 2l15 8.5-6.5 1.6L9.6 19z"></path></svg>'
LOGO = re.search(r'<span aria-hidden="true" style="display: grid; place-items: center; width: 22px; height: 22px; border-radius: 6px; background: #b9d96a; color: #151515">.*?</svg></span>', s, re.S).group(0)
DOTS = '<span class="pl-h-dots" aria-hidden="true"><i></i><i></i><i></i></span>'


def top(title, back=False, app=True):
    sub = ('<span>fieldnote.app · <span class="pl-h-app"><span class="pl-h-app1">Claude Code ⌄</span><span class="pl-h-app2">Cursor ⌄</span></span></span>'
           if app else '<span>fieldnote.app · <span class="pl-h-app"><span>Claude Code ⌄</span></span></span>')
    return (f'<div class="pl-h-top">{BACK if back else ""}{LOGO}<span class="pl-h-title"><b>{title}</b>{sub}</span>'
            '<span class="pl-h-more" aria-hidden="true">⋯</span></div>')


def chips(on, key):
    out = []
    for label, cls in (("Colors", "colors"), ("Fonts", "fonts"), ("Layout", "layout"), ("Motion", "motion")):
        c = f' class="pl-h-{key}-{cls}"' if cls in on else ""
        t = f' data-pl-t="{key}-{cls}"' if cls in on else ""
        out.append(f'<span{c}{t}>{CHECK}<span>{label}</span></span>')
    return '<div class="pl-h-chips">' + "".join(out) + "</div>"


def sheet(key, prev, name, on, need_cls):
    return (f'<div class="pl-h-layer pl-h-sheet pl-h-sheet-{key}">' + top("What do you want from it?", back=True, app=False)
            + f'<div class="pl-h-main">{prev}<b class="pl-h-name">{name}</b>{chips(on, key)}'
            + f'<span class="pl-h-hint">{POINTER}<span>Single parts instead (its gradient, hovers…)</span></span></div>'
            + f'<div class="pl-h-tray"><span class="pl-h-need {need_cls}">Turn on at least one</span>'
            + (f'<span class="pl-h-btn pl-h-add-{key}" data-pl-t="{key}-add"><span>Add to my list</span></span>' if need_cls else
               '<span class="pl-h-btn" style="opacity:.4"><span>Add to my list</span></span>')
            + '</div></div>')


def row(n, thumb, title, sub):
    return (f'<div class="pl-h-row pl-h-row{n}"><span class="pl-h-n">{n}</span>{thumb}'
            f'<span class="pl-h-rowtxt"><b>{title}</b><span>{sub}</span></span><span class="pl-h-more" aria-hidden="true">⋯</span></div>')


FEATHER = '<path d="M12.67 19a2 2 0 0 0 1.42-.59l6.15-6.17a6 6 0 0 0-8.49-8.49L5.59 9.91A2 2 0 0 0 5 11.33V18a1 1 0 0 0 1 1z"/><path d="M16 8 2 22"/><path d="M17.5 15H9"/>'
STAR = '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>'
USERS = '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'


def ICO(tone, path):
    return f'<span class="pl-h-ico {tone}" aria-hidden="true"><svg viewBox="0 0 24 24">{path}</svg></span>'


def PRICE(p, per):
    return f'<span class="pl-h-pricebox"><span class="pl-h-price">{p}<small> / {per}</small></span></span>'


def PRICES(m, y, per):
    return (f'<span class="pl-h-pricebox"><span class="pl-h-price pl-h-pm">{m}<small> / {per}</small></span>'
            f'<span class="pl-h-price pl-h-py">{y}<small> / {per}</small></span></span>')


CARD = ('<div class="pl-h-card{d}">{ico}<span class="pl-h-tier">{tier}</span>{pricebox}'
        '<span class="pl-h-feat">{feat}</span><span class="pl-h-cta">{cta}</span></div>')
cards = "".join(CARD.format(**c) for c in (
    dict(d="", ico=ICO("sage", FEATHER), tier="Starter", pricebox=PRICE("$0", "month"), feat="100 notes<br>Sync on 2 devices", cta="Get started"),
    dict(d=" dark", ico=ICO("terra", STAR), tier='Pro <em>Most popular</em>', pricebox=PRICES("$8", "$6", "month"), feat="Unlimited notes<br>Offline and search", cta="Try Pro free"),
    dict(d="", ico=ICO("lilac", USERS), tier="Team", pricebox=PRICES("$14", "$11", "seat"), feat="Shared notebooks<br>Admin controls", cta="Contact sales")))

HTML = f'''<!-- hero demo start -->
<div id="demo" class="pl-anim pl-h" role="img" aria-label="Animation: someone picks three things on a pricing page with Huescribe (the pricing cards for their colors and layout, the headline for its fonts, and the Monthly/Yearly switch, whose movement it records), switches the AI app to Cursor, copies the prompt and pastes it into Cursor, which updates their own pricing page." style="margin-top: 56px; width: 100%; position: relative; min-height: 720px; border-radius: var(--pl-radius-sm); overflow: hidden; box-sizing: border-box; padding: 48px 24px">
<h2 class="pl-sr-only">Huescribe in use</h2>
<span class="pl-pausehint" aria-hidden="true" style="position: absolute; top: 14px; right: 16px; z-index: 7; padding: 4px 10px; border-radius: 999px; background: rgba(255,255,255,0.85); box-shadow: 0 0 0 1px rgba(21,21,21,0.08); font-size: 11px; font-weight: 500; color: #55554f"><span class="pl-pause-off">Hover to pause</span><span class="pl-pause-on">Paused</span></span>

<!-- Window 1: a site you like, with the Huescribe panel -->
<div class="pl-h-win">
<div class="pl-h-bar">{DOTS}<span>fieldnote.app/pricing</span><span style="width: 42px"></span></div>
<div class="pl-h-body">
<!-- the site -->
<div class="pl-h-site">
<div class="pl-h-nav"><span class="pl-h-brand"><i aria-hidden="true"></i>Fieldnote</span>
<span class="pl-fn-nav" style="display: flex; align-items: center; gap: 14px; font-size: 11px; color: #6b665d">Features<span>Pricing</span><span>Blog</span><span style="padding: 5px 10px; border-radius: 999px; background: #2a2926; color: #f7f6f2">Sign in</span></span></div>
<span class="pl-h-blob pl-h-blob1" aria-hidden="true"></span><span class="pl-h-blob pl-h-blob2" aria-hidden="true"></span><span class="pl-h-blob pl-h-blob3" aria-hidden="true"></span>
<span class="pl-h-newpill"><b>New</b>Offline mode is here →</span>
<div class="pl-h-pick pl-h-head" data-pl-t="head"><span class="pl-h-h1">Simple plans for every notebook.</span><span class="pl-h-lead">Start free. Upgrade when your notes outgrow you.</span><span class="pl-h-out pl-h-out2" aria-hidden="true"><i>2</i></span></div>
<div class="pl-h-pick pl-h-toggle" data-pl-t="toggle"><span class="pl-h-knob" aria-hidden="true"></span><span class="pl-h-m">Monthly</span><span class="pl-h-y">Yearly <b>−20%</b></span><span class="pl-h-out pl-h-out3" aria-hidden="true" style="z-index: 2"><i>3</i></span></div>
<div class="pl-h-pick" data-pl-t="sec"><div class="pl-h-cards">{cards}</div><span class="pl-h-out pl-h-out1" aria-hidden="true"><i>1</i></span></div>
<div class="pl-h-proof"><span class="pl-h-avs" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="pl-h-stars" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/></svg><svg viewBox="0 0 24 24"><path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/></svg><svg viewBox="0 0 24 24"><path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/></svg><svg viewBox="0 0 24 24"><path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/></svg><svg viewBox="0 0 24 24"><path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/></svg></span><span>Loved by 40,000 writers</span></div>
</div>

<!-- the Huescribe panel: the same screens as the extension -->
<div class="pl-panel pl-h-panel"><div class="pl-h-stack">
<div class="pl-h-layer pl-h-list">{top("My list")}
<div class="pl-h-main"><div class="pl-h-tip"><span class="pl-h-gdot"></span><span><b>Click anything</b> on the page</span></div>
<div class="pl-h-empty"><b>Your list is empty</b><span>Nothing here yet. Click something you like on the page and it shows up here.</span></div>
<div class="pl-h-rows">
{row(1, '<span class="pl-h-thumb cards" aria-hidden="true"><i></i><i></i><i></i></span>', "Section: pricing cards", "Colors · Layout")}
{row(2, '<span class="pl-h-thumb" aria-hidden="true">Aa</span>', "Heading: Simple plans…", "Fonts")}
{row(3, '<span class="pl-h-thumb sw" aria-hidden="true"><i></i></span>', "Switch: Monthly / Yearly", "Motion · On click")}
</div></div>
<div class="pl-h-tray"><span class="pl-h-btn pl-h-copybtn" data-pl-t="copy"><span class="pl-h-copy0">Copy prompt</span><span class="pl-h-copy1">Copy prompt (1 part)</span><span class="pl-h-copy2">Copy prompt (2 parts)</span><span class="pl-h-copy3">Copy prompt (3 parts)</span></span></div>
<span class="pl-h-app-t" data-pl-t="app" style="position: absolute; top: 28px; inset-inline-start: 52px; width: 90px; height: 14px"></span>
<div class="pl-h-menu" aria-hidden="true"><i class="pl-h-hl"></i><span>Claude Code {CHECK}</span><span data-pl-t="menu-cursor">Cursor</span><span>Lovable</span><span>v0</span><span>ChatGPT</span></div>
</div>
{sheet("a", '<span class="pl-h-prev cards" aria-hidden="true"><i></i><i></i><i></i></span>', "Section: pricing cards (3 cards)", ("colors", "layout"), "pl-h-need-a")}
{sheet("b", '<span class="pl-h-prev text" aria-hidden="true"><span>Simple plans for every notebook.</span></span>', "Heading: Simple plans for every notebook.", ("fonts",), "pl-h-need-b")}
<div class="pl-h-layer pl-h-sheet pl-h-sheet-c">{top("What do you want from it?", back=True, app=False)}
<div class="pl-h-main"><span class="pl-h-prev sw" aria-hidden="true"><i></i></span><b class="pl-h-name">Switch: Monthly / Yearly</b>{chips(("motion",), "c")}
<span class="pl-h-hint">{POINTER}<span>Single parts instead (its gradient, hovers…)</span></span></div>
<div class="pl-h-tray"><span class="pl-h-need">Turn on at least one</span><span class="pl-h-btn" style="opacity: .4"><span>Add to my list</span></span></div></div>
<div class="pl-h-layer pl-h-sheet pl-h-sheet-r">{top("Recording", back=True, app=False)}
<div class="pl-h-main"><div class="pl-h-rec"><i aria-hidden="true"></i><b>Press it on the page</b></div>
<div class="pl-h-caught"><span>1 movement caught</span><b><span class="pl-h-thumb sw" aria-hidden="true"><i></i></span>Slide · On click</b></div></div>
<div class="pl-h-tray"><span class="pl-h-btn ghost pl-h-cancel"><span>Cancel</span></span><span class="pl-h-btn pl-h-stop" data-pl-t="r-stop" style="position: absolute; inset-inline-end: 12px"><span>Stop</span></span></div></div>
<div class="pl-h-layer pl-h-done">{top("My list")}
<div class="pl-h-main"><div class="pl-h-card2">
<span class="pl-h-badge"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg></span>
<span style="display: flex; flex-direction: column; justify-content: center"><b style="font-size: 13px; font-weight: 650">Copied to your clipboard</b><span style="font-size: 10px; color: #6f6f78">3 parts · 6,240 characters</span></span>
<ol><li>Open Cursor</li><li>Paste: <span class="pl-h-k">⌘</span><span class="pl-h-k">V</span> and send</li></ol>
<span style="grid-column: 1 / -1; padding-top: 6px; border-top: 1px solid rgba(231,231,229,0.7); font-size: 10px; color: #6f6f78">Your list is empty again, ready for the next idea.</span>
<span style="grid-column: 1 / -1; display: flex; gap: 6px"><span style="padding: 6px 10px; border-radius: 8px; background: #ffffff; box-shadow: inset 0 0 0 1px #e7e7e5; font-size: 11px">Copy again</span><span style="padding: 6px 10px; border-radius: 8px; background: #ffffff; box-shadow: inset 0 0 0 1px #e7e7e5; font-size: 11px">Undo</span></span>
</div><div class="pl-h-tip"><span class="pl-h-gdot"></span><span><b>Click anything</b> on the page</span></div></div>
</div>
</div></div>

<!-- the pointer -->
<div class="pl-h-cur" aria-hidden="true"><span></span><svg width="22" height="22" viewBox="0 0 24 24" style="position: relative; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.3))"><path d="M4 2l15 8.5-6.5 1.6L9.6 19z" fill="#151515" stroke="#fcfcfc" stroke-width="1.5" stroke-linejoin="round"></path></svg></div>
</div>
</div>

<!-- Window 2: the AI app (a code editor with an agent chat; its own chrome stays in English, translate="no") -->
<div class="pl-ai-wrap pl-h-aiwrap"><div class="pl-h-ai" dir="ltr">
<div class="pl-h-aibar">{DOTS}<span translate="no">my-site — Cursor</span><span style="width: 42px"></span></div>
<div class="pl-h-ide">
<div class="pl-h-files" translate="no" aria-hidden="true"><b>MY-SITE</b><span class=""><i style="background:#e8875a"></i>index.html</span><span class=""><i style="background:#e8875a"></i>pricing.html</span><span class="on"><i style="background:#6aa7ff"></i>pricing.css</span><span class=""><i style="background:#e5c07b"></i>app.js</span></div>
<div class="pl-h-ed" aria-hidden="true"><div class="pl-h-tabs" translate="no"><span>pricing.html</span><span class="on">pricing.css <em></em></span></div>
<div class="pl-h-src" translate="no"><span><u>1</u><span class="s">.plans</span> {{</span><span class="del"><u>2</u><span class="pl-h-in"></span><span class="p">display</span>: <span class="v">flex</span>;</span><span class="add pl-h-add1"><u>2</u><span class="pl-h-in"></span><span class="p">display</span>: <span class="v">grid</span>;</span><span class="add pl-h-add2"><u>3</u><span class="pl-h-in"></span><span class="p">grid-template-columns</span>: <span class="v">repeat(3, 1fr)</span>;</span><span class="add pl-h-add3"><u>4</u><span class="pl-h-in"></span><span class="p">gap</span>: <span class="v">12px</span>;</span><span><u>5</u>}}</span><span><u>6</u><span class="s">.plan--pro</span> {{</span><span class="add pl-h-add4"><u>7</u><span class="pl-h-in"></span><span class="p">background</span>: <span class="v">#2a2926</span>;</span><span><u>8</u>}}</span><span><u>9</u><span class="s">h1</span> {{</span><span class="add pl-h-add5"><u>10</u><span class="pl-h-in"></span><span class="p">font</span>: <span class="v">28px/1.15 Georgia, serif</span>;</span><span class="add pl-h-add6"><u>11</u><span class="pl-h-in"></span><span class="p">letter-spacing</span>: <span class="v">-0.02em</span>;</span><span><u>12</u>}}</span><span><u>13</u><span class="s">.switch .knob</span> {{</span><span class="add pl-h-add7"><u>14</u><span class="pl-h-in"></span><span class="p">transition</span>: <span class="v">transform 250ms ease-out</span>;</span><span><u>15</u>}}</span></div></div>
<div class="pl-h-chat"><div class="pl-h-chathead" translate="no">Chat<span>Agent ⌄</span></div>
<div class="pl-h-msgs">
<div class="pl-h-umsg"><div class="pl-h-bubble"><span class="pl-h-chip" translate="no"><svg viewBox="0 0 24 24"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>Pasted · 6,240 chars</span><div class="pl-h-code">
<span dir="auto"><b>&lt;where_on_my_site&gt;</b>my pricing page<b>&lt;/where…&gt;</b></span>
<span dir="auto">3 equal columns, 12px apart; the middle one is dark</span>
<span dir="auto">headings: Georgia 28px, letter spacing -0.02em</span>
<span dir="auto">switch: the knob slides 250ms, ease-out, on click</span>
</div></div></div>
<div class="pl-h-think" translate="no"><span class="pl-h-shim">Thinking…</span></div>
<div class="pl-h-step1" translate="no"><span class="pl-h-step"><span class="pl-h-st"><svg class="ok" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg></span>Read <b>pricing.html</b></span></div>
<div class="pl-h-step2" translate="no"><span class="pl-h-step"><span class="pl-h-st"><svg class="spin" viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-6.2-8.6"/></svg><svg class="ok" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg></span>Edited <b>pricing.css</b> <em>+7</em> <em>−1</em></span></div>
<div class="pl-h-reply"><p dir="auto">Done. Your pricing page now has three equal columns, Georgia headings and a switch that slides on click.</p><span class="pl-h-new" aria-hidden="true"><span class="pl-h-new1"><i></i><i></i><i class="pill"></i></span><span class="pl-h-new2"><i></i><i></i><i class="pill"></i></span><span class="pl-h-new3"><i></i><i></i><i class="pill"></i></span></span></div>
</div>
<div class="pl-h-comp" translate="no"><span>Ask anything</span><span class="pl-h-pasted pl-h-chip"><svg viewBox="0 0 24 24"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>Pasted · 6,240 chars</span><span class="pl-h-compfoot"><span>Agent · Auto</span><span class="pl-h-send"><svg viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7"/></svg></span></span></div>
</div>
</div>
</div></div>
<script>
/* Hero demo: measure where the pointer should go (each data-pl-t element) so it lands right at any width and in RTL. */
(function () {{
  var demo = document.getElementById('demo');
  var body = demo && demo.querySelector('.pl-h-body');
  if (!body) return;
  function off(el) {{
    var x = 0, y = 0;
    while (el && el !== body) {{ x += el.offsetLeft; y += el.offsetTop; el = el.offsetParent; }}
    return el === body ? [x, y] : null;
  }}
  function measure() {{
    try {{
      demo.querySelectorAll('[data-pl-t]').forEach(function (el) {{
        var p = off(el);
        if (!p || !el.offsetWidth) return;
        var k = el.getAttribute('data-pl-t');
        var fx = k === 'sec' ? 0.18 : k === 'head' ? 0.3 : 0.5;
        body.style.setProperty('--pl-x-' + k, Math.round(p[0] + el.offsetWidth * fx) + 'px');
        body.style.setProperty('--pl-y-' + k, Math.round(p[1] + el.offsetHeight * 0.55) + 'px');
      }});
    }} catch (err) {{ console.warn('[Huescribe site] could not place the demo pointer', err); }}
  }}
  measure();
  if (window.ResizeObserver) new ResizeObserver(measure).observe(body);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
}})();
</script>
</div>
<!-- hero demo end -->'''

# ---------------------------------------------------------------- put it in
if "<!-- hero demo start -->" in s:
    a = s.index("<!-- hero demo start -->"); b = s.index("<!-- hero demo end -->") + len("<!-- hero demo end -->")
    s = s[:a] + HTML + s[b:]
    a = s.index("/* hero demo css start */"); b = s.index("/* hero demo css end */\n") + len("/* hero demo css end */\n")
    s = s[:a] + STYLE.lstrip("\n") + s[b:]
else:
    a = s.index('<div id="demo"')
    b = s.index('</div>\n\n</div>\n<!-- Supported AI apps', a) + len("</div>")
    s = s[:a] + HTML + s[b:]
    a = s.index("/* ---------- the preview: Huescribe in use")
    end = ".pl-ai-wrap{position:relative !important;right:auto !important;bottom:auto !important;width:100% !important;margin-top:16px}\n}\n"
    b = s.index(end, a) + len(end)
    s = s[:a] + STYLE.lstrip("\n") + s[b:]
    old = "#demo .pl-ai,#demo .pl-result{animation:none !important;opacity:1 !important;transform:none !important}"
    assert s.count(old) == 1
    s = s.replace(old, "")
    old = "#demo div:has(> .pl-panel){flex-direction:column}\n#demo .pl-panel{width:100% !important;border-left:0 !important;border-top:1px solid rgba(17,17,19,0.08)}\n"
    assert s.count(old) == 1
    s = s.replace(old, "")
for gone in ("pl-state1", "pl-cursor", "pl-seg1", "@keyframes pl-ai{"):
    if gone in s:
        sys.exit(f"left over: {gone}")
open(P, "w", encoding="utf-8").write(s)
print("hero demo written:", len(KEYFRAMES), "chars of keyframes, loop", T, "s")
