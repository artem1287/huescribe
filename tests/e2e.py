"""End-to-end test: load PromptLift unpacked in Chrome for Testing and exercise every flow."""
import asyncio, json, sys, tempfile
from playwright.async_api import async_playwright

EXT = "/home/claude/promptlift"
OUT = "/home/claude/out"
SITE = "http://127.0.0.1:8001/"
fails = []

def check(cond, msg):
    print(("PASS " if cond else "FAIL ") + msg)
    if not cond: fails.append(msg)

async def main():
    async with async_playwright() as p:
        ctx = await p.chromium.launch_persistent_context(
            tempfile.mkdtemp(), executable_path="/usr/bin/google-chrome", headless=True,
            args=["--headless=new", f"--disable-extensions-except={EXT}", f"--load-extension={EXT}", "--no-sandbox"],
            viewport={"width": 1280, "height": 900})
        sw = ctx.service_workers[0] if ctx.service_workers else await ctx.wait_for_event("serviceworker")
        ext_id = sw.url.split("/")[2]
        logs = []
        site = await ctx.new_page()
        site.on("console", lambda m: logs.append(f"[site] {m.type}: {m.text}"))
        await site.goto(SITE); await site.wait_for_load_state("networkidle")

        popup = await ctx.new_page()
        popup.on("console", lambda m: logs.append(f"[popup] {m.type}: {m.text}"))
        popup.on("pageerror", lambda e: logs.append(f"[popup] pageerror {e}"))
        await popup.goto(f"chrome-extension://{ext_id}/popup.html")
        tab_id = await popup.evaluate(f"(async()=> (await chrome.tabs.query({{url:'{SITE}'}}))[0].id)()")
        async def open_popup(tid, scheme="light"):
            await popup.emulate_media(color_scheme=scheme)
            await popup.set_viewport_size({"width": 380, "height": 600})
            await popup.goto(f"chrome-extension://{ext_id}/popup.html?tabId={tid}")
            await popup.wait_for_selector("#cats .cat")
        await open_popup(tab_id)
        check((await popup.text_content("#host")) == "127.0.0.1:8001", "popup shows host")
        await popup.screenshot(path=f"{OUT}/popup-home.png", full_page=True)

        expect = {
            "fonts": ["Satoshi", "Fraunces", "Google Fonts", "h1:", "64px", "free alternative"],
            "colors": ["#ea580c", "--primary", "Dark theme tokens", "#fb923c", "linear-gradient"],
            "animations": ["@keyframes float", "fadeUp", "cubic-bezier(0.16, 1, 0.3, 1)", ".btn:hover", "smooth scrolling", "prefers-reduced-motion: yes"],
            "layout": ["max-width 1120px", "min-width: 768px", "position sticky", "Features", "3 columns"],
            "shape": ["999px", "14px", "box-shadow" if False else "rgba(0, 0, 0, 0.04)", "blur(12px)"],
            "components": ["Start free trial", ".btn:hover", "input:focus", "repeated 3", "markup skeleton"],
            "all": ["## Fonts & typography", "## Colors", "## Animations & motion", "## Layout & format", "## Components"],
        }
        for cat, needles in expect.items():
            await popup.click(f'.cat[data-cat="{cat}"]')
            await popup.wait_for_selector("#view-result:not([hidden])", timeout=20000)
            out = await popup.input_value("#output")
            open(f"{OUT}/prompt-{cat}.md", "w").write(out)
            missing = [n for n in needles if n not in out]
            check(not missing, f"{cat}: prompt has {needles} (missing {missing}) [{len(out)} chars]")
            if cat == "animations": await popup.screenshot(path=f"{OUT}/popup-result.png", full_page=True)
            await popup.click("#back")

        # copy button
        await popup.click('.cat[data-cat="colors"]'); await popup.wait_for_selector("#view-result:not([hidden])")
        await popup.click("#copy"); await popup.wait_for_timeout(200)
        check("Copied" in (await popup.text_content("#copy")), "copy button confirms")
        clip = await popup.evaluate("navigator.clipboard.readText().catch(e => 'ERR ' + e)")
        check(clip.startswith("I want my website"), f"clipboard holds prompt ({clip[:40]})")
        await popup.click("#back")

        # free-text request routing
        await popup.fill("#request", "copy the hover effect on the buttons")
        await popup.press("#request", "Enter")
        await popup.wait_for_selector("#view-result:not([hidden])")
        out = await popup.input_value("#output")
        check(out.startswith("My request: copy the hover effect") and "## Animations & motion" in out and "## Components" in out and "## Colors" not in out,
              "custom request routes to animations+components only")
        await popup.click("#back")

        # dark mode screenshot
        await open_popup(tab_id, "dark"); await popup.screenshot(path=f"{OUT}/popup-dark.png", full_page=True)
        # narrow width (320px)
        await popup.set_viewport_size({"width": 320, "height": 600})
        sw_ = await popup.evaluate("document.documentElement.scrollWidth")
        check(sw_ <= 320, f"no horizontal overflow at 320px (scrollWidth={sw_})")

        # element picker
        await site.bring_to_front()
        res = await popup.evaluate(f"chrome.runtime.sendMessage({{type:'promptlift:startPicker', tabId:{tab_id}, request:''}})")
        check(res.get("ok"), f"picker injected {res}")
        card = site.locator(".card").nth(1)
        box = await card.bounding_box()
        await site.mouse.move(box["x"] + 10, box["y"] + 10)
        await site.wait_for_timeout(100)
        tagtxt = await site.evaluate("document.getElementById('__promptlift-root').shadowRoot.querySelector('.tag').textContent")
        check(tagtxt.startswith("h3") or tagtxt.startswith("div.card"), f"picker highlights hovered element ({tagtxt})")
        await site.keyboard.press("ArrowUp") if tagtxt.startswith("h3") else None
        tagtxt = await site.evaluate("document.getElementById('__promptlift-root').shadowRoot.querySelector('.tag').textContent")
        check(tagtxt.startswith("div.card"), f"ArrowUp moves to parent ({tagtxt})")
        url_before = site.url
        await site.mouse.click(box["x"] + 10, box["y"] + 10)
        await site.wait_for_function("document.getElementById('__promptlift-root')?.shadowRoot.querySelector('.panel textarea')", timeout=15000)
        pick = await site.evaluate("document.getElementById('__promptlift-root').shadowRoot.querySelector('textarea').value")
        open(f"{OUT}/prompt-pick.md", "w").write(pick)
        check("Recreate this UI element" in pick and "div.card" in pick and ".card:hover" in pick and "Safe" in pick, "picker prompt has element, hover rule and text")
        check("matrix(" not in pick and "#ffffff" in pick and " none 3px" not in pick, "picker captured resting (non-hover) state, cleaned values")
        check(site.url == url_before, "page click was swallowed (no navigation)")
        await site.screenshot(path=f"{OUT}/picker-panel.png")
        # popup shows last pick
        await open_popup(tab_id)
        check(not await popup.is_hidden("#last"), "popup offers last picked element")
        # Esc cancels a fresh picker
        await popup.evaluate(f"chrome.runtime.sendMessage({{type:'promptlift:startPicker', tabId:{tab_id}}})")
        await site.keyboard.press("Escape")
        check(await site.evaluate("!document.getElementById('__promptlift-root')"), "Esc removes picker overlay")

        # empty page
        await site.goto(SITE + "empty.html")
        await open_popup(tab_id)
        await popup.click('.cat[data-cat="all"]')
        await popup.wait_for_selector("#view-result:not([hidden]), #view-error:not([hidden])", timeout=15000)
        check(not await popup.is_hidden("#view-result"), "empty page still yields a prompt (no crash)")
        out = await popup.input_value("#output"); open(f"{OUT}/prompt-empty.md", "w").write(out)

        # restricted page
        await site.goto("chrome://version")
        await open_popup(tab_id) if False else await popup.goto(f"chrome-extension://{ext_id}/popup.html?tabId={tab_id}")
        await popup.wait_for_timeout(300)
        check(not await popup.is_hidden("#view-error"), "restricted page shows friendly error")

        errs = [l for l in logs if "error" in l.lower() and "favicon" not in l]
        print("\n".join(errs) or "no console errors")
        await ctx.close()
    print("\nFAILURES:", fails if fails else "none")
    sys.exit(1 if fails else 0)

asyncio.run(main())
