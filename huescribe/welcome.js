/* Huescribe welcome page: learn by doing, not by reading.
   Opened once after install (background.js) and from the panel's ⋯ menu ("Practice").
   Five steps, each one a single short line plus the thing to do:
     0 pick something on the made-up site  ->  1 turn on what to take, Add  ->  2 Copy prompt (a real copy)
     3 paste it into the AI app window (a real paste) and send  ->  4 pin Huescribe, open it for real.
   While you wait, a pointer shows the next click. Nothing here talks to a server. */
(() => {
  const $ = (id) => document.getElementById(id);
  const svgNS = 'http://www.w3.org/2000/svg';
  const LOGO = 'icons/icon32.png';
  const ICON = {
    check: '<path d="M20 6 9 17l-5-5"/>',
    back: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
    puzzle: '<path d="M15.39 4.39a1 1 0 0 0 1.68-.47 2.5 2.5 0 1 1 3.01 3.01 1 1 0 0 0-.47 1.68l1.68 1.68a2.41 2.41 0 0 1 0 3.41l-1.68 1.69a1 1 0 0 1-1.68-.47 2.5 2.5 0 1 0-3.01 3.01 1 1 0 0 1 .47 1.68l-1.68 1.68a2.41 2.41 0 0 1-3.41 0l-1.69-1.68a1 1 0 0 0-1.68.47 2.5 2.5 0 1 1-3.01-3.01 1 1 0 0 0 .47-1.68l-1.68-1.69a2.41 2.41 0 0 1 0-3.41l1.68-1.68a1 1 0 0 1 1.68.47 2.5 2.5 0 1 0 3.01-3.01 1 1 0 0 1-.47-1.68l1.69-1.68a2.41 2.41 0 0 1 3.41 0z"/>',
    pin: '<path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>',
    dots: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    pointer: '<path d="M4 2l15 8.5-6.5 1.6L9.6 19z"/>',
  };
  const svg = (name, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICON[name]}</svg>`;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // What each pickable part of the made-up site can give (the words a real pick would show, and the values it reads).
  const PARTS = {
    nav: { kind: tk('Section'), name: tk('navigation bar'), has: ['colors', 'fonts', 'layout'],
      values: { colors: 'background #f8f4ec; links #6b665d; button #2a2926, text #f8f4ec', fonts: 'logo Georgia 700 17px; links Inter 12px', layout: 'one row, space-between; links 14px apart; pill button 6px 12px' } },
    head: { kind: tk('Heading'), name: tk('Simple plans for every notebook.'), has: ['colors', 'fonts', 'layout'],
      values: { colors: 'text #2a2926; lead #6b665d on #f8f4ec', fonts: 'Georgia 400 30px/1.12, letter-spacing -0.02em; lead Inter 12.5px', layout: 'left aligned; 4px between headline and lead' } },
    toggle: { kind: tk('Switch'), name: tk('Monthly / Yearly'), has: ['colors', 'layout', 'motion'],
      values: { colors: 'track #ebe7df; knob #ffffff; discount #c06a43', layout: 'two equal halves, pill, 3px inset knob', motion: 'the knob slides 250ms ease-out on click' } },
    cards: { kind: tk('Section'), name: tk('pricing cards (3 cards)'), has: ['colors', 'fonts', 'layout'],
      values: { colors: 'cards #ffffff 90%, border #ebe5da; middle card gradient #3a2f29 → #221f1c with an orange glow', fonts: 'prices Georgia 24px; text Inter 13px', layout: '3 equal columns, 12px apart; the middle one raised 6px' } },
    pro: { kind: tk('Button'), name: tk('Try Pro free'), has: ['colors', 'fonts', 'layout', 'motion'],
      values: { colors: 'background #e0835a; text #2a2926', fonts: 'Inter 600 12px', layout: 'pill, full width, 8px tall padding', motion: 'on hover: 8% brighter and 1px up in 150ms' } },
  };
  const GROUPS = [['colors', tk('Colors')], ['fonts', tk('Fonts')], ['layout', tk('Layout')], ['motion', tk('Motion')]];

  const S = { step: 0, pick: null, on: new Set(), list: [], prompt: '', idle: 0, pasted: false, sent: false };

  // ---------------------------------------------------------------- language
  async function setLang(choice) {
    try {
      await chrome.storage.local.set({ uiLang: choice, uiLangResolved: I18N.resolve(choice) });
      localStorage.setItem('huescribe.uiLang', choice);
    } catch (err) { console.warn('[Huescribe] could not save the language', err); }
    location.reload();
  }
  function langMenu() {
    const sel = $('lang');
    let choice = 'auto';
    try { choice = localStorage.getItem('huescribe.uiLang') || 'auto'; } catch { /* follow Chrome */ }
    sel.append(new Option(t("Automatic (Chrome's language)"), 'auto'));
    for (const [code, name] of I18N.LANGS) sel.append(new Option(name, code));
    sel.value = choice;
    sel.addEventListener('change', () => setLang(sel.value));
    $('lang-label').textContent = t('Language');
  }

  // ---------------------------------------------------------------- the line at the top
  const STEPS = [
    [t('Click something you like.'), t('Any part of this page: a button, the headline, the cards…')],
    [t('Choose what to take.'), ''],
    [t('Copy the prompt.'), t('Or click another part to add it too.')],
    [t('Paste it into your AI app.'), ''],
    [t('Now on any website.'), t('Pin Huescribe, then click it on a site you like.')],
  ];
  function say(step) {
    const h = $('say');
    h.textContent = STEPS[step][0];
    h.classList.remove('in'); void h.offsetWidth; h.classList.add('in');
    $('sub').textContent = STEPS[step][1];
    $('dots').querySelectorAll('li').forEach((li, i) => { li.className = i < step ? 'done' : i === step ? 'on' : ''; });
    $('dots').setAttribute('aria-label', t('Step {n} of {total}', { n: step + 1, total: STEPS.length }));
  }
  function go(step) {
    S.step = step;
    say(step);
    actions();
    S.idle = 0;
  }
  function actions() {
    const box = $('actions');
    box.replaceChildren();
    if (S.step === 3) {
      box.innerHTML = `<span class="w-keys">${navigator.platform.includes('Mac') ? '<span class="kbd press">⌘</span>' : '<span class="kbd press">Ctrl</span>'}<span class="kbd press">V</span></span>`;
      const b = button(t('Paste it for me'), 'btn btn-ghost', () => paste(S.prompt));
      box.append(b);
    }
    if (S.step === 4) {
      box.append(button(t('Open Huescribe'), 'btn btn-primary pulse', openPanel, 'open-panel'));
      box.append(button(t('Practice again'), 'btn btn-ghost', () => location.reload()));
    }
  }
  function button(label, cls, onclick, id) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = cls; b.textContent = label; b.addEventListener('click', onclick);
    if (id) b.id = id;
    return b;
  }

  // ---------------------------------------------------------------- the made-up site
  function site() {
    $('site').innerHTML = `
      <span class="blob b1"></span><span class="blob b2"></span>
      <nav class="fn-nav" data-pick="nav" tabindex="0"><span class="fn-logo"><i></i>Fieldnote</span>
        <span class="fn-links"><span>${esc(t('Features'))}</span><span>${esc(t('Pricing'))}</span><b>${esc(t('Sign in'))}</b></span></nav>
      <div class="fn-head" data-pick="head" tabindex="0"><h2>${esc(t('Simple plans for every notebook.'))}</h2><p>${esc(t('Start free. Upgrade when your notes outgrow you.'))}</p></div>
      <div class="fn-toggle" data-pick="toggle" tabindex="0"><span class="knob"></span><span>${esc(t('Monthly'))}</span><span>${esc(t('Yearly'))} <em>−20%</em></span></div>
      <div class="fn-cards" data-pick="cards" tabindex="0">
        <div class="fn-card"><small>${esc(t('Starter'))}</small><span class="fn-price">$0</span><small>${esc(t('100 notes'))}</small><span class="fn-btn">${esc(t('Get started'))}</span></div>
        <div class="fn-card pro"><small>Pro</small><span class="fn-price">$8</span><small>${esc(t('Unlimited notes'))}</small><span class="fn-btn" data-pick="pro" tabindex="0">${esc(t('Try Pro free'))}</span></div>
        <div class="fn-card"><small>${esc(t('Team'))}</small><span class="fn-price">$14</span><small>${esc(t('Shared notebooks'))}</small><span class="fn-btn">${esc(t('Contact sales'))}</span></div>
      </div>`;
    // the switch moves by itself now and then, so there is motion to catch
    const tog = $('site').querySelector('.fn-toggle');
    setInterval(() => { if (!document.hidden) tog.classList.toggle('yearly'); }, 2600);
    const stage = $('stage');
    const hover = mark('w-hover w-hidden'), picked = mark('w-picked w-hidden');
    function place(box, el, label) {
      const r = el.getBoundingClientRect(), s = stage.getBoundingClientRect();
      Object.assign(box.style, { left: `${r.left - s.left - 4}px`, top: `${r.top - s.top - 4}px`, width: `${r.width + 8}px`, height: `${r.height + 8}px` });
      box.classList.remove('w-hidden');
      box.querySelector('.w-tag').textContent = label;
    }
    function mark(cls) {
      const m = document.createElement('div'); m.className = cls; m.innerHTML = '<span class="w-tag"></span>'; stage.append(m); return m;
    }
    const labelOf = (key) => `${t(PARTS[key].kind)}: ${t(PARTS[key].name)}`;
    const target = (e) => e.target.closest?.('[data-pick]');
    $('site').addEventListener('pointermove', (e) => {
      S.idle = 0; ghost(false);
      const el = target(e);
      if (el && el !== S.pickEl) place(hover, el, labelOf(el.dataset.pick)); else hover.classList.add('w-hidden');
    });
    $('site').addEventListener('pointerleave', () => hover.classList.add('w-hidden'));
    const choose = (el) => {
      hover.classList.add('w-hidden');
      place(picked, el, labelOf(el.dataset.pick));
      S.pick = el.dataset.pick; S.pickEl = el;
      S.on = new Set();
      panelChoose();
      if (S.step === 0 || S.step === 2) go(1);
      if (matchMedia('(max-width: 860px)').matches) $('panel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };
    $('site').addEventListener('click', (e) => { const el = target(e); if (el) choose(el); });
    $('site').addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset?.pick) { e.preventDefault(); choose(e.target); } });
    S.unpick = () => { picked.classList.add('w-hidden'); S.pickEl = null; };
    window.addEventListener('resize', () => { if (S.pickEl && !picked.classList.contains('w-hidden')) place(picked, S.pickEl, labelOf(S.pick)); });
  }

  // ---------------------------------------------------------------- the panel (working copy)
  function top(title, back) {
    return `<div class="p-top">${back ? `<button class="p-back" type="button" id="p-back" aria-label="${esc(t('Back'))}">${svg('back')}</button>` : ''}<img src="${LOGO}" alt="" />
      <span style="flex:1;min-width:0"><b>${esc(title)}</b><small>fieldnote.app · Claude Code ⌄</small></span>${svg('dots')}</div>`;
  }
  function panelHome(fresh) {
    const p = $('panel');
    const rows = S.list.map((r, i) => `<li class="p-row${fresh && i === S.list.length - 1 ? ' fresh' : ''}"><u>${i + 1}</u><span><b>${esc(r.label)}</b><small>${esc(r.groups)}</small></span>${svg('dots')}</li>`).join('');
    p.innerHTML = top(t('My list')) + `<div class="p-main"><div class="p-status"><i></i><span>${esc(t('Click anything on the page'))}</span></div>
      ${S.list.length ? `<ol class="p-rows">${rows}</ol>` : `<div class="p-empty"><svg viewBox="0 0 120 72" aria-hidden="true"><rect x="6" y="10" width="70" height="52" rx="8" fill="#f3f3f1" stroke="#e4e4df"/><rect x="16" y="22" width="34" height="6" rx="3" fill="#d9d9d3"/><rect x="16" y="34" width="50" height="16" rx="5" fill="none" stroke="#5b6f2a" stroke-width="2" stroke-dasharray="4 3"/><path d="M70 40l22 12-9 2.4L79 64z" fill="#151515" stroke="#fff" stroke-width="1.5"/></svg></div>`}</div>
      <div class="p-tray"><button class="btn btn-dark" type="button" id="p-copy" ${S.list.length ? '' : 'disabled'}>${svg('copy')}<span>${esc(S.list.length ? tn(S.list.length, 'Copy prompt ({n} part)', 'Copy prompt ({n} parts)') : t('Copy prompt'))}</span></button></div>`;
    $('p-copy').addEventListener('click', copy);
  }
  function panelChoose() {
    const part = PARTS[S.pick];
    const p = $('panel');
    p.innerHTML = top(t('What do you want from it?'), true) + `<div class="p-main"><div class="p-prev">${preview(S.pick)}</div>
      <span class="p-name">${esc(`${t(part.kind)}: ${t(part.name)}`)}</span>
      <div class="p-chips">${GROUPS.filter(([g]) => part.has.includes(g)).map(([g, label]) => `<button type="button" class="p-chip" aria-pressed="false" data-g="${g}">${svg('check')}${esc(t(label))}</button>`).join('')}</div></div>
      <div class="p-tray"><button class="btn btn-primary" type="button" id="p-add" disabled>${esc(t('Add to my list'))}</button></div>`;
    p.querySelectorAll('.p-chip').forEach((c) => c.addEventListener('click', () => {
      const g = c.dataset.g, on = !S.on.has(g);
      if (on) S.on.add(g); else S.on.delete(g);
      c.setAttribute('aria-pressed', String(on));
      $('p-add').disabled = !S.on.size;
      S.idle = 0; ghost(false);
    }));
    $('p-back').addEventListener('click', () => { S.unpick(); panelHome(); go(S.list.length ? 2 : 0); });
    $('p-add').addEventListener('click', add);
  }
  function preview(key) {
    if (key === 'head') return `<span>${esc(t('Simple plans for every notebook.'))}</span>`;
    if (key === 'toggle') return '<span style="display:block;width:110px;height:26px;border-radius:999px;background:#ebe7df;position:relative"><span style="position:absolute;inset:3px auto 3px 3px;width:52px;border-radius:999px;background:#fff"></span></span>';
    if (key === 'pro') return `<span style="padding:7px 22px;border-radius:999px;background:#e0835a;font:600 12px Inter,sans-serif">${esc(t('Try Pro free'))}</span>`;
    if (key === 'nav') return '<span style="display:flex;gap:10px;align-items:center;font:700 14px Georgia,serif">Fieldnote <span style="width:44px;height:14px;border-radius:999px;background:#2a2926"></span></span>';
    return '<span style="display:grid;grid-template-columns:repeat(3,34px);gap:5px"><i style="height:40px;border-radius:5px;background:#fff;box-shadow:0 0 0 1px #e8e4dc"></i><i style="height:40px;border-radius:5px;background:#2a2926"></i><i style="height:40px;border-radius:5px;background:#fff;box-shadow:0 0 0 1px #e8e4dc"></i></span>';
  }
  function add() {
    const part = PARTS[S.pick];
    const groups = GROUPS.filter(([g]) => S.on.has(g));
    S.list.push({ key: S.pick, label: `${t(part.kind)}: ${t(part.name)}`, groups: groups.map(([, l]) => t(l)).join(' · '), on: groups.map(([g]) => g) });
    S.unpick();
    panelHome(true);
    go(2);
    if (matchMedia('(max-width: 860px)').matches) $('panel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // ---------------------------------------------------------------- copy: a real prompt, really on the clipboard
  function buildPrompt() {
    const blocks = S.list.map((r) => {
      const part = PARTS[r.key];
      return `<design_detail from="fieldnote.app">\n<what>${r.label}</what>\n<values>\n${r.on.map((g) => `${t(GROUPS.find(([k]) => k === g)[1])}: ${part.values[g]}`).join('\n')}\n</values>\n</design_detail>`;
    });
    return `${t('Here are design details from other websites that I want on my site:')}\n\n${blocks.join('\n\n')}\n`;
  }
  async function copy() {
    S.prompt = buildPrompt();
    let ok = true;
    try { await navigator.clipboard.writeText(S.prompt); } catch (err) { ok = false; console.warn('[Huescribe] practice copy failed', err); }
    const n = S.list.length;
    $('panel').innerHTML = top(t('My list')) + `<div class="p-main"><div class="p-done"><span class="ok">${svg('check')}</span>
      <span><b>${esc(ok ? t('Copied to your clipboard') : t("Couldn't copy, but you can still go on"))}</b><br><small>${esc(tn(n, '{n} part', '{n} parts'))} · ${esc(t('{count} characters', { count: I18N.num(S.prompt.length) }))}</small></span></div>
      <div class="p-status"><i></i><span>${esc(t('Click anything on the page'))}</span></div></div>`;
    go(3);
    ai();
  }

  // ---------------------------------------------------------------- the AI app: paste for real, then watch it work
  function ai() {
    const box = $('ai');
    box.hidden = false;
    box.innerHTML = `<div class="ai-bar"><span class="w-traffic" aria-hidden="true"><i></i><i></i><i></i></span><span translate="no">my-site — Claude Code</span><span style="width:42px"></span></div>
      <div class="ai-msgs" id="ai-msgs" aria-live="polite"></div>
      <div class="ai-comp"><div class="ai-input" id="ai-in" contenteditable="true" role="textbox" aria-label="${esc(t('Paste here'))}" data-ph="${esc(t('Paste here'))}"></div>
      <button class="ai-send" id="ai-send" type="button" aria-label="${esc(t('Send'))}">${svg('up')}</button></div>`;
    const input = $('ai-in');
    input.addEventListener('paste', (e) => { e.preventDefault(); paste(e.clipboardData?.getData('text') || S.prompt); });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); send(); } else if (!(e.ctrlKey || e.metaKey) && e.key !== 'Tab') e.preventDefault(); });
    $('ai-send').addEventListener('click', send);
    setTimeout(() => { box.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' }); input.focus({ preventScroll: true }); }, 250);
  }
  function paste(text) {
    if (S.sent) return;
    S.pasted = text || S.prompt;
    const input = $('ai-in');
    input.innerHTML = `<span class="ai-chip">${svg('copy')}${esc(t('Pasted · {count} characters', { count: I18N.num(S.pasted.length) }))}</span>`;
    $('ai-send').classList.add('ready', 'pulse');
    S.idle = 0; ghost(false);
  }
  function send() {
    if (!S.pasted || S.sent) return;
    S.sent = true;
    $('ai-in').innerHTML = '';
    $('ai-send').classList.remove('ready', 'pulse');
    const msgs = $('ai-msgs');
    const add = (html, cls) => { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; msgs.append(d); return d; };
    add(`<span class="ai-chip">${svg('copy')}${esc(t('Pasted · {count} characters', { count: I18N.num(S.pasted.length) }))}</span><pre class="ai-code" dir="auto">${esc(S.pasted.slice(0, 420))}</pre>`, 'ai-bubble');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const later = (ms, fn) => setTimeout(fn, reduced ? 0 : ms);
    const think = later(500, () => { S.think = add('<span translate="no">Thinking…</span>', 'ai-think'); });
    later(1500, () => { S.think?.remove(); add(`${svg('check')}<span translate="no">Read <b>pricing.html</b></span>`, 'ai-step'); });
    later(2000, () => add(`${svg('check')}<span translate="no">Edited <b>pricing.css</b> <em>+${4 + S.list.length * 3}</em></span>`, 'ai-step'));
    later(2700, () => {
      add(`<p style="margin:0">${esc(t('Done. Your page now has what you picked.'))}</p><div class="ai-cards" aria-hidden="true"><i></i><i></i><i></i></div>`, 'ai-reply');
      later(900, () => { go(4); pin(); });
    });
    void think;
  }

  // ---------------------------------------------------------------- pin it, then open it for real
  function pin() {
    const box = $('pin');
    box.hidden = false;
    box.innerHTML = `<div class="tb" aria-hidden="true">
        <span class="w-traffic"><i></i><i></i><i></i></span>
        <span class="tb-url">${esc(t('any website you like'))}</span>
        <span class="tb-ico tb-hs"><img src="${LOGO}" alt="" /></span>
        <span class="tb-ico tb-puz">${svg('puzzle')}</span>
        <span class="tb-ico">${svg('dots')}</span>
        <div class="tb-menu"><div><img src="${LOGO}" alt="" /><span>Huescribe</span>${svg('pin')}</div><div style="opacity:.5"><span style="width:18px;height:18px;border-radius:4px;background:#e4e4df;flex:none"></span><span>…</span></div></div>
        <span class="tb-cursor">${svg('pointer')}</span>
      </div>
      <div class="w-keys">${esc(t('Or press'))} <span class="kbd">Alt</span><span class="kbd">Shift</span><span class="kbd">P</span></div>`;
    setTimeout(() => box.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200);
  }
  async function openPanel() {
    try {
      const win = await chrome.windows.getCurrent();
      await chrome.sidePanel.open({ windowId: win.id });
      chrome.storage.local.set({ tipSeen: true, welcomeDone: true }).catch(() => {});
    } catch (err) {
      console.warn('[Huescribe] could not open the side panel from the welcome page', err);
      $('sub').textContent = t('Click the Huescribe icon in the toolbar to open it.');
    }
  }

  // ---------------------------------------------------------------- the pointer that shows the next click
  function ghost(on, el) {
    const g = $('ghost');
    if (!on) { g.classList.remove('on', 'click'); return; }
    const s = $('stage').getBoundingClientRect(), r = el.getBoundingClientRect();
    if (!r.width) return;
    g.style.left = `${r.left - s.left + r.width * 0.5}px`;
    g.style.top = `${r.top - s.top + r.height * 0.55}px`;
    g.classList.add('on');
    setTimeout(() => { g.classList.remove('click'); void g.offsetWidth; g.classList.add('click'); }, 950);
  }
  function hintTarget() {
    if (S.step === 0) return $('site').querySelector('[data-pick="pro"]');
    if (S.step === 1) return $('panel').querySelector('.p-chip[aria-pressed="false"]') && !S.on.size ? $('panel').querySelector('.p-chip') : $('p-add');
    if (S.step === 2) return $('p-copy');
    return null;
  }
  setInterval(() => {
    if (document.hidden || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    S.idle += 1;
    const el = hintTarget();
    if (S.idle >= 3 && el && S.idle % 3 === 0) ghost(true, el);
    if (!el) ghost(false);
  }, 900);
  $('stage').addEventListener('pointerdown', () => { S.idle = 0; ghost(false); });

  // ---------------------------------------------------------------- start
  document.title = `Huescribe · ${t('Practice')}`;
  $('stage').setAttribute('aria-label', t('Practice'));
  $('dots').innerHTML = STEPS.map(() => '<li></li>').join('');
  langMenu();
  site();
  panelHome();
  go(0);
})();
