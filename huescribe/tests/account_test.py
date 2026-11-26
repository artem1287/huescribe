"""Google sign-in gate: both states, at 400px and 320px.

Signed out: the panel shows only "Continue with Google", picking doesn't start on the page, the background refuses
to start the picker, the practice page still works, and (with no OAuth client id in manifest.json) the button says
sign-in isn't set up yet. Signed in (the development-only test account): the list shows, picking runs, the ⋯ menu
offers "Sign out (email)", and signing out returns to the sign-in screen and stops picking. A store install ignores
the test account. The real Google window can't run headless; account.js is covered up to chrome.identity.
python3 tests/account_test.py   (screenshots in /tmp/account)
"""
import asyncio
import os
import sys
import tempfile
from playwright.async_api import async_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
EXT = os.path.dirname(HERE)
SITE = "http://127.0.0.1:8001/"
OUT = "/tmp/account"
os.makedirs(OUT, exist_ok=True)
fails = []


def check(ok, what):
    print(("PASS " if ok else "FAIL ") + what)
    if not ok:
        fails.append(what)


async def until(page, js, timeout=20):
    for _ in range(int(timeout * 10)):
        try:
            if await page.evaluate(js):
                return True
        except Exception:
            pass
        await asyncio.sleep(0.1)
    return False


async def main():
    async with async_playwright() as p:
        ctx = await p.chromium.launch_persistent_context(
            tempfile.mkdtemp(), executable_path="/usr/bin/google-chrome", headless=True,
            args=["--headless=new", f"--disable-extensions-except={EXT}", f"--load-extension={EXT}", "--no-sandbox"],
            viewport={"width": 1280, "height": 900})
        sw = ctx.service_workers[0] if ctx.service_workers else await ctx.wait_for_event("serviceworker")
        ext_id = sw.url.split("/")[2]
        site = ctx.pages[0] if ctx.pages else await ctx.new_page()
        await site.goto(SITE)
        await site.wait_for_load_state("networkidle")
        tab_id = await sw.evaluate(f"(async()=> (await chrome.tabs.query({{url:'{SITE}*'}}))[0].id)()")
        picking = "!!document.getElementById('__huescribe-root')?.shadowRoot.querySelector('.t.picking')"

        for width in (400, 320):
            waiter = asyncio.ensure_future(ctx.wait_for_event("page"))
            await sw.evaluate(f"chrome.windows.create({{url: 'panel.html?tabId={tab_id}', type: 'popup', width: {width}, height: 900}})")
            panel = await waiter
            errors = []
            panel.on("pageerror", lambda e: errors.append(str(e)))
            await panel.set_viewport_size({"width": width, "height": 860})
            # ---- signed out
            check(await until(panel, "state.screen === 'signin'"), f"[{width}] signed out: the sign-in screen")
            await panel.wait_for_timeout(500)
            await panel.screenshot(path=f"{OUT}/{width}-signed-out.png")
            check(await panel.locator("#google-signin").is_visible(), f"[{width}] 'Continue with Google' is shown")
            box = await panel.locator("#google-signin").bounding_box()
            check(box and box["height"] >= 44 and box["x"] >= 0 and box["x"] + box["width"] <= width, f"[{width}] the button is ≥44px tall and fits ({box})")
            check("set up" in (await panel.text_content(".signin-msg") or ""), f"[{width}] no OAuth client id yet: it says sign-in isn't set up")
            check(not await site.evaluate(picking), f"[{width}] nothing is picked on the page while signed out")
            refused = await panel.evaluate(f"chrome.runtime.sendMessage({{type: 'huescribe:startPicker', tabId: {tab_id}}})")
            check(refused and refused.get("ok") is False and refused.get("error") == "signed-out", f"[{width}] the background refuses to start picking ({refused})")
            check(await panel.locator("#more").is_visible(), f"[{width}] the ⋯ menu is still there (language, practice)")
            check(await panel.evaluate("document.documentElement.scrollWidth <= innerWidth"), f"[{width}] no sideways scroll")
            # clicking "Continue with Google" without a client id: a clear message, no crash
            await panel.click("#google-signin")
            await panel.wait_for_timeout(600)
            check("set up" in (await panel.text_content(".signin-msg") or "") and not await panel.is_disabled("#google-signin"), f"[{width}] pressing it explains instead of failing silently")
            # the practice opens without an account
            n = len(ctx.pages)
            await panel.click("#signin-practice")
            await panel.wait_for_timeout(800)
            check(any("welcome.html" in pg.url for pg in ctx.pages), f"[{width}] the practice opens without signing in")
            for pg in ctx.pages:
                if "welcome.html" in pg.url:
                    await pg.close()
            # ---- signed in (test account, development install only)
            await sw.evaluate("chrome.storage.local.set({accountTestUser: {id: 't1', email: 'ada@example.com', name: 'Ada'}})")
            check(await until(panel, "state.screen === 'home'"), f"[{width}] signing in (elsewhere) brings the list")
            check(await until(site, picking, 10), f"[{width}] picking runs once signed in")
            await panel.wait_for_timeout(300)
            await panel.screenshot(path=f"{OUT}/{width}-signed-in.png")
            await panel.click("#more")
            item = panel.locator("[role=menuitem]", has_text="ada@example.com")
            check(await item.count() == 1, f"[{width}] the ⋯ menu shows 'Sign out (ada@example.com)'")
            await panel.screenshot(path=f"{OUT}/{width}-menu.png")
            await item.click()
            check(await until(panel, "state.screen === 'signin'"), f"[{width}] signing out shows the sign-in screen")
            check(await until(site, "!(" + picking + ")", 10), f"[{width}] signing out stops picking on the page")
            check(not errors, f"[{width}] no page errors {errors[:2]}")
            await panel.close()

        # a refreshed panel stays signed in (stored account), and the router can't be skipped
        await sw.evaluate("chrome.storage.local.set({accountTestUser: {id: 't1', email: 'ada@example.com', name: 'Ada'}})")
        waiter = asyncio.ensure_future(ctx.wait_for_event("page"))
        await sw.evaluate(f"chrome.windows.create({{url: 'panel.html?tabId={tab_id}', type: 'popup', width: 400, height: 900}})")
        panel = await waiter
        check(await until(panel, "state.screen === 'home'"), "a new panel opens straight on the list when signed in")
        await sw.evaluate("chrome.storage.local.remove('accountTestUser')")
        check(await until(panel, "state.screen === 'signin'"), "losing the account (anywhere) locks the panel again")
        await panel.evaluate("go('home', false)")
        check(await panel.evaluate("state.screen") == "signin", "going to the list while signed out still shows sign-in")
        await panel.close()
        await ctx.close()
    print(f"\n{'ALL PASS' if not fails else f'{len(fails)} FAILED'}")
    sys.exit(1 if fails else 0)

asyncio.run(main())
