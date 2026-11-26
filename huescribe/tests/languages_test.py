"""Every UI language end to end: the panel in that language picks a heading, adds it, copies a prompt.

Checks per language: no sideways scroll at 320px and 400px, no clipped button/chip text, no untranslated English
UI strings visible, a prompt with no unfilled {placeholders}, RTL for Arabic; plus the welcome page in that language.
python3 tests/languages_test.py [codes...]   (screenshots in /tmp/langs)
"""
import asyncio
import json
import os
import re
import sys
import tempfile
from playwright.async_api import async_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
EXT = os.path.dirname(HERE)
SITE = "http://127.0.0.1:8001/"
OUT = "/tmp/langs"
os.makedirs(OUT, exist_ok=True)
LANGS = sys.argv[1:] or ["es", "pt", "fr", "de", "it", "tr", "id", "vi", "ru", "ar", "hi", "zh", "ja", "ko"]
SRC = json.load(open(os.path.join(EXT, "locales", "source.json")))
# English UI strings of two or more words: seeing one of these on screen in another language means it wasn't translated
ENGLISH = {s["text"] for s in SRC if isinstance(s.get("text"), str) and len(s["text"].split()) >= 2 and "{" not in s["text"] and "<" not in s["text"]}
ENGLISH -= {"Claude Code", "Claude (chat)", "100 notes"}  # "100 notes" is also French
fails = []


async def until(page, js, timeout=30):
    """Poll a JS expression (wait_for_function would need eval, which the extension's CSP forbids)."""
    for _ in range(int(timeout * 10)):
        try:
            if await page.evaluate(js):
                return True
        except Exception:
            pass
        await asyncio.sleep(0.1)
    raise TimeoutError(f"waited {timeout}s for {js}")


def check(ok, what):
    print(("PASS " if ok else "FAIL ") + what)
    if not ok:
        fails.append(what)


CLIPPED = """() => [...document.querySelectorAll('button, .chip, .btn, summary, #title')].filter(el => {
  if (!el.offsetParent) return false;
  if (el.closest('[aria-hidden="true"]')) return false;
  const cs = getComputedStyle(el); if (cs.textOverflow === 'ellipsis') return false;
  return (el.scrollWidth > el.clientWidth + 6 && !el.querySelector('svg:only-child')) || el.getBoundingClientRect().right > innerWidth + 1;
}).map(el => `${(el.textContent || '').trim().slice(0, 40)} [${el.scrollWidth}>${el.clientWidth}]`)"""
VISIBLE_TEXT = """() => { const out = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) { const n = w.currentNode, p = n.parentElement; if (!p || !p.offsetParent) continue; const t = n.textContent.trim(); if (t) out.push(t); }
  for (const el of document.querySelectorAll('[aria-label],[title],[placeholder]')) for (const a of ['aria-label','title','placeholder']) if (el.getAttribute(a)) out.push(el.getAttribute(a));
  return out; }"""


