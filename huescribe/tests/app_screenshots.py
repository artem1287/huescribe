"""Screenshots of every part of Huescribe: the web page and the side panel side by side, as in Chrome.

Uses the made-up demo site in /home/claude/demo-site (served on :8003, shown as http://fieldnote.app/).
Writes PNGs to /home/claude/app-screens. Each step is independent: a failure is reported and the run goes on.
"""
import asyncio
import os
import subprocess
import sys
import tempfile
import traceback

from PIL import Image
from playwright.async_api import async_playwright

EXT = "/home/claude/huescribe"
OUT = "/home/claude/app-screens"
SITE = "http://fieldnote.app/"
ROOT = "document.getElementById('__huescribe-root')"
HOME = "My list"
PANEL_W, H = 380, 860

os.makedirs(OUT, exist_ok=True)
subprocess.run("curl -s -o /dev/null http://127.0.0.1:8003/ || (cd /home/claude/demo-site && setsid nohup python3 -m http.server 8003 >/tmp/demo-site.log 2>&1 &); sleep 1", shell=True)


def compose(name, site_png, panel_png):
    """Page on the left, panel on the right, a 1px divider between, like Chrome's side panel."""
    a, b = Image.open(site_png).convert("RGB"), Image.open(panel_png).convert("RGB")
    b = b.resize((round(b.width * a.height / b.height), a.height))
    out = Image.new("RGB", (a.width + 2 + b.width, a.height), (214, 211, 203))
    out.paste(a, (0, 0)); out.paste(b, (a.width + 2, 0))
    out.save(f"{OUT}/{name}.png")
    print("saved", name)


