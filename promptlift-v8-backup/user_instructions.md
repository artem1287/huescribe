# PromptLift: user guide

See something you like on a website? PromptLift turns it into a prompt you paste into Claude Code, so your own site gets it too.

## Install (Chrome, Edge, Brave; in Arc it opens as its own window beside the browser; there screen portions aren't available if it falls back to a popup)
1. Unzip `promptlift.zip` into a folder. `manifest.json` must be directly inside it.
2. Go to `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and pick the folder.
3. Pin PromptLift. Click its icon (or press **Alt+Shift+P**) to open it on the side.

## How to use it
Open PromptLift. The first screen asks **What do you want to copy?** and shows two choices. Buttons appear only when they are needed: the rest of this guide says when. The panel keeps text short: the names of things, previews and the main choices are biggest; hints for picking are on the bar at the top of the page (↑ ↓, Esc), not repeated in the panel.

The **⋯** menu at the top right holds what you need now and then: **Open in its own window** (a window you can move anywhere, e.g. to a second screen; it opens beside the browser, which makes room for it and gets its size back when you close the window; whatever you were placing comes along), **Back to the side panel** (from that window), **Reload the page** (catches animations that play as the page opens), **Clear your prompts** (when you have some; tap twice) and **How it works**. Chrome's side panel itself can't be dragged; you can switch it to the left in Chrome's settings (Appearance → Side panel position).

### An element
A button, heading, card, picture, menu… Choose **An element**, then click it on the page. Hovering outlines what will be picked and names it with its size ("Card 360 × 220"); the outline glides from one thing to the next and follows the pointer when you scroll. Not quite the right size? Press **↑** for the bigger thing around it, **↓** for the part inside, **Enter** to pick. Right after a click, the outline pulses and the panel says "Reading Card…" until it's ready. If a part can't be read, the panel says "Couldn't read that part. Try another." On very busy pages the panel shows "Getting the page ready…" for a moment before picking starts.
1. **Tick what you want.** The finds are in sections: **Movement**, **Colors**, **Text**, **Format** (the layout only) and **All of it** (the whole thing in one go, fonts and colors included). Movement opens by itself when there is something in it; the others start closed.
   - When you pick something that moves, its animations keep replaying on the page until you move on, hover and press effects included, so there is no Play button. **Every animation has a preview**: a frame-by-frame strip (for hover and press effects: before → after; for scroll behavior: the element at points along the scroll). **Tap the strip** to play it on the page again; **Slow motion** plays it slowly. Things off screen are filmed by scrolling there for a moment and back.
   - **Hover and press effects** are found from the site's CSS (also when hovering a card changes something inside it, like its arrow or heading) and, for effects made with JavaScript, by briefly simulating the pointer over the element right after you pick it.
   - **Scroll behavior is checked by itself** right after the previews: the page scrolls a little and comes back. If it sticks while scrolling, slides in, moves slower than the page or changes as you scroll, a **When you scroll** card appears under Movement; otherwise it says "No scroll effect".
   - At the end of Movement, only when they apply: **Moves when you press it? → Press it** (buttons and links: press it, then click the thing on the page; it finishes by itself and a link won't leave the page that one time), and **Moves when the page opens? → Reload** (when an opening animation played before PromptLift was open).
   - After a pick, the highlight stays on it. Click your pick again to choose something inside it, or click something else to switch.
   - Text split into letters or words that all look the same is picked as one text. A header gives you the whole **Navigation bar** (logo, every link by its purpose, buttons, sticky or not, dropdowns, small-screen menu).
2. Press **Next (N)** (it says "Tick something first" until you do).

### A screen portion
Whole sections, or your own areas. Choose **A screen portion**, then click each section you want on the page (hovering highlights the whole section and names it; **↑ ↓** make it bigger or smaller before you click; click a chosen one again to take it off).
**Drag over any area** for your own selection. PromptLift works out what you covered:
- **all of one thing** → that thing (a section, a box inside it);
- **across two or more sections** → those sections together, as one row ("Sections together": Navigation bar + Hero), read top to bottom;
- **part of a section** (e.g. two of three cards, or one column) → just those pieces ("Part of a section"), with how they sit next to each other; the rest of the section is left out.
One outline goes around a dragged area; clicking inside it takes it off.
For each one, choose what to copy: **Color scheme**, **Font scheme**, **Format**, and **Scroll behavior**, which is offered only when something in it reacts to scrolling (sticky parts, reveals, parallax).
- **Color scheme**: background (or what shows through), every gradient and decoration, text colors by role, each button style, cards, tags, borders, icon colors and glows.
- **Font scheme**: every kind of text in it by role (main heading, section titles, body text, small text, labels, buttons, menu links, big numbers), each with family, size, weight, line height and letter spacing; the families and where they come from (free Google Font, system font, licensed); and how they relate (sizes against the body text, weight contrast, tight vs relaxed lines). The prompt says to put each role on your matching text, how to load the fonts, to keep those ratios (also on phones), and to warn before a third font family.
- **Format**: the layout only: a one-line gist ("section title → 3 cards in a row"), where it sits on the page (what is directly above and below it, full width or a centered column, any overlap or gap, sticky), then how it is arranged, without pixel-for-pixel widths. It never copies fonts or colors: those come from your site, or from a Color scheme / Font scheme you copy with it. Text sizes stay, so the bigger-to-smaller order is kept.
- **Scroll behavior**: what happens as you scroll through it: parts that stick, move slower or sideways, fade or slide in (and in what order), colors that change. The page scrolls through the section and comes back.
Press **Next (N)**.

### Where should it go?
- **These prompts are for** (asked once): **Building a new site** (and, optionally, what it is: "a landing page for my bakery", so the AI can write the text) or **Changing my site** (no need to say what it is: the AI sees your site). Also **I paste prompts into**: the AI app you use. Each gets the prompt in the form it reads best:
  - **Claude Code** (default): tagged sections; it looks through your project itself.
  - **Claude (chat)**: tagged sections; since it can't see your code, it first asks you to paste the files involved.
  - **ChatGPT or Gemini**: Markdown sections (Detail 1, Exact values, Fit it to my site…). It uses files you already gave it in that chat; otherwise it asks once, only for the files it needs (for a one-page site, just the HTML file), and is told not to round or swap values.
  - **Cursor, Windsurf or Copilot**: Markdown; finds each part in your project and reuses its components and variables.
  - **Lovable, v0 or Bolt**: Markdown with a short opening. When you copy more than two parts, a tip suggests sending them one by one if the builder misses something. Copy prompt waits for this the first time; after that it's one line ("For: Changing my site: …") with **Edit**. Prompts are rewritten for the current choice whenever you copy them.
- Each thing gets a short card: type where it goes on your site, or tap a chip that fits it (a card: **All cards**; a heading: **All h1 headings**; a section: **Top / Middle / Bottom of homepage**; the navigation: **Top of every page**).
- Parts that hold content (a section, a navigation bar, a card…) also ask **What should it show?** (optional): e.g. "my 3 best sellers: sourdough, croissants, rye" or "Home, Menu, About, Contact". Claude fills the part with that, spread over its pieces; left empty, it takes the content from your site (or writes it for what your site is about).
- Changing a site: **Change what is there** or **Add as new**.
- **Adjust** (closed unless you changed something): **How should it change?** in your own words, quick tweaks (Bigger, Softer, Faster…), **Show on page / Play it** to preview, **Copy: Font / Size / Color** for text (untick a part and Claude picks it to suit your site), **Make a new picture from this**, and **More options**: exact numbers, **Keep the original colors** (for animations with color; otherwise your site's colors are used), Undo.
- Changing a site: **Use my site's colors and fonts instead of these**.
Press **Copy prompt**. It is copied, you're back on the first screen, and you can paste it into Claude. If there's a picture, **Copy picture too** is right there.

### Your prompts
Every prompt you copy is kept on the first screen until you close the browser, numbered in the order they go to Claude (new ones at the end). Tap one to change it (it stays in its place). Its **⋯** menu has **Copy again**, **Copy picture**, **Move up / down** and **Remove**. From two prompts, **Copy all N** sends them in one message: the opening is said once, general rules are said once, whole-site details come first, and pictures are numbered (Picture 1, 2…) so you can paste them along. For a new site, put them in page order (top to bottom).

### What the prompt says
Prompts never stand alone: they connect each detail to the rest of your site.
- The opening says whether you're building a new site or changing yours, and (for changes) tells Claude to look through your site first for its colors, fonts, pages and real content.
- Details are numbered so they can refer to each other ("use the accent from the color scheme in detail 1").
- Each detail has a **fit to my site** part:
  - **Animations with color**: each color is named by its job (accent, text…), and Claude uses your site's color in that job (or the color scheme you copied). The same movement goes on your other cards or buttons of that kind, and never on top of an existing one.
  - **Fonts**: which of your elements get it, how to load it (free Google Font, system font, or the closest free one if it's licensed), keeping or pairing your other fonts, and sizes on phones.
  - **Formats**: what information goes in each part (headline: what you offer; three cards: three of your real services…), taken from what you wrote under "What should it show?", from your site, or from what it's about, with no invented prices, numbers or reviews. Each format also lists its **color relationships** (a dark part on a light page, cards a bit lighter than their section, one accent only…) and Claude keeps them even in your colors. It also measures the **spacing**: side padding, content width, space above and below, and the gaps between text blocks (title → text, text → buttons) and between cards.
  - **Several formats in one message** share one spacing system: one side padding, one content width, one space around sections, the same gaps between text blocks everywhere (the values the parts have most in common), so the page reads as one. When changing a site, the new parts line up with your existing spacing if it is consistent.
  - **Color schemes**: put into your site's color settings by role, your text stays readable, and sections blend into their neighbors.
- Rules that would repeat across several details are said once at the top.

## What it picks up
Fades, slides, pops and other entrances, staggered text and lists, hover and click effects, loops (floating, pulsing, spinning), scroll reveals, things that move as you scroll, lines that draw themselves, growing bars, moving backgrounds and color changes. It also finds animations inside web components and in decorations added with CSS. Canvas drawings, videos, Lottie files and animated icons are listed too. Claude can make something similar, but can't copy them exactly.

## Good to know
- Everything listed under Movement can be used: it has a preview (frames, or for drawings and videos a strip of live frames), most can be played on the page, and each goes into the prompt with its exact values. Press and attention effects get plain names too: Press, Bump, Hop, Dip, Nudge, Wiggle, Flash.
- Values are exact requirements, not inspiration; only what "fit to my site" says (your colors, fonts, content) and what you write under "How should it change?" differ.
- Format, Navigation bar and Color scheme never copy the site's words. Each piece of text says what it is for and how long it is (e.g. "main headline, 5 words", "sign-up call to action, 2 words", "5 page links, 1 word each"), and each section says what kind it is (cards section, pricing, FAQ, call-to-action band…).
- The prompts describe what's on the other site and how it fits yours. They don't tell Claude how to code it; Claude already knows that.
- Nothing leaves your browser. No account or API key is needed.
- **Closing the sidebar switches PromptLift off completely**: nothing of it runs on any page until you open it again.
- Because of that, animations that played before you opened it (like a headline animating in on load) weren't seen. When that matters for what you picked, Movement offers **Reload**; **⋯ → Reload the page** works any time. After a reload everything is caught from the start.
- If your computer is set to reduce motion, cards outline things instead of playing them when you point at them.

### Keeping one look
Every prompt ends its opening with **Keep one look**, so parts copied from different sites still look like one site:
- When the copied parts disagree, it picks one choice each for:
  - **fonts:** at most two;
  - **accent color:** one strong color for buttons and links;
  - **corners:** one set of sizes;
  - **shadows:** one style;
  - **buttons:** one main style and one secondary style;
  - **movement:** one feel.
- A color or font scheme you picked on purpose wins over the rest. When you're changing your site, your site's own fonts, colors and corners come first.
- Even a single prompt tells the AI to reuse the fonts, colors, corners and spacing your site (or your earlier prompts) already set up, instead of adding new ones.

### Checking what the AI did
Every prompt ends with **When you are done**. The AI must make each change for real, rebuild a copied layout if yours differs (not just resize things), and finish with a list of what it changed for each detail, as old → new (for example "cards stacked → 3 in a row"). Chat apps like ChatGPT also hand back the complete updated file. If that list shows only tiny changes, or a detail says it "already matched" when it doesn't, tell the AI which one is wrong.