async def run_lang(ctx, sw, site, tab_id, lang):
    for width in (400, 320):
        waiter = asyncio.ensure_future(ctx.wait_for_event("page"))
        await sw.evaluate(f"chrome.storage.local.set({{uiLang: '{lang}', uiLangResolved: '{lang}', tipSeen: false}})")
        await sw.evaluate(f"chrome.windows.create({{url: 'panel.html?tabId={tab_id}', type: 'popup', width: {width}, height: 900}})")
        panel = await waiter
        errors = []
        panel.on("pageerror", lambda e: errors.append(str(e)))
        await panel.set_viewport_size({"width": width, "height": 860})
        # the panel switches language itself (it reloads once when Chrome storage and its local copy differ)
        await until(panel, f"document.documentElement.lang === '{lang}'", timeout=20)
        await asyncio.sleep(0.8)
        await until(panel, "!!document.querySelector('#title') && document.querySelector('#title').textContent.trim().length > 0")
        await panel.wait_for_timeout(600)
        tag = f"{lang}-{width}"
        check(await panel.evaluate("document.documentElement.lang") == lang, f"[{tag}] html lang={lang}")
        if lang == "ar":
            check(await panel.evaluate("document.documentElement.dir") == "rtl", f"[{tag}] right-to-left")
        await panel.screenshot(path=f"{OUT}/{tag}-home.png")
        await panel.evaluate("""(() => { const w = navigator.clipboard.writeText.bind(navigator.clipboard); navigator.clipboard.writeText = (t) => { window.__copied = t; return w(t).catch(() => {}); }; })()""")
        await panel.evaluate("state.basket = []; saveBasket()")
        await site.bring_to_front()
        for _ in range(40):
            if await site.evaluate("!!document.getElementById('__huescribe-root')?.shadowRoot.querySelector('.t.picking')"):
                break
            await asyncio.sleep(0.1)
        box = await site.evaluate("(() => { const r = document.getElementById('hero-title').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()")
        await site.mouse.move(box[0], box[1]); await asyncio.sleep(0.2)
        await site.mouse.down(); await site.mouse.up()
        await until(panel, "state.screen === 'pick' || state.screen === 'secpick'")
        await panel.wait_for_timeout(500)
        await panel.screenshot(path=f"{OUT}/{tag}-pick.png")
        clipped = await panel.evaluate(CLIPPED)
        check(not clipped, f"[{tag}] no clipped text on the pick screen {clipped[:4]}")
        # a part shows chips (sections) or switches per group (single elements); turn the first one on
        if await panel.locator(".part-chips .chip.toggle").count():
            await panel.locator(".part-chips .chip.toggle").first.click()
        else:
            await panel.locator(".group-toggle").first.click()
        await panel.click("#tray-btn")
        await panel.wait_for_selector(".row-card", timeout=40000)
        await panel.wait_for_timeout(300)
        clipped = await panel.evaluate(CLIPPED)
        check(not clipped, f"[{tag}] no clipped text on the list {clipped[:4]}")
        check(await panel.evaluate("document.documentElement.scrollWidth <= innerWidth"), f"[{tag}] no sideways scroll")
        shown = await panel.evaluate(VISIBLE_TEXT)
        left = sorted({t for t in shown if t in ENGLISH})
        check(not left, f"[{tag}] no English UI text left {left[:6]}")
        await panel.screenshot(path=f"{OUT}/{tag}-list.png")
        await panel.evaluate("window.__copied = ''")
        await panel.click("#tray-btn")
        await panel.wait_for_timeout(400)
        prompt = await panel.evaluate("window.__copied || ''")
        holes = re.findall(r"\{[a-zA-Z_]+\}", prompt)
        check(len(prompt) > 200 and not holes, f"[{tag}] the prompt is complete ({len(prompt)} chars, unfilled: {holes[:3]})")
        if width == 400:
            open(f"{OUT}/{lang}-prompt.txt", "w").write(prompt)
        check(not errors, f"[{tag}] no page errors {errors[:2]}")
        await panel.close()


async def welcome(ctx, ext_id, lang):
    pg = await ctx.new_page()
    await pg.set_viewport_size({"width": 1280, "height": 860})
    await pg.goto(f"chrome-extension://{ext_id}/welcome.html")
    await pg.evaluate(f"localStorage.setItem('huescribe.uiLang', '{lang}')")
    await pg.reload()
    await pg.wait_for_timeout(500)
    shown = await pg.evaluate(VISIBLE_TEXT)
    left = sorted({t for t in shown if t in ENGLISH})
    check(not left, f"[{lang} welcome] no English UI text left {left[:6]}")
    check(await pg.evaluate("document.documentElement.scrollWidth <= innerWidth"), f"[{lang} welcome] no sideways scroll")
    await pg.screenshot(path=f"{OUT}/{lang}-welcome.png")
    await pg.close()


async def main():
    async with async_playwright() as p:
        ctx = await p.chromium.launch_persistent_context(
            tempfile.mkdtemp(), executable_path="/usr/bin/google-chrome", headless=True,
            args=["--headless=new", f"--disable-extensions-except={EXT}", f"--load-extension={EXT}", "--no-sandbox"],
            viewport={"width": 1280, "height": 900})
        sw = ctx.service_workers[0] if ctx.service_workers else await ctx.wait_for_event("serviceworker")
        # signed in through the test account (only honored by an unpacked install; Google sign-in has its own test)
        await sw.evaluate("chrome.storage.local.set({accountTestUser: {id: 'test', email: 'test@example.com', name: 'Test'}})")
        ext_id = sw.url.split("/")[2]
        site = ctx.pages[0] if ctx.pages else await ctx.new_page()
        await site.goto(SITE)
        await site.wait_for_load_state("networkidle")
        tab_id = await sw.evaluate(f"(async()=> (await chrome.tabs.query({{url:'{SITE}*'}}))[0].id)()")
        for lang in LANGS:
            try:
                await run_lang(ctx, sw, site, tab_id, lang)
                await welcome(ctx, ext_id, lang)
            except Exception as err:  # keep going: one broken language shouldn't hide the others
                check(False, f"[{lang}] crashed: {str(err).splitlines()[0][:160]}")
        await ctx.close()
    print(f"\n{'ALL PASS' if not fails else f'{len(fails)} FAILED'}")
    sys.exit(1 if fails else 0)

asyncio.run(main())
