# Huescribe (formerly PromptLift) — command log

## 2026-11-05
- Request: a browser extension that analyzes a website's code and produces paste-ready Claude Code prompts ("copy the fonts", animations, layout, colors, anything).
- Built a Chrome MV3 extension with no build step: popup with 7 categories + element picker + free-text request ([popup.js](popup.js), [analyzer.js](analyzer.js), [prompts.js](prompts.js), [picker.js](picker.js), [background.js](background.js)).
- Cross-origin stylesheets are read through the service worker; hover state is cleared before element capture.
- Tested end to end in Chrome for Testing (all categories, picker, empty/restricted pages, 320 px, light/dark). Docs: [user_instructions.md](user_instructions.md), [tech_instructions.md](tech_instructions.md).
- Fix: on Windows, "Extract All" nested the folder (`promptlift\promptlift`), so Chrome couldn't find the manifest. The zip now has `manifest.json` at the root, and tests are left out of the zip.

## 2026-11-05 (v2)
- Request: the prompts were too long and full of noise; produce a reusable design guide for designing or changing *any* site, not "match that website"; add the ability to capture part of the screen.
- [analyzer.js](analyzer.js) rewritten: elements are described by role (`kindOf`) instead of site selectors; values are normalized; supports a `region` scope; new `regionContainer`.
- [prompts.js](prompts.js) rewritten: short guides (Typography / Color / Layout / Shape & depth / Components / Motion) with no URL, site name or selectors, plus "Feel" summary lines. Full guide went from ~15k to ~3.3k chars.
- [picker.js](picker.js) is now "Select part of the screen": click an element → component recipe; drag an area → section guide. A cropped screenshot can be copied or downloaded. A shield blocks page clicks and hover while selecting.
- [background.js](background.js): `promptlift:capture` (captureVisibleTab of the sender's tab).
- Tests extended: leak check, length budgets, region drag, screenshot crop. All pass. Docs updated.

## 2026-11-06 (v3)
- Request: rethink from the user's point of view. Make *supplemental* prompts for one thing (e.g. a homepage gradient) with fields for which item and where it goes; catch an animation that already played without the other animations; word prompts the way Claude follows best.
- Plan agreed, then built:
  - side panel UI ([panel.html](panel.html), [panel.js](panel.js), [panel.css](panel.css)): pick / catch animations / browse → tick items → "Where on your site?" + exact/match-my-site → prompt; popup fallback for Arc.
  - [recorder.js](recorder.js): reload-and-record of CSS, WAAPI and JS (inline-style) animations; grouping with letter/word/item stagger; plain-language descriptions; Replay.
  - [analyzer.js](analyzer.js): `itemsForElement/Region/Page`, separately tickable items with plain-language labels (`colorName`, `describeGradient`, `describeState`).
  - [prompts.js](prompts.js): `buildSupplemental`, an XML-structured prompt (data first, scoped instructions with reasons, type-specific guidance) following Anthropic's prompting guide.
  - [picker.js](picker.js) sends picks to the panel; [background.js](background.js) adds the recorder, session storage of picks and the side-panel setup. The old popup was removed.
- Snags fixed during testing:
  - split-text start state set before insertion (now sampled on insert);
  - hover state was checked at read time instead of at start;
  - unstable group ids;
  - CSS easing lives on the keyframes;
  - stagger quantized by frame timing;
  - rAF throttling in background windows;
  - picks leaking across pages.
- Tests ([tests/e2e.py](tests/e2e.py)): the user's two scenarios end to end, plus pick-after-record, browse+combine and robustness. All pass. Docs updated.

## 2026-11-06 (v3.1)
- Request: add a way to make changes to the part being selected.
- Added **Adjust it** on every picked item ([adjust.js](adjust.js), [panel.js](panel.js), [panel.css](panel.css)):
  - type-specific controls (gradient angle/colors, font size/weight/line-height/letter-spacing, radius, shadow strength, hover speed/intensity, animation duration/stagger/distance/easing, layout gap/columns);
  - a free-text "Describe other changes" box;
  - **Preview on page**: restyles the source element live, or replays the animation with the new timing; plus Stop preview / Reset.
- [analyzer.js](analyzer.js) registers each item's source element for previews; [recorder.js](recorder.js) `replay(gid, opts)` takes adjusted timing.
- [prompts.js](prompts.js): `<adjustments>` and `<request>` per change, plus adjust-aware `<fit>` / `<screenshot>` wording.
- e2e extended (adjust + live preview + restore + prompt content for the gradient and the animation). All pass. Docs updated.

## 2026-11-06 (v4)
- Request: animation descriptions were too vague and technical. Do both "show it" (point at it on the page, filmstrip, slow motion) and "name it like a person would". Re-engineer the extension so it's straightforward for an average user.
- New [motion.js](motion.js): pattern names, plain sentences with feel words and total time; used by [recorder.js](recorder.js) and [analyzer.js](analyzer.js).
- [recorder.js](recorder.js): `filmStart/filmSeek/filmEnd` (paused replay, seeked frame by frame for filmstrips), `highlight`, `replay(…, {speed, scroll})`.
- [analyzer.js](analyzer.js): every item has a title, a plain sentence and numbers under Details (gradients, fonts, hover effects, shadows, shapes, layout, CSS animations); items carry rects for cropped pictures.
- [adjust.js](adjust.js): one-tap Quick tweaks per type (Snappier, Bouncier, Bigger, Softer…); plain labels ("Feel", "Length of each letter").
- [panel.js](panel.js) / [panel.css](panel.css) rebuilt around 3 steps: one big "Pick something on this page" button, cards with pictures/filmstrips, point-to-show, "Make it yours" (where + quick tweaks + describe + show on page + Fine-tune), and "Your prompt is ready" with Copy prompt / Copy picture steps. Live announcements, focus management and reduced-motion support.
- [prompts.js](prompts.js): `<what>` = pattern name + sentence + exact timing; filmstrip-aware `<screenshot>`.
- e2e rewritten for the new UI; all checks pass. Docs updated.

## 2026-11-06 (v5)
- Request: for animations, select something first and get told what can be copied from it; make everything a little simpler.
- The recorder now runs on every page from load ([manifest.json](manifest.json) `content_scripts`, MAIN world). The separate "Find animations" flow and the dynamic registration in [background.js](background.js) were removed.
- A pick now shows a **Movement** section first ([panel.js](panel.js)):
  - recorded animations + hover/click effects + CSS loops, each tagged with *when* it plays;
  - "part of a group" detection ([recorder.js](recorder.js) `groupsWithin`), no duplicates;
  - **Reload the page and look again** with automatic re-pick ([picker.js](picker.js) `autoPick` + CSS path) when the page predates the recorder.
- Simpler UI: one-button home with a link to the whole style; "Make it yours" = where + quick tweaks + Show/Play, with describe / exact numbers / undo under "More options"; one "use my site's colors" checkbox; the picture is always offered and mentioned conditionally in the prompt ([prompts.js](prompts.js)).
- Bug found by tests and fixed: scroll reveals under the mouse cursor were classified as hover ([recorder.js](recorder.js) `triggerOf`).
- e2e rewritten (heading → only its animation; card → group reveal + hover; looping badge listed once; reload fallback). All pass. Docs updated.

## 2026-11-06 (v6)
- Request:
  - animations play out when you select them;
  - highlighting on by default;
  - show the selected rectangle while editing;
  - pick up every animation;
  - far less text and the simplest words.
- [picker.js](picker.js) is now an always-on on-page UI: picking starts when the panel opens and stays on after a pick (click something else to switch, Esc stops). Selection boxes stay outlined and follow scroll while you edit. Overlays are hidden during screenshots and filmstrips. Closing the panel gives the page back ([background.js](background.js)).
- [panel.js](panel.js):
  - picking on for home/pick, off for editing;
  - movement autoplays after a pick and when a card is ticked;
  - all wording cut down ("Pick what you like", "Tick what you want", "Where should it go?", "Copy into Claude");
  - 4 place chips;
  - extras under "More options".
- [recorder.js](recorder.js):
  - catch-all `getAnimations()` sweep;
  - `Animation.play` and `attachShadow` hooks;
  - `::before`/`::after`;
  - scroll-linked animations;
  - width, position, background, color, line-drawing and SVG-attribute motion;
  - own replays never recorded.
- [motion.js](motion.js) v2: simple names and one-line sentences. [analyzer.js](analyzer.js): short card text plus canvas/video/Lottie/SVG/GIF "media" items. [prompts.js](prompts.js): media guidance.
- Fixtures extended (SVG line drawing, progress bar, web component, Animation.play, ::after, scroll-linked, canvas). e2e rewritten; all checks pass. Docs updated.

## 2026-11-06 (v6.1)
- Request: add a "how should it be changed" part, quickly.
- [panel.js](panel.js): a visible "How should it change? (optional)" box on every item, right under where it goes (moved out of More options). Prompt: `<request>`. Test added; all pass.

## 2026-11-06 (v6.2)
- Request: picking a new piece should reset the settings (separate prompts per pick, not combined), but keep the previous ones temporarily. And reconsider whether all the set-up instructions in the prompt are needed, since Claude knows how to code.
- [panel.js](panel.js): one prompt per pick. Leaving to pick something new saves the current prompt to **Saved prompts** (session storage, newest 10) and resets. Saved prompts can be copied or reopened. "Add something else" removed.
- [prompts.js](prompts.js): the prompt is cut to what Claude can't infer (where / what / exact code / request / scope + situational notes + "ask if unclear"). Generic coding instructions removed. Gradient prompt went from ~1,800 to ~600 chars.
- Tests updated (separate saved prompts, copy again, reopen restores settings, lean prompt). All pass. Docs updated.

## 2026-11-07 (v7.0)
- Request: when an area with several elements is picked, show what they share (arrangement, how they fade in together, common style), not each element's own parts; make all categories dropdowns at first; for text, add Font / Size / Color checkboxes (unticked parts are left to Claude); prompts should only tell Claude what's on the page, not how to code it; several prompts will be sent to Claude in one message.
- [analyzer.js](analyzer.js): new shared-only `itemsForRegion` (arrangement, common look, shared fonts, one shared hover, background, group entrance); arrangement measured from layout boxes; `fontSource` on font items.
- [prompts.js](prompts.js) v4: self-contained `<design_detail>` blocks with exact values and measured animation facts, no coding instructions; `combine()` for several prompts in one message.
- [panel.js](panel.js) / [panel.css](panel.css): collapsed category sections with counts; area picks keep only group movement; Copy: Font / Size / Color on text; **Copy all** on Saved prompts.
- [manifest.json](manifest.json) 7.0.0. [tests/e2e.py](tests/e2e.py): updated for the new format, plus area, text-part and Copy all checks. All pass. Docs updated ([user_instructions.md](user_instructions.md), [tech_instructions.md](tech_instructions.md)).

## 2026-11-07 (v7.1)
- Request: bring back the animation preview; letters/words that look the same shouldn't be picked as many things; add a picture prompt written freely by the person (whole picture or parts of it); fix "nothing can be selected when the extension isn't on the right side"; a way to capture scroll / button-press animations; after picking, don't highlight anything new until you click the pick again or click something new.
- [panel.js](panel.js): Movement section open by default; moving preview on "Where should it go?"; "Make a picture like this" with a free-text description; **Record a scroll or click** screen; panel modes (side / window / popup).
- [background.js](background.js): no side panel (e.g. Arc) → panel opens as its own window docked on the right; a closing popup no longer turns picking off (that was the "nothing can be selected" bug).
- [picker.js](picker.js): highlight locks after a pick (click the pick again to unlock, click elsewhere to switch); picks whole text instead of look-alike letter/word spans.
- [analyzer.js](analyzer.js): `wholeText` / `indistinctPieces`; area picks don't treat letters as separate items. [recorder.js](recorder.js): records presses, new "On click" trigger, `groupsSince`. [prompts.js](prompts.js): picture block, one pasted picture per prompt.
- Fixture: a click-to-open menu. [tests/e2e.py](tests/e2e.py): lock/unlock, whole text, picture prompt, moving preview, recording a click, popup-mode regression. 75 checks pass (two runs). Version 7.1.0. Docs updated.

## 2026-11-07 (v7.1.1)
- Request: "animation preview" meant that when you click an animated part, its animation keeps playing over and over (not the Movement section opening by default).
- [panel.js](panel.js): `startPreviewLoop`: the picked thing's animations replay on the page in a loop until you move on (also for recordings). Sections are all closed again; filmstrips are made when Movement is opened.
- [tests/e2e.py](tests/e2e.py): checks that the heading replays repeatedly and stops after moving on. All pass (two runs). Version 7.1.1. Docs updated.

## 2026-11-07 (v7.2)
- Request: copy the color scheme of a whole page, not only individual elements.
- [panel.js](panel.js) / [panel.css](panel.css): **Copy the whole page** on the first screen with Color scheme / Fonts / Everything; Color scheme opens the colors with the whole scheme ticked. Fixed a stray "null" on that screen.
- [analyzer.js](analyzer.js): "All the colors" became **Color scheme**, listed first, with a plain-word summary; values list every color with its role.
- [tests/e2e.py](tests/e2e.py): color scheme in two clicks + prompt content check; all pass. Version 7.2.0. Docs updated.

## 2026-11-07 (v7.3)
- Request (after building the first site with it): format gave only spacing numbers instead of the exact structure; the color scheme (many gradients, text colors changing down the page) came out as white + blue and didn't match; the navigation layout wasn't reproduced; Claude treated the prompts as suggestions. Also: navigation should follow the format rules.
- [analyzer.js](analyzer.js): exact structure outline (`outline`), **Structure** / **Page structure** / **Navigation bar** items under a renamed **Format** section; color scheme rebuilt as a section-by-section journey (`colorJourney`); page base color no longer falls back to white.
- [prompts.js](prompts.js): one "exact requirements, not inspiration" line at the top of every prompt (and once in Copy all); note that quoted words are placeholders.
- [panel.js](panel.js) / [panel.css](panel.css): **Format** shortcut on the first screen (2×2 with Color scheme, Fonts, Everything).
- [tests/fixtures/site/rich.html](tests/fixtures/site/rich.html) + [tests/e2e.py](tests/e2e.py): checks for the navigation details, the page structure, every section's colors and gradients, and the rules line. All pass. Version 7.3.0. Docs updated.

## 2026-11-07 (v7.3.1)
- Request: the format prompt shouldn't contain the site's exact text, only the purpose each piece of text serves.
- [analyzer.js](analyzer.js): `purposeOf` / `wordsLabel` / `sectionPurpose`. Structure, Navigation bar and Color scheme now say what each text is for and how long it is, and what kind each section is, never the words themselves. [prompts.js](prompts.js): quoted-text note removed.
- [tests/e2e.py](tests/e2e.py): purpose checks + "no site words in the prompt" check. All pass. Version 7.3.1. Docs updated.

## 2026-11-07 (v7.4)
- Request: the color scheme gave one background and one text color and missed the gradients, button colors and much more; the format was too one-to-one; format and color scheme should be for selected sections, not the whole website.
- [panel.js](panel.js) / [panel.css](panel.css) / [picker.js](picker.js): **Copy whole sections** → Color scheme / Format → click sections on the page (click again to remove) → one block per section. The whole page is still available via "Or the whole page's style".
- [analyzer.js](analyzer.js): full per-section color report (`sectionColors`/`colorReport`: gradients, decorations, ::before/::after layers, text by role, every button style, cards, tags, borders, icon colors, glows); `layoutGist` + lean outline for Format; painted page wrappers no longer collapse the page into one section.
- Fixtures [shell.html](tests/fixtures/site/shell.html) + [tests/serve.sh](tests/serve.sh); [tests/e2e.py](tests/e2e.py) section-picking checks. All pass. Version 7.4.0. Docs updated.

## 2026-11-07 (v7.5)
- Request: make sure every animation you can select can be used, including scroll and button-press animations; make the app as smooth as possible to use.
- [panel.js](panel.js) / [panel.css](panel.css): live filmstrips for canvas/video/GIF; **Press it** on pressable picks (auto-finishing recording); caught movements listed live while recording; results in order.
- [recorder.js](recorder.js): `holdNavigationOnce` so a pressed link stays on the page. [motion.js](motion.js): names for press/attention effects (Press, Bump, Hop…). [analyzer.js](analyzer.js): fuller canvas/video descriptions.
- Fixture: pressable link `#go` with a press animation and a bottom scroll reveal `#late`. [tests/e2e.py](tests/e2e.py): end-to-end usability check for every animation kind, press and scroll recordings. All pass. Version 7.5.0. Docs updated.

## 2026-11-07 (v8.0)
- Request: closing the sidebar closes the extension entirely; two choices at first (element / screen portion); elements include their scroll behaviors; screen portions hold large-scale scroll behaviors and whole-section color schemes; then: apply all the suggested simplifications.
- [background.js](background.js) / [recorder.js](recorder.js) / [manifest.json](manifest.json): recorder only while the panel is open (registered + injected on open, stopped + unregistered on close); reload card for pages opened earlier.
- [panel.js](panel.js) / [panel.css](panel.css) / [picker.js](picker.js): two-choice first screen; element flow (click only) with automatic or one-tap scroll check; screen portions with per-section Color scheme / Format / Scroll behavior; four categories; picture as a checkbox; More options; Copy prompt goes straight home; Your prompts basket with Copy all and Clear; first-time tip; Record only via Press it.
- [analyzer.js](analyzer.js): scroll behavior measurement (`elementScroll`, `sectionScroll`, `portionReport`). [prompts.js](prompts.js): picture from the change text.
- [tests/e2e.py](tests/e2e.py) rewritten for the new flow (101 checks, two clean runs). Version 8.0.0. Docs updated.

## 2026-11-08 (v8.1)
- Request: a refresh-page button somewhere; prompts are used either when prompting a website for the first time or when prompting changes, so everything must be put into the right context. Then: make the changes again (after an interrupted run).
- [panel.html](panel.html) / [panel.js](panel.js) / [panel.css](panel.css): reload button in the header; "Your site" (Building a new site / Changing my site + what it is) on the first screen and the placing screen; per-part "Change what is there / Add as new"; Your prompts numbered in sending order with move up; Copy all and Copy rebuild prompts for the current situation; "Other settings" rename; narrow-screen rows.
- [prompts.js](prompts.js): context opening (`header`), `<task>` per detail, whole-site details first, combined messages with numbered pictures.
- [tests/e2e.py](tests/e2e.py): context, task, ordering, Copy all for a new site, reload button. 111 checks, two clean runs. Version 8.1.0. Docs updated.

## 2026-11-08 (v8.2)
- Request: no button press or hover animations could be highlighted; every single animation that can be copied should have a preview.
- [analyzer.js](analyzer.js): hover/press rules on a parent or a part inside are found; `playState` shows an effect on the real element (restores the true original).
- [recorder.js](recorder.js): `catchHover` simulates the pointer to catch JavaScript hover effects; `restartCss` restarts CSS animations that played before recording so they can be filmed; recording continues during filming for a simulated hover.
- [panel.js](panel.js): hover/press cards play on the page (Play, pointing, ticking, replay loop) with before → after previews; previews for every animation kind (off-screen ones filmed and scrolled back, scroll behavior frames for elements and sections, retries); previews stop when you pick something else.
- [motion.js](motion.js) / [prompts.js](prompts.js): Grow/Lift/… names for hover and press effects; picture notes for before → after and scroll frames.
- Fixtures: card hover that changes its heading, a JavaScript hover badge. [tests/e2e.py](tests/e2e.py): 133 checks, two clean runs. Version 8.2.0. Docs updated.

## 2026-11-08 (v8.2.1)
- Request: give me a screenshot and the structure for each part of the app.
- Published a guide page with a screenshot and the block-by-block structure of all 12 screens plus the page overlays.
- Fixes found while taking them: labels inside their box ([picker.js](picker.js)); no duplicate hover items and clearer "affects the heading inside it" wording ([analyzer.js](analyzer.js)); PromptLift's own previews never recorded ([recorder.js](recorder.js), [analyzer.js](analyzer.js)); the replay loop skips scroll-linked animations and pauses during scroll checks ([panel.js](panel.js)).
- [manifest.json](manifest.json): version 8.2.1. [tech_instructions.md](tech_instructions.md) updated. Test suite: 133 checks, green.

## 2026-11-08 (v8.3)
- Request: rethink when people need certain buttons (bad structure); then: prompts don't exist on their own; they should pull from the rest of the user's site: animations with color use the user's own colors, fonts say how to apply them, formats say what information to put there; rethink every prompt. Then: change the code.
- [panel.html](panel.html) / [panel.js](panel.js) / [panel.css](panel.css): ⋯ menu in the header (reload, clear, how it works); first screen = two choices; site question asked once on the placing screen, then a one-line summary; Movement opens by itself and holds the automatic scroll check, Press it and Reload (only when they apply); no Play buttons (tap the preview); Next (N); fitting where-chips; Adjust folds the change options; "Keep the original colors"; section Scroll behavior chip only where something reacts to scrolling; Your prompts rows with one ⋯ menu, Copy all from two; recording Cancel/Stop.
- [prompts.js](prompts.js): opening tells Claude to look at the user's site first; numbered details; `<fit_to_my_site>` per detail (animation colors by role → the user's colors, fonts: where and how to load and pair, formats: what information goes in each part and where it comes from, color schemes: into the site's color settings, readable, blended); general rules said once.
- [analyzer.js](analyzer.js): what each item came from (heading level, card, button), section scroll hint, sticky headers measured, page put back right away when a scroll check is cancelled.
- [tests/e2e.py](tests/e2e.py): 155 checks, two clean runs. Screenshot guide republished. Version 8.3.0. Docs updated.

## 2026-11-08 (v8.4)
- Request: not just "where should it go" but also what information it should display; format should talk about color relationships (like a darker background used here); after several formats are copied, the page should have consistent spacing on the sides and between text blocks.
- [panel.js](panel.js): "What should it show?" on parts that hold content. [prompts.js](prompts.js): `<content_i_want>`, keep the color relationships, `<shared_spacing>` (one side padding, content width, section spacing, text-block and card gaps for all copied formats; changing a site: line up with the existing spacing).
- [analyzer.js](analyzer.js): measured spacing line and color relationships in every format.
- [tests/e2e.py](tests/e2e.py): 161 checks, two clean runs. Screenshot guide updated. Version 8.4.0. Docs updated.

## 2026-11-08 (v8.5)
- Request: make the selection process smoother.
- [picker.js](picker.js): the hover outline glides between things, names what it is with its size, stays under the pointer while scrolling; ↑ ↓ always change the size (same-size wrappers skipped); after a click the outline pulses and the bar says what is being read.
- [panel.js](panel.js) / [panel.css](panel.css): "Reading Card…" shows in the panel right after a click; the picking hint mentions ↑ ↓.
- [tests/e2e.py](tests/e2e.py): 166 checks, two clean runs. Version 8.5.0. Docs updated.

## 2026-11-08 (v8.6)
- Request: is there any prompt difference for different AI models? Could the prompt generator screen be movable?
- Answered the model question (prompts are written for Claude; they work in other tools with small differences).
- [background.js](background.js) / [panel.js](panel.js): ⋯ → Open in its own window (movable, docked beside the browser by default, what you were placing comes along) and Back to the side panel.
- [tests/e2e.py](tests/e2e.py): 171 checks, two clean runs. Version 8.6.0. Docs updated.

## 2026-11-08 (v8.7)
- Request: add different prompt settings for different AI apps.
- [prompts.js](prompts.js): Claude Code, Claude (chat), ChatGPT/Gemini, Cursor/Windsurf/Copilot, Lovable/v0/Bolt: tags or Markdown, ask-for-code for chat apps, short opening for site builders, app-specific rules.
- [panel.js](panel.js) / [panel.css](panel.css): "I paste prompts into" in the site card, remembered; a tip for long site-builder prompts.
- [tests/e2e.py](tests/e2e.py): 178 checks, two clean runs. Version 8.7.0. Docs updated.

## 2026-11-09 (v8.8)
- Request: copy font schemes in sections; support custom selected sections better.
- [analyzer.js](analyzer.js): `fontScheme` (every text role, families and sources, how sizes/weights/line heights relate); `areaSelection` (a dragged area = one thing, several sections together, or part of a section); `portionReportGroup`.
- [picker.js](picker.js): dragged areas become one selection with one outline; click inside to remove; ↑ ↓ before clicking a section.
- [panel.js](panel.js): Font scheme chip; rows for "Sections together" and "Part of a section". [prompts.js](prompts.js): fit lines for font schemes; shared spacing reads each section of a span.
- [tests/e2e.py](tests/e2e.py): 188 checks, two clean runs. Version 8.8.0. Docs updated.

## 2026-11-09 (v8.9)
- Request: in the UI, remove the unnecessary descriptions and make the most important information bigger.
- [panel.js](panel.js): removed repeated or obvious helper lines on every screen (picking, sections, pick results, recording, Your prompts, site card); shortened the rest.
- [panel.css](panel.css): names and previews bigger and bolder; counts, hosts and descriptions smaller and muted.
- Docs: [user_instructions.md](user_instructions.md), [tech_instructions.md](tech_instructions.md). [tests/e2e.py](tests/e2e.py): 188 checks, three clean runs. Version 8.9.0.

## 2026-11-09 (v8.9.1)
- Request: test it on real websites; fix what was found.
- New [tests/real_sites.py](tests/real_sites.py): 20 real sites, element picks + sections all the way to a copied prompt, resumable (`PL_RESUME=1`).
- [analyzer.js](analyzer.js): real-world CSS selectors no longer break picks; scroll-driven animations; no invisible borders or `null` values in prompts; sections found through deep, painted and `display: contents` wrappers; full-screen overlays ignored.
- [picker.js](picker.js): click picks even without a hover outline. [panel.js](panel.js) / [panel.css](panel.css): new pick clears the old one; failure message in the panel; panel draws before a busy page is ready, “Getting the page ready…”.
- Result: 18 of 19 testable sites clean (NYTimes blocks automated browsers; Raycast is too slow only in headless Chrome without a GPU). [tests/e2e.py](tests/e2e.py): 188 checks pass. Docs: [tech_instructions.md](tech_instructions.md), [user_instructions.md](user_instructions.md). Version 8.9.1.

## 2026-11-09 (v8.10)
- Request: make sure sites built with this tool stay consistent.
- [prompts.js](prompts.js): new "Keep one look" block in every prompt. It picks one pair of fonts, one accent, one set of corners, one shadow, one button style and one easing when details disagree, letting deliberately picked color and font schemes win and preferring my own site's values when changing it. It always says to reuse what the site already has.
- [tests/e2e.py](tests/e2e.py): 190 checks, two clean runs. Docs: [user_instructions.md](user_instructions.md), [tech_instructions.md](tech_instructions.md). Version 8.10.0.

## 2026-11-09 (v8.10.1)
- Request: fix "Unsafe attempt to load URL chrome-extension://…/fonts/geologica-300-latin.woff2" on YouTube, reported at recorder.js (sweep).
- Cause: another extension's font, not PromptLift's (PromptLift has no fonts); our animation sweep forced the style update in which it failed, so Chrome blamed us.
- [recorder.js](recorder.js): the sweep runs right after a frame is drawn and pauses in hidden tabs. [tests/e2e.py](tests/e2e.py): 190 checks, two clean runs. Docs: [tech_instructions.md](tech_instructions.md). Version 8.10.1.

## 2026-11-09 (v8.11)
- Requests:
  - When a format is copied, its position relative to everything else should matter.
  - A format should not copy fonts or colors.
  - Question: does saying what kind of site it is matter?
- [analyzer.js](analyzer.js):
  - Formats are layout only: no font families, weights or color values; text sizes stay as a hierarchy.
  - Border color moved to Colors.
  - New "Position on the page": place in the page order, the parts directly above and below, gap or overlap, width, sticky; for a part, where it sits in its section and its neighbors.
- [prompts.js](prompts.js): tells the AI to keep that relation, and that fonts and colors come from my site or the other details.
- [tests/e2e.py](tests/e2e.py): 192 checks, two clean runs; real sites (Stripe, Notion) clean. Docs: [user_instructions.md](user_instructions.md), [tech_instructions.md](tech_instructions.md). Version 8.11.0.

## 2026-11-09 (v8.11.1)
- Report: ChatGPT said it applied the changes (typography, spacing, buttons, card), but nothing changed.
- [prompts.js](prompts.js): new closing "When you are done":
  - make every change for real;
  - for formats, rebuild the layout to match the outline, not just sizes;
  - list each detail as old → new, or say it already matched;
  - chat apps return the complete updated file.
- [tests/e2e.py](tests/e2e.py): 194 checks, two clean runs. Docs: [user_instructions.md](user_instructions.md), [tech_instructions.md](tech_instructions.md). Version 8.11.1.

## 2026-11-09 (v8.11.2)
- Request: make sure everything decided before was really changed.
- New [tests/audit_decisions.py](tests/audit_decisions.py): 58 decisions from this log checked against the code. All in place after one fix.
- Found and fixed: "The whole button / area / look" copied fonts and colors but were listed under Format. They're now their own section, "All of it" ([analyzer.js](analyzer.js), [panel.js](panel.js), [prompts.js](prompts.js)).
- [tests/e2e.py](tests/e2e.py): 194 checks, two clean runs. Docs: [user_instructions.md](user_instructions.md), [tech_instructions.md](tech_instructions.md). Version 8.11.2.

## 2026-11-09 (v8.11.3)
- Request: apply everything I wanted in the chat, including inconveniences I only mentioned.
- Found and fixed:
  - "What kind of site is it" when the AI already sees it: now asked only when building a new site, and left out of change prompts ([panel.js](panel.js), [prompts.js](prompts.js)).
  - ChatGPT asking for four kinds of files or the whole project: chat-app prompts use files already given, else ask once for the fewest ([prompts.js](prompts.js)).
  - Screenshots from the real-site test, asked for but never delivered: published as a gallery.
  - Screens guide out of date: retaken and republished.
- [tests/audit_decisions.py](tests/audit_decisions.py): 61 decisions in place. [tests/e2e.py](tests/e2e.py): 196 checks, two clean runs. Docs: [user_instructions.md](user_instructions.md), [tech_instructions.md](tech_instructions.md). Version 8.11.3.

## 2026-11-10 (v9.0)
- Requests:
  - The app is organized badly: rethink its structure.
  - Think about what context is really necessary.
  - Then: tweak the app with these changes.
- New structure ([panel.js](panel.js), [panel.html](panel.html), [panel.css](panel.css)):
  - picking is always on: click, ↑ ↓ up to a whole section, or drag over any area;
  - every pick offers the same five choices: Colors, Fonts, Layout, Motion, Everything (a switch per group, details for single things; sections can be taken apart);
  - everything goes into **My list**, one row per pick (where, what it should show, ⋯ for the rest);
  - one **Copy prompt** for the whole list.
- Context cut to what's needed:
  - removed "new site / changing", "what is it", "change what is there / add as new", "use my site's colors", and the Font/Size/Color checkboxes (the chips decide colors and fonts);
  - the only setting is the AI app, in the header.
- Prompts ([prompts.js](prompts.js)):
  - one opening for an existing site or none, with the no-site rule said once;
  - no task lines; Keep one look only when parts disagree;
  - shorter wording: 15% shorter on the same list.
- Fixes found while testing:
  - a click could pick a stale highlight after scrolling with the wheel ([picker.js](picker.js));
  - picking now comes back after a page reload;
  - menus closed while scrolling;
  - a late stop could cancel the next pick's scroll check ([analyzer.js](analyzer.js));
  - a sticky bar could reorder sections;
  - the moved window lost picking when the side panel closed ([background.js](background.js));
  - the section scroll hint missed reveals that had already played;
  - browser pages logged an error.
- [tests/e2e.py](tests/e2e.py): rewritten, 192 checks, two clean runs. [tests/audit_decisions.py](tests/audit_decisions.py): 72 decisions in place. Docs: [user_instructions.md](user_instructions.md), [tech_instructions.md](tech_instructions.md). Version 9.0.0.


## 2026-11-10 — "can you test it by making 3 websites that are synthesies of multiple websites / first make a hotel website combining elements from multiple great websites and the extension"
- Test: picked 6 parts from Aman (top bar, video hero, two-feature section), Airbnb (search bar), Linear (two-column statement) and Six Senses (suites carousel); copied one prompt; built a fictional hotel site (Solenne Bay) from that prompt alone.
- Fixes found while testing (version 9.0.1):
  - a long list with pictures ran out of storage and wasn't kept: pictures now live in IndexedDB ([panel.js](panel.js));
  - rows were named "Box": now Top bar, Search bar, Form, Video, Menu, Card, Picture or Text block ([picker.js](picker.js));
  - a short strip at the top of the page was called "Hero": now Navigation bar ([analyzer.js](analyzer.js));
  - carousels came out as "paragraph, text size 0px, content 5945px wide": now "N slides in one row, one in the middle with the next ones peeking in" ([analyzer.js](analyzer.js));
  - embedded video players (Vimeo/YouTube iframes) were invisible in the outline: now "video";
  - inline-block cards were read as one paragraph; repeated siblings only count as repeats if they hold the same kind of thing;
  - grids with spanning children now give the real column widths (915px 439px, not "6 equal columns");
  - small caps labels written as headings are now "small label above the title";
  - Everything: invisible click-area layers dropped, one rule per hover, uneven grid tracks kept, same-named parts no longer override each other;
  - "What goes in it" listed font-scheme lines as content ([prompts.js](prompts.js));
  - Keep one look no longer says "side padding 0px" for edge-to-edge sections.
- [tests/e2e.py](tests/e2e.py): retries once when a moving neighbour is picked; 192 checks, three clean runs. [tests/audit_decisions.py](tests/audit_decisions.py): 79 decisions in place. Docs: [tech_instructions.md](tech_instructions.md).

## 2026-11-10 — "now check where there were issues and fix them"
- Extension, version 9.0.2 ([analyzer.js](analyzer.js)):
  - a picked box with no background of its own (Aman's top bar) offered no Colors: it now offers "Its colors" (background, text, buttons, lines by role);
  - a filled button inside a wrapper (Aman's Reserve) came out as "text: short label": it is now "button: main call to action — filled";
  - picking a header's inner bar now gives the Navigation bar description;
  - the Navigation bar was a format but carried colors and font families: now layout only, and it measures a fixed bar's real height;
  - the bar now says where the logo sits (left, centered, right), names icon buttons, and says when the menu is behind a button even on desktop (no more wrong "opens a dropdown" and "hidden at this width").
- Hotel site: the hotel's name now sits over the film (as asked in that part's content), Reserve is a filled main button, the logo is centered, the carousel opens with neighbours peeking on both sides.
- [tests/e2e.py](tests/e2e.py): two clean runs. [tests/audit_decisions.py](tests/audit_decisions.py): 84 decisions in place. Docs: [tech_instructions.md](tech_instructions.md).

## 2026-11-10 — "check if there were issues with the app and fix them on the app"
- [tests/real_sites.py](tests/real_sites.py) was still driving the old v8 panel: rewritten for v9 (heading, button, header, card, picture, a whole section, a dragged area on each site; each added and copied). It also flags 0px text, impossible widths, empty buttons and "Box" names.
- Run on 20 sites: 14 of 17 clean, 3 blocked by bot checks. Fixed (version 9.0.3):
  - clicking the icon inside a button picked a 14px "Picture": the button is picked now ([analyzer.js](analyzer.js));
  - Figma/Framer: a 0px font wrapper gave "text size 0px" and `font: 0px/NaN`: the real text size is used, no NaN;
  - text filling a heading was named "Text": now "Main heading" / "Heading" ([picker.js](picker.js));
  - a `<header>` inside a card was named "Top bar", other card pieces "Box": now "Top of a card" / "Bottom of a card" / "Part of a card"; framed blocks with an icon and words are "Card".
- Rerun on the failing sites: all clean. [tests/e2e.py](tests/e2e.py): two clean runs. [tests/audit_decisions.py](tests/audit_decisions.py): 88 decisions in place.

## 2026-11-10 — "research what makes a browser and a website design tool feel premium, then incorporate those changes"
- Research: Rauno Freiberg's interface guidelines, Jakub Krehel's polish rules, Linear's keyboard-first speed, Chrome side panel guidance (notes in [tech_instructions.md](tech_instructions.md)).
- Applied, version 9.1.0 ([panel.css](panel.css), [panel.js](panel.js), [picker.js](picker.js)): one quick easing and short motion, press squeeze, layered shadows and hairlines, frosted header/tray and on-page bar, key caps, one focus ring, ⌘/Ctrl+Enter for the main button, a green check on copy, shimmer while previews load, a quiet "picking is on" line, an inviting empty list, the new row glows once; reduced motion respected.
- [tests/e2e.py](tests/e2e.py): new keyboard check; clean runs. [tests/audit_decisions.py](tests/audit_decisions.py): 94 decisions. [user_instructions.md](user_instructions.md): the shortcut.

## 2026-11-10 — "it still does not close once you close the sidebar / the reaction after the copy is very vague"
- Cause found: the background worker fell asleep while the sidebar sat open; its link to the sidebar dropped and was never remade, so the close went unheard. Fixed in three layers: a heartbeat with reconnect ([panel.js](panel.js)), picked tabs kept across restarts ([background.js](background.js)), and the page removing PromptLift by itself when no sidebar is open ([picker.js](picker.js)).
- Copy reaction: the button turns green and says "Copied", the page shows "Prompt copied", and the list opens with a card: what was copied (parts, characters, pictures) and the next steps (open the app, paste ⌘V/Ctrl+V, add pictures).
- [tests/e2e.py](tests/e2e.py): new checks for a dropped link, closing after it, and the leftover safety net; two clean runs (196 checks). Audit: 98 decisions. Version 9.1.1.

## 2026-11-10 — "the color scheme was followed badly … accent background for most of the background, gradients that were not there … the font scheme was not followed entirely"
- Colors ([analyzer.js](analyzer.js)): each color scheme now says how much of the area each fill covers (the biggest marked as the background, small strong colors marked as accents for details only). Only real gradients and glows are listed; otherwise "flat colors only; add none".
- A color taken from a button or card is now named as that element's fill, and the prompt forbids using it as a page or section background ([prompts.js](prompts.js)).
- Fonts: the prompt allows only the listed families, roles, sizes and weights; text without a role uses the body font; on a new site the schemes set the whole site.
- [tests/e2e.py](tests/e2e.py): new checks, three clean runs (also fixed a test helper that crashed on a floating target). Audit: 102 decisions. Version 9.1.2.

## 2026-11-10 — "make the colors always slightly different to prevent copyright issues / and think about color relations in the prompts more"
- Every color in a copied prompt is now shifted slightly, consistently for all colors (relations and contrast kept); the prompt says the values are shifted on purpose ([prompts.js](prompts.js)).
- Color relationships now also say: warm/cool/pure-gray neutrals, text contrast ratios, soft vs pure text, the accent's vividness and color family against the background, and how colorful the part is ([analyzer.js](analyzer.js)). The rule line asks to keep all of these.
- [tests/e2e.py](tests/e2e.py): shift check (no original values, same each copy); three clean runs. Audit 104. Docs: [user_instructions.md](user_instructions.md), [tech_instructions.md](tech_instructions.md). Version 9.1.3.

## 2026-11-11 — "remove 'all of it' / the color descriptions are too vague now"
- Removed the Everything ("All of it") choice everywhere: picks offer Colors, Fonts, Layout, Motion; sections have no Everything chip ([analyzer.js](analyzer.js), [panel.js](panel.js)).
- Motion colors are now precise relations: what it is relative to its resting or starting color (accent instead of dark text; 19% lighter), plus "on the original: a vivid warm orange, lightness 48%, 3.6:1 against the background behind it" ([prompts.js](prompts.js)). The same for colors that change on scroll.
- Tests updated (four choices; relation wording); two clean runs. Audit 106. Docs: [user_instructions.md](user_instructions.md), [tech_instructions.md](tech_instructions.md). Version 9.1.4.

## 2026-11-11 — "can you design a premium looking UI / i dont like how the pieces save even after you copied the prompt"
- Redesign ([panel.css](panel.css)): calm off-white surfaces, monochrome primary buttons, violet only as the accent, switches for Colors/Fonts/Layout/Motion, a segmented control for section parts, numbered list tiles, refined dark mode.
- After copying, the list empties; the card has **Copy again** and **Undo** ([panel.js](panel.js)). Also fixed: a second quick copy no longer cuts the "Copied" state short.
- [tests/e2e.py](tests/e2e.py): clear/undo/copy-again check; two clean runs. Audit 108. Version 9.2.0.

## 2026-11-11 — "lets start making the website homepage"
- First draft of the PromptLift homepage on a design canvas (https://claude.ai/artifact/F7UsMLRXDBdmCkTmovocvq): top bar, hero with a product picture (a picked section + the panel with working switches), "prompts made for", how it works in 3 steps, 6 features, a sample prompt, an FAQ that opens and closes, a closing call to action, footer.
- Same look as the extension (warm off-white, near-black buttons, violet accent, Inter). The price is a placeholder to confirm.

## 2026-11-11 — "delete everything and restart, use the prompt given for the start" (attached PromptLift prompt)
- Homepage canvas rebuilt from the attached prompt only: RISD colors by role (#fcfcfc background, #151515 text, #1d2cfc accent, #f3f3f1 surface, the left-to-right fade), Cursor's hero structure (658px title + 2 pill buttons 10px apart, 1300px picture card with two 1080px windows, pill main call to action), 4px small corners, sr-only clip pattern.
- Problems the prompt showed in the extension (to fix): the sr-only "Cut-out shape" (clip-path: inset(50%)) and a lone "Spacing" item were offered as design details; "Background: none (browser white)" contradicts the 85% #fcfcfc share; "body text 1.0:1" contrast; "8 accent colors"; the accent called "muted, dusty" with 2.6:1 though #1d2cfc is vivid; "gap: normal 10px".

## 2026-11-11 — "the extension did not pick up the left alignment of the text"
- Outlines now say how text is aligned and where each narrower box sits (left / centered / right), so a left-aligned hero isn't rebuilt centered ([analyzer.js](analyzer.js)).
- Also fixed from the same prompt: the screen-reader-only clip offered as a "Cut-out shape"; "gap: normal 10px"; "Background: none (browser white)"; body text contrast 1.0:1; 8 near-identical accents counted separately.
- e2e: two clean runs. Audit 112. Version 9.2.1.

## 2026-11-11 — "make the preview area an animation of the app in use" (homepage)
- Homepage hero is now left-aligned (title, buttons, column), matching cursor.com.
- The preview replaces the photo placeholder: a 12-second loop of PromptLift in use (pointer clicks a pricing section → highlighted → Colors and Layout switched on → Add to my list → Copy prompt → "Copied" → the prompt types into an AI app → "pricing.html updated"). Respects reduced motion (shows the end state); the pointer hides on phones.

## 2026-11-11 — "can you make the site there an actual website" (homepage preview)
- The site inside the preview is now a believable made-up website, "Fieldnote" (a notes app): logo, menu, headline, and a real pricing section (Starter $0, Pro $8 "Most popular", Team $14 per seat) with features and buttons; the address bar reads fieldnote.app/pricing. The pointer aims at the new cards. Kept the user's own edit (bottom button removed).

## 2026-11-11 — "make the UI on the animation one on one with the one on the extension / would it be legal to put in a section for supported AI models" (+ attached Notion logo-strip prompt)
- Homepage animation panel rebuilt as the real extension screens (v9.2): My list (picking on, empty), Pick what to copy (section picture, Colors / Fonts / Layout segmented with checks, Single parts instead, Add to my list ⌘↵), My list with the new row (Copy prompt ⌘↵), Copied card (the list clears; next steps, Copy again / Undo). Violet accent, near-black buttons, same sizes and wording.
- New "supported AI apps" strip under the preview, built from the attached Notion prompt (centered row, 8px apart, wraps, max 1184px; alternating outlined and plain items): the 10 apps the extension names (Claude Code, Cursor, ChatGPT, Gemini, Claude, Windsurf, Copilot, Lovable, v0, Bolt), as plain names, no logos, plus a "not affiliated" line. The prompt's structure had 16 slots; 10 used rather than invent apps.

## 2026-11-11 — Homepage: apps strip, system font + icons
- Asked: put the AI apps' logos and logo fonts in the supported-apps strip; then "try the logos and system fonts".
- Done: the names are now set in the system font (system-ui stack). Each name has a neutral Lucide icon for its kind of app: terminal for coding agents, chat bubble for chat apps, layout for site builders. A small legend sits under the heading. No brand logos or logo typefaces were recreated; official logo files can be dropped in if supplied. Checked at 1440px and 320px with no horizontal overflow. Canvas version 1794443647-b9f0 (homepage/project/Main.dc.html).
- 2026-11-11 (later): asked to remove the "logos" entirely. Removed the Lucide icons and their legend from the apps strip; the strip is now plain names in the system font. Canvas version 1794443859-18f2.
- 2026-11-11 (later): asked to remove the rectangles and make each name turn its brand color on hover. Removed the outlines; each name has a `--brand` value (approximate brand colors), and a `.pl-app:hover` rule in the canvas `<style>` fades the name to that color over 150ms, with no fade when reduced motion is on. Hover tested on all 10 names in a headless browser. Canvas version 1794444030-5546.
- 2026-11-11 (later): asked to make the hover smoother. The color fade now takes 0.4s on an ease-in-out curve (cubic-bezier(.4,0,.2,1)) instead of 0.15s, and it fades back the same way. Sampled mid-fade in a headless browser. Canvas version 1794444227-9af2.

## 2026-11-11 — Homepage: "How PromptLift copies a design" section
- Asked: under the apps strip, add a section about the app following real app screenshots and the attached notion.com cards-section prompt.
- Done (homepage/project/Main.dc.html, canvas version 1794445124-da23):
  - New section 16px under the apps strip, padded 96px top and bottom, inside the existing 1300px column. Heading "How PromptLift copies a design" (26px, matching the hero, so the type sizes keep their order).
  - Grid of 2 equal columns, 24px apart, holding 3 cards (12px radius, surface background). Each card has a 14px label, a 16px line with an accent arrow, and a real screenshot: Pick parts, Choose details (Colors + Layout on) and Copy prompt (the Copied card). The whole card is a link to #demo.
  - Under the grid: a 14px subheading "Pick what each prompt copies" and 5 bordered cards (24px padding, 12px radius, 40px round Lucide icons, 16px titles): Colors and contrast, Fonts and sizes, Layout and spacing, Motion and timing, Fits your site. They wrap; the grid becomes 1 column at 900px or narrower.
  - Screenshots taken from the real extension on the test fixture (tests/screenshots.py), cropped and uploaded as webp. The user's own line drawn in the picked overlay was kept. The page height is now 2460.
  - Checked at 1440px and 320px: no horizontal overflow, all images load, card links cover each card.
- Extension fix found while taking the screenshots: panel.js "How it works" step 2 still said "or everything" (that choice was removed in 9.2.0). It now reads "colors, fonts, layout or motion."
- 2026-11-11 (later): "too empty, notice how the inspiration has so many details" (Notion screenshot attached). Rebuilt the 3 how-it-works cards in Notion's layered style:
  - Each card has a bold 20px headline and a round black arrow button. Cards 1 and 2 sit side by side; card 3 spans the full width, with its text on the left.
  - Each real screenshot sits in an app-style window that runs off the bottom of its card, with real UI pieces floating around it:
    - Pick: the picker hint bar (Click / ↑ ↓ / Drag / Esc) and a pointer.
    - Choose: Colors and Layout chips (checked), Fonts and Motion chips (unchecked), and the black "Add to my list ⌘↵" button.
    - Paste: the Copied panel overlapped by an "your AI app" window with app-name tags, the pasted prompt, a reply and "pricing.html updated"; a "⌘ V paste and send" chip floats between the two.
  - New uploads: pick2.webp, copied3.webp.
  - Checked at 1440px and 320px: no horizontal overflow; the hint bar shortens on phones.
  - Page height is now 2600. Canvas version 1794445379-3e28.
- 2026-11-11 (later): "give some difference to the original". Made the how-it-works cards our own instead of a near-copy of Notion's:
  - The top row is uneven (3fr / 2fr) instead of two equal halves.
  - Cards are white with a thin border instead of filled gray.
  - Steps are numbered 01 / 02 / 03 in blue monospace.
  - The black round arrows became outlined blue "See it →" pills, matching the hero buttons.
  - Every picture sits on a dotted design-tool grid.
  - The wide card is mirrored: picture on the left, words on the right.
  - Checked at 1440px and 320px.
  - Page height is now 2620. Canvas version 1794445493-5a3e.

## 2026-11-11 — Homepage: FAQ section
- Asked: add a "frequently asked questions" part from the attached perplexity.ai prompt (a 2-column grid 96px apart; a title plus 7 questions, each with a top line and 28px above and below).
- Done (homepage/project/Main.dc.html, canvas version 1794446809-9f1a):
  - New white band (a step lighter than the page) under the how-it-works section, 96px above and below, inside the same 1300px column.
  - Grid of 1fr : 3fr (Perplexity's 304 : 912), 96px apart. "Frequently asked questions" at 26px on the left, like the other section titles.
  - 7 native details/summary rows (only one open at a time). Each question is 16px with 28px above and below and a 1px top line; the plus turns into a blue cross when open. Answers are 15px and muted.
  - Answers taken from the extension's code and docs: what it does, the 10 apps, what can be copied, colors always shifted and your own fonts and colors used, no coding needed, data (it only reads the page and its CSS, copies to the clipboard, no account and no server; checked in background.js), and Chrome.
  - Stacks into one column at 900px or narrower. Tested at 1440px and 320px: no overflow, rows open, only one stays open.
  - Page height is now 3600.

## 2026-11-12 — Homepage: building-block design system
- Asked: "transition everything to a lego type block design system" / "turn it into a building block lego ish type design style".
- Done (homepage/project/Main.dc.html, canvas version 1794523310-8b23):
  - Tokens:
    - warm baseplate background #fbf8f1, ink #151515;
    - brick colors blue #1d2cfc (the existing accent), yellow #ffc93c, green #21b26f, red #ff5b3a, plus soft tints;
    - every block has a 2px ink edge and a hard 4–6px ink shadow (no blur).
  - Headings use Rubik (rounded and chunky); body text stays Inter.
  - Components in the helmet CSS:
    - `.pl-studs` (studs on a block's top edge; `.sm` for small ones);
    - `.pl-brick` (lifts on hover, presses down on click);
    - the how-it-works and feature cards lift on hover;
    - reduced motion turns the movement off.
  - Hero: both buttons are bricks with two studs; "Add PromptLift to Chrome" is blue, "Watch a quick demo" is yellow.
  - Demo: a blue dotted baseplate with an ink edge; its two windows have ink edges and brick shadows. The panel inside stays one-to-one with the extension.
  - Apps strip: still plain names with no boxes, as asked earlier.
  - How it works:
    - each card is a white brick with studs (blue, yellow, green) and a matching colored dotted baseplate behind its screenshot;
    - the 01/02/03 labels are small colored bricks; "See it" is a yellow brick button;
    - the windows and floating chips have ink edges.
  - Feature cards: white bricks with two studs; each icon sits on a colored square brick.
  - FAQ: each question is its own brick row, 14px apart; an open row turns soft yellow; rows are 20px tall top and bottom (was 28px, to fit the boxed look).
  - Checked at 1440px and 320px: no horizontal overflow; FAQ rows open.
  - Page height is now 3640. Backup of the version before: /tmp/Main.before-bricks.html.
- 2026-11-12 (later): "remove every edit". Undid the whole building-block redesign: restored Main.dc.html byte-for-byte from before it (same sha256 as version 1794523123-abba), and the page height is 3600 again. Canvas version 1794523802-aa9d. The redesign is kept at /tmp/Main.bricks.html in case it's wanted back.
- 2026-11-12 (later): "fix spacing on frequently asked questions".
  - The white band now has Perplexity's 64px sides (it was 0, so the title and lines touched the band's edges) and rounded corners.
  - The title's first line is centered on the first question (35px top padding; measured 2700 = 2700) and wraps evenly.
  - On phones (900px or narrower): 56px/20px band padding, a 24px gap, and no title offset.
  - Checked at 1440px and 320px. Page height is now 3520. Canvas version 1794524208-9289.
- 2026-11-12 (later): "align it with the other parts". The FAQ's white band now runs edge to edge (full-bleed: margin calc(50% - 50vw), padding calc(50vw - 50%)), and its title and questions sit on the same column as the hero, demo and how-it-works. Measured left/right edges: 70/1370 at 1440px, 20/1080 at 1100px, 20/300 at 320px, matching every other part. `main` got overflow-x: clip, so the band never adds sideways scrolling. Canvas version 1794524737-7151.

## 2026-11-12 — Homepage: display headline (pika.art) + extension 9.2.2
- Asked: apply a pika.art font detail (Telka Extended, 57.5px, weight 500, line height 1.04, letter spacing 0.01em, all caps) "for all my pieces of body text"; free stand-in if needed.
- Homepage (homepage/project/Main.dc.html, canvas version 1794525149-564e):
  - The hero headline uses the new `.pl-display` style: Archivo at 125% width (Google Fonts, free) instead of Telka Extended, which is paid and self-hosted by Pika.
  - 57.5px on desktop, scaling down to 30px on phones (clamp(30px, 4vw, 57.5px)); weight 500, line height 1.04, 0.01em letter spacing, uppercase, in the site's ink color.
  - Not applied to running text: at 57.5px in all caps, every paragraph and FAQ answer would be unreadable.
  - Page height is now 3730. Checked at 1440px and 320px: the font loads, no overflow.
- Why the prompt said "body text" (a bug in the extension): a font picked from a 57.5px line in a div got the role "Text font", and the prompt turned that into "Use it for all my pieces of body text". Fixed in 9.2.2:
  - analyzer.js gives text of 30px or more that isn't an h-tag the role "Headline font";
  - prompts.js `nounOf` calls it "big headline" (also when only the code's font-size says 30px or more), so the prompt now reads "Use it for all my big headlines."
  - Checked with a unit test on combine(): 57.5px and 40px → big headlines; 16px → body text; 12px → small text.
  - audit_decisions.py 112/112; e2e.py 200 PASS, twice; manifest 9.2.2; tech_instructions.md updated.
- 2026-11-12 (later): "switch the font on the titles to zilla slab".
  - Every h1/h2/h3 on the homepage is now in Zilla Slab (Google Fonts, weights 500/600/700; Georgia as the fallback) through one rule, `main h1, main h2, main h3`: the hero headline, section titles, card titles, feature titles and the FAQ title.
  - The hero keeps pika.art's 57.5px (30px on phones), weight 500, line height 1.04, letter spacing and caps; Archivo Expanded was removed.
  - Body text, buttons and the demo stay in Inter.
  - Checked at 1440px and 320px: all 14 titles use Zilla Slab, the font loads, no overflow.
  - Page height is now 3670. Canvas version 1794526365-0081.
- 2026-11-12 (later): mintlify.com heading font for all headings (arizonaFlare, 50px, weight 400, line height 1.04, -0.04em) + "remove the all caps from the title".
  - Every h1/h2/h3 is now in Newsreader (Google Fonts, optical sizes, weights 400–700), replacing Zilla Slab. arizonaFlare is a paid font self-hosted by Mintlify; Newsreader is the closest free sharp serif.
  - The hero h1 is 50px (scaling down to 28px on phones: clamp(28px, 3.48vw, 50px)), weight 400, line height 1.04, -0.04em, with no caps.
  - The other headings keep their sizes; body text stays in Inter.
  - Checked at 1440px and 320px: all headings use Newsreader, the font loads, no overflow.
  - Page height is now 3590. Canvas version 1794526641-d1f2.
- 2026-11-12 (later): mintlify.com h2 font (Inter 36px, weight 500, line height 1.11, -0.02em) for "all of the secondary text, but change the size".
  - Every visible h2 (`.pl-h2`) is now Inter 500, line height 1.11, -0.02em, instead of Newsreader 600.
  - Size changed as asked: the section titles ("How PromptLift copies a design", "Frequently asked questions") are 30px (26px before, 36px on Mintlify), scaling down to 22px on phones; the small apps label stays 14px.
  - Inter was already loaded from Google Fonts, so nothing new loads.
  - The h1 and h3s stay in Newsreader.
  - The FAQ title still lines up with the first question at 1440px (2765 = 2765). Checked at 320px: no overflow.
  - Canvas version 1794526980-5203.
- 2026-11-12 (later): "for ALL of the secondary text".
  - The Mintlify Inter style (weight 500, line height 1.11, -0.02em) now covers every h3 as well as the h2s, through one shared rule `main h2.pl-h2, main h3`; the per-h3 weights and spacing were removed.
  - Covered: the 3 card titles (20px), "Pick what each prompt copies" (14px) and the 5 feature titles (16px); each keeps its size.
  - Only the hero h1 stays in Newsreader, and Newsreader now loads just weight 400.
  - Checked at 1440px and 320px: every h2/h3 is Inter 500 / 1.11 / -0.02em, no overflow.
  - Canvas version 1794527144-57e7.
- 2026-11-12 (later): "how promptlift copies a design" and "frequently asked questions" are main titles.
  - Both h2s now use the hero's `.pl-display` style: Newsreader 400, 50px (28px on phones), line height 1.04, -0.04em.
  - Every other h2/h3 stays in the Mintlify Inter style.
  - The FAQ title was re-aligned with the first question (top padding 25px; measured 2785 = 2785).
  - Checked at 1440px and 320px: no overflow. Page height is now 3610.
  - Canvas version 1794527220-be57.
- 2026-11-12 (later): mintlify.com colors for the "How PromptLift copies a design" section.
  - New theme variables in `:root`:
    - --how-title #131917, --how-card-title #08090a (lab 2.43), --how-text #69726f;
    - --how-btn #08090a, --how-btn-text #ffffff, --how-icon #ffffff;
    - --how-card #fdfdfd, --how-panel #f8f5f1, --how-line rgba(8,9,10,0.07).
  - The section has no background of its own (the page shows through).
  - Cards are #fdfdfd with a 7% near-black line. The screenshot stages and the feature cards are flat #f8f5f1 (the dotted pattern was removed: flat colors only).
  - Card and feature titles are near-black; the labels, step numbers, paragraph and subheading are #69726f.
    - The given #747f7d was only 4.07:1 on #fdfdfd and 3.81:1 on #f8f5f1, so it is one step darker to pass 4.5:1.
  - "See it" buttons are filled near-black with white text; the feature icons are white outlines on near-black circles.
  - The blue accent is gone from the section, except inside the screenshots and illustrated windows (those are pictures).
  - Checked at 1440px and 320px. Canvas version 1794527391-e818.
- 2026-11-12 (later): "make every image of the app interactive in some way" + "source a color scheme for the greens from here" (Mintlify picture attached). Canvas version 1794527738-bbf6.
  - Interactive pictures (CSS only; :hover and :focus-within, so keyboard users get them too):
    - Demo animation: pauses while the pointer is on it, with a "Hover to pause" / "Paused" hint (hidden on touch screens).
    - Pick card: the screenshot zooms in a little, the pointer glides to the section, ↑ presses, and a "✓ Section added to your list" toast appears.
    - Choose card:
      - the 4 chips are real checkboxes (labels with inputs, 44px tall, keyboard-focusable);
      - "Add to my list" shows a live count through a CSS counter, and dims when nothing is on;
      - the stage isn't aria-hidden anymore; the decorative window and button are.
    - Paste card: ⌘ and V press, then the 5 prompt lines type in one by one, the reply fades up and "pricing.html updated" pops; at rest everything is shown.
    - With reduced motion on, all of this movement is off.
    - Tested in a headless browser: toast opacity 1 on hover; counter shows (2) after toggling to Colors + Motion; button dims at 0; the paste animations run; the demo pauses. No overflow at 320px.
  - Greens sampled from the image: #00cc8c (main), lime #9cf090, mint #eef8f5, line #a8f0b4.
    - Stored, each shifted slightly, as --how-green #04c98a, --how-lime #a2ee93, --how-green-tint #edf7f3, --how-green-line #b2eeb0, plus --how-green-ink #087a55 (the darker green for text: 4.9–5.3:1).
    - Used for: the step numbers; a green edge on card hover; mint background and a green icon on feature-card hover; checked chips (mint fill, green line and check); the toast check; focus rings.
  - Backup before this change: /tmp/Main.before-interactive.html.
- 2026-11-12 (later): leonardo.ai movement prompt, first "use this for button animations", then the same prompt with <where_on_my_site> "for the different apps used".
  - Built on the hero buttons first, then moved to the 10 app names when the second message named them; the hero buttons are back exactly as before.
  - Each app name has:
    - Detail 1: a 141×62 canvas behind it, redrawn every frame by the component logic (callback ref `appCanvas`, a requestAnimationFrame loop started in componentDidMount and cancelled in componentWillUnmount). It draws two soft lights in that app's --brand color drifting on a ~2s loop, each name slightly out of step; a single still frame under reduced motion.
    - Details 2–4: three echoes of the name in its brand color fade in and drift out on hover (1100 / 950 / 700ms), all on cubic-bezier(0.16,1,0.3,1) (one_look), and play back on leave.
  - Leonardo's moves were page-sized (vw/vh), so the directions and ratios are kept at 8% of the distance in px. The opacities are scaled ×0.3 (1 / 1 / 0.63 → .3 / .3 / .19) so the echoes don't cover neighboring names; they paint behind them.
  - The existing brand-color hover now uses the same easing.
  - The filmstrip (Picture 1) didn't come through with either message, so the drawing is my approximation.
  - Tested by running the component logic in a page: no errors; the canvases draw in each brand color (max alpha 41/255); the echoes reach their end states on hover. No overflow at 320px.
  - Canvas version 1794527886-23f7.
- 2026-11-12 (later): "think more deeply about what questions people would have". The FAQ went from 7 to 11 questions, ordered by what a first-time visitor worries about:
  - What it does; whether copying a design is okay (borrow, don't clone; colors shifted; use your own words, pictures and brand; not legal advice); whether the site will look like a copy; which AI apps (and that the app must see or edit your code); coding; mixing parts from different sites (the list lives in session storage until copied or the browser closes; one_look); animations and hover effects (Motion, load animations, canvas → filmstrip); credits (plain text, character count shown, copy only what you need); whether it works everywhere (browser pages and the Web Store block extensions; already-open pages may need the panel's Reload); data (also switches off when the panel closes); browsers.
  - Every answer was checked against the extension's code and docs (panel.js saveBasket/restricted, tech_instructions lateStart/off-when-closed, prompts.js one_look/shiftColors).
  - No pricing question, since no price is set.
  - Page height is now 4020. Checked at 1440px and 320px. Canvas version 1794527948-516e.
- 2026-11-12 (later): "the animation was not done there correctly at all, instead of logos it needs to be the words moving", then a leonardo.ai detail: a 156×62 moving canvas for "all of the buttons". Canvas version 1794528525-dffb.
  - App names:
    - the canvas and the echo copies are gone (they read as logos); the words themselves now move;
    - every name drifts up and down ±2px on a 2s loop (alternate, each 0.2s out of step);
    - on hover the word itself travels along one of Leonardo's three paths and grows: a = up-right, 1100ms, ×1.14; b = down-right, 950ms, ×1.12; c = down-left, 700ms, ×1.16. It plays back on leave, all on cubic-bezier(0.16,1,0.3,1).
    - Reduced motion: no drift, no move.
  - Buttons: the hero "Add PromptLift to Chrome" and "Watch a quick demo", and the three "See it" buttons, each get a 156×62 canvas behind the label.
    - It is redrawn every frame by the component logic (callback ref `btnCanvas`, a requestAnimationFrame loop): three soft lights drift through each button on a ~2s loop.
    - Colors: light blue on the main button, faint blue on the quiet one, green (--how-green) on the dark "See it" buttons.
    - The buttons got overflow hidden and isolation so the light stays inside, under the label. Still frame under reduced motion.
  - The filmstrip (Picture 1) wasn't attached again, so the drawing is my approximation.
  - Tested by running the logic in a page: no errors; every canvas draws (alpha main 179, quiet 31, dark 114–121); word paths verified per group; no overflow at 320px.
- 2026-11-12 (later): "this gradient is now the accent color, not the blue" (#F4D96B 0% → #B9D96A 45% → #54B9A6 100%). Canvas version 1794528715-747a.
  - Tokens:
    - --pl-accent-grad is the gradient;
    - --pl-accent is now its teal end (#54B9A6), for thin marks;
    - new --pl-accent-ink #2a7568 for text and focus rings (5.3:1; the gradient's stops are only 1.4–2.3:1 on the page);
    - --pl-on-accent is ink #151515 (7.7–13:1 on the gradient).
  - Changed:
    - main button: gradient fill with dark text;
    - quiet button: 1px gradient border (padding-box / border-box);
    - link hover, FAQ icons and focus rings: dark teal;
    - demo: dashed hover outline in teal; the picked outline is a 2px gradient ring (mask, .pl-gradring) with a soft teal glow; the "Section: pricing cards" label has a gradient fill; the pointer's click ring is gradient; the "pricing.html updated" chips are teal;
    - button canvases: white highlights on the main button, faint teal on the quiet one;
    - the AI reply text says "in your accent" instead of "in your blue".
  - No blue left (#1d2cfc / 29,44,252: 0 hits).
  - The "How it works" greens and the extension's own purple inside the demo panel are unchanged.
  - Backup: /tmp/Main.before-gradient.html.
- 2026-11-12 (later): "no gradient, just #B9D96A". Canvas version 1794528832-bc59.
  - --pl-accent is #B9D96A (flat). New --pl-accent-ink #5b6f2a (a darker shade of the same green, 5.5:1) for thin lines, link hover, FAQ icons, focus rings and the "pricing.html updated" chips; #B9D96A is only 1.55:1 on the page.
  - Main button: #B9D96A fill with ink text (11.5:1). Quiet button: 1px dark-green border.
  - Demo: dashed hover outline and the 2px picked outline in dark green, a soft #B9D96A glow, the "Section" label filled #B9D96A, the click ring #B9D96A.
  - Button canvases: white highlights on the main button, faint green on the quiet one.
  - All gradient code and tokens removed (0 hits).
- 2026-11-12 (later): "apply it to every place there is an accent color". Canvas version 1794529028-dd8b.
  - Demo panel: the 4 logo squares are #B9D96A with ink icons; the 7 purple texts and checks ("Claude Code ⌄", segment checks) use --pl-accent-ink; the fresh-row ring is #B9D96A.
  - How it works: --how-green #B9D96A, --how-green-ink #5b6f2a, tint #f4f9e8, line #d3e7a0, so the step numbers, card hover edges, checked chips, toast check and feature hover all follow the accent. The dark "See it" button light is #B9D96A.
  - Left alone on purpose: the success-green status dots and checks (#16a34a, a state rather than an accent), Fieldnote's orange (the sample site's own brand), the app brand colors, and the purple baked into the 3 screenshots (real extension images).
  - Purple/old-green hits in the code: 0.
- 2026-11-12 (later): "remove the button animation". Removed the moving-light canvases from all 5 buttons (hero and "See it"), with their CSS and the component's animation loop (the logic is empty again). The buttons are plain; the app-name movement stays. Canvas version 1794529111-3df9.

## 2026-11-12 — Extension 9.3.0: hover-and-press test
- Asked: "have the extension test button animations by hovering a cursor over and pressing it to observe the animations"; plan confirmed with "execute the app change plan" (automatic, as recommended).
- Done:
  - After every element pick, a visible cursor glides onto the pick on the page, rests (hover), presses and lets go (only for buttons and links; text boxes are hovered only), then moves away.
  - What the page's JavaScript animates is recorded per step: hover → "On hover", press → "On click", with the prompt saying "while it's pressed (and plays back when released)". The site's CSS :hover / :active looks are shown on the element at the same moments.
  - The panel shows "Testing hover and press…".
  - No click is ever sent; untrusted clicks and submits are blocked during the test. A real click by the person ends the test, and so does starting a recording.
  - Files: recorder.js (pointerBegin / pointerPress / pointerEnd), picker.js (testCursor, UI v12), panel.js (catchHoverFor, status row, startRecording), motion.js / prompts.js (press-js wording), tests/fixtures/site/index.html (#jsp, #jsl), tests/e2e.py (6 new checks).
  - First run found a real bug: the test blocked the person's own click on the link they had just picked ("Press it" recording never finished). Fixed by blocking only untrusted clicks and ending the test on a real press.
  - e2e.py 208 PASS, twice; audit_decisions.py 112/112; manifest 9.3.0; user_instructions.md and tech_instructions.md updated; new promptlift.zip.

## 2026-11-12 — Homepage: FAQ proportions, "Made with PromptLift" rail, "Quick guides" videos
- Asked: "rethink proportions with frequently asked questions, add a part for websites made by this app in a left to right scrollable format and a part for website guide short form videos".
- Done (homepage/project/Main.dc.html, canvas version 1794530041-7e32):
  - FAQ:
    - columns 5 : 7 with a 64px gap (was 1 : 3, 96px), so the 50px title reads on two lines instead of three;
    - the title is sticky (top 24px) and stays in view while the 11 questions scroll past;
    - rows have 20px above and below (was 28px) at 17px; answers are up to 640px wide;
    - the band got align-self: stretch, because it was shrinking to its content inside the flex column: the list ended at 1142px instead of 1370px.
    - Measured: title at 70px, list ending at 1370px (and 20/1080 at 1100px), first line centered on the first question.
  - New "Made with PromptLift" section:
    - a left-to-right rail (ul with overflow-x, scroll-snap per card, tabindex 0 for the keyboard) of 6 cards, each a 16:10 picture placeholder plus a name and "what was lifted" placeholders;
    - ← → buttons (44px, accent on hover) scroll one card at a time through the component logic (railRef, railBack / railOn, smooth unless reduced motion).
  - New "Quick guides" section:
    - 4 vertical 9:16 video placeholders (dark, accent play icon, "[0:00]" length placeholder) with real how-to titles: Pick a whole section, Copy only the colors, Catch a hover effect, Paste into your AI app;
    - 4 across on desktop, a swipeable snapping row at 900px or narrower.
  - Order: … How it works → Made with PromptLift → Quick guides → FAQ.
  - No sites or videos exist yet, so every picture, name, length and video is a marked [placeholder].
  - Tested: no errors; the rail scrolls one card (0 → 444px; 286px on a phone); no overflow at 320 / 1100 / 1440px.
  - Page height is now 5330. Backup: /tmp/Main.before-showcase.html.
- 2026-11-12 (later): "remove the bouncy animation from the brand logos". Removed the constant ±2px drift (pl-drift keyframes and the per-name --d delays) from the 10 app names; they sit still now. The hover move along Leonardo's paths and the brand-color hover stay. Checked: animation none, transform unchanged over time, hover still moves the name. Canvas version 1794530581-af1b.
- 2026-11-12 (later): "moves when you hover over it". Removed the hover movement from the app names (the pl-move-a/b/c paths and their CSS); pointing at a name now only turns it its brand color. Checked: transform none on hover, color changes. Canvas version 1794531360-9b27.
- 2026-11-12 (later): "moves when you hover over it as a part of the app": I had misread the previous message as "remove the hover move". Put the hover movement back: the names sit still (no drift) and only move when pointed at, each word travelling along one of Leonardo's three paths and growing slightly (1100 / 950 / 700ms, cubic-bezier(0.16,1,0.3,1)) while turning its brand color, then playing back on leave. Checked: no animation at rest; on hover transform matrix(1.14, …, 10, -3) and the brand color. Canvas version 1794531478-7dbf.

## 2026-11-12 — Extension 9.3.1: hover movement in the panel
- Asked: "as part of the app of promptlift, the actual extension: there are currently animations on press, add animation on hover".
- Done (panel.css): buttons, chips and icon buttons lift 1px on hover (the main button also gets a deeper shadow); cards and list rows lift with a soft shadow; pick rows, saved rows and menu items slide 2px; playable previews grow 2%. Same 160ms timing and easing as the press squeeze, which still wins while pressed. Only with a real pointer, and off under reduced motion.
- Checked in the real panel: a hovered button is translateY(-1px), it goes back at rest, and it doesn't move with reduced motion.
- e2e.py: one run had a scroll-timing check flake ("a section that reacts to scrolling also offers Motion"), then 2 clean runs in a row (208 PASS each); manifest 9.3.1; docs updated; new promptlift.zip.

## 2026-11-12 — Homepage: Version A saved, Version B started
- Asked: "save this as version a of the website, lets make a version b now".
- Done (canvas version 1794533001-1c42):
  - The current page stays at project/Main.dc.html, titled "Version A" on the canvas; it is left untouched from now on. A local snapshot is at homepage/version-a.snapshot.html.
  - Version B (project/VersionB.dc.html) starts as an exact copy, 80px to the right of A on the canvas.
  - The canvas now opens on the overview so both show side by side.
  - Later changes go to Version B only, unless asked otherwise.

## 2026-11-12 — Homepage Version B: first full build (big batch)
- Asked (one long message): a demo at the top (a film by default, plus a part to try it), a cinematic faster film, the accent in many more places, AI-friendly phrasing, the rectangular structure from a screenshot, ideogram button hover + darker on hover, moving showcase rows (framer prompt), a final call to action (webflow prompt), scrollable FAQ, blur-in on the last two words of each headline line (lovable prompt), radial gradient + Unsplash flowers at the top, an extension restyle to match the site, a store description and images, legal coverage, green text selection, an ideogram-style footer, colorful filler visuals. Mid-way: "where is the new site?" (published right away).
- Version B on the canvas had been emptied (only styles were left), so it was rebuilt from Version A's parts with homepage/build_b.py. The output, project/VersionB.dc.html (canvas version 1794541491-874f), replaced it.
  - Sections:
    - hero (Unsplash daisies by Wolfgang Weiser under a light wash, three radial glows, blur-in words, rolling buttons);
    - demo tabs: Watch it (a 10s five-scene film with camera moves and chapters) and Try it yourself (a sample site, real toggles, a live prompt, copy, and a note on why it can't open other sites);
    - AI apps; "What is PromptLift?" (plain facts + use cases); How it works (accent buttons and icons, colorful ribbons behind the screenshots);
    - Made with PromptLift (centered title + button, top row of 6 drifting left, bottom row drifting right; placeholders); Quick guides (colorful covers);
    - FAQ (13 questions in a scrolling box, sticky title); final call to action (webflow 5/12 + picture); the fine print (trademarks, responsible use, privacy, terms, credits, contact, with placeholders); footer with a giant wordmark on a green gradient.
  - Head: meta description + JSON-LD (SoftwareApplication, FAQPage). ::selection is #B9D96A. Hairline-framed column.
  - Tested with a stand-in runtime (homepage/test/harness.py): no errors; film scenes checked at 1.2 / 3.0 / 4.7 / 6.8 / 9.0s; Try-it toggles and prompt update; no overflow at 320px.
- Extension (in progress, not yet released): panel restyled to the website look (v9.4 block in panel.css, bundled Newsreader + OFL, new green icon via tools/make_icons.py, picker labels green). e2e 208 PASS once.

## 2026-11-12 — Version B: undo the extras
- Request: "only do what i prompted you, not restructuring everything / remove the gradient dots".
- Removed from [VersionB.dc.html](../homepage/project/VersionB.dc.html) (via [build_b.py](../homepage/build_b.py)): all six small dot labels above section titles, the dot row under the hero buttons, the green squares in the "Good for" list, and the added demo heading ("From a site you like to your own…"). Version A's section titles are kept.
- Canvas board height updated to 8126px in [canvas.json](../homepage/project/canvas.json).

## 2026-11-12 — Version B rebuilt on Version A's format
- Request: "i want the format on version A again… apply the things in the prompt, changing nothing but the format of sites made there, the button animations, the fade in color, the text CONTENT (not format) and the bottom part… optimize it for web too".
- New generator [build_b2.py](../homepage/build_b2.py) copies [Main.dc.html](../homepage/project/Main.dc.html) (Version A) and applies only:
  - Made with PromptLift: framer layout, title, line and button centered; top row moves left, bottom row moves right (placeholders).
  - Buttons: the label rolls up on hover (ideogram), and the button turns darker.
  - Headline: "you love" and "own site." blur in from below with a green-to-ink color fade (lovable).
  - Text content: page title, meta and Open Graph tags, JSON-LD (SoftwareApplication + FAQPage), clearer first FAQ answer, Made/Guides lines, and two more FAQ answers (DevTools vs PromptLift; price placeholder).
  - Bottom part: call to action (webflow), "The fine print" legal block, and a footer with the big wordmark (ideogram).
  - Web: viewport, font preconnect, lazy-loaded images below the fold, reduced-motion fallbacks.
- Everything else (hero photo, cinematic demo, Try-it sandbox, "What is PromptLift" block, scrolling FAQ box, frame lines) is gone. The old [build_b.py](../homepage/build_b.py) is kept but no longer used.
- Tested at 1440px and 320px: no sideways scroll, rows move in the right directions, the hover darkens the button and rolls the label, and the JSON-LD parses. Board height is now 7239px.

## 2026-11-14 — Version B: make the animations playable on the canvas
- Request: "do the button and scroll animations, or is that not possible here".
- The animations were already in the page, but the canvas shows artboards in edit mode, where hover and motion don't run. I marked Version B as interactive in [canvas.json](../homepage/project/canvas.json) (`is_interactive: true`), so it gets a Play button. Nothing else changed, and your two edits to Version B are kept.

## 2026-11-14 — Version B: an animation for each image
- Request: "add animations for each image" (and "how can i test animations?").
- Added one CSS block to [VersionB.dc.html](../homepage/project/VersionB.dc.html). Each image now animates in as it scrolls into view, driven by scrolling (`animation-timeline`), with no script:
  - step 1 window: rises up and comes into focus;
  - step 2 panel: drops in from above;
  - step 3: the list slides in from the left and the AI app from the right;
  - quick-guide videos: grow in one after another;
  - call-to-action picture: tilts up into place.
- Only opacity, blur and the separate translate/scale/rotate properties are animated, so the existing hover effects still work (checked: the step 1 zoom is still 1.05). People who've set reduced motion, and browsers without scroll-driven animations, see the images still.
- Tested at 1440px and 320px: each image is hidden before it scrolls in, moves while entering, and is in place once in view. No sideways scroll and no errors. The user's own edits to Version B are kept: only the new CSS was inserted.
- Note: build_b2.py no longer matches the published Version B (the user's edits plus this block), so regenerating from it would overwrite them.

## 2026-11-14 — Version B: looping "in use" animations on every screenshot
- Request: "now add animations like on the top, but for every screenshot".
- [patches/loops.py](../homepage/patches/loops.py) patches the live [VersionB.dc.html](../homepage/project/VersionB.dc.html). Like the demo at the top, each screenshot now plays its own loop with a pointer and click rings, and pointing at it pauses the loop:
  - Step 1 (8s): click the Fast card, an outline appears; ↑ is pressed, the outline grows to the whole section; then "Section added to your list".
  - Step 2 (8s): click Colors, click Layout, press "Add to my list", then "Added to your list".
  - Step 3 (10s): click "Copy again", ⌘ V is pressed, the prompt types in line by line, the AI app replies, then "pricing.html updated".
  - Call to action (10s): pick "Top of homepage" (it types into the field), the panel scrolls, type what it should show, press "Copy prompt", then "Copied to your clipboard".
- The old one-time hover versions of steps 1 and 3 became these loops, and the step 1 zoom and old pointer are gone. The step 2 chips can still be clicked. The scroll-in animations from earlier still run.
- Reduced motion shows the screenshots still, with no pointers. On phones the pointers are hidden, as in the top demo.
- Tested in a browser: frames at 15/40/70% of each loop look right; pointing pauses each of the 4 loops and leaving resumes them; no sideways scroll at 320px; no errors. The patch was applied to the live file, so the user's edits are kept.

## 2026-11-14 — Version B: main sections 950px tall
- Request: "make each section 950 pixels tall". User's answers: taller content scrolls inside its section; the small strips stay as they are.
- [patches/height950.py](../homepage/patches/height950.py) changes the live [VersionB.dc.html](../homepage/project/VersionB.dc.html). On desktop (wider than 900px), six sections are exactly 950px:
  - **Taller content scrolls inside its section:** the top (title, buttons, demo; the 950 is counted from the top of the page), How PromptLift copies a design, and the FAQ.
  - **Shorter content is centered vertically:** Made with PromptLift, Quick guides, and the call to action.
- The top part had no box of its own, so it got one wrapper div (`.pl-top950`). How lost its extra 16px top margin, and its padding went from 96 to 64px.
- The app-names strip, the fine print and the footer are unchanged. Phones keep the normal flow.
- Board height is now 6610px in [canvas.json](../homepage/project/canvas.json).
- Tested at 1440px and 1024px: each of the 6 sections measures exactly 950px. 320px is unchanged. No sideways scroll and no errors.

## 2026-11-14 — Version B: app names stop moving
- Request: "remove their animation at least" (the AI app names under the demo, after logos were declined).
- Removed the hover movement (the three Leonardo paths) from the names in [VersionB.dc.html](../homepage/project/VersionB.dc.html). Hovering still turns a name its brand color. Version A is unchanged.
- Checked in a browser: on hover the name's transform stays `none` and its color changes.

## 2026-11-14 — Version B: bold, spaced-out app names
- Request: "bold the text and space it out further" (the AI app names under the demo).
- In [VersionB.dc.html](../homepage/project/VersionB.dc.html), the names are now weight 700 (was 600), and the gap between them is 36px (was 8px). The row gap stays 8px.
- Checked at 1440px and 320px: the names wrap cleanly with no sideways scroll.

## 2026-11-14 — Version B: system font instead of the serif
- Request: "change the serif to the other system font".
- In [VersionB.dc.html](../homepage/project/VersionB.dc.html), every Newsreader heading (the headline, section titles, card titles, the call-to-action title) and the footer wordmark now use the system font stack (system-ui, -apple-system, Segoe UI, Roboto…). This is the same font as the app names strip. Sizes and spacing are unchanged, and Version A is unchanged.
- Checked in a browser: every h1/h2/h3 and the wordmark compute to system-ui, with no sideways scroll.

## 2026-11-14 — Version B: Stripe headline font (detail 1)
- Request: design detail 1 from stripe.com, sohne-var 32px / 300 / line height 1.1 / -0.02em, on all big headlines; color left to me.
- In [VersionB.dc.html](../homepage/project/VersionB.dc.html), all six big headlines (`.pl-display`: hero, How, Made, Quick guides, FAQ, call to action) now use Inter Tight 300 at 32px, line height 1.1, letter spacing -0.02em, in the site ink #151515. On smaller screens they scale down in proportion to a 24px minimum. Söhne is a paid Klim font, so free Inter Tight from Google Fonts stands in, added to the existing font link.
- Smaller headings (card titles, fine print) keep the system font, and body text stays Inter.
- Checked: computed values are exact at 1440px (32px) and 320px (24px), the font loads, and there's no sideways scroll. The headline now fits on one line on desktop.

## 2026-11-14 — Version B: headlines in Helvetica
- Request: "so switch it to helvetica".
- In [VersionB.dc.html](../homepage/project/VersionB.dc.html), the big headlines' font stack is now "Helvetica Neue", Helvetica, "Inter Tight", sans-serif. Apple devices show Helvetica Neue Light (300); devices without Helvetica (Windows, Android) get Inter Tight 300 instead of a heavy Arial. Size, weight and spacing are unchanged (32px / 300 / 1.1 / -0.02em).
- Checked: the stack computes correctly. On the Linux test machine, which has no Helvetica, it falls back to Inter Tight as intended. I couldn't check Helvetica itself here, because it only exists on Apple devices.

## 2026-11-14 — Version B: all text in Helvetica
- Request: "make it all helvetica".
- In [VersionB.dc.html](../homepage/project/VersionB.dc.html), all text is now "Helvetica Neue", Helvetica, with Inter as the fallback. That covers body text, buttons, app names, the demo and screenshot labels, the code-style prompt lines, FAQ, fine print, the footer and the wordmark. The big headlines keep their stack (Helvetica Neue, then Inter Tight 300). Sizes, weights and colors are unchanged.
- Checked: every text element computes to Helvetica Neue first, the headline's blur words follow the headline stack, and there's no sideways scroll.

## 2026-11-14 — Version B: flower photo behind the top
- Request: "put this as a background in the beginning of the landing" (the user's photo: yellow flowers under a blue sky, Nhi D on Unsplash).
- The photo is compressed to 2400px JPEG, 390 KB ([assets/rapeseed-sky.jpg](../homepage/assets/rapeseed-sky.jpg)) and uploaded as a canvas asset.
- In [VersionB.dc.html](../homepage/project/VersionB.dc.html), the top box (headline, buttons, demo) now runs to both window edges and up to the very top. The photo covers it with the flowers along the bottom, on a sky-blue fill while it loads. The content keeps its place. On desktop the box is still 950px.
- Added the photo credit to the fine print.
- Checked at 1440px and 320px: the box is full width from y=0, the headline is still at x=70, the apps strip still starts below 950, and there's no sideways scroll.

## 2026-11-14 — Version B: flower background, made sturdier
- Request: "i dont see it" (about the flower background).
- The live file had the background, so the canvas was most likely showing an older copy while it had unsaved edits open.
- To make it sturdier, I moved the photo from the stretched top box to its own layer behind the page's first 950px (`main::before`). That avoids the window-width tricks (`100vw`) that can come out differently inside the canvas. The top box went back to its normal size and position.
- Checked at 1440px and 320px: the photo layer is 950px tall and full width, the content is unchanged, and there's no sideways scroll.

## 2026-11-14 — Version B: serif back on the headlines
- Request: "bring back the serif font / update version B".
- In [VersionB.dc.html](../homepage/project/VersionB.dc.html), the six big headlines and the footer wordmark are back in Newsreader. The headlines keep the current Stripe size and spacing (32px / 300 / 1.1 / -0.02em). I added Newsreader 300 to the font link so the light weight is real, not faked. All other text stays Helvetica.
- Checked: the headlines, the blur words and the wordmark are in Newsreader; FAQ questions and the apps label are in Helvetica; Newsreader 300 loads; no sideways scroll.

## 2026-11-14 — Version B: headlines use Version A's serif settings
- Request: "bring back the same serif settings of A".
- In [VersionB.dc.html](../homepage/project/VersionB.dc.html), the big headlines now match Version A exactly: Newsreader 400, clamp(28px, 3.48vw, 50px), line height 1.04, letter spacing -0.04em. This replaces the Stripe values (32px / 300 / 1.1 / -0.02em). The other text stays Helvetica, and the footer wordmark stays Newsreader.
- Checked: the computed values for all six headlines are identical in A and B at 1440px (50px) and 320px (28px).

## 2026-11-14 — Version B: no white panel behind the demo
- Request: "remove the white background from the site demonstration".
- In [VersionB.dc.html](../homepage/project/VersionB.dc.html), the demo's light panel (`#demo`, was `--pl-surface` #f3f3f1) is now transparent, so the flower photo shows around the two demo windows. The windows keep their own white backgrounds and shadows.
- Checked: the `#demo` background computes to transparent.

## 2026-11-14 — Version B: A's font scheme; demo sized for the flower background
- Request: "bring back the font scheme from A. and now optimize the size of the animation for the new background".
- In [VersionB.dc.html](../homepage/project/VersionB.dc.html), I removed the system-font and all-Helvetica overrides and the stale Stripe comment. I also dropped the unused Inter Tight and Newsreader 300 from the font link. Fonts now match Version A: Newsreader on the display titles, Inter for text, buttons and card titles, the system font for the app names, and JetBrains Mono for the prompt text. The footer wordmark stays Newsreader. Checked element by element against A.
- On desktop the demo animation is scaled to 78% with `zoom`, and its top margin went from 56 to 36px. The whole top (headline, buttons, demo) now fits in the 950px over the photo with no scrolling inside: the demo spans y≈261–823 at 1440px, with the flowers showing below and beside it. I compared 72%, 78% and 84% and picked 78%. Phones are unchanged (zoom 1, no sideways scroll).
- The user's own edits (white headline, h1 width) are kept: the change was applied to the live file.

## 2026-11-14 — Version B: bigger demo, green text highlight
- Request: "make it considerably larger, the size the white rectangle took up before", then "make the highlight color green".
- In [VersionB.dc.html](../homepage/project/VersionB.dc.html), on desktop the demo is now scaled up to 120% (`zoom`), with the old panel's padding removed. The windows fill the area the light panel used to take (1296px wide at 1440, 684px tall). The top margin went to 24px so the whole top still ends inside 950px (demo y 262–946), with no scrolling inside. Phones are unchanged.
- Selected text now highlights in the site green #B9D96A with ink text (`::selection`).
- Checked at 1440, 1024 and 320px: the top doesn't scroll, there's no sideways scroll, and the selection color computes to #B9D96A.

## 2026-11-14 — Version B: top spacing, clear demo button, flower blocks, "See it" buttons
- Request: "fix the spacing on the top of the homepage / make the "watch a quick demo" button clear / add flowery backgrounds to every block of showing the app / change the fonts and the colors of each button…" (the buttons in the "how it works" part).
- In [VersionB.dc.html](../homepage/project/VersionB.dc.html), on desktop there's now 64px above the headline and 40px above the demo. "Watch a quick demo" has a see-through fill with a white outline and white text. Every app block sits on a flower photo. The "See it" pills are green #B9D96A with ink text in the Newsreader serif.

## 2026-11-14 — Extension 9.4.0: My instructions
- Request: "to the app itself, add a place for custom prompting".
- The home screen has a "My instructions" box ([panel.js](panel.js), [panel.css](panel.css)). It saves itself and is added to every prompt as `<my_instructions>` ([prompts.js](prompts.js)). Docs are in [user_instructions.md](user_instructions.md) and [tech_instructions.md](tech_instructions.md).
- Tests: e2e 213 PASS, audit 112/112.

## 2026-11-14 — Version B: arrows, a photo per block, realistic sample sites
- Request: "put the arrow to the top / bring back the arrows to all buttons / find a different flower image on unsplash for each / make the sample websites more proffesional and less AI looking".
- In [VersionB.dc.html](../homepage/project/VersionB.dc.html), every button has an up-right arrow. Each app block has its own Unsplash flower photo, credited in the fine print. The sample sites are six realistic fictional pages.

## 2026-11-15 — Version B: white highlighted text, no text animations, cleanup and phone fixes
- Request: "make the text white when highlighted / remove every text animation / this site is just overall a mess, make sure it is better overall".
- In [VersionB.dc.html](../homepage/project/VersionB.dc.html) (patch script [round_nov15.py](../homepage/patches/round_nov15.py)):
  - **Highlight:** highlighted text is white on the darker green #5b6f2a. White on #B9D96A would be 1.55:1, which is unreadable.
  - **Text animations removed:**
    - the headline blur-in;
    - the rolling labels on all buttons and "See it" pills (the darker hover and the arrow nudge stay);
    - the typing in the demo's AI window, in the step 3 card and in the closing panel.
  - **Phones:**
    - The headline wraps; it was 902px wide and ran off the screen. Desktop keeps the 902px.
    - The flower photo now covers the whole top box.
    - The demo has no empty space under it, and the AI window stays visible.
    - Below 640px the PromptLift panel sits under the demo site instead of being squeezed beside it.
    - Below 480px the demo site's menu shows only "Sign in".
  - **Cleanup:** removed dead CSS (old mockups, the old rail, rules that later rules overrode, unused keyframes).
- Checked at 320/390/768/1024/1440px: no sideways scroll; the button labels don't move on hover; no text animations are left; no script errors.

## 2026-11-15 — Homepage: pressed buttons, hover arrow, new wording, equal rows, modular grid; extension 9.4.1
- Request: "make the buttons lighter when pressed / make the arrow be thick and go to the right, and only apply when the button is hovered over / rephrase it all away from "copy", make the phrasing a lot more interesting / make both areas of the websites made the same height / add a modular grid layout, like on Stripe's website / check if there are any requested edits to the app, if so, then apply them and send me a new version".
- [VersionB.dc.html](../homepage/project/VersionB.dc.html) (patch script [round_nov15b.py](../homepage/patches/round_nov15b.py)):
  - **Buttons:** pressed buttons turn lighter (#d3e7a0 for the green ones; the clear button and the "See it" pills too).
  - **Arrow:** a thick right-pointing arrow (Lucide arrow-right, stroke 3). It's hidden at rest and opens out after the label on hover or keyboard focus. The "See it" pills show it when their card is hovered.
  - **Text:** rewritten throughout without "copy": headings, cards, quick guides, FAQ (and the FAQ structured data to match), the call to action and the fine print. The only "Copy" left is in the demo's mock-ups of the app's own clipboard buttons. "Made with PromptLift" is now "Ideas, transplanted", and the line under it says these are sample sites rather than claiming they're real.
  - **Sample sites:** both rows are now the same size (394px; the second row was scaled to 31%). The section still fits in 950px on desktop.
  - **Modular grid** (after stripe.com):
    - the five feature cards are modules on a 12-column grid (7 + 5, then 4 + 4 + 4), lining up with the cards above, each with a one-line description;
    - thin dashed guide lines run down the page behind the content, at the edges and quarters of the 1300px column (edges only on phones).
- Extension 9.4.1: the design-taking wording says "lift" ([panel.js](panel.js)); clipboard buttons still say Copy. Docs: [user_instructions.md](user_instructions.md), [tech_instructions.md](tech_instructions.md). Tests: e2e 213 PASS, 0 FAIL.
- Checked at 320/390/768/1024/1440px: no sideways scroll; the arrow is width 0 and opacity 0 at rest, 16px and visible on hover; the pressed fill computes to #d3e7a0; both rows are 394px; no script errors.

## 2026-11-15 — Homepage: new How heading, spacing above the sample sites
- Request: "from "ooh nice" is not good / and fix the spacing in the image attached" (the "Ideas, transplanted" title sitting right against the step 3 card above it).
- In [VersionB.dc.html](../homepage/project/VersionB.dc.html) (patch script [round_nov15c.py](../homepage/patches/round_nov15c.py)):
  - The How heading is now "Three steps from a site you admire to your own".
  - Both sample-site rows are scaled to 78% (still the same height, 307px each), so the 950px section has room above its title and below the rows.
- Checked: 61px above the title and 61px below the rows at 1440 (68px at 1024), no scrolling inside, no sideways scroll at 320.

## 2026-11-15 — Homepage: label roll back, lighter hover
- Request: "keep the spin animation / and make the color of the button lighter instead of darker when hovered". Asked which animation: "Button label roll".
- In [VersionB.dc.html](../homepage/project/VersionB.dc.html) (patch script [round_nov15d.py](../homepage/patches/round_nov15d.py)):
  - **Label roll is back:** on hover the label slides up and its twin rises in from below. This applies to all 4 buttons and the 3 "See it" pills. It stays off for people who turned on reduced motion.
  - **Hover is lighter, pressed is lighter still:**
    - green buttons and "See it": resting #B9D96A, hover #cbe38a, pressed #dcecb0;
    - clear button: white 16% on hover, 28% pressed.
  - The thick right arrow still appears on hover.
- Checked at 320 and 1440: computed colors at rest, on hover and pressed; the label moves up 20px and the twin shows; no sideways scroll; no errors.

## 2026-11-15 — Homepage: no inner scroll in "Three steps"
- Request: "remove the weird independent scroll in the "three steps from a site you admire"".
- In [VersionB.dc.html](../homepage/project/VersionB.dc.html) (patch script [round_nov15e.py](../homepage/patches/round_nov15e.py)), on desktop this section is now as tall as its content (at least 950px) and scrolls with the page: 1628px at 1440, 1633px at 1024. The other sections keep their 950px.
- Checked: nothing to scroll inside the section at 320/1024/1440; no sideways scroll.

## 2026-11-15 — Homepage: new second row of sites, rows end at the column, FAQ fade with expand, bottom picture
- Request: "make it so that the sites are not the same for both heights in the scroll / make the sites be cut off at the line where text is cut off / make it so that the section of questions is faded off with an arrow to expand it down / Make the image better at the bottom".
- In [VersionB.dc.html](../homepage/project/VersionB.dc.html) (patch script [round_nov15f.py](../homepage/patches/round_nov15f.py)):
  - **Second row:** six new fictional sites, Parcel (shipping API), Ondine (swimwear), Kettle & Crumb (bakery), Tallis (music school), Fieldwork (magazine) and Brightside (home solar). The first row keeps its six, so the two rows no longer repeat each other.
  - **Rows end at the column edges:** both rows stop at the edges of the 1300px text column (the outer guide lines) with a clean cut. The full-bleed width and the edge fade are gone.
  - **FAQ:**
    - The first ~7 questions show and the rest fade out to white.
    - A "Show all questions" button with a down arrow opens the whole list; it then reads "Show fewer" and the arrow flips.
    - It needs no script: a checkbox drives it, keyboard focus is shown, and the button is 44px tall.
    - The section no longer scrolls inside itself (it's at least 950px tall).
  - **Bottom picture:** the panel now sits lower in the flower photo, with room above it, and runs off the bottom edge like a window rising into view. Before, it touched both the top and the bottom.
- Checked at 320 and 1440: both rows sit exactly inside the column (70–1370px at 1440); the FAQ list is 620px closed and 1105px open (the whole list), and toggles back; no sideways scroll; no errors.

## 2026-11-15 — Homepage: even section spacing, best FAQ
- Request: "make sure the spacing is good / and make sure the questions are the best".
- In [VersionB.dc.html](../homepage/project/VersionB.dc.html) (patch script [round_nov15g.py](../homepage/patches/round_nov15g.py)):
  - **Spacing:** every section below the top now has 96px above and below its content on desktop. Before, it varied (64, 61, 104, 96 and 198px). Phones and tablets get 72px everywhere; before, the questions section had 56px and the sample-site rows touched the next section. Desktop sections stay at least 950px tall and grow when they need to, so nothing scrolls inside.
  - **FAQ:** reordered so the most-asked questions show before the fade (what it does, coding, which apps, price, borrowing, looking like someone else's), and answers tightened.
    - New question: "What if the result isn't quite right?"
    - "Which browsers" and "every website" merged into "Which browsers and sites does it work on?"
    - The FAQPage structured data was rebuilt from the same answers; the price question stays out until it has an answer.
- Checked at 390/1024/1440: spacing measured per section; nothing scrolls inside; no sideways scroll; the structured data parses; no errors.

## 2026-11-15 — Website ready to publish; settings and images in one place; privacy policy and terms
- Request: "prepare the site for publishing / and create a place to fill it with images and the link / Create the privacy policy and terms of use".
- **Builder:** [homepage/export/build_site.py](../homepage/export/build_site.py) turns [VersionB.dc.html](../homepage/project/VersionB.dc.html) into a plain static site in `site/` (zip: `promptlift-website.zip`, preview artifact "PromptLift website (ready to publish)").
  - No canvas runtime and no third-party requests: fonts are self-hosted (@fontsource) and images are local files with readable names.
  - SEO files: canonical, share image (1200×630, generated), favicons, robots.txt, sitemap.xml.
- **One place to fill in:** [settings.js](../homepage/export/settings.js) holds the Chrome Web Store link, contact email, company name, governing law, price answer and the four guide videos. [site.js](../homepage/export/site.js) applies it on every page.
  - Empty values show [placeholders].
  - The console lists what's missing.
  - The price question stays hidden until it has an answer.
- **Images:** go in `images/` (fixed names, listed in [README.md](../homepage/export/README.md)), and the domain goes in by replacing `YOUR-DOMAIN.com`.
- **Legal pages:** [privacy.html](../homepage/export/privacy.html) and [terms.html](../homepage/export/terms.html), written from what the extension really does. I checked manifest.json, background.js, panel.js, picker.js and analyzer.js: what it reads, session vs local storage, CSS fetches without cookies, the visible-tab screenshot, the permissions, and that there's no server. They include the Chrome Web Store user-data commitments and need a lawyer's review.
- The "fine print" section now links to the real pages, and its Google Fonts note was replaced (the site no longer uses Google Fonts).
- Checked over HTTP at 320/375/1440 on all three pages, with empty and filled settings:
  - no external requests, 404s or errors; no sideways scroll (after shortening the legal header button below 420px);
  - fonts load; store links, mailto, company, law, price and a test guide video are applied.

## 2026-11-15 — Homepage: tighter gap between the questions and the closing section
- Request: "i think the spacing here is too big" (screenshot: the FAQ's "Show all questions" button and the closing "The web is full of good ideas" section).
- In [VersionB.dc.html](../homepage/project/VersionB.dc.html) (patch script [round_nov15h.py](../homepage/patches/round_nov15h.py)):
  - the FAQ and closing sections no longer have the 950px minimum height;
  - there's 48px under the questions and 48px above the closing section (it was about 380px of empty space in the screenshot).
- The publishable site ([site/](../site), promptlift-website.zip) and its preview artifact were rebuilt from it.
- Checked: 96px from the button to the closing section at 390 and 1440; no sideways scroll.

## 2026-11-15 — Step detail sheets; app redesign 9.5.0; web optimization; 50 name ideas
- Request: "for see it, have a section that comes from the bottom that goes into greater detail about the section, and make it be a expander button instead of "see it" / go ahead with the rest / remake the site name and logo / optimize for web".
- **Step detail sheets** ([VersionB.dc.html](../homepage/project/VersionB.dc.html), [round_nov15i.py](../homepage/patches/round_nov15i.py)):
  - The three step cards show a round green plus. It turns 90° on hover and becomes × while open.
  - The whole card opens a sheet that slides up from the bottom, built on the native popover (no script). It closes with Esc, a click outside or its close button, and focus returns to the card.
  - Each sheet has the step number, a serif title, a lead, rows with keys or options, and a green tip.
  - Checked at 390 and 1440: Esc and the close button work, the chips in step 2 still toggle, no sideways scroll.
- **App redesign, extension 9.5.0** (the plan the user approved):
  - Lighter hover and pressed states; a rolling label and a hover arrow on the main button (`setBtnLabel`).
  - Serif titles; 01/02 mono numbers (JetBrains Mono, bundled); green-tint chips; white highlighted text; 12px corners.
  - Flower photos on the empty list and the "Copied" card; dark mode kept.
  - Files: [panel.js](panel.js), [panel.css](panel.css), fonts/, images/, docs.
  - Tests: e2e 213 PASS, 0 FAIL; audit 112/112; empty state checked light and dark at 320px.
  - The website's four app screenshots were retaken with the new look and uploaded to the design.
- **Web optimization** ([build_site.py](../homepage/export/build_site.py)):
  - Photos → WebP at the size they're shown; the share image → JPEG (920 KB to 149 KB).
  - Every image has width and height (no layout jumps); CSS and HTML comments stripped.
  - A `_headers` file for caching on Netlify / Cloudflare (fonts a year, images 30 days, pages always fresh).
  - Site 2.73 MB → 1.47 MB; zip 1.3 MB.
  - Checked over HTTP at 320/390/1440 on all pages: no external requests, no broken images, no errors.
- **Name and logo:** sent 50 name ideas (shortlist Yarrow, Posy, Graft, Sprig, Clary). The rename and new logo wait for the user's pick.

## 2026-11-15 — Name feedback; new logo: half flower, half face
- "Waldobot?":
  - No exact "Waldobot" product exists, but "Waldo" evokes "Where's Waldo?". There's also a Waldo mobile-testing tool, acquired by Tricentis in 2023, in a similar space.
  - "Bot" suggests a chatbot, and the name drops the flower idea.
  - Suggested a "-bot" flower blend or a robot character instead.
- Request: "make a new flower like logo / half flower, half face".
- Three original marks in [logo/](../logo), all in the site's green with a yellow seed center and ink outlines:
  - 01 Half bloom: petals on the flower half, a winking face on the other half.
  - 02 Full bloom: a ring of petals.
  - 03 With a leaf: the flower half plus one leaf on the face side.
- Delivered as SVG plus PNG at 16, 32, 48, 128, 180 and 512px (logo-options.zip) and an options page artifact, "Logo: half flower, half face". The page shows each mark with the wordmark on light, dark and green, and at icon sizes.
- Checked: the page has no sideways scroll at 390 or 1280.
- The logo goes into the extension and site once the user picks a version and a name.

## 2026-11-15 — Simpler one-color logo; 50 search terms worked into the site
- Request: "no colors, make it much simpler / not litterally half face half flower / then identify the top 50 SEO words or phrases and incorporate them into the site for search".
- **Logo:** three one-color marks, each a flower whose center is a face. They use currentColor, so they work in black, white or any color.
  - 01 Bloom face: five petals, eyes and a smile.
  - 02 One line: a single-line outline with a smile.
  - 03 Four petals: around a smiling center.
  - Files: [logo/mono/](../logo/mono) (black and white SVG, PNG at 16–512) and logo-flower-face.zip. The artifact "Logo: flower face" replaces the earlier page.
- **Search terms:**
  - Semrush had no API units, so I used research instead: competitor store listings (Pluck, VIBErip, UIDrop, Web to MCP, CSS Peeper, CSS Pully and others) and how people describe the task.
  - The list, with where each term is used, is in [seo-keywords.md](../homepage/seo-keywords.md).
  - Three "copy" or "clone" phrases are left out on purpose: they conflict with the earlier "away from copy" request and the "borrow, not clone" stance.
- **Worked into [VersionB.dc.html](../homepage/project/VersionB.dc.html)** ([round_nov15j.py](../homepage/patches/round_nov15j.py)):
  - title (53 characters) and description;
  - a one-line hero description;
  - the apps label, the feature-card heading and lines, and the sample-site, guides and closing lines;
  - image descriptions (alt text) on the app screenshots;
  - FAQ: 3 new answers (vibe coding; fonts and color palette; redesign my site) and a broader comparison question (DevTools, CSS inspector, screenshot-to-code);
  - structured data: the FAQ rebuilt from the visible answers (15), and the app's description, features and keywords.
  - The demo is 3% smaller and 20px closer to the buttons, so the top still fits in 950px.
- Rebuilt [site/](../site), the preview artifact and promptlift-website.zip.
- Checked: the top box doesn't scroll at 901, 1440 or 1920; no sideways scroll at 320 or 390; the structured data parses (15 FAQ answers = 15 visible); no errors.

## 2026-11-15 — 15 more search terms; all 65 on the site
- Request: "also 15 unique words and phrases / put them all into the website well enough for search to pick them up".
- 15 distinctive terms added:
  - website style transfer, design brief generator, AI-ready design brief, design reference for AI;
  - make my website look like another site, match a website's style;
  - Cursor / Claude Code / Lovable / v0 / Bolt design prompt;
  - hover effect inspector, animation inspector, style guide from any website, UI inspiration to code.
  - The list is updated in [seo-keywords.md](../homepage/seo-keywords.md).
- A new section, "One extension, a lot of uses", sits before the FAQ in [VersionB.dc.html](../homepage/project/VersionB.dc.html) ([round_nov15k.py](../homepage/patches/round_nov15k.py)):
  - nine cards on the 12-column modular grid (3 per row on desktop, 2 on tablets, 1 on phones);
  - each card has a plain-language heading (h3) and a short paragraph carrying related terms;
  - the "copy" and "clone" phrases now appear in one card that steers toward borrowing ("Copy website design? Borrow it instead"), as the user asked for all of them.
- The patch checks the page's visible text and fails if any of the 65 terms is missing: 65/65.
- Rebuilt [site/](../site), the preview artifact and promptlift-website.zip.
- Checked at 320/390/1024/1440: card widths 280/350/312/417px, no sideways scroll, no errors.

## 2026-11-16 — Rename to Huescribe, friendlier wording, no fill-ins, Chrome Web Store kit
- Asked: pick a unique name (Wallbot, then Petalscribe, PromptScribe and DesignScribe were checked; the last two are taken), then "huescribe, lets do that / no company name or anything / give me everything I need to put this extension on Chrome", and "humanize the text on both the website and the piece there".
- **Name:** "Huescribe" / "Hue Scribe" returned no matches in exact web searches. Renamed everywhere: extension code, ids, tests, docs, the folder ([huescribe/](.)), the website and the legal pages. Manifest 10.0.0, name "Huescribe: turn website design into AI prompts".
- **Icon:** logo 03 (four petals, smiling center) on a white tile: [tools/make_icons.py](tools/make_icons.py), [icons/](icons).
- **Extension wording:** friendlier panel text ([panel.js](panel.js), [picker.js](picker.js)); see [user_instructions.md](user_instructions.md) → 10.0.0.
- **Website** ([round_nov16a.py](../homepage/patches/round_nov16a.py) to [round_nov16d.py](../homepage/patches/round_nov16d.py)):
  - new headline "See a design you love? / Bring it to your own site." and plainer copy throughout; no more "lift" wordplay;
  - the nine use-case cards rewritten as natural sentences that still carry all 65 search terms (65/65);
  - removed every fill-in: the price question, the video-guides section, the company name, contact email, governing law, the placeholder domain, `settings.js` and `site.js`. Store buttons open a Chrome Web Store search for Huescribe; contact goes through the listing's Support tab;
  - the demo panel shows the new logo; the four app screenshots were retaken with the new name (on a sample address, acme.dev).
  - Legal pages: [privacy.html](../homepage/export/privacy.html), [terms.html](../homepage/export/terms.html) (governing-law clause replaced by "Disagreements"). Builder: [build_site.py](../homepage/export/build_site.py); [README.md](../homepage/export/README.md) no longer has setup steps.
- **Chrome Web Store kit** (`huescribe-chrome-web-store-kit.zip`): huescribe.zip, store icon, 3 screenshots, small and marquee promo tiles, the website zip, and [STORE-LISTING.md](../store/STORE-LISTING.md) (step-by-step guide, listing text, privacy answers, permission justifications). Builder: [tools/make_store_assets.py](tools/make_store_assets.py).
- Tests: e2e.py 213 PASS (no failures), audit_decisions.py 112/112, the packaged zip loads in Chrome with no errors. The site was checked at 320/390/1440 px: no sideways scroll, no console errors, links point to the store, privacy.html and terms.html.

## 2026-11-16 — Logo 03 in green, Inter wordmark, text-only logos
- Asked: "3, but change the name to what we indicated before, and use the sans serif font / also think about text based alternative logos / and use the green on the icons".
- Logo page (artifact "Logo: Huescribe", source `logo/hs/index.html`): logo 03 on the green tile at 128/48/32/16 and in light and dark Chrome toolbars; the lockup with an Inter Semibold wordmark (horizontal, dark, stacked); seven text-only options: A plain, B highlighter, C picked (picker outline), D two weights, E green dot, F lowercase, G "Hs" monogram.
- Icons: black mark on #B9D96A ([tools/make_icons.py](tools/make_icons.py)) for the extension, the store icon and the website favicons.
- Website ([round_nov16e.py](../homepage/patches/round_nov16e.py), [round_nov16f.py](../homepage/patches/round_nov16f.py)): the demo panel's logo on green; the footer's giant wordmark in Inter Semibold instead of Newsreader; app screenshots retaken with the green icon. Kept the user's own canvas edit (one-line headline, 1057px wide).
- Store promo tiles: wordmark in Inter Semibold ([tools/make_store_assets.py](tools/make_store_assets.py)).
- Rebuilt huescribe.zip (loads with no errors), huescribe-website.zip and the store kit; site checked at 320/390/1440 px with no sideways scroll or errors.

## 2026-11-18 — Removed Version A of the site
- Asked: "delete version a of the site".
- The design canvas now holds only Version B: `project/Main.dc.html` removed and its board taken out of [canvas.json](../homepage/project/canvas.json) (Version B moved to the left edge). Version B, the built site and the zips are unchanged. Version A stays recoverable from the artifact's version history (versions up to 1795041400-faf5).

## 2026-11-18 — Use cards on phones, extension animations, SEO (languages postponed)
- Asked: "the features section is just too long on mobile / and optimize animations on the extension too / add the top 20 languages to the site", then "set the languages for later, make sure the SEO is done well". Section chosen: "One extension, a lot of uses".
- **Site, phones** ([round_nov18a.py](../homepage/patches/round_nov18a.py)): the nine use cards are one swipeable row (scroll-snap) with a "Swipe for more" hint; keyboard-focusable. The section is 643px tall at 390px (was 2,602px). Desktop unchanged.
- **Extension 10.1.0** ([picker.js](picker.js), [panel.css](panel.css)): overlays placed and animated with transform; pointer handling batched to one per frame, with clicks settling a pending hover first; chosen outlines skip style writes while nothing moves; "reading" pulse animates opacity; dead filter transitions removed. Details in [tech_instructions.md](tech_instructions.md) → 10.1.0. Found and fixed during testing: a fast click could act on the previous highlight. e2e.py 219 PASS twice (6 new checks), audit 112/112.
- **SEO and speed** ([round_nov18b.py](../homepage/patches/round_nov18b.py), [round_nov18c.py](../homepage/patches/round_nov18c.py), [build_site.py](../homepage/export/build_site.py)):
  - the sample-site strip is one image with a description; its made-up titles are no longer h4 headings (they joined the page outline);
  - meta description cut from 199 to 160 characters (Google shows about 155–160);
  - sections below the first screen render only when they come near (content-visibility, with measured placeholder heights);
  - the cosmos photo is 900px at q48 (297 KB → 237 KB);
  - footer links are 44px touch targets.
  - Lighthouse (real throttling): mobile 98 / 100 / 100 / 100 (performance, accessibility, best practices, SEO), LCP 1.7s, CLS 0; desktop 98 / 100 / 100 / 100, LCP 1.1s. FAQ structured data matches the 15 visible questions.
- Languages: postponed. Plan agreed: homepage only, legal pages stay English.
- Rebuilt huescribe.zip (10.1.0), huescribe-website.zip and the store kit.

## 2026-11-19 — "Picked" wordmark; words for search engines and AI assistants
- Asked: "i really like 'picked'", and "by SEO i also mean adding words that pick it up on search engines and other AI's".
- **Picked wordmark** ("Hue" in the picker's outline with two handles):
  - website footer ([round_nov19a.py](../homepage/patches/round_nov19a.py)); now shows whole so both handles are visible;
  - store promo tiles and the share image, drawn by [tools/wordmark.py](tools/wordmark.py) (used by [make_store_assets.py](tools/make_store_assets.py) and [build_site.py](../homepage/export/build_site.py));
  - logo page: lockups use it, C marked "Chosen".
- **Research:** Semrush still has no API units, so I looked at what similar extensions and vibe-coding guides call things: "copy UI component to Cursor / Claude Code", "design system extractor", DESIGN.md, "visual reference", generic "vibe-coded" look.
- **Page** ([round_nov19a.py](../homepage/patches/round_nov19a.py)):
  - new section "Other ways to give your AI a design reference" with a comparison table (screenshot, DevTools, DESIGN.md/token extractors, component copiers, Huescribe; categories only), pinned first column on phones;
  - five new FAQ answers (generic vibe-coded look; DESIGN.md / AGENTS.md / Cursor rules; vs design-token extractors; no account or API key; Codex, Replit, Stitch, Figma Make), 20 in all;
  - "Updated November 19, 2026" in the footer.
- **Structured data:** WebSite, HowTo (the three steps), SoftwareApplication with wider keywords, FAQPage matching all 20 questions.
- **For AI assistants:** robots.txt names and allows the AI search crawlers; [llms.txt](../homepage/export/llms.txt) (overview) and llms-full.txt (the page as markdown, rebuilt each build by [llms_full.py](../homepage/export/llms_full.py)). Terms and where they live: [seo-keywords.md](../homepage/seo-keywords.md).
- **Checks:**
  - all 65 earlier search terms still on the page;
  - Lighthouse 98 / 100 / 100 / 100 (performance, accessibility, best practices, SEO), LCP 1.7s, CLS 0;
  - no sideways scroll at 320 / 390 / 1440 px and no console errors.
- **Published:** canvas, site preview and logo page; rebuilt the website zip and the store kit.

## 2026-11-19 — Fewer, plainer words; two sections removed
- Asked: too many words everywhere; remove "One extension, lots of uses" and "Other ways to give your AI a design reference"; cut corny, non-human language.
- **Page** ([round_nov19b.py](../homepage/patches/round_nov19b.py)):
  - removed the uses and comparison sections and their CSS;
  - rewrote the hero line, the three steps (now "Pick / Choose / Paste", cards and detail sheets), "What it reads", sample sites, CTA ("Borrow the good parts.") and fine print in short plain sentences;
  - FAQ: 20 questions → 9 short answers; the "Show all questions" toggle is gone.
- **Structured data:** HowTo and FAQPage rewritten to match; [llms.txt](../homepage/export/llms.txt) page description updated; llms-full.txt rebuilt.
- **Trade-off:** 12 of the 65 tracked search phrases are still visible (most lived in the removed uses section); the rest remain only in the meta keywords and structured data. See [seo-keywords.md](../homepage/seo-keywords.md).
- **Checks:** page 8,022 → 6,162 px on desktop (10,726 → 8,612 on phones), placeholder heights re-measured (no jump while scrolling); no sideways scroll at 320 / 390 / 1440; FAQ items and step sheets open; no console errors.
- **Published:** canvas and site preview; rebuilt huescribe-website.zip and the store kit.

## 2026-11-19 — Even wordmark spacing; photos on "What it reads"
- Asked: same spacing between all letters of the "Huescribe" label; a background picture on each "What it reads" card, no icons; more realistic pictures there.
- **Wordmark** ("Hue" no longer adds space before "scribe"):
  - website footer ([round_nov19c.py](../homepage/patches/round_nov19c.py)): tracking -.03em, outline drawn as its own layer from Inter's glyph bounds; e→s gap now equals s→c (13px at desktop size);
  - logo page (`logo/hs/index.html`): same approach, tracking .01em at lockup sizes;
  - store tiles and share image: [tools/wordmark.py](tools/wordmark.py) draws every letter with the same tracking; re-ran [make_store_assets.py](tools/make_store_assets.py) and the site build.
- **"What it reads"** ([round_nov19c.py](../homepage/patches/round_nov19c.py), later undone in nov19d): icons removed; each card is a photo with white text over a dark fade, slight zoom on hover. Unsplash (free license): color swatch fan (Andy Brown), wood type (Fabien Barral), grid facade (Pawel Czerwinski), light trails (Davide Cantelli), flower shop (Qingqing Cai); credited in the fine print. Images in `homepage/assets/read-*.jpg`, exported as 900px WebP ([build_site.py](../homepage/export/build_site.py)).
- **Checks:** letter gaps measured at 1440 / 390 / 320; no sideways scroll; images load; Lighthouse 98 / 100 / 100 / 100, LCP 1.7s, CLS 0.
- **Published:** canvas, site preview, logo page; rebuilt huescribe-website.zip and the store kit.

## 2026-11-19 — Photos removed again; footer with the logo large
- Asked: remove the "What it reads" photos and go back to before; 15 more alternatives to "hue"; an alternative format for the last part of the page with the logo large.
- **Cards** ([round_nov19d.py](../homepage/patches/round_nov19d.py)): icon cards restored exactly as before nov19c; photo CSS, extra credits and the read-* images removed from the build ([build_site.py](../homepage/export/build_site.py)). The even wordmark spacing stays.
- **Footer:** large green logo tile next to the "Picked" wordmark in ink on a light band (stacked and centered on phones), small print row below.
- **Checks:** 1440 / 768 / 390 / 320: no sideways scroll, footer links 44px, no console errors.
- **Published:** canvas and site preview; rebuilt huescribe-website.zip and the store kit.

## 2026-11-19 — Footer back, logo in the last section, screenshots, demo video, larger serifs
- Asked: the "last section" meant "Borrow the good parts": revert the footer and put the large logo there; screenshots of every part of the app; a quick demo video with a voice; how to edit text and images yourself; then "make the serifs larger".
- **Footer** restored (faded "Picked" wordmark, even spacing) and **call to action** redone: one wide card on the cosmos photo with the logo tile large, headline, line and button, centered ([round_nov19e.py](../homepage/patches/round_nov19e.py); [build_site.py](../homepage/export/build_site.py) matches the new section class).
- **Larger serif headings:** hero and section titles clamp(28px,3.48vw,50px) → clamp(34px,4.9vw,72px); placeholder heights re-measured ([round_nov19f.py](../homepage/patches/round_nov19f.py)).
- **Screenshots:** [tests/app_screenshots.py](tests/app_screenshots.py) captures 17 states (page + side panel) on a made-up demo site (`/home/claude/demo-site`, served as fieldnote.app): empty list, hover outline, whole section, section choices, drag an area, area choices, hover-and-press test, element choices with Motion, my list, row menu, Adjust, AI app menu, ⋯ menu, My instructions, copied, picking stopped, dark mode. Output: `/home/claude/app-screens`, zip `huescribe-app-screenshots.zip`.
- **Demo video** (`/home/claude/demo-video`): [record.py](../demo-video/record.py) records the real extension on the demo site (CDP screencast of page and panel, drawn cursor); [assemble.py](../demo-video/assemble.py) composes a browser window at 1920×1080/30 fps with captions, title and end cards, and the voice (Kokoro TTS, voice af_heart, lines in `lines.json`). Result `huescribe-demo.mp4`, 48 s.
- **Checks:** 320 / 390 / 1024 / 1440: no sideways scroll, no clipped headings, no console errors; video frames and voice timing checked.
- **Published:** canvas and site preview; rebuilt huescribe-website.zip and the store kit.

## 2026-11-19 — Selection color, roomier wordmark, no Questions, full-width last section, fewer icons, nav options
- Asked: a nicer text-selection green; more space between the "Picked" box and the letters and stronger corner squares; remove "Questions" again; the last section with the flower logo in white in the background, one summary image of the app, the flower photo full width; a perfect extension UX with fewer Claude-looking icons; 5 navigation bar options; the best setup for editable screenshots and video guides; how long a name change takes.
- **Selection color** ([round_nov19g.py](../homepage/patches/round_nov19g.py), [legal.css](../homepage/export/legal.css), [panel.css](panel.css)): soft lime #d6eb9a with ink text (panel dark mode #b9d96a).
- **Wordmark** ([round_nov19h.py](../homepage/patches/round_nov19h.py), logo page, [tools/wordmark.py](tools/wordmark.py)): every letter a little looser (footer .02em, logo page .08em, images .05em) so the box has room on all sides; corner squares bigger, white with a solid dark-green border. Store tiles, share image and video cards redrawn.
- **Website** ([round_nov19h.py](../homepage/patches/round_nov19h.py)): Questions section and FAQPage data removed; last section is a full-width band on the cosmos photo with a large white flower behind and the app picture (side panel) rising from the bottom edge.
- **Nav options:** new board "Navigation bar options" on the canvas (`project/NavOptions.dc.html`): clear over photo, floating pill, light bar with the wordmark, dark bar, logo + one button.
- **Extension 10.1.1** ([panel.js](panel.js), [panel.css](panel.css)): decorative icons removed (menus text-only except the AI-app check; empty list, Added, Start picking, Single parts, Slow motion, Undo changes, press/reload rows, error line); "Adjust" gets a chevron; Single parts / Slow motion look like buttons; copy-button label no longer gray. Screens re-captured ([tests/app_screenshots.py](tests/app_screenshots.py)); e2e 219 PASS ×2; demo video re-recorded.
- **Published:** canvas, site preview, logo page; rebuilt huescribe.zip (10.1.1), website zip, store kit, screenshots zip.

## 2026-11-22
- **Asked:** make the first app view (the website's top demo) much more animated and dynamic, show most of the app, and much faster.
- **Done:** rebuilt the demo as a 14.5-second loop that picks three things (section → Colors + Layout, headline → Fonts, Monthly/Yearly switch → Motion recording), switches the AI app to Cursor, copies the prompt, and shows the Cursor window typing the prompt and the updated page ([round_nov22a.py](../homepage/patches/round_nov22a.py), [VersionB.dc.html](../homepage/project/VersionB.dc.html), [i18n_site.py](../homepage/export/i18n_site.py)). The pointer is placed by measuring the page, so it lands right at every width and in Arabic (RTL). New labels translated into all 14 languages ([i18n/site](../homepage/i18n/site)). Checked at 320/390/768/1024/1440, reduced motion, hover-to-pause, no console errors. Preview: [hero-demo-preview.mp4](../homepage/hero-demo-preview.mp4).
- **Published:** canvas and site preview (all 15 languages); rebuilt [huescribe-website.zip](../huescribe-website.zip).
- **Asked:** make the sample website in the animation more interesting.
- **Done:** Fieldnote now has a warm background with three slowly drifting color blobs, a "New · Offline mode is here" pill, a larger headline (28px), icon tiles on each plan, a raised glowing Pro card, prices that flip to yearly ($8→$6, $14→$11) when the switch is pressed, and an avatars + stars "Loved by 40,000 writers" row ([round_nov22a.py](../homepage/patches/round_nov22a.py)). New labels translated in all 14 languages ([i18n/site](../homepage/i18n/site)); checked 320–1440, ar, ru, de. Republished canvas and site preview; rebuilt [huescribe-website.zip](../huescribe-website.zip) and [hero-demo-preview.mp4](../homepage/hero-demo-preview.mp4).
- **Asked:** make the AI interface in the animation more realistic.
- **Done:** the AI window is now a dark code editor (file tree, `pricing.css` tab with a dirty dot, red/green diff lines that appear one by one) with an agent chat: the pasted prompt arrives as a message ("Pasted · 6,240 chars"), a shimmering "Thinking…", "Read pricing.html" and "Edited pricing.css +7 −1" steps with a spinner turning into a check, a reply in the visitor's language with a preview of the new cards, and the "Ask anything" box with a send button ([round_nov22b_ai.py](../homepage/patches/round_nov22b_ai.py) → [round_nov22a.py](../homepage/patches/round_nov22a.py)). The editor's own words stay in English and left-to-right in every language (`translate="no"`, now honored by [i18n_site.py](../homepage/export/i18n_site.py)); the reply is translated into 14 languages. End states now hold until the loop restarts. Checked 320–1440, Arabic, Japanese, reduced motion, no console errors. Republished canvas and site preview; rebuilt [huescribe-website.zip](../huescribe-website.zip) and [hero-demo-preview.mp4](../homepage/hero-demo-preview.mp4).
- **Asked:** make sure the onboarding shows and lets you interact rather than tells.
- **Done:** built the onboarding as a hands-on practice page that opens on install ([welcome.html](welcome.html), [welcome.css](welcome.css), [welcome.js](welcome.js), [background.js](background.js)). You pick, choose, add and really copy, then really paste into a practice AI window and watch it work, then pin and open the real panel. One short line per step, and a pointer shows the next click when you wait. In the panel, the first-run tip is a small moving example with **Practice (1 minute)**; the ⋯ menu's "How it works" opens the practice ([panel.js](panel.js), [panel.css](panel.css)). Version 10.2.0 ([manifest.json](manifest.json)); docs updated. Tests: [tests/welcome_test.py](tests/welcome_test.py) all pass (desktop, phone, Arabic); e2e 219/219; audit 112/112. Rebuilt [huescribe.zip](../huescribe.zip).
- **Asked:** localize the Chrome Web Store listing (name, summary, description) into 14 languages, written for search in each language, not word for word.
- **Done:** new `appName` / `appDesc` in [_locales](_locales) for es, pt_BR, fr, de, it, tr, id, vi, ru, ar, hi, zh_CN, ja, ko (all within 75 / 132 characters, JSON validated); full listings in `../store/listing-<lang>.md` (Name, Summary, Description with the English structure, native search terms, no keyword repetition; terms matched to [i18n/site](../homepage/i18n/site)). Documented in [tech_instructions.md](tech_instructions.md). huescribe.zip not rebuilt yet.

## 2026-11-22 (evening)
- **Asked:** translate the extension (finish the paused work) and optimize the store description for SEO.
- **Done:** all 14 languages, 1,369 texts each, 0 errors ([locales/translations](locales/translations), built into [locales](locales)); language files renamed to the runtime codes (pt, zh). New end-to-end test in every language: pick, choose, add, copy, at 320 and 400 px, no clipped text, no English left, complete prompts, Arabic RTL, welcome page ([tests/languages_test.py](tests/languages_test.py)) — all pass. Store: new English name/summary/description written for search ([STORE-LISTING.md](../store/STORE-LISTING.md), [_locales/en](_locales/en/messages.json)) and localized names, summaries and descriptions for 14 languages ([store/listing-*.md](../store), `_locales/*`). Rebuilt [huescribe.zip](../huescribe.zip) and the store copy.
- **Asked:** run cybersecurity optimizations.
- **Done:** sender/shape checks on every extension message, panel-only port, safer stylesheet fetching, explicit extension CSP + minimum Chrome 116 ([background.js](background.js), [manifest.json](manifest.json)); website security headers with a strict hash-based CSP generated on every build ([build_site.py](../homepage/export/build_site.py)). e2e 219/219, welcome test, language test all pass; site pages load with no CSP violations. Rebuilt [huescribe-website.zip](../huescribe-website.zip).
- **Asked:** require Google login. Decided: prepare for paid plans, checked inside the extension only, the practice stays open without signing in.
- **Done (10.3.0):** "Continue with Google" gate in the panel ([account.js](account.js), [panel.js](panel.js), [panel.css](panel.css), [background.js](background.js), [manifest.json](manifest.json)); sign-out in ⋯; picking refused while signed out; profile kept only in the browser with `plan: 'free'` ready for a server. 15 new texts in 14 languages. Privacy policy, store listings (15 languages), store Privacy tab and Google OAuth setup steps, website privacy line updated ([privacy.html](../homepage/export/privacy.html), [STORE-LISTING.md](../store/STORE-LISTING.md), [round_nov24a.py](../homepage/patches/round_nov24a.py)). Tests: [account_test.py](tests/account_test.py) all pass (both states, 400/320 px), e2e 219/219, welcome, all 14 languages, audit 112/112. Needs from you: the Google Cloud OAuth client ID (steps in STORE-LISTING.md).

## 2026-11-25
- **Asked:** simplify the website's "What it reads" section; make each "How it works" animation show more.
- **Done:** "What it reads" is now one row of four pills (Colors, Fonts, Layout, Motion; 2×2 on phones) and one line, "Your words, images and brand stay yours." (was five cards). How it works: 01 Pick labels the outline ("Card: Fast" → ↑ → "Section: features (3 cards)") and then shows a "What it read" card (colors, fonts, layout, hover); 02 Choose pops what each choice takes (5 colors, "3 columns · gap 24px") and "Your fonts stay" for Fonts; 03 Paste shows "Copied to your clipboard", then Thinking…, "Edited pricing.html +18 −6", the reply and a preview of the new cards ([round_nov25a.py](../homepage/patches/round_nov25a.py), [VersionB.dc.html](../homepage/project/VersionB.dc.html)). New labels in 14 languages ([i18n/site](../homepage/i18n/site)). Checked 320–1440, ar/ru/de/ja, reduced motion, hover pause, CSP; republished canvas and site preview; rebuilt [huescribe-website.zip](../huescribe-website.zip).
- **Asked:** add back the "Questions" section.
- **Done:** the 9-question FAQ is back above the final call to action, with its FAQPage structured data, restored from the last version that had it ([round_nov25b.py](../homepage/patches/round_nov25b.py)). The account answer now says you sign in once with Google (no API key, nothing sent to a server). Translated into 14 languages ([i18n/site](../homepage/i18n/site)). Checked: opens/closes one at a time, 320–1440, Arabic and Japanese, structured data valid in every language, no CSP issues. Republished canvas and site preview; rebuilt [huescribe-website.zip](../huescribe-website.zip).
- **Asked:** research whether the FAQ asks the best questions.
- **Done:** researched competing extensions (Pluck, slicer.dev, VibeDesign and others charge $10–$79/month or need an API key), the screenshot-vs-exact-values debate, framework questions, logged-in pages and the legal worry about copying a site. FAQ now 12 questions: added "Is it free?", "Why not just give my AI app a screenshot?", "Does it work with React, Tailwind or my framework?", "Does it work on any website?"; "Will my site look like someone else's?" became "Is it OK to borrow design from another site?"; removed "What is vibe coding?". Structured data rebuilt from the same list ([round_nov25c.py](../homepage/patches/round_nov25c.py)); translated into 14 languages. Checked 320–1440, Arabic, Japanese, structured data, CSP. Republished canvas and site; rebuilt [huescribe-website.zip](../huescribe-website.zip).
- **Asked:** make the FAQ fade out with an expand button again.
- **Done:** the list shows about 7 questions and fades into white, with "Show all questions" / "Show fewer" under it (checkbox + label, no script; keyboard works) ([round_nov25d.py](../homepage/patches/round_nov25d.py)). Button text in 14 languages. Checked 320/390/1440, Arabic, German, expand and collapse by mouse and keyboard, CSP. Republished canvas and site; rebuilt [huescribe-website.zip](../huescribe-website.zip).
- **Asked:** make each animation loop; optimize the spacing.
- **Done:** every timed animation already looped (hero 14.5 s, How it works 8–10 s, CTA 10 s, sample sites). The real bug was on phones: a tap left `:hover` stuck and paused the demo and pictures. Pause-on-hover now applies only to devices with a mouse, and the "Hover to pause" hint is hidden on touch screens. Spacing between big sections is now even: 128 px on wide screens (it was 96–192) and 96 px on phones. Also tightened the gap under the CTA heading (79 → 20 px) and the space between the hero buttons and demo on phones ([round_nov25e.py](../homepage/patches/round_nov25e.py)). The scroll-in entrances (pictures rising in) still play with the scroll, not on a timer. Checked 320/390/1440, an iPhone with a tap (0 of 69 animations paused), desktop hover (still pauses), and CSP. Republished canvas and site; rebuilt [huescribe-website.zip](../huescribe-website.zip).
- **Asked:** put everything into GitHub ([artem1287/huescribe](https://github.com/artem1287/huescribe)).
- **Done:** pushed the extension (`huescribe/`), website source and build (`homepage/`, without `out/`) and store kit (`store/`, without zips) to `main`, with a root README, CLAUDE.md and .gitignore (ignores built `site/`, zips, keys, caches). 182 files; scanned for keys and passwords first, none found.
- **Asked:** move every file in the workspace to another computer through the GitHub repo.
- **Done:** the repo root now mirrors the whole workspace: built `site/`, all zips, screenshots, the demo video and its scripts, test pages, logo, the PromptLift backup and the sample prompts. Left out only `demo-video/frames/` (218 MB of regenerable frames) and the hidden system folders. Scanned for keys first. See [README](../README.md).
