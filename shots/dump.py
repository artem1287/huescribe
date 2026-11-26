"""Take real screenshots of PromptLift in use, for the homepage 'how it works' cards."""
import asyncio, os, tempfile
from playwright.async_api import async_playwright
EXT = "/home/claude/promptlift"; SITE = "http://127.0.0.1:8001/"; OUT = "/home/claude/shots"
ROOT = "document.getElementById('__promptlift-root')"

async def main():
    async with async_playwright() as p:
        ctx = await p.chromium.launch_persistent_context(tempfile.mkdtemp(), executable_path="/usr/bin/google-chrome", headless=True,
            args=["--headless=new", f"--disable-extensions-except={EXT}", f"--load-extension={EXT}", "--no-sandbox"],
            viewport={"width": 1280, "height": 860}, device_scale_factor=2)
        sw = ctx.service_workers[0] if ctx.service_workers else await ctx.wait_for_event("serviceworker")
        site = ctx.pages[0] if ctx.pages else await ctx.new_page()
        await site.goto(SITE); await site.wait_for_load_state("networkidle"); await site.wait_for_timeout(800)
        tab = await sw.evaluate(f"(async()=> (await chrome.tabs.query({{url:'{SITE}*'}}))[0].id)()")
        w = asyncio.ensure_future(ctx.wait_for_event("page"))
        await sw.evaluate(f"chrome.windows.create({{url:'panel.html?tabId={tab}', type:'popup', width:400, height:900}})")
        panel = await w
        await panel.set_viewport_size({"width": 380, "height": 720})
        await panel.wait_for_selector("#title:has-text('My list')")
        await panel.evaluate("(() => { navigator.clipboard.writeText = (t) => { window.__copied = t; return Promise.resolve(); }; })()")
        await panel.evaluate("state.basket = []; saveBasket()")
        await site.bring_to_front()
        if await panel.locator("#pick-btn").count(): await panel.click("#pick-btn")
        for _ in range(40):
            if await site.evaluate(f"!!{ROOT}?.shadowRoot.querySelector('.t.picking')"): break
            await asyncio.sleep(0.1)
        # 1) Picking: hover a part on the page, outline + bar visible.
        await site.evaluate("document.querySelector('#f').scrollIntoView({block:'start'})"); await site.wait_for_timeout(400)
        b = await site.locator("#f h2").bounding_box()
        await site.mouse.move(b["x"] + 6, b["y"] + b["height"]/2); await site.wait_for_timeout(300)
        for _ in range(8):
            lab = await site.evaluate(f"{ROOT}.shadowRoot.querySelector('.hl em')?.textContent || ''")
            if lab.startswith("Section:"): break
            await site.keyboard.press("ArrowUp"); await site.wait_for_timeout(150)
        await site.wait_for_timeout(300)
        await site.screenshot(path=f"{OUT}/1-pick.png")
        # Click the outlined section: the panel shows the section's choices.
        await site.mouse.down(); await site.mouse.up()
        await panel.wait_for_selector("#title:has-text('Pick what to copy')", timeout=20000)
        for _ in range(150):
            if await panel.evaluate("state.screen === 'secpick' && state.view?.scrollHint !== null"): break
            await asyncio.sleep(0.1)
        for k in ("colors", "format"):
            c = panel.locator(f".part-chips .chip.toggle[data-part={k}]")
            if await c.count() and await c.get_attribute("aria-pressed") != "true":
                await c.click(); await panel.wait_for_timeout(400)
        print(await panel.locator(".part-chips .chip.toggle").evaluate_all("es=>es.map(e=>e.dataset.part+':'+e.getAttribute('aria-pressed'))"))
        await panel.wait_for_timeout(600)
        await panel.screenshot(path=f"{OUT}/2-choose.png")
        await panel.click("#tray-btn")
        await panel.wait_for_selector(".row-card", timeout=40000); await panel.wait_for_timeout(500)
        await panel.screenshot(path=f"{OUT}/3-list.png")
        await panel.click("#tray-btn"); await panel.wait_for_timeout(700)
        open(OUT + "/prompt_section.txt", "w").write(await panel.evaluate("window.__copied || ''"))
        await panel.screenshot(path=f"{OUT}/4-copied.png")
        await ctx.close()
asyncio.run(main())