async def main():
    async with async_playwright() as p:
        ctx = await p.chromium.launch_persistent_context(
            tempfile.mkdtemp(), executable_path="/usr/bin/google-chrome", headless=True,
            args=["--headless=new", f"--disable-extensions-except={EXT}", f"--load-extension={EXT}", "--no-sandbox",
                  "--host-resolver-rules=MAP fieldnote.app:80 127.0.0.1:8003"],
            viewport={"width": 1280, "height": H}, device_scale_factor=2)
        sw = ctx.service_workers[0] if ctx.service_workers else await ctx.wait_for_event("serviceworker")
        site = ctx.pages[0] if ctx.pages else await ctx.new_page()
        await site.goto(SITE); await site.wait_for_load_state("networkidle"); await site.wait_for_timeout(800)
        tab = await sw.evaluate(f"(async()=> (await chrome.tabs.query({{url:'{SITE}*'}}))[0].id)()")
        w = asyncio.ensure_future(ctx.wait_for_event("page"))
        await sw.evaluate(f"chrome.windows.create({{url:'panel.html?tabId={tab}', type:'popup', width:{PANEL_W + 20}, height:{H + 40}}})")
        panel = await w
        await panel.set_viewport_size({"width": PANEL_W, "height": H})
        await panel.wait_for_selector(f"#title:has-text('{HOME}')")
        await panel.evaluate("state.basket = []; saveBasket()")
        await panel.evaluate("(() => { const w = navigator.clipboard.writeText.bind(navigator.clipboard); navigator.clipboard.writeText = (t) => w(t).catch(() => {}); })()")
        await site.bring_to_front()

        async def shot(name):
            await site.screenshot(path="/tmp/s-site.png")
            await panel.screenshot(path="/tmp/s-panel.png")
            compose(name, "/tmp/s-site.png", "/tmp/s-panel.png")

        async def picking_on():
            return await site.evaluate(f"!!{ROOT}?.shadowRoot.querySelector('.t.picking')")

        async def ensure_picking():
            if not await picking_on() and await panel.locator("#pick-btn").count():
                await panel.click("#pick-btn")
            for _ in range(50):
                if await picking_on(): break
                await asyncio.sleep(0.1)

        async def go_home():
            await panel.evaluate(f"state.history = []; state.view = null; go('home', false)")
            await panel.wait_for_selector(f"#title:has-text('{HOME}')")

        async def label():
            return await site.evaluate(f"{ROOT}.shadowRoot.querySelector('.hl em')?.textContent || ''")

        async def step(name, fn):
            try:
                await fn()
            except Exception:
                print("FAILED", name); traceback.print_exc(limit=2)

        # 1. First open: empty list, picking on, the hint bar on the page.
        async def s1():
            await ensure_picking(); await site.mouse.move(640, 30); await site.mouse.move(-20, -20); await site.wait_for_timeout(600)
            await shot("01-start-empty-list")
        await step("01", s1)

        # 2. Hovering a button: the outline with its name and size.
        async def s2():
            b = await site.locator(".hero .btn-main").bounding_box()
            await site.mouse.move(b["x"] + 30, b["y"] + b["height"] / 2); await site.wait_for_timeout(700)
            await shot("02-hover-outline")
        await step("02", s2)

        # 3. ↑ grows the outline to the whole pricing section.
        async def s3():
            await site.evaluate("document.querySelector('#pricing .plans').scrollIntoView({block:'center'})"); await site.wait_for_timeout(500)
            b = await site.locator("#pricing .plan h3").first.bounding_box()
            await site.mouse.move(b["x"] + 10, b["y"] + 8); await site.wait_for_timeout(300)
            for _ in range(10):
                if (await label()).startswith("Section:"): break
                await site.keyboard.press("ArrowUp"); await site.wait_for_timeout(200)
            await site.wait_for_timeout(500)
            await shot("03-whole-section-outline")
        await step("03", s3)

        # 4-5. Click the section: the panel asks what to take from it.
        async def s4():
            await site.mouse.down(); await site.mouse.up()
            await panel.wait_for_selector("#title:has-text('What do you want from it?')", timeout=20000)
            for _ in range(150):
                if await panel.evaluate("state.screen === 'secpick' && state.view?.scrollHint !== null"): break
                await asyncio.sleep(0.1)
            for k in ("colors", "format"):
                c = panel.locator(f".part-chips .chip.toggle[data-part={k}]")
                if await c.count() and await c.get_attribute("aria-pressed") != "true":
                    await c.click(); await panel.wait_for_timeout(300)
            await panel.wait_for_timeout(600)
            await shot("04-section-choices")
            await panel.click("#tray-btn")
            await panel.wait_for_selector(".row-card", timeout=40000); await panel.wait_for_timeout(600)
        await step("04", s4)

        # 6. Drag over an area (features), mid-drag.
        async def s6():
            await ensure_picking()
            await site.evaluate("document.querySelector('#features').scrollIntoView({block:'start'})"); await site.wait_for_timeout(500)
            a = await site.locator("#features .feat").nth(0).bounding_box(); z = await site.locator("#features .feat").nth(1).bounding_box()
            x0, y0, x1, y1 = a["x"] - 12, a["y"] - 12, z["x"] + z["width"] + 12, z["y"] + z["height"] + 12
            await site.mouse.move(x0, y0); await site.mouse.down()
            for i in range(1, 11):
                await site.mouse.move(x0 + (x1 - x0) * i / 10, y0 + (y1 - y0) * i / 10); await asyncio.sleep(0.03)
            await site.wait_for_timeout(300)
            await shot("05-drag-an-area")
            await site.mouse.up()
            for _ in range(150):
                if await panel.evaluate("state.screen === 'secpick' && state.view?.scrollHint !== null"): break
                await asyncio.sleep(0.1)
            await panel.wait_for_timeout(500)
            await shot("06-area-choices")
            await go_home()
        await step("06", s6)

        # 7-8. Click a single button: hover-and-press test, then the four groups with Motion open.
        async def s7():
            await ensure_picking()
            await site.evaluate("window.scrollTo(0,0)"); await site.wait_for_timeout(500)
            b = await site.locator(".hero .btn-main").bounding_box()
            await site.mouse.move(b["x"] + 30, b["y"] + b["height"] / 2); await site.wait_for_timeout(300)
            await site.mouse.down(); await site.mouse.up()
            for _ in range(60):
                if await panel.locator("text=Testing hover and press").count(): break
                await asyncio.sleep(0.1)
            await site.wait_for_timeout(500)
            await shot("07-testing-hover-and-press")
            for _ in range(250):
                if await panel.evaluate("state.screen === 'pick' && !!state.view?.pickId && state.view.movement !== 'loading'"): break
                await asyncio.sleep(0.1)
            for _ in range(150):
                if not await panel.locator("text=Testing hover and press").count(): break
                await asyncio.sleep(0.1)
            await panel.locator(".group-toggle[data-group=Motion]").first.click()
            await panel.wait_for_timeout(1500)
            await shot("08-element-choices-motion")
            await panel.evaluate("document.scrollingElement.scrollTo(0, 0)")
            await panel.click("#tray-btn")
            await panel.wait_for_selector(f"#title:has-text('{HOME}')", timeout=40000); await panel.wait_for_timeout(800)
        await step("07", s7)

        # 9. My list with two parts; a "where on my site" chip chosen.
        async def s9():
            chip = panel.locator(".row-card .chip", has_text="Middle of homepage").first
            if await chip.count(): await chip.click(); await panel.wait_for_timeout(400)
            await panel.evaluate("document.scrollingElement.scrollTo(0, 0)")
            await site.mouse.move(640, 30); await site.mouse.move(-20, -20); await site.wait_for_timeout(400)
            await shot("09-my-list")
        await step("09", s9)

        # 10. A row's ⋯ menu.
        async def s10():
            await panel.locator(".row-more").first.click(); await panel.wait_for_timeout(500)
            await shot("10-row-menu")
        await step("10", s10)

        # 11. Adjust.
        async def s11():
            await panel.locator(".menu .menu-item", has_text="Adjust").first.click(); await panel.wait_for_timeout(800)
            await shot("11-adjust")
            await panel.keyboard.press("Escape"); await panel.wait_for_timeout(300)
        await step("11", s11)

        # 12. Which AI app the prompt is for.
        async def s12():
            await go_home(); await panel.click("#app"); await panel.wait_for_timeout(500)
            await shot("12-choose-ai-app")
            await panel.keyboard.press("Escape"); await panel.wait_for_timeout(300)
        await step("12", s12)

        # 13. The ⋯ menu.
        async def s13():
            await panel.click("#more"); await panel.wait_for_timeout(500)
            await shot("13-more-menu")
            await panel.keyboard.press("Escape"); await panel.wait_for_timeout(300)
        await step("13", s13)

        # 14. My instructions.
        async def s14():
            await panel.evaluate("(() => { const d = document.getElementById('custom'); d.open = true; d.dispatchEvent(new Event('toggle')); d.scrollIntoView({block:'center'}); })()")
            await panel.fill("#custom-prompt", "Use Tailwind classes. Keep my logo and my wording.")
            await panel.wait_for_timeout(600)
            await shot("14-my-instructions")
        await step("14", s14)

        # 15. Copied.
        async def s15():
            await panel.evaluate("document.scrollingElement.scrollTo(0, 0)")
            await panel.click("#tray-btn"); await panel.wait_for_timeout(1200)
            await shot("15-prompt-copied")
        await step("15", s15)

        # 16. Picking stopped (Esc).
        async def s16():
            await site.bring_to_front(); await site.keyboard.press("Escape"); await panel.wait_for_timeout(700)
            await shot("16-picking-stopped")
        await step("16", s16)

        # 17. Dark mode, with the list back (Undo).
        async def s17():
            undo = panel.locator("button", has_text="Undo")
            if await undo.count(): await undo.first.click(); await panel.wait_for_timeout(600)
            await panel.emulate_media(color_scheme="dark"); await panel.wait_for_timeout(600)
            await panel.evaluate("document.scrollingElement.scrollTo(0, 0)")
            await shot("17-dark-mode")
        await step("17", s17)

        await ctx.close()

asyncio.run(main())
