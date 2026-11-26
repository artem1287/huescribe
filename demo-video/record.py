"""Record the Huescribe demo: the demo site and the side panel, frame by frame (CDP screencast), with a visible cursor.

Writes frames/site/<t>.jpg, frames/panel/<t>.jpg (t = seconds since start) and marks.json (scene starts and
stretches to cut, e.g. while the panel is reading a pick). Each scene lasts at least as long as its voice line.
"""
import asyncio
import base64
import json
import os
import subprocess
import tempfile
import time

from playwright.async_api import async_playwright

EXT = "/home/claude/huescribe"
SITE = "http://fieldnote.app/"
ROOT = "document.getElementById('__huescribe-root')"
HERE = "/home/claude/demo-video"
DUR = json.load(open(f"{HERE}/durations.json"))
T0 = time.monotonic()
marks = {"scenes": [], "cuts": []}

for d in ("site", "panel"):
    os.makedirs(f"{HERE}/frames/{d}", exist_ok=True)
    for f in os.listdir(f"{HERE}/frames/{d}"):
        os.remove(f"{HERE}/frames/{d}/{f}")
subprocess.run("curl -s -o /dev/null http://127.0.0.1:8003/ || (cd /home/claude/demo-site && setsid nohup python3 -m http.server 8003 >/tmp/demo-site.log 2>&1 &); sleep 1", shell=True)

# A cursor drawn in the page's top layer (headless Chrome draws none), with a ring on press.
CURSOR = r"""
(() => {
  if (window.__cur) return;
  const c = document.createElement('div');
  c.setAttribute('popover', 'manual');
  c.style.cssText = 'all:initial;position:fixed;inset:auto;left:0;top:0;margin:0;padding:0;border:0;background:none;overflow:visible;pointer-events:none;width:28px;height:28px;transform:translate(-100px,-100px)';
  c.innerHTML = '<span style="position:absolute;left:-14px;top:-14px;width:28px;height:28px;border-radius:50%;background:rgba(185,217,106,.55);transform:scale(0);transition:transform .25s ease,opacity .35s ease;opacity:0"></span>'
    + '<svg width="26" height="26" viewBox="0 0 24 24" style="position:absolute;left:-3px;top:-2px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))"><path d="M4 2l15 8.5-6.5 1.6L9.6 19z" fill="#151515" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>';
  document.documentElement.appendChild(c);
  c.showPopover();
  const ring = c.firstChild;
  window.__cur = c;
  addEventListener('mousemove', (e) => { c.style.transform = `translate(${e.clientX}px,${e.clientY}px)`; if (!c.matches(':popover-open')) c.showPopover(); }, true);
  addEventListener('mousedown', () => { ring.style.transition = 'none'; ring.style.transform = 'scale(.4)'; ring.style.opacity = '1'; requestAnimationFrame(() => { ring.style.transition = 'transform .35s ease, opacity .45s ease'; ring.style.transform = 'scale(1.4)'; ring.style.opacity = '0'; }); }, true);
  window.__curShow = (on) => { c.style.visibility = on ? 'visible' : 'hidden'; };
})()
"""


def now():
    return time.monotonic() - T0


async def screencast(page, name):
    cdp = await page.context.new_cdp_session(page)

    async def on_frame(ev):
        t = now()
        with open(f"{HERE}/frames/{name}/{t:09.4f}.jpg", "wb") as f:
            f.write(base64.b64decode(ev["data"]))
        try:
            await cdp.send("Page.screencastFrameAck", {"sessionId": ev["sessionId"]})
        except Exception:
            pass
    cdp.on("Page.screencastFrame", lambda ev: asyncio.ensure_future(on_frame(ev)))
    await cdp.send("Page.startScreencast", {"format": "jpeg", "quality": 90, "everyNthFrame": 1})
    return cdp


