# Huescribe: technical notes

Chrome MV3 extension, no build step, no dependencies, no backend, no secrets.

## Files
| File | Runs in | Role |
|---|---|---|
| `manifest.json` | — | permissions `activeTab`, `scripting`, `storage`, `sidePanel`; `host_permissions: <all_urls>` (CSS fetch, injection, screenshots, recorder registration) |
| `background.js` | service worker | side-panel setup (popup fallback when `chrome.sidePanel` is missing, e.g. Arc); message handlers: `startPicker`, `picked`, `record`, `capture`, `fetchCss`; stores picks in `chrome.storage.session` |
| `panel.html/css/js` | side panel / popup | the whole UI: home → pick / animations / browse → tick items → apply form → prompt |
| `analyzer.js` | page, isolated world | design extraction. `__Huescribe = { version: 3, analyze, analyzeElement, itemsForElement, itemsForRegion, itemsForPage }` |
| `picker.js` | page, isolated world | **v6:** a singleton on-page UI `globalThis.__plUI = { startPicking, stopPicking, showSelection, clearSelection, setCapturing, pickByPath, destroy, isPicking }`. Picking stays on after a pick, and Esc sends `huescribe:pickingStopped`. Selection boxes (`sel`: `{pickId}` or `{docRect}`) follow scroll via rAF. `setCapturing` is counted and hides every overlay during screenshots and filmstrips. |
| `picker.js (old row)` | page, isolated world | click/drag selection overlay → items + cropped screenshot → `huescribe:picked` |
| `recorder.js` | page, **MAIN world**, document_start, **on every page via manifest `content_scripts`** (with motion.js) | animation recorder: `window.__plRec = { summary, replay, highlight, filmStart, filmSeek, filmEnd, groupsWithin }` |
| `motion.js` | page (MAIN + isolated) + panel | motion vocabulary: `describe(g)` → pattern `name` (Fade-up, Pop-in, Letter-by-letter fade-up, Float…), plain `sentence` with feel words (snappy / smooth / settles softly / bouncy) and total time, `when`, and `numbers` for Details. Single source for recorded and CSS animations |
| `adjust.js` | panel | per-type tweaks: `init` (keep `origCode`, parse `params`), `controls`, `update` (re-render `code`, `adjustNote`, swatch), `reset`, `previewCss`, `replayOptions` |
| `prompts.js` | panel + page | `buildSupplemental` (Claude-optimized add-on prompt), `animationCode`, `genericLabel`, plus the style-guide renderer (`guideBody`, `section`) used by the palette / design-system items |
| `tests/` | — | Playwright e2e + fixture site (not shipped in the zip) |

## Data flow
- **Pick:** panel → SW `startPicker` injects analyzer + prompts + picker.
  - A full-screen *shield* in a Shadow DOM host takes the mouse, so the page gets no clicks or `:hover` while you select.
  - Click → `itemsForElement`; drag → `itemsForRegion` (elements at least 50% inside the box).
  - The picker then crops a screenshot (`captureVisibleTab`), downscaled to 1600px wide and stored as a data URL, and tags a picked element with `data-pl-pick`.
  - It sends `huescribe:picked`. The SW stores the pick under `picks:<tabId>` in `storage.session` (the newest 6, screenshots kept for the newest 3).
  - The panel hears `storage.onChanged` and opens the pick. Picks are scoped to the page URL.
- **Movement on pick (v5):** the recorder is always on, so picking queries `__plRec.groupsWithin('[data-pl-pick=…]')`:
  - Groups with a member inside the pick, or a member *containing* the pick, are returned. The second case is flagged `partOf` ("Your pick is part of this: 3 items…").
  - Drag picks tag `regionRoot(region)`.
  - CSS-animation items that were also recorded are dropped, so each animation shows once.
  - Each item has a `when` tag and the Movement group is listed first.
  - If the recorder is missing (the page was opened before install), the panel offers **Reload the page and look again**: `chrome.tabs.reload`, wait for load + 2.5s, then `startPicker` with `autoPick` = the picked element's CSS path, so `picker.js` captures it directly. Drag picks restart the picker instead.
