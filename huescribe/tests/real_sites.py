"""Huescribe on real websites (not part of the regular suite: needs internet and takes a while).

For each site (v9 panel): pick a heading, the main button, the header, a card and a picture, a whole
section (↑ to it) and a dragged area. Each goes on the list with every group switched on and is copied
as a prompt on its own. Reports what was
found, how long it took, and anything broken (errors, empty results, "undefined" in prompts…).

    python3 tests/real_sites.py [site ...]
Results: $PL_OUT/real/report.json, prompts and panel screenshots per site.
"""
import asyncio, json, os, sys, tempfile, time, re
from playwright.async_api import async_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
EXT = os.path.dirname(HERE)
OUT = os.path.join(os.environ.get("PL_OUT", "/tmp/huescribe-out"), "real")
os.makedirs(OUT, exist_ok=True)
PROXY = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy")
HOME = "My list"
ROOT = "document.getElementById('__huescribe-root')"
BAD = ["undefined", "NaN", "[object", "null;", ": null"]
# Signs of a description that went wrong (found in earlier tests): a word → the pattern that shows it.
ODD = {
    "text of size 0": r"text size 0px",
    "impossible width": r"content (\d{4,})px wide",
    "empty button": r"\(0 words\)",
    "generic row name": r"^(Box|Something|Your pick)$",
}

SITES = sys.argv[1:] or [
    "https://stripe.com", "https://linear.app", "https://www.apple.com", "https://vercel.com",
    "https://github.com", "https://www.notion.com", "https://www.framer.com", "https://webflow.com",
    "https://www.figma.com", "https://tailwindcss.com", "https://www.shopify.com", "https://www.dropbox.com",
    "https://www.raycast.com", "https://www.anthropic.com", "https://www.airbnb.com", "https://www.wikipedia.org",
    "https://www.duolingo.com", "https://mailchimp.com", "https://www.squarespace.com", "https://www.nytimes.com",
]

# Marks up to five kinds of things on the page with data-pl-rt so the test can find them.
FIND = r"""() => {
  // Something a person can see and click: on the page, not covered, not click-through.
  const vis = (el) => { const r = el.getBoundingClientRect(), s = getComputedStyle(el);
    if (!(r.width > 20 && r.height > 12 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.1 && s.pointerEvents !== 'none')) return false;
    if (r.top + scrollY < 0 || r.left < 0 || r.right > innerWidth + 1) return false;
    const x = r.left + Math.min(12, r.width / 2), y = r.top + Math.min(r.height / 2, 30);
    if (y < 0 || y > innerHeight) return true; // checked again after scrolling to it
    const hit = document.elementsFromPoint(x, y).find((e) => e.id !== '__huescribe-root');
    return !!hit && (hit === el || el.contains(hit)); };
  const bg = (el) => { const c = getComputedStyle(el).backgroundColor; return c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c); };
  const out = {};
  const mark = (k, el) => { if (el && !out[k]) { el.setAttribute('data-pl-rt', k); out[k] = (el.tagName + ' ' + (el.textContent || '').trim().slice(0, 40)); } };
  mark('heading', [...document.querySelectorAll('h1, h2')].find(vis));
  mark('button', [...document.querySelectorAll('a, button')].find((el) => vis(el) && bg(el) && el.getBoundingClientRect().top > 60 && (el.textContent || '').trim().length > 1 && el.getBoundingClientRect().width < 400));
  mark('header', [...document.querySelectorAll('header, nav, [role=banner]')].find(vis));
  const cards = [...document.querySelectorAll('article, li, div, a')].filter((el) => {
    if (!vis(el)) return false; const r = el.getBoundingClientRect(), s = getComputedStyle(el);
    return r.width > 160 && r.width < 700 && r.height > 120 && r.height < 800 && parseFloat(s.borderRadius) >= 6 && (bg(el) || s.boxShadow !== 'none' || parseFloat(s.borderTopWidth) > 0) && el.querySelector('h2, h3, h4, p');
  });
  mark('card', cards[0]);
  const cardEl = document.querySelector('[data-pl-rt=card]');
  mark('picture', [...document.querySelectorAll('img, picture, video, svg')].find((el) => { const r = el.getBoundingClientRect(); return vis(el) && r.width > 180 && r.height > 120 && r.height < innerHeight && !(cardEl && cardEl.contains(el)); }));
  return out;
}"""


