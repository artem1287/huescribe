// Huescribe on-page UI (isolated world). Injected after motion.js, analyzer.js and prompts.js.
//  - Picking mode (on by default): hover highlights, click picks an element, drag picks an area.
//    It stays on after a pick so the user can switch to something else; Esc pauses it.
//    After a pick the hover highlight is locked: clicking the pick again unlocks it, clicking
//    anything else picks that directly. Look-alike letter/word spans are picked as one text.
//  - Selection boxes: the picked rectangle(s) stay outlined while the user edits, following scroll.
// Picks (items + cropped screenshot) go to the panel through the service worker.
// Everything lives in one Shadow DOM host so page CSS can't leak in.

(() => {
  const auto = globalThis.__huescribeAutoPick;
  globalThis.__huescribeAutoPick = null;

  const UI_VERSION = 14;
  if (globalThis.__plUI && globalThis.__plUI.v !== UI_VERSION) globalThis.__plUI.destroy();
  if (!globalThis.__plUI || !document.getElementById('__huescribe-root')) globalThis.__plUI = createUI();
  const ui = globalThis.__plUI;
  ui.startPicking();
  if (auto) ui.pickByPath(auto);

  function createUI() {
    document.getElementById('__huescribe-root')?.remove();
    const DRAG_THRESHOLD = 6;
    const host = document.createElement('div');
    host.id = '__huescribe-root';
    host.style.cssText = 'all:initial;position:fixed;inset:0;pointer-events:none;z-index:2147483647;';
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `
    <style>
      * { box-sizing: border-box; }
      .t { --bg:#ffffff; --fg:#0a0a0a; --muted:#71717a; --border:#e4e4e7; --primary:#5b6f2a; --on-primary:#151515; --label:#b9d96a; --ease:cubic-bezier(.16,1,.3,1);
           --glass:color-mix(in srgb, #ffffff 80%, transparent); --kbd:#f4f4f5;
           --float: 0 0 0 1px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.06), 0 10px 30px -6px rgba(0,0,0,.22);
           font: 14px/1.45 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: var(--fg);
           -webkit-font-smoothing: antialiased; font-variant-numeric: tabular-nums; }
      @media (prefers-color-scheme: dark) { .t { --bg:#09090b; --fg:#fafafa; --muted:#a1a1aa; --border:#27272a; --primary:#c6e383;
           --glass:color-mix(in srgb, #09090b 78%, transparent); --kbd:#18181b;
           --float: 0 0 0 1px rgba(255,255,255,.08), 0 1px 2px rgba(0,0,0,.4), 0 12px 32px -6px rgba(0,0,0,.6); } }
      .t kbd { display:inline-grid; place-items:center; min-width:20px; height:20px; padding:0 5px; margin:0 1px; font:600 11px/1 ui-sans-serif, system-ui, sans-serif; color:var(--fg); background:var(--kbd); border:1px solid var(--border); border-bottom-width:2px; border-radius:5px; }
      .t .sep { opacity:.4; margin:0 6px; }
      .shield { position:fixed; inset:0; cursor:crosshair; pointer-events:auto; display:none; }
      .picking .shield { display:block; }
      .hl, .box { position:fixed; left:0; top:0; contain:layout style; border:1.5px solid var(--primary); background:color-mix(in srgb, var(--primary) 8%, transparent); border-radius:6px; pointer-events:none; display:none;
             box-shadow:0 0 0 4px color-mix(in srgb, var(--primary) 12%, transparent); }
      .box { border-style:dashed; }
      /* The highlight glides from one element to the next instead of jumping. */
      .hl.glide { transition: transform .12s var(--ease), width .12s var(--ease), height .12s var(--ease); }
      .hl em { position:absolute; left:2px; top:2px; max-width:calc(100% - 4px); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; background:var(--primary); color:var(--on-primary); font:600 11px/1 ui-sans-serif, system-ui, sans-serif; font-style:normal; padding:5px 8px; border-radius:6px; box-shadow:0 1px 2px rgba(0,0,0,.2), 0 4px 10px -2px color-mix(in srgb, var(--primary) 50%, transparent); }
      .hl em small { font-weight:500; opacity:.75; margin-left:7px; font-size:10px; }
      /* Above the box when there is room, so it never covers what you are pointing at. */
      .hl.above em { top:auto; bottom:calc(100% + 6px); left:-1.5px; max-width:none; }
      .hl::after { content:''; position:absolute; inset:0; border-radius:inherit; background:color-mix(in srgb, var(--primary) 16%, transparent); opacity:0; }
      .hl.reading::after { animation: plpulse .8s ease-in-out infinite alternate; }
      @keyframes plpulse { to { opacity:1; } }
      @media (prefers-reduced-motion: reduce) { .hl.glide { transition:none; } .hl.reading::after, .sel, .picking .bar, .toast { animation:none; } }
      .sel { position:fixed; left:0; top:0; contain:layout style; border:1.5px solid var(--primary); border-radius:8px; pointer-events:none; box-shadow:0 0 0 4px color-mix(in srgb, var(--primary) 14%, transparent), 0 0 0 4000px rgba(0,0,0,.08); animation: plsel .24s var(--ease); }
      @keyframes plsel { from { opacity:0; } }
      .sel span { position:absolute; left:-2px; top:-24px; background:var(--primary); color:var(--on-primary); font:600 11px/1 ui-sans-serif, system-ui, sans-serif; padding:5px 8px; border-radius:6px 6px 0 0; white-space:nowrap; }
      /* Labels sit inside their own box: above or below it they would overlap the next section. */
      /* …in the top-right corner, where content rarely starts. */
      .sel span { top:6px; left:auto; right:6px; border-radius:6px; padding:5px 8px; box-shadow:0 1px 2px rgba(0,0,0,.2); }
      .bar { position:fixed; left:50%; top:12px; transform:translateX(-50%); background:var(--glass); -webkit-backdrop-filter:blur(16px) saturate(1.8); backdrop-filter:blur(16px) saturate(1.8); box-shadow:var(--float); border-radius:999px; padding:8px 16px; pointer-events:none; display:none; color:var(--muted); font-size:12.5px; line-height:20px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:calc(100vw - 24px); }
      .picking .bar { display:block; animation: plbar .22s var(--ease); }
      @keyframes plbar { from { opacity:0; transform:translate(-50%, -6px); } }
      .bar b { color:var(--fg); font-weight:600; }
      .toast { position:fixed; left:50%; bottom:24px; transform:translateX(-50%); display:flex; align-items:center; gap:8px; background:var(--fg); color:var(--bg); padding:10px 16px; border-radius:999px; box-shadow:var(--float); pointer-events:none; transition:opacity .3s ease; font-size:13px; font-weight:500; animation: pltoast .24s var(--ease); }
      @keyframes pltoast { from { opacity:0; transform:translate(-50%, 8px) scale(.98); } }
      .toast svg { width:16px; height:16px; color:#22c55e; }
      .toast.bad svg { color:#ef4444; }
      .rec { position:fixed; left:50%; top:12px; transform:translateX(-50%); display:none; align-items:center; gap:8px; background:var(--glass); -webkit-backdrop-filter:blur(16px) saturate(1.8); backdrop-filter:blur(16px) saturate(1.8); box-shadow:var(--float); border-radius:999px; padding:8px 16px; pointer-events:none; color:var(--fg); font-size:13px; }
      .recording .rec { display:flex; }
      .rec i { width:10px; height:10px; border-radius:50%; background:#ef4444; animation: plblink 1s steps(2) infinite; }
      @keyframes plblink { 50% { opacity:.2; } }
      @media (prefers-reduced-motion: reduce) { .rec i { animation:none; } }
      .capturing .rec,
      /* v9.4: labels use the website's green fill with ink text; outlines the darker green */
      .hl em, .sel span, .tc b { background:var(--label) !important; color:#151515 !important; }
      .tc i { background:var(--label) !important; }
      .capturing .hl, .capturing .box, .capturing .bar, .capturing .sel, .capturing .toast, .capturing .tc { display:none !important; }
      /* Pointer test (9.3): a cursor that glides onto the pick, presses it and moves away. */
      .tc { position:fixed; left:0; top:0; width:24px; height:24px; display:none; opacity:0; pointer-events:none; transition:transform .55s cubic-bezier(.16,1,.3,1), opacity .2s ease; }
      .tc.on { display:block; }
      .tc.shown { opacity:1; }
      .tc svg { position:relative; width:24px; height:24px; filter:drop-shadow(0 2px 3px rgba(0,0,0,.35)); transform-origin:4px 3px; transition:transform .15s ease; }
      .tc.down svg { transform:scale(.82); }
      .tc i { position:absolute; left:-10px; top:-10px; width:28px; height:28px; border-radius:50%; background:var(--primary); opacity:0; transform:scale(.4); }
      .tc.down i { animation:plpress .5s ease-out; }
      @keyframes plpress { from { opacity:.45; transform:scale(.4); } to { opacity:0; transform:scale(1.6); } }
      .tc b { position:absolute; left:26px; top:18px; white-space:nowrap; font:600 11px/1 ui-sans-serif, system-ui, sans-serif; color:var(--on-primary); background:var(--primary); padding:5px 8px; border-radius:6px; box-shadow:0 1px 2px rgba(0,0,0,.2); }
      @media (prefers-reduced-motion: reduce) { .tc { transition:opacity .2s ease; } .tc svg { transition:none; } .tc.down i { animation:none; } }
    </style>
    <div class="t">
      <div class="shield"></div>
      <div class="sels"></div>
      <div class="hl"><em></em></div>
      <div class="box"></div>
      <div class="bar" role="status"></div>
      <div class="rec" role="status"><i></i><span>${t('<b>Recording.</b> Scroll or click on the page.')}</span></div>
      <div class="tc" aria-hidden="true"><i></i><svg viewBox="0 0 24 24"><path d="M4 2l15 8.5-6.5 1.6L9.6 19z" fill="#111" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg><b>${t('Testing hover')}</b></div>
    </div>`;
    (document.body || document.documentElement).appendChild(host);

    const $ = (s) => root.querySelector(s);
    const shell = $('.t'); const shield = $('.shield'); const hl = $('.hl'); const box = $('.box'); const sels = $('.sels');
    let picking = false; let current = null; let start = null; let dragging = false; let busy = false;
    let selections = []; // [{ pickId, docRect }]
    let raf = 0;
    let locked = false; // after a pick: no hover highlight until the pick is clicked again
    let sectionMode = false; // choosing whole sections (Color scheme / Format): click to add, click again to remove
    // One way of picking for everything: click a thing, ↑ ↓ up to a whole section, drag over any area.
    const SEP = '<span class="sep">·</span>';
    const BAR_SECTIONS = `${t('<kbd>Click</kbd> anything')} ${SEP} ${t('<kbd>↑</kbd><kbd>↓</kbd> bigger or smaller, up to a whole section')} ${SEP} ${t('<kbd>Drag</kbd> over any area')}`;
    const BAR_FREE = `${BAR_SECTIONS} ${SEP} ${t('<kbd>Esc</kbd> to stop')}`;
    const BAR_LOCKED = t('Click <b>your pick</b> again to choose inside it, or click <b>something else</b>');
    const bar = $('.bar');
    bar.innerHTML = BAR_FREE;
    function setLocked(on) { locked = on && !sectionMode; bar.innerHTML = sectionMode ? BAR_SECTIONS : locked ? BAR_LOCKED : BAR_FREE; if (locked) { hl.style.display = 'none'; current = null; } }
    /** What a click on `el` means: in section mode its whole section; otherwise a letter/word span
     *  that looks like its neighbours means the whole text. */
    const target = (el) => {
      const L = globalThis.__Huescribe;
      if (!el || !L) return el;
      return sectionMode && L.sectionOf ? L.sectionOf(el) : L.wholeText ? L.wholeText(el) : el;
    };
    function setSectionMode(on) { sectionMode = !!on; setLocked(false); }

    /** A click: a whole section (reached by clicking it or with ↑) is picked as a section; anything else as itself. */
    function pickThing(el) {
      if (!el) return;
      if (globalThis.__Huescribe?.isSection?.(el)) toggleSection(el); else captureElement(el);
    }
    /** Pick a whole section (one pick at a time, like any other pick). */
    async function toggleSection(el) {
      if (busy || !el) return;
      busy = true;
      try {
        showReading(el);
        const r = el.getBoundingClientRect();
        const shot = await screenshot(r);
        const pickId = 'p' + Date.now().toString(36);
        el.setAttribute('data-pl-pick', pickId);
        const ack = await chrome.runtime.sendMessage({ type: 'huescribe:section', add: { pickId, path: pathTo(el), sel: { pickId }, name: globalThis.__Huescribe.sectionName(el), shot, url: location.href } });
        if (!ack?.ok) toast(t('Open Huescribe to choose sections.'), false);
        else { showSelection([{ pickId }]); setLocked(true); }
      } catch (err) {
        console.error('[Huescribe] section pick failed', err);
        toast(t("Couldn't read that section. Try another."), false);
        chrome.runtime.sendMessage({ type: 'huescribe:readingFailed' }).catch(() => {});
      } finally {
        busy = false;
        endReading();
      }
    }
    /** A dragged area that covers several things (sections side by side, part of a section):
     *  each thing gets its own mark, the outline goes around all of them. */
    async function addGroup(sel) {
      if (busy) return;
      busy = true;
      showReading(null);
      try {
        const rs = sel.els.map((e) => e.getBoundingClientRect());
        const u = { left: Math.min(...rs.map((r) => r.left)), top: Math.min(...rs.map((r) => r.top)), right: Math.max(...rs.map((r) => r.right)), bottom: Math.max(...rs.map((r) => r.bottom)) };
        const shot = await screenshot({ left: u.left, top: u.top, width: u.right - u.left, height: u.bottom - u.top });
        const pickId = 'g' + Date.now().toString(36);
        // A section chosen on its own that is now part of the group: take it off first.
        for (const e of sel.els) {
          const had = e.getAttribute('data-pl-pick');
          if (had && selections.some((x) => x.pickId === had)) await chrome.runtime.sendMessage({ type: 'huescribe:section', remove: had }).catch(() => {});
        }
        const pickIds = sel.els.map((e, i) => { const id = `${pickId}-${i}`; e.setAttribute('data-pl-pick', id); return id; });
        const L = globalThis.__Huescribe;
        const names = sel.els.map((e) => L.sectionName(e).replace(/^Section: /, ''));
        // The "span" name stays English: the panel parses it (" (together)") and words it itself.
        const name = sel.kind === 'span' ? `${names.join(' + ')} (together)` : tn(sel.els.length, 'Part of {name} ({n} pieces)', 'Part of {name} ({n} pieces)', { name: L.sectionName(L.sectionOf(sel.els[0].parentElement || sel.els[0])).replace(/^Section: /, '') });
        const docRect = { left: u.left + scrollX, top: u.top + scrollY, width: u.right - u.left, height: u.bottom - u.top };
        const ack = await chrome.runtime.sendMessage({ type: 'huescribe:section', add: { pickId, pickIds, group: sel.kind, path: pathTo(sel.els[0]), sel: { docRect, pickId }, name, shot, url: location.href } });
        if (!ack?.ok) toast(t('Open Huescribe to choose sections.'), false);
        else { showSelection([{ docRect, pickId }]); setLocked(true); }
      } catch (err) {
        console.error('[Huescribe] area pick failed', err);
        toast(t("Couldn't read that area. Try another."), false);
        chrome.runtime.sendMessage({ type: 'huescribe:readingFailed' }).catch(() => {});
      } finally {
        busy = false;
        endReading();
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
    /** Position with transform (cheap to animate), size with width/height. */
    function place(node, r) { Object.assign(node.style, { display: 'block', transform: `translate3d(${r.left}px, ${r.top}px, 0)`, width: r.width + 'px', height: r.height + 'px' }); }
    const hlLabel = hl.querySelector('em');
    /** What the highlight is on, in plain words: "Card 360 × 220", "Heading (h2)". */
    function nameOf(el) { return t(nameKey(el), { tag: el.tagName.toLowerCase() }); }
    /** The English name (a tk key; "Heading ({tag})" for headings), translated where shown. */
    function nameKey(el) {
      // Text that fills a heading (a span inside an h1, say) is that heading.
      const hd = el.closest?.('h1, h2, h3, h4, h5, h6');
      if (hd && hd !== el) { const a = el.getBoundingClientRect(), b = hd.getBoundingClientRect(); if (a.width * a.height >= b.width * b.height * 0.6) return hd.tagName === 'H1' ? tk('Main heading') : tk('Heading'); }
      const L = globalThis.__Huescribe;
      const kind = L?.kindOf ? L.kindOf(el) : '';
      const tag = el.tagName.toLowerCase();
      const word = { heading: tk('Heading ({tag})'), button: tk('Button'), card: tk('Card'), image: tk('Picture'), section: tk('Section'), header: tk('Top bar'), footer: tk('Bottom bar'), nav: tk('Menu'), link: tk('Link'), 'nav link': tk('Menu link'), input: tk('Input box'), badge: tk('Tag'), text: tk('Text') }[kind];
      const plain = FRIENDLY[tag];
      // A <header> that isn't page-wide is the top of a card or panel: name it by what it holds.
      if (kind === 'header' && el.getBoundingClientRect().width < innerWidth * 0.6) return boxName(el);
      return word || (plain && plain !== 'Box' ? plain : boxName(el));
    }
    /** A plain box gets a name from what it holds, so a list of picks doesn't read "Box, Box, Box". */
    function boxName(el) {
      const q = (s) => el.querySelectorAll(s).length;
      const text = (el.innerText || '').slice(0, 400);
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      // A bar pinned to the top (or the page's banner) is a top bar even if it holds a search button.
      const pinned = (cs.position === 'fixed' || cs.position === 'sticky') && r.top <= 2;
      const topStrip = r.top + scrollY < 60 && r.height < 160 && r.width >= innerWidth * 0.9 && q('a, button') >= 2;
      // A <header> inside a card is the card's top, not the page's top bar.
      if ((el.matches('header, [role=banner]') && r.width >= innerWidth * 0.6) || pinned || topStrip) return tk('Top bar');
      if (el.matches('[role=search]') || (q('input, [role=searchbox], [role=combobox]') >= 1 && q('input, [role=searchbox], [role=combobox], button, [role=button]') >= 2 && /search|where|when|who|check.?in|guests|find|destination/i.test(text + (el.querySelector('input')?.placeholder || '')))) return tk('Search bar');
      if (q('input, select, textarea') >= 1) return tk('Form');
      if (q('video')) return tk('Video');
      if (q('a') >= 4 && q('a') >= text.split(/\s+/).length / 4) return tk('Menu');
      // A piece of a card (its top row, its text area): say so, rather than "Box".
      const L = globalThis.__Huescribe;
      for (let n = el.parentElement, i = 0; n && i < 3 && L?.kindOf; n = n.parentElement, i++) {
        if (L.kindOf(n) !== 'card') continue;
        const cr = n.getBoundingClientRect();
        if (r.height < cr.height * 0.8) return Math.abs(r.top - cr.top) < 24 ? tk('Top of a card') : Math.abs(r.bottom - cr.bottom) < 24 ? tk('Bottom of a card') : tk('Part of a card');
        break;
      }
      if (q('img, picture, svg') && q('h1, h2, h3, h4, h5, h6')) return tk('Card');
      // A framed block (fill, border or rounded corners) with a picture or icon and some words is a card.
      const isFramed = (n) => { const c = getComputedStyle(n); return c.backgroundColor !== 'rgba(0, 0, 0, 0)' || c.backgroundImage !== 'none' || parseFloat(c.borderTopWidth) > 0 || parseFloat(c.borderTopLeftRadius) >= 6 || c.boxShadow !== 'none'; };
      // The frame may sit on the box itself or on a wrapper of the same size.
      const pr = el.parentElement?.getBoundingClientRect();
      const framed = isFramed(el) || (!!pr && Math.abs(pr.width - r.width) < 24 && Math.abs(pr.height - r.height) < 24 && isFramed(el.parentElement));
      if (framed && q('img, picture, svg') && text.trim().split(/\s+/).length >= 3 && r.width < 700) return tk('Card');
      if (q('img, picture') && !text.trim()) return tk('Picture');
      if (q('h1, h2, h3, h4, h5, h6, p') && !q('img, picture, video')) return tk('Text block');
      return tk('Box');
    }
    function highlight(el) {
      current = el;
      if (!el) { hl.style.display = 'none'; hl.classList.remove('glide'); return; }
      const r = el.getBoundingClientRect();
      // Glide only from one element to the next; appearing after being hidden is instant.
      hl.classList.toggle('glide', hl.style.display === 'block');
      place(hl, r);
      hl.classList.toggle('above', r.top > 26);
      const L0 = globalThis.__Huescribe;
      hlLabel.textContent = (sectionMode || L0?.isSection?.(el)) ? t('Section: {name}', { name: (L0?.sectionName?.(el) || t('Section')).replace(/^Section: /, '') }) : nameOf(el);
      const size = document.createElement('small');
      size.textContent = `${Math.round(r.width)} × ${Math.round(r.height)}`;
      hlLabel.append(size);
    }
    const regionFrom = (e) => ({ left: Math.min(start.x, e.clientX), top: Math.min(start.y, e.clientY), width: Math.abs(e.clientX - start.x), height: Math.abs(e.clientY - start.y) });

    let lastPt = null;
    let scrollRaf = 0;
    let hoverRaf = 0, dragRaf = 0, pendingDrag = null; // pointer work batched to one per frame
    window.addEventListener('scroll', () => {
      if (!picking || locked || dragging || !lastPt || scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0;
        const el = target(elementAt(lastPt.x, lastPt.y));
        if (el) { hl.classList.remove('glide'); highlight(el); }
      });
    }, { passive: true, capture: true });

    /** A click can land before the next frame: settle the highlight on what's under the pointer right now. */
    function flushHover(x, y) {
      // Only when a move is still waiting for its frame: otherwise the highlight is current (and may have been
      // grown or shrunk with the arrow keys, which must stay as it is).
      if (!hoverRaf) return;
      cancelAnimationFrame(hoverRaf); hoverRaf = 0;
      if (locked || busy) return;
      const el = target(elementAt(x, y));
      if (el && el !== current) { hl.classList.remove('glide'); highlight(el); }
    }
    shield.addEventListener('mousedown', (e) => { if (e.button !== 0 || busy) return; e.preventDefault(); flushHover(e.clientX, e.clientY); start = { x: e.clientX, y: e.clientY }; dragging = false; });
    shield.addEventListener('mousemove', (e) => {
      // Dragging out an area only makes sense when choosing screen portions.
      if (start && !dragging && Math.hypot(e.clientX - start.x, e.clientY - start.y) > DRAG_THRESHOLD) { dragging = true; hl.style.display = 'none'; }
      if (dragging) {
        pendingDrag = regionFrom(e);
        if (!dragRaf) dragRaf = requestAnimationFrame(() => { dragRaf = 0; if (dragging && pendingDrag) place(box, pendingDrag); });
        return;
      }
      lastPt = { x: e.clientX, y: e.clientY };
      if (locked || busy || hoverRaf) return;
      // Mice can report 500+ moves a second: look up what's under the pointer at most once per frame.
      hoverRaf = requestAnimationFrame(() => {
        hoverRaf = 0;
        if (locked || busy || dragging || !lastPt) return;
        const el = target(elementAt(lastPt.x, lastPt.y));
        if (el && el !== current) highlight(el);
      });
    });
    shield.addEventListener('mouseup', (e) => {
      if (!start) return;
      const r = dragging ? regionFrom(e) : null;
      start = null; dragging = false; box.style.display = 'none';
      if (sectionMode) {
        if (r && r.width >= 20 && r.height >= 20) {
          const sel = globalThis.__Huescribe.areaSelection({ left: r.left, top: r.top, right: r.left + r.width, bottom: r.top + r.height });
          if (sel.kind === 'one') toggleSection(sel.el); else addGroup(sel);
          return;
        }
        // A click inside a chosen group takes the whole group off.
        const g = groupAt(e.clientX, e.clientY);
        if (g) { chrome.runtime.sendMessage({ type: 'huescribe:section', remove: g.pickId }).catch(() => {}); return; }
        // ↑ ↓ may have changed what is highlighted: pick that.
        toggleSection(current || target(elementAt(e.clientX, e.clientY)));
        return;
      }
      // A dragged area: one thing, a section, several sections together, or part of one.
      if (r && r.width >= 20 && r.height >= 20) {
        const sel = globalThis.__Huescribe.areaSelection({ left: r.left, top: r.top, right: r.left + r.width, bottom: r.top + r.height });
        if (sel.kind !== 'one') addGroup(sel);
        else if (globalThis.__Huescribe.isSection(sel.el)) toggleSection(sel.el);
        else captureElement(sel.el);
        return;
      }
      if (locked) {
        if (insidePick(e.clientX, e.clientY)) { setLocked(false); highlight(target(elementAt(e.clientX, e.clientY))); return; }
        pickThing(target(elementAt(e.clientX, e.clientY)));
        return;
      }
      // What is under the click decides. The highlight counts only when it is that thing, or what
      // ↑ ↓ made of it (a bigger part around it, a part inside it): after scrolling with the wheel
      // the highlight may still be on something else.
      const under = target(elementAt(e.clientX, e.clientY));
      pickThing(current && under && (current === under || current.contains(under) || under.contains(current)) ? current : under || current);
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

    function startPicking() { picking = true; shell.classList.add('picking'); }
    function stopPicking(byUser) {
      picking = false; shell.classList.remove('picking'); hl.style.display = 'none'; box.style.display = 'none'; current = null;
      if (byUser) chrome.runtime.sendMessage({ type: 'huescribe:pickingStopped' }).catch(() => {});
    }

    // ---------- selection boxes (follow scrolling) ----------

    function showSelection(list) {
      selections = list || [];
      if (!selections.length && locked) setLocked(false);
      sels.replaceChildren(...selections.map((s) => { const d = document.createElement('div'); d.className = 'sel'; const lab = document.createElement('span'); lab.textContent = s.label || t('Your pick'); d.append(lab); return d; }));
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
        // Write only when the outline actually moved: an idle page then costs one measurement per frame and no style work.
        const key = `${r.left}|${r.top}|${r.width}|${r.height}`;
        if (node._plKey === key) return;
        node._plKey = key;
        Object.assign(node.style, { transform: `translate3d(${r.left - 3}px, ${r.top - 3}px, 0)`, width: r.width + 6 + 'px', height: r.height + 6 + 'px' });
      });
      raf = requestAnimationFrame(loop);
    }

    // ---------- capture ----------
    // Counted, so overlapping screenshot jobs can't un-hide the overlay too early.
    let capturingCount = 0;
    const setCapturing = (on) => { capturingCount = Math.max(0, capturingCount + (on ? 1 : -1)); shell.classList.toggle('capturing', capturingCount > 0); };

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
        const res = await chrome.runtime.sendMessage({ type: 'huescribe:capture' });
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
        console.warn('[Huescribe] screenshot failed', err);
        return null;
      } finally {
        setCapturing(false);
      }
    }

    const FRIENDLY = { h1: tk('Main heading'), h2: tk('Heading'), h3: tk('Heading'), p: tk('Text'), a: tk('Link'), button: tk('Button'), img: tk('Picture'), section: tk('Section'), header: tk('Top bar'), footer: tk('Bottom bar'), nav: tk('Menu'), input: tk('Input box'), form: tk('Form'), li: tk('List item'), ul: tk('List'), span: tk('Text'), div: tk('Box'), svg: tk('Icon') };
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
      bar.innerHTML = el ? t('Reading <b>{name}</b>…', { name: nameOf(el) }) : t('Reading <b>the area</b>…');
      chrome.runtime.sendMessage({ type: 'huescribe:reading', title: el ? nameOf(el) : t('An area') }).catch(() => {});
    }
    function endReading() { hl.classList.remove('reading'); hl.style.display = 'none'; }

    async function captureElement(el) {
      if (busy) return;
      showReading(el);
      await run(async () => {
        await settle([el, ...el.querySelectorAll('*')]);
        const r = el.getBoundingClientRect();
        const image = await screenshot(r);
        const items = await globalThis.__Huescribe.itemsForElement(el);
        const pickId = 'p' + Date.now().toString(36);
        document.querySelectorAll('[data-pl-pick]').forEach((n) => { if (!selections.some((s) => s.pickId === n.getAttribute('data-pl-pick'))) n.removeAttribute('data-pl-pick'); });
        el.setAttribute('data-pl-pick', pickId);
        return { pickId, path: pathTo(el), sel: { pickId }, title: el.tagName === 'H1' ? t('Main heading') : nameKey(el) === 'Heading ({tag})' && /^h\d$/.test(el.tagName.toLowerCase()) ? t('Heading') : nameOf(el), items, image, shotRect: clipRect(r) };
      });
    }

    async function captureRegion(r) {
      if (busy) return;
      showReading(null);
      await run(async () => {
        await settle([]);
        const image = await screenshot(r);
        const region = { left: r.left, top: r.top, right: r.left + r.width, bottom: r.top + r.height };
        const items = await globalThis.__Huescribe.itemsForRegion(region);
        const rootEl = globalThis.__Huescribe.regionRoot(region);
        const pickId = 'p' + Date.now().toString(36);
        rootEl.setAttribute('data-pl-pick', pickId);
        return { pickId, path: pathTo(rootEl), sel: { docRect: { left: r.left + scrollX, top: r.top + scrollY, width: r.width, height: r.height } }, title: t('An area'), items, image, shotRect: clipRect(r) };
      });
    }

    async function run(job) {
      if (busy) return;
      busy = true;
      try {
        const res = await job();
        showSelection([res.sel]);
        setLocked(true);
        const ack = await chrome.runtime.sendMessage({ type: 'huescribe:picked', pick: { pickId: res.pickId, path: res.path, sel: res.sel, title: res.title, items: res.items, screenshot: res.image, shotRect: res.shotRect, url: location.href, at: Date.now() } });
        if (!ack?.ok) throw new Error(ack?.error || "The Huescribe panel didn't receive it. Try again?");
        if (!ack.panelOpen) toast(t('Got it. Open Huescribe to see it.'), true);
      } catch (err) {
        console.error('[Huescribe] pick failed', err);
        toast(t("Couldn't read that part. Try another."), false);
        setLocked(false);
        chrome.runtime.sendMessage({ type: 'huescribe:readingFailed' }).catch(() => {});
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
      shell.appendChild(el);
      setTimeout(() => { el.style.opacity = '0'; }, 2200);
      setTimeout(() => el.remove(), 2600);
    }

    function pickByPath(path) {
      let target = null;
      try { target = document.querySelector(path); } catch { /* invalid path */ }
      if (target) { target.scrollIntoView({ block: 'center', behavior: 'instant' }); setTimeout(() => captureElement(target), 300); }
    }

    // Safety net: every few seconds, ask whether a Huescribe panel is still open. If not (it closed
    // while the background was asleep), or the extension was reloaded, take everything off the page.
    const watchdog = setInterval(() => {
      if (document.hidden) return;
      let req;
      try { req = chrome.runtime.sendMessage({ type: 'huescribe:panelOpen' }); } catch (err) { destroy(); return; } // extension reloaded
      req.then((r) => { if (r && r.ok && r.open === false) destroy(); })
        .catch((err) => { if (/context invalidated|Receiving end does not exist/i.test(String(err?.message || err))) destroy(); });
    }, 3000);
    function destroy() { clearInterval(watchdog); stopPicking(false); cancelAnimationFrame(raf); document.removeEventListener('keydown', onKey, true); host.remove(); globalThis.__plUI = null; }

    function setRecording(on) { shell.classList.toggle('recording', !!on); }

    /** Pointer test cursor: 'enter' (glide in from below-right), 'press', 'release', 'leave'. */
    const tc = $('.tc'); const tcLabel = tc.querySelector('b');
    let tcTimer = 0;
    let tcX = 0, tcY = 0; // where the test pointer is (it moves by transform)
    const moveTc = (x, y) => { tcX = x; tcY = y; tc.style.transform = `translate3d(${x}px, ${y}px, 0)`; };
    function testCursor(phase, r) {
      clearTimeout(tcTimer);
      if (phase === 'enter' && r) {
        const x = r.left + r.width / 2; const y = r.top + r.height / 2;
        tc.style.transition = 'none';
        moveTc(Math.min(innerWidth - 30, x + 90), Math.min(innerHeight - 30, y + 70));
        tc.classList.add('on'); void tc.offsetWidth;
        tc.style.transition = '';
        tc.classList.add('shown');
        moveTc(x, y);
        tcLabel.textContent = t('Testing hover');
      } else if (phase === 'press') {
        tc.classList.add('down'); tcLabel.textContent = t('Testing press');
      } else if (phase === 'release') {
        tc.classList.remove('down');
      } else {
        tc.classList.remove('down', 'shown');
        moveTc(tcX + 60, tcY + 50);
        tcTimer = setTimeout(() => tc.classList.remove('on'), 300);
      }
    }

    return { v: UI_VERSION, toast, setRecording, setSectionMode, startPicking, stopPicking, showSelection, setCapturing, testCursor, clearSelection: () => showSelection([]), pickByPath, destroy, isPicking: () => picking };
  }
})();
