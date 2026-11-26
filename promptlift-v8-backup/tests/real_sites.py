"""PromptLift on real websites (not part of the regular suite: needs internet and takes a while).

For each site: pick a heading, the main button, the header, a card and a picture; then click two
sections and drag over an area. Every pick goes all the way to a copied prompt. Reports what was
found, how long it took, and anything broken (errors, empty results, "undefined" in prompts…).

    python3 tests/real_sites.py [site ...]
Results: $PL_OUT/real/report.json, prompts and panel screenshots per site.
"""
import asyncio, json, os, sys, tempfile, time, re
from playwright.async_api import async_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
EXT = os.path.dirname(HERE)
OUT = os.path.join(os.environ.get("PL_OUT", "/tmp/promptlift-out"), "real")
os.makedirs(OUT, exist_ok=True)
PROXY = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy")
HOME = "What do you want to copy?"
BAD = ["undefined", "NaN", "[object", "null;", ": null"]

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
    const hit = document.elementsFromPoint(x, y).find((e) => e.id !== '__promptlift-root');
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


async def main():
    # PL_RESUME=1 keeps the sites already in report.json and runs only the rest.
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
        # Answer the one-time questions up front.
        await sw.evaluate("chrome.storage.local.set({ tipSeen: true, site: { mode: 'change', about: '', app: 'claude-code' } })")
        site = ctx.pages[0] if ctx.pages else await ctx.new_page()
        logs = []
        site.on("console", lambda m: logs.append(f"[site] {m.type}: {m.text}"))
        site.on("pageerror", lambda e: logs.append(f"[site] pageerror {e}"))
        panel = None

        for url in SITES:
            name = re.sub(r"^https?://(www\.)?", "", url).split("/")[0]
            r = {"site": name, "url": url, "picks": [], "sections": None, "errors": [], "problems": []}
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
                # Cookie banners cover the page; accept them like a person would.
                for txt in ["Accept all", "Accept All", "Accept", "I agree", "Agree", "Allow all", "OK", "Got it"]:
                    btn = site.get_by_role("button", name=txt, exact=True)
                    if await btn.count() and await btn.first.is_visible():
                        try:
                            await btn.first.click(timeout=2000); await site.wait_for_timeout(600); break
                        except Exception:
                            pass
                # Pop-ups over the page (surveys, sign-up offers): close them like a person would.
                for txt in ["No thank you", "No thanks", "Not now", "Maybe later", "Close", "Dismiss"]:
                    btn = site.get_by_role("button", name=txt)
                    if await btn.count() and await btn.first.is_visible():
                        try:
                            await btn.first.click(timeout=2000); await site.wait_for_timeout(600)
                        except Exception:
                            pass
                r["title"] = await site.title()
                # Some sites block automated browsers: nothing of the real page to test.
                body = (await site.evaluate("document.body?.innerText || ''"))[:2000].lower()
                captcha_frame = await site.evaluate("[...document.querySelectorAll('iframe')].some((f) => /captcha|challenge/i.test(f.src))")
                if captcha_frame or any(w in body for w in ["confirm that you are human", "verify you are human", "are you a robot", "checking your browser"]):
                    r["blocked"] = True
                    log("  blocked by a bot check (not a PromptLift problem)")
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
                await panel.wait_for_selector(f"#title:has-text('{HOME}')", timeout=15000)
                await panel.evaluate("(() => { navigator.clipboard.writeText = (t) => { window.__copied = t; return Promise.resolve(); }; })()")
                await site.bring_to_front()
                await site.evaluate("window.scrollTo({top: 0, behavior: 'instant'})")
                found = await site.evaluate(FIND)
                r["found"] = found
                log("  targets:", found)

                async def go_home():
                    await panel.evaluate("state.history = []; go('home', false)")
                    await panel.wait_for_selector(f"#title:has-text('{HOME}')")

                async def copy_from_apply():
                    await panel.wait_for_selector("#title:has-text('Where should it go?')", timeout=60000)
                    await panel.evaluate("window.__copied = ''")
                    await panel.click("#tray-btn")
                    await panel.wait_for_selector(f"#title:has-text('{HOME}')", timeout=30000)
                    return await panel.evaluate("window.__copied || ''")

                # ---------- elements ----------
                for kind in ["heading", "button", "header", "card", "picture"]:
                    if kind not in found:
                        continue
                    pk = {"kind": kind, "what": found[kind]}
                    r["picks"].append(pk)
                    try:
                        await go_home()
                        await panel.click("#choose-element")
                        await panel.wait_for_selector("#title:has-text('Pick an element')")
                        await site.bring_to_front()
                        await site.evaluate(f"document.querySelector('[data-pl-rt={kind}]').scrollIntoView({{block:'center', behavior:'instant'}})")
                        await site.wait_for_timeout(500)
                        try:
                            b = await site.locator(f"[data-pl-rt={kind}]").first.bounding_box(timeout=3000)
                        except Exception:
                            b = None  # the site re-rendered it
                        if not b or b["y"] < 0 or b["y"] > 880:
                            pk["result"] = "skipped: not on screen"; continue
                        x, y = b["x"] + min(12, b["width"] / 2), b["y"] + min(b["height"] / 2, 30)
                        # Covered by something else (sticky header, overlay): a person couldn't click it either.
                        if not await site.evaluate(f"(() => {{ const t = document.querySelector('[data-pl-rt={kind}]'); const h = document.elementsFromPoint({x}, {y}).find((e) => e.id !== '__promptlift-root'); return !!t && !!h && (t === h || t.contains(h)); }})()"):
                            pk["result"] = "skipped: covered"; continue
                        t0 = time.time()
                        await site.mouse.move(x, y); await site.wait_for_timeout(200)
                        hover = await site.evaluate("(() => { const r = document.getElementById('__promptlift-root'); const em = r?.shadowRoot.querySelector('.hl em'); return em ? em.textContent : ''; })()")
                        await site.mouse.down(); await site.mouse.up()
                        for _ in range(300):
                            if await panel.evaluate("state.screen === 'pick' && !!state.view?.pickId && state.view.movement !== 'loading'"):
                                break
                            if await panel.locator(".alert, .reading-status.failed").count():
                                break
                            await asyncio.sleep(0.1)
                        pk["seconds"] = round(time.time() - t0, 1)
                        pk["hover"] = hover
                        if await panel.locator(".alert, .reading-status.failed").count():
                            pk["result"] = "error: " + (await panel.locator(".alert, .reading-status.failed").first.inner_text())[:200]
                            r["problems"].append(f"{kind}: panel error")
                            continue
                        if await panel.evaluate("state.screen") != "pick":
                            pk["result"] = "timeout"; r["problems"].append(f"{kind}: pick never arrived"); continue
                        # Let the scroll check settle (it scrolls the page a little).
                        for _ in range(60):
                            if await panel.evaluate("!state.view || state.view.scrollState !== 'checking'"):
                                break
                            await asyncio.sleep(0.2)
                        groups = await panel.locator("details.section").evaluate_all(
                            "els => els.map(d => ({ g: d.querySelector('summary span').textContent, n: d.querySelectorAll('.item').length, titles: [...d.querySelectorAll('.item .txt b')].map(b => b.textContent).slice(0, 6) }))")
                        pk["groups"] = groups
                        pk["name"] = await panel.evaluate("state.view?.name || ''")
                        await panel.screenshot(path=f"{OUT}/{name}-{kind}.png", full_page=True)
                        n_items = sum(g["n"] for g in groups)
                        if not n_items:
                            pk["result"] = "nothing found"; r["problems"].append(f"{kind}: nothing to copy"); continue
                        # Tick the first item of every group, then copy.
                        await panel.evaluate("""() => document.querySelectorAll('details.section').forEach(d => { const cb = d.querySelector('.item input[type=checkbox]'); if (cb && !cb.checked) cb.click(); })""")
                        await panel.click("#tray-btn")
                        prompt = await copy_from_apply()
                        pk["prompt_chars"] = len(prompt)
                        open(f"{OUT}/{name}-{kind}.txt", "w").write(prompt)
                        bad = [w for w in BAD if w in prompt]
                        if not prompt:
                            r["problems"].append(f"{kind}: empty prompt")
                        if bad:
                            r["problems"].append(f"{kind}: prompt contains {bad}")
                        pk["result"] = "ok" if prompt and not bad else "bad prompt"
                        log(f"  {kind}: {pk['seconds']}s, {pk['name']!r}, " + ", ".join(f"{g['g']} {g['n']}" for g in groups) + f", prompt {len(prompt)} chars{' BAD ' + str(bad) if bad else ''}")
                    except Exception as e:
                        pk["result"] = f"exception: {str(e)[:200]}"
                        r["problems"].append(f"{kind}: {str(e)[:120]}")
                        log(f"  {kind}: EXCEPTION {str(e)[:200]}")

                # ---------- screen portions: two clicks and one drag ----------
                sec = {"rows": []}
                r["sections"] = sec
                try:
                    await go_home()
                    await panel.click("#choose-portion")
                    await panel.wait_for_selector("#title:has-text('Pick screen portions')")
                    await site.bring_to_front()
                    await site.evaluate("window.scrollTo({top: 0, behavior: 'instant'})")
                    await site.wait_for_timeout(500)
                    t0 = time.time()

                    async def wait_rows(n):
                        for _ in range(150):
                            if await panel.locator(".sec-row").count() >= n:
                                return True
                            await asyncio.sleep(0.1)
                        return False

                    await site.mouse.move(640, 420); await site.wait_for_timeout(200)
                    await site.mouse.down(); await site.mouse.up()
                    ok1 = await wait_rows(1)
                    await site.evaluate("window.scrollTo({top: document.documentElement.scrollHeight * 0.4, behavior: 'instant'})")
                    await site.wait_for_timeout(700)
                    await site.mouse.move(640, 450); await site.wait_for_timeout(200)
                    await site.mouse.down(); await site.mouse.up()
                    ok2 = await wait_rows(2)
                    await site.evaluate("window.scrollTo({top: document.documentElement.scrollHeight * 0.65, behavior: 'instant'})")
                    await site.wait_for_timeout(700)
                    x0, y0, x1, y1 = 60, 150, 900, 600
                    await site.mouse.move(x0, y0); await site.mouse.down()
                    for i in range(1, 9):
                        await site.mouse.move(x0 + (x1 - x0) * i / 8, y0 + (y1 - y0) * i / 8); await asyncio.sleep(0.03)
                    await site.mouse.up()
                    ok3 = await wait_rows(3)
                    sec["seconds"] = round(time.time() - t0, 1)
                    await site.wait_for_timeout(1500)  # scroll hints
                    sec["rows"] = await panel.locator(".sec-row").evaluate_all("els => els.map(e => e.querySelector('.sec-name').innerText.replace(/\\n/g, ' · '))")
                    await panel.screenshot(path=f"{OUT}/{name}-sections.png", full_page=True)
                    if not (ok1 and ok2 and ok3):
                        r["problems"].append(f"sections: got {len(sec['rows'])} of 3 ({'click1 ' if not ok1 else ''}{'click2 ' if not ok2 else ''}{'drag' if not ok3 else ''})")
                    if sec["rows"]:
                        await panel.click("#tray-btn")
                        prompt = await copy_from_apply()
                        sec["prompt_chars"] = len(prompt)
                        open(f"{OUT}/{name}-sections.txt", "w").write(prompt)
                        bad = [w for w in BAD if w in prompt]
                        if bad:
                            r["problems"].append(f"sections: prompt contains {bad}")
                        if not prompt:
                            r["problems"].append("sections: empty prompt")
                    log(f"  sections: {sec['rows']} in {sec.get('seconds')}s, prompt {sec.get('prompt_chars')} chars")
                except Exception as e:
                    r["problems"].append(f"sections: {str(e)[:120]}")
                    log(f"  sections: EXCEPTION {str(e)[:200]}")
            except Exception as e:
                r["problems"].append(f"site: {str(e)[:160]}")
                log(f"  SITE EXCEPTION {str(e)[:200]}")
            # Errors that come from PromptLift itself (the site's own errors don't count).
            r["errors"] = [l for l in logs if ("[panel]" in l and ("error" in l.lower() or "pageerror" in l)) or ("PromptLift" in l and "error" in l.lower())][:15]
            if r["errors"]:
                r["problems"].append(f"{len(r['errors'])} PromptLift errors in the console")
            log("  problems:", r["problems"] or "none")
            json.dump(report, open(f"{OUT}/report.json", "w"), indent=1)
        await ctx.close()
    ok = [x for x in report if not x["problems"] and not x.get("blocked")]  # all sites, resumed ones included
    blocked = [x["site"] for x in report if x.get("blocked")]
    if blocked:
        log(f"blocked by bot checks (not tested): {blocked}")
    log(f"\n{len(ok)}/{len(report) - len(blocked)} tested sites without problems")


asyncio.run(main())