def log(*a):
    print(*a, flush=True)


def odd_in(prompt, row):
    out = []
    for name, pat in ODD.items():
        if name == "generic row name":
            if re.match(pat, row or ""): out.append(f"{name} ({row})")
            continue
        for m in re.finditer(pat, prompt):
            if name == "impossible width" and int(m.group(1)) <= 2000: continue
            out.append(f"{name} ({m.group(0)})"); break
    return out


async def main():
    report = []
    if os.environ.get("PL_RESUME") and os.path.exists(f"{OUT}/report.json"):
        report = json.load(open(f"{OUT}/report.json"))
        done = {r["url"] for r in report}
        SITES[:] = [u for u in SITES if u not in done]
        log(f"resuming: {len(report)} done, {len(SITES)} to go")
    async with async_playwright() as p:
        args = ["--headless=new", f"--disable-extensions-except={EXT}", f"--load-extension={EXT}", "--no-sandbox", "--ignore-certificate-errors"]
        if PROXY:
            args.append(f"--proxy-server={PROXY}")
        ctx = await p.chromium.launch_persistent_context(
            tempfile.mkdtemp(), executable_path="/usr/bin/google-chrome", headless=True, args=args,
            viewport={"width": 1280, "height": 900}, ignore_https_errors=True,
            user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
        sw = ctx.service_workers[0] if ctx.service_workers else await ctx.wait_for_event("serviceworker")
        await sw.evaluate("chrome.storage.local.set({ tipSeen: true, site: { app: 'claude-code' } })")
        site = ctx.pages[0] if ctx.pages else await ctx.new_page()
        logs = []
        site.on("console", lambda m: logs.append(f"[site] {m.type}: {m.text}"))
        site.on("pageerror", lambda e: logs.append(f"[site] pageerror {e}"))
        panel = None

        for url in SITES:
            name = re.sub(r"^https?://(www\.)?", "", url).split("/")[0]
            r = {"site": name, "url": url, "picks": [], "errors": [], "problems": []}
            report.append(r)
            logs.clear()
            log(f"\n=== {name}")
            try:
                await site.goto(url, wait_until="domcontentloaded", timeout=45000)
                try:
                    await site.wait_for_load_state("networkidle", timeout=12000)
                except Exception:
                    pass
                await site.wait_for_timeout(1500)

                async def close_popups():
                    # Cookie banners and pop-ups cover the page; close them like a person would.
                    for txt in ["Accept all", "Accept All", "Accept all cookies", "Accept", "I agree", "Agree", "Allow all", "OK", "Got it", "No thank you", "No thanks", "Not now", "Maybe later", "Close", "Dismiss"]:
                        btn = site.get_by_role("button", name=txt, exact=True)
                        try:
                            if await btn.count() and await btn.first.is_visible():
                                await btn.first.click(timeout=2000); await site.wait_for_timeout(600)
                        except Exception:
                            pass
                await close_popups()
                r["title"] = await site.title()
                body = (await site.evaluate("document.body?.innerText || ''"))[:2000].lower()
                captcha_frame = await site.evaluate("[...document.querySelectorAll('iframe')].some((f) => /captcha|challenge/i.test(f.src))")
                if captcha_frame or any(w in body for w in ["confirm that you are human", "verify you are human", "are you a robot", "checking your browser"]):
                    r["blocked"] = True
                    log("  blocked by a bot check (not a Huescribe problem)")
                    json.dump(report, open(f"{OUT}/report.json", "w"), indent=1)
                    continue
                tab_id = await sw.evaluate("(async()=> (await chrome.tabs.query({active: true})).find(t => /^https?:/.test(t.url))?.id)()")
                if panel and not panel.is_closed():
                    await panel.close()
                waiter = asyncio.ensure_future(ctx.wait_for_event("page"))
                await sw.evaluate(f"chrome.windows.create({{url: 'panel.html?tabId={tab_id}', type: 'popup', width: 400, height: 900}})")
                panel = await waiter
                panel.on("console", lambda m: logs.append(f"[panel] {m.type}: {m.text}"))
                panel.on("pageerror", lambda e: logs.append(f"[panel] pageerror {e}"))
                await panel.set_viewport_size({"width": 400, "height": 860})
                await panel.wait_for_selector(f"#title:has-text('{HOME}')", timeout=20000)
                await panel.evaluate("(() => { navigator.clipboard.writeText = (t) => { window.__copied = t; return Promise.resolve(); }; })()")
                await site.bring_to_front()
                for _ in range(80):
                    if await site.evaluate(f"!!{ROOT}?.shadowRoot.querySelector('.t.picking')"): break
                    await asyncio.sleep(0.1)
                else:
                    r["problems"].append("picking never came on")
                await site.evaluate("window.scrollTo({top: 0, behavior: 'instant'})")
                found = await site.evaluate(FIND)
                r["found"] = found
                log("  targets:", found)

                async def go_home():
                    await panel.evaluate("state.history = []; state.view = null; state.basket = []; saveBasket(); go('home', false)")
                    await panel.wait_for_selector(f"#title:has-text('{HOME}')")

                async def wait_pick():
                    """Until the pick (element or section) is on screen, or the panel reports a failure."""
                    for _ in range(300):
                        scr = await panel.evaluate("state.screen")
                        if scr == "pick" and await panel.evaluate("!!state.view?.pickId && state.view.movement !== 'loading'"): return "pick"
                        if scr == "secpick" and await panel.evaluate("!!state.view && state.view.scrollHint !== null"): return "secpick"
                        if await panel.locator(".alert, .reading-status.failed").count(): return "failed"
                        await asyncio.sleep(0.1)
                    return "timeout"

                async def add_and_copy(pk, kind_label):
                    """Switch everything on, add to the list, copy the prompt; check it."""
                    scr = await panel.evaluate("state.screen")
                    if scr == "pick":
                        for _ in range(60):
                            if await panel.evaluate("!state.view || state.view.scrollState !== 'checking'"): break
                            await asyncio.sleep(0.2)
                        pk["groups"] = await panel.locator(".group-toggle").evaluate_all("els => els.map(b => b.dataset.group + (b.disabled ? ' (off)' : ''))")
                        for g in await panel.locator(".group-toggle:not([disabled])").all():
                            if await g.get_attribute("aria-pressed") != "true": await g.click()
                    else:
                        pk["groups"] = await panel.locator(".part-chips .chip.toggle").evaluate_all("els => els.map(b => b.dataset.part)")
                        for c in await panel.locator(".part-chips .chip.toggle").all():
                            if await c.get_attribute("aria-pressed") != "true": await c.click()
                    pk["name"] = await panel.evaluate("state.view?.name || state.view?.title || ''")
                    await panel.screenshot(path=f"{OUT}/{name}-{kind_label}.png", full_page=True)
                    if await panel.locator("#tray-btn").is_disabled():
                        pk["result"] = "nothing to add"; r["problems"].append(f"{kind_label}: nothing to add"); return
                    await panel.click("#tray-btn")
                    await panel.wait_for_selector(f"#title:has-text('{HOME}')", timeout=60000)
                    await panel.wait_for_selector(".row-card", timeout=15000)
                    row = (await panel.locator(".row-card .row-name").first.inner_text()).split("\n")[0]
                    pk["row"] = row
                    await panel.evaluate("window.__copied = ''")
                    await panel.click("#tray-btn"); await panel.wait_for_timeout(400)
                    prompt = await panel.evaluate("window.__copied || ''")
                    pk["prompt_chars"] = len(prompt)
                    open(f"{OUT}/{name}-{kind_label}.txt", "w").write(prompt)
                    bad = [w for w in BAD if w in prompt]
                    odd = odd_in(prompt, row)
                    if not prompt: r["problems"].append(f"{kind_label}: empty prompt")
                    if bad: r["problems"].append(f"{kind_label}: prompt contains {bad}")
                    if odd: r["problems"].append(f"{kind_label}: {', '.join(odd)}")
                    pk["result"] = "ok" if prompt and not bad and not odd else "bad prompt"
                    log(f"  {kind_label}: {pk.get('seconds')}s, row {row!r}, {pk['groups']}, prompt {len(prompt)} chars{' BAD ' + str(bad) if bad else ''}{' ODD ' + str(odd) if odd else ''}")

                # ---------- elements, then a whole section, then a dragged area ----------
                for kind in ["heading", "button", "header", "card", "picture", "section", "area"]:
                    if kind in ("heading", "button", "header", "card", "picture") and kind not in found:
                        continue
                    pk = {"kind": kind, "what": found.get(kind, "")}
                    r["picks"].append(pk)
                    try:
                        await go_home()
                        await site.bring_to_front()
                        await close_popups()
                        t0 = time.time()
                        if kind == "area":
                            await site.evaluate("window.scrollTo({top: document.documentElement.scrollHeight * 0.55, behavior: 'instant'})")
                            await site.wait_for_timeout(800)
                            x0, y0, x1, y1 = 60, 150, 900, 600
                            await site.mouse.move(x0, y0); await site.mouse.down()
                            for i in range(1, 9):
                                await site.mouse.move(x0 + (x1 - x0) * i / 8, y0 + (y1 - y0) * i / 8); await asyncio.sleep(0.03)
                            await site.mouse.up()
                        elif kind == "section":
                            await site.evaluate("window.scrollTo({top: document.documentElement.scrollHeight * 0.3, behavior: 'instant'})")
                            await site.wait_for_timeout(800)
                            await site.mouse.move(640, 450); await site.wait_for_timeout(250)
                            for _ in range(14):
                                lab = await site.evaluate(f"{ROOT}?.shadowRoot.querySelector('.hl em')?.textContent || ''")
                                if lab.startswith("Section:"): break
                                await site.keyboard.press("ArrowUp"); await site.wait_for_timeout(150)
                            pk["what"] = lab
                            await site.mouse.down(); await site.mouse.up()
                        else:
                            await site.evaluate(f"document.querySelector('[data-pl-rt={kind}]')?.scrollIntoView({{block:'center', behavior:'instant'}})")
                            await site.wait_for_timeout(600)
                            try:
                                b = await site.locator(f"[data-pl-rt={kind}]").first.bounding_box(timeout=3000)
                            except Exception:
                                b = None
                            if not b or b["y"] < 0 or b["y"] > 880:
                                pk["result"] = "skipped: not on screen"; continue
                            x, y = b["x"] + min(12, b["width"] / 2), b["y"] + min(b["height"] / 2, 30)
                            if not await site.evaluate(f"(() => {{ const t = document.querySelector('[data-pl-rt={kind}]'); const h = document.elementsFromPoint({x}, {y}).find((e) => e.id !== '__huescribe-root'); return !!t && !!h && (t === h || t.contains(h)); }})()"):
                                pk["result"] = "skipped: covered"; continue
                            await site.mouse.move(x, y); await site.wait_for_timeout(250)
                            pk["hover"] = await site.evaluate(f"{ROOT}?.shadowRoot.querySelector('.hl em')?.textContent || ''")
                            await site.mouse.down(); await site.mouse.up()
                        got = await wait_pick()
                        pk["seconds"] = round(time.time() - t0, 1)
                        if got == "failed":
                            pk["result"] = "error: " + (await panel.locator(".alert, .reading-status.failed").first.inner_text())[:200]
                            r["problems"].append(f"{kind}: panel error"); continue
                        if got == "timeout":
                            pk["result"] = "timeout"; r["problems"].append(f"{kind}: pick never arrived"); continue
                        if pk["seconds"] > 20: r["problems"].append(f"{kind}: slow ({pk['seconds']}s)")
                        await add_and_copy(pk, kind)
                    except Exception as e:
                        pk["result"] = f"exception: {str(e)[:200]}"
                        r["problems"].append(f"{kind}: {str(e)[:120]}")
                        log(f"  {kind}: EXCEPTION {str(e)[:200]}")
            except Exception as e:
                r["problems"].append(f"site: {str(e)[:160]}")
                log(f"  SITE EXCEPTION {str(e)[:200]}")
            # Errors that come from Huescribe itself (the site's own errors don't count).
            r["errors"] = [l for l in logs if ("[panel]" in l and ("error" in l.lower() or "pageerror" in l)) or ("Huescribe" in l and "error" in l.lower())][:15]
            if r["errors"]:
                r["problems"].append(f"{len(r['errors'])} Huescribe errors in the console")
            log("  problems:", r["problems"] or "none")
            json.dump(report, open(f"{OUT}/report.json", "w"), indent=1)
        await ctx.close()
    ok = [x for x in report if not x["problems"] and not x.get("blocked")]
    blocked = [x["site"] for x in report if x.get("blocked")]
    if blocked:
        log(f"blocked by bot checks (not tested): {blocked}")
    log(f"\n{len(ok)}/{len(report) - len(blocked)} tested sites without problems")


asyncio.run(main())
