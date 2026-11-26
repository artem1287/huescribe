# Huescribe: user guide

See something you like on a website? Huescribe turns it into a prompt you paste into Claude Code, so your own site gets it too.

## Install (Chrome, Edge, Brave; in Arc it opens as its own window beside the browser; if it falls back to a popup there, whole sections and dragged areas aren't available)
1. Unzip `huescribe.zip` into a folder. `manifest.json` must be directly inside it.
2. Go to `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and pick the folder.
3. Pin Huescribe. Click its icon (or press **Alt+Shift+P**) to open it on the side.

## How to use it
Open Huescribe. Picking is on right away, and the panel shows **My list**: everything you've chosen so far, which becomes one prompt.

**The header** has the one setting, **which AI app** the prompt is for (Claude Code, Claude chat, ChatGPT or Gemini, Cursor/Windsurf/Copilot, Lovable/v0/Bolt). Tap it to change it; it's remembered. Each app gets the prompt in the form it reads best: tags for Claude; Markdown for the others. Chat apps, which can't see your code, use the files you already gave them in that chat, or ask once (whether you have a site yet, and then only the files they need, for a one-page site just its HTML file). Site builders get a short opening.

The **⋯** menu holds what you need now and then: **Open in its own window** (movable, e.g. to a second screen; your list comes along), **Back to the side panel** (from that window), **Reload the page** (catches animations that play as the page opens), **Clear my list** (tap twice) and **How it works**.

### 1. Point at anything
- **Click** something on the page: a button, a heading, a card, a picture. Hovering outlines what will be picked and names it with its size ("Card 360 × 220"); the outline glides between things and follows the pointer when you scroll.
- **↑ ↓** make it bigger or smaller, **up to a whole section** (the label then says "Section: …").
- **Drag** over any area: across several sections (they're taken together), or over part of one (just those pieces, e.g. two of three cards).
- Right after a click the outline pulses and the panel says "Reading Card…". If a part can't be read, the panel says "Couldn't read that part. Try another." On very busy pages it shows "Getting the page ready…" for a moment.
- **Esc** stops picking; **Start picking** in the panel turns it back on.

### 2. Choose what you want from it
The panel asks **What do you want from it?** Turn on at least one choice.
Every pick offers the same four choices, in the same order: **Colors**, **Fonts**, **Layout** and **Motion**. Take them all to copy the whole thing.
- **A thing you clicked**: each choice is a group with a switch. Tap the switch to take the whole group; open the group to tick single things (one color out of five, one animation). Motion opens by itself:
  - **Every animation has a preview**: a frame-by-frame strip (hover and press effects: before → after; scroll behavior: the element at points along the scroll). **Tap the strip** to play it on the page again; **Slow motion** plays it slowly. The picked animation keeps replaying on the page until you move on.
  - **Hover and press effects** are found from the site's CSS (also when hovering a card changes something inside it) and, for effects made with JavaScript, by a quick **hover-and-press test**: right after you pick something, a cursor glides onto it on the page, rests there (hover), and, if it's something you can press (a button or link), presses it and lets go, then moves away. The panel says **Testing hover and press…** meanwhile. The site's CSS hover and press looks are shown on the element at the same moments. Hover effects are listed under **On hover**, press effects under **On click** ("while it's pressed"). The test never clicks: links don't open and forms don't send. Text boxes are only hovered. Clicking the page yourself ends the test.
  - **Scroll behavior is checked by itself** right after the pick (the page scrolls a little and comes back): sticking, sliding in, moving slower than the page, changing as you scroll. Otherwise it says "No scroll effect".
  - At the end of Motion, only when they apply: **Moves when you press it? → Press it** (press it on the page; it finishes by itself, and a link won't leave the page that one time) and **Moves when the page opens? → Reload**.
- **A whole section or a dragged area**: tap the choices you want (**Motion** is offered only where something in it reacts to scrolling). **Single parts instead** takes a section apart (its gradient, a hover effect inside it…).
  - **Colors** = the color scheme: backgrounds and gradients, decorations, text colors by role, every button style, cards, tags, borders, icon colors, glows.
  - **Fonts** = the font scheme: every kind of text by role with family, size, weight, line height and letter spacing; where the fonts come from (free Google Font, system font, licensed); how they relate. The prompt says which of your text gets which font, how to load it, to keep those ratios on phones, and to warn before a third family.
  - **Layout** = the format, and only the layout (no fonts, no colors): a one-line gist ("section title → 3 cards in a row"), **where it sits on the page** (what is directly above and below it, full width or a centered column, any overlap or gap, sticky), how it's arranged, the spacing, and its color relationships (darker than the page, cards a bit lighter…). Text sizes stay, so the bigger-to-smaller order is kept.
  - **Motion** = what happens as you scroll through it, with a preview.
- **Colors and Fonts also decide whose colors and fonts are used.** Leave Colors off and an animation's or a text's colors become your site's; tick it and the original colors are kept. The same goes for Fonts.
- **Add to my list**.

### 3. My list
Each pick is one row: a preview, its name, what it copies ("Colors · Layout"), and:
- **Where on my site** (optional): type it, or tap a chip that fits (a heading: **All h1 headings**; a section: **Top / Middle / Bottom of homepage**; the navigation: **Top of every page**). Say "replace my hero" or "new section after the hero". Left empty, parts go in list order, top to bottom.
- **What should it show?** (optional, on parts that hold content): e.g. "my 3 best sellers: sourdough, croissants, rye". Left empty, the content comes from your site.
- **⋯**: **Adjust** (how it should change in your own words, quick tweaks like Bigger, Softer, Faster with **Show on page**, exact numbers, **Make a new picture from this**), **Copy just this**, **Copy picture**, **Move up / down**, **Remove**.

The list stays until you close the browser or clear it, so you can change it and copy again.

**My instructions** (under the list, 9.4): your own words that go into every prompt you make, for example "Use Tailwind classes. Keep my logo, my brand blue #1d4ed8 and my wording." They are added at the end of the prompt, just before what the AI app should do when done, word for word (colors you type are never shifted). They stay until you clear the box, also after closing the browser. The box says **On** while it has text and **Optional** when it's empty.

### 4. Copy prompt
**Copy prompt (N parts)** copies the whole list as one message (shortcut: ⌘+Enter on Mac, Ctrl+Enter elsewhere; the same keys press **Add to my list** on a pick). After copying, your list empties, ready for the next round; the card offers **Copy again** and **Undo** (brings the list back). When it's copied, the button turns green and says **Copied**, the page shows "Prompt copied", and a card at the top of the list says what was copied (parts, characters, pictures) and what to do next: open your AI app, paste (⌘V / Ctrl+V), then add any pictures. Pictures (filmstrips, before → after) are numbered, and the copied message offers **Copy picture 1, 2…** so you can paste them along.

### Colors in motion
Hovers, animations and scroll effects never carry color values. Each color is said by how it relates to the rest, with enough detail to rebuild it from your own colors: for example "my site's accent color, instead of its dark neutral resting text color (on the original: a vivid warm orange, lightness 48%, 3.6:1 against the background behind it)", or "its resting fill, about 19% lighter".

### Colors are never copied exactly
Every color in a prompt is moved a little from the original site: a few degrees of hue and a touch of saturation and lightness, the same way for all of them. The palette keeps its look (which parts are darker, how strong the accent is, how readable the text is), but no value is the original's, and the prompt tells the AI to use them as given. Copying the same list twice gives the same colors.

### What the prompt says
- **One opening that works whether or not you have a site yet**: make only these changes where it says and keep the rest; if there is no site yet, build one from them, top to bottom. Claude Code looks through your project first and reuses your fonts, colors, corners and spacing instead of adding near-duplicates.
- Details are numbered so they can refer to each other ("use the accent from the color scheme in detail 1"). Rules that would repeat are said once at the top.
- Each detail has a **fit to my site** part:
  - **Animations with color**: each color named by its job (accent, text…) → your site's color in that job, unless you ticked Colors. The same movement goes on your other cards or buttons of that kind, never on top of an existing one.
  - **Fonts**: which of your elements get it, how to load it, keeping your other fonts, sizes on phones.
  - **Layouts**: keep its place next to your matching parts; what information goes in each part (from "What should it show?" or your site, with no invented prices, numbers or reviews); the color relationships in your colors; your side padding and content width.
  - **Color schemes**: into your site's color settings by role, readable, blended into the sections around them.
- **Several layouts** share one spacing system (one side padding, content width, section spacing, gaps between text blocks and cards).
- **Keep one look** appears when the parts disagree (see below).
- **When you are done** closes it (see below).

## What it picks up
Fades, slides, pops and other entrances, staggered text and lists, hover and click effects, loops (floating, pulsing, spinning), scroll reveals, things that move as you scroll, lines that draw themselves, growing bars, moving backgrounds and color changes. It also finds animations inside web components and in decorations added with CSS. Canvas drawings, videos, Lottie files and animated icons are listed too. Claude can make something similar, but can't copy them exactly.

## Good to know
- Everything listed under Motion can be used: it has a preview (frames, or for drawings and videos a strip of live frames), most can be played on the page, and each goes into the prompt with its exact values. Press and attention effects get plain names too: Press, Bump, Hop, Dip, Nudge, Wiggle, Flash.
- Values are exact requirements, not inspiration; only what "fit to my site" says (your colors, fonts, content) and what you write under "How should it change?" differ.
- Format, Navigation bar and Color scheme never copy the site's words. Each piece of text says what it is for and how long it is (e.g. "main headline, 5 words", "sign-up call to action, 2 words", "5 page links, 1 word each"), and each section says what kind it is (cards section, pricing, FAQ, call-to-action band…).
- The prompts describe what's on the other site and how it fits yours. They don't tell Claude how to code it; Claude already knows that.
- Sign in once with your Google account. Your name, email and photo stay in this browser; nothing else leaves it, and no API key is needed.
- **Closing the sidebar switches Huescribe off completely**: nothing of it runs on any page until you open it again.
- Because of that, animations that played before you opened it (like a headline animating in on load) weren't seen. When that matters for what you picked, Motion offers **Reload**; **⋯ → Reload the page** works any time. After a reload everything is caught from the start.
- If your computer is set to reduce motion, cards outline things instead of playing them when you point at them.

### Keeping one look
When the parts in your list disagree, the prompt adds **Keep one look**, so parts copied from different sites still look like one site. It picks one choice each for:
- **fonts:** at most two;
- **accent color:** one strong color for buttons and links;
- **corners:** one set of sizes;
- **shadows:** one style;
- **buttons:** one main style and one secondary style;
- **movement:** one feel.

Your site's own fonts, colors and corners come first; otherwise a color or font scheme you picked wins, then what the parts use most. Every prompt also says (once, in the opening) to reuse what your site already has.

### Checking what the AI did
Every prompt ends with **When you are done**. The AI must make each change for real, rebuild a copied layout if yours differs (not just resize things), and finish with a list of what it changed for each detail, as old → new (for example "cards stacked → 3 in a row"). Chat apps like ChatGPT also hand back the complete updated file. If that list shows only tiny changes, or a detail says it "already matched" when it doesn't, tell the AI which one is wrong.


- **Hover and press feel** (9.3.1): pointing at a button, chip or card in the panel lifts it slightly (list rows slide a little toward you), and pressing it squeezes it. With "reduce motion" on in your system, nothing moves.
- **Look** (9.4): the panel matches the Huescribe website: off-white background, the green #B9D96A on the main buttons and active toggles (dark text on it), a serif title, and a green highlight when you select text. The extension icon is green too.

## What's new in 10.3.0
- **Sign in with Google.** The panel now starts with one screen: **Continue with Google**. Chrome's Google window opens, you pick your account, and the panel opens your list. Huescribe gets your name, email and photo from Google and keeps them only in this browser. Until you sign in, nothing on the page is picked. The 1-minute practice works without signing in.
- **Sign out** is in the ⋯ menu ("Sign out (your email)"). It removes your profile from this browser and gives Google's permission back.
- If Google can't be reached, the panel keeps you signed in and checks again later. If the sign-in was revoked, it asks you to sign in again.
- Everyone is on the free plan; paid plans may come later.
- **Languages:** the whole extension (panel, page outlines, prompts, practice) is now in all 15 languages.

## What's new in 10.2.0
- **Welcome practice.** Right after you install Huescribe, a tab opens where you learn by doing, with almost nothing to read. You pick a part of a small made-up site, turn on what you want from it, add it, and press Copy prompt (it really copies). Then you paste it into a practice AI app window and watch it work. The last step shows how to pin Huescribe, with a button that opens the real panel. A pointer shows the next click if you wait. You can choose the language in the corner.
- **In the panel:** the first-time card now shows a small moving example (click → choose → copy) instead of a list of instructions, with a **Practice (1 minute)** button. The ⋯ menu's "How it works" is now **Practice (1 minute)** and opens the same page.

## What's new in 10.1.1
- Selected text in the panel is highlighted in a soft lime green with dark text (brand green in dark mode), instead of dark olive.
- Fewer icons: menus are plain text (the AI-app menu still checks your choice); "Added", the empty list, "Start picking", "Single parts instead", "Slow motion", "Undo changes" and the press/reload rows no longer carry decorative icons. "Adjust" keeps a small arrow that flips when it opens.
- The "Copy prompt" label is dark on the green button again (it was gray, hard to read in dark mode).

## What's new in 10.1.0
- **Smoother on busy pages:** the outline that follows your pointer, the outline around what you chose and the test pointer now glide on the graphics card instead of making the page re-measure itself, and a chosen outline does no work at all while the page sits still.
- **Fast clicks pick the right thing:** a click that lands the instant the pointer moves acts on what's under the pointer.

## What's new in 10.0.0
- **New name and icon:** PromptLift is now **Huescribe**. The icon is a black four-petal flower with a smiling center on a tile in the site's green (#B9D96A), so it reads on light and dark toolbars.
- **Friendlier wording** in the panel:
  - the choice screen asks "What do you want from it?" and the button hint says "Turn on at least one";
  - the empty list says "Nothing here yet. Click something you like on the page and it shows up here.";
  - after copying: "Your list is empty again, ready for the next idea.";
  - a long list notes "AI apps do better with a few parts at a time.";
  - "Nothing moved while we watched.", "Couldn't find anything here. Try a bigger area." and "Write it once and it goes into every prompt." (My instructions).
- Install from `huescribe.zip` (it replaces promptlift.zip).

## What's new in 9.5.0
- The panel now looks like the Huescribe website:
  - Buttons get lighter when you point at them and lighter still when you press them.
  - The main button's label rolls up and an arrow appears while you hover it.
  - Titles use the site's serif, and list numbers read 01, 02…
- An empty list and the "Copied" card show a small flower photo.
