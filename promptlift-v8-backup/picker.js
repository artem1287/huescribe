// PromptLift on-page UI (isolated world). Injected after motion.js, analyzer.js and prompts.js.
//  - Picking mode (on by default): hover highlights, click picks an element, drag picks an area.
//    It stays on after a pick so the user can switch to something else; Esc pauses it.
//    After a pick the hover highlight is locked: clicking the pick again unlocks it, clicking
//    anything else picks that directly. Look-alike letter/word spans are picked as one text.
//  - Selection boxes: the picked rectangle(s) stay outlined while the user edits, following scroll.
// Picks (items + cropped screenshot) go to the panel through the service worker.
// Everything lives in one Shadow DOM host so page CSS can't leak in.

(() => {
  const auto = globalThis.__promptliftAutoPick;
  globalThis.__promptliftAutoPick = null;

  const UI_VERSION = 6;
  if (globalThis.__plUI && globalThis.__plUI.v !== UI_VERSION) globalThis.__plUI.destroy();
  if (!globalThis.__plUI || !document.getElementById('__promptlift-root')) globalThis.__plUI = createUI();
  const ui = globalThis.__plUI;
  ui.startPicking();
  if (auto) ui.pickByPath(auto);

  function createUI() {
    document.getElementById('__promptlift-root')?.remove();
    const DRAG_THRESHOLD = 6;
    const host = document.createElement('div');
    host.id = '__promptlift-root';
    host.style.cssText = 'all:initial;position:fixed;inset:0;pointer-events:none;z-index:2147483647;';
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `
    <style>
      * { box-sizing: border-box; }
      .t { --bg:#ffffff; --fg:#0a0a0a; --muted:#71717a; --border:#e4e4e7; --primary:#7c3aed; --on-primary:#fff;
           font: 14px/1.45 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: var(--fg); }
      @media (prefers-color-scheme: dark) { .t { --bg:#0a0a0a; --fg:#fafafa; --muted:#a1a1aa; --border:#27272a; --primary:#8b5cf6; } }
      .shield { position:fixed; inset:0; cursor:crosshair; pointer-events:auto; display:none; }
      .picking .shield { display:block; }
      .hl, .box { position:fixed; border:2px solid var(--primary); background:color-mix(in srgb, var(--primary) 10%, transparent); border-radius:4px; pointer-events:none; display:none; }
      .box { border-style:dashed; }
      /* The highlight glides from one element to the next instead of jumping. */
      .hl.glide { transition: left .09s ease-out, top .09s ease-out, width .09s ease-out, height .09s ease-out; }
      .hl em { position:absolute; left:2px; top:2px; max-width:calc(100% - 4px); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; background:var(--primary); color:var(--on-primary); font:600 11px/1 ui-sans-serif, system-ui, sans-serif; font-style:normal; padding:4px 7px; border-radius:4px; }
      .hl em small { font-weight:500; opacity:.8; margin-left:6px; font-size:10px; }
      /* Above the box when there is room, so it never covers what you are pointing at. */
      .hl.above em { top:auto; bottom:calc(100% + 3px); left:-2px; max-width:none; }
      .hl.reading { animation: plpulse .8s ease-in-out infinite alternate; }
      @keyframes plpulse { from { background:color-mix(in srgb, var(--primary) 8%, transparent); } to { background:color-mix(in srgb, var(--primary) 24%, transparent); } }
      @media (prefers-reduced-motion: reduce) { .hl.glide { transition:none; } .hl.reading { animation:none; } }
      .sel { position:fixed; border:2px solid var(--primary); border-radius:6px; pointer-events:none; box-shadow:0 0 0 4000px rgba(0,0,0,.08); }
      .sel span { position:absolute; left:-2px; top:-24px; background:var(--primary); color:var(--on-primary); font:600 11px/1 ui-sans-serif, system-ui, sans-serif; padding:5px 8px; border-radius:6px 6px 0 0; white-space:nowrap; }
      /* Labels sit inside their own box: above or below it they would overlap the next section. */
      .sel span { top:2px; left:2px; border-radius:4px; }
      .bar { position:fixed; left:50%; top:12px; transform:translateX(-50%); background:var(--bg); border:1px solid var(--border); box-shadow:0 8px 30px rgba(0,0,0,.18); border-radius:999px; padding:10px 18px; pointer-events:none; display:none; color:var(--muted); font-size:13px; max-width:calc(100vw - 24px); }
      .picking .bar { display:block; }
      .bar b { color:var(--fg); font-weight:600; }
      .toast { position:fixed; left:50%; bottom:24px; transform:translateX(-50%); display:flex; align-items:center; gap:8px; background:var(--fg); color:var(--bg); padding:10px 16px; border-radius:999px; box-shadow:0 10px 30px rgba(0,0,0,.25); pointer-events:none; transition:opacity .3s ease; }
      .toast svg { width:16px; height:16px; color:#22c55e; }
      .toast.bad svg { color:#ef4444; }
      .rec { position:fixed; left:50%; top:12px; transform:translateX(-50%); display:none; align-items:center; gap:8px; background:var(--bg); border:1px solid var(--border); box-shadow:0 8px 30px rgba(0,0,0,.18); border-radius:999px; padding:10px 18px; pointer-events:none; color:var(--fg); font-size:13px; }
      .recording .rec { display:flex; }
      .rec i { width:10px; height:10px; border-radius:50%; background:#ef4444; animation: plblink 1s steps(2) infinite; }
      @keyframes plblink { 50% { opacity:.2; } }
      @media (prefers-reduced-motion: reduce) { .rec i { animation:none; } }
      .capturing .rec,
      .capturing .hl, .capturing .box, .capturing .bar, .capturing .sel, .capturing .toast { display:none !important; }
    </style>
    <div class="t">
      <div class="shield"></div>
      <div class="sels"></div>
      <div class="hl"><em></em></div>
      <div class="box"></div>
      <div class="bar" role="status"></div>
      <div class="rec" role="status"><i></i><span><b>Recording.</b> Scroll or click on the page.</span></div>
    </div>`;
    (document.body || document.documentElement).appendChild(host);

    const $ = (s) => root.querySelector(s);
    const t = $('.t'); const shield = $('.shield'); const hl = $('.hl'); const box = $('.box'); const sels = $('.sels');
    let picking = false; let current = null; let start = null; let dragging = false; let busy = false;
    let selections = []; // [{ pickId, docRect }]
    let raf = 0;
    let locked = false; // after a pick: no hover highlight until the pick is clicked again
    let sectionMode = false; // choosing whole sections (Color scheme / Format): click to add, click again to remove
    const BAR_SECTIONS = 'Click a <b>section</b> or <b>drag</b> over any area · <b>↑ ↓</b> bigger or smaller · click again to remove';
    const BAR_FREE = '<b>Click</b> the element you want · <b>↑ ↓</b> bigger or smaller · <b>Esc</b> to stop';
    const BAR_LOCKED = 'Click <b>your pick</b> again to choose inside it, or click <b>something else</b>';
    const bar = $('.bar');
    bar.innerHTML = BAR_FREE;
    function setLocked(on) { locked = on && !sectionMode; bar.innerHTML = sectionMode ? BAR_SECTIONS : locked ? BAR_LOCKED : BAR_FREE; if (locked) { hl.style.display = 'none'; current = null; } }
    /** What a click on `el` means: in section mode its whole section; otherwise a letter/word span
     *  that looks like its neighbours means the whole text. */
    const target = (el) => {
      const L = globalThis.__PromptLift;
      if (!el || !L) return el;
      return sectionMode && L.sectionOf ? L.sectionOf(el) : L.wholeText ? L.wholeText(el) : el;
    };
    function setSectionMode(on) { sectionMode = !!on; setLocked(false); }

    /** Section mode: add the section to the panel's list, or take it off if it is already there. */
    async function toggleSection(el) {
      if (busy || !el) return;
      busy = true;
      try {
        const have = el.getAttribute('data-pl-pick');
        if (have && selections.some((s) => s.pickId === have)) {
          await chrome.runtime.sendMessage({ type: 'promptlift:section', remove: have });
          return;
        }
        const r = el.getBoundingClientRect();
        const shot = await screenshot(r);
        const pickId = 'p' + Date.now().toString(36);
        el.setAttribute('data-pl-pick', pickId);
        const ack = await chrome.runtime.sendMessage({ type: 'promptlift:section', add: { pickId, path: pathTo(el), sel: { pickId }, name: globalThis.__PromptLift.sectionName(el), shot, url: location.href } });
        if (!ack?.ok) toast('Open PromptLift to choose sections.', false);
      } catch (err) {
        console.error('[PromptLift] section pick failed', err);
        toast("Couldn't add that section. Try again.", false);
      } finally {
        busy = false;
      }
    }
    /** A dragged area that covers several things (sections side by side, part of a section):
     *  each thing gets its own mark, the outline goes around all of them. */
    async function addGroup(sel) {
      if (busy) return;
      busy = true;
      try {
        const rs = sel.els.map((e) => e.getBoundingClientRect());
        const u = { left: Math.min(...rs.map((r) => r.left)), top: Math.min(...rs.map((r) => r.top)), right: Math.max(...rs.map((r) => r.right)), bottom: Math.max(...rs.map((r) => r.bottom)) };
        const shot = await screenshot({ left: u.left, top: u.top, width: u.right - u.left, height: u.bottom - u.top });
        const pickId = 'g' + Date.now().toString(36);
        // A section chosen on its own that is now part of the group: take it off first.
        for (const e of sel.els) {
          const had = e.getAttribute('data-pl-pick');
          if (had && selections.some((x) => x.pickId === had)) await chrome.runtime.sendMessage({ type: 'promptlift:section', remove: had }).catch(() => {});
        }
        const pickIds = sel.els.map((e, i) => { const id = `${pickId}-${i}`; e.setAttribute('data-pl-pick', id); return id; });
        const L = globalThis.__PromptLift;
        const names = sel.els.map((e) => L.sectionName(e).replace(/^Section: /, ''));
        const name = sel.kind === 'span' ? `${names.join(' + ')} (together)` : `Part of ${L.sectionName(L.sectionOf(sel.els[0].parentElement || sel.els[0])).replace(/^Section: /, '')} (${sel.els.length} pieces)`;
        const docRect = { left: u.left + scrollX, top: u.top + scrollY, width: u.right - u.left, height: u.bottom - u.top };
        const ack = await chrome.runtime.sendMessage({ type: 'promptlift:section', add: { pickId, pickIds, group: sel.kind, path: pathTo(sel.els[0]), sel: { docRect, pickId }, name, shot, url: location.href } });
        if (!ack?.ok) toast('Open PromptLift to choose sections.', false);
      } catch (err) {
        console.error('[PromptLift] area pick failed', err);
        toast("Couldn't add that area. Try again.", false);
      } finally {
        busy = false;
      }
    }
    /** The chosen group (if any) whose outline holds this point. */
    function groupAt(x, y) {
      return selections.find((s) => s.docRect && s.pickId?.startsWith('g') && (() => { const r = selRect(s); return x >= r.left && x <= r.left + r.width && y >= r.top && y <= r.top + r.height; })());
    }

    function insidePick(x, y) {
      // From the selection itself, not its outline node (that is hidden while screenshots are taken).
      const r = selections[0] && selRect(selections[0]);
      return !!r && x >= r.left && x <= r.left + r.width && y >= r.top && y <= r.top + r.height;
    }

    function elementAt(x, y) {
      shield.style.pointerEvents = 'none';
      const el = document.elementFromPoint(x, y);
      shield.style.pointerEvents = 'auto';
      return el && el !== host ? el : null;
    }
    function place(node, r) { Object.assign(node.style, { display: 'block', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' }); }
    const hlLabel = hl.querySelector('em');
    /** What the highlight is on, in plain words: "Card 360 × 220", "Heading (h2)". */
    function nameOf(el) {
      const L = globalThis.__PromptLift;
      const kind = L?.kindOf ? L.kindOf(el) : '';
      const tag = el.tagName.toLowerCase();
      const word = { heading: `Heading (${tag})`, button: 'Button', card: 'Card', image: 'Picture', section: 'Section', header: 'Top bar', footer: 'Bottom bar', nav: 'Menu', link: 'Link', 'nav link': 'Menu link', input: 'Input box', badge: 'Tag', text: 'Text' }[kind];
      return word || FRIENDLY[tag] || 'Box';
    }
    function highlight(el) {
      current = el;
      if (!el) { hl.style.display = 'none'; hl.classList.remove('glide'); return; }
      const r = el.getBoundingClientRect();
      // Glide only from one element to the next; appearing after being hidden is instant.
      hl.classList.toggle('glide', hl.style.display === 'block');
      place(hl, r);
      hl.classList.toggle('above', r.top > 26);
      hlLabel.textContent = sectionMode ? (globalThis.__PromptLift?.sectionName?.(el) || 'Section').replace(/^Section: /, '') : nameOf(el);
      const size = document.createElement('small');
      size.textContent = `${Math.round(r.width)} × ${Math.round(r.height)}`;
      hlLabel.append(size);
    }
    const regionFrom = (e) => ({ left: Math.min(start.x, e.clientX), top: Math.min(start.y, e.clientY), width: Math.abs(e.clientX - start.x), height: Math.abs(e.clientY - start.y) });

    let lastPt = null;
    let scrollRaf = 0;
    window.addEventListener('scroll', () => {
      if (!picking || locked || dragging || !lastPt || scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0;
        const el = target(elementAt(lastPt.x, lastPt.y));
        if (el) { hl.classList.remove('glide'); highlight(el); }
      });
    }, { passive: true, capture: true });

    shield.addEventListener('mousedown', (e) => { if (e.button !== 0 || busy) return; e.preventDefault(); start = { x: e.clientX, y: e.clientY }; dragging = false; });
    shield.addEventListener('mousemove', (e) => {
      // Dragging out an area only makes sense when choosing screen portions.
      if (sectionMode && start && !dragging && Math.hypot(e.clientX - start.x, e.clientY - start.y) > DRAG_THRESHOLD) { dragging = true; hl.style.display = 'none'; }
      if (dragging) { place(box, regionFrom(e)); return; }
      lastPt = { x: e.clientX, y: e.clientY };
      if (locked || busy) return;
      const el = target(elementAt(e.clientX, e.clientY));
      if (el && el !== current) highlight(el);
    });
    shield.addEventListener('mouseup', (e) => {
      if (!start) return;
      const r = dragging ? regionFrom(e) : null;
      start = null; dragging = false; box.style.display = 'none';
      if (sectionMode) {
        if (r && r.width >= 20 && r.height >= 20) {
          const sel = globalThis.__PromptLift.areaSelection({ left: r.left, top: r.top, right: r.left + r.width, bottom: r.top + r.height });
          if (sel.kind === 'one') toggleSection(sel.el); else addGroup(sel);
          return;
        }
        // A click inside a chosen group takes the whole group off.
        const g = groupAt(e.clientX, e.clientY);
        if (g) { chrome.runtime.sendMessage({ type: 'promptlift:section', remove: g.pickId }).catch(() => {}); return; }
        // ↑ ↓ may have changed what is highlighted: pick that.
        toggleSection(current || target(elementAt(e.clientX, e.clientY)));
        return;
      }
      if (r && r.width >= 20 && r.height >= 20) { captureRegion(r); return; }
      if (locked) {
        if (insidePick(e.clientX, e.clientY)) { setLocked(false); highlight(target(elementAt(e.clientX, e.clientY))); return; }
        const el = target(elementAt(e.clientX, e.clientY));
        if (el) captureElement(el);
        return;
      }
      // No hover outline yet (the page just scrolled, or the pointer didn't move): pick what is under it.
      const el = current || target(elementAt(e.clientX, e.clientY));
      if (el) captureElement(el);
    });
    shield.addEventListener('mouseleave', () => { if (!busy) { hl.style.display = 'none'; current = null; } lastPt = null; });

    function onKey(e) {
      if (!picking) return;
      const stop = () => { e.preventDefault(); e.stopPropagation(); };
      if (e.key === 'Escape') { stop(); stopPicking(true); return; }
      if (!current) return;
      // Bigger / smaller, skipping wrappers that have exactly the same box (they would look like nothing happened).
      const same = (a, b) => { const x = a.getBoundingClientRect(), y = b.getBoundingClientRect(); return Math.abs(x.left - y.left) < 1 && Math.abs(x.top - y.top) < 1 && Math.abs(x.width - y.width) < 1 && Math.abs(x.height - y.height) < 1; };
      if (e.key === 'ArrowUp') {
        stop();
        let n = current.parentElement;
        while (n && n !== document.body && same(n, current)) n = n.parentElement;
        if (n && n !== document.documentElement && n !== document.body) highlight(n);
      }
      if (e.key === 'ArrowDown') {
        stop();
        let n = current.firstElementChild;
        while (n && same(n, current) && n.firstElementChild) n = n.firstElementChild;
        if (n && n.getBoundingClientRect().width > 0) highlight(n);
      }
      if (e.key === 'Enter') { stop(); captureElement(current); }
    }
    document.addEventListener('keydown', onKey, true);

    function startPicking() { picking = true; t.classList.add('picking'); }
    function stopPicking(byUser) {
      picking = false; t.classList.remove('picking'); hl.style.display = 'none'; box.style.display = 'none'; current = null;
      if (byUser) chrome.runtime.sendMessage({ type: 'promptlift:pickingStopped' }).catch(() => {});
    }

    // ---------- selection boxes (follow scrolling) ----------

    function showSelection(list) {
      selections = list || [];
      if (!selections.length && locked) setLocked(false);
      sels.replaceChildren(...selections.map((s) => { const d = document.createElement('div'); d.className = 'sel'; const t = document.createElement('span'); t.textContent = s.label || 'Your pick'; d.append(t); return d; }));
      cancelAnimationFrame(raf);
      if (selections.length) loop();
    }
    function selRect(s) {
      if (s.docRect) return { left: s.docRect.left - scrollX, top: s.docRect.top - scrollY, width: s.docRect.width, height: s.docRect.height };
      const el = s.pickId && document.querySelector(`[data-pl-pick="${s.pickId}"]`);
      return el ? el.getBoundingClientRect() : null;
    }
    function loop() {
      selections.forEach((s, i) => {
        const node = sels.children[i];
        const r = selRect(s);
        if (!r) { node.style.display = 'none'; return; }
        node.style.display = 'block';
        node.classList.toggle('below', r.top < 30);
        Object.assign(node.style, { left: r.left - 3 + 'px', top: r.top - 3 + 'px', width: r.width + 6 + 'px', height: r.height + 6 + 'px' });
      });
      raf = requestAnimationFrame(loop);
    }

    // ---------- capture ----------
    // Counted, so overlapping screenshot jobs can't un-hide the overlay too early.
    let capturingCount = 0;
    const setCapturing = (on) => { capturingCount = Math.max(0, capturingCount + (on ? 1 : -1)); t.classList.toggle('capturing', capturingCount > 0); };

    const nextFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    async function settle(els) {
      const longest = els.slice(0, 40).reduce((max, n) => {
        const cs = getComputedStyle(n);
        const d = cs.transitionDuration.split(',').map(parseFloat);
        const dl = cs.transitionDelay.split(',').map(parseFloat);
        return Math.max(max, ...d.map((x, i) => (x + (dl[i] || 0)) * 1000));
      }, 0);
      await nextFrame();
      await sleep(Math.min(longest, 1200) + 30);
    }

    async function screenshot(r) {
      try {
        setCapturing(true);
        await nextFrame();
        const res = await chrome.runtime.sendMessage({ type: 'promptlift:capture' });
        if (!res?.ok) throw new Error(res?.error || 'capture failed');
        const bmp = await createImageBitmap(await (await fetch(res.dataUrl)).blob());
        const scale = bmp.width / innerWidth;
        if (Math.abs(bmp.width / bmp.height - innerWidth / innerHeight) > 0.05) throw new Error('captured a different tab');
        const x = Math.max(0, r.left) * scale; const y = Math.max(0, r.top) * scale;
        const w = Math.min(r.width, innerWidth - Math.max(0, r.left)) * scale;
        const h = Math.min(r.height, innerHeight - Math.max(0, r.top)) * scale;
        if (w < 2 || h < 2) return null;
        const k = Math.min(1, 1600 / w);
        const canvas = new OffscreenCanvas(Math.round(w * k), Math.round(h * k));
        canvas.getContext('2d').drawImage(bmp, x, y, w, h, 0, 0, canvas.width, canvas.height);
        const blob = await canvas.convertToBlob({ type: 'image/png' });
        return await new Promise((res2, rej) => { const fr = new FileReader(); fr.onload = () => res2(fr.result); fr.onerror = rej; fr.readAsDataURL(blob); });
      } catch (err) {
        console.warn('[PromptLift] screenshot failed', err);
        return null;
      } finally {
        setCapturing(false);
      }
    }

    const FRIENDLY = { h1: 'Main heading', h2: 'Heading', h3: 'Heading', p: 'Text', a: 'Link', button: 'Button', img: 'Picture', section: 'Section', header: 'Top bar', footer: 'Bottom bar', nav: 'Menu', input: 'Input box', form: 'Form', li: 'List item', ul: 'List', span: 'Text', div: 'Box', svg: 'Icon' };
    const clipRect = (r) => { const left = Math.max(0, r.left); const top = Math.max(0, r.top); return { left, top, width: Math.min(r.left + r.width, innerWidth) - left, height: Math.min(r.top + r.height, innerHeight) - top }; };

    /** Stable CSS path so the same element can be re-picked after a reload. */
    function pathTo(el) {
      const parts = [];
      for (let n = el; n && n.nodeType === 1 && n !== document.documentElement; n = n.parentElement) {
        if (n.id && /^[A-Za-z][\w-]*$/.test(n.id)) { parts.unshift(`#${n.id}`); break; }
        const same = [...(n.parentElement?.children || [])].filter((c) => c.tagName === n.tagName);
        parts.unshift(`${n.tagName.toLowerCase()}${same.length > 1 ? `:nth-of-type(${same.indexOf(n) + 1})` : ''}`);
      }
      return parts.join(' > ');
    }

    /** Right after a click: the box pulses, the bar and the panel say it's being read. */
    function showReading(el) {
      if (el) { hl.classList.remove('glide'); highlight(el); hl.classList.add('reading'); }
      bar.innerHTML = `Reading <b>${el ? nameOf(el) : 'the area'}</b>…`;
      chrome.runtime.sendMessage({ type: 'promptlift:reading', title: el ? nameOf(el) : 'An area' }).catch(() => {});
    }
    function endReading() { hl.classList.remove('reading'); hl.style.display = 'none'; }

    async function captureElement(el) {
      if (busy) return;
      showReading(el);
      await run(async () => {
        await settle([el, ...el.querySelectorAll('*')]);
        const r = el.getBoundingClientRect();
        const image = await screenshot(r);
        const items = await globalThis.__PromptLift.itemsForElement(el);
        const pickId = 'p' + Date.now().toString(36);
        document.querySelectorAll('[data-pl-pick]').forEach((n) => { if (!selections.some((s) => s.pickId === n.getAttribute('data-pl-pick'))) n.removeAttribute('data-pl-pick'); });
        el.setAttribute('data-pl-pick', pickId);
        return { pickId, path: pathTo(el), sel: { pickId }, title: FRIENDLY[el.tagName.toLowerCase()] || 'Something', items, image, shotRect: clipRect(r) };
      });
    }

    async function captureRegion(r) {
      if (busy) return;
      showReading(null);
      await run(async () => {
        await settle([]);
        const image = await screenshot(r);
        const region = { left: r.left, top: r.top, right: r.left + r.width, bottom: r.top + r.height };
        const items = await globalThis.__PromptLift.itemsForRegion(region);
        const rootEl = globalThis.__PromptLift.regionRoot(region);
        const pickId = 'p' + Date.now().toString(36);
        rootEl.setAttribute('data-pl-pick', pickId);
        return { pickId, path: pathTo(rootEl), sel: { docRect: { left: r.left + scrollX, top: r.top + scrollY, width: r.width, height: r.height } }, title: 'An area', items, image, shotRect: clipRect(r) };
      });
    }

    async function run(job) {
      if (busy) return;
      busy = true;
      try {
        const res = await job();
        showSelection([res.sel]);
        setLocked(true);
        const ack = await chrome.runtime.sendMessage({ type: 'promptlift:picked', pick: { pickId: res.pickId, path: res.path, sel: res.sel, title: res.title, items: res.items, screenshot: res.image, shotRect: res.shotRect, url: location.href, at: Date.now() } });
        if (!ack?.ok) throw new Error(ack?.error || 'The PromptLift panel did not get it.');
        if (!ack.panelOpen) toast('Got it. Open PromptLift to see it.', true);
      } catch (err) {
        console.error('[PromptLift] pick failed', err);
        toast("Couldn't read that part. Try another.", false);
        setLocked(false);
        chrome.runtime.sendMessage({ type: 'promptlift:readingFailed' }).catch(() => {});
      } finally {
        busy = false;
        endReading();
      }
    }

    function toast(text, ok) {
      const el = document.createElement('div');
      el.className = 'toast' + (ok ? '' : ' bad');
      el.innerHTML = ok
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg><span></span>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg><span></span>';
      el.querySelector('span').textContent = text;
      t.appendChild(el);
      setTimeout(() => { el.style.opacity = '0'; }, 2200);
      setTimeout(() => el.remove(), 2600);
    }

    function pickByPath(path) {
      let target = null;
      try { target = document.querySelector(path); } catch { /* invalid path */ }
      if (target) { target.scrollIntoView({ block: 'center', behavior: 'instant' }); setTimeout(() => captureElement(target), 300); }
    }

    function destroy() { stopPicking(false); cancelAnimationFrame(raf); document.removeEventListener('keydown', onKey, true); host.remove(); globalThis.__plUI = null; }

    function setRecording(on) { t.classList.toggle('recording', !!on); }

    return { v: UI_VERSION, setRecording, setSectionMode, startPicking, stopPicking, showSelection, setCapturing, clearSelection: () => showSelection([]), pickByPath, destroy, isPicking: () => picking };
  }
})();