- *(Old, v3–v4)* Find animations: panel → SW `record`.
  - The SW registers `recorder.js` (`registerContentScripts`, MAIN world, document_start, matching the tab's host), reloads the tab, waits for `complete`, then unregisters it.
  - The panel polls `__plRec.summary()` every 1.5s through `executeScript({world:'MAIN'})`. **Replay** calls `__plRec.replay(gid)`.
  - After a pick, `groupsWithin('[data-pl-pick=…]')` offers that element's recorded animations. The DOM is shared between worlds, so the attribute bridges them.
- **Browse:** panel injects analyzer + prompts → `itemsForPage()`.
- **Basket:** ticked items become basket entries (`storage.session.basket`) holding `type, label, code, unit, trigger, shot, where`. `buildSupplemental(basket, {fit, notes, screenshot})` builds the prompt.

## Adjust (tweaks before the prompt)
- Basket entries keep `origCode`; `adjust.js` parses `params` per type and re-renders `code` from the original on every change, so tweaks never compound:
  - gradient: angle and stops (hex + alpha)
  - font: size, weight, line height, tracking
  - shape: radius
  - shadow: strength (scales px and alpha)
  - hover: speed / intensity
  - CSS animation: duration
  - recorded animation: duration / stagger / distance / easing, re-rendered via `animationCode`
  - layout: gap / columns
- `adjustNote` is the plain-language diff against the original. `request` is the user's free text.
- **Live preview:** `collectItems` registers each item's source element in `globalThis.__plTargets` (isolated world, `WeakRef`) and puts its id on the item as `target`. The panel's `pagePreview(ref, css)` runs in that world: it saves the element's original `style` attribute, appends the declarations with `!important`, and restores the original on Stop, on leaving the screen, or on switching items. Recorded animations preview through `__plRec.replay(gid, {duration, stagger, easing, distance})`.
- **Prompt:** `<adjustments>` (the diff, stating that the reference already includes it) and `<request>` per change, plus an instruction that the request wins over the reference. When anything was adjusted, `<fit>` and `<screenshot>` say the screenshot shows the original, before the adjustments.

## v6: highlight-first, catch everything, simplest words
- **Highlight mode is on by default.** `go()` turns picking on for `home`/`pick` and off (keeping selection boxes) for `apply`/`result`. The panel's port tells the service worker which tabs it turned picking on in. When the panel closes, the service worker calls `__plUI.destroy()` in those tabs.
- **Autoplay:** after a pick, every non-looping movement group replays once (no flash, no scroll). Ticking an animation card plays it (explicit play). Hover replays are skipped while a filmstrip is being made, and filming stops when you leave the list.
- **Recorder coverage:**
  - a catch-all `document.getAnimations()` sweep (every 300ms for ~30s, then every 1s), plus the shadow roots it has seen;
  - an `Animation.prototype.play` hook and an `attachShadow` hook;
  - `::before`/`::after` (replayed with `pseudoElement`);
  - scroll-driven timelines (`scrollLinked`, named "… as you scroll");
  - more inline-style channels: width/height, top/left, background-position, stroke-dashoffset, letter-spacing, color;
  - SVG attributes (`d`, `points`, `cx`…, `stroke-dashoffset`, `transform`, `opacity`).

  Our own replays are added to `seenAnims` (`markOwn`), so the sweep never records them. `within()` checks containment across shadow boundaries.
- **Media that can't become CSS** (analyzer `mediaMotion`): canvas, autoplay video, Lottie players, SVG with `<animate>`, GIFs become `media` items with their own prompt guidance.
- **Words (motion.js v2):**
  - simple names ("Rise in", "Draw in", "Grow", "Float"…), "Letters/Items/Links … one by one";
  - one-line sentences with Fast / Smooth / Slow, "bouncy", "under a second" / "about N seconds";
  - when-tags: On load / On scroll / As you scroll / On hover / On click / Loops / Later.

  Analyzer card text was shortened too (e.g. "Light orange to pale pink, diagonal.", "Lifts up, grows, shadow changes.", "Fraunces, very big, bold, tight."). Cards carry no page-text context, except "Your pick is one of N".
- **Bugs fixed in v6:**
  - the sweep recorded our own replays;
  - overlays were captured in filmstrips;
  - a comment swallowed `delay`/`iterations` on JS tween records.

  Test notes: the extension's CSP blocks string `wait_for_function` (the test polls instead), and the fixture's smooth scrolling (the test scrolls with `behavior: 'instant'`).

## Plain-language UI (v4)
- Every item has `title` (short headline), `desc` (one plain sentence), `tech` (numbers shown under Details), and `label` = title + desc + tech, which is what goes into the prompt's `<what>`.
- Analyzer helpers write the words:
  - `gradientWords` ("Light orange fading into pale pink, diagonally…")
  - `stateWords` (hover: "lifts up slightly, grows a little…")
  - `shadowWords`, `fontWords`, `filterWords`, `layoutItem`
  - CSS animations via `HuescribeMotion.describe`
- No page text goes into `label`. Page text stays in `context`, which only the panel shows.
- **Pictures:**
  - Items carry `rect` (viewport px at pick time), and picks carry `shotRect`. The panel crops each item's picture from the pick screenshot (`cropFrom`).
  - Animations get a **filmstrip**. `__plRec.filmStart(gid)` creates the replay paused, the panel seeks it to 0 / 15 / 35 / 60 / 100% of the total time (4 points for loops) with `filmSeek` and screenshots each frame. Captures are spaced at least 550ms apart because of Chrome's capture rate limit. The frames are composed side by side, or stacked for wide things like headings.
  - Filmstrips are made only for animations already on screen, so the page never scrolls by itself (scrolling would trigger, and spoil, scroll reveals). Off-screen ones say "Press Play to see it", and the strip is built after Play scrolls there.
- **Pointing at a card:** after a 350ms hover or keyboard focus, the panel outlines the element on the page via `__plTargets` (no scrolling). For animations it replays without scrolling; with reduced motion turned on it only outlines (`__plRec.highlight`). Play and Slow motion (`speed: 0.25`) may scroll.
- **Quick tweaks:** `ADJ.presets(b)` / `applyPreset(b, i)` per type; the Fine-tune controls re-sync afterwards.
- **Picture in the prompt:** a basket entry's `shot` is the animation's filmstrip (`shotKind: 'film'`) or the item's crop or pick screenshot. `<screenshot>` wording follows `shotKind`.
- **Accessibility:**
  - a `#live` aria-live region announces adds, copies and tweaks;
  - the screen title gets focus on navigation;
  - labels are tied to their inputs;
  - all controls are at least 44px tall, except chips, which have an enlarged hit area;
  - layout works from 320px;
  - light and dark themes.

## Items (analyzer `collectItems`)
Every item has a site-agnostic `label` and `code` (these go into the prompt) and a `context` that is shown only in the panel to help you recognise it.

Types:
- `gradient`, `text-gradient`, `color`, `palette`
- `font` (headings ranked first; browser-default form fonts skipped)
- `shadow`, `text-shadow`, `glass`, `filter`, `shape`
- `hover`, `focus` (state rules plus the resting transition, described in words: "lifts 4px, shadow changes")
- `animation` (CSS keyframes currently applied), `layout`
- `component` / `section` (whole recipe), `design-system`

Plain-language naming comes from `colorName()`, `describeGradient()` and `describeState()`.

## Recorder (`recorder.js`)
**Sources:**
- `animationstart` / `transitionrun`, each with the matching `Animation` object (`getKeyframes`, `getTiming`). CSS easing comes from the keyframes; transitions on one element that start within 60ms are merged.
- An `Element.prototype.animate` hook (WAAPI, used by Motion / Framer Motion).
- A `MutationObserver` on inline `style` changes, plus a `childList` watch. Elements often get their start state *before* insertion (split text), so inserted nodes are sampled too.

**JS tweens** (GSAP and similar) are rebuilt from samples:
- Separate animations are split at idle gaps longer than 1s.
- A "set, then animate later" prefix is detected relative to the median frame interval, so throttled tabs still work.
- Easing is guessed from progress at 50% / 25% of the duration. Durations are rounded to 50ms.

**Trigger** (`triggerOf`, decided when the list is read, from hover/focus state recorded at the start of the animation):
- An animation that *starts* invisible or far away (opacity below 0.5, moved 10px or more, scale below 0.8) is an entrance even if the mouse was over it. Real hover effects start from the resting state. This fixed scroll reveals being misread as hover effects when the cursor sat over the content.

Previous rules:
- `loop`: infinite iterations
- `hover`: hover state recorded when the motion *starts*; these are excluded, since hover effects come from picking
- `scroll`: within 1.5s of a scroll event
- `load`: before load + 2.5s
- `later`: anything else

**Grouping** key: motion signature (properties, 100ms duration bucket, from-values rounded) + container (closest heading / p / a / button / li…, else the section) + trigger.
- Unit: `letter` when every member is one character, `word`, `item` or `element`.
- Stagger = (last start − first start) / (n − 1), rounded to 10ms. This average is robust to frame quantization.
- `gid` is the group key, so it stays stable as new animations arrive.
- Our own replay highlight is marked `data-pl-ignore` and never recorded.

## Prompt design (`buildSupplemental`, v7)
The prompt is a description of the source page, not a coding brief. Claude knows how to code; it only needs facts it can't see.
- One self-contained `<design_detail from="host">` block per chosen item: `<where_on_my_site>` (only if given), `<what>` (plain words + numbers), `<values>` (exact CSS, or measured facts for recorded animations), `<change_i_want>` (optional), then `<note>`s for situations Claude can't infer: unticked text parts, tweaks applied, fit-my-site, possibly licensed font, uncopyable media, what a pasted picture shows.
- Recorded animations: `animationCode(g)` gives keyframes, per-unit timing + stagger, trigger in words, and "measured from JS" when relevant. No implementation snippet.
- Text parts: `textParts {font,size,color}` filters `<values>` lines (`TEXT_PARTS` regexes) and `<what>` pieces (`textWhat`).
- Blocks have no preamble and no instructions, so several can be joined. `combine(prompts)` adds one lead-in line ("Here are design details from other websites that I want on my site:") and is used by **Copy all** on the saved list.
- `guideBody`/`section` (whole-page style guide renderer) stay for palette/design-system items.

## Area picks (v7)
- `itemsForRegion`: `regionMembers(region)` finds the element with the most visible children ≥50% inside the dragged box. With ≥2 members it returns only shared items: `arrangementItem` (rows from layout boxes `offset*`, so mid-animation transforms don't create fake rows), `sharedLook` (common computed props), shared fonts ("Same in all N"), one shared hover ("(all N)"), the background behind them, a shared CSS animation with stagger from delays, and "The whole area". Otherwise it falls back to the single-element items.
- Panel: for area picks (`view.sel.docRect`) recorded movement is filtered to groups with `count > 1`.

## Panel sections (v7)
- `renderItems` wraps each category in `<details class="section">` with a count ("2 of 5 chosen" once ticked). All start closed, except when there is only one section; open state is remembered in `view.open` across re-renders.

## Gotchas
- `panel.html?tabId=N` exists only for tests. Tests open the panel in its own window via `chrome.windows.create`: resizing a page that shares a window with the site shrinks the real window, and `captureVisibleTab` shoots the visible tab.
- Headless and background windows throttle `requestAnimationFrame`, so the e2e keeps the site window in front.
- A screenshot whose aspect ratio doesn't match the page viewport means the wrong tab was captured. It is skipped rather than mis-cropped.
- Old v2 code paths (popup, full-guide categories) were removed. The style-guide renderer survives only as the "Whole color palette" / "Entire design system" items.

## Testing
```
(cd tests/fixtures/site && python3 -m http.server 8001) & (cd tests/fixtures/cdn && python3 -m http.server 8002) &
python3 tests/e2e.py          # needs Chrome for Testing at /usr/bin/google-chrome + playwright
python3 tests/audit_decisions.py  # every decision from the command log is still in the code (72 checks)
python3 tests/real_sites.py   # real websites (internet, ~40 min); PL_RESUME=1 continues an interrupted run; results in $PL_OUT/real/
```
The fixture has a gradient hero, a JS letter-by-letter heading tween, a CSS paragraph fade, a looping badge, a WAAPI logo wobble, and scroll-reveal cards with a 100ms stagger.

The e2e covers:
1. **Gradient:** pick the hero → tick only the gradient → `<where>` → prompt contains it and nothing else.
2. **Animation:** catch animations → the letters effect is described correctly (40ms, 600ms, strong ease-out, load) → Replay works → the scroll reveal is caught after scrolling → the prompt contains only that animation, with letter-split, reduced-motion and load guidance.
1b/2b. **Adjust:** gradient angle + color, previewed live on the page (it follows further tweaks and is restored on Stop); animation duration / stagger / distance / easing, previewed by replay; the prompt carries the adjusted code, `<adjustments>` and `<request>`.
3. **Pick after recording:** picking the heading offers its recorded animation.
4. **Browse + combine:** two changes, each with its own `<where>`, plus the "match my site" fit.

v4 adds checks for: the plain-language names and sentences (exact strings), no code or jargon in card text, cropped pictures, filmstrips of real frames, pointing at a card outlining it on the page, slow motion, one-tap tweaks syncing with Fine-tune, and the filmstrip wording in the prompt.

Plus: no source-site text or wrong animations in any prompt, the empty page, restricted pages, 320px width, dark mode, and no console errors.

- v6.1: the `request` field ("How should it change?") is a visible textarea on every change card, no longer under More options. The prompt renders it as `<request>`, and the instructions say the request wins over the reference.

## v6.2: one prompt per pick, lean prompt (prompt part superseded by v7 above)
- **Separate prompts:** basket entries carry `pickId`.
  - Going to `home`, or a *different* pick arriving, calls `archiveBasket()`. It saves `{title, url, basket, fit, prompt, thumb}` to `storage.session.saved` (newest 10; pictures kept for the newest 4), then resets the basket, fit, ticks and selection boxes.
  - Home lists **Saved prompts** (Copy / click to reopen). `restoreSaved()` archives the current basket first, then moves the saved one back into the basket.
  - "Add something else" was removed; the result screen ends with "Pick something new".
- **Lean prompt (`buildSupplemental`):** only what Claude can't infer:
  - the scope line;
  - `<change>` with `<where>`, `<what>` (plain words + exact numbers), `<reference>` code and the optional `<request>`;
  - situational notes: request beats reference, fit-my-site, what a pasted picture shows, the free-font rule, uncopyable media, use own content (component/section/design-system);
  - "ask if the <where> is unclear".

  Removed as things Claude does anyway: styling-approach/tokens advice, minimal diff, run/verify/report steps, contrast, focus states, reduced motion, accessible letter-splitting, trigger mechanics, and the `<adjustments>` list (the reference already contains the tweaks).

## v7.1
- **Panel modes** (`MODE` in panel.js): `side` (Chrome side panel), `window` (no side panel API, e.g. Arc: `action.onClicked` in background.js opens `panel.html?tabId=…&mode=window` as a popup-type window docked to the right of the browser window, shrinking it; closing restores the size; the panel follows the active tab of that browser window via `state.boundWindow`), `popup` (last-resort fallback).
  - Bug fixed: a popup closes when you go to click the page, and its port disconnect used to `__plUI.destroy()` the picker, so nothing could be picked. The popup now tells the port `{popup:true}` and the background leaves picking on.
- **Lock after pick** (picker.js): after a pick, hover highlight is off (`locked`). A click inside the current selection (`selRect`, computed from the selection data, not the outline node, which is hidden during screenshots) unlocks. A click elsewhere picks directly. `showSelection([])` unlocks. `__plUI.v` versions the singleton so an old UI is replaced.
- **Whole text** (analyzer.js `wholeText`, `indistinctPieces`): inline letter/word spans that look the same as each other and their parent climb to the parent. Used by the picker for hover and click. `regionMembers` skips candidates whose children are such pieces.
- **Record a scroll or click**: the recorder logs presses (`pointerdown`, Enter/Space, ignoring our overlay) in `rec.clicks`. `triggerOf` returns `click` when a press came within 1.2s before the start, unless it's a reveal and a scroll followed the press by more than 60ms (a scroll event fires a frame after the press that caused it). The panel `record` screen stops picking, shows a page bar (`setRecording`), polls `__plRec.groupsSince(since)` and on Done shows those groups as a `record` view.
- **Picture item**: every pick gets `pictureItem` (group Picture). Its apply card has a free-text "Describe the picture you want" (`b.picturePrompt`) instead of tweaks. The prompt block is `<what>` (size, wide/tall/square) + `<picture_i_want>` + a note about the pasted reference.
- **One pasted picture per prompt**: `promptFor` picks `shotEntry` (picture item > filmstrip > any shot) and passes `pictureFor: bid`, so only that block says a picture is pasted.
- **Moving preview**: `makeFilm` also stores small frames (`state.frames`), copied to basket entries (`b.frames`). The apply card cycles them (`movingPreview`).
- **Replay loop (v7.1.1)**: `startPreviewLoop(view, groups)` replays the pick's non-looping animations on the page every (longest run + 900ms) while that view is on the pick screen; skipped while `state.filming`; stopped by `go()` leaving `pick` or a new view. All sections start closed again; filmstrips are queued only when Movement is opened (`view.filmGroups`), so the loop isn't interrupted by frame capture right away.

## v7.2: whole page shortcuts
- Home has **Copy the whole page**: Color scheme / Fonts / Everything (`wholePageBox`). Each sets `state.browsePreset` and opens `browse`; `loadBrowse` applies `PRESETS[preset]`: opens that section (`view.open`) and pre-ticks the obvious item (palette / design-system).
- analyzer `itemsForPage`: the palette item is now "Color scheme" (first in Colors, plain-word summary like "Pale yellow background, black text, vivid orange main color"); its values are the role-labelled color list without the markdown heading.
- Fixed: a stray "null" text node on the browse screen (`append(null)`).

## v7.3: exact format, navigation, color journey, rules line
- **Outline** (`outline(root)` in analyzer.js): an indented tree. Containers get arrangement in words + numbers (`arrangeWords`: row/stacked, spread/centered, gap, equal grid columns, left/middle/right positions), size (`sizeWords`: full width / max-width centered / px, min-height, sticky/fixed), paint (`paintOf`: color, gradients, picture, backdrop blur) and box (`boxWords`: padding, radius, border, shadow). Leaves (`leafLine`) get kind + quoted text + font/size/weight/color (gradient text via `textPaint`). Plain single-child wrappers are skipped. Look-alike siblings fold into `×n` and list each text. Elements with opacity 0 (waiting for a reveal) count.
- **Items**:
  - `structureItem` ("Structure"): for element picks with content and for area picks (`regionRoot`).
  - `navItem` ("Navigation bar"): when the pick is or contains a header/nav ≤ ~260px tall, and on the whole page (`navRootFor`). Facts: bar height, sticky, background, logo, menu links (majority style) vs other links, buttons, dropdowns, hidden burger, then the outline.
  - "Page structure": `pageBands()` (full-width bands top to bottom, descending through unpainted wrappers) with a shallow outline each.
- **Color scheme = `colorJourney()`**: per band: own paint, glows/blobs (absolute painted elements ≥ 5% of the band, with filter/opacity), full-size media; top colors for headings, text (weighted by text length), links, buttons and cards (`bandColors`). The old single palette (whose base fell back to white when `<body>` was transparent) is gone. `data.colors.base` now falls back to the band background covering the most height (`dominantBandBg`).
- **Group "Layout" renamed "Format"**. The flex/grid spacing item is now titled "Spacing". The home has a **Format** shortcut (preset ticks Page structure + Navigation bar).
- **Rules line** (prompts.js `RULES`): once at the top of every prompt and once in `combine()` (each saved prompt's own copy is removed). Structure/navigation/palette blocks with quoted text get a note that quotes are placeholders.
- Gotcha: analyzer.js already had `tally(map, key, weight, tag)` and `topKeys`. A second function declaration with the same name silently replaces the first (hoisting), which broke fonts. The new helpers are `bump`/`topBy`.
- Fixture `tests/fixtures/site/rich.html`: dark page with sticky blurred nav, gradient hero with gradient text and a glow, card grid, a light section, a gradient band, and a footer.

## v7.3.1: purpose instead of wording
- The outline, navigation facts and color journey never include page text. `purposeOf(el, kind)` names the job (main headline, section/card title, supporting line, card description, small label above the title, price, copyright line, sign-in, sign-up call to action, contact/demo request, purchase, learn-more link, legal/footer/page link, main call to action / secondary action) from tag, position, nearby elements and keywords. `wordsLabel` adds the length ("5 words", "1 word each").
- `sectionPurpose(band)` names sections: pricing (n plans), FAQ, testimonials, form, cards section (n cards), logo strip, call-to-action band, text with a large picture, text section. Used by `bandName` for Page structure and Color scheme.
- The prompt note about quoted text is removed. A test checks that none of the fixture's own words appear in the Format prompt.

## v7.4: chosen sections
- **Panel**: home "Copy whole sections" has Color scheme / Format (`startSections(kind)`). The `sections` screen keeps `state.sections = {kind, list}`. The picker is put in section mode (`setSectionMode`). The panel answers `huescribe:section` runtime messages from the picker (add/remove), redraws the list and outlines (`showSelection` with labels "Section n"). **Next** runs `__Huescribe.sectionReport(el, kind)` for each `[data-pl-pick]` and pushes one basket entry per section (types `section-colors` / `section-format`). Leaving the screen ends section mode (outlines are kept when going to apply). "Or the whole page's style" opens the old browse view.
- **Picker section mode**: hover/click target is `sectionOf(el)` (its band from `pageBands()`, else the widest box around it). A click on an already-chosen section removes it. A drag selects `regionRoot` of the area. The section's screenshot goes along as a thumbnail.
- **analyzer**:
  - `sectionColors(band)`: background (or what shows through from ancestors), decorations (painted non-text elements ≥ 1% of the section, with size and place words), `::before/::after` layers (`pseudoPaints`), text colors by purpose weighted by text length, button styles by purpose, cards, badges, lines/borders, SVG fills/strokes/gradient stops, colored shadows. `colorReport` prints it. The whole-page journey uses it for every band.
  - `layoutGist(el)`: one-line gist. `outline(..., {lean:true})` drops px widths of flex/grid children and button heights.
  - `pageBands()` also descends into a painted wrapper holding several tall sections (a dark page shell), which before made the whole page one section with one background and one text color. Fixture `shell.html` covers it.
- Tests: section hover covers the whole section; add/remove/re-add; one block per section; hero/cards color details; section format gist without one-to-one widths; the wrapper case.
- `tests/serve.sh` starts the fixture servers (they stop when the environment restarts).

## v7.5: every animation usable, press to catch
- **Media items** (canvas, video, GIF, Lottie, SVG animate) get a live filmstrip: `queueLiveFilms`/`makeLiveFilm` take 4 screenshots ~0.9s apart of the target (no replay), keyed `live-<item id>` (`it.filmKey`). They show "Scroll to it for a preview" when off screen. The basket uses `gid ?? filmKey` for film and frames. Canvas/video values now describe size, placement, looping and that the pasted frames show it.
- **Press it**: `loadMovement` marks pressable picks (`a[href]`, button, role=button, summary, label, checkbox/radio, onclick, aria-expanded/controls, or cursor:pointer). The pick screen shows a callout. `startRecording({press})` calls `__plRec.holdNavigationOnce('[data-pl-pick=…]')`: the next click on a link inside it doesn't navigate, so its effect can be caught. A press recording finishes by itself 1.4s after the last new movement.
- **Recording screen** polls every 0.5s and lists caught movements by name and trigger. Results are sorted by start time.
- **motion.js** names there-and-back effects (end = start, middle differs): Press, Bump, Hop, Dip, Nudge, Wiggle, Flash (`kind: 'effect'`).
- **Tests**: `use_motion` runs every listed animation kind end to end (film or explanation, Play button, preview on the apply card, non-empty values, no undefined/NaN/null). Covers each extra kind, a pressed link (`#go`, page stays), and a scroll reveal recorded at the bottom (`#late`).

## v8: two choices, off when closed, scroll behavior, simpler flow
- **Off when the sidebar is closed**: no manifest content scripts anymore. The background registers `motion.js`+`recorder.js` (`registerContentScripts`, MAIN world, document_start) when the first panel port connects. The panel's `refreshTab` → `huescribe:ensureRecorder` injects them into the current tab (returns `late` when injected after load). When the last panel port disconnects: unregister, `__plRec.stop()` in every tab it touched, `__plUI.destroy()`. `recorder.js` has `active`, `stop()` (disconnects the MutationObserver, every hook/listener becomes a no-op, the sweep timer ends) and `start()` (re-injection on a page where it already exists). `lateStart` drives the first screen's **Reload page** card.
- **Screens**: `home` (tip, late card, two choices, Your prompts) → `element` (picking on, element mode) → `pick` → `apply`; `home` → `sections` (section mode) → `apply`; `pick` → `record` (Press it). `browse` and `result` are gone. Picking is on only on `element`/`pick`/`sections`. Async home rendering is guarded by `state.renderSeq`.
- **Picker**: element mode never drags; section mode clicks sections or drags areas.
- **Categories**: GROUPS map Effects → Colors, Shape/Everything → Format; panel order Movement, Colors, Text, Format.
- **Scroll behavior** (analyzer): `sampleScroll(els, ys)` scrolls instantly through positions (waits 2 frames + 70ms; 700ms at the first one so reset-on-leave reveals finish hiding; 900ms at the end for reveals to finish), snapshots rects without own transforms plus style props, then scrolls back. `behaviorOf` turns samples into words: stays in place / sticks for N px / parallax % / moves sideways / fades in and moves into place (with start offset) / property changes. `elementScroll(el)` covers the element entering to leaving the screen. `sectionScroll(band)` follows up to 80 parts and groups identical behaviors ("3 parts …, one after another"). `globalThis.__plScrollAbort` stops a running check when the panel leaves the pick (`abortScrollCheck`). `scrollHint` (sticky/fixed, will-change transform, animation-timeline) triggers the check automatically; otherwise a **Check** callout. Recorded reveals that fire during the check are added to Movement.
- **Screen portions**: each chosen section has parts {colors, format, scroll} (toggle chips). `portionReport(el, parts)` returns one combined block (Format / Colors / Scroll behavior). Entry type `portion`. A section with scroll chosen but nothing found is noted on the apply screen.
- **Apply**: the picture is a checkbox (`b.makePicture` → prompt uses `<picture_i_want>` from the change text, with a reference note). "Use my site's colors and fonts" is under **More options**. **Copy prompt** copies, archives into Your prompts, and returns home with a notice (+ **Copy picture too**).
- **Your prompts**: `archiveBasket` takes the basket synchronously (no double saves). Rows have Copy, an icon-only picture button, click to edit; **Copy all** (`P.combine`) and two-tap **Clear**. The first-time tip uses `chrome.storage.local.tipSeen`.
- **Captures** retry once on Chrome's occasional "image readback failed". Page-UI calls skip browser pages and log navigation races at debug level.
- **Tests** (`tests/e2e.py`, rewritten for v8, 101 checks): before opening nothing runs; tip; late reload; element flow; locks; quick tweaks; Copy prompt → home; basket/Copy all/edit; text parts; picture checkbox; every motion kind usable; element scroll check; Press it (link, menu); reload-and-check; portion scroll behavior; closing switches off (recorder stopped, nothing injected after reload); popup mode; rich page portions (nav/hero/cards colors+format, no site words); sticky header auto scroll check + nav facts; painted wrapper; robustness; 320px dark.

## v8.1: prompts in context (new site vs changes), ordered list, reload button
- **Site context** (`state.site = {mode: 'new'|'change'|null, about}`, `chrome.storage.local.site`): `siteCard()` on the first screen and in compact form on the apply screen. prompts.js `header(ctx)` writes the opening: new site (spec, whole-site first then page parts in order, fill text by purpose) / changes (only these, keep the rest, `<task>` says change or add) / neutral when unset. Each block may carry `<task>` (`taskFor`): whole site → "use/apply across the whole site"; changes → "Change what is there now" (`b.task = 'replace'`, default) or "Add this as something new" (`'add'`, `taskRow`). `ordered()` puts whole-site details first.
- **One message from many** (`P.combine(entries, ctx)`): rebuilt from each saved entry's basket (not from stored text), so the opening is said once and matches the current mode; pictures get `Picture N` labels in list order (`pictureLabels`). Single-row Copy also rebuilds with the current context.
- **Your prompts order**: archive appends (or puts an edited prompt back at `state.editingIndex`); up to 20 kept, pictures for the last 6; rows are numbered with a 44px "move up" button. Picture buttons say "Copy picture N".
- **Header reload button** (`#reload`): reloads the tab (recorder is registered for document_start while the panel is open) and returns to the first screen.
- Gotcha: `event.currentTarget` is null after an `await` in a handler; grab it first.
- Tests: 111 checks (context opening, `<task>`, Copy all for a new site with numbered pictures, reordering, reload button).

## v8.2: hover/press effects work; every animation has a preview
- **Parent/child hover rules**: `statesFor(el, sheets, limit, allScopes)` splits a state selector at the compound carrying `:hover/:focus/:active`. Scopes: 'self' (`.btn:hover`), 'inside' (el is the host of `.card:hover .arrow`, the change is on the part), 'outer' (el is the part). Other callers keep self-only. Items carry `stateCss` + `stateOn` (ref of the element that changes) and say what changes where.
- **Showing a state on the page**: analyzer `playState(ref, css, {hold, still})` applies the declarations inline with `!important` (the element's own transition plays), holds, removes. Overlapping plays restore the true original (`__plOrig` + `__plPlays` counter). `restoreState` ends a still application. The panel uses it for Play, pointing at the card, ticking, and the replay loop (`startPreviewLoop` includes state items; period ≥ 2.4s when there are any).
- **JavaScript hover effects**: recorder `catchHover(selector)` dispatches pointer/mouse over/enter/move, waits 900ms, then out/leave. Animations started meanwhile get `forcedTrigger = 'hover-js'` (stored on the raw items so later lookups/filmstrips find the same group). `addAnim` keeps recording during a simulated hover even while a film replays (own replays are excluded via `seenAnims`). The panel runs it after every element pick (`catchHoverFor`). WHEN 'hover-js' = 'On hover'. motion.js renames entrance names for interaction triggers when the element stays visible (Pop/Zoom in → Grow, Rise in → Lift, …).
- **Previews for everything**:
  - recorded groups: off screen → `filmStart({scroll:true})`, then the page goes back; one retry on failure.
  - CSS animations played before recording: `restartCss(sel, names, 'load')` restarts them once so they're recorded (skips scroll-linked ones). Any left over get a live strip (`live-` key).
  - hover/press: `makeStateFilm` before → after (`shotKind 'beforeafter'`).
  - element scroll behavior: `makeScrollFilm` frames at the measured scroll positions (`elementScroll` returns `ys`).
  - section scroll behavior: viewport frames while scrolling through (`shotKind 'scrollfilm'`).
  - Live/state films bring the target into view and back (`bringIntoView`/`scrollBack`).
- **Previews belong to one pick**: every film function takes the view it was queued for (`stillFor(v)`). It stops when the pick or screen changes and doesn't scroll the page back once the person has moved on (this had made a later pick land on the old element).
- Tests: `all_previews()` requires a `.film img` on every Movement card (each motion kind, card with group + hovers, recorded press, sticky header scroll). Plus parent-hover found/played/restored, JS hover caught as "Grow · On hover", section scroll preview. 133 checks, two clean runs.

## v8.2.1: fixes found while taking screenshots
- Picker labels ("Your pick", "Section N") sit inside their box (`.sel span { top:2px; left:2px }`) so they never cover the neighboring section.
- `collectItems` skips outer-scope hover/press states when the host element is inside the pick, so the same effect is not listed twice. Cross-element effects read "Hovering the card affects the heading inside it: …".
- `playState` marks the element with `data-pl-own`; the recorder's `ignored()` skips it, so Huescribe's own previews are never recorded as page animations. `endPlay` removes the mark 1200ms after the last play.
- The preview replay loop leaves out scroll-linked groups and pauses while a scroll check runs, so it never disturbs scroll measurement.
- Screenshot guide of every screen: `/tmp/shots.py` (not shipped) produces the panel and page shots.

## v8.3: buttons where they are needed; prompts fit the person's own site
**Panel (`panel.js`, `panel.html`, `panel.css`)**
- Header: the reload button is replaced by **⋯ More** (`#more`) → `openMenu(anchor, entries)`: Reload the page (`reloadPage`), Clear your prompts (`clearPrompts`, two taps via `confirm`), How it works (resets `tipSeen`). `openMenu`/`closeMenu` is one shared popover (`.menu`, `.menu-item`, 44px rows), closed by outside click, Esc or scroll. Saved rows use it too (`.row-more`: Copy again, Copy picture, Move up/down, Remove).
- Home: the two choices first, then Your prompts, then the first-time tip. `siteCard()` and `lateCard()` are gone from home.
- Site context: `siteCard()` renders on the apply screen only. Unset → the full question (stays open until **Done**, `state.editSite`), and the tray's Copy prompt is disabled; set → `.site-line` "For: …" + **Edit**. `copyPrompt` refuses without `state.site.mode`.
- Pick view (`renderItems` + `movementExtras(view)`): a picked element always has a Movement group; it opens by itself once it has items or the pick is pressable (`view.movementToggled` stops that after the person toggles it). Extra rows at the end of Movement: scroll status (`#scroll-status`), Press it (`#press-catch`), missed opening movement → Reload (`#reload-check`, when `view.movement === 'missing'` or `state.recLate` with no load animation found). No Play buttons: `filmSlot(key, onPlay)` makes the strip clickable (stops the label from ticking the checkbox); animations keep Slow motion. Tray: "Tick something first" / **Next (N)**.
- Scroll check is automatic for every element pick (`loadMovement` → after `catchHoverFor` and the film queue → `runScrollCheck`).
- Apply: `changeCard` = head, where field, `whereChips(b)` (from `b.meta` and type), Change/Add, then `details.adjust-box` (closed unless changed) holding text parts, `tweakSection` and the picture toggle. "Keep the original colors" (`b.keepColors`) sits in More options for motion items whose values contain colors (`P.colorsIn`). The "Use my site's colors and fonts" checkbox shows only in change mode.
- Sections: `toggleSectionInList` asks `__Huescribe.areaScrollHint(el)` per added section; the Scroll behavior chip shows only when it says yes (`x.scrollHint`). Basket entries for portions carry `parts` and `meta` (nav / footer / section from the name).
- Recording: tray shows **Cancel** (`cancelRecording`, back to the pick) until something moves, then **Stop**.
- Basket rows: number + thumbnail + name (tap = edit) + ⋯. **Copy all N** only from 2 prompts.

**Analyzer (`analyzer.js`, version 11)**
- `metaOf(el)` → `{ kind, tag, noun }`, set on every item from `collectItems` (the element it came from), defaulted to the pick (`itemsForElement`) or the region's members (`itemsForRegion`). Exported with `kindOf`.
- `areaScrollHint(band)`: cheap, no scrolling: sticky/fixed parts, `animation-timeline`, fixed backgrounds, reveal library attributes/classes, parts waiting hidden or shifted with a transition.
- `sectionScroll` measures at least 600px of scrolling (short sticky headers at the top were skipped) and reports a sticky/fixed section itself.
- `sampleScroll` records `__plScrollStart`; the panel's `abortScrollCheck` puts the page back right away and the check then skips its own scroll-back, so someone who moved on isn't yanked back later. Film `scrollBack` only runs while the pick is still on screen (`stillFor`), except a section's scroll frames (`force`).

**Prompts (`prompts.js`, version 8)**
- `header(ctx)`: change mode tells Claude to look through the site for colors, fonts, pages and real content first; values are exact except what `<fit_to_my_site>`, `<change_i_want>`, `<note>` say. Details are numbered (`<design_detail id="N">`).
- `blocks(items, opts)` numbers the details, finds `refsFor` (first color scheme and first font detail), builds `fitLines` per detail, and moves general lines (marked with `\u0001`) that appear in two or more details into the opening ("For every detail below where it applies:"), so they are said once.
- `fitLines(it, ctx, refs, n)` by kind:
  - motion (`isMotion`): `colorsIn(code)` → each color with its role from the property it is used in (`colorRole`: accent for text / fill / border / glow, text, background, border, icons; plain shadows skipped) → use my site's color in that role, or the scheme in detail N (`colorSource`); `keepColors` keeps them. Same movement on my other `nounOf(it)` of that kind (skipped when where starts with "All"); change mode: replace an existing movement, don't stack.
  - font: which elements (`nounOf`: "h1 heading", "button", "big headline", "piece of body text"; **9.2.2:** text of 30px or more that isn't an h-tag is a "big headline", from the analyzer's "Headline font" role or the font-size in the code, never body text), loading by `fontSource` (Google / system / licensed / unknown), keep my other fonts (change) or pair (new, detail N), phone sizes.
  - format (`isFormat`): `contentGuide` from `purposesIn(code)` (purposes with counts from the outline's ×N nesting and word counts) → `CONTENT` advice per purpose, icons/pictures lines, where content comes from (my site / what it's about), no invented facts; format without colors → use my colors in the same roles (or detail N); fonts → mine or detail N's.
  - color scheme (`isScheme`): into my site's color settings by role; readable text (change); blend with neighbours (sections, not nav/footer/whole site).

## v8.4: what a part shows, color relationships, one spacing system
- Panel: content parts (`structure`, `navigation`, `component`, `section`, portions with Format) get **What should it show?** (`b.content`, textarea `#content-<bid>`, example from `contentPlaceholder(b)` via `P.purposesIn`).
- Analyzer (version 12), added to every section format (`sectionReport(el, 'format')`) and to element Structure items 120px+ tall:
  - `spacingFacts(band)` → `Spacing: sides 40px · content width 1120px · top 96px · bottom 96px · title → text 24px · text → buttons 23px · between cards 24px`. Blocks = cards and leaf kinds in reading order; blocks side by side form rows; gaps are between rows. Content width = the widest capped box holding 2+ blocks (`content width`), else the measured width (`content Npx wide`, a text measure, not used for the page width).
  - `colorRelations(el)` → "Color relationships (keep these even in other colors)": dark/light part, vs the page's usual background (the most common band background by area, since many pages paint every section), vs the parts above/below (`neighbor`), gradient direction, cards vs their background (+ border/shadow), heading vs running text strength, accent count. Colors seen through rgba are blended (`over`, `anyColor`), gradients averaged (`seenBg`).
- Prompts: `<content_i_want>` per detail; the content guide then says to fill the part with it. Formats with color relationships get a (shared) line to keep them in the new colors. `sharedSpacing(items, ctx)`: with 2+ formats that have a Spacing line, a `<shared_spacing>` block after the opening: side padding (most common), content width (largest explicit), section top/bottom (most common of 24–200px values, nav/header/footer excluded), text-block gaps per pair (most common), card gap; change mode defers to the site's existing consistent spacing. A single format in change mode gets "line it up with my other sections". `refs.formats` counts them.

## v8.5: smoother picking (`picker.js` UI_VERSION 4, `panel.js`)
- Hover highlight: `.hl.glide` (90ms transitions of left/top/width/height) only between two highlighted things, never when appearing. A label (`.hl em`) names it (`nameOf`: kind via `__Huescribe.kindOf`, e.g. "Heading (h1)", "Card"; section name in section mode) with its size, above the box when there is room (`.above`).
- Scrolling no longer hides the highlight: the last pointer position (`lastPt`) is re-checked on scroll (rAF-throttled). Leaving the page hides it.
- ↑ / ↓ skip wrappers with exactly the same box, so every press visibly changes the selection. The bar mentions ↑ ↓.
- Reading feedback: `showReading(el)` pulses the box (`.hl.reading`), sets the bar to "Reading Card…" and sends `huescribe:reading` (not handled by the SW; the panel shows `#reading-status` with a small spinner, removed by the next render, on `huescribe:readingFailed`, or after 15s). Hover is ignored while busy.

## v8.6: the panel can move into its own window
- `background.js`: the docking code is now `openPanelWindow(tab, screen)` (used by the toolbar button where there is no side panel, and by the new `huescribe:popOut` handler). If the browser refuses the docked bounds (off screen), the window is created at the default place. `nextPanel(ms)` waits for the new window's port before answering, so the recorder never sees zero panels in between.
- `panel.js`: ⋯ → **Open in its own window** (side mode; `popOut`: saves the basket, asks for `screen=apply` when something is being placed, clears its own basket so it isn't archived, then `window.close()`), **Back to the side panel** (window mode with `chrome.sidePanel.open`; `dockBack` calls it synchronously from the click so the user gesture counts). `init` honours `?screen=apply`.

## v8.7: prompts per AI app
- `prompts.js` (version 9): `APPS` = claude-code (default) · claude · chatgpt · editor · builder, each `{ label, tags, seesCode, short }`; `ctx.app` comes from `state.site.app` (local storage).
- One prompt is built with tags, then `forApp(text, ctx)`: tag apps get it as is; the others go through `asMarkdown` (blocks → `### Detail N (from host)`, `**Where on my site:**`, values in a ```text fence, `**Fit it to my site:**`, `### Shared spacing`; leftover tag mentions in the opening → “Label”).
- `header(ctx)`: apps that can't see code (`seesCode: false`) are told to ask for the files instead of "look through my site"; site builders get a short two-sentence opening. `appLines(ctx)`: chatgpt "don't round or swap values"; editor "find each part in the project, reuse components and variables" (new site: shared variables first); chat apps building new: complete files.
- Panel: `#site-app` select in the site card ("I paste prompts into"), shown in the summary line; copying 3+ parts for a site builder adds a tip to the Copied notice.

## v8.8: font schemes; your own areas in screen portions
- Analyzer (version 13):
  - `fontScheme(roots)`: text elements in the roots → role (`h1`–`h6`, big numbers, body text, small text, labels, buttons, menu links, links, form fields; body = most-used running text style, weighted by text length) → dominant `textSpec` per role. Output: `Families (N)` with `familySource`, `By role`, `How they relate` (scale vs body, heading/body weight contrast, line heights, tight headings, one family). Added to `portionReport` and `portionReportGroup` when `parts.fonts`.
  - `areaSelection(region)`: from `regionRoot` go down while one child holds the area (stop when it covers 90%+ of it); several children: all of them → that box, some → `{kind:'part', parent, els}`; 2+ page bands covered (half their height or 200px) → `{kind:'span', els}`.
  - `portionReportGroup(els, parts, kind)`: span → each band's format/colors/scroll under "Part N, name"; part → "Format (only these N pieces…)", `arrangementItem` ("How they sit"), each piece's outline, color relationships (no Spacing line: a piece's padding isn't the section rhythm); fonts over all pieces.
- Picker (UI_VERSION 5): in section mode a drag runs `areaSelection`; groups get `data-pl-pick="g…-i"` per member, one outline (`sel.docRect`), `pickIds`, `group`; a group replaces single picks it includes; a click inside a group's outline removes it (`groupAt`); a click picks the highlighted `current` so ↑ ↓ work.
- Panel: Font scheme chip (on by default); rows named "Sections together (n)" / "Part of a section (n)"; jobs pass `ids` + `group`; basket entries carry `parts.fonts` and `group`; labels "… of several sections of the page, together (…)" / "… of part of …".
- Prompts: `hasScheme` (a "Font scheme:" block) counts as fonts (`refsFor`); fit lines: put each role on my matching text, load each family by its source, keep the ratios (also on phones), warn before a third family (change mode), one font scheme across details. `spacingsOf` reads every Spacing line of a detail (one per section in a span; nav/header/footer parts excluded from the section rhythm).

## v8.9: less text, clearer hierarchy (`panel.js`, `panel.css`)
- Removed helper lines that repeated the page's picker bar or stated the obvious: "Esc stops picking", the element and section hints, "Tick what you want", "Click something else…", the "Kept until you close the browser" note (only "Paste pictures 1–N too" remains, with Copy all and pictures), the site card's "Choose one…" line, the press-row and recording explanations, "Nothing has moved yet" (`#rec-count` starts empty).
- Shorter: choice subtitles, the copied notice ("Copied · paste into <app>"), scroll status ("Checking scroll…", "No scroll effect"), the reload row.
- Hierarchy block at the end of `panel.css`: names (choice, item, section row, apply card, saved prompt) larger and bolder; previews bigger (`.shot`, `.film img`, thumbs); counts, hosts, the Your prompts heading and descriptions smaller/muted; item descriptions clamped to two lines. "optional" is a muted `.field-optional` tag.

## v8.9.1: fixes from testing on real websites (`tests/real_sites.py`)
- **Test:** 20 real sites (Stripe, Linear, Apple, Vercel, GitHub, Notion, Framer, Webflow, Figma, Tailwind, Shopify, Dropbox, Raycast, Anthropic, Airbnb, Wikipedia, Duolingo, Mailchimp, Squarespace, NYTimes). Per site: pick a heading, the main button, the header, a card and a picture (only things a person could click: visible, not covered, not click-through), then click two sections and drag over an area; every pick goes to a copied prompt, checked for `undefined`/`NaN`/`null`/`[object`. Closes cookie banners and pop-ups; pages behind a bot check are reported as blocked, not failed. Runs through the workspace proxy (`--proxy-server`, certificate errors ignored, test only). Result: 19 testable sites (NYTimes blocks bots), 18 clean; Raycast only times out in headless Chrome without a GPU (every injection takes 13–15 s there).
- **analyzer `statesFor`:** selector lists split at top-level commas only (`splitSelectors`; `:is(.a, .b):hover` stays whole); `baseSelector` drops the `:not()` it leaves behind; `closest`/`querySelectorAll` go through `safeClosest`/`safeQueryIn`. A bad selector used to throw and fail the whole pick (Stripe).
- **CSS animations:** comma lists (name, duration, count, easing) are read per position; `animation-duration: auto` / `animation-timeline` = scroll-driven (“As you scroll”), never “NaN seconds”.
- **Invisible borders** (transparent color, used as spacing) are no longer described anywhere (shape item, recipes, card/button tallies, format lines); see-through text gets `color: transparent`; recipe serialization drops empty values.
- **`pageBands`:** walks up to 14 levels (GitHub nests sections 10 deep); a wrapper whose only child has (almost) its size is passed through even when painted; `kidsOf` flattens `display: contents` wrappers (Notion); full-screen `position: fixed` layers (menu backdrops, widgets) are never sections (Mailchimp).
- **picker (UI_VERSION 6):** a click with no hover outline yet picks what is under the pointer.
- **panel:** a new element pick clears the old pick (`clearSelection`), so its “click again to go inside” lock is gone; a failed pick shows “Couldn't read that part. Try another.” (`.reading-status.failed`); the first screen draws before the recorder is injected (`ensureRecorder` not awaited); while picking starts, “Getting the page ready…” shows after 600 ms, and concurrent `startPick` calls share one start.

## v8.10: one look across details (`prompts.js` version 10)
- `sharedLook(items, ctx)` adds a `<one_look>` block (Markdown: "Keep one look") to every prompt, after `<shared_spacing>`, and the opening lists it among the exceptions to "match exactly".
- With two or more details it says one value for what they disagree on:
  - **fonts:** at most two families. A font or font-scheme detail wins, otherwise the most used. Read by `familiesIn` from `font-family:`, `font:` shorthand, "Font: X, size" lines and Families blocks; generic and fallback names are ignored.
  - **accent:** one strong color. A color-scheme detail's accent wins, otherwise the most common; near-identical colors count as one (`sameColor`).
  - **corners:** one small (≤12px) and one large size (`radiiIn`; pills stay pills).
  - **shadows:** one raised shadow (`shadowsIn`, insets ignored).
  - **buttons:** when two or more details have buttons, they share one main and one secondary style.
  - **movement:** one easing (`easingsIn`); each detail keeps its own duration.
- When changing a site, every one of these points to the site's own values first.
- Details with "use my site's colors and fonts" (`fit: 'adapt'`) or kept colors don't vote.
- Always, even for one detail: reuse the fonts, colors, corners, shadows and spacing that the site or earlier prompts already set up, instead of adding near-duplicates. For a new site it also says to set them up as shared variables. Site builders get a one-line version.

## v8.10.1: recorder sweep runs after a frame
- `recorder.js` `tick()`: the `document.getAnimations()` sweep now runs in `requestAnimationFrame → setTimeout(0)` (right after a frame was drawn, when styles are already up to date) and is skipped while the tab is hidden. Calling it at any other moment forces a synchronous style update; whatever that sets off is reported with our stack. Seen on YouTube: another extension's `@font-face` (its fonts not web-accessible) failed to load, and Chrome listed "Unsafe attempt to load URL chrome-extension://<other id>/fonts/…" under Huescribe with `recorder.js (sweep)`. Huescribe itself ships and loads no fonts. `sweepTimer = -1` while waiting for the frame, so `start()` can't begin a second loop.
- Not reproducible in headless Chrome (that message only appears in the extensions error list).

## v8.11: formats are layout only, and say where they sit
- **Layout-only outline:** `outline(root, { bare: true })` sets `bareMode` while it runs.
  - Text lines say only `text size Npx` (no family, weight, letter spacing or color).
  - Buttons say `filled` / `outlined` (no color). Boxes say `own background` (no color).
  - Borders give their width only; a shadow is `raised (shadow)`; a decoration has no paint.
  - Used by every format: `structureItem`, the navigation bar, `sectionReport`, and parts of a section in `portionReportGroup`.
- **Other format items:** the shape item gives border width and style only, and its color is a new "Border color" item under Colors. "What the … have in common" drops background, gradient, shadow and border color. `colorRelations` counts accents without listing their hex codes.
- **`positionFacts(first, last)`:** a "Position on the page" block in each format.
  - For a section: its place in the page order, what's directly above and below (`neighborName`), the overlap with or gap from the part above, width (edge to edge, or N px centered/left/right), and sticky/fixed.
  - For a part inside a section: where it sits in that section (`placeWords`), what comes just before and after, and whether it's centered.
- **prompts.js `fitLines`:** "Keep its place relative to the rest of the page…" when a detail has "Position on the page". For a format without a color or font scheme in the same detail, it says it copies the layout only, with fonts and colors coming from detail N's scheme, my site's own, or the other details'. Text sizes stay as a hierarchy.

## v8.11.1: prompts end by making the AI prove its changes
- `closing(items, ctx)` appends `<when_done>` (Markdown: "When you are done") after the details, in `buildSupplemental` and `combine`.
- It says to make every change for real and never describe one that wasn't made.
- With a format: check each layout against its outline (same parts, order, arrangement, widths, gaps) and rebuild it if it differs; changing only sizes is not enough.
- At the end, list every detail by number as old → new, or say it already matched and show the values.
- Apps that can't see the code also get: return the complete updated files and say which file each replaces.
- Site builders get one line.
- Why: a ChatGPT test reported typography, spacing and border changes, and the page looked the same.

## v8.11.2: decision audit; "All of it" group
- `tests/audit_decisions.py` checks every decision in user_commands.md against the source. It checks that each kept feature is present, and that what was removed on purpose (e.g. the v8.9 helper lines) is gone. 58 checks.
- **Found:** "The whole button / card / area / look" (copy-everything items with fonts and colors) were listed under Format, against the v8.11 rule that formats are layout only.
- **Fix:** they're in their own group, `GROUPS.all = 'All of it'`, shown last in `GROUP_ORDER`. In prompts.js, `component`/`section` items don't get the "layout only" line.

## v8.11.3: things raised in passing, now changed
- **Site question:** the "what is it?" field shows only for Building a new site. Change prompts leave `about` out (`forMode` in prompts.js, at `buildSupplemental`/`combine`). The summary line shows it only for a new site.
- **Chat apps (can't see the code):** use the files already given in this chat and start; otherwise ask once for the fewest files that hold the parts involved plus the colors and fonts (for a one-page site, just its HTML file), not the whole project. This is in reply to ChatGPT asking for four categories of files or a zip.
- **Audit:** `tests/audit_decisions.py` now has 61 checks.
- **Screens guide:** retaken and republished on this version.
- **Real-site test gallery:** published from the saved runs (newest run per site).

## v9.0: one list, always-on picking, five choices (current structure; replaces the screens described above)
**Panel screens** (`panel.js` `SCREENS`): `home` (My list), `pick` (an element), `secpick` (a section or dragged area), `record`. Gone: `element`, `sections`, `apply`, the site card, Your prompts / Copy all / restore, the change/add toggle, the "use my site's colors" box and the text-part checkboxes.
- **Header:** `#app` button, the one setting (`state.site = { app }`, `setApp`, `paintAppButton`). "New site or changing" and "what is it" are gone.
- **Picking:** always on (`go()` starts it on every screen except `record`). `state.pickPaused` after Esc, until Start picking. After a reload or navigation, `tabs.onUpdated` (loading) clears `state.picking`, and `complete` refreshes the tab and goes home, which restarts it. On browser pages the failure is quiet.
- **The list:** it is `state.basket` (session storage). Each entry has `row`, `rowTitle`, `rowShot` and `group` (Colors…). `rowsOf` groups entries; `rowCard` shows one row with an optional where (chips from `whereChips`), an optional "What should it show?" (`holdsContent`), and ⋯ (Adjust, Copy just this, Copy picture, Move up/down, Remove). `copyPrompt` sends `P.combine` of all rows with numbered pictures (`rowPicture`). The list stays after copying; ⋯ → Clear my list.
- **Migration:** v8 `saved` prompts and rowless basket entries become rows once (`ensureRows`, in `init`).
- **Element pick card:** `renderItems` with a switch per group (`groupToggle`: aria-pressed true/false/mixed) and `refreshGroupHead`. The tray reads Add to my list. `addSelected`: Colors ticked → `keepColors` on Motion items and the text color kept; otherwise the user's site decides.
- **Section / area pick card:** `openSectionPick`, `renderSectionPick` (chips: colors, fonts, format = Layout, scroll = Motion, all = Everything), `sectionToList`. The scroll hint is `areaScrollHint` OR the recorder already saw a scroll reveal inside (`groupsWithin`, trigger scroll). "Single parts instead" calls `ui('pickByPath', path)`.
- **Menus:** stay open on scroll (they scroll with the page) and open upwards near the bottom.

**Analyzer** (version 14):
- `GROUPS` → Colors / Fonts / Layout / Motion / Everything.
- `isSection(el)` (in `pageBands`).
- `pageBands` sorted by page order (sticky bars no longer reorder sections); no gap measured next to a sticky or fixed part.
- `sampleScroll`: each check listens only for its own stop (`__plScrollStops` by pick id, `__plScrollFor`).

**Picker** (UI_VERSION 8): one mode.
- A click goes to `pickThing`: a section (`isSection`) becomes a section pick, anything else an element. The click uses what is under the pointer; the highlight wins only when it is that thing, or ↑ ↓ of it.
- A drag goes to `areaSelection`: one thing (section or element), or a group.
- Section and area picks pulse while being read, outline and lock like element picks, and report failures.

**Panel previews:** `bringIntoView(ref, v)` never scrolls for a pick that is no longer shown. `openPick` and `openSectionPick` stop the previous pick's scroll check.

**background.js:** a panel closing leaves the page alone while another Huescribe panel (the moved window) is still open.

**Prompts** (version 10). One opening for both situations: change my site, or build it if there is none. The "no site yet" rule is said once (own values, ask what it's about, shared variables), so lines have no per-line exceptions, and "reuse what my site has" is in the opening. `forMode` keeps only the app. No `<task>` except for whole-site details. `<one_look>` only when the details disagree. Shorter fit lines and closing. Measured on the same list (a heading font + a section): 6,702 → 5,665 characters for Claude Code (−15%), 7,061 → 6,068 for ChatGPT (−14%).

**Tests:** `tests/e2e.py` was rewritten for this flow (192 checks; two clean runs). Helpers: `fresh` (empty list), `pick_at` / `pick_el` (wait until the target is under the pointer; a section becomes single parts), `section_pick` (↑ until "Section:"), `chips`, `drag`, `to_apply` (Add to my list), `copy_prompt` (the whole list).


## v9.0.1: list pictures in IndexedDB; better outlines
- `saveBasket` / `loadBasket` (panel.js): the list goes to `chrome.storage.session` without `shot`, `rowShot` and `frames`; those go to IndexedDB `huescribe` / store `pics`, keyed by `bid`. Session storage has a 10 MB quota that a list of 6–8 picks with pictures filled.
- `boxName` (picker.js): names a plain container by what it holds. A top strip (pinned, `header`, or < 160px tall and full width at the top) is a Top bar first.
- `carouselOf` (analyzer.js): ≥3 same-shaped siblings, one row, spanning ≥1.4× the visible width → "carousel — N slides…". `spacingFacts` ignores blocks outside the section's box.
- `isVideoFrame`: iframes from video players are kind `image`, named "video", and pass `shown()`.
- Outline `sig` includes whether a sibling holds a picture, a heading or text; `bigInline` keeps inline-block tiles out of text lines.
- `purposesIn` (prompts.js) reads only outline lines (it skips Position, Spacing, Color, Font blocks).

## v9.0.2: colors of a box; the navigation bar is layout only
- `collectItems`: a picked element with ≥3 descendants gets a `palette` item "Its colors" = `colorReport(root)`.
- Outline `bigInline` also covers buttons and painted inline-blocks, so a filled link inside a wrapper isn't flattened into text.
- `navRootFor`: if nothing inside is a header/nav, a surrounding header of about the same width (≥50% of its height) counts.
- `navItem`: fill yes/no instead of colors; link styles as size/weight/spacing; the logo is found anywhere and placed left/centered/right; icon buttons named; "menu behind a button" when a burger is visible.

## v9.0.3: real-site test for v9; picking and naming fixes
- `wholeText`: a ≤32px icon (svg, img, i, empty span) inside a button/link (≤600px wide) resolves to the control.
- `textStyle(el)`: when a wrapper has font-size 0, the first text-bearing descendant's style is used (outline lines); `recipe`/`textSpec` skip font and spacing for size 0 (no NaN).
- picker `nameOf`/`boxName`: text inside a heading → (Main) heading; a narrow `<header>` → boxName; pieces of a card (≤3 levels up) → Top/Bottom/Part of a card; framed block with an icon and ≥3 words → Card.
- tests/real_sites.py: v9 flow; `ODD` patterns mark descriptions that went wrong.

## v9.1: premium pass (panel.css end block, picker.js styles)
Research used (Nov 2026): Rauno Freiberg's Web Interface Guidelines (interfaces.rauno.me), Jakub Krehel's "make interfaces feel better", Linear's speed/keyboard-first approach, Chrome's side panel guidance. Applied:
- Motion: one easing `--ease-out: cubic-bezier(.16,1,.3,1)`, ≤200ms; screens fade/lift 4px with a 20ms stagger; menus pop from their corner; the new row glows once (`state.freshRow`); all off under reduced motion.
- Press: `scale(0.96)` on buttons and chips (0.98 on menu items).
- Surfaces: hairline borders (`--border-soft`), layered shadows (`--shadow-sm/md/lg`), frosted header and tray; inner radii = outer − 4px.
- Focus: one ring as box-shadow (`0 0 0 2px bg, 0 0 0 4px ring`) on every control; the script-focused title has none.
- Type: antialiased, `text-wrap: balance/pretty`, tabular numbers, styled `::selection`, thin scrollbar.
- Keyboard: ⌘/Ctrl+Enter clicks `#tray-btn`; the key cap is a pseudo-element from `data-kbd`, so the label text stays the label (tests read it).
- Feedback near the trigger: `.btn.copied` turns the copy button green with a check for 1.4s.
- Loading: preview placeholders shimmer (`.film-ph.loading`) instead of a dashed "Loading…" box.
- "Picking is on": live dot + key caps instead of a filled purple box; the empty list is an invitation.
- On the page (UI_VERSION 10): frosted pill bar with key caps, 1.5px highlight with a soft halo, labels with depth; a picked section's label sits in the top-right corner.

## v9.1.1: closing the sidebar always clears the page; a clear "copied"
- Bug: an MV3 service worker sleeps after ~30s without events. The panel's port then dropped, the panel never reconnected, and the worker lost `panelPorts`/`pickingTabs`, so closing the sidebar later reached nobody and the highlight stayed on the page.
- Fix, three layers:
  1. `connectPort()` (panel.js): posts `{ ping }` every 20s (an event, so the worker stays awake) and reconnects 200ms after any drop, re-sending the tabs it picks on (`state.pickingTabs`).
  2. background.js keeps the picked tabs in `chrome.storage.session.pickingTabs`; `cleanUpTabs()` clears stored + in-memory tabs when the last panel closes. `popupPicking` marks popup mode (picking must survive the popup closing).
  3. picker.js watchdog: every 3s (visible tabs only) asks `huescribe:panelOpen`; the worker answers open for 6s after a restart (so a reconnecting panel isn't missed) and in popup mode. A "no" or an invalidated extension context removes Huescribe from the page.
- Copy: `copyPrompt` relabels `#tray-btn` "Copied" (green) for 2s, calls `ui('toast', …)` on the page, and `copiedCard()` shows parts/characters/pictures and numbered next steps.

## v9.1.2: colors in proportion, no invented gradients, fonts held to the scheme
- Report from a real build: the AI used the accent as the main background, added gradients that weren't on the source, and didn't follow the font scheme fully.
- Causes and fixes:
  - A color list had no sense of size, so an accent read like any other color. `colorShares(band)` (analyzer.js) measures how much of the section each fill really covers: each painted box's area minus the painted boxes on top of it, clipped to the section; photos count as "photos and pictures", gradient text doesn't count. `colorReport` prints the shares; the biggest one is marked "(the background)", and a strong color under 12% is marked as an accent for small details only.
  - "Gradients and decorations" listed plain fills, invisible layers and white overlays. Only real effects are listed now: gradients, blurs, and see-through glows with opacity ≥ 0.15. Otherwise the report says "flat colors only; add none", or "only the gradient fills listed above" when the background itself is a gradient.
  - A button's "Background color" was told to "blend its edges into the sections". An element's color is now titled "<noun> fill color", and the prompt says to use it only on that kind of element, never as a page or section background. "Its colors" of an element stay inside that element.
  - Prompt rules (prompts.js): colors keep the listed shares; accents stay on small details; no unlisted gradients or colors. Fonts: only the listed families, roles, sizes and weights; text with no role takes the body family. On a new site, the color and font schemes apply to the whole site.

## v9.1.3: colors shifted slightly; richer color relationships
- `shiftColors(text, seed)` (prompts.js), applied in `combine`: every hex/rgb(a) in the prompt is moved the same way — hue ±5–9° (only for colors with saturation > 4%), saturation ×0.94–0.98, lightness 1–3 points toward the middle (less near pure white/black), alpha kept. One mapping per prompt (cached), so equal colors stay equal and relations hold. The seed is a hash of the list's ids, so copying twice gives the same text. `SHIFT_NOTE` tells the AI the values are shifted on purpose and win over pictures. Tests set `globalThis.__plNoShift` to compare exact values; one check copies with the shift on.
- Note: single colors and palettes are generally not protected by copyright (trademarked brand colors can be); the shift is a precaution and also stops an AI from "correcting" to a brand's exact color.
- `paletteFeel()` (analyzer.js) adds to "Color relationships": the neutrals' tint (warm, cool, pure gray), WCAG contrast of headings and body against the background, whether the text is pure or a soft near-black/off-white, the accent's vividness, temperature and family against the background tint, and how colorful the part is overall. Filled links now count as accent sources.

## v9.1.4: no "Everything"; motion colors as precise relations
- The Everything group (`GROUPS.all`: "The whole <thing>", "The whole area", "The whole look") and the section chip "Everything" are removed; four choices remain (Colors, Fonts, Layout, Motion). Old saved rows of those types still render.
- Motion items (hover/click states, recorded and CSS animations) never carry color values. `relateMotionColors(code, restColors, bgBehind)` (prompts.js) replaces each color with:
  - **A relation**, picked in this order:
    - to the same property at rest: `restColors` comes from analyzer `restColorsOf()` on state items;
    - otherwise to the first keyframe ("starting");
    - otherwise its job on my site (accent, lightest background, text color, gray, shadow).
  - **"On the original: …"**: `describeColor()` gives the kind (vivid/clear/muted, warm/cool, hue name or near-white/near-black/gray), its lightness %, how see-through it is, and its WCAG contrast against `bgBehind` (`seenBgSolid` of the element that changes).
  - **Rules:**
    - colors within ~6 lightness points with a similar hue count as the same color ("slightly lighter" or "almost unchanged");
    - very dark or very light colors count as neutrals, not accents;
    - see-through → solid reads as "fills in";
    - transparent stays "transparent".
- Scroll changes (`colorChangeWords`, analyzer.js) use the same kind of words, with lightness and "the same as the page background".

## v9.2: premium redesign; the list clears after copying
- **Look** (panel.css, last block):
  - The page is warm off-white `#fbfbfa` with white cards, plus an inset `--well` for status, tips and next steps. Dark mode is `#0b0b0d` with lifted cards that have a faint top highlight.
  - Primary buttons are monochrome (`--action`: near-black in light mode, near-white in dark) with a soft inner light. The violet is now only the accent: focus ring, switches that are on, selected chips, the live dot.
  - The four group toggles are drawn as switches (`.group-toggle::after` = track and knob; mixed = half). Section parts are a segmented control with a check. Small chips that are on use the soft accent, not solid purple. List rows have numbered tiles, and the font stack is Inter-first.
- **Clear after copy**: `copyPrompt` keeps `state.lastCopy` = {basket, text}, empties the list (unless `state.keepAfterCopy`, which tests set to copy one list several times), and `copiedCard` shows "Copy again" and "Undo".
- **Gotchas**:
  - `go()` hides the tray until the screen is drawn, so the "Copied" button state checks `state.basket.length`, not `tray.hidden`.
  - A second copy within 2s clears the first copy's timer (`state.copiedTimer`), so the old timer doesn't end the new "Copied" moment.

## v9.2.1: alignment and placement; fixes from a real prompt (risd.edu + cursor.com)
- Outline text lines say `left-aligned` / `centered` / `right-aligned` / `justified` (`alignWord`, start/end follow direction). Boxes narrower than their parent say where they sit (`placeAcross`: on the left / centered / on the right of its parent, measured inside the parent's padding). Stacked boxes whose narrower children share an edge say "lined up on the left/center/right". Cursor's hero now reads "max-width 658px; on the left of its parent … left-aligned"; before, an AI centered it.
- Not design, no longer offered: `clip-path: inset(50%)` / `clip: rect(0 0 0 0)` / 1px boxes (screen-reader-only text).
- `gap` "normal 10px" → real values: layout items give one usable value; `arrangeWords` uses the column gap for rows and the row gap for stacks.
- Section with no fill: "none of its own; the page background #… shows through" instead of "browser white".
- Running text = the color most longer copy uses (not text in buttons or links); each text's contrast is measured against `seenBgSolid` of that text (was the section, giving 1.0:1 for white button text). Accents within 25° of hue and 0.18 of lightness are one accent, counted by use.


## v9.3.0: hover-and-press test (`recorder.js`, `picker.js` UI_VERSION 12, `panel.js`, `motion.js`, `prompts.js`)
- **Recorder, step by step** (replaces the one-call hover; `catchHover` remains as a wrapper): `pointerBegin(sel)` dispatches pointer/mouse over/enter/move, adds capture listeners that block *untrusted* `click` / `submit` (a page turning a press into a click), opens a phase `hover-js` (`rec.pointerTest.phases`, `rec.forced`) and returns the element's rect; `pointerPress(true|false)` dispatches pointerdown+mousedown / pointerup+mouseup (never `click`) and opens a `press-js` / `hover-js` phase; `pointerEnd(settle)` dispatches out/leave, stamps `forcedTrigger` on recorded animations by phase, removes the blockers and returns `{ hover, press }` groups.
- `onPress` ignores untrusted presses (ours), and a **trusted** press while a test runs ends it (`pointerEnd(0)`), so the person's own click always works. `startRecording` also ends a running test.
- **Panel** `catchHoverFor(view)`: runs after the film queue (so the cursor and CSS states stay out of pictures). `pressable` (existing check) minus text inputs/textarea/select/contenteditable → hover only. Sequence: `pointerBegin` → `ui('testCursor','enter', rect)` → 450ms → CSS `On hover` items shown via `playState(still)` → 900ms → (pressable) `testCursor('press')` + `pointerPress(true)` + CSS `On click` items → 600ms → restore + `pointerPress(false)` + `testCursor('release')` → 300ms → restore hover CSS → `testCursor('leave')` → `pointerEnd(500)`. New groups become cards; `view.pointerTest` drives the status row `#pointer-status` ("Testing hover and press…"). `finally` always ends the test and hides the cursor. Steps stop when the person leaves the pick.
- **Picker** `testCursor(phase, rect)`: `.tc` arrow glides in from below-right (cubic-bezier(.16,1,.3,1), .55s), `.down` scales it and pulses a ring, label "Testing hover" / "Testing press"; hidden under `.capturing`; reduced motion: no glide/pulse.
- **Words**: motion.js `WHEN['press-js'] = 'On click'` (and press-js gets the interaction names), prompts.js `WHEN_WORDS['press-js']` = "while it's pressed (and plays back when released)".
- **Tests**: fixture `#jsp` (button) and `#jsl` (link to empty.html) with JS hover (translate) and JS press (scale) effects; e2e checks the cursor shows and presses, the status row, the cursor goes away, hover and press cards both appear, the press prompt wording, and that the link never navigates.

## v9.3.1: hover movement in the panel (`panel.css`)
- New block at the end of panel.css, only under `(hover: hover) and (prefers-reduced-motion: no-preference)`: `.btn`, `.hero-btn`, `.app-btn`, `.icon-btn`, `.row-more`, `.action`, `.choice` and chips (not group toggles) lift `translateY(-1px)` on hover (`:not(:active)`, so the press squeeze still wins); the main button gets a deeper shadow; `.item` / `.row-card` lift with `--shadow-md`; `.pick-row`, `.saved-main`, `.menu-item` slide `translateX(2px)`; playable films scale 1.02. The same `--dur` (160ms) / `--ease-out` as the press feedback; transform added to the transitions of the rows and cards.

## v9.4.0: website look + "My instructions" (`panel.css`, `panel.js`, `prompts.js`, `fonts/`, `icons/`)
- **Look**: a block at the end of panel.css sets the website's tokens: `--background #fcfcfc`, `--action #b9d96a` / `--action-hover #a3c452` (main buttons, pill-shaped, ink text 11.5:1), `--primary #5b6f2a` (lines, links, focus), `--accent-soft #f2f8e3`; active toggles are green (group toggles excluded); the title uses Newsreader, self-hosted from `fonts/newsreader-latin.woff2` (OFL, `fonts/OFL-Newsreader.txt`; no network); `::selection` is green. Icons are drawn by `tools/make_icons.py` (green rounded square, ink chevron and lift arrow). picker.js labels use the green with ink text (UI_VERSION 13).
- **My instructions**: `customBox()` renders a `details.section.custom` on the home screen (under the list, also when it's empty) with `#custom-prompt` (max `P.CUSTOM_MAX` = 2000 chars). Typing sets `state.site.custom` and saves `chrome.storage.local.customPrompt` 400ms later (`saveCustomSoon`); a failed save logs `[Huescribe] could not save my instructions` and says so under the box. `init()` loads it into `state.site.custom`.
- **Prompt**: `forMode` keeps `custom`; `withCustom(text, ctx)` inserts `<my_instructions>…</my_instructions>` right before the last `<when_done>` (or appends it) in both `buildSupplemental` and `combine`. In `combine` it is added **after** `shiftColors`, so colors the person types stay exact. `asMarkdown` turns it into "### My own instructions" for apps that read markdown. `HuescribePrompts.version` = 11.
- **Tests**: e2e checks the box exists; nothing is added when empty; the text lands before `<when_done>` word for word with color shifting on; it is saved and the box says On; clearing removes it. The test blurs and closes the box afterwards: leaving focus in the panel's textarea made the later JS hover-and-press test miss the hover phase (test-order effect, not a product bug: the person's pointer is never in the panel while testing the page).


## v9.4.1: "lift" wording
- Where the panel talks about taking a design, it now says "lift" instead of "copy": the title "Pick what to lift", the tray hint "Choose what to lift", the chip group label "What to lift", the empty list ("ready to become one prompt"), the first-run steps, and the My instructions hint ("every prompt you make"). Buttons that put something on the clipboard still say Copy ("Copy prompt", "Copy again", "Copy picture"), because that is literally what they do.
- Tests wait for the title "Pick what to lift" (tests/e2e.py, tests/screenshots.py).

## v9.5.0: the panel matches the website (Version B)
- **Main button label:** `setBtnLabel(b, label)` in panel.js writes it as `span.roll > span.roll-in[data-t]` plus `span.arw` (a Lucide arrow-right icon).
  - On hover the label rolls up: its twin is the CSS `::after` of `.roll-in` (`content: attr(data-t)`), so `b.textContent` is still exactly the label (tests and the "Copied" logic rely on this).
  - The arrow opens out on hover and on keyboard focus.
  - Always set the tray button's label with `setBtnLabel`, never with `textContent`.
- **Colors:** hover is lighter (`--action-hover` #cbe38a) and pressed is lighter still (`--action-active` #dcecb0). Outline and ghost buttons lighten too. Dark mode has its own values.
- **Type:**
  - Titles use Newsreader at 1.3125rem.
  - List numbers are two digits in JetBrains Mono 500 (`fonts/jetbrains-mono-500.woff2`, OFL, bundled; nothing loads from the network).
- **Details:**
  - Switched-on chips use the site's green tint with a green edge.
  - Highlighted text is white on #5b6f2a.
  - Corners are 12px (`--radius: .75rem`).
- **Flower photos:** `images/flowers-lavender.webp` (17 KB) as a band above the empty list, and `images/flowers-cosmos.webp` (58 KB) across the top of the "Copied" card. Both are from Unsplash (Daniel Klein, Angel Luciano; Unsplash License).
- **Styles:** all in the "v9.5.0" block at the end of panel.css.

## 10.0.0: Huescribe

- **Rename:** PromptLift → Huescribe in every file. Internal ids changed with it: message types `huescribe:*`, the page root `#__huescribe-root`, globals `__huescribe*`, `HuescribeMotion` / `HuescribePrompts` / `HuescribeAdjust`, `__Huescribe` (analyzer), the recorder content-script id `huescribe-recorder`, IndexedDB `huescribe`. Nothing was published under the old ids, so there's no migration. The project folder is now `huescribe/`.
- **Manifest:** name "Huescribe: turn website design into AI prompts" (46 chars), description 123 chars (the store summary limit is 132), version 10.0.0.
- **Store localization:** `_locales/<lang>/messages.json` (`appName` ≤ 75, `appDesc` ≤ 132 chars, `en` + 14 languages) carry the store name and summary, written for search in each language ("Huescribe: " + the native phrase for "copy a website's design as an AI prompt"); the matching full descriptions are `../store/listing-<lang>.md`. Wording follows the website translations (`../homepage/i18n/site/<code>.json`: Colors/Fonts/Layout/Motion, My list).
- **Icons:** [tools/make_icons.py](tools/make_icons.py) draws logo 03 (four petals around a smiling center, from `logo/mono/mark-3-black.svg`) on a rounded tile in the brand green #B9D96A, via `rsvg-convert`. It writes `icons/icon{16,32,48,128}.png`, `icons/icon.svg` (not shipped) and the store icon `../store/icon-store-128.png` (artwork in the central 96×96).
- **Wording:** panel strings listed in user_instructions.md under 10.0.0. Tests that wait for the choice screen look for "What do you want from it?".
- **Store kit:** [tools/make_store_assets.py](tools/make_store_assets.py) builds the 1280×800 screenshots and the 440×280 / 1400×560 promo tiles (wordmark in Inter Semibold, the logo font) from the captures of [tests/screenshots.py](tests/screenshots.py), which now loads the fixture site as `http://acme.dev/` (`--host-resolver-rules` maps it to 127.0.0.1:8001) so captures show a normal address. The listing texts, privacy answers and permission justifications are in `../store/STORE-LISTING.md`.
- **"Picked" wordmark (raster):** [tools/wordmark.py](tools/wordmark.py) `draw_picked()` draws "Huescribe" with one even tracking for every letter (default .01em) and puts the outline around the ink of "Hue" on its own layer, halfway between "e" and "s", so the box never adds space. The bottom-right handle hangs below the box (where "s" has no ink). The web version (homepage footer, logo page) uses the same idea in CSS: a `.pl-wm-box` / `.box` layer placed from Inter 600's measured bearings in em (H left .0757, e right .0426, s left .0437).
- **Package:** `huescribe.zip` holds manifest.json at the root plus the scripts, panel files, icons (PNG only), fonts and images; no tests, tools or docs.

## 10.1.0: animation performance (picker.js, panel.css)

- **Overlays move by transform:** `.hl`, `.box`, `.sel` and the test pointer `.tc` sit at `left:0; top:0` and are placed with `transform: translate3d()` (`place()`, `moveTc()`); the highlight's glide transitions `transform`, `width` and `height`. `.hl/.box/.sel` have `contain: layout style`. Overlay UI version is 14.
- **Pointer work once per frame:** shield `mousemove` keeps only the latest point and looks up the element in one `requestAnimationFrame` (`hoverRaf`); drag-box updates likewise (`dragRaf`, `pendingDrag`). `mousedown` calls `flushHover()`, which settles a still-pending hover right away so a fast click acts on what's under the pointer. It does nothing when no hover is pending, so a highlight grown or shrunk with ↑/↓ isn't reset.
- **Chosen outlines:** the rAF loop still follows the page (scroll, reflow), but writes styles only when an outline's rect changed (`node._plKey`); a still page costs one measurement per frame and no style work.
- **"Reading" pulse:** fades a `::after` layer's opacity (was an animated background color, repainted every frame). The chosen outline's entrance is a plain fade (no scale on an element with a page-wide shadow).
- **panel.css:** dropped `filter` from the button transitions (the brightness hovers were replaced in 9.5.0). The looping animations (spinner, live dot, shimmer, record blink) already use only transform/opacity. Left as is: the arrow reveal on button hover (width, 280ms, one button) and the one-shot fresh-row ring (box-shadow, 1.6s, one card).
- Tests: tests/e2e.py adds six checks: the highlight sits on the element it names and is placed by transform, 200 moves in one go settle on the right thing, a click in the same frame as a move uses what's under the pointer, a still outline gets no style writes, and the outline follows a scroll.

## Screenshots and demo video (2026-11-19)
- `tests/app_screenshots.py`: every panel state plus the page, side by side (1280+380 @2x), on the made-up demo site `/home/claude/demo-site` (served on :8003, mapped to `http://fieldnote.app/` with `--host-resolver-rules`). The mouse is parked just outside the page so no stray outline shows.
- `/home/claude/demo-video/record.py` → frames (CDP `Page.startScreencast` on the site and the panel, timestamps in file names) + `marks.json` (scene starts, stretches to cut). A cursor is drawn in the page's top layer (headless Chrome draws none). Each scene lasts at least its voice line.
- `/home/claude/demo-video/assemble.py stills` renders check frames; without arguments it encodes one file per scene (rawvideo pipe → x264 CRF 18, veryfast), joins them with the concat demuxer, and adds the voice track (Kokoro ONNX from Hugging Face; voices built into `/tmp/tts/voices.npz`). Changing a line: edit `lines.json`, regenerate that `vo-*.wav`, re-run assemble.

## 10.1.1: selection color (panel.css)
- The last `::selection` rule in panel.css wins: light `#d6eb9a` / `#151515`, dark mode `#b9d96a` / `#151515`. The website (design file, legal.css) uses the same light color.
- 10.1.1 also: `openMenu` draws an icon only for `icon: 'check'`/`'blank'` (the AI-app menu); decorative `svg()` calls removed from the empty state, notice, press/reload rows, hero button, single parts, slow motion, Adjust summary (now a `down` chevron that rotates), Undo changes, the read-failed line and the text "Copy picture" button. `.tray .btn span { color: inherit }` stops `.tray span` (muted) from greying button labels.

## Website hero demo, "first app view" (2026-11-22)
- Generated by [`../homepage/patches/round_nov22a.py`](../homepage/patches/round_nov22a.py) into the design file between `<!-- hero demo start/end -->` and `/* hero demo css start/end */`; re-run it after changing anything (it replaces its own block). Timings are seconds in the script (`T = 14.5`, `WAYPOINTS`, the `kf()` calls); keyframe percentages are computed.
- The AI app window is a dark code editor (files, `pricing.css` diff, agent chat: pasted prompt, Thinking…, Read/Edited steps, reply, preview, input). Its chrome is `translate="no"` and `dir="ltr"` (i18n_site.py skips `translate="no"` subtrees); only the pasted prompt lines and the reply are translated. Every state holds until `END` and then resets.
- Pause on hover applies only to mouse devices. [`round_nov25e.py`](../homepage/patches/round_nov25e.py) resumes every hover-pause rule under `@media (hover:none),(pointer:coarse)` and hides `.pl-pausehint`, because on phones a tap leaves `:hover` stuck. New hover-pause rules need a matching line there. The same patch also sets the section spacing: 128px between big sections on wide screens and 96px at ≤900px, through `!important` overrides of the sections' inline padding.
- The made-up site (Fieldnote): drifting blobs (`.pl-h-blob1-3`), "New" pill, icon tiles, raised Pro card, prices flip to yearly with the switch (`.pl-h-pm` / `.pl-h-py`), avatars + stars row.
- The loop: pick the pricing section (Colors + Layout), the headline (Fonts), the Monthly/Yearly switch (Motion → Recording → press → "1 movement caught" → Stop); switch the AI app Claude Code → Cursor in the header menu; Copy prompt (3 parts) → Copied card; the Cursor window slides in, four prompt lines type out, "pricing.html updated" and three small new cards pop in. Sheets slide over the list (`--pl-dir` flips the direction in RTL).
- The pointer's stops are CSS variables (`--pl-x-<target>`, `--pl-y-<target>`) on `.pl-h-body`; a tiny inline script measures each `data-pl-t` element (offset chain, so sheet transforms and CSS zoom don't skew it) on load, font load and resize. Without the script the desktop defaults in the CSS apply.
- ≤900px: no pointer, chips 2×2, the Cursor window sits under the demo and stays visible; ≤640px: the panel goes under the site. Reduced motion: the end state (three outlines, Copied card, Cursor window with the result). Hovering pauses everything.
- New strings are in `i18n/site/*.json`; the language-picker names, `Claude Code ⌄`, `Cursor ⌄` and `Aa` are in `KEEP` (never translated).


## 10.2.0: welcome practice (onboarding by doing)
- `welcome.html` / `welcome.css` / `welcome.js`: opened by `background.js` on `onInstalled` with `reason === 'install'` (not on updates), and by the panel's ⋯ → "Practice (1 minute)" and the first-run tip's button (`openWelcome()` in panel.js, a new tab next to the current one).
- Extension pages can't be scripted, so the real picker can't run there: the page holds a made-up site (Fieldnote) and a working copy of the panel. `PARTS` lists each pickable part (`data-pick`: nav, head, toggle, cards, pro) with its groups and values. Steps: 0 pick (dashed hover outline + label, solid when picked; Enter/Space work too) → 1 chips (Add waits for one) → 2 list + Copy prompt (`buildPrompt()` writes real `<design_detail>` blocks to the clipboard) → 3 a dark AI-app window: a real paste (`paste` event) or "Paste it for me", then send → Thinking…, Read/Edited steps, reply → 4 a looping toolbar animation (puzzle → pin → icon), Alt+Shift+P, "Open Huescribe" (`chrome.sidePanel.open` from the click) and "Practice again".
- Wait 3 s on a step and a pointer (`#ghost`) glides to the next thing to click. Reduced motion: no pointer, no loops.
- Language: the same `i18n.js` autoload as the panel (`huescribe.uiLang` mirror); the corner `<select>` saves `uiLang` and reloads. Strings go through `t()`/`tn()`/`tk()`; `tools/i18n_strings.js` now also reads `welcome.js`.
- The panel on the welcome tab says "You're ready / Open any website and click a part you like" instead of "Open a website first".
- First-run tip in the panel (`tipCard()`): a CSS loop (`.tip-loop`: a block gets picked, chips appear, one turns on, Copy is pressed) + "Click → Choose → Copy" + Practice / Got it (`#tip-ok` kept for the e2e).
- Test: `tests/welcome_test.py` (desktop 1280, phone 375, Arabic): opens on install, short line, waiting pointer, hover outline, pick → 4 choices, Add disabled until a choice, two rows, real clipboard prompt, real Ctrl+V paste, send → reply, last step, no sideways scroll, buttons ≥44px, no page errors (a missing locales/<code>.js is noted, not failed).

## Security hardening (2026-11-22)
- **Messages** (`background.js` `refuse()`): every runtime message is checked before its handler runs. It must come from Huescribe itself (`sender.id`). Extension pages (panel, welcome) may send anything; content scripts only from the top frame of a real tab and only about their own tab (`msg.tabId` must equal `sender.tab.id`). `popOut` / `ensureRecorder` are panel-only. `tabId` must be an integer, a `fetchCss` URL a string ≤ 4096 chars, a pick ≤ 8 MB. Refusals answer `{ ok: false, error: 'refused' }` and log `[Huescribe] refused …`.
- **Panel port:** only `panel.html` of this extension may open the `panel` port (it stops picking on close); anything else is disconnected.
- **CSS fetch:** no cookies, no referrer, http(s) only (also after redirects), and only stylesheet-like content types (`text/css`, `text/plain`, `application/octet-stream`) are returned to the page.
- **Manifest:** explicit CSP for extension pages (`script-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`) and `minimum_chrome_version` 116 (side panel open from a click). No `externally_connectable`, no web-accessible resources, no remote code, no `eval`.
- **Website** (`homepage/export/build_site.py` → `_headers`): strict CSP (`default-src 'none'`, scripts from the site plus the demo-pointer inline script by SHA-256 hash, recomputed every build), HSTS 2 years, `X-Frame-Options: DENY`, COOP/CORP same-origin, a Permissions-Policy turning off camera, mic, location, payment, USB, topics. Checked by loading every page under the policy: no violations.
- **Tests:** `tests/languages_test.py` (all 14 languages end to end) runs with polling instead of `wait_for_function`, which the extension CSP forbids (it uses eval).


## 10.3.0: Google sign-in (account.js)
- **account.js** (`HuescribeAccount`, loaded by panel.html and by background.js via `importScripts`): `get()` (stored account or null), `signIn()` (from a click: `chrome.identity.getAuthToken({interactive: true})` with `openid email profile`, then `GET https://www.googleapis.com/oauth2/v3/userinfo`), `refresh()` (on panel open, at most every 10 min: non-interactive token + userinfo; revoked/not configured → sign out; offline/Google error → keep the account), `signOut()` (remove the cached token, `POST oauth2.googleapis.com/revoke`, clear storage), `allowed()`. Errors carry `code`: cancelled, offline, not-configured, signed-out, google → `signinMessage()` in panel.js.
- **Stored:** `chrome.storage.local.account = { id (Google sub), email, emailVerified, name, picture (https only), plan: 'free', signedInAt, checkedAt }`. The token is never stored by us (Chrome caches it). Nothing goes to a Huescribe server (there is none). `plan` is where a future server's answer goes; today it can't be enforced (the code runs on the user's machine).
- **Gate:** `go()` sends every screen to `signin` while `state.account` is null and stops picking; `startPickNow` handles a `signed-out` refusal; background refuses `huescribe:startPicker` when `HuescribeAccount.allowed()` is false. A `storage.onChanged` listener follows sign-in/out from other windows. ⋯ menu: "Sign out ({email})". `#app` and its dot are hidden while signed out. The welcome practice needs no account.
- **Manifest:** `identity` permission; `oauth2.client_id` is the placeholder `YOUR_CLIENT_ID.apps.googleusercontent.com` until the Google Cloud OAuth client exists (setup steps in store/STORE-LISTING.md, "Google sign-in setup"); with the placeholder, the button says sign-in isn't set up. After the first store upload, put the dashboard's public key in `"key"` so the unpacked ID matches the store ID the OAuth client is bound to.
- **Test account:** a development (unpacked) install accepts `chrome.storage.local.accountTestUser = {id, email, name}` as signed in; store installs ignore it (`chrome.management.getSelf().installType`). e2e and the language test sign in with it; `tests/account_test.py` covers signed out (screen, no picking, background refusal, not-configured message, practice open) and signed in (list, picking, menu, sign-out stops picking, lock from elsewhere, router can't skip the gate) at 400 and 320 px.
- **Texts:** privacy policy (Signing in with Google section, storage table, network requests, permissions, rights), store listing in 15 languages ("Sign in once with Google; your name and email stay in this browser"), store Privacy tab (identity justification; tick Personally identifiable information), website privacy line and JSON-LD feature (round_nov24a).
