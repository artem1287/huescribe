"""End-to-end tests for PromptLift (side panel), run in Chrome for Testing via Playwright.

Start the fixture servers first:  tests/serve.sh
Then:                              python3 tests/e2e.py
"""
import asyncio, os, sys, tempfile
from playwright.async_api import async_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
EXT = os.path.dirname(HERE)
OUT = os.environ.get("PL_OUT", "/tmp/promptlift-out")
SITE = "http://127.0.0.1:8001/"
os.makedirs(OUT, exist_ok=True)
fails = []
SITE_TEXT = ["Ship faster", "Acme", "Features", "Deploys in seconds"]
JARGON = ["cubic-bezier", "keyframe", "px", "ms ", "easing", "opacity", "transform", "rgba(", "#"]
HOME = "What do you want to copy?"


def check(cond, msg):
    print(("PASS " if cond else "FAIL ") + msg)
    if not cond:
        fails.append(msg)


async def main():
    async with async_playwright() as p:
        ctx = await p.chromium.launch_persistent_context(
            tempfile.mkdtemp(), executable_path="/usr/bin/google-chrome", headless=True,
            args=["--headless=new", f"--disable-extensions-except={EXT}", f"--load-extension={EXT}", "--no-sandbox"],
            viewport={"width": 1280, "height": 900})
        sw = ctx.service_workers[0] if ctx.service_workers else await ctx.wait_for_event("serviceworker")
        logs = []
        site = ctx.pages[0] if ctx.pages else await ctx.new_page()
        site.on("console", lambda m: logs.append(f"[site] {m.type}: {m.text}"))
        await site.goto(SITE)
        await site.wait_for_load_state("networkidle")
        await site.wait_for_timeout(800)
        tab_id = await sw.evaluate(f"(async()=> (await chrome.tabs.query({{url:'{SITE}*'}}))[0].id)()")
        panel = None
        ROOT = "document.getElementById('__promptlift-root')"

        nonlocal_reading = []
        # ---------- helpers ----------
        async def open_panel(scheme="light", width=400, mode=""):
            nonlocal panel
            if panel and not panel.is_closed():
                await panel.close()
            waiter = asyncio.ensure_future(ctx.wait_for_event("page"))
            extra = f"&mode={mode}" if mode else ""
            await sw.evaluate(f"chrome.windows.create({{url: 'panel.html?tabId={tab_id}{extra}', type: 'popup', width: {width}, height: 900}})")
            panel = await waiter
            panel.on("console", lambda m: logs.append(f"[panel] {m.type}: {m.text}"))
            panel.on("pageerror", lambda e: logs.append(f"[panel] pageerror {e}"))
            await panel.emulate_media(color_scheme=scheme)
            await panel.set_viewport_size({"width": width, "height": 860})
            await panel.wait_for_selector(f"#title:has-text('{HOME}'), #title:has-text('Pick what to copy')")
            # Remember what gets copied (the clipboard itself needs focus in headless Chrome).
            await panel.evaluate("(() => { const w = navigator.clipboard.writeText.bind(navigator.clipboard); navigator.clipboard.writeText = (t) => { window.__copied = t; return w(t).catch(() => {}); }; })()")
            await site.bring_to_front()

        async def hl_visible():
            return await site.evaluate(f"{ROOT}.shadowRoot.querySelector('.hl').style.display === 'block'")

        async def bar_text():
            return await site.evaluate(f"{ROOT}.shadowRoot.querySelector('.bar').textContent")

        async def picking_on():
            return await site.evaluate(f"!!{ROOT}?.shadowRoot.querySelector('.t.picking')")

        async def go_home():
            await panel.evaluate("state.history = []; go('home', false)")
            await panel.wait_for_selector(f"#title:has-text('{HOME}')")

        async def element_mode():
            if await panel.evaluate("state.screen") not in ("element", "pick"):
                await go_home()
                await panel.click("#choose-element")
                await panel.wait_for_selector("#title:has-text('Pick an element')")
            for _ in range(30):
                if await picking_on(): break
                await asyncio.sleep(0.1)

        async def tick(text):
            exact = panel.locator(".item").filter(has=panel.locator(".txt b", has_text=text))
            item = exact.first if await exact.count() else panel.locator(".item", has_text=text).first
            await item.evaluate("el => { const d = el.closest('details'); if (d && !d.open) { d.open = true; d.dispatchEvent(new Event('toggle')); } }")
            await item.locator("input[type=checkbox]").check()

        async def to_apply():
            await panel.click("#tray-btn")
            await panel.wait_for_selector("#title:has-text('Where should it go?')", timeout=30000)

        async def copy_prompt():
            """Press ‘Copy prompt’: it copies and goes straight back to the first screen."""
            await panel.evaluate("window.__copied = ''")
            await panel.click("#tray-btn")
            await panel.wait_for_selector(f"#title:has-text('{HOME}')")
            return await panel.evaluate("window.__copied || ''")

        async def open_adjust(card):
            await card.locator("details.adjust-box").evaluate("d => { if (!d.open) { d.open = true; d.dispatchEvent(new Event('toggle')); } }")

        async def menu(anchor, label):
            await panel.click(anchor) if isinstance(anchor, str) else await anchor.click()
            await panel.locator(".menu .menu-item", has_text=label).first.click()

        async def cards():
            return await panel.locator(".item").evaluate_all("els => els.map(e => ({ when: (e.querySelector('.when') || {}).textContent || '', title: e.querySelector('.txt b').textContent, desc: e.querySelector('.desc').textContent, ctx: (e.querySelector('.txt small') || {}).textContent || '' }))")

        async def movement():
            return await panel.locator("details.section:has(summary span:text-is('Movement')) .item").evaluate_all("els => els.map(e => ({ when: (e.querySelector('.when') || {}).textContent || '', title: e.querySelector('.txt b').textContent, desc: e.querySelector('.desc').textContent, ctx: (e.querySelector('.txt small') || {}).textContent || '' }))")

        async def pick_at(x, y):
            """Element mode is on: click on the page, then wait for the NEW pick."""
            await element_mode()
            before = await panel.evaluate("state.view?.pickId || ''")
            await site.mouse.move(x, y)
            await site.wait_for_timeout(150)
            await site.mouse.down(); await site.mouse.up()
            nonlocal_reading.append(await panel.locator("#reading-status").count() > 0 or await panel.evaluate(f"!!state.view && state.view.pickId !== '{before}'"))
            for _ in range(200):
                if await panel.evaluate(f"state.screen === 'pick' && !!state.view?.pickId && state.view.pickId !== '{before}' && state.view.movement !== 'loading'"):
                    break
                await asyncio.sleep(0.1)
            else:
                print("   LOGS", logs[-4:])
                await site.screenshot(path=f"{OUT}/debug-fail.png")
                raise TimeoutError("pick did not arrive")
            await panel.wait_for_timeout(300)

        async def pick_el(selector):
            await element_mode()
            await site.evaluate(f"document.querySelector('{selector}').scrollIntoView({{block:'center', behavior:'instant'}})")
            await site.wait_for_timeout(400)
            b = await site.locator(selector).first.bounding_box()
            await pick_at(b["x"] + min(6, b["width"] / 2), b["y"] + b["height"] / 2)

        async def portion_mode():
            await go_home()
            await panel.click("#choose-portion")
            await panel.wait_for_selector("#title:has-text('Pick screen portions')")
            for _ in range(30):
                if await picking_on(): break
                await asyncio.sleep(0.1)

        async def section_click(selector, expect, scroll=True):
            if scroll:
                await site.evaluate(f"document.querySelector('{selector}').scrollIntoView({{block:'center', behavior:'instant'}})")
                await site.wait_for_timeout(300)
            b = await site.locator(selector).first.bounding_box()
            await site.mouse.move(b["x"] + b["width"] / 2, b["y"] + min(b["height"] / 2, 40))
            await site.wait_for_timeout(150)
            await site.mouse.down(); await site.mouse.up()
            for _ in range(60):
                if await panel.locator(".sec-row").count() == expect: break
                await asyncio.sleep(0.1)
            await site.wait_for_timeout(300)

        async def all_previews(label):
            """Every animation listed under Movement must end up with a real preview (a picture strip)."""
            await panel.locator("details.section summary", has_text="Movement").evaluate("el => { const d = el.parentElement; if (!d.open) { d.open = true; d.dispatchEvent(new Event('toggle')); } }")
            items = panel.locator("details.section:has(summary span:text-is('Movement')) .item")
            n = await items.count()
            got = 0
            for _ in range(160):
                got = await items.evaluate_all("els => els.filter(e => e.querySelector('.film img')).length")
                if got == n: break
                await asyncio.sleep(0.25)
            missing = await items.evaluate_all("els => els.filter(e => !e.querySelector('.film img')).map(e => e.querySelector('.txt b').textContent + ': ' + ((e.querySelector('.film') || {}).textContent || 'no preview slot'))")
            check(got == n, f"{label}: every animation has a preview ({got}/{n}{'; missing ' + str(missing) if missing else ''})")

        async def use_motion(title, label):
            """Every listed animation must be usable end to end: preview, play, place, prompt."""
            await panel.locator("details.section summary", has_text="Movement").evaluate("el => { const d = el.parentElement; if (!d.open) { d.open = true; d.dispatchEvent(new Event('toggle')); } }")
            card = panel.locator(".item").filter(has=panel.locator(".txt b", has_text=title)).first
            st = "none"
            for _ in range(80):
                st = await card.evaluate("el => el.querySelector('.film img') ? 'film' : (el.querySelector('.film')?.textContent || 'no film slot')")
                if st in ("film", "no film slot") or 'Press Play' in st: break
                await asyncio.sleep(0.25)
            playable = await card.locator(".film.playable").count()
            await tick(title)
            await to_apply()
            prev = await panel.locator(".change").first.locator(".change-head img, .change-head .swatch, .change-head .thumb, .change-head .visual").count()
            prompt = await copy_prompt()
            vals = prompt.split("<values>")[1].split("</values>")[0] if "<values>" in prompt else ""
            bad = [w for w in ["undefined", "NaN", "null", "[object"] if w in prompt]
            check(st == "film" and bool(vals.strip()) and not bad and prev > 0, f"{label}: usable with a preview (film: {st}, play: {playable}, preview: {prev}, values: {len(vals.strip())} chars, bad: {bad})")
            return prompt

        # ---------- 0. opening: two choices; switched-off until opened; late page → reload ----------
        check(await site.evaluate("typeof window.__plRec") == "undefined", "before PromptLift is opened, nothing of it runs on the page")
        await open_panel()
        await panel.screenshot(path=f"{OUT}/panel-home.png", full_page=True)
        check(await panel.locator("#choose-element").count() == 1 and await panel.locator("#choose-portion").count() == 1, "first screen: two choices (an element, a screen portion)")
        check(not await picking_on(), "nothing is picked until you choose")
        check(await panel.locator(".tip").count() == 1, "first time: a short how-it-works tip")
        await panel.click("#tip-ok")
        check(await panel.locator(".tip").count() == 0 and await panel.evaluate("(async () => (await chrome.storage.local.get('tipSeen')).tipSeen)()"), "the tip goes away for good")
        check(await panel.locator(".site-card, #reload-late, #reload").count() == 0, "first screen: no settings, no reload button; just the choices")
        check(await panel.locator("#more").count() == 1, "the header has one ‘More’ menu")
        await panel.click("#more")
        items = await panel.locator(".menu .menu-item").all_text_contents()
        check("Reload the page" in items and not any("Clear" in i for i in items), f"More: Reload the page; nothing to clear yet ({items})")
        await panel.keyboard.press("Escape")
        check(await panel.locator(".menu").count() == 0, "Esc closes the menu")
        await site.evaluate("window.__marker = 1")
        await menu("#more", "Reload the page")
        await site.wait_for_load_state("load")
        await site.wait_for_timeout(1500)
        check(await site.evaluate("typeof window.__marker") == "undefined" and await site.evaluate("!!window.__plRec && window.__plRec.active && !window.__plRec.lateStart"), "More → Reload the page: reloaded, the recorder was there from the start")
        await go_home()

        # ---------- 1. gradient (element) ----------
        await element_mode()
        check(await picking_on() and "Click" in await bar_text() and "drag" not in await bar_text(), "‘An element’: click to pick (no dragging)")
        # hovering names what would be picked, with its size; arrow keys make it bigger or smaller
        tb = await site.locator("#hero-title").bounding_box()
        await site.mouse.move(tb["x"] + 40, tb["y"] + tb["height"] / 2)
        await site.wait_for_timeout(200)
        label = await site.evaluate(f"{ROOT}.shadowRoot.querySelector('.hl em').textContent")
        check(label.startswith("Heading (h1)") and "×" in label, f"the highlight says what it is and its size ({label})")
        w0 = await site.evaluate(f"{ROOT}.shadowRoot.querySelector('.hl').getBoundingClientRect().width")
        await site.keyboard.press("ArrowUp")
        await site.wait_for_timeout(250)
        w1 = await site.evaluate(f"{ROOT}.shadowRoot.querySelector('.hl').getBoundingClientRect().width")
        label2 = await site.evaluate(f"{ROOT}.shadowRoot.querySelector('.hl em').textContent")
        check(w1 > w0 + 20 and label2 != label, f"↑ picks the bigger thing around it ({round(w0)} → {round(w1)}, {label2})")
        await site.keyboard.press("ArrowDown")
        await site.wait_for_timeout(250)
        check(await site.evaluate(f"{ROOT}.shadowRoot.querySelector('.hl').classList.contains('glide')"), "the highlight glides between things instead of jumping")
        await site.mouse.move(tb["x"] + 40, tb["y"] + tb["height"] / 2 + 1)
        await site.evaluate("window.scrollBy(0, 300)")
        await site.wait_for_timeout(250)
        moved = await site.evaluate(f"{ROOT}.shadowRoot.querySelector('.hl').style.display")
        check(moved == "block", "after scrolling, the highlight follows what is now under the pointer")
        await site.evaluate("window.scrollTo(0, 0)")
        await site.wait_for_timeout(200)
        hero = await site.locator("section.grad").bounding_box()
        await pick_at(hero["x"] + hero["width"] - 20, hero["y"] + hero["height"] - 20)
        cs = await cards()
        print("   hero cards:", [(c["when"], c["title"], c["desc"]) for c in cs])
        grad = [c for c in cs if c["title"] == "Gradient"]
        check(bool(grad) and grad[0]["desc"] == "Light orange to pale pink, diagonal.", f"gradient in simple words ({grad[:1]})")
        font = [c for c in cs if c["title"] == "Heading font"]
        check(bool(font) and font[0]["desc"] == "Fraunces, very big, bold, tight.", f"font in simple words ({font[:1]})")
        hov = [c for c in cs if c["title"] == "Button hover"]
        check(bool(hov) and hov[0]["when"] == "On hover", f"hover in simple words ({hov[:1]})")
        check(not any(j in c["title"] + " " + c["desc"] for c in cs for j in JARGON), "no code words on cards")
        groups = await panel.locator("details.section summary > span:first-child").all_text_contents()
        check(set(groups) <= {"Movement", "Colors", "Text", "Format", "All of it"}, f"only these kinds of things to copy: Movement, Colors, Text, Format, All of it ({groups})")
        check(await panel.locator("details.section[open]").count() == 1 and await panel.locator("details.section[open] summary", has_text="Movement").count() == 1, "only Movement starts open; the other groups start closed")
        pid = await panel.evaluate("state.view.pickId")
        await site.mouse.move(hero["x"] + 60, hero["y"] + 60)
        await site.wait_for_timeout(150)
        check(not await hl_visible() and "your pick" in await bar_text(), "after a pick, hovering doesn't highlight anything new")
        await site.mouse.down(); await site.mouse.up()
        await site.wait_for_timeout(200)
        check(await hl_visible() and await panel.evaluate("state.view.pickId") == pid, "clicking the pick again unlocks the highlight (no new pick)")
        await tick("Gradient")
        await to_apply()
        await site.wait_for_timeout(1200)
        check(not await picking_on(), "picking pauses while placing it")
        sel = await site.evaluate(f"(() => {{ const b = {ROOT}.shadowRoot.querySelector('.sel'); return b && b.style.display !== 'none' ? b.getBoundingClientRect().toJSON() : null; }})()")
        check(sel is not None and abs(sel["width"] - hero["width"] - 6) < 3, "the picked rectangle stays outlined while placing it")
        check(await panel.locator(".site-card #mode-new").count() == 1 and await panel.locator(".site-card #mode-change").count() == 1, "first time placing: asks building a new site or changing my site")
        check(await panel.locator("#tray-btn").is_disabled(), "Copy prompt waits for that answer")
        await panel.click("#mode-new")
        check(await panel.locator("#site-about").count() == 1, "building a new site: asks what it is")
        await panel.fill("#site-about", "a landing page for my bakery")
        await panel.click("#mode-change")
        check(await panel.locator("#site-about").count() == 0, "changing my site: doesn't ask what it is (the AI sees the site)")
        await panel.wait_for_timeout(200)
        check(await panel.evaluate("(async () => (await chrome.storage.local.get('site')).site.mode)()") == "change", "the choice is remembered")
        await panel.click("#site-done")
        check(await panel.locator("#site-summary").inner_text() == "Changing my site · Claude Code" and await panel.locator("#site-edit").count() == 1, "then it is one line with Edit")
        card = panel.locator(".change").first
        check(await card.locator("details.adjust-box:not([open])").count() == 1 and not await card.locator("textarea[id^=req-]").is_visible(), "each part is short: changing it is under Adjust, closed")
        await card.locator("input[id^=where-]").fill("top of my homepage")
        await open_adjust(card)
        await card.locator(".chip", has_text="Show on page").click()
        await card.locator(".chip", has_text="Flip direction").click()
        await site.wait_for_timeout(200)
        check("315deg" in (await site.evaluate("document.querySelector('section.grad').getAttribute('style') || ''")), "quick tweak shows live on the page")
        await card.locator(".chip", has_text="Stop showing").click()
        await card.locator("textarea[id^=req-]").fill("fade to white at the bottom")
        check(await panel.locator("#fit").count() == 1, "changing a site: ‘Use my site's colors and fonts’ is offered")
        check(await card.locator("label", has_text="Make a new picture from this").count() == 1, "making a picture is a checkbox, not a separate thing")
        check(await card.locator("textarea[id^=content-]").count() == 0, "a gradient doesn't ask what it should show (only parts that hold content do)")
        check(await panel.locator(".site-card").count() == 0 and await panel.locator(".site-line").count() == 1, "placing screen shows who the prompt is for, in one line")
        check(await card.locator(".seg-btn[data-task=replace][aria-pressed=true]").count() == 1 and await card.locator(".seg-btn[data-task=add]").count() == 1, "changing a site: each part says change what is there, or add as new")
        check(await panel.locator("#tray-btn").text_content() == "Copy prompt", "the last button just says Copy prompt")
        await panel.screenshot(path=f"{OUT}/panel-apply.png", full_page=True)
        prompt = await copy_prompt()
        open(f"{OUT}/prompt-gradient.md", "w").write(prompt)
        check("<what>Gradient: Light orange to pale pink, diagonal (linear, 135°)</what>" in prompt and "linear-gradient(315deg, #fed7aa, #fbcfe8)" in prompt, "prompt: simple words + exact values")
        check(prompt.startswith("I want to change my existing website.") and "bakery" not in prompt and "Keep everything else on my site as it is." in prompt and "not inspiration" in prompt, "the prompt opens with the situation: changing my bakery site, exact, keep the rest")
        check("look through my site for its colors, fonts, pages and real content" in prompt and '<design_detail id="1"' in prompt, "it tells Claude to look at my site first; details are numbered")
        check("<fit_to_my_site>" in prompt and "existing color settings" in prompt and "avoid hard seams" in prompt, "a gradient fits into my site: my color settings, readable, blending edges")
        check("<where_on_my_site>top of my homepage</where_on_my_site>" in prompt and "<task>Change what is there now to match this.</task>" in prompt and "<change_i_want>fade to white at the bottom</change_i_want>" in prompt, "where it goes, what to do there, the change")
        check(not any(t in prompt for t in SITE_TEXT), "no page text in the prompt")
        check(await panel.locator(".notice").count() == 1 and "Copied" in await panel.locator(".notice").inner_text(), "after copying: back on the first screen with ‘Copied’")
        check(not await picking_on(), "back on the first screen, picking is off")
        await panel.screenshot(path=f"{OUT}/panel-copied.png", full_page=True)

        # ---------- 2. heading: only its animation, replaying ----------
        await pick_el("#hero-title")
        check(await panel.evaluate("state.view.title") == "Main heading", "clicking one letter of a split heading picks the whole heading")
        for _ in range(80):
            if await panel.evaluate("['found','none'].includes(state.view.scrollState)"): break
            await asyncio.sleep(0.1)
        check(await panel.evaluate("state.view.scrollState") in ("found", "none"), "scrolling is checked by itself right after picking (no button)")
        restarts, was_done = 0, False
        for _ in range(55):
            o = float(await site.evaluate("getComputedStyle(document.querySelector('#hero-title span:last-child')).opacity"))
            if o >= 0.99: was_done = True
            elif was_done and o < 0.5: restarts += 1; was_done = False
            await asyncio.sleep(0.1)
        check(restarts >= 2, f"the picked animation plays over and over on the page ({restarts} replays in ~5s)")
        mv = await movement()
        print("   heading movement:", mv)
        check(any(m["title"] == "Letters rise in one by one" and m["when"] == "On load" for m in mv), "its load animation was caught (recorder ran from the start after the reload)")
        lcard = panel.locator(".item", has_text="Letters rise in one by one").first
        await panel.locator("details.section summary", has_text="Movement").evaluate("el => { const d = el.parentElement; if (!d.open) { d.open = true; d.dispatchEvent(new Event('toggle')); } }")
        await lcard.locator(".film img").wait_for(timeout=20000)
        await site.wait_for_timeout(1600)
        await tick("Letters rise in one by one")
        await to_apply()
        mov = panel.locator(".change-head img.moving")
        srcs = set()
        for _ in range(6):
            if await mov.count():
                srcs.add((await mov.first.get_attribute("src"))[-40:])
            await panel.wait_for_timeout(150)
        check(len(srcs) >= 2, f"moving preview while placing it ({len(srcs)} frames)")
        chips = await panel.locator(".change").first.locator(".chips[aria-label='Common places'] .chip").all_text_contents()
        check("All h1 headings" in chips and "All buttons" not in chips, f"where chips fit the thing (a heading: headings, not buttons) ({chips})")
        await panel.locator(".change").first.locator(".chip", has_text="All headings").last.click()
        prompt = await copy_prompt()
        open(f"{OUT}/prompt-animation.md", "w").write(prompt)
        check("Keyframes: 0%" in prompt and "starts 40ms after the previous one" in prompt and "Plays once, when the page loads" in prompt, "animation values are measured facts")
        check("Give my other" not in prompt and "replace that movement instead of adding a second one" in prompt, "the animation fits my site: no double animations (and ‘All headings’ already covers the others)")
        check(await panel.locator(".notice button", has_text="Copy picture too").count() == 1, "after copying, the filmstrip picture can be copied too")

        # ---------- 2b. Your prompts: a basket ----------
        rows = await panel.locator(".saved-row").count()
        check(rows == 2, f"every copied prompt is kept in Your prompts ({rows})")
        check(await panel.locator(".saved-row button").count() == 4 and await panel.locator(".row-more").count() == 2, "each row: the prompt (tap to change) and one ‘…’ menu")
        await panel.locator(".row-more").first.click()
        items = await panel.locator(".menu .menu-item").all_text_contents()
        check(items[:2] == ["Copy again", "Copy picture"] or items[0] == "Copy again", f"the row menu holds the rarer actions ({items})")
        check("Move down" in items and "Move up" not in items and "Remove" in items, "first row: move down, not up; remove")
        await panel.keyboard.press("Escape")
        titles = await panel.locator(".saved-text b").all_text_contents()
        check(titles[0].startswith("Gradient") and titles[1].startswith("Letters rise in one by one"), f"in the order they go to Claude, named by what they are ({titles})")
        check(await panel.locator("#copy-all").inner_text() == "Copy all 2", "Copy all appears from two prompts, with the count")
        await panel.evaluate("state.site.mode = 'new'")
        await panel.click("#copy-all")
        await panel.wait_for_timeout(150)
        combined = await panel.evaluate("window.__copied || ''")
        open(f"{OUT}/prompt-combined.md", "w").write(combined)
        check(combined.startswith("I'm building a new website: a landing page for my bakery.") and combined.count("<design_detail") == 2 and combined.count("I'm building") == 1, "Copy all: one message, said once, for building a new site")
        check(combined.index("Gradient") < combined.index("Letters rise") and "Picture 1 (pasted with this message)" in combined and "Picture 2 (pasted with this message) is a filmstrip" in combined, "in list order, with numbered pictures")
        check("<task>" not in combined.split("Letters rise")[0].split("</design_detail>")[0] or "whole site" in combined.lower(), "new site: no change/add wording")
        await menu(panel.locator(".row-more").nth(1), "Move up")
        await panel.wait_for_timeout(300)
        titles = await panel.locator(".saved-text b").all_text_contents()
        check(titles[0].startswith("Letters rise"), f"a prompt can be moved up the list ({titles})")
        await panel.click("#copy-all")
        await panel.wait_for_timeout(150)
        combined = await panel.evaluate("window.__copied || ''")
        check(combined.index("Letters rise") < combined.index("Gradient"), "the message follows the new order")
        await panel.evaluate("state.site.mode = 'change'")
        await panel.locator(".saved-main").nth(1).click()
        await panel.wait_for_selector("#title:has-text('Where should it go?')")
        check(await panel.locator("details.adjust-box[open] textarea[id^=req-]").first.input_value() == "fade to white at the bottom", "reopening a prompt brings back its settings (Adjust open, since it was changed)")
        await panel.click("#back")
        await panel.wait_for_selector(f"#title:has-text('{HOME}')")
        await panel.wait_for_timeout(600)
        n_rows = await panel.locator(".saved-row").count()
        check(n_rows == 2, f"leaving again keeps it once (no duplicates: {n_rows} rows)")

        # ---------- 3. card: group movement, hover, text parts ----------
        await site.evaluate("document.getElementById('f').scrollIntoView({block:'center', behavior:'instant'})")
        await site.wait_for_timeout(1500)
        c2 = await site.locator(".card").nth(1).bounding_box()
        await pick_at(c2["x"] + 6, c2["y"] + 6)
        mv = await movement()
        st = [m for m in mv if m["title"] == "Items rise in one by one"]
        check(bool(st) and st[0]["when"] == "On scroll" and st[0]["ctx"] == "Your pick is one of 3", "card shows the group it belongs to")
        check(any(m["title"] == "Card hover" and m["when"] == "On hover" for m in mv), "and its hover")
        fonts = [c["title"] for c in await cards() if "font" in c["title"].lower()]
        await tick(fonts[0])
        await to_apply()
        fcard = panel.locator(".change").first
        await open_adjust(fcard)
        check(await fcard.locator(".parts label").count() >= 2, f"text ({fonts[0]}) gets Font / Size / Color checkboxes")
        await fcard.locator(".parts label", has_text="Size").click()
        prompt = await copy_prompt()
        check("font-family" in prompt and "font-size" not in prompt and "choose the size" in prompt, "unticked size is left out, Claude chooses it")
        check("Keep the rest of my text in my site's current fonts" in prompt and ("free Google Font" in prompt or "closest free font" in prompt or "system font" in prompt), "a font fits my site: how to load it, keep my other fonts")

        # ---------- 3b. hover and press effects: listed, played on the page, previewed, usable ----------
        await site.evaluate("document.getElementById('f').scrollIntoView({block:'center', behavior:'instant'})")
        await site.wait_for_timeout(600)
        c1 = await site.locator(".card").nth(0).bounding_box()
        await pick_at(c1["x"] + 6, c1["y"] + 6)
        mv = await movement()
        await all_previews("card (reveal group, hovers)")
        inner = [m for m in mv if m["title"] == "Card hover: the heading inside"]
        check(bool(inner) and "heading inside it" in inner[0]["desc"] and not any(m["title"] == "Heading on card hover" for m in mv), f"hovering a card that changes its heading is found ({[m['title'] for m in mv]})")
        hcard = panel.locator(".item").filter(has=panel.locator(".txt b", has_text="Card hover: the heading inside")).first
        check(await hcard.locator("button", has_text="Play").count() == 0, "no Play buttons: it already plays by itself")
        await hcard.locator(".film.playable").click()
        await site.wait_for_timeout(450)
        col = await site.evaluate("getComputedStyle(document.querySelector('.card h3')).color")
        check(col == "rgb(234, 88, 12)", f"Play shows the hover effect on the real page ({col})")
        for _ in range(60):
            if await hcard.locator(".film img").count(): break
            await asyncio.sleep(0.25)
        check(await hcard.locator(".film img").count() == 1, "hover effects get a before → after picture")
        prompt = await use_motion("Card hover: the heading inside", "hover effect on a part inside")
        open(f"{OUT}/prompt-hover.md", "w").write(prompt)
        await site.mouse.move(5, 5)  # the test's pointer rested on the card (real :hover)
        await site.wait_for_timeout(1500)
        col = await site.evaluate("getComputedStyle(document.querySelector('.card h3')).color")
        check(col != "rgb(234, 88, 12)", f"once you move on, the page is back to normal ({col})")
        check("when the card is :hover, the heading inside it gets" in prompt and "color:#ea580c" in prompt.replace(" ", "") and "before → after" in prompt, "the prompt says what changes, where, and what the picture shows")
        check("#ea580c (accent color, used for text here)" in prompt and "my site's own colors in the same roles" in prompt and "Give my other cards" in prompt, "an animation with color: use my site's colors in the same role; same hover on my other cards")

        # a hover effect driven by JavaScript (no CSS :hover) is caught by simulating the pointer
        await pick_el("#jsh")
        for _ in range(80):
            mv = await movement()
            if any(m["when"] == "On hover" for m in mv): break
            await asyncio.sleep(0.2)
        js = [m for m in mv if m["when"] == "On hover"]
        check(bool(js) and js[0]["title"] == "Grow" and "grows a little" in js[0]["desc"].lower(), f"a JavaScript hover effect shows up as ‘On hover’, named for what it does ({mv})")
        if js:
            prompt = await use_motion(js[0]["title"], "JavaScript hover effect")
            check("when the pointer moves onto it" in prompt and "scale(1.12)" in prompt, "its prompt: what it does and that it plays on hover")

        # a button's own hover (CSS) plays when its card is pointed at
        await pick_el("section.grad .btn")
        bh = [c for c in await cards() if c["title"] == "Button hover"]
        check(bool(bh), f"a picked button lists its hover ({[c['title'] for c in await cards()]})")

        # ---------- 3c. "Make a new picture from this" ----------
        await pick_el("#hero-title")
        await tick("Heading font")
        await to_apply()
        pc = panel.locator(".change").first
        await open_adjust(pc)
        await pc.locator("label", has_text="Make a new picture from this").click()
        await pc.locator("textarea[id^=req-]").fill("just the soft orange glow, on a dark background")
        prompt = await copy_prompt()
        open(f"{OUT}/prompt-picture.md", "w").write(prompt)
        check("<picture_i_want>just the soft orange glow, on a dark background</picture_i_want>" in prompt and "The pasted picture is the original I picked" in prompt, "picture: the person's own words + the reference picture")
        check(await panel.locator(".notice button", has_text="Copy picture too").count() == 1, "the picture is one tap away after copying")

        # ---------- 4. every kind of motion is usable ----------
        expect = {
            "#x h2": "Slide in", "#draw": "Draw in", "#track": "Grow", "#fancy": "Pop in",
            "#slider": "Slide in", "#drift": "Rise as you scroll", "#cv": "Moving drawing", ".hero-badge": "Float",
        }
        for selector, title in expect.items():
            await pick_el(selector)
            mv = await movement()
            hit = [m for m in mv if m["title"] == title]
            check(bool(hit), f"{selector}: found ‘{title}’ ({[(m['when'], m['title']) for m in mv]})")
            await all_previews(selector)
            if hit:
                await use_motion(title, f"{selector} ‘{title}’")
        await site.evaluate("window.scrollTo({top: 0, behavior: 'instant'})")

        # ---------- 4b. an element's scroll behavior ----------
        await pick_el("#drift")
        if await panel.locator("#scroll-check").count():
            await panel.click("#scroll-check")
        for _ in range(60):
            if await panel.evaluate("['found','none'].includes(state.view.scrollState)"): break
            await asyncio.sleep(0.2)
        mv = await movement()
        sb = [m for m in mv if m["title"] == "When you scroll"]
        check(bool(sb) and "into place" in sb[0]["desc"], f"checking scrolling adds how it behaves as you scroll ({sb[:1]})")
        check(await site.evaluate("scrollY") > 0 and abs(await site.evaluate("document.querySelector('#drift').getBoundingClientRect().top + scrollY") - await site.evaluate("document.querySelector('#drift').offsetTop + document.querySelector('#drift').offsetParent?.getBoundingClientRect().top + scrollY")) < 400, "the page is put back after checking")
        if sb:
            prompt = await use_motion("When you scroll", "scroll behavior of an element")
            check("moves up" in prompt and "into place" in prompt, "its scroll behavior is in the prompt")

        # ---------- 5. Esc pauses picking; Start picking turns it back on ----------
        await element_mode()
        await site.keyboard.press("Escape")
        await panel.wait_for_selector("text=Start picking", timeout=5000)
        check(not await picking_on(), "Esc stops picking, panel shows ‘Start picking’")
        await panel.click("text=Start picking")
        await site.wait_for_timeout(300)
        check(await picking_on(), "‘Start picking’ turns it back on")

        # ---------- 5b. "Press it": a link's press effect, page stays ----------
        await pick_el("#go")
        await panel.wait_for_selector("#press-catch", timeout=10000)
        await panel.screenshot(path=f"{OUT}/panel-press.png", full_page=True)
        await panel.click("#press-catch")
        await panel.wait_for_selector("#title:has-text('Recording')")
        check(not await picking_on() and await site.evaluate(f"!!{ROOT}.shadowRoot.querySelector('.t.recording')"), "recording: picking is off, the page shows it's recording")
        gb = await site.locator("#go").bounding_box()
        await site.mouse.click(gb["x"] + gb["width"] / 2, gb["y"] + gb["height"] / 2)
        await panel.wait_for_selector("#title:has-text('What moved')", timeout=10000)
        check(site.url.rstrip("/").endswith("8001") or site.url.endswith("index.html"), f"the link didn't leave the page ({site.url})")
        mv = await movement()
        press = [m for m in mv if m["when"] == "On click"]
        check(bool(press) and press[0]["title"] == "Press", f"finished by itself and names the press effect ({press})")
        await all_previews("recorded press")
        if press:
            prompt = await use_motion("Press", "press effect")
            check("Plays when something is clicked" in prompt, "the prompt says it plays on a click")

        # ---------- 5c. "Press it" on a button that opens a menu ----------
        await pick_el("#menu-btn")
        await panel.wait_for_selector("#press-catch", timeout=10000)
        await panel.click("#press-catch")
        await panel.wait_for_selector("#title:has-text('Recording')")
        mb = await site.locator("#menu-btn").bounding_box()
        await site.mouse.click(mb["x"] + mb["width"] / 2, mb["y"] + mb["height"] / 2)
        await panel.wait_for_selector("#title:has-text('What moved')", timeout=10000)
        mv = await movement()
        check(any(m["when"] == "On click" and m["title"] == "Drop in" for m in mv), f"what opens when pressed is caught ({mv})")
        await site.evaluate("document.getElementById('menu').classList.remove('open')")

        # ---------- 6. page without the recorder → reload and check ----------
        await site.evaluate("delete window.__plRec")
        await pick_el("#hero-title")
        await panel.locator("details.section summary", has_text="Movement").evaluate("el => { const d = el.parentElement; if (!d.open) { d.open = true; d.dispatchEvent(new Event('toggle')); } }")
        await panel.wait_for_selector("#reload-check")
        check("before PromptLift opened" in await panel.locator(".press-row", has=panel.locator("#reload-check")).inner_text(), "missed opening movement: Reload offered right there, under Movement")
        await panel.click("#reload-check")
        await panel.wait_for_selector(".item:has-text('Letters rise in one by one')", state='attached', timeout=40000)
        check(True, "reload re-picks the same thing and finds its animation")

        # ---------- 7. two details from one pick, tweaks, my colors ----------
        hero = await site.locator("section.grad").bounding_box()
        await pick_at(hero["x"] + hero["width"] - 20, hero["y"] + hero["height"] - 20)
        await tick("Heading font")
        await tick("Button hover")
        await to_apply()
        hf = panel.locator(".change", has_text="Heading font")
        await open_adjust(hf)
        await hf.locator(".chip", has_text="Bigger").click()
        await panel.locator("label:has-text(\"Use my site's colors and fonts\")").click()
        prompt = await copy_prompt()
        check(prompt.count("<design_detail") == 2 and "my site's own colors and fonts" in prompt and "These values include my tweaks" in prompt, "two details from one pick + a tweak + my colors")

        # ---------- 7b. a prompt shaped for each AI app ----------
        async def copy_for(app):
            await pick_at(hero["x"] + hero["width"] - 20, hero["y"] + hero["height"] - 20)
            await tick("Heading font")
            await to_apply()
            await panel.click("#site-edit")
            await panel.select_option("#site-app", app)
            await panel.click("#site-done")
            return await copy_prompt()
        p_gpt = await copy_for("chatgpt")
        check("<design_detail" not in p_gpt and "### Detail 1" in p_gpt and "**Exact values:**\n```text" in p_gpt and "**Fit it to my site:**" in p_gpt, "ChatGPT / Gemini: Markdown sections instead of tags")
        check("If I already gave you my files in this chat, use those" in p_gpt and "not my whole project" in p_gpt and "look through my site" not in p_gpt and "Don't round" in p_gpt, "chat apps: use files already given, else ask once for the fewest (not the whole project); keep values exact")
        check(not any(t in p_gpt for t in ["<where_on_my_site>", "<fit_to_my_site>", "</"]), "no tags left in the Markdown version")
        check("### Keep one look" in p_gpt and "Reuse my site's existing fonts" in p_gpt, "even one detail says to reuse my site's fonts, colors and corners (Markdown: Keep one look)")
        check("### When you are done" in p_gpt and "Never describe a change you didn't make" in p_gpt and "old → new" in p_gpt and "complete updated file" in p_gpt, "the prompt ends by asking for real changes, listed old → new, and the full file from chat apps")
        p_b = await copy_for("builder")
        check(p_b.startswith("Change my existing website") and len(p_b.split("### Detail 1")[0]) < 400, f"site builders: a short opening ({len(p_b.split('### Detail 1')[0])} chars)")
        p_e = await copy_for("editor")
        check("Find where each part lives in this project" in p_e, "code editors: find the part in the project, reuse its components")
        p_c = await copy_for("claude-code")
        check("<design_detail" in p_c and "look through my site" in p_c, "Claude Code (default): tags, and it looks through the site itself")
        check(await panel.evaluate("(async () => (await chrome.storage.local.get('site')).site.app)()") == "claude-code", "the choice is remembered")

        # ---------- 8. screen portions: scroll behavior of a section ----------
        await site.evaluate("window.scrollTo({top: 0, behavior: 'instant'})")
        await portion_mode()
        check(await picking_on() and "drag" in await bar_text(), "‘A screen portion’: click a section or drag an area")
        await site.evaluate("document.getElementById('late-wrap').scrollIntoView({block:'start', behavior:'instant'})")
        await site.wait_for_timeout(300)
        await section_click("#late-wrap", 1, scroll=False)
        row = panel.locator(".sec-row").first
        for _ in range(30):
            if await row.locator(".chip.toggle").count() == 4: break
            await asyncio.sleep(0.1)
        check(await row.locator(".chip.toggle[aria-pressed=true]").count() == 4, "a section that reacts to scrolling: Color scheme, Font scheme, Format and Scroll behavior, all on")
        await row.locator(".chip.toggle", has_text="Color scheme").click()
        await row.locator(".chip.toggle", has_text="Format").click()
        await panel.click("#tray-btn")
        await panel.wait_for_selector("#title:has-text('Where should it go?')", timeout=40000)
        prompt = await copy_prompt()
        open(f"{OUT}/prompt-portion-scroll.md", "w").write(prompt)
        check("Scroll behavior" in prompt and "fades in and moves up 30px into place when you scroll to it" in prompt, "a section's scroll behavior: what comes in as you scroll, and how")
        check("shows the page at points while scrolling through it" in prompt, "a section's scroll behavior comes with a preview (frames while scrolling)")
        check("Colors:" not in prompt and "Format:" not in prompt, "only the parts that were chosen")
        check(await site.evaluate("scrollY") > 3000, "the page is put back after reading the scroll behavior")

        # ---------- 9. closing the panel switches PromptLift off completely ----------
        await panel.close()
        await site.wait_for_timeout(800)
        check(await site.evaluate(f"!{ROOT}"), "closing the panel removes everything from the page")
        check(await site.evaluate("window.__plRec ? window.__plRec.active : false") is False, "the recorder stops when the panel closes")
        await site.reload()
        await site.wait_for_timeout(800)
        check(await site.evaluate("typeof window.__plRec") == "undefined", "after closing, nothing of PromptLift loads on pages anymore")

        # ---------- 10. popup mode: picking survives the popup closing ----------
        await site.bring_to_front()
        waiter = asyncio.ensure_future(ctx.wait_for_event("page"))
        await sw.evaluate(f"chrome.windows.create({{url: 'panel.html?tabId={tab_id}&mode=popup', type: 'popup', width: 400, height: 900}})")
        pop = await waiter
        await pop.wait_for_selector("#choose-element")
        closed = asyncio.ensure_future(pop.wait_for_event("close"))
        await pop.click("#choose-element")
        await asyncio.wait_for(closed, 5)
        await site.wait_for_timeout(600)
        check(await picking_on(), "popup closes to let you click the page, and picking stays on")
        await site.evaluate("window.scrollTo({top: 0, behavior: 'instant'})")
        g = await site.locator("section.grad").bounding_box()
        await site.mouse.move(g["x"] + g["width"] - 30, g["y"] + g["height"] - 30)
        await site.wait_for_timeout(150)
        await site.mouse.down(); await site.mouse.up()
        await site.wait_for_timeout(2500)
        await open_panel(mode="popup")
        await panel.wait_for_selector("#title:has-text('Pick what to copy')", timeout=8000)
        check(True, "reopening the popup shows what you picked")
        await panel.close()
        await site.evaluate(f"{ROOT}?.remove(); window.__plUI = null")

        # ---------- 11. dark page with gradients: screen portions (colors + format) ----------
        await site.goto(SITE + "rich.html")
        await site.wait_for_timeout(800)
        await open_panel()
        await menu("#more", "Reload the page")
        await site.wait_for_load_state("load")
        await site.wait_for_timeout(1200)
        await portion_mode()
        await site.evaluate("window.scrollTo({top: 0, behavior: 'instant'})")
        hb = await site.locator(".hero h1").bounding_box()
        await site.mouse.move(hb["x"] + hb["width"] / 2, hb["y"] + 10)
        await site.wait_for_timeout(200)
        hlw = await site.evaluate(f"{ROOT}.shadowRoot.querySelector('.hl').getBoundingClientRect().width")
        secw = await site.evaluate("document.querySelector('.hero').getBoundingClientRect().width")
        check(abs(hlw - secw) < 12, f"hovering anything highlights its whole section ({round(hlw)} vs {round(secw)})")
        await section_click("header", 1)
        await section_click(".hero h1", 2)
        await section_click(".card p", 3)
        names = await panel.locator(".sec-row .sec-name").all_inner_texts()
        check(len(names) == 3 and "Navigation" in names[0] and "Hero" in names[1] and "cards section (3 cards)" in names[2], f"sections named by what they are ({names})")
        await section_click(".hero h1", 2)
        check(await panel.locator(".sec-row").count() == 2, "clicking a chosen section again takes it off")
        await section_click(".hero h1", 3)
        await panel.wait_for_timeout(500)
        scroll_chips = [await panel.locator(".sec-row").nth(i).locator(".chip.toggle", has_text="Scroll behavior").count() for i in range(3)]
        chips0 = await panel.locator(".sec-row").first.locator(".chip.toggle").all_text_contents()
        check(chips0[:3] == ["Color scheme", "Font scheme", "Format"] and await panel.locator(".sec-row").first.locator(".chip.toggle[aria-pressed=true]").count() >= 3, f"each section: Color scheme, Font scheme, Format (all on) ({chips0})")
        check(scroll_chips[0] == 1 and scroll_chips[1] == 0 and scroll_chips[2] == 0, f"Scroll behavior is offered only where something reacts to scrolling (sticky nav: yes; hero, cards: no) ({scroll_chips})")

        await panel.screenshot(path=f"{OUT}/panel-sections.png", full_page=True)
        await panel.click("#tray-btn")
        await panel.wait_for_selector("#title:has-text('Where should it go?')", timeout=40000)
        check(await panel.locator(".change").count() == 3, "one block per section to place")
        check(await panel.locator(".change textarea[id^=content-]").count() == 3, "each section asks what it should show")
        await panel.locator(".change").nth(1).locator("input[id^=where-]").fill("my features section")
        await panel.locator(".change").nth(1).locator("textarea[id^=content-]").fill("my 3 best sellers: sourdough, croissants, rye")
        prompt = await copy_prompt()
        open(f"{OUT}/prompt-sections.md", "w").write(prompt)
        check(prompt.count("<design_detail") == 3 and "Color scheme, font scheme and format of one section of the page (cards section (3 cards))" in prompt, "each block says what it holds")
        check("Font scheme:\nFamilies (1):" in prompt and "- Main heading (h1): system-ui 64px, weight 700" in prompt and "Scale against the body text" in prompt and "strong contrast" in prompt, "each section's font scheme: families, every role, and how they relate")
        check("Fonts: put each role on my matching text in that place" in prompt and "is a system font: there is nothing to load" in prompt and "on phones scale every size down together" in prompt, "the font scheme fits my site: which text gets which font, loading, keep the ratios")
        check("radial-gradient(circle, #7c3aed 0%, transparent 70%)" in prompt and "main headline: gradient text linear-gradient(90deg, #ffffff, #c4b5fd)" in prompt and "sign-up call to action: #7c3aed, text #ffffff" in prompt, "hero colors: gradients, gradient headline, button")
        check("Cards and panels:" in prompt and "#db2777" in prompt and "In short: section title → 3 cards in a row" in prompt and "grid, 3 equal columns" in prompt, "cards section: colors and format")
        check("menu link ×5: page links, 1 word each" in prompt and "sticky at the top" in prompt and "positions: left, middle, right" in prompt, "navigation bar section: links by purpose, sticky, where things sit")
        check("Scroll behavior" in prompt and "stays in the same place on screen while you scroll" in prompt and "No scroll behavior found" not in await panel.inner_text("main"), "the sticky navigation's scroll behavior is measured (offered → found)")
        check("<content_i_want>my 3 best sellers: sourdough, croissants, rye</content_i_want>" in prompt and "Fill it with what <content_i_want> says" in prompt, "what a part should show goes into the prompt and fills it")
        check("Color relationships (keep these even in other colors):" in prompt and "much darker than the page's usual background" not in prompt.split("Navigation bar")[0] and "Cards are a bit lighter than the background behind them" in prompt and "Keep the color relationships" in prompt, "formats say how the colors relate (cards a bit lighter than their dark section) and to keep that in my colors")
        sp = prompt.split("<shared_spacing>\n")[1].split("</shared_spacing>")[0] if "<shared_spacing>\n" in prompt else ""
        check("Side padding: 40px" in sp and "Content width: at most 1120px" in sp and "Space at the top and bottom of each section: 96px" in sp and "title → text 24px" in sp and "Between cards or items side by side: 24px" in sp, f"several formats share one spacing system ({sp.strip()[:300]})")
        check("If the rest of my page already uses one consistent spacing" in sp, "changing a site: the new parts line up with the old ones")
        done = prompt.split("<when_done>\n")[1] if "<when_done>\n" in prompt else ""
        check("rebuild it to match; changing only sizes is not enough" in done and "complete updated file" not in done and prompt.rstrip().endswith("</when_done>"), "formats: the AI must check the layout against the outline (Claude Code edits files itself, so no full file)")
        fmt = prompt.split("Format:\n")[2].split("\nColors:\n")[0] if prompt.count("Format:\n") >= 2 else ""
        check("Position on the page" in fmt and "Directly above it: Hero (first section)" in fmt and "Width: edge to edge" in fmt and "Keep its place relative to the rest of the page" in prompt, "a format says where it sits: what is above and below it, how wide")
        import re as _re
        check(fmt and not _re.search(r"#[0-9a-f]{3,6}\b|rgba?\(", fmt) and "system-ui" not in fmt and "weight" not in fmt and "text size 40px" in fmt, f"a format copies the layout only: no colors or fonts in it ({_re.findall(r'#[0-9a-f]{3,6}|system-ui|weight', fmt)[:5]})")
        look = prompt.split("<one_look>\n")[1].split("</one_look>")[0] if "<one_look>\n" in prompt else ""
        check("even where the details come from different places" in look and "Reuse my site's existing fonts, colors, corner sizes" in look and "<one_look>" in prompt.split("<design_detail")[0], f"several parts keep one look: reuse my site's fonts, colors, corners ({look.strip()[:200]})")
        check("What goes in it" in prompt and "main headline, about 5 words: what I offer, said in one line" in prompt and "3× card title" in prompt, "a format says what information goes in each part")
        check("Take the content from my site" in prompt and "Don't invent facts" in prompt, "content comes from my site, nothing invented")
        check(prompt.count("Where a section meets the sections above and below") == 1 and "For every detail below where it applies:" in prompt, "general lines (blend with neighbors, content from my site) are said once for all sections")
        site_words = ["Nova", "Product", "Pricing", "Ship products", "Everything you need", "Get started", "Sign in", "Roadmaps"]
        check(not any(w in prompt for w in site_words), f"none of the site's own words are copied ({[w for w in site_words if w in prompt]})")

        # ---------- 11b. your own areas: across two sections, or part of one ----------
        async def drag(x0, y0, x1, y1, expect):
            await site.mouse.move(x0, y0); await site.mouse.down()
            for i in range(1, 9):
                await site.mouse.move(x0 + (x1 - x0) * i / 8, y0 + (y1 - y0) * i / 8)
                await asyncio.sleep(0.02)
            await site.mouse.up()
            for _ in range(80):
                if await panel.locator(".sec-row").count() == expect: break
                await asyncio.sleep(0.1)
            await site.wait_for_timeout(400)
        await portion_mode()
        await site.evaluate("window.scrollTo({top: 0, behavior: 'instant'})")
        await site.wait_for_timeout(300)
        hero_b = await site.locator(".hero").bounding_box()
        await drag(30, 5, 1250, min(790, hero_b["y"] + hero_b["height"] * 0.7), 1)
        row = panel.locator(".sec-row").first
        check("Sections together" in await row.inner_text() and "(together)" in await row.inner_text(), f"dragging across two sections chooses them together ({(await row.inner_text())[:80]!r})")
        check(await site.evaluate(f"{ROOT}.shadowRoot.querySelectorAll('.sel').length") == 1, "one outline around both")
        await site.evaluate("document.querySelector('.card').scrollIntoView({block:'center', behavior:'instant'})")
        await site.wait_for_timeout(300)
        c1 = await site.locator(".card").nth(0).bounding_box(); c2 = await site.locator(".card").nth(1).bounding_box()
        await drag(c1["x"] - 8, c1["y"] - 8, c2["x"] + c2["width"] + 8, c2["y"] + c2["height"] + 8, 2)
        row2 = panel.locator(".sec-row").nth(1)
        check("Part of a section" in await row2.inner_text() and "2 pieces" in await row2.inner_text(), f"dragging over two of three cards chooses just those ({(await row2.inner_text())[:80]!r})")
        # clicking inside a chosen area takes it off; drag it again
        await site.mouse.move(c1["x"] + 30, c1["y"] + 30); await site.mouse.down(); await site.mouse.up()
        for _ in range(40):
            if await panel.locator(".sec-row").count() == 1: break
            await asyncio.sleep(0.1)
        check(await panel.locator(".sec-row").count() == 1, "clicking inside a chosen area takes it off")
        await drag(c1["x"] - 8, c1["y"] - 8, c2["x"] + c2["width"] + 8, c2["y"] + c2["height"] + 8, 2)
        await panel.click("#tray-btn")
        await panel.wait_for_selector("#title:has-text('Where should it go?')", timeout=40000)
        prompt = await copy_prompt()
        open(f"{OUT}/prompt-areas.md", "w").write(prompt)
        check("of several sections of the page, together" in prompt and "Format (2 sections, top to bottom):" in prompt, "the span is read section by section, as one detail")
        check("Format (only these 2 pieces of the section, not the rest of it):" in prompt and "How they sit: 2 pieces in 1 row" in prompt and prompt.count("Piece 1:") >= 1, "the part is read as just those pieces and how they sit")
        check(prompt.count("Font scheme:") == 2, "both areas carry their font scheme")

        # ---------- 12. the header as an element: navigation bar + scrolls automatically checked ----------
        await site.evaluate("window.scrollTo({top: 0, behavior: 'instant'})")
        await pick_el("header")
        for _ in range(60):
            if await panel.evaluate("['found','none'].includes(state.view.scrollState)"): break
            await asyncio.sleep(0.2)
        titles = [c["title"] for c in await cards()]
        await all_previews("sticky header (scroll behavior)")
        check("Navigation bar" in titles and "When you scroll" in titles, f"a sticky header: navigation bar + its scroll behavior, checked by itself ({titles})")
        await tick("Navigation bar")
        await tick("When you scroll")
        await to_apply()
        prompt = await copy_prompt()
        check("The 2nd menu link opens a dropdown" in prompt and "menu button replaces the links" in prompt and "stays in the same place on screen while you scroll" in prompt, "navigation details + stays on screen while scrolling")

        # ---------- 13. a page inside one painted wrapper still splits into sections ----------
        await site.goto(SITE + "shell.html")
        await site.wait_for_timeout(800)
        await portion_mode()
        await section_click(".hero h1", 1)
        names = await panel.locator(".sec-row .sec-name").all_inner_texts()
        check("Hero" in names[0], f"the hero is its own section, not the whole page ({names})")
        await go_home()

        # ---------- robustness ----------
        await site.goto(SITE + "empty.html")
        await open_panel()
        await panel.click("#choose-portion")
        await panel.wait_for_selector("#title:has-text('Pick screen portions')")
        check(await panel.locator(".alert").count() == 0, "empty page: no errors")
        await site.goto("chrome://version")
        await panel.reload()
        await panel.wait_for_selector("text=Open a website first")
        check(True, "browser page: friendly message")
        # ---------- the panel can move into a window of its own ----------
        await site.goto(SITE)
        await site.wait_for_timeout(600)
        await open_panel()
        await panel.click("#more")
        items = await panel.locator(".menu .menu-item").all_text_contents()
        check("Open in its own window" in items, f"More: Open in its own window ({items})")
        old_panel = panel
        waiter = asyncio.ensure_future(ctx.wait_for_event("page"))
        closed = asyncio.ensure_future(old_panel.wait_for_event("close"))
        await panel.locator(".menu .menu-item", has_text="Open in its own window").click()
        win = await asyncio.wait_for(waiter, 10)
        await win.wait_for_selector(f"#title:has-text('{HOME}')", timeout=10000)
        await asyncio.wait_for(closed, 10)
        check("mode=window" in win.url and old_panel.is_closed(), "it opens as its own window (movable) and the side panel closes")
        check(await site.evaluate("!!window.__plRec && window.__plRec.active"), "PromptLift stays on while switching (the recorder keeps running)")
        await win.click("#choose-element")
        await win.wait_for_selector("#title:has-text('Pick an element')")
        for _ in range(30):
            if await picking_on(): break
            await asyncio.sleep(0.1)
        check(await picking_on(), "picking works from the window")
        await win.click("#more")
        witems = await win.locator(".menu .menu-item").all_text_contents()
        check("Back to the side panel" in witems and "Open in its own window" not in witems, f"the window offers to go back to the side panel ({witems})")
        await win.close()
        await site.wait_for_timeout(500)

        await open_panel(scheme="dark", width=320)
        await panel.screenshot(path=f"{OUT}/panel-dark-320.png", full_page=True)
        check(await panel.evaluate("document.documentElement.scrollWidth") <= 320, "no horizontal overflow at 320px")

        check(nonlocal_reading and sum(nonlocal_reading) >= len(nonlocal_reading) * 0.8, f"right after a click the panel says it's reading the pick ({sum(nonlocal_reading)}/{len(nonlocal_reading)})")
        errs = [l for l in logs if ("error" in l.lower() or "pageerror" in l) and "] debug:" not in l and "satoshi" not in l.lower() and "ERR_" not in l and "404" not in l and "fonts.googleapis" not in l]
        print("\n".join(errs) or "no unexpected console errors")
        check(not errs, "no unexpected console errors")
        await ctx.close()
    print("\nFAILURES:", fails if fails else "none")
    sys.exit(1 if fails else 0)


asyncio.run(main())
