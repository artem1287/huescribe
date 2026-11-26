"""Checks that every decision from the command log is still in the code (and nothing reverted).

Each line: version, what was decided, and a check on the source. Present = must be found;
absent = must be gone (removed on purpose). Run: python3 tests/audit_decisions.py [folder]
"""
import os, re, sys

ROOT = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = {f: open(os.path.join(ROOT, f), encoding="utf-8").read() for f in
       ["analyzer.js", "prompts.js", "panel.js", "panel.css", "panel.html", "picker.js", "recorder.js", "background.js", "manifest.json", "motion.js"]}

def has(f, pat):
    return re.search(pat, SRC[f], re.S) is not None

CHECKS = [
    # (version, decision, file, pattern, must_be_present)
    ("v7.3", "formats give the exact structure outline", "analyzer.js", r"function outline\(", True),
    ("v7.3", "prompts say values are requirements, not inspiration", "prompts.js", r"not inspiration", True),
    ("v7.3.1", "formats name the purpose of text, never the words", "analyzer.js", r"function purposeOf", True),
    ("v7.4", "per-section color report (gradients, buttons, cards, borders, glows)", "analyzer.js", r"function colorReport", True),
    ("v7.5", "Press it catches press animations; a link stays on the page", "recorder.js", r"holdNavigationOnce", True),
    ("v8.0", "recorder runs only while the panel is open", "background.js", r"unregisterRecorder", True),
    ("v8.0", "first screen: two choices (an element / a screen portion)", "panel.js", r"choose-element.*choose-portion", True),
    ("v8.0", "elements: scroll behavior checked", "analyzer.js", r"function elementScroll", True),
    ("v8.1", "prompts in context: building a new site vs changing my site", "prompts.js", r"I'm building a new website.*I want to change my existing website", True),
    ("v8.1", "per part: Change what is there / Add as new", "panel.js", r"Change what is there.*Add as new", True),
    ("v8.1", "reload the page (now in the ⋯ menu)", "panel.js", r"Reload the page", True),
    ("v8.2", "hover/press effects found on parents and parts inside", "analyzer.js", r"scope: 'inside'.*scope: 'outer'", True),
    ("v8.2", "JavaScript hover effects caught by simulating the pointer", "recorder.js", r"catchHover", True),
    ("v8.2", "every animation has a preview (filmstrips)", "panel.js", r"function filmSlot", True),
    ("v8.3", "⋯ menu in the header instead of a reload button", "panel.html", r'id="more"', True),
    ("v8.3", "site question asked once, then a one-line summary", "panel.js", r"site-summary", True),
    ("v8.3", "Movement opens by itself with scroll check, Press it, Reload", "panel.js", r"function movementExtras", True),
    ("v8.3", "no Play buttons (tap the preview)", "panel.js", r">Play<|'Play'\)", False),
    ("v8.3", "animation colors → my site's colors by role", "prompts.js", r"function colorSource", True),
    ("v8.3", "fonts say where and how to load and pair them", "prompts.js", r"free Google Font: load it", True),
    ("v8.3", "formats say what information goes in each part", "prompts.js", r"function contentGuide", True),
    ("v8.3", "Keep the original colors option", "panel.js", r"Keep the original colors", True),
    ("v8.4", "What should it show? on parts that hold content", "panel.js", r"What should it show\?", True),
    ("v8.4", "formats describe color relationships (darker/lighter)", "analyzer.js", r"function colorRelations", True),
    ("v8.4", "one shared spacing system across copied formats", "prompts.js", r"function sharedSpacing", True),
    ("v8.5", "smoother picking: glide, names with size, ↑↓, reading pulse", "picker.js", r"glide.*reading", True),
    ("v8.6", "panel can open in its own movable window", "background.js", r"openPanelWindow", True),
    ("v8.7", "prompt settings per AI app", "prompts.js", r"'claude-code'.*chatgpt.*builder", True),
    ("v8.8", "font schemes in sections", "analyzer.js", r"function fontScheme", True),
    ("v8.8", "dragged areas: across sections or part of one", "analyzer.js", r"function areaSelection", True),
    ("v8.9", "removed: 'Esc stops picking.'", "panel.js", r"Esc stops picking", False),
    ("v8.9", "removed: 'Tick what you want.'", "panel.js", r"Tick what you want", False),
    ("v8.9", "removed: 'Kept until you close the browser'", "panel.js", r"Kept until you close", False),
    ("v8.9", "removed: 'Click something else on the page to switch.'", "panel.js", r"Click something else on the page", False),
    ("v8.9", "removed: long 'Drag over any area…' paragraph", "panel.js", r"Drag over any area for your own selection", False),
    ("v8.9", "removed: 'Nothing has moved yet.'", "panel.js", r"Nothing has moved yet", False),
    ("v8.9", "short choice subtitles", "panel.js", r"Button, heading, card, picture", True),
    ("v8.9", "names and previews bigger, secondary text smaller", "panel.css", r"v8\.9: what matters most is biggest", True),
    ("v8.9.1", "real CSS selectors (:is/:not lists) don't break picks", "analyzer.js", r"function splitSelectors", True),
    ("v8.9.1", "scroll-driven animations, never 'NaN seconds'", "analyzer.js", r"scrollDriven", True),
    ("v8.9.1", "invisible borders not described", "analyzer.js", r"a transparent border is only spacing", True),
    ("v8.9.1", "sections found through deep / painted / display:contents wrappers", "analyzer.js", r"sameAsChild.*d < 14", True),
    ("v8.9.1", "display: contents wrappers looked through", "analyzer.js", r"display === 'contents'", True),
    ("v8.9.1", "full-screen overlays are not sections", "analyzer.js", r"const overlay = ", True),
    ("v8.9.1", "click picks even without a hover outline", "picker.js", r"current \|\| target\(elementAt", True),
    ("v8.9.1", "failed pick says so in the panel", "panel.js", r"Couldn't read that part\.", True),
    ("v8.9.1", "panel draws before a busy page is ready", "panel.js", r"Getting the page ready", True),
    ("v8.10", "Keep one look block (fonts, accent, corners, shadows, buttons, movement)", "prompts.js", r"function sharedLook", True),
    ("v8.10", "every prompt says to reuse what my site already set up", "prompts.js", r"instead of adding new near-duplicates", True),
    ("v8.10.1", "animation sweep runs after a frame (no blamed font errors)", "recorder.js", r"function afterPaint", True),
    ("v8.11", "formats copy the layout only (no fonts, no colors)", "analyzer.js", r"bare: true", True),
    ("v8.11", "formats say where they sit on the page", "analyzer.js", r"function positionFacts", True),
    ("v8.11", "prompt: keep its place relative to the rest of the page", "prompts.js", r"Keep its place relative to the rest of the page", True),
    ("v8.11", "prompt: a format copies the layout only", "prompts.js", r"copies the layout only, not fonts or colors", True),
    ("v8.11", "border color offered under Colors", "analyzer.js", r"title: 'Border color'", True),
    ("v8.11", "accent hex codes not listed in format relationships", "analyzer.js", r"accent colors \(\$\{", False),
    ("v8.11", "copy-everything items in their own 'All of it' group, not Format", "analyzer.js", r"all: 'All of it'", True),
    ("v8.11.1", "prompts end by making the AI prove each change (old → new)", "prompts.js", r"function closing", True),
    ("v8.11.3", "'what is it?' asked only when building a new site", "panel.js", r"S.mode === 'new' \? about : null", True),
    ("v8.11.3", "change prompts leave out what the site is about", "prompts.js", r"const forMode", True),
    ("v8.11.3", "chat apps use files already given; else ask once for the fewest", "prompts.js", r"If I already gave you my files in this chat.*not my whole project", True),
]

fails = 0
for ver, what, f, pat, present in CHECKS:
    ok = has(f, pat) == present
    fails += not ok
    print(f"{'OK  ' if ok else 'MISSING'} {ver:8} {what}")
print(f"\n{len(CHECKS) - fails}/{len(CHECKS)} decisions in place")
sys.exit(1 if fails else 0)
