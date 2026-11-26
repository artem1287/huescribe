# PromptLift — command log

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

