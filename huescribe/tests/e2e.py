"""End-to-end tests for Huescribe 9 (one list, always-on picking), run in Chrome for Testing via Playwright.

Start the fixture servers first:  tests/serve.sh
Then:                              python3 tests/e2e.py
"""
import asyncio, os, sys, tempfile
from playwright.async_api import async_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
EXT = os.path.dirname(HERE)
OUT = os.environ.get("PL_OUT", "/tmp/huescribe-out")
SITE = "http://127.0.0.1:8001/"
os.makedirs(OUT, exist_ok=True)
fails = []
SITE_TEXT = ["Ship faster", "Acme", "Features", "Deploys in seconds"]
JARGON = ["cubic-bezier", "keyframe", "px", "ms ", "easing", "opacity", "transform", "rgba(", "#"]
HOME = "My list"


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
        # signed in through the test account (only honored by an unpacked install; Google sign-in has its own test)
        await sw.evaluate("chrome.storage.local.set({accountTestUser: {id: 'test', email: 'test@example.com', name: 'Test'}})")
        logs = []
        site = ctx.pages[0] if ctx.pages else await ctx.new_page()
        site.on("console", lambda m: logs.append(f"[site] {m.type}: {m.text}"))
        await site.goto(SITE)
        await site.wait_for_load_state("networkidle")
        await site.wait_for_timeout(800)
        tab_id = await sw.evaluate(f"(async()=> (await chrome.tabs.query({{url:'{SITE}*'}}))[0].id)()")
        panel = None
        ROOT = "document.getElementById('__huescribe-root')"

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
            await panel.wait_for_selector(f"#title:has-text('{HOME}'), #title:has-text('What do you want from it?')")
            # Remember what gets copied (the clipboard itself needs focus in headless Chrome).
            await panel.evaluate("(() => { const w = navigator.clipboard.writeText.bind(navigator.clipboard); navigator.clipboard.writeText = (t) => { window.__copied = t; return w(t).catch(() => {}); }; })()")
            # Colors are shifted slightly in every real prompt; the checks below compare exact values.
            await panel.evaluate("globalThis.__plNoShift = true; state.keepAfterCopy = true")
            await site.bring_to_front()

        async def hl_visible():
            return await site.evaluate(f"{ROOT}.shadowRoot.querySelector('.hl').style.display === 'block'")

        async def bar_text():
            return await site.evaluate(f"{ROOT}.shadowRoot.querySelector('.bar').textContent")

        async def picking_on():
            return await site.evaluate(f"!!{ROOT}?.shadowRoot.querySelector('.t.picking')")

        async def go_home():
            await panel.evaluate("state.history = []; state.view = null; go('home', false)")
            await panel.wait_for_selector(f"#title:has-text('{HOME}')")

        async def element_mode():
            """Picking is always on: just be on the list or a pick, and wait for the page to be ready."""
            if await panel.evaluate("state.screen") not in ("home", "pick", "secpick"):
                await go_home()
            if not await picking_on() and await panel.locator("#pick-btn").count():
                await panel.click("#pick-btn")
            for _ in range(40):
                if await picking_on(): break
                await asyncio.sleep(0.1)

        async def fresh():
            """Start from an empty list (each check copies only what it just added)."""
            await panel.evaluate("state.basket = []; saveBasket()")

        async def tick(text):
            exact = panel.locator(".item").filter(has=panel.locator(".txt b", has_text=text))
            item = exact.first if await exact.count() else panel.locator(".item", has_text=text).first
            await item.evaluate("el => { const d = el.closest('details'); if (d && !d.open) { d.open = true; d.dispatchEvent(new Event('toggle')); } }")
            await item.locator("input[type=checkbox]").check()

        async def to_apply():
            """Add to my list: back on the list, with the new row."""
            await panel.click("#tray-btn")
            await panel.wait_for_selector(f"#title:has-text('{HOME}')", timeout=40000)
            await panel.wait_for_selector(".row-card", timeout=10000)

        async def copy_prompt():
            """Copy prompt: the whole list as one message (the list stays)."""
            await panel.evaluate("window.__copied = ''")
            await panel.click("#tray-btn")
            await panel.wait_for_timeout(250)
            return await panel.evaluate("window.__copied || ''")

        async def open_adjust(card):
            await card.locator("details.adjust-box").evaluate("d => { if (!d.open) { d.open = true; d.dispatchEvent(new Event('toggle')); } }")

        async def menu(anchor, label):
            await panel.click(anchor) if isinstance(anchor, str) else await anchor.click()
            await panel.locator(".menu .menu-item", has_text=label).first.click()

        async def cards():
            return await panel.locator(".item").evaluate_all("els => els.map(e => ({ when: (e.querySelector('.when') || {}).textContent || '', title: e.querySelector('.txt b').textContent, desc: e.querySelector('.desc').textContent, ctx: (e.querySelector('.txt small') || {}).textContent || '' }))")

        async def movement():
            return await panel.locator("details.section:has(.group-toggle[data-group=Motion]) .item").evaluate_all("els => els.map(e => ({ when: (e.querySelector('.when') || {}).textContent || '', title: e.querySelector('.txt b').textContent, desc: e.querySelector('.desc').textContent, ctx: (e.querySelector('.txt small') || {}).textContent || '' }))")

        async def pick_at(x, y, keep=False, whole=False):
            """Click on the page, then wait for the NEW pick. A whole section is taken apart into
            single parts unless `whole` (the section card's 'Single parts instead')."""
            if not keep: await fresh()
            await element_mode()
            before = await panel.evaluate("state.view?.pickId || ''")
            await site.mouse.move(x, y)
            await site.wait_for_timeout(150)
            await site.mouse.down(); await site.mouse.up()
            nonlocal_reading.append(await panel.locator("#reading-status").count() > 0 or await panel.evaluate(f"!!state.view && state.view.pickId !== '{before}'"))
            for _ in range(200):
                scr = await panel.evaluate("state.screen")
                if scr == "secpick" and not whole:
                    await panel.wait_for_selector("#as-element", timeout=5000)
                    await panel.click("#as-element")
                    whole = True
                if await panel.evaluate(f"state.screen === 'pick' && !!state.view?.pickId && state.view.pickId !== '{before}' && state.view.movement !== 'loading'"):
                    break
                await asyncio.sleep(0.1)
            else:
                print("   LOGS", logs[-4:])
                await site.screenshot(path=f"{OUT}/debug-fail.png")
                raise TimeoutError("pick did not arrive")
            await panel.wait_for_timeout(300)

        async def pick_el(selector, keep=False):
            # Leave the previous pick first: its previews stop scrolling the page to film things.
            if await panel.evaluate("state.screen") == "pick":
                await go_home()
                await site.wait_for_timeout(500)
            await element_mode()
            # A preview of the previous pick may still be putting the scroll back: wait until it is on screen.
            # (and the previous pick's scroll check may still be putting the page back): wait until the
            # target stays put and is really what is under the pointer.
            pt = None  # a target that never holds still (a floating badge) still gets clicked at its middle
            for _ in range(10):
                await site.evaluate(f"document.querySelector('{selector}').scrollIntoView({{block:'center', behavior:'instant'}})")
                await site.wait_for_timeout(500)
                b = await site.locator(selector).first.bounding_box()
                await site.wait_for_timeout(400)
                b2 = await site.locator(selector).first.bounding_box()
                if not (b and b2 and abs(b["y"] - b2["y"]) < 1 and 0 <= b["y"] + b["height"] / 2 <= 880): continue
                # A point where the target itself (or something inside it) is what the pointer is on.
                pt = None
                for x, y in [(b["x"] + min(6, b["width"] / 2), b["y"] + b["height"] / 2), (b["x"] + b["width"] / 2, b["y"] + b["height"] / 2)]:
                    if await site.evaluate(f"(() => {{ const t = document.querySelector('{selector}'); const h = document.elementsFromPoint({x}, {y}).find((e) => e.id !== '__huescribe-root'); return !!h && (t === h || t.contains(h)); }})()"):
                        pt = (x, y); break
                if pt: break
            pt = pt or (b["x"] + min(6, b["width"] / 2), b["y"] + b["height"] / 2)
            await pick_at(pt[0], pt[1], keep)

        async def section_pick(selector, keep=False, scroll=True):
            """Point at something in a section, ↑ until the outline is the whole section, click."""
            if not keep: await fresh()
            await element_mode()
            if scroll:
                await site.evaluate(f"document.querySelector('{selector}').scrollIntoView({{block:'center', behavior:'instant'}})")
                await site.wait_for_timeout(300)
            b = await site.locator(selector).first.bounding_box()
            x, y = b["x"] + b["width"] / 2, b["y"] + min(b["height"] / 2, 40)
            await site.mouse.move(x, y)
            await site.wait_for_timeout(200)
            for _ in range(12):
                lab = await site.evaluate(f"{ROOT}.shadowRoot.querySelector('.hl em')?.textContent || ''")
                if lab.startswith("Section:"): break
                await site.keyboard.press("ArrowUp")
                await site.wait_for_timeout(150)
            await site.mouse.down(); await site.mouse.up()
            await panel.wait_for_selector("#title:has-text('What do you want from it?') >> nth=0", timeout=20000)
            for _ in range(100):
                if await panel.evaluate("state.screen === 'secpick' && state.view?.scrollHint !== null"): break
                await asyncio.sleep(0.1)

        async def chips(*parts):
            for k in parts:
                await panel.locator(f".part-chips .chip.toggle[data-part={k}]").click()

        async def drag(x0, y0, x1, y1):
            await element_mode()
            await site.mouse.move(x0, y0); await site.mouse.down()
            for i in range(1, 9):
                await site.mouse.move(x0 + (x1 - x0) * i / 8, y0 + (y1 - y0) * i / 8)
                await asyncio.sleep(0.02)
            await site.mouse.up()
            for _ in range(100):
                if await panel.evaluate("state.screen === 'secpick' && state.view?.scrollHint !== null"): break
                await asyncio.sleep(0.1)

        async def all_previews(label):
            """Every animation listed under Movement must end up with a real preview (a picture strip)."""
            await panel.locator("details.section summary", has=panel.locator(".group-toggle[data-group=Motion]")).evaluate("el => { const d = el.parentElement; if (!d.open) { d.open = true; d.dispatchEvent(new Event('toggle')); } }")
            items = panel.locator("details.section:has(.group-toggle[data-group=Motion]) .item")
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
            await panel.locator("details.section summary", has=panel.locator(".group-toggle[data-group=Motion]")).evaluate("el => { const d = el.parentElement; if (!d.open) { d.open = true; d.dispatchEvent(new Event('toggle')); } }")
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

        # ---------- 0. opening: picking is on; the list; one setting; switched-off until opened ----------
        check(await site.evaluate("typeof window.__plRec") == "undefined", "before Huescribe is opened, nothing of it runs on the page")
        await open_panel()
        await panel.screenshot(path=f"{OUT}/panel-home.png", full_page=True)
        for _ in range(40):
            if await picking_on(): break
            await asyncio.sleep(0.1)
        check(await picking_on(), "picking is on as soon as Huescribe opens (no first choice to make)")
        check(await panel.locator("#choose-element, #choose-portion").count() == 0, "no 'element or screen portion' choice any more")
        check(await panel.locator(".tip").count() == 1, "first time: a short how-it-works tip")
        await panel.click("#tip-ok")
        await panel.wait_for_selector("#list-empty")
        check(await panel.locator(".tip").count() == 0 and await panel.evaluate("(async () => (await chrome.storage.local.get('tipSeen')).tipSeen)()"), "the tip goes away for good")
        check(await panel.locator("#app").inner_text() == "Claude Code", "the header shows the one setting: which AI app (Claude Code by default)")
        check(await panel.locator(".site-card, #site-about, #mode-new, #mode-change").count() == 0, "no 'new site or changing', no 'what is it' (the AI sees the site)")
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

        # ---------- 1. a gradient: whole section first, or its single parts ----------
        await element_mode()
        bt = await bar_text()
        check(await picking_on() and "Click" in bt and "section" in bt and "drag" in bt.lower(), f"one way of picking: click anything, ↑ ↓ up to a section, drag an area ({bt})")
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
        await site.wait_for_timeout(200)
        # The box matches the size it reports and lines up with a real element under its center.
        gap = await site.evaluate(f"""(() => {{ const hl = {ROOT}.shadowRoot.querySelector('.hl'), a = hl.getBoundingClientRect();
            const [w, h] = hl.querySelector('em small').textContent.split('×').map((x) => parseFloat(x));
            const under = document.elementsFromPoint(a.left + a.width / 2, a.top + a.height / 2).filter((e) => e.id !== '__huescribe-root');
            const best = Math.min(...under.map((e) => {{ const b = e.getBoundingClientRect(); return Math.max(Math.abs(a.left - b.left), Math.abs(a.top - b.top), Math.abs(a.width - b.width), Math.abs(a.height - b.height)); }}));
            return Math.max(best, Math.abs(a.width - w), Math.abs(a.height - h)); }})()""")
        check(isinstance(gap, (int, float)) and gap < 3, f"the highlight sits exactly on what's under the pointer, moved by transform (off by {gap})")
        check("translate" in await site.evaluate(f"{ROOT}.shadowRoot.querySelector('.hl').style.transform"), "the highlight is positioned with transform, not left/top")
        # A burst of pointer moves is handled once per frame and still ends on the right thing.
        await site.evaluate(f"(() => {{ const sh = {ROOT}.shadowRoot.querySelector('.shield'); const r = document.querySelector('#hero-title').getBoundingClientRect(); for (let i = 0; i < 200; i++) sh.dispatchEvent(new MouseEvent('mousemove', {{ clientX: r.left + 20 + (i % 7), clientY: r.top + r.height / 2, bubbles: true }})); }})()")
        await site.wait_for_timeout(120)
        burst = await site.evaluate(f"{ROOT}.shadowRoot.querySelector('.hl em').textContent")
        check(burst.startswith("Heading (h1)"), f"200 pointer moves in one go settle on the right thing ({burst})")
        # Moving and pressing in the same frame (a fast click) acts on what's under the pointer, not on the last highlight.
        same = await site.evaluate(f"""(() => {{ const sh = {ROOT}.shadowRoot.querySelector('.shield'); const r = document.querySelector('section.grad').getBoundingClientRect();
            const x = r.right - 20, y = r.bottom - 20;
            sh.dispatchEvent(new MouseEvent('mousemove', {{ clientX: x, clientY: y, bubbles: true }}));
            sh.dispatchEvent(new MouseEvent('mousedown', {{ clientX: x, clientY: y, button: 0, bubbles: true, cancelable: true }}));
            const label = {ROOT}.shadowRoot.querySelector('.hl em').textContent;
            sh.dispatchEvent(new MouseEvent('mouseup', {{ clientX: x, clientY: y, button: 0, bubbles: true }}));
            return label; }})()""")
        check(not same.startswith("Heading (h1)"), f"a click in the same frame as the move uses what's under the pointer ({same})")
        await panel.wait_for_selector(".pick-name", timeout=20000)
        await fresh()
        await go_home()
        await site.mouse.move(tb["x"] + 40, tb["y"] + tb["height"] / 2 + 1)
        await site.evaluate("window.scrollBy(0, 300)")
        await site.wait_for_timeout(250)
        check(await site.evaluate(f"{ROOT}.shadowRoot.querySelector('.hl').style.display") == "block", "after scrolling, the highlight follows what is now under the pointer")
        await site.evaluate("window.scrollTo(0, 0)")
        await site.wait_for_timeout(200)
        hero = await site.locator("section.grad").bounding_box()
        # clicking the section's own background picks the whole section
        await fresh()
        await site.mouse.move(hero["x"] + hero["width"] - 20, hero["y"] + hero["height"] - 20)
        await site.wait_for_timeout(200)
        hov = await site.evaluate(f"{ROOT}.shadowRoot.querySelector('.hl em').textContent")
        await site.mouse.down(); await site.mouse.up()
        await panel.wait_for_selector("#as-element", timeout=20000)
        sp_chips = await panel.locator(".part-chips .chip.toggle").all_text_contents()
        check(hov.startswith("Section:") and sp_chips[:3] == ["Colors", "Fonts", "Layout"] and "Everything" not in sp_chips, f"a whole section: the same choices (Colors, Fonts, Layout; no Everything) ({hov}; {sp_chips})")
        check(await panel.locator("#tray-btn").is_disabled() and await panel.locator("#tray-btn").inner_text() == "Add to my list", "Add to my list waits until something is chosen")
        await panel.click("#as-element")
        for _ in range(200):
            if await panel.evaluate("state.screen === 'pick' && state.view?.movement !== 'loading'"): break
            await asyncio.sleep(0.1)
        await panel.wait_for_timeout(300)
        cs = await cards()
        print("   hero cards:", [(c["when"], c["title"], c["desc"]) for c in cs])
        grad = [c for c in cs if c["title"] == "Gradient"]
        check(bool(grad) and grad[0]["desc"] == "Light orange to pale pink, diagonal.", f"'Single parts instead': the gradient in simple words ({grad[:1]})")
        font = [c for c in cs if c["title"] == "Heading font"]
        check(bool(font) and font[0]["desc"] == "Fraunces, very big, bold, tight.", f"font in simple words ({font[:1]})")
        hov = [c for c in cs if c["title"] == "Button hover"]
        check(bool(hov) and hov[0]["when"] == "On hover", f"hover in simple words ({hov[:1]})")
        check(not any(j in c["title"] + " " + c["desc"] for c in cs for j in JARGON), "no code words on cards")
        groups = await panel.locator("details.section summary .group-toggle").all_text_contents()
        check(set(groups) <= {"Colors", "Fonts", "Layout", "Motion"} and groups == sorted(groups, key=["Colors", "Fonts", "Layout", "Motion"].index), f"four choices, always in this order: Colors, Fonts, Layout, Motion; no Everything ({groups})")
        check(await panel.locator("details.section[open]").count() == 1 and await panel.locator("details.section[open] .group-toggle", has_text="Motion").count() == 1, "only Motion starts open; the other groups start closed")
        pid = await panel.evaluate("state.view.pickId")
        await site.mouse.move(hero["x"] + 60, hero["y"] + 60)
        await site.wait_for_timeout(150)
        check(not await hl_visible() and "your pick" in await bar_text(), "after a pick, hovering doesn't highlight anything new")
        await site.mouse.down(); await site.mouse.up()
        await site.wait_for_timeout(200)
        check(await hl_visible() and await panel.evaluate("state.view.pickId") == pid, "clicking the pick again unlocks the highlight (no new pick)")
        # the group switch ticks all of it; the details tick single things
        await panel.locator(".group-toggle[data-group=Colors]").click()
        ncol = await panel.locator("details.section:has(.group-toggle[data-group=Colors]) .item input:checked").count()
        tot = await panel.locator("details.section:has(.group-toggle[data-group=Colors]) .item").count()
        check(ncol == tot and tot >= 1 and await panel.locator(".group-toggle[data-group=Colors]").get_attribute("aria-pressed") == "true", f"tapping Colors ticks all its colors ({ncol}/{tot})")
        await panel.locator(".group-toggle[data-group=Colors]").click()
        check(await panel.locator("details.section:has(.group-toggle[data-group=Colors]) .item input:checked").count() == 0, "tapping it again unticks them")
        await tick("Gradient")
        check(await panel.locator(".group-toggle[data-group=Colors]").get_attribute("aria-pressed") in ("true", "mixed"), "ticking one thing shows on its group's switch")
        await to_apply()
        check(await picking_on(), "picking stays on while the list is shown")
        card = panel.locator(".row-card").first
        check((await card.locator(".row-name small").inner_text()) == "Colors", "each row says what it copies (Colors · Fonts · Layout · Motion)")
        check(await card.locator("details.adjust-box:not([open])").count() == 1 and not await card.locator("textarea[id^=req-]").is_visible(), "each row is short: changing it is under Adjust, closed")
        check(await card.locator(".seg-btn").count() == 0 and await panel.locator("#fit").count() == 0, "no 'change what is there / add as new', no 'use my site's colors' box (where and the chips say it)")
        await card.locator("input[id^=where-]").fill("top of my homepage")
        await open_adjust(card)
        await card.locator(".chip", has_text="Show on page").click()
        await card.locator(".chip", has_text="Flip direction").click()
        await site.wait_for_timeout(200)
        check("315deg" in (await site.evaluate("document.querySelector('section.grad').getAttribute('style') || ''")), "quick tweak shows live on the page")
        await card.locator(".chip", has_text="Stop showing").click()
        await card.locator("textarea[id^=req-]").fill("fade to white at the bottom")
        check(await card.locator("label", has_text="Make a new picture from this").count() == 1, "making a picture is a checkbox under Adjust")
        check(await card.locator("textarea[id^=content-]").count() == 0, "a gradient doesn't ask what it should show (only parts that hold content do)")
        check(await panel.locator("#tray-btn").text_content() == "Copy prompt (1 part)", "one button: Copy prompt, with how many parts")
        await panel.screenshot(path=f"{OUT}/panel-apply.png", full_page=True)
        prompt = await copy_prompt()
        open(f"{OUT}/prompt-gradient.md", "w").write(prompt)
        check("<what>Gradient: Light orange to pale pink, diagonal (linear, 135°)</what>" in prompt and "linear-gradient(315deg, #fed7aa, #fbcfe8)" in prompt, "prompt: simple words + exact values")
        # "My instructions": typed once, added to every copied prompt (before <when_done>), kept between sessions,
        # and its colors are not shifted; empty means nothing is added.
        check(await panel.locator("#custom-prompt").count() == 1 and "My instructions" in await panel.locator("#custom summary").inner_text(), "the list has a My instructions box")
        own_before = await copy_prompt()
        check("<my_instructions>" not in own_before, "with no instructions of my own, nothing is added")
        if not await panel.evaluate("document.getElementById('custom').open"): await panel.click("#custom summary")
        await panel.fill("#custom-prompt", "Use Tailwind classes. Keep my brand blue #1d4ed8.")
        await panel.wait_for_timeout(600)
        stored = await panel.evaluate("chrome.storage.local.get('customPrompt').then(r => r.customPrompt)")
        await panel.evaluate("globalThis.__plNoShift = false")
        own = await copy_prompt()
        await panel.evaluate("globalThis.__plNoShift = true")
        i_own, i_done = own.find("<my_instructions>"), own.find("<when_done>")
        check(0 < i_own < i_done and "Use Tailwind classes. Keep my brand blue #1d4ed8." in own, "my instructions go into the prompt, just before <when_done>, word for word (my color is not shifted)")
        check(stored == "Use Tailwind classes. Keep my brand blue #1d4ed8." and await panel.locator("#custom .custom-state").inner_text() == "On", "my instructions are saved and the box says On")
        await panel.fill("#custom-prompt", ""); await panel.wait_for_timeout(600)
        await panel.evaluate("document.activeElement && document.activeElement.blur(); document.getElementById('custom').open = false")
        check("<my_instructions>" not in await copy_prompt() and await panel.evaluate("chrome.storage.local.get('customPrompt').then(r => r.customPrompt)") == "", "clearing the box takes them out again")
        # Real prompts never carry the original colors: each is moved a little, the same way for all.
        await panel.evaluate("globalThis.__plNoShift = false")
        shifted = await copy_prompt()
        again = await copy_prompt()
        await panel.evaluate("globalThis.__plNoShift = true")
        check("#fed7aa" not in shifted and "#fbcfe8" not in shifted and "deliberately shifted a little" in shifted and "linear-gradient(315deg, #" in shifted and shifted == again,
              "colors in the prompt are slightly shifted from the original, the same way each time (and the prompt says so)")
        # After copying, the list empties (Undo brings it back; Copy again copies the same text).
        before = await panel.locator(".row-card").count()
        await panel.evaluate("state.keepAfterCopy = false; window.__copied = ''")
        await panel.click("#tray-btn")
        await panel.wait_for_selector("#undo-clear", timeout=5000)
        emptied = await panel.locator(".row-card").count() == 0 and await panel.evaluate("state.basket.length") == 0
        first = await panel.evaluate("window.__copied")
        await panel.evaluate("window.__copied = ''")
        await panel.click("#copy-again"); await panel.wait_for_timeout(200)
        again_ok = await panel.evaluate("window.__copied") == first and bool(first)
        await panel.click("#undo-clear")
        await panel.wait_for_timeout(300)
        back = await panel.locator(".row-card").count()
        await panel.evaluate("state.keepAfterCopy = true")
        await copy_prompt()  # back to the state the next checks expect (just copied, list kept)
        check(before > 0 and emptied and again_ok and back == before, f"after copying the list is cleared; Copy again and Undo work ({before} → 0 → {back})")
        check(prompt.startswith("Apply the design details below, taken from other websites, to my website") and "If there is no site yet, build one from them" in prompt and "keep everything else as it is" in prompt and "not inspiration" in prompt, "one opening for both: change my site, or build it if there is none; exact; keep the rest")
        check("First look through my project" in prompt and '<design_detail id="1"' in prompt, "it tells Claude to look at my project first; details are numbered")
        check("<fit_to_my_site>" in prompt and "color settings" in prompt and "no hard seams" in prompt, "a gradient fits into my site: my color settings, readable, blending edges")
        check("<where_on_my_site>top of my homepage</where_on_my_site>" in prompt and "<task>" not in prompt and "<change_i_want>fade to white at the bottom</change_i_want>" in prompt, "where it goes and the change (no separate task line)")
        check(not any(t in prompt for t in SITE_TEXT), "no page text in the prompt")
        check(await panel.locator(".notice").count() == 1 and "Copied" in await panel.locator(".notice").inner_text(), "after copying: ‘Copied’ on the list")
        check(await panel.locator(".row-card").count() == 1, "the list stays after copying (change it and copy again)")
        await panel.screenshot(path=f"{OUT}/panel-copied.png", full_page=True)

        # ---------- 2. heading: only its animation, replaying; my list grows ----------
        await pick_el("#hero-title", keep=True)
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
        await lcard.locator(".film img").wait_for(timeout=20000)
        await site.wait_for_timeout(1600)
        await tick("Letters rise in one by one")
        await to_apply()
        check(await panel.locator(".row-card").count() == 2, "a second pick becomes a second row of the same list")
        row2 = panel.locator(".row-card").nth(1)
        mov = row2.locator(".change-head img.moving")
        srcs = set()
        for _ in range(6):
            if await mov.count():
                srcs.add((await mov.first.get_attribute("src"))[-40:])
            await panel.wait_for_timeout(150)
        check(len(srcs) >= 2, f"moving preview in the list ({len(srcs)} frames)")
        wchips = await row2.locator(".chips[aria-label='Common places'] .chip").all_text_contents()
        check("All h1 headings" in wchips and "All buttons" not in wchips, f"where chips fit the thing (a heading: headings, not buttons) ({wchips})")
        await row2.locator(".chip", has_text="All headings").last.click()
        check(await panel.locator("#tray-btn").inner_text() == "Copy prompt (2 parts)", "the button counts the parts")
        # Keyboard: ⌘/Ctrl+Enter runs the main button; the button shows the shortcut and a check after copying.
        await panel.evaluate("window.__copied = ''; state.keepAfterCopy = true")
        await panel.locator("#title").focus()
        await panel.keyboard.press("Control+Enter")
        await panel.wait_for_timeout(300)
        kbd = await panel.locator("#tray-btn").get_attribute("data-kbd")
        copied_cls = await panel.evaluate("document.getElementById('tray-btn').classList.contains('copied')")
        check(bool(await panel.evaluate("window.__copied || ''")) and kbd in ("Ctrl ↵", "⌘↵") and copied_cls, f"Ctrl/⌘+Enter copies; the button shows the shortcut ({kbd}) and a check ({copied_cls})")
        # ⋯ menu: the rarer actions
        await panel.locator(".row-more").first.click()
        items = await panel.locator(".menu .menu-item").all_text_contents()
        check(items[:2] == ["Adjust", "Copy just this"] and "Move down" in items and "Move up" not in items and "Remove" in items, f"each row's ⋯: Adjust, Copy just this, move, remove ({items})")
        await panel.keyboard.press("Escape")
        await menu(panel.locator(".row-more").nth(1), "Copy just this")
        await panel.wait_for_timeout(200)
        single = await panel.evaluate("window.__copied || ''")
        open(f"{OUT}/prompt-animation.md", "w").write(single)
        check(single.count("<design_detail") == 1 and "Keyframes: 0%" in single and "starts 40ms after the previous one" in single and "Plays once, when the page loads" in single, "Copy just this: only that part; animation values are measured facts")
        check("Give my other" not in single and "replace that movement instead of adding a second one" in single, "the animation fits my site: no double animations (and ‘All headings’ already covers the others)")
        combined = await copy_prompt()
        open(f"{OUT}/prompt-combined.md", "w").write(combined)
        check(combined.count("<design_detail") == 2 and combined.count("Apply the design details below") == 1, "Copy prompt: the whole list as one message, opening said once")
        check(combined.index("Gradient") < combined.index("Letters rise") and "Picture 1 (pasted with this message) is a filmstrip" in combined, "in list order, with numbered pictures")
        check(await panel.locator(".notice button", has_text="Copy picture").count() == 1, "after copying, the filmstrip picture can be copied too")
        await menu(panel.locator(".row-more").nth(1), "Move up")
        await panel.wait_for_timeout(300)
        titles = await panel.locator(".row-name b").all_text_contents()
        check(titles[0].startswith("Main heading"), f"a row can be moved up the list ({titles})")
        combined = await copy_prompt()
        check(combined.index("Letters rise") < combined.index("Gradient"), "the message follows the new order")
        check(await panel.locator(".row-card").nth(1).locator("details.adjust-box textarea[id^=req-]").first.input_value() == "fade to white at the bottom", "a row keeps its settings in the list")
        await panel.click("#more")
        items = await panel.locator(".menu .menu-item").all_text_contents()
        check("Clear my list" in items, f"More: Clear my list, once there is something ({items})")
        await panel.keyboard.press("Escape")

        # ---------- 3. card: group movement, hover; Fonts without Colors ----------
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
        prompt = await copy_prompt()
        check("font-family" in prompt and "choose the color" in prompt, "Fonts without Colors: the font is copied, its color is left to my site")
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
        check("when the card is :hover, the heading inside it gets" in prompt and "color:[my site's accent color, instead of its dark neutral resting text color (on the original: a vivid warm orange, lightness" in prompt and ":1 against the background behind it)]" in prompt and "before → after" in prompt, "the prompt says what changes, where, and what the picture shows (its color as a relation: accent instead of the dark resting text)")
        check("#ea580c" not in prompt and "described by how they relate to the rest of the design" in prompt and "Give my other cards" in prompt, "an animation with color: no color values, only how they relate; same hover on my other cards")

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

        # 9.3 pointer test: a cursor hovers, presses and lets go; JS hover and press effects are told apart
        url_before = site.url
        await pick_el("#jsp")
        saw_cursor = saw_press = saw_status = False
        for _ in range(60):
            st = await site.evaluate("(() => { const t = document.getElementById('__huescribe-root')?.shadowRoot?.querySelector('.tc'); return t ? [t.classList.contains('on'), t.classList.contains('down')] : [false, false]; })()")
            saw_cursor = saw_cursor or st[0]; saw_press = saw_press or st[1]
            saw_status = saw_status or await panel.locator("#pointer-status").count() > 0
            if await panel.evaluate("state.view?.pointerTest") == "done": break
            await asyncio.sleep(0.1)
        check(saw_cursor and saw_press, f"a cursor glides onto the button and presses it on the page (seen {saw_cursor}, pressed {saw_press})")
        check(saw_status, "the panel says it is testing hover and press")
        await site.wait_for_timeout(400)
        check(not await site.evaluate("document.getElementById('__huescribe-root').shadowRoot.querySelector('.tc').classList.contains('on')"), "the test cursor is gone afterwards")
        mv = await movement()
        hov = [m for m in mv if m["when"] == "On hover"]
        prs = [m for m in mv if m["when"] == "On click"]
        check(bool(hov) and bool(prs), f"its JavaScript hover and its press both show up, apart ({[(m['when'], m['title']) for m in mv]})")
        if prs:
            prompt = await use_motion(prs[0]["title"], "JavaScript press effect")
            check("while it's pressed (and plays back when released)" in prompt, "the press effect's prompt says it plays while pressed")
        await pick_el("#jsl")
        for _ in range(60):
            if await panel.evaluate("state.view?.pointerTest") == "done": break
            await asyncio.sleep(0.1)
        await site.wait_for_timeout(600)
        check(site.url == url_before, f"pressing a link in the test never navigates ({site.url})")
        lk = [m for m in await movement() if m["when"] == "On click"]
        check(bool(lk), "the link's press effect is caught too")

        # a button's own hover (CSS) plays when its card is pointed at
        for _ in range(2):  # the previous element's hover check may still be running: try once more
            await pick_el("section.grad .btn")
            bh = [c for c in await cards() if c["title"] == "Button hover"]
            if bh: break
        check(bool(bh), f"a picked button lists its hover ({[c['title'] for c in await cards()]})")

        # ---------- 3c. "Make a new picture from this" ----------
        await pick_el("#hero-title")
        await tick("Heading font")
        await to_apply()
        pc = panel.locator(".row-card").first
        await open_adjust(pc)
        await pc.locator("label", has_text="Make a new picture from this").click()
        await pc.locator("textarea[id^=req-]").fill("just the soft orange glow, on a dark background")
        prompt = await copy_prompt()
        open(f"{OUT}/prompt-picture.md", "w").write(prompt)
        check("<picture_i_want>just the soft orange glow, on a dark background</picture_i_want>" in prompt and "is the original I picked" in prompt, "picture: the person's own words + the reference picture")
        check(await panel.locator(".notice button", has_text="Copy picture too").count() == 1, "the picture is one tap away after copying")

        # ---------- 4. every kind of motion is usable ----------
        expect = {
            "#x h2": "Slide in", "#draw": "Draw in", "#track": "Grow", "#fancy": "Pop in",
            "#slider": "Slide in", "#drift": "Rise as you scroll", "#cv": "Moving drawing", ".hero-badge": "Float",
        }
        for selector, title in expect.items():
            # Moving neighbours (#drift moves as you scroll, #fancy pops) can be under the pointer at
            # the moment of the click: the pick is then honestly the neighbour. Try once more.
            for attempt in range(2):
                await pick_el(selector)
                for _ in range(25):  # the recorder's report can come in a moment after the pick
                    mv = await movement()
                    if any(m["title"] == title for m in mv): break
                    await asyncio.sleep(0.2)
                if any(m["title"] == title for m in mv): break
                print(f"   retry {selector}: picked {await panel.evaluate('state.view?.title')}")
            hit = [m for m in mv if m["title"] == title]
            check(bool(hit), f"{selector}: found ‘{title}’ ({[(m['when'], m['title']) for m in mv]}; picked: {await panel.evaluate('state.view?.title')} {await panel.evaluate('JSON.stringify(state.view?.rect || null)')})")
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
        await go_home()
        await element_mode()
        await site.keyboard.press("Escape")
        await panel.wait_for_selector("text=Start picking", timeout=5000)
        check(not await picking_on(), "Esc stops picking, panel shows ‘Start picking’")
        await go_home()
        check(not await picking_on(), "after Esc, picking stays off until you turn it back on")
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
        await panel.locator("details.section summary", has=panel.locator(".group-toggle[data-group=Motion]")).evaluate("el => { const d = el.parentElement; if (!d.open) { d.open = true; d.dispatchEvent(new Event('toggle')); } }")
        await panel.wait_for_selector("#reload-check")
        check("before Huescribe opened" in await panel.locator(".press-row", has=panel.locator("#reload-check")).inner_text(), "missed opening movement: Reload offered right there, under Motion")
        await panel.click("#reload-check")
        await panel.wait_for_selector(".item:has-text('Letters rise in one by one')", state='attached', timeout=40000)
        check(True, "reload re-picks the same thing and finds its animation")

        # ---------- 7. two details from one pick, a tweak; Colors decides whose colors ----------
        hero = await site.locator("section.grad").bounding_box()
        await site.evaluate("window.scrollTo({top: 0, behavior: 'instant'})")
        await pick_at(hero["x"] + hero["width"] - 20, hero["y"] + hero["height"] - 20)
        await tick("Heading font")
        await tick("Button hover")
        await to_apply()
        hf = panel.locator(".row-card").first
        await open_adjust(hf)
        await hf.locator(".adjust-part", has_text="Heading font").locator(".chip", has_text="Bigger").click()
        prompt = await copy_prompt()
        check(prompt.count("<design_detail") == 2 and "These values include my tweaks" in prompt, "two details from one pick + a tweak, in one row")
        check("described by how they relate to the rest of the design" in prompt and "Keep its colors exactly as given" not in prompt, "a hover's colors are relations to my site's colors")
        await pick_at(hero["x"] + hero["width"] - 20, hero["y"] + hero["height"] - 20)
        await tick("Button hover")
        await panel.locator(".group-toggle[data-group=Colors]").click()
        await to_apply()
        prompt = await copy_prompt()
        check("Keep its colors exactly as given" not in prompt and "described by how they relate to the rest of the design" in prompt, "even with Colors chosen, motion carries no color values (only relations)")

        # ---------- 7b. a prompt shaped for each AI app (the one setting, in the header) ----------
        async def copy_for(app):
            await pick_at(hero["x"] + hero["width"] - 20, hero["y"] + hero["height"] - 20)
            await tick("Heading font")
            await to_apply()
            label = await panel.evaluate(f"HuescribePrompts.APPS['{app}'].label")
            await menu("#app", label)
            await panel.wait_for_timeout(150)
            return await copy_prompt()
        p_gpt = await copy_for("chatgpt")
        check(await panel.locator("#app").inner_text() == "ChatGPT or Gemini", "the header shows the chosen app")
        check("<design_detail" not in p_gpt and "### Detail 1" in p_gpt and "**Exact values:**\n```text" in p_gpt and "**Fit it to my site:**" in p_gpt, "ChatGPT / Gemini: Markdown sections instead of tags")
        check("If I already gave you my files in this chat, use those" in p_gpt and "not my whole project" in p_gpt and "ask me once whether I have a site yet" in p_gpt and "First look through my project" not in p_gpt and "Don't round" in p_gpt, "chat apps: use files already given, else ask once (site or not; the fewest files); keep values exact")
        check(not any(t in p_gpt for t in ["<where_on_my_site>", "<fit_to_my_site>", "</"]), "no tags left in the Markdown version")
        check("### Keep one look" not in p_gpt and "Reuse my site's existing fonts" in p_gpt.split("### Detail 1")[0], "one detail: reuse my site's fonts, colors and corners is said in the opening; Keep one look only when details disagree")
        check("### When you are done" in p_gpt and "never describe one you didn't make" in p_gpt and "old → new" in p_gpt and "complete updated file" in p_gpt, "the prompt ends by asking for real changes, listed old → new, and the full file from chat apps")
        p_b = await copy_for("builder")
        check(p_b.startswith("Apply the design details below to my website") and len(p_b.split("### Detail 1")[0]) < 400, f"site builders: a short opening ({len(p_b.split('### Detail 1')[0])} chars)")
        p_e = await copy_for("editor")
        check("Find where each part lives in this project" in p_e, "code editors: find the part in the project, reuse its components")
        p_c = await copy_for("claude-code")
        check("<design_detail" in p_c and "First look through my project" in p_c, "Claude Code (default): tags, and it looks through the project itself")
        check(await panel.evaluate("(async () => (await chrome.storage.local.get('site')).site.app)()") == "claude-code", "the choice is remembered")

        # ---------- 8. a whole section: its scroll behavior ----------
        await site.evaluate("document.getElementById('late-wrap').scrollIntoView({block:'start', behavior:'instant'})")
        await site.wait_for_timeout(300)
        await section_pick("#late-wrap", scroll=False)
        sc = await panel.locator(".part-chips .chip.toggle").all_text_contents()
        check(sc == ["Colors", "Fonts", "Layout", "Motion"], f"a section that reacts to scrolling also offers Motion ({sc})")
        await chips("scroll")
        await panel.click("#tray-btn")
        await panel.wait_for_selector(".row-card", timeout=40000)
        check((await panel.locator(".row-card .row-name small").first.inner_text()) == "Motion", "the row says it copies its Motion")
        prompt = await copy_prompt()
        open(f"{OUT}/prompt-portion-scroll.md", "w").write(prompt)
        check("Scroll behavior" in prompt and "fades in and moves up 30px into place when you scroll to it" in prompt, "a section's scroll behavior: what comes in as you scroll, and how")
        check("shows the page at points while scrolling through it" in prompt, "a section's scroll behavior comes with a preview (frames while scrolling)")
        check("Colors:" not in prompt and "Format:" not in prompt, "only the parts that were chosen")
        check(await site.evaluate("scrollY") > 3000, "the page is put back after reading the scroll behavior")

        # ---------- 9. closing the panel switches Huescribe off completely ----------
        await panel.close()
        await site.wait_for_timeout(800)
        check(await site.evaluate(f"!{ROOT}"), "closing the panel removes everything from the page")
        check(await site.evaluate("window.__plRec ? window.__plRec.active : false") is False, "the recorder stops when the panel closes")
        await site.reload()
        await site.wait_for_timeout(800)
        check(await site.evaluate("typeof window.__plRec") == "undefined", "after closing, nothing of Huescribe loads on pages anymore")

        # ---------- 9b. the link to the background drops (the worker fell asleep), then the panel closes ----------
        await open_panel()
        for _ in range(60):
            if await picking_on(): break
            await asyncio.sleep(0.1)
        await sw.evaluate("for (const p of [...panelPorts]) p.disconnect(); panelPorts.clear()")
        for _ in range(30):
            if await sw.evaluate("panelPorts.size") == 1: break
            await asyncio.sleep(0.1)
        check(await sw.evaluate("panelPorts.size") == 1, "a dropped link to the background is made again by the panel")
        await panel.close()
        await site.wait_for_timeout(800)
        check(await site.evaluate(f"!{ROOT}"), "closing the panel after the link dropped still removes everything from the page")
        # 9c. the background never hears about the close: the page notices by itself and cleans up.
        await sw.evaluate(f"chrome.scripting.executeScript({{ target: {{ tabId: {tab_id} }}, files: ['motion.js', 'analyzer.js', 'prompts.js', 'picker.js'] }}).then(() => chrome.scripting.executeScript({{ target: {{ tabId: {tab_id} }}, func: () => globalThis.__plUI?.startPicking() }}))")
        await site.wait_for_timeout(500)
        left = await picking_on()
        gone = False
        for _ in range(60):
            if await site.evaluate(f"!{ROOT}"): gone = True; break
            await asyncio.sleep(0.1)
        check(left and gone, f"with no panel open, a leftover highlight removes itself within seconds (was on: {left})")

        # ---------- 10. popup mode: picking survives the popup closing ----------
        await site.bring_to_front()
        waiter = asyncio.ensure_future(ctx.wait_for_event("page"))
        await sw.evaluate(f"chrome.windows.create({{url: 'panel.html?tabId={tab_id}&mode=popup', type: 'popup', width: 400, height: 900}})")
        pop = await waiter
        await pop.wait_for_selector("#pick-btn")
        check(await pop.locator(".row-card").count() >= 1, "the list is still there in the popup")
        closed = asyncio.ensure_future(pop.wait_for_event("close"))
        await pop.click("#pick-btn")
        await asyncio.wait_for(closed, 5)
        await site.wait_for_timeout(600)
        check(await picking_on(), "popup closes to let you click the page, and picking stays on")
        await site.evaluate("window.scrollTo({top: 0, behavior: 'instant'})")
        b = await site.locator("#hero-title").bounding_box()
        await site.mouse.move(b["x"] + 30, b["y"] + b["height"] / 2)
        await site.wait_for_timeout(150)
        await site.mouse.down(); await site.mouse.up()
        await site.wait_for_timeout(2500)
        await open_panel(mode="popup")
        await panel.wait_for_selector("#title:has-text('What do you want from it?')", timeout=8000)
        check(True, "reopening the popup shows what you picked")
        await panel.close()
        await site.evaluate(f"{ROOT}?.remove(); window.__plUI = null")

        # ---------- 11. dark page with gradients: three sections in one list ----------
        await site.goto(SITE + "rich.html")
        await site.wait_for_timeout(800)
        await open_panel()
        await menu("#more", "Reload the page")
        await site.wait_for_load_state("load")
        await site.wait_for_timeout(1200)
        await fresh()
        await go_home()
        await site.evaluate("window.scrollTo({top: 0, behavior: 'instant'})")
        hb = await site.locator(".hero h1").bounding_box()
        await site.mouse.move(hb["x"] + hb["width"] / 2, hb["y"] + 10)
        await site.wait_for_timeout(200)
        for _ in range(12):
            lab = await site.evaluate(f"{ROOT}.shadowRoot.querySelector('.hl em')?.textContent || ''")
            if lab.startswith("Section:"): break
            await site.keyboard.press("ArrowUp")
            await site.wait_for_timeout(150)
        hlw = await site.evaluate(f"{ROOT}.shadowRoot.querySelector('.hl').getBoundingClientRect().width")
        secw = await site.evaluate("document.querySelector('.hero').getBoundingClientRect().width")
        check(lab.startswith("Section: Hero") and abs(hlw - secw) < 12, f"↑ goes up to the whole section, named as a section ({lab}; {round(hlw)} vs {round(secw)})")
        names = []
        scroll_offered = []
        for sel in ["header", ".hero h1", ".card p"]:
            await section_pick(sel, keep=True)
            names.append(await panel.locator(".pick-name").inner_text())
            scroll_offered.append(await panel.locator(".chip.toggle[data-part=scroll]").count())
            # Every choice on (there's no "Everything" chip any more).
            for c in await panel.locator(".part-chips .chip.toggle").all():
                if await c.get_attribute("aria-pressed") != "true": await c.click()
            await panel.click("#tray-btn")
            await panel.wait_for_selector(f"#title:has-text('{HOME}')", timeout=40000)
            await panel.wait_for_timeout(300)
        check(len(names) == 3 and "Navigation" in names[0] and "Hero" in names[1] and "cards section (3 cards)" in names[2], f"sections named by what they are ({names})")
        check(scroll_offered == [1, 0, 0], f"Motion (scroll behavior) is offered only where something reacts to scrolling (sticky nav: yes; hero, cards: no) ({scroll_offered})")
        rows = panel.locator(".row-card")
        check(await rows.count() == 3, "three sections, three rows in one list")
        check(await panel.locator(".row-card textarea[id^=content-]").count() == 3, "each section asks what it should show")
        await rows.nth(2).locator("input[id^=where-]").fill("my features section")
        await rows.nth(2).locator("textarea[id^=content-]").fill("my 3 best sellers: sourdough, croissants, rye")
        await panel.screenshot(path=f"{OUT}/panel-sections.png", full_page=True)
        prompt = await copy_prompt()
        open(f"{OUT}/prompt-sections.md", "w").write(prompt)
        check("How much of the area each fill covers" in prompt and "(the background)" in prompt and "Add no gradients, glows, patterns or colors that aren't listed" in prompt, "colors come with how much of the area each covers, and no unlisted gradients")
        check("Add no other families, weights or sizes" in prompt and "set the colors and fonts of the whole site" in prompt, "fonts: only the listed families and roles, site-wide on a new site")
        check(prompt.count("<design_detail") == 3 and "Color scheme, font scheme and format of one section of the page (cards section (3 cards))" in prompt, "each block says what it holds")
        check("Font scheme:\nFamilies (1):" in prompt and "- Main heading (h1): system-ui 64px, weight 700" in prompt and "Scale against the body text" in prompt and "strong contrast" in prompt, "each section's font scheme: families, every role, and how they relate")
        check("Fonts: put each role on my matching text in that place" in prompt and "is a system font: there is nothing to load" in prompt and "on phones scale every size down together" in prompt, "the font scheme fits my site: which text gets which font, loading, keep the ratios")
        check("radial-gradient(circle, #7c3aed 0%, transparent 70%)" in prompt and "main headline: gradient text linear-gradient(90deg, #ffffff, #c4b5fd)" in prompt and "sign-up call to action: #7c3aed, text #ffffff" in prompt, "hero colors: gradients, gradient headline, button")
        check("Cards and panels:" in prompt and "#db2777" in prompt and "In short: section title → 3 cards in a row" in prompt and "grid, 3 equal columns" in prompt, "cards section: colors and format")
        check("menu link ×5: page links, 1 word each" in prompt and "sticky at the top" in prompt and "positions: left, middle, right" in prompt, "navigation bar section: links by purpose, sticky, where things sit")
        check("Scroll behavior" in prompt and "stays in the same place on screen while you scroll" in prompt and True, "the sticky navigation's scroll behavior is measured (offered → found)")
        check("<content_i_want>my 3 best sellers: sourdough, croissants, rye</content_i_want>" in prompt and "Fill it with what <content_i_want> says" in prompt, "what a part should show goes into the prompt and fills it")
        check("Color relationships (keep these even in other colors):" in prompt and "much darker than the page's usual background" not in prompt.split("Navigation bar")[0] and "Cards are a bit lighter than the background behind them" in prompt and '"Color relationships" in my colors' in prompt, "formats say how the colors relate (cards a bit lighter than their dark section) and to keep that in my colors")
        sp = prompt.split("<shared_spacing>\n")[1].split("</shared_spacing>")[0] if "<shared_spacing>\n" in prompt else ""
        check("Side padding: 40px" in sp and "Content width: at most 1120px" in sp and "Space at the top and bottom of each section: 96px" in sp and "title → text 24px" in sp and "Between cards or items side by side: 24px" in sp, f"several formats share one spacing system ({sp.strip()[:300]})")
        check("If the rest of my page already uses one consistent spacing" in sp, "changing a site: the new parts line up with the old ones")
        done = prompt.split("<when_done>\n")[1] if "<when_done>\n" in prompt else ""
        check("changing only sizes is not enough" in done and "complete updated file" not in done and prompt.rstrip().endswith("</when_done>"), "formats: the AI must check the layout against the outline (Claude Code edits files itself, so no full file)")
        cards_d = [d for d in prompt.split("<design_detail")[1:] if "cards section (3 cards)" in d.split("</what>")[0]]
        fmt = cards_d[0].split("Format:\n")[1].split("\nColors:\n")[0] if cards_d and "Format:\n" in cards_d[0] else ""
        check("Position on the page" in fmt and "Directly above it: Hero (first section)" in fmt and "Width: edge to edge" in fmt and 'Keep its place (see "Position on the page")' in prompt, "a format says where it sits: what is above and below it, how wide")
        import re as _re
        check(fmt and not _re.search(r"#[0-9a-f]{3,6}\b|rgba?\(", fmt) and "system-ui" not in fmt and "weight" not in fmt and "text size 40px" in fmt, f"a format copies the layout only: no colors or fonts in it ({_re.findall(r'#[0-9a-f]{3,6}|system-ui|weight', fmt)[:5]})")
        check("Reuse my site's existing fonts, colors, corner sizes" in prompt.split("<design_detail")[0], "the opening says to reuse my site's fonts, colors, corners and spacing")
        check("What goes in it" in prompt and "main headline, about 5 words: what I offer, said in one line" in prompt and "3× card title" in prompt, "a format says what information goes in each part")
        check("Take the content from my site" in prompt and "Don't invent facts" in prompt, "content comes from my site, nothing invented")
        check(prompt.count("Blend its edges into the sections above and below") == 1 and "For every detail below where it applies:" in prompt, "general lines (blend with neighbors, content from my site) are said once for all sections")
        site_words = ["Nova", "Product", "Pricing", "Ship products", "Everything you need", "Get started", "Sign in", "Roadmaps"]
        check(not any(w in prompt for w in site_words), f"none of the site's own words are copied ({[w for w in site_words if w in prompt]})")


        # ---------- 11b. your own areas: across two sections, or part of one ----------
        await fresh()
        await go_home()
        await site.evaluate("window.scrollTo({top: 0, behavior: 'instant'})")
        await site.wait_for_timeout(300)
        hero_b = await site.locator(".hero").bounding_box()
        await drag(30, 5, 1250, min(790, hero_b["y"] + hero_b["height"] * 0.7))
        name = await panel.locator(".pick-name").inner_text()
        check(name.startswith("Sections together") and "Navigation" in name and "Hero" in name, f"dragging across two sections chooses them together ({name!r})")
        check(await site.evaluate(f"{ROOT}.shadowRoot.querySelectorAll('.sel').length") == 1, "one outline around both")
        # The outline costs nothing while the page sits still, and follows the page when it scrolls.
        writes = await site.evaluate(f"""new Promise((done) => {{ const n = {ROOT}.shadowRoot.querySelector('.sel'); let k = 0; const mo = new MutationObserver((m) => {{ k += m.length; }}); mo.observe(n, {{ attributes: true, attributeFilter: ['style'] }}); setTimeout(() => {{ mo.disconnect(); done(k); }}, 600); }})""")
        check(writes == 0, f"an outline on a still page isn't rewritten every frame ({writes} style writes in 0.6s)")
        y0 = await site.evaluate(f"{ROOT}.shadowRoot.querySelector('.sel').getBoundingClientRect().top")
        await site.evaluate("window.scrollBy(0, 120)")
        await site.wait_for_timeout(150)
        y1 = await site.evaluate(f"{ROOT}.shadowRoot.querySelector('.sel').getBoundingClientRect().top")
        check(abs((y0 - y1) - min(120, await site.evaluate('scrollY'))) < 2, f"the outline moves with the page when it scrolls ({round(y0)} → {round(y1)})")
        await site.evaluate("window.scrollTo({top: 0, behavior: 'instant'})")
        await site.wait_for_timeout(150)
        check(await panel.locator("#as-element").count() == 0, "a dragged group has no 'single parts' (it is several things)")
        await chips("fonts", "format")
        await panel.click("#tray-btn")
        await panel.wait_for_selector(".row-card", timeout=40000)
        await site.evaluate("document.querySelector('.card').scrollIntoView({block:'center', behavior:'instant'})")
        await site.wait_for_timeout(300)
        c1 = await site.locator(".card").nth(0).bounding_box(); c2 = await site.locator(".card").nth(1).bounding_box()
        await drag(c1["x"] - 8, c1["y"] - 8, c2["x"] + c2["width"] + 8, c2["y"] + c2["height"] + 8)
        name2 = await panel.locator(".pick-name").inner_text()
        check(name2.startswith("Part of") and "2 pieces" in name2, f"dragging over two of three cards chooses just those ({name2!r})")
        await chips("fonts", "format")
        await panel.click("#tray-btn")
        await panel.wait_for_selector(".row-card >> nth=1", timeout=40000)
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
        await go_home()
        await section_pick(".hero h1")
        name = await panel.locator(".pick-name").inner_text()
        check("Hero" in name, f"the hero is its own section, not the whole page ({name})")
        await go_home()

        # ---------- robustness ----------
        await site.goto(SITE + "empty.html")
        await open_panel()
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
        n_before = await panel.evaluate("state.basket.length")
        old_panel = panel
        waiter = asyncio.ensure_future(ctx.wait_for_event("page"))
        closed = asyncio.ensure_future(old_panel.wait_for_event("close"))
        await panel.locator(".menu .menu-item", has_text="Open in its own window").click()
        win = await asyncio.wait_for(waiter, 10)
        await win.wait_for_selector(f"#title:has-text('{HOME}')", timeout=10000)
        await asyncio.wait_for(closed, 10)
        check("mode=window" in win.url and old_panel.is_closed(), "it opens as its own window (movable) and the side panel closes")
        check(await site.evaluate("!!window.__plRec && window.__plRec.active"), "Huescribe stays on while switching (the recorder keeps running)")
        await win.wait_for_timeout(500)
        check(await win.evaluate("state.basket.length") == n_before, "the list comes along to the window")
        for _ in range(40):
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