async def main():
    async with async_playwright() as p:
        ctx = await p.chromium.launch_persistent_context(
            tempfile.mkdtemp(), executable_path="/usr/bin/google-chrome", headless=True,
            args=["--headless=new", f"--disable-extensions-except={EXT}", f"--load-extension={EXT}", "--no-sandbox",
                  "--host-resolver-rules=MAP fieldnote.app:80 127.0.0.1:8003"],
            viewport={"width": 1280, "height": 860}, device_scale_factor=2)
        sw = ctx.service_workers[0] if ctx.service_workers else await ctx.wait_for_event("serviceworker")
        site = ctx.pages[0] if ctx.pages else await ctx.new_page()
        await site.goto(SITE); await site.wait_for_load_state("networkidle"); await site.wait_for_timeout(800)
        tab = await sw.evaluate(f"(async()=> (await chrome.tabs.query({{url:'{SITE}*'}}))[0].id)()")
        w = asyncio.ensure_future(ctx.wait_for_event("page"))
        await sw.evaluate(f"chrome.windows.create({{url:'panel.html?tabId={tab}', type:'popup', width:400, height:900}})")
        panel = await w
        await panel.set_viewport_size({"width": 380, "height": 860})
        await panel.wait_for_selector("#title:has-text('My list')")
        await panel.evaluate("state.basket = []; saveBasket()")
        await panel.evaluate("(() => { const w = navigator.clipboard.writeText.bind(navigator.clipboard); navigator.clipboard.writeText = (t) => w(t).catch(() => {}); })()")
        # Dismiss the first-run "How it works" card so the panel starts clean.
        got = panel.locator("button", has_text="Got it")
        if await got.count(): await got.first.click()
        await site.bring_to_front()
        for pg in (site, panel):
            await pg.evaluate(CURSOR)
        await panel.evaluate("__curShow(false)")
        pos = {"site": [640, 600], "panel": [190, 500]}

        async def glide(pg, key, x, y, dur=0.6):
            x0, y0 = pos[key]
            n = max(8, int(dur * 40))
            for i in range(1, n + 1):
                t = i / n; e = 1 - (1 - t) ** 3
                await pg.mouse.move(x0 + (x - x0) * e, y0 + (y - y0) * e)
                await asyncio.sleep(dur / n)
            pos[key] = [x, y]

        async def use(which):
            await site.evaluate(f"__curShow({str(which == 'site').lower()})")
            await panel.evaluate(f"__curShow({str(which == 'panel').lower()})")

        async def click_in_panel(selector, dur=0.6):
            el = (panel.locator(selector) if isinstance(selector, str) else selector).first
            await el.scroll_into_view_if_needed()
            b = await el.bounding_box()
            await use("panel")
            await glide(panel, "panel", b["x"] + b["width"] / 2, b["y"] + b["height"] / 2, dur)
            await asyncio.sleep(0.15)
            await panel.mouse.down(); await asyncio.sleep(0.08); await panel.mouse.up()

        async def scene(name, fn):
            start = now()
            marks["scenes"].append([name, round(start, 3)])
            await fn()
            rest = DUR[name] + 0.7 - (now() - start - sum(b - a for a, b in marks["cuts"] if a >= start))
            if rest > 0: await asyncio.sleep(rest)
            print(name, round(now() - start, 2))

        async def ensure_picking():
            for _ in range(50):
                if await site.evaluate(f"!!{ROOT}?.shadowRoot.querySelector('.t.picking')"): return
                await asyncio.sleep(0.1)

        await ensure_picking()
        await site.mouse.move(640, 600); await asyncio.sleep(0.3)
        cds = [await screencast(site, "site"), await screencast(panel, "panel")]
        await asyncio.sleep(0.6)

        async def hover():
            await use("site")
            b = await site.locator(".hero h1").bounding_box()
            await glide(site, "site", b["x"] + 120, b["y"] + 40, 0.9); await asyncio.sleep(1.0)
            b = await site.locator(".hero .btn-main").bounding_box()
            await glide(site, "site", b["x"] + 40, b["y"] + b["height"] / 2, 0.8); await asyncio.sleep(1.0)
            b = await site.locator(".hero-pic").bounding_box()
            await glide(site, "site", b["x"] + 160, b["y"] + 220, 0.8); await asyncio.sleep(0.6)
        await scene("hover", hover)

        async def section():
            await site.evaluate("window.scrollTo({top: document.querySelector('#pricing').offsetTop - 40, behavior: 'smooth'})")
            await asyncio.sleep(0.9)
            b = await site.locator("#pricing .plan h3").first.bounding_box()
            await glide(site, "site", b["x"] + 10, b["y"] + 8, 0.7); await asyncio.sleep(0.4)
            for _ in range(10):
                lab = await site.evaluate(f"{ROOT}.shadowRoot.querySelector('.hl em')?.textContent || ''")
                if lab.startswith("Section:"): break
                await site.keyboard.press("ArrowUp"); await asyncio.sleep(0.35)
            await asyncio.sleep(0.6)
            await site.mouse.down(); await asyncio.sleep(0.08); await site.mouse.up()
            a = now()
            for _ in range(200):
                if await panel.evaluate("state.screen === 'secpick' && state.view?.scrollHint !== null"): break
                await asyncio.sleep(0.05)
            b2 = now()
            if b2 - a > 1.2: marks["cuts"].append([round(a + 0.6, 3), round(b2 - 0.2, 3)])
        await scene("section", section)

        async def choose():
            for k in ("colors", "format"):
                c = panel.locator(f".part-chips .chip.toggle[data-part={k}]")
                if await c.count() and await c.get_attribute("aria-pressed") != "true":
                    await click_in_panel(f".part-chips .chip.toggle[data-part={k}]", 0.5); await asyncio.sleep(0.5)
            await asyncio.sleep(0.4)
            await click_in_panel("#tray-btn", 0.6)
            a = now()
            await panel.wait_for_selector(".row-card", timeout=40000)
            b2 = now()
            if b2 - a > 1.2: marks["cuts"].append([round(a + 0.5, 3), round(b2 - 0.1, 3)])
        await scene("choose", choose)

        async def button():
            await use("site")
            await site.evaluate("window.scrollTo({top: 0, behavior: 'smooth'})"); await asyncio.sleep(0.8)
            b = await site.locator(".hero .btn-main").bounding_box()
            await glide(site, "site", b["x"] + 40, b["y"] + b["height"] / 2, 0.7); await asyncio.sleep(0.4)
            await site.mouse.down(); await asyncio.sleep(0.08); await site.mouse.up()
            await asyncio.sleep(2.5)  # the hover-and-press test plays on the page: keep it
            a = now()
            for _ in range(300):
                done = await panel.evaluate("state.screen === 'pick' && !!state.view?.pickId && state.view.movement !== 'loading'")
                testing = await panel.locator("text=Testing hover and press").count()
                if done and not testing: break
                await asyncio.sleep(0.05)
            b2 = now()
            if b2 - a > 1.0: marks["cuts"].append([round(a + 0.3, 3), round(b2 - 0.1, 3)])
            await asyncio.sleep(0.6)
            await click_in_panel(".group-toggle[data-group=Motion]", 0.6); await asyncio.sleep(1.2)
            await panel.evaluate("document.scrollingElement.scrollTo({top: 0, behavior: 'smooth'})")
            await click_in_panel("#tray-btn", 0.6)
            a = now()
            await panel.wait_for_selector("#title:has-text('My list')", timeout=40000)
            b2 = now()
            if b2 - a > 1.2: marks["cuts"].append([round(a + 0.5, 3), round(b2 - 0.1, 3)])
        await scene("button", button)

        async def mylist():
            await asyncio.sleep(0.5)
            await click_in_panel(".row-card .chip:has-text('Middle of homepage')", 0.7); await asyncio.sleep(0.8)
            await click_in_panel(panel.locator(".row-card").nth(1).locator(".chip", has_text="All buttons"), 0.7); await asyncio.sleep(0.6)
        await scene("list", mylist)

        async def copy():
            await click_in_panel("#tray-btn", 0.7); await asyncio.sleep(2.2)
            await use("site")
        await scene("copy", copy)

        await asyncio.sleep(0.5)
        for c in cds:
            try: await c.send("Page.stopScreencast")
            except Exception: pass
        marks["end"] = round(now(), 3)
        json.dump(marks, open(f"{HERE}/marks.json", "w"), indent=1)
        await ctx.close()

asyncio.run(main())
