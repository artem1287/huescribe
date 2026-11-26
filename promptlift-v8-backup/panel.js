// PromptLift side panel (also used as a popup in browsers without a side panel).
// Three steps for anyone: 1) pick something you like on a site, 2) choose and tweak exactly
// what you want from it, 3) paste the ready-made prompt into Claude Code.

const P = globalThis.PromptLiftPrompts;
const ADJ = globalThis.PromptLiftAdjust;
// side: Chrome side panel · window: its own window docked beside the browser (no side panel, e.g. Arc)
// · popup: last-resort fallback that closes when the page is clicked.
const MODE = new URLSearchParams(location.search).get('mode') || (chrome.sidePanel ? 'side' : 'popup');
const IS_POPUP = MODE === 'popup';
const REDUCED_MOTION = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (id) => document.getElementById(id);
const main = $('main');

const ICON = {
  pick: '<path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/>',
  anim: '<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>',
  browse: '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
  play: '<polygon points="6 3 20 12 6 21 6 3"/>',
  slow: '<path d="M12 6v6l4 2"/><circle cx="12" cy="12" r="10"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  image: '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  up: '<path d="m18 15-6-6-6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  type: '<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" x2="15" y1="20" y2="20"/><line x1="12" x2="12" y1="4" y2="20"/>',
  layout: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
  pointer: '<path d="M9.037 9.69a.498.498 0 0 1 .653-.653l11 4.5a.5.5 0 0 1-.074.949l-4.349 1.041a1 1 0 0 0-.74.739l-1.04 4.35a.5.5 0 0 1-.95.074z"/>',
  sliders: '<line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/>',
  eye: '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
  reset: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  rec: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/>',
  popout: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  dock: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M15 3v18"/>',
  more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  box: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>',
};
const svg = (name, cls = 'i') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICON[name]}</svg>`;

const WHERE_CHIPS = ['Top of homepage', 'Whole site', 'All buttons', 'All headings'];
const GROUP_ORDER = ['Movement', 'Colors', 'Text', 'Format', 'All of it'];
const WHEN_ORDER = ['On load', 'On scroll', 'As you scroll', 'On hover', 'On click', 'Loops', 'Later'];

const state = {
  tab: null,
  screen: 'home',
  history: [],
  basket: [],
  fit: 'exact',
  view: null,          // pick / browse / animations result currently shown
  selected: new Set(),
  pollTimer: null,
  lastSeenPick: 0,
  previewing: null,    // { bid, ref } while an adjusted item is applied to the page
  picking: false,     // is highlight mode on in the page?
  films: new Map(),    // animation gid → filmstrip data URL | 'pending' | 'offscreen' | 'failed'
  frames: new Map(),   // animation gid → small frame data URLs, for the moving preview
  recording: null,     // { since, timer } while recording a scroll or click
  boundWindow: null,   // window mode: the browser window this panel belongs to
  sections: null,      // { list: [{ pickId, path, sel, name, shot, url, parts: {colors, format, scroll} }] } while choosing screen portions
  recLate: false,      // the recorder started after this page loaded: load-time animations weren't seen
  notice: null,        // { text, picture } shown once on the home screen after copying
  site: { mode: null, about: '' }, // building a new site or changing one, and what it is (kept in local storage)
  editingIndex: null,  // a prompt reopened from Your prompts goes back to its place in the list
  filmQueue: Promise.resolve(),
  lastCapture: 0,
};

// ---------- DOM helper (page text always goes in via textContent, never as HTML) ----------

function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v; // only ever our own static SVG markup
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'style') Object.assign(el.style, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  return el;
}

function announce(text) {
  const live = $('live');
  live.textContent = '';
  setTimeout(() => { live.textContent = text; }, 30);
}

// ---------- browser plumbing ----------

async function currentTab() {
  // `?tabId=` exists only so automated tests can point the panel at a tab.
  const qid = Number(new URLSearchParams(location.search).get('tabId'));
  // Docked window: follow whichever tab is active in the browser window it belongs to.
  if (state.boundWindow != null) { const [t] = await chrome.tabs.query({ active: true, windowId: state.boundWindow }); return t || null; }
  if (qid) {
    const t = await chrome.tabs.get(qid).catch(() => null);
    if (t && MODE === 'window') state.boundWindow = t.windowId;
    return t;
  }
  const [t] = await chrome.tabs.query({ active: true, currentWindow: true });
  return t || null;
}

function restricted(url) {
  return !url || !/^https?:|^file:/.test(url) || /^https:\/\/(chrome\.google\.com\/webstore|chromewebstore\.google\.com|microsoftedge\.microsoft\.com\/addons)/.test(url);
}

async function inject(files) {
  await chrome.scripting.executeScript({ target: { tabId: state.tab.id }, files });
}

async function exec(func, args = [], world = 'ISOLATED') {
  const [res] = await chrome.scripting.executeScript({ target: { tabId: state.tab.id }, func, args, world });
  if (res?.error) throw new Error(res.error.message || String(res.error));
  return res?.result;
}

async function send(msg) {
  const res = await chrome.runtime.sendMessage(msg);
  if (!res?.ok) throw new Error(res?.error || 'No response from the extension.');
  return res;
}

const sget = async (key) => (await chrome.storage.session.get(key))[key];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Build the prompt text for a basket (also used when saving it to the list). */
function promptFor(basket, fit) {
  const shotEntry = basket.find((b) => b.makePicture && b.shot) || basket.find((b) => b.shotKind === 'film' || b.shotKind === 'beforeafter') || basket.find((b) => b.shot) || null;
  return { text: P.buildSupplemental(basket, { fit, pictureFor: shotEntry?.bid || null, ctx: state.site }), shotEntry };
}

/** Starting something new: keep the current prompt in "Saved prompts" (this browser session), then reset. */
async function archiveBasket() {
  if (!state.basket.length) return;
  // Take the basket right away so a second call (e.g. two quick screen changes) can't save it twice.
  const basket = state.basket;
  state.basket = [];
  const { text, shotEntry } = promptFor(basket, state.fit);
  const first = basket[0];
  const entry = {
    id: `s${Date.now().toString(36)}`, at: Date.now(), url: first.url, fit: state.fit, basket, prompt: text,
    title: `${basket.map((b) => b.title).join(' + ')}${first.where ? ` → ${first.where}` : ''}`,
    thumb: shotEntry?.shot || null, picture: shotEntry?.shot || null, pictureBid: shotEntry?.bid || null,
  };
  try {
    const saved = (await sget('saved')) || [];
    // The list is in the order the prompts go to Claude: new ones at the end, an edited one back in its place.
    const at = state.editingIndex != null ? Math.min(state.editingIndex, saved.length) : saved.length;
    state.editingIndex = null;
    saved.splice(at, 0, entry);
    // At most 20; pictures only for the last 6 (session storage is limited).
    const next = saved.slice(-20).map((x, i, a) => (i >= a.length - 6 ? x : { ...x, thumb: null, picture: null, pictureBid: null, basket: x.basket.map((b) => ({ ...b, shot: null, frames: null })) }));
    await chrome.storage.session.set({ saved: next });
  } catch (err) {
    console.warn('[PromptLift] could not save the prompt', err);
  }
  if (state.previewing) await stopPreview();
  state.basket = [];
  state.fit = 'exact';
  state.selected = new Set();
  ui('clearSelection');
  saveBasket();
}

async function saveBasket() {
  try { await chrome.storage.session.set({ basket: state.basket }); }
  catch (err) { console.warn('[PromptLift] could not persist basket', err); }
}

/** Screenshot of the page's visible area (rate-limited by Chrome to ~2 per second). */
async function captureTab() {
  const wait = state.lastCapture + 550 - Date.now();
  if (wait > 0) await sleep(wait);
  state.lastCapture = Date.now();
  try {
    return await chrome.tabs.captureVisibleTab(state.tab.windowId, { format: 'png' });
  } catch (err) {
    // Chrome sometimes fails one capture ("image readback failed"); one retry usually works.
    console.debug('[PromptLift] capture failed once, retrying', err);
    await sleep(600);
    state.lastCapture = Date.now();
    return chrome.tabs.captureVisibleTab(state.tab.windowId, { format: 'png' });
  }
}

async function loadImage(src) {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}

/** Crop `rect` (page px) out of a screenshot taken of a page area `shotRect` (page px). */
async function cropFrom(src, shotRect, rect, maxW = 480) {
  const img = await loadImage(src);
  const k = img.naturalWidth / shotRect.width;
  const sx = Math.max(0, (rect.left - shotRect.left) * k); const sy = Math.max(0, (rect.top - shotRect.top) * k);
  const sw = Math.min(img.naturalWidth - sx, rect.width * k); const sh = Math.min(img.naturalHeight - sy, rect.height * k);
  if (sw < 4 || sh < 4) return null;
  const scale = Math.min(1, maxW / sw);
  const c = document.createElement('canvas');
  c.width = Math.round(sw * scale); c.height = Math.round(sh * scale);
  c.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
  return c.toDataURL('image/png');
}

/** Call the on-page UI (picker / selection boxes) in the page's isolated world. */
async function ui(name, ...args) {
  if (!state.tab || restricted(state.tab.url)) return null; // browser pages: nothing of ours is there
  try { return await exec((n, a) => globalThis.__plUI?.[n]?.(...a), [name, args]); }
  catch (err) {
    // The page navigating away mid-call is normal; anything else is worth a warning.
    const gone = /Frame with ID|was removed|No tab with id|Cannot access/.test(String(err?.message || err));
    (gone ? console.debug : console.warn)('[PromptLift] page UI call failed', name, err);
    return null;
  }
}

/** Selection boxes for everything chosen from this page, so the user sees what they're editing. */
function showChosenOnPage() {
  const sels = state.basket.filter((b) => b.tabId === state.tab?.id && b.url === state.tab?.url && b.sel).map((b) => b.sel);
  const seen = new Set();
  ui('showSelection', sels.filter((x) => { const k = JSON.stringify(x); if (seen.has(k)) return false; seen.add(k); return true; }));
}

// ---------- navigation ----------

function go(screen, push = true) {
  if (state.previewing && screen !== 'apply') stopPreview();
  if (state.recording && screen !== 'record') stopRecording();
  if (state.sections && screen !== 'sections') endSectionMode(screen === 'apply');
  if (screen !== 'pick') { stopPreviewLoop(); abortScrollCheck(); }
  if (screen === 'home' && state.basket.length) { archiveBasket().then(() => { if (state.screen === 'home') go('home', false); }); }
  if (push && state.screen !== screen) state.history.push(state.screen);
  state.screen = screen;
  state.renderSeq = (state.renderSeq || 0) + 1; // async screens drop out if a newer render started
  clearInterval(state.pollTimer);
  state.pollTimer = null;
  $('back').hidden = screen === 'home';
  main.replaceChildren();
  setTray(null);
  window.scrollTo(0, 0);
  if (!IS_POPUP && state.tab && !restricted(state.tab.url)) {
    // Picking is on only while choosing: an element (element/pick) or screen portions (sections).
    if (screen === 'element' || screen === 'pick') { if (!state.picking) startPick(true); }
    else if (screen === 'sections') { /* startSections turns it on in section mode */ }
    else if (state.picking) { state.picking = false; ui('stopPicking', false); }
  }
  if (screen === 'home') ui('clearSelection');
  if (screen === 'apply') { ui('setCapturing', false); showChosenOnPage(); }
  SCREENS[screen]();
  if (push) $('title').focus({ preventScroll: true });
}

function back() { go(state.history.pop() || 'home', false); }

function setTray(text, label, onClick, disabled = false) {
  const tray = $('tray');
  if (!label) { tray.hidden = true; return; }
  tray.hidden = false;
  $('tray-text').textContent = text || '';
  const b = $('tray-btn');
  b.textContent = label;
  b.disabled = disabled;
  b.onclick = onClick;
}

function spinner(text) {
  main.replaceChildren(h('div', { class: 'spinner', 'aria-hidden': 'true' }), h('p', { class: 'muted center', role: 'status' }, text));
}

function showError(title, text, retry) {
  main.replaceChildren(h('div', { class: 'alert', role: 'alert' }, h('strong', {}, title), h('p', {}, text)),
    retry ? h('button', { class: 'btn btn-outline wide', onclick: retry }, 'Try again') : null);
}

// ---------- screens ----------

const SCREENS = {
  async home() {
    const seq = state.renderSeq;
    $('title').textContent = 'What do you want to copy?';
    if (state.notice) main.append(noticeCard(state.notice));
    state.notice = null;
    if (!state.tab || restricted(state.tab.url)) {
      main.append(h('div', { class: 'alert' }, h('strong', {}, 'Open a website first'), h('p', {}, 'Then come back here.')));
      await basketList();
      return;
    }
    const tipSeen = await lget('tipSeen');
    if (seq !== state.renderSeq) return;
    // The two choices come first: they are what this screen is for.
    main.append(h('div', { class: 'choices' },
      h('button', { class: 'choice', type: 'button', id: 'choose-element', onclick: () => go('element') },
        h('span', { class: 'i', html: svg('pointer') }), h('span', {}, h('b', {}, 'An element'), h('small', {}, 'Button, heading, card, picture'))),
      h('button', { class: 'choice', type: 'button', id: 'choose-portion', onclick: () => startSections() },
        h('span', { class: 'i', html: svg('layout') }), h('span', {}, h('b', {}, 'A screen portion'), h('small', {}, 'Whole sections or any area')))));
    await basketList();
    if (seq !== state.renderSeq) return;
    if (!tipSeen) main.append(tipCard());
  },
  element() {
    $('title').textContent = 'Pick an element';
    // Popup fallback: the popup closes so the page can be clicked; the pick waits for reopening.
    if (IS_POPUP && state.tab && !restricted(state.tab.url)) { startPick(false); return; }
    // A fresh element pick: drop the old pick's outline and its "click it again to go inside" lock.
    ui('clearSelection');
    main.append(pickingStatus());
  },
  pick() { renderItems(state.view); if (state.view?.filmGroups?.length || state.view?.items.some((i) => i.stateCss)) startPreviewLoop(state.view, state.view.filmGroups || []); },
  sections() { renderSections(); },
  record() { renderRecording(); },
  apply() { renderApply(); },
};

/** Every prompt made so far, ready to copy one by one or all together into one message. */
async function basketList() {
  const seq = state.renderSeq;
  const saved = (await sget('saved')) || [];
  if (!saved.length || seq !== state.renderSeq) return;
  // "Copy all" only makes sense from two prompts up; one prompt was already copied when it was made.
  let allBtn = null;
  if (saved.length > 1) {
    allBtn = h('button', { class: 'btn btn-primary sm', type: 'button', id: 'copy-all', html: `${svg('copy')}<span>Copy all ${saved.length}</span>` });
    allBtn.onclick = async () => {
      const text = P.combine(saved.map((x) => ({ basket: x.basket, fit: x.fit, pictureBid: x.picture ? x.pictureBid : null })), state.site);
      try { await navigator.clipboard.writeText(text); flash(allBtn, 'Copied', `Copy all ${saved.length}`, 'copy'); announce('All prompts copied as one message'); }
      catch (err) { console.warn('[PromptLift] clipboard failed', err); announce('Could not copy'); }
    };
  }
  main.append(h('div', { class: 'saved-head' }, h('h2', {}, 'Your prompts'), allBtn));
  saved.forEach((sp, i) => main.append(savedRow(sp, i, saved)));
  // Only say what isn't obvious: the pictures go along with Copy all, numbered.
  const pics = saved.filter((x) => x.picture).length;
  if (saved.length > 1 && pics) main.append(h('p', { class: 'small muted' }, `Paste pictures 1–${pics} too.`));
}

/** Clear every saved prompt (from the header menu; asks once more first). */
async function clearPrompts() {
  await chrome.storage.session.set({ saved: [] });
  announce('All prompts cleared');
  if (state.screen === 'home') go('home', false);
}

// ---------- small menus (header "More", and each saved prompt's "…") ----------

let openMenuEl = null;
function closeMenu() {
  if (!openMenuEl) return;
  openMenuEl.anchor.setAttribute('aria-expanded', 'false');
  openMenuEl.remove();
  openMenuEl = null;
}

/** A small menu under `anchor`. entries: [{ label, icon, run, danger, confirm }] (falsy ones skipped). */
function openMenu(anchor, entries) {
  const was = openMenuEl?.anchor === anchor;
  closeMenu();
  if (was) return;
  const menu = h('div', { class: 'menu', role: 'menu' });
  for (const e of entries.filter(Boolean)) {
    const item = h('button', { class: `menu-item${e.danger ? ' danger' : ''}`, type: 'button', role: 'menuitem', html: `${svg(e.icon || 'check')}<span></span>` });
    item.querySelector('span').textContent = e.label;
    item.onclick = async () => {
      if (e.confirm && item.dataset.sure !== '1') { item.dataset.sure = '1'; item.querySelector('span').textContent = e.confirm; return; }
      closeMenu();
      try { await e.run(); } catch (err) { console.warn('[PromptLift] menu action failed', e.label, err); announce('That did not work. Try again.'); }
    };
    menu.append(item);
  }
  const r = anchor.getBoundingClientRect();
  menu.style.top = `${r.bottom + window.scrollY + 4}px`;
  menu.style.right = `${Math.max(8, document.documentElement.clientWidth - r.right)}px`;
  menu.anchor = anchor;
  document.body.append(menu);
  anchor.setAttribute('aria-expanded', 'true');
  openMenuEl = menu;
  menu.querySelector('button')?.focus();
}
document.addEventListener('click', (e) => { if (openMenuEl && !openMenuEl.contains(e.target) && !openMenuEl.anchor.contains(e.target)) closeMenu(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && openMenuEl) { const a = openMenuEl.anchor; closeMenu(); a.focus(); } });
window.addEventListener('scroll', closeMenu, { passive: true });

/** Your site: new or existing, and what it is. Every prompt is written for this situation.
 *  Asked once, on the "Where should it go?" screen; after that it is a one-line summary with Edit. */
function siteCard() {
  const S = state.site;
  const set = async (patch) => { Object.assign(S, patch); try { await chrome.storage.local.set({ site: S }); } catch (err) { console.warn('[PromptLift] could not save site settings', err); } };
  if (!S.mode) state.editSite = true; // first time: the card stays open until Done
  if (S.mode && !state.editSite) {
    const summary = `${S.mode === 'new' ? 'Building a new site' : 'Changing my site'}${S.mode === 'new' && S.about?.trim() ? `: ${S.about.trim()}` : ''} · ${(P.APPS[S.app] || P.APPS['claude-code']).label}`;
    return h('section', { class: 'site-line', 'aria-label': 'What the prompts are for' },
      h('span', { class: 'small muted' }, 'For'), h('b', { id: 'site-summary' }, summary),
      h('button', { class: 'btn btn-ghost sm', type: 'button', id: 'site-edit', onclick: () => { state.editSite = true; go(state.screen, false); } }, 'Edit'));
  }
  const modeBtn = (mode, label) => h('button', {
    class: 'seg-btn', type: 'button', 'aria-pressed': String(S.mode === mode), id: `mode-${mode}`,
    onclick: async (e) => {
      const btn = e.currentTarget; // currentTarget is gone once the event is over (after the await)
      btn.parentElement.querySelectorAll('.seg-btn').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      await set({ mode });
      announce(mode === 'new' ? 'Prompts are written for building a new site' : 'Prompts are written for changing your site');
      if (state.screen === 'apply') { const about = document.getElementById('site-about'); const keep = about === document.activeElement; go('apply', false); if (keep) document.getElementById('site-about')?.focus(); }
    },
  }, label);
  const about = h('input', { type: 'text', id: 'site-about', value: S.about || '', placeholder: 'What is it? e.g. a landing page for my bakery (optional)', oninput: (e) => set({ about: e.target.value }) });
  // Which AI app the prompt goes into: each one gets the prompt in the form it reads best.
  const app = h('select', { id: 'site-app', onchange: (e) => { set({ app: e.target.value }); announce(`Prompts are written for ${P.APPS[e.target.value].label}`); } },
    Object.entries(P.APPS).map(([k, a]) => h('option', { value: k, selected: (S.app || 'claude-code') === k || null }, a.label)));
  return h('section', { class: 'site-card', 'aria-labelledby': 'site-h' },
    h('h2', { id: 'site-h' }, 'These prompts are for'),
    h('div', { class: 'seg', role: 'group', 'aria-label': 'What the prompts are for' }, modeBtn('new', 'Building a new site'), modeBtn('change', 'Changing my site')),
    // Only a new site needs saying what it is (the AI writes its text); a site being changed already shows it.
    S.mode === 'new' ? h('label', { class: 'sr-only', for: 'site-about' }, 'What is your site?') : null, S.mode === 'new' ? about : null,
    h('label', { class: 'field', for: 'site-app' }, 'I paste prompts into', app),
    S.mode ? h('button', { class: 'btn btn-outline sm', type: 'button', id: 'site-done', onclick: () => { state.editSite = false; go(state.screen, false); } }, 'Done') : null);
}

function noticeCard(n) {
  const box = h('div', { class: 'notice', role: 'status' }, h('span', { class: 'i', html: svg('check') }),
    h('span', { class: 'notice-text' }, h('b', {}, 'Copied'), ` · paste into ${(P.APPS[state.site?.app] || P.APPS['claude-code']).label.replace(/ \(.*\)$/, '')}`));
  if (n.long) box.append(h('span', { class: 'small muted' }, 'Builders do best with a few parts at a time.'));
  if (n.picture) box.append(pictureButton(n.picture, 'Copy picture too'));
  return box;
}

function tipCard() {
  const box = h('div', { class: 'tip' },
    h('b', {}, 'How it works'),
    h('ol', {}, h('li', {}, 'Choose an element or a screen portion.'), h('li', {}, 'Click it on the page and tick what you want.'), h('li', {}, 'Say where it goes on your site, copy, and paste into Claude.')),
    h('button', { class: 'btn btn-outline sm', type: 'button', id: 'tip-ok', onclick: async () => { await chrome.storage.local.set({ tipSeen: true }); box.remove(); } }, 'Got it'));
  return box;
}

async function lget(key) {
  try { return (await chrome.storage.local.get(key))[key]; } catch { return undefined; }
}

/** Copy a picture to the clipboard (or download it where images can't be copied). */
function pictureButton(src, label = 'Copy picture', iconOnly = false) {
  const btn = h('button', { class: `btn btn-outline sm${iconOnly ? ' icon-btn' : ''}`, type: 'button', 'aria-label': iconOnly ? 'Copy picture' : null, title: iconOnly ? 'Copy picture' : null, html: iconOnly ? svg('image') : `${svg('image')}<span>${label}</span>` });
  btn.onclick = async () => {
    try {
      const blob = await (await fetch(src)).blob();
      const png = blob.type === 'image/png' ? blob : await toPng(blob);
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
      if (iconOnly) announce('Picture copied'); else flash(btn, 'Copied!', label, 'image');
      announce('Picture copied');
    } catch (err) {
      console.warn('[PromptLift] image copy failed, downloading', err);
      const a = h('a', { href: src, download: 'promptlift-picture.png' });
      document.body.append(a); a.click(); a.remove();
      if (iconOnly) announce('Picture saved to downloads'); else flash(btn, 'Saved to downloads', label, 'image');
    }
  };
  return btn;
}

function savedRow(sp, i, all) {
  let host = '';
  try { host = new URL(sp.url).host; } catch { /* keep empty */ }
  const copyAgain = async () => {
    // Rebuilt from its details so it is written for the situation chosen now (new site / changes).
    const text = P.buildSupplemental(sp.basket, { fit: sp.fit, pictureFor: sp.picture ? sp.pictureBid : null, ctx: state.site });
    await navigator.clipboard.writeText(text);
    announce('Prompt copied');
  };
  const copyPicture = async () => {
    const blob = await (await fetch(sp.picture)).blob();
    const png = blob.type === 'image/png' ? blob : await toPng(blob);
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
    announce('Picture copied');
  };
  const move = async (d) => {
    const list = (await sget('saved')) || [];
    const j = list.findIndex((x) => x.id === sp.id);
    if (j < 0 || j + d < 0 || j + d >= list.length) return;
    [list[j], list[j + d]] = [list[j + d], list[j]];
    await chrome.storage.session.set({ saved: list });
    announce(`Moved to number ${j + d + 1}`);
    go('home', false);
  };
  const remove = async () => {
    const list = ((await sget('saved')) || []).filter((x) => x.id !== sp.id);
    await chrome.storage.session.set({ saved: list });
    announce('Prompt removed');
    go('home', false);
  };
  const picNo = all.slice(0, i + 1).filter((x) => x.picture).length;
  const openBtn = h('button', { class: 'saved-main', type: 'button', 'aria-label': `Change prompt ${i + 1}: ${sp.title}`, onclick: () => restoreSaved(sp) },
    h('span', { class: 'num' }, String(i + 1)),
    sp.thumb ? h('img', { src: sp.thumb, alt: '' }) : h('span', { class: 'ph' }),
    h('span', { class: 'saved-text' }, h('b', {}, sp.title), h('small', {}, host)));
  const more = h('button', { class: 'btn btn-ghost icon-btn row-more', type: 'button', 'aria-label': `More for prompt ${i + 1}`, 'aria-haspopup': 'menu', 'aria-expanded': 'false', html: svg('more') });
  more.onclick = () => openMenu(more, [
    { label: 'Copy again', icon: 'copy', run: copyAgain },
    sp.picture && { label: all.length > 1 ? `Copy picture ${picNo}` : 'Copy picture', icon: 'image', run: copyPicture },
    i > 0 && { label: 'Move up', icon: 'up', run: () => move(-1) },
    i < all.length - 1 && { label: 'Move down', icon: 'down', run: () => move(1) },
    { label: 'Remove', icon: 'trash', danger: true, run: remove },
  ]);
  return h('div', { class: 'saved-row' }, openBtn, more);
}

/** Reopen a saved prompt to edit it (the current one, if any, is saved first). */
async function restoreSaved(sp) {
  await archiveBasket();
  const all = (await sget('saved')) || [];
  state.editingIndex = Math.max(0, all.findIndex((x) => x.id === sp.id));
  const saved = all.filter((x) => x.id !== sp.id);
  await chrome.storage.session.set({ saved });
  state.basket = sp.basket.map((b) => ADJ.init(b));
  state.fit = sp.fit || 'exact';
  saveBasket();
  go('apply');
}

function basketTray() {
  if (state.basket.length) setTray(`${state.basket.length} thing${state.basket.length > 1 ? 's' : ''} chosen`, 'Continue', () => go('apply'));
}

// ---------- pick ----------

/** Turn on highlight mode in the page. `quiet`: started automatically (don't redraw the screen). */
async function startPick(quiet) {
  // A second call while one is under way waits for that one instead of starting another.
  if (state.startingPick) return state.startingPick;
  state.startingPick = startPickNow(quiet);
  return state.startingPick;
}

async function startPickNow(quiet) {
  const slow = setTimeout(refreshPickingStatus, 600); // only say it when it takes a moment
  try {
    await send({ type: 'promptlift:startPicker', tabId: state.tab.id });
    state.picking = true;
    state.port?.postMessage({ pickingTab: state.tab.id });
    if (state.sections) await ui('setSectionMode', true);
    if (IS_POPUP) { window.close(); return; }
    if (!quiet && state.screen === 'home') go('home', false);
    refreshPickingStatus();
  } catch (err) {
    console.error('[PromptLift] picker failed', err);
    state.picking = false;
    if (!quiet) showError("Couldn't start", 'Reload the page and try again.', () => startPick(false));
    refreshPickingStatus();
  } finally {
    clearTimeout(slow);
    state.startingPick = null;
    refreshPickingStatus();
  }
}

function pickingStatus() {
  const box = h('div', { class: 'picking-status', id: 'picking-status' });
  paintPickingStatus(box);
  return box;
}

function paintPickingStatus(box) {
  if (state.picking) {
    const sections = state.screen === 'sections';
    box.replaceChildren(h('div', { class: 'status', role: 'status' }, h('span', { html: svg('pointer') }),
      sections ? h('span', {}, h('b', {}, 'Click a section'), ' or drag over an area on the page.') : h('span', {}, h('b', {}, 'Click the element'), ' you want on the page.')));
  } else if (state.startingPick) {
    box.replaceChildren(h('div', { class: 'status', role: 'status' }, h('span', { class: 'spinner sm', 'aria-hidden': 'true' }), h('span', {}, 'Getting the page ready…')));
  } else {
    box.replaceChildren(h('button', { class: 'hero-btn', id: 'pick-btn', onclick: () => startPick(false) }, h('span', { html: svg('pick') }), h('span', {}, h('b', {}, 'Start picking'), h('small', {}, state.screen === 'sections' ? 'Click the sections you want' : 'Click the element you want'))));
  }
}

function refreshPickingStatus() {
  const box = document.getElementById('picking-status');
  if (box) paintPickingStatus(box);
}

/** The page says a click is being read: show it right away, so the click never feels ignored. */
function showReadingStatus(title) {
  document.getElementById('reading-status')?.remove();
  if (!['element', 'pick'].includes(state.screen)) return;
  const box = h('div', { class: 'status reading-status', role: 'status', id: 'reading-status' }, h('span', { class: 'spinner sm', 'aria-hidden': 'true' }), h('span', {}, 'Reading ', h('b', {}, title || 'your pick'), '…'));
  main.prepend(box);
  window.scrollTo({ top: 0, behavior: REDUCED_MOTION ? 'auto' : 'smooth' });
  clearTimeout(state.readingTimer);
  state.readingTimer = setTimeout(() => box.remove(), 15000); // a pick that never arrives
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'promptlift:pickingStopped') { state.picking = false; refreshPickingStatus(); }
  if (msg?.type === 'promptlift:reading' && sender.tab?.id === state.tab?.id) showReadingStatus(msg.title);
  if (msg?.type === 'promptlift:readingFailed' && sender.tab?.id === state.tab?.id) {
    // Say so in the panel too (the page shows a short toast that is easy to miss).
    const box = document.getElementById('reading-status');
    if (box) {
      clearTimeout(state.readingTimer);
      box.className = 'status reading-status failed';
      box.setAttribute('role', 'alert');
      box.replaceChildren(h('span', { html: svg('x') }), h('span', {}, h('b', {}, "Couldn't read that part."), ' Try another.'));
      state.readingTimer = setTimeout(() => box.remove(), 6000);
    }
  }
  if (msg?.type === 'promptlift:section') {
    if (state.screen !== 'sections' || sender.tab?.id !== state.tab?.id) { sendResponse({ ok: false }); return; }
    toggleSectionInList(msg);
    sendResponse({ ok: true });
  }
});

function openPick(p) {
  if (state.basket.length && !state.basket.some((b) => b.pickId === p.pickId)) archiveBasket();
  state.lastSeenPick = Math.max(state.lastSeenPick, p.at);
  chrome.storage.session.set({ lastSeenPick: state.lastSeenPick }).catch((e) => console.warn('[PromptLift] could not save lastSeenPick', e));
  state.view = { title: p.title, items: [...p.items], screenshot: p.screenshot, shotRect: p.shotRect, pickId: p.pickId, path: p.path, sel: p.sel, source: 'pick', movement: 'loading' };
  state.selected = new Set();
  go('pick');
  loadMovement(state.view);
}


/** Ask the always-on recorder what moved on/inside (or around) the picked thing, and merge it in. */
async function loadMovement(view) {
  let groups = null;
  try {
    groups = await exec((sel) => (window.__plRec ? window.__plRec.groupsWithin(sel) : null), [`[data-pl-pick="${view.pickId}"]`], 'MAIN');
  } catch (err) {
    console.warn('[PromptLift] recorder query failed', err);
  }
  if (groups && view.sel?.docRect) groups = groups.filter((g) => g.count > 1); // an area: only what moves together
  // CSS animations the page played before we were watching: restart them once so they get frames.
  if (groups && !view.sel?.docRect) {
    const recorded = new Set(groups.map((g) => g.name));
    const missing = view.items.filter((i) => i.type === 'animation' && i.animName && !recorded.has(i.animName) && i.when !== 'Loops');
    if (missing.length) {
      try {
        const n = await exec((sel, names) => window.__plRec?.restartCss(sel, names, 'load') || 0, [`[data-pl-pick="${view.pickId}"]`, missing.map((i) => i.animName)], 'MAIN');
        if (n) groups = await exec((sel) => window.__plRec.groupsWithin(sel), [`[data-pl-pick="${view.pickId}"]`], 'MAIN') || groups;
      } catch (err) { console.debug('[PromptLift] could not restart CSS animations', err); }
    }
  }
  if (!view.sel?.docRect) {
    // Something you can press (button, link, menu toggle…): offer to catch what happens when pressed.
    const info = await exec((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const p = el.closest('a[href], button, [role=button], summary, label, input[type=checkbox], input[type=radio], [onclick], [aria-expanded], [aria-controls]');
      return { pressable: !!p || getComputedStyle(el).cursor === 'pointer', meta: globalThis.__PromptLift?.metaOf?.(el) || null };
    }, [`[data-pl-pick="${view.pickId}"]`]).catch(() => null);
    view.pressable = !!info?.pressable;
    view.meta = info?.meta || null;
  }
  if (groups) {
    const recordedNames = new Set(groups.filter((g) => g.source === 'css' && g.name).map((g) => g.name));
    // A CSS animation that was also recorded playing is shown once, as the recorded (richer) card.
    view.items = view.items.filter((i) => !(i.type === 'animation' && recordedNames.has(i.animName)));
    for (const g of groups) view.items.push(animItem(g));
    view.movement = 'ok';
  } else {
    view.movement = 'missing';
  }
  view.filmGroups = groups || [];
  if (state.screen === 'pick' && state.view === view) {
    renderItems(view);
    startPreviewLoop(view, groups || []);
  }
  // Scroll behavior is checked by itself (no button): the page scrolls a little and comes back.
  // It waits until the previews are filmed so the two don't fight over the page.
  if (!view.sel?.docRect && view.source === 'pick') {
    await catchHoverFor(view);
    await state.filmQueue.catch(() => {});
    if (state.view === view && state.screen === 'pick') runScrollCheck(view);
  }
}

/** Show a hover / press effect on the real element (its own transition plays, then it plays back). */
function playStateOnPage(it, opts = {}) {
  if (!it.stateOn || !it.stateCss) return;
  exec((ref, css, o) => globalThis.__PromptLift?.playState(ref, css, o), [it.stateOn, it.stateCss, opts]).catch((e) => console.debug('[PromptLift] could not show the effect', e));
}

/** Before → after pictures of a hover / press effect, for the card and the prompt. */
function queueStateFilms(items) {
  for (const it of items) {
    if (!it.stateCss || !it.stateOn) continue;
    it.filmKey = `state-${it.id}`;
    if (state.films.has(it.filmKey)) continue;
    state.films.set(it.filmKey, 'pending');
    { const v = state.view; state.filmQueue = state.filmQueue.then(() => makeStateFilm(it, v)).catch((e) => console.warn('[PromptLift] state film failed', e)); }
  }
}

async function makeStateFilm(it, v = state.view) {
  const key = it.filmKey;
  if (!stillFor(v)) { state.films.delete(key); return; }
  const frames = [];
  let away = false;
  state.filming = true;
  await ui('setCapturing', true);
  const backTo = await bringIntoView(it.target);
  try {
    for (const on of [false, true]) {
      if (!stillFor(v)) break;
      const box = await exec((ref, stateOn, css, apply) => {
        const L = globalThis.__PromptLift;
        const el = globalThis.__plTargets?.get(ref)?.deref();
        if (!el) return null;
        if (apply) L.playState(stateOn, css, { still: true });
        const r = el.getBoundingClientRect();
        return { left: r.left - 12, top: r.top - 12, width: r.width + 24, height: r.height + 24, vw: innerWidth, vh: innerHeight };
      }, [it.target, it.stateOn, it.stateCss, on]);
      if (!box || box.top + box.height <= 0 || box.top >= box.vh) { away = true; break; }
      await sleep(60);
      const shot = await captureTab();
      const crop = await cropFrom(shot, { left: 0, top: 0, width: box.vw, height: box.vh }, box, 600);
      if (crop) frames.push(await loadImage(crop));
    }
  } catch (err) {
    console.warn('[PromptLift] before/after capture failed', err);
  } finally {
    await exec((ref) => globalThis.__PromptLift?.restoreState(ref), [it.stateOn]).catch(() => {});
    await scrollBack(backTo, v);
    await ui('setCapturing', false);
    state.filming = false;
  }
  if (frames.length < 2) { state.films.set(key, away ? 'away' : 'failed'); refreshFilm(key); return; }
  state.films.set(key, composeStrip(frames));
  state.frames.set(key, smallFrames(frames));
  refreshFilm(key);
}

/** After picking: simulate a hover so effects driven by JavaScript show up too. */
async function catchHoverFor(view) {
  try {
    const groups = await exec((sel) => window.__plRec?.catchHover(sel) || [], [`[data-pl-pick="${view.pickId}"]`], 'MAIN') || [];
    if (!groups.length || state.view !== view) return;
    const have = new Set(view.items.filter((i) => i.anim).map((i) => i.anim.gid));
    const fresh = groups.filter((g) => !have.has(g.gid));
    if (!fresh.length) return;
    for (const g of fresh) view.items.push(animItem(g));
    view.filmGroups = [...(view.filmGroups || []), ...fresh];
    if (state.screen === 'pick') { renderItems(view); startPreviewLoop(view, view.filmGroups); }
  } catch (err) { console.debug('[PromptLift] simulated hover failed', err); }
}

/** Stop a scroll check that is still running (the person moved on). */
function abortScrollCheck() {
  if (state.view?.scrollState !== 'checking' || !state.tab) return;
  exec(() => {
    globalThis.__plScrollAbort = true;
    if (globalThis.__plScrollStart != null) { window.scrollTo({ top: globalThis.__plScrollStart, behavior: 'instant' }); globalThis.__plScrollStart = null; }
  }).catch(() => {});
}

/** Scroll the page a little through the element and back, and add what it does as you scroll. */
async function runScrollCheck(view) {
  if (view.scrollState === 'checking') return;
  view.scrollState = 'checking';
  if (state.view === view && state.screen === 'pick') renderItems(view);
  let facts = [];
  let ys = [];
  try {
    const res = await exec(async (sel) => {
      const el = document.querySelector(sel);
      return el ? globalThis.__PromptLift.elementScroll(el) : { facts: [] };
    }, [`[data-pl-pick="${view.pickId}"]`]) || {};
    facts = res.facts || [];
    ys = res.ys || [];
  } catch (err) { console.warn('[PromptLift] scroll check failed', err); }
  // Reveals that fired while scrolling were recorded: add any new ones.
  try {
    const groups = await exec((sel) => window.__plRec?.groupsWithin(sel) || [], [`[data-pl-pick="${view.pickId}"]`], 'MAIN') || [];
    const have = new Set(view.items.filter((i) => i.anim).map((i) => i.anim.gid));
    const fresh = groups.filter((g) => !have.has(g.gid));
    for (const g of fresh) view.items.push(animItem(g));
    view.filmGroups = [...(view.filmGroups || []), ...fresh];
  } catch (err) { console.debug('[PromptLift] could not refresh movement after scrolling', err); }
  if (facts.length) {
    view.items.push({
      id: `scroll-${view.pickId}`, group: 'Movement', when: 'On scroll', type: 'scroll', title: 'When you scroll',
      desc: `${facts[0].charAt(0).toUpperCase()}${facts[0].slice(1)}${facts.length > 1 ? ` (+${facts.length - 1} more)` : ''}.`, tech: '',
      label: 'What it does as the page scrolls', code: facts.map((f) => `- ${f}`).join('\n'), preview: { kind: 'none' }, context: '',
      filmKey: `scroll-${view.pickId}`, scrollYs: ys, scrollSel: `[data-pl-pick="${view.pickId}"]`,
    });
  }
  view.scrollState = facts.length ? 'found' : 'none';
  if (state.view === view && state.screen === 'pick') renderItems(view);
}

// ---------- screen portions ----------


// ---------- chosen sections ----------

async function startSections() {
  if (IS_POPUP) {
    showError('Screen portions need PromptLift to stay open', 'In this browser PromptLift opens as a popup that closes when you click the page. Use “An element” here, or open PromptLift in Chrome’s side panel.', () => go('home', false));
    return;
  }
  if (state.basket.length) await archiveBasket();
  state.sections = { list: [] };
  go('sections');
  if (!state.picking) await startPick(true);
  await ui('showSelection', []);
  await ui('setSectionMode', true);
}

function endSectionMode(keepOutlines) {
  ui('setSectionMode', false);
  if (!keepOutlines) ui('showSelection', []);
  state.sections = null;
}

function toggleSectionInList(msg) {
  const S = state.sections;
  if (msg.remove) S.list = S.list.filter((x) => x.pickId !== msg.remove);
  else if (msg.add) {
    // "Scroll behavior" is offered only where something in the section looks like it reacts to scrolling.
    const x = { ...msg.add, parts: { colors: true, format: true, fonts: true, scroll: false }, scrollHint: null };
    S.list.push(x);
    exec((ids) => ids.some((id) => { const el = document.querySelector(`[data-pl-pick="${id}"]`); return !!el && !!globalThis.__PromptLift?.areaScrollHint?.(el); }), [x.pickIds || [x.pickId]])
      .then((hint) => { x.scrollHint = !!hint; x.parts.scroll = !!hint; if (state.sections === S) renderSections(); })
      .catch((err) => { console.debug('[PromptLift] scroll hint failed', err); x.scrollHint = true; x.parts.scroll = true; if (state.sections === S) renderSections(); });
  }
  ui('showSelection', S.list.map((x, i) => ({ ...x.sel, label: `Section ${i + 1}` })));
  renderSections();
  announce(msg.add ? `Added: ${msg.add.name}` : 'Section removed');
}

function renderSections() {
  const S = state.sections;
  if (!S) { go('home', false); return; }
  $('title').textContent = 'Pick screen portions';
  main.replaceChildren();
  main.append(pickingStatus());
  const list = h('ol', { class: 'sec-list', 'aria-label': 'Chosen sections' });
  S.list.forEach((x, i) => {
    const parts = h('div', { class: 'part-chips', role: 'group', 'aria-label': `What to copy from section ${i + 1}` },
      ...[['colors', 'Color scheme'], ['fonts', 'Font scheme'], ['format', 'Format'], x.scrollHint && ['scroll', 'Scroll behavior']].filter(Boolean).map(([k, label]) => h('button', {
        class: 'chip toggle', type: 'button', 'aria-pressed': String(x.parts[k]), 'data-part': k,
        onclick: (e) => { x.parts[k] = !x.parts[k]; e.currentTarget.setAttribute('aria-pressed', String(x.parts[k])); updateSectionsTray(); },
      }, label)));
    list.append(h('li', { class: 'sec-row' },
      h('div', { class: 'sec-top' },
        x.shot ? h('img', { class: 'thumb', src: x.shot, alt: '' }) : h('span', { class: 'thumb' }),
        h('span', { class: 'sec-name' }, h('b', {}, x.group === 'span' ? `Sections together (${i + 1})` : x.group === 'part' ? `Part of a section (${i + 1})` : `Section ${i + 1}`), h('span', { class: 'small muted' }, x.name.replace(/^Section: /, ''))),
        h('button', { class: 'btn btn-ghost icon-btn', type: 'button', 'aria-label': `Remove section ${i + 1}`, html: svg('x'), onclick: () => toggleSectionInList({ remove: x.pickId }) })),
      parts));
  });
  main.append(S.list.length ? list : h('p', { class: 'empty' }, 'No sections yet.'));
  updateSectionsTray();
}

function updateSectionsTray() {
  const S = state.sections;
  if (!S) return;
  const usable = S.list.filter((x) => x.parts.colors || x.parts.format || x.parts.fonts || x.parts.scroll);
  setTray(S.list.length ? '' : 'Click a section on the page', usable.length ? `Next (${usable.length})` : 'Next', sectionsToBasket, !usable.length);
}

/** One block per section, with the parts chosen for it (color scheme, format, scroll behavior). */
async function sectionsToBasket() {
  const S = state.sections;
  const list = S.list.filter((x) => x.parts.colors || x.parts.format || x.parts.fonts || x.parts.scroll);
  if (list.some((x) => x.parts.scroll)) spinner('Reading the sections… the page scrolls through them and comes back.');
  else spinner('Reading the sections…');
  setTray(null);
  await ui('setSectionMode', false);
  const reports = await exec(async (jobs) => {
    const out = [];
    for (const { id, ids, group, parts } of jobs) {
      try {
        if (ids) {
          const els = ids.map((i) => document.querySelector(`[data-pl-pick="${i}"]`)).filter(Boolean);
          out.push(els.length ? await globalThis.__PromptLift.portionReportGroup(els, parts, group) : null);
        } else {
          const el = document.querySelector(`[data-pl-pick="${id}"]`);
          out.push(el ? await globalThis.__PromptLift.portionReport(el, parts) : null);
        }
      } catch (e) { console.error('[PromptLift] section report failed', e); out.push(null); }
    }
    return out;
  }, [list.map((x) => ({ id: x.pickId, ids: x.pickIds || null, group: x.group || null, parts: x.parts }))]).catch((err) => { console.error('[PromptLift] section reports failed', err); return null; });
  if (!reports || reports.every((r) => !r)) { showError("Couldn't read those sections", 'The page may have changed. Reload it and pick the sections again.', () => go('home', false)); return; }
  // Scroll behavior of a section gets a preview: the page at points along the scroll.
  const scrollFrames = [];
  for (const [i, x] of list.entries()) {
    const r = reports[i];
    scrollFrames[i] = r?.scrollFound && r.scrollYs?.length ? await makeScrollFilm(`secscroll-${x.pickId}`, `[data-pl-pick="${x.pickIds ? x.pickIds[0] : x.pickId}"]`, r.scrollYs, true) : null;
  }
  const noScroll = [];
  list.forEach((x, i) => {
    const r = reports[i];
    if (!r || !r.code) { if (r && x.parts.scroll) noScroll.push(i + 1); return; }
    if (x.parts.scroll && r.scrollFound === false) noScroll.push(i + 1);
    const what = [x.parts.colors && 'color scheme', x.parts.fonts && 'font scheme', x.parts.format && 'format', x.parts.scroll && r.scrollFound && 'scroll behavior'].filter(Boolean);
    const name = r.name.replace(/^Section: /, '');
    const of = x.group === 'span' ? `several sections of the page, together (${name.replace(/\s*\(together\)$/, '')})` : x.group === 'part' ? `${name}` : `one section of the page (${name})`;
    state.basket.push(ADJ.init({
      bid: `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, srcId: `sec-${x.pickId}`,
      type: 'portion', title: cap1(name), desc: '',
      label: `${cap1(what.join(', ').replace(/, ([^,]*)$/, ' and $1'))} of ${of}`, code: r.code, lang: 'text',
      preview: { kind: 'none' }, shot: scrollFrames[i] ? state.films.get(`secscroll-${x.pickId}`) : x.shot || null,
      shotKind: scrollFrames[i] ? 'scrollfilm' : x.shot ? 'screenshot' : null,
      frames: scrollFrames[i] ? state.frames.get(`secscroll-${x.pickId}`) : null, where: '', picturePrompt: '',
      tabId: state.tab.id, url: state.tab.url, sel: x.sel, pickId: x.pickId,
      parts: { colors: !!x.parts.colors, format: !!x.parts.format, fonts: !!x.parts.fonts, scroll: !!(x.parts.scroll && r.scrollFound) }, group: x.group || null,
      meta: /navigation|header/i.test(name) ? { kind: 'nav', tag: 'nav', noun: 'menu' } : /footer/i.test(name) ? { kind: 'footer', tag: 'footer', noun: 'footer' } : { kind: 'section', tag: 'section', noun: 'section' },
    }));
  });
  saveBasket();
  state.sectionNote = noScroll.length ? `No scroll behavior found in section ${noScroll.join(' and ')}.` : '';
  go('apply');
}

const cap1 = (t) => t.charAt(0).toUpperCase() + t.slice(1);



// ---------- record a scroll or click ----------


/** Watch the page while the person scrolls or clicks; everything that moves meanwhile is caught. */
async function startRecording(opts = {}) {
  try {
    const since = await exec(() => window.__plRec?.now() ?? null, [], 'MAIN');
    if (opts.press && since != null) await exec((sel) => window.__plRec.holdNavigationOnce(sel), [`[data-pl-pick="${opts.press}"]`], 'MAIN');
    if (since == null) { showError('This page needs a reload first', 'PromptLift starts watching a page when it opens. Reload the page, then record again.', () => go('home', false)); return; }
    if (state.picking) { state.picking = false; await ui('stopPicking', false); }
    await ui('setRecording', true);
    // press: started from "Press it" on a pick, so it finishes by itself once the movement settles.
    state.recording = { since, count: 0, timer: null, press: opts.press || null, quietSince: 0, names: [] };
    go('record');
  } catch (err) {
    console.error('[PromptLift] could not start recording', err);
    showError("Couldn't start recording", 'Reload the page and try again.', () => go('home', false));
  }
}

function renderRecording() {
  $('title').textContent = 'Recording';
  const rec = state.recording;
  const count = h('p', { class: 'small muted', role: 'status', id: 'rec-count' }, '');
  const caught = h('ul', { class: 'rec-list', id: 'rec-list', 'aria-label': 'Caught so far' });
  main.append(
    h('div', { class: 'status rec-status' }, h('span', { class: 'rec-dot', 'aria-hidden': 'true' }),
      rec?.press
        ? h('span', {}, h('b', {}, 'Press it on the page'))
        : h('span', {}, h('b', {}, 'Scroll or click on the page'))),
    count, caught);
  setTray('', 'Cancel', cancelRecording);
  if (!rec) return;
  clearInterval(rec.timer);
  rec.timer = setInterval(async () => {
    try {
      const names = await exec((t) => (window.__plRec?.groupsSince(t) || []).map((g) => `${g.words?.name || 'Movement'} · ${g.words?.when || ''}`), [rec.since], 'MAIN') || [];
      if (state.recording !== rec) return;
      const changed = names.length !== rec.names.length;
      rec.names = names;
      rec.count = names.length;
      if (changed) rec.quietSince = Date.now();
      if (changed && names.length) setTray('', 'Stop', finishRecording);
      const el = document.getElementById('rec-count');
      if (el) el.textContent = names.length ? `${names.length} movement${names.length > 1 ? 's' : ''} caught` : '';
      const list = document.getElementById('rec-list');
      if (list && changed) list.replaceChildren(...names.slice(0, 12).map((n) => h('li', {}, n)));
      // "Press it": done once something moved and nothing new has started for a moment.
      if (rec.press && names.length && Date.now() - rec.quietSince > 1400) finishRecording();
    } catch (err) { console.debug('[PromptLift] recording poll failed', err); }
  }, 500);
}

/** Nothing moved (yet) and the person changed their mind: back to where they came from. */
function cancelRecording() {
  stopRecording();
  if (state.view?.source === 'pick') go('pick', false); else go('home', false);
}

function stopRecording() {
  if (!state.recording) return;
  clearInterval(state.recording.timer);
  state.recording = null;
  ui('setRecording', false);
}

async function finishRecording() {
  const rec = state.recording;
  if (!rec) return;
  let groups = [];
  try { groups = (await exec((t) => window.__plRec?.groupsSince(t) ?? [], [rec.since], 'MAIN')) || []; }
  catch (err) { console.warn('[PromptLift] could not read the recording', err); }
  stopRecording();
  if (!groups.length) {
    main.replaceChildren(h('p', { class: 'empty' }, 'Nothing moved while recording.'),
      h('button', { class: 'btn btn-outline wide', type: 'button', onclick: () => (state.view ? go('pick', false) : go('home', false)) }, 'Go back'));
    setTray(null);
    return;
  }
  // Show what was caught right away, in the order it happened.
  groups.sort((a, b) => a.start - b.start);
  if (state.basket.length) await archiveBasket();
  state.view = { title: 'What moved', items: groups.map(animItem), screenshot: null, pickId: null, sel: null, source: 'record', movement: 'ok' };
  state.selected = new Set();
  state.view.filmGroups = groups;
  go('pick', false);
  startPreviewLoop(state.view, groups);
}

// ---------- browse ----------


// ---------- item cards ----------

function swatch(pv, type) {
  const el = h('span', { class: 'pv', 'aria-hidden': 'true' });
  switch (pv?.kind) {
    case 'gradient': el.style.backgroundImage = pv.value; break;
    case 'color': el.classList.add('color'); el.style.background = pv.value; break;
    case 'shadow': el.classList.add('shadow'); el.style.boxShadow = pv.value; break;
    case 'text-shadow': el.textContent = 'Aa'; el.style.textShadow = pv.value; break;
    case 'shape': el.classList.add('shape'); el.style.borderRadius = pv.value === '999px' ? '999px' : `min(${pv.value}, 10px)`; break;
    case 'font': el.textContent = 'Aa'; el.style.fontFamily = pv.value.family; el.style.fontWeight = pv.value.weight; break;
    case 'palette': el.classList.add('palette'); for (const c of pv.value) el.append(h('span', { style: { background: c } })); break;
    default: el.innerHTML = svg(type === 'picture' ? 'image' : /^(layout|structure|navigation|section-format|portion)$/.test(type) ? 'layout' : type === 'scroll' ? 'anim' : /anim/.test(type) ? 'anim' : type === 'hover' || type === 'focus' ? 'pointer' : type === 'font' ? 'type' : 'box');
  }
  return el;
}

/** Picture for an item: a crop of the pick screenshot if we have one, else a swatch. */
function visualFor(item, view) {
  const holder = h('span', { class: 'visual' }, swatch(item.preview, item.type));
  if (item.type === 'picture' && view?.screenshot) { item.crop = view.screenshot; return h('span', { class: 'visual' }, h('img', { class: 'thumb', src: view.screenshot, alt: '' })); }
  if (view?.screenshot && view.shotRect && item.rect && !/^(color|palette)$/.test(item.type)) {
    cropFrom(view.screenshot, view.shotRect, item.rect).then((src) => {
      if (!src) return;
      item.crop = src;
      holder.replaceChildren(h('img', { class: 'thumb', src, alt: '' }));
      if (/gradient|color/.test(item.type)) holder.append(swatch(item.preview, item.type));
    }).catch((e) => console.warn('[PromptLift] crop failed', e));
  }
  return holder;
}

function card(item, { visual, actions, onHover } = {}) {
  const id = item.id;
  const cb = h('input', { type: 'checkbox', id: `cb-${id}`, onchange: (e) => {
    e.target.checked ? state.selected.add(id) : state.selected.delete(id);
    updatePickTray();
    const sec = e.target.closest('details.section');
    if (sec) { const all = sec.querySelectorAll('.item input[type=checkbox]'); const n = [...all].filter((x) => x.checked).length; sec.querySelector('.count').textContent = n ? `${n} of ${all.length} chosen` : String(all.length); }
    if (e.target.checked && item.anim) playAnim(item.anim, 1, true); // see it move when you choose it
    else if (e.target.checked && item.stateCss) playStateOnPage(item, { hold: 1200 });
    else if (e.target.checked) highlightOnPage(item.target);
  } });
  cb.checked = state.selected.has(id);
  const details = !item.code ? null : h('details', { class: 'details' }, h('summary', {}, 'Details'),
    item.tech ? h('p', { class: 'small muted' }, item.tech) : null,
    h('pre', {}, item.code));
  const el = h('div', { class: 'item' },
    h('label', { class: 'item-main', for: `cb-${id}` }, cb, visual || swatch(item.preview, item.type),
      h('span', { class: 'txt' }, item.when ? h('span', { class: 'when' }, item.when) : null, h('b', {}, item.title), h('span', { class: 'desc' }, item.desc), item.context ? h('small', {}, item.context) : null)),
    actions ? h('div', { class: 'item-actions' }, actions) : null,
    details);
  if (onHover) {
    let timer = null;
    const enter = () => { clearTimeout(timer); timer = setTimeout(() => { if (!state.filming) onHover(); }, 350); };
    const leave = () => clearTimeout(timer);
    el.addEventListener('mouseenter', enter);
    el.addEventListener('mouseleave', leave);
    el.addEventListener('focusin', enter);
    el.addEventListener('focusout', leave);
  }
  return el;
}

function updatePickTray() {
  const n = state.selected.size;
  setTray(n ? '' : 'Tick something first', n ? `Next (${n})` : 'Next', addSelected, !n);
}

/** Outline an item's element on the page (no scrolling, so the page doesn't jump on hover). */
function highlightOnPage(ref) {
  if (!ref) return;
  exec((r) => {
    const el = globalThis.__plTargets?.get(r)?.deref();
    if (!el || !el.isConnected) return false;
    const b = el.getBoundingClientRect();
    if (b.bottom < 0 || b.top > innerHeight) return false;
    const box = document.createElement('div');
    box.setAttribute('data-pl-ignore', '');
    box.style.cssText = `position:fixed;left:${b.left - 4}px;top:${b.top - 4}px;width:${b.width + 8}px;height:${b.height + 8}px;border:2px solid #7c3aed;border-radius:6px;background:rgba(124,58,237,.08);pointer-events:none;z-index:2147483646;transition:opacity .5s ease;`;
    document.documentElement.appendChild(box);
    setTimeout(() => { box.style.opacity = '0'; }, 1100);
    setTimeout(() => box.remove(), 1700);
    return true;
  }, [ref]).catch(() => {});
}

function renderItems(view) {
  $('title').textContent = view.source === 'record' ? 'What moved' : 'Pick what to copy';
  main.replaceChildren();
  if (view.screenshot) main.append(h('img', { class: 'shot', src: view.screenshot, alt: 'What you picked' }));
  const groups = new Map();
  for (const it of view.items) {
    if (!groups.has(it.group)) groups.set(it.group, []);
    groups.get(it.group).push(it);
  }
  // A picked element always has Movement: it holds the scroll check and "Press it" even when nothing moves yet.
  const element = view.source === 'pick' && !view.sel?.docRect;
  if (element && !groups.has('Movement')) groups.set('Movement', []);
  const ordered = [...groups.keys()].sort((a, b) => GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b));
  // Movement opens by itself for a picked element (its previews, the scroll check and "Press it"
  // are the point); the other groups start closed so the list stays short.
  view.open ??= new Set();
  if (element && !view.movementToggled && (groups.get('Movement').length || view.pressable)) view.open.add('Movement');
  for (const g of ordered) {
    const list = g === 'Movement' ? [...groups.get(g)].sort((a, b) => WHEN_ORDER.indexOf(a.when) - WHEN_ORDER.indexOf(b.when)) : groups.get(g);
    const box = h('div', { class: 'group' });
    for (const it of list) {
      if ((it.type === 'media' || it.type === 'animation') && it.target) it.filmKey = `live-${it.id}`;
      if (it.type === 'scroll' && it.filmKey) {
        box.append(card(it, { visual: filmSlot(it.filmKey) }));
        continue;
      }
      if (it.stateCss && it.stateOn) {
        it.filmKey = `state-${it.id}`;
        box.append(card(it, { visual: filmSlot(it.filmKey, () => playStateOnPage(it, { hold: 1200 })), onHover: () => playStateOnPage(it) }));
        continue;
      }
      box.append(it.anim ? animCard(it, it.anim) : it.filmKey ? card(it, { visual: filmSlot(it.filmKey), onHover: () => highlightOnPage(it.target) }) : card(it, { visual: visualFor(it, view), onHover: () => highlightOnPage(it.target) }));
    }
    if (g === 'Movement' && element) box.append(...movementExtras(view));
    // Sections start closed so the list stays short; filmstrips are only made once Movement is opened.
    const chosen = list.filter((it) => state.selected.has(it.id)).length;
    const sec = h('details', { class: 'section', open: (view.open.has(g) || ordered.length === 1) || null,
      ontoggle: (e) => { if (g === 'Movement' && e.isTrusted) view.movementToggled = true; if (e.target.open) { view.open.add(g); if (g === 'Movement') { queueFilms(view.filmGroups || []); queueLiveFilms(list); queueStateFilms(list); queueScrollFilms(list); } } else view.open.delete(g); } },
      h('summary', {}, h('span', {}, g), h('span', { class: 'count' }, chosen ? `${chosen} of ${list.length} chosen` : list.length ? String(list.length) : view.scrollState === 'checking' || view.movement === 'loading' ? '…' : '')), box);
    main.append(sec);
    if (g === 'Movement' && sec.open) { queueFilms(view.filmGroups || []); queueLiveFilms(list); queueStateFilms(list); queueScrollFilms(list); }
  }
  if (!view.items.length && !element) main.append(h('p', { class: 'empty' }, 'Nothing found here. Try a bigger area.'));
  updatePickTray();
}

/** The rows at the end of Movement for a picked element: scroll check status, catching a press,
 *  and a reload when movement that plays as the page opens was missed. Shown only when they apply. */
function movementExtras(view) {
  const rows = [];
  const st = view.scrollState;
  if (view.movement === 'loading') rows.push(h('p', { class: 'small muted extra-row', role: 'status' }, 'Looking for movement…'));
  if (st === 'checking' || (!st && view.movement !== 'missing')) rows.push(h('p', { class: 'small muted extra-row', role: 'status', id: 'scroll-status' }, 'Checking scroll…'));
  else if (st === 'none') rows.push(h('p', { class: 'small muted extra-row', id: 'scroll-status' }, 'No scroll effect'));
  if (view.pressable) {
    rows.push(h('div', { class: 'extra-row press-row' },
      h('span', { class: 'i', html: svg('pointer') }),
      h('span', { class: 'press-text' }, h('b', {}, 'Moves when you press it?')),
      h('button', { class: 'btn btn-outline sm', type: 'button', id: 'press-catch', onclick: () => startRecording({ press: view.pickId }) }, 'Press it')));
  }
  const nothingOnLoad = !view.items.some((i) => i.anim || i.type === 'animation');
  if (view.movement === 'missing' || (state.recLate && nothingOnLoad && view.movement === 'ok')) {
    rows.push(h('div', { class: 'extra-row press-row' },
      h('span', { class: 'i', html: svg('refresh') }),
      h('span', { class: 'press-text' }, h('b', {}, 'Moves when the page opens?'), h('span', { class: 'small muted' }, 'It played before PromptLift opened.')),
      h('button', { class: 'btn btn-outline sm', type: 'button', id: 'reload-check', onclick: () => reloadAndRepick(view) }, 'Reload')));
  }
  return rows;
}

/** Reload the tab (the recorder then watches from the start) and pick the same thing again. */
async function reloadAndRepick(view) {
  spinner('Reloading…');
  const tabId = state.tab.id;
  try {
    await new Promise((resolve) => {
      const timer = setTimeout(done, 20000);
      function done() { clearTimeout(timer); chrome.tabs.onUpdated.removeListener(onUpd); resolve(); }
      function onUpd(id, info) { if (id === tabId && info.status === 'complete') done(); }
      chrome.tabs.onUpdated.addListener(onUpd);
      chrome.tabs.reload(tabId);
    });
    await sleep(2500); // let the opening animations play out
    state.tab = await chrome.tabs.get(tabId);
    await send({ type: 'promptlift:startPicker', tabId, autoPick: view.path || null });
    if (!view.path) startPick();
  } catch (err) {
    console.error('[PromptLift] reload failed', err);
    showError("Couldn't reload the page", 'Reload it yourself, then pick it again.', () => go('home'));
  }
}

function addSelected() {
  const view = state.view;
  const chosen = view.items.filter((i) => state.selected.has(i.id));
  for (const it of chosen) {
    if (state.basket.some((b) => b.srcId === it.id)) continue;
    const fkey = it.gid ?? it.filmKey ?? null;
    const film = fkey != null ? state.films.get(fkey) : null;
    const shot = it.type === 'picture' ? view.screenshot || null : film && film.startsWith('data:') ? film : it.crop || view.screenshot || null;
    const entry = {
      bid: `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, srcId: it.id,
      type: it.type, title: it.title, desc: it.desc, label: it.label, code: it.code, lang: it.lang, fontSource: it.fontSource || '',
      textParts: it.type === 'font' ? { font: true, size: true, color: /(^|\n)color:/.test(it.code) } : null,
      unit: it.unit || null, trigger: it.trigger || null, preview: it.preview,
      shot, shotKind: it.type !== 'picture' && film && film.startsWith('data:') ? (it.stateCss ? 'beforeafter' : 'film') : shot ? 'screenshot' : null, where: '',
      frames: fkey != null ? state.frames.get(fkey) || null : null, picturePrompt: '',
      target: it.target || null, anim: it.anim || null, gid: it.gid ?? null, tabId: state.tab.id, url: state.tab.url, sel: view.sel || null, pickId: view.pickId || null,
      // What it came from (an h2 heading, a card…), so the prompt can say how it fits the person's site.
      meta: it.meta || (it.anim || it.type === 'scroll' ? view.meta : null) || null,
    };
    state.basket.push(ADJ.init(entry));
  }
  saveBasket();
  announce(`${chosen.length} added`);
  state.selected = new Set();
  go('apply');
}

// ---------- animations ----------

function animItem(g) {
  const w = g.words;
  return {
    id: `anim-${state.tab.id}-${g.gid}-${g.start}`,
    group: 'Movement',
    when: w.when,
    type: 'recorded-animation',
    title: w.name,
    desc: w.sentence,
    tech: `${w.numbers}; ${w.when.toLowerCase()}${g.source === 'js' ? '; made with JavaScript on the original' : ''}`,
    label: `${w.name} (on ${g.target}): ${w.sentence}`,
    context: g.partOf ? `Your pick is one of ${g.count}` : '',
    code: P.animationCode(g),
    unit: g.count > 1 ? g.unit : null,
    trigger: g.trigger,
    preview: { kind: 'none' },
    anim: g,
    gid: g.gid,
  };
}

const capFirst = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** The preview strip. With `onPlay`, clicking it plays the real thing on the page (and does not tick the box). */
function filmSlot(gid, onPlay) {
  const slot = h('span', { class: `film${onPlay ? ' playable' : ''}`, 'data-gid': gid, title: onPlay ? 'Play it on the page' : null });
  if (onPlay) slot.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); onPlay(); });
  paintFilm(slot, gid);
  return slot;
}

function paintFilm(slot, gid) {
  const f = state.films.get(gid);
  if (f && f.startsWith('data:')) slot.replaceChildren(h('img', { src: f, alt: 'Frames of the animation, in order' }));
  else if (f === 'offscreen') slot.replaceChildren(h('span', { class: 'film-ph' }, 'Tap to play it'));
  else if (f === 'failed') slot.replaceChildren(h('span', { class: 'film-ph' }, 'No preview'));
  else if (f === 'away') slot.replaceChildren(h('span', { class: 'film-ph' }, 'Scroll to it for a preview'));
  else slot.replaceChildren(h('span', { class: 'film-ph' }, 'Loading…'));
}

function refreshFilm(gid) {
  for (const slot of document.querySelectorAll(`.film[data-gid="${CSS.escape(gid)}"]`)) paintFilm(slot, gid);
}

function animCard(item, g) {
  // It already replays on the page by itself; tapping the strip replays it now, "Slow motion" to study it.
  const slowBtn = h('button', { class: 'btn btn-ghost sm slow-btn', type: 'button', html: `${svg('slow')}<span>Slow motion</span>`, onclick: () => playAnim(g, 0.25, true) });
  return card(item, {
    visual: filmSlot(g.gid, () => playAnim(g, 1, true)),
    actions: slowBtn,
    onHover: () => (REDUCED_MOTION ? exec((id) => window.__plRec?.highlight(id), [g.gid], 'MAIN').catch(() => {}) : playAnim(g, 1, false)),
  });
}

/**
 * While a pick is on screen, its animations keep replaying on the page, over and over, so you can
 * watch them as long as you like. Stops when you move on; pauses while filmstrip frames are taken.
 */
function startPreviewLoop(view, groups) {
  stopPreviewLoop();
  // Loops already repeat by themselves; scroll-linked ones follow the scroll, not a clock.
  const list = groups.filter((g) => g.iterations !== 'infinite' && !g.scrollLinked);
  // Hover / press effects from the CSS are shown too: their state is applied, held and released.
  const states = view.items.filter((i) => i.stateCss && i.stateOn);
  if (REDUCED_MOTION || (!list.length && !states.length)) return;
  // A held hover state needs ~1.5s to show and play back, so leave room for it when there is one.
  const period = Math.max(states.length ? 2400 : 1500, ...list.map((g) => g.duration + (g.count > 1 ? g.stagger * (g.count - 1) : 0))) + 900;
  const tick = () => {
    if (state.screen !== 'pick' || state.view !== view) { stopPreviewLoop(); return; }
    if (state.filming || view.scrollState === 'checking') return; // don't disturb pictures or measurements
    for (const g of list) playAnim(g, 1, false, false);
    for (const it of states) playStateOnPage(it);
  };
  setTimeout(tick, 150);
  state.loopTimer = setInterval(tick, period);
}

function stopPreviewLoop() {
  clearInterval(state.loopTimer);
  state.loopTimer = null;
}

/** Replay on the page. Explicit plays may scroll to it; hover plays never scroll. */
async function playAnim(g, speed, explicit, flash = true) {
  try {
    const r = await exec((id, opts) => window.__plRec?.replay(id, opts) ?? { ok: false, error: 'The page reloaded, so pick it again to play it.' }, [g.gid, { speed, scroll: explicit, flash }], 'MAIN');
    if (!r?.ok && explicit) announce(r?.error || 'Could not play it.');
    if (r?.ok && explicit && state.films.get(g.gid) === 'offscreen') {
      state.films.delete(g.gid);
      setTimeout(() => queueFilms([g]), (g.duration + g.stagger * g.count) / speed + 300);
    }
  } catch (err) {
    console.warn('[PromptLift] replay failed', err);
  }
}

/** Build filmstrips one at a time for animations currently on screen. */
function queueFilms(groups) {
  for (const g of groups) {
    if (state.films.has(g.gid)) continue;
    state.films.set(g.gid, 'pending');
    const v = state.view;
    state.filmQueue = state.filmQueue.then(() => makeFilm(g, 1, v)).catch((e) => console.warn('[PromptLift] film failed', e));
  }
}

/** "When you scroll": frames taken at points along the scroll, around the element (then back). */
function queueScrollFilms(items) {
  for (const it of items) {
    if (it.type !== 'scroll' || !it.filmKey || state.films.has(it.filmKey)) continue;
    state.films.set(it.filmKey, 'pending');
    { const v = state.view; state.filmQueue = state.filmQueue.then(() => makeScrollFilm(it.filmKey, it.scrollSel, it.scrollYs, false, v)).catch((e) => console.warn('[PromptLift] scroll film failed', e)); }
  }
}

/**
 * Film what happens while scrolling: at each of up to 5 positions, a picture around `sel`
 * (or the whole visible page for a section). Returns the frames; also stored under `key`.
 */
async function makeScrollFilm(key, sel, ys, wholeView, v = state.view) {
  if (!wholeView && !stillFor(v)) { state.films.delete(key); return null; }
  const pick = ys.length > 5 ? [0, 0.25, 0.5, 0.75, 1].map((x) => ys[Math.round(x * (ys.length - 1))]) : ys;
  const frames = [];
  state.filming = true;
  await ui('setCapturing', true);
  const backTo = await exec(() => scrollY).catch(() => null);
  try {
    for (const y of pick) {
      if (!wholeView && !stillFor(v)) break;
      const box = await exec(async (s, yy) => {
        window.scrollTo({ top: yy, behavior: 'instant' });
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        await new Promise((r) => setTimeout(r, 120));
        const el = document.querySelector(s);
        const b = el ? el.getBoundingClientRect() : { left: 0, top: 0, width: innerWidth, height: innerHeight };
        return { left: b.left - 16, top: b.top - 16, width: b.width + 32, height: b.height + 32, vw: innerWidth, vh: innerHeight };
      }, [sel, y]);
      if (!box) continue;
      const shot = await captureTab();
      const area = wholeView ? { left: 0, top: 0, width: box.vw, height: box.vh } : box;
      const crop = await cropFrom(shot, { left: 0, top: 0, width: box.vw, height: box.vh }, area, 600);
      if (crop) frames.push(await loadImage(crop));
    }
  } catch (err) {
    console.warn('[PromptLift] scroll frames failed', err);
  } finally {
    await scrollBack(backTo, v, wholeView);
    await ui('setCapturing', false);
    state.filming = false;
  }
  if (frames.length < 2) { state.films.set(key, 'failed'); refreshFilm(key); return null; }
  state.films.set(key, composeStrip(frames));
  state.frames.set(key, smallFrames(frames));
  refreshFilm(key);
  return frames;
}

/** Things that move by themselves (canvas, video, GIF): film them as they are, no replay needed. */
function queueLiveFilms(items) {
  for (const it of items) {
    if (!it.filmKey?.startsWith('live-') || it.target == null || state.films.has(it.filmKey)) continue;
    state.films.set(it.filmKey, 'pending');
    { const v = state.view; state.filmQueue = state.filmQueue.then(() => makeLiveFilm(it, v)).catch((e) => console.warn('[PromptLift] live film failed', e)); }
  }
}

/** Previews are made for one pick; once something else is picked (or the screen changes) they stop. */
const stillFor = (v) => state.view === v && (state.screen === 'pick');

/** Bring a target into view for filming; returns the scroll position to come back to (or null). */
async function bringIntoView(ref) {
  return exec((r) => {
    const el = globalThis.__plTargets?.get(r)?.deref();
    if (!el) return null;
    const b = el.getBoundingClientRect();
    if (b.bottom > 0 && b.top < innerHeight) return null;
    const y = scrollY;
    el.scrollIntoView({ block: 'center', behavior: 'instant' });
    return y;
  }, [ref]).catch(() => null);
}
// Put the page back after filming, unless the person has moved on (then their own scrolling wins).
// `force`: a section's scroll frames, taken while the panel waits, always put the page back.
const scrollBack = (y, v = state.view, force = false) => (y == null || (!force && !stillFor(v)) ? null : exec((yy) => window.scrollTo({ top: yy, behavior: 'instant' }), [y]).catch(() => {}));

async function makeLiveFilm(it, v = state.view) {
  const key = it.filmKey;
  if (!stillFor(v)) { state.films.delete(key); return; }
  const frames = [];
  let away = false;
  state.filming = true;
  await ui('setCapturing', true);
  const backTo = await bringIntoView(it.target);
  try {
    for (let i = 0; i < 4 && stillFor(v); i++) {
      const box = await exec((id) => {
        const el = globalThis.__plTargets?.get(id)?.deref();
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { left: r.left, top: r.top, width: r.width, height: r.height, vw: innerWidth, vh: innerHeight };
      }, [it.target]);
      if (!box || box.width < 2 || box.top >= box.vh || box.top + box.height <= 0) { away = true; break; }
      const shot = await captureTab();
      const crop = await cropFrom(shot, { left: 0, top: 0, width: box.vw, height: box.vh }, box, 600);
      if (crop) frames.push(await loadImage(crop));
      await sleep(350);
    }
  } catch (err) {
    console.warn('[PromptLift] live frame capture failed', err);
  } finally {
    await scrollBack(backTo, v);
    await ui('setCapturing', false);
    state.filming = false;
  }
  if (frames.length < 2) { state.films.set(key, away ? 'away' : 'failed'); refreshFilm(key); return; }
  state.films.set(key, composeStrip(frames));
  state.frames.set(key, smallFrames(frames));
  refreshFilm(key);
}

async function makeFilm(g, attempt = 1, v = state.view) {
  if (!stillFor(v)) { state.films.delete(g.gid); return; }
  let setup;
  let backTo = null; // every animation gets a preview: one that is off screen is filmed there, then the page comes back
  try {
    setup = await exec((id) => window.__plRec?.filmStart(id, { scroll: false }), [g.gid], 'MAIN');
    if (setup?.offscreen) {
      backTo = await exec(() => scrollY, [], 'MAIN');
      setup = await exec((id) => window.__plRec?.filmStart(id, { scroll: true }), [g.gid], 'MAIN');
    }
  } catch (err) {
    console.warn('[PromptLift] filmStart failed', err);
  }
  // Put the page back, unless the person has moved on (then their own scrolling wins).
  const goBack = () => (backTo == null || !stillFor(v) ? null : exec((y) => window.scrollTo({ top: y, behavior: 'instant' }), [backTo], 'MAIN').catch(() => {}));
  if (!setup?.ok) {
    await goBack();
    if (attempt < 2 && stillFor(v)) { await sleep(400); return makeFilm(g, attempt + 1, v); }
    state.films.set(g.gid, 'failed');
    refreshFilm(g.gid);
    return;
  }
  const loop = g.iterations === 'infinite';
  const times = (loop ? [0, 0.25, 0.5, 0.75] : [0, 0.15, 0.35, 0.6, 1]).map((x) => Math.round(x * setup.total));
  const rect = { left: setup.rect.left, top: setup.rect.top, width: setup.rect.right - setup.rect.left, height: setup.rect.bottom - setup.rect.top };
  const view = { left: 0, top: 0, width: setup.vw, height: setup.vh };
  const frames = [];
  state.filming = true;
  await ui('setCapturing', true);
  try {
    for (const t of times) {
      if (!stillFor(v)) break; // user moved on: stop filming, give the page back
      const now = await exec((x) => window.__plRec.filmSeek(x), [t], 'MAIN');
      await sleep(60);
      const shot = await captureTab();
      // Keep the frame size fixed, but follow the element if the page moved.
      const r = now ? { left: now.left, top: now.top, width: rect.width, height: rect.height } : rect;
      const crop = await cropFrom(shot, view, r, 600);
      if (crop) frames.push(await loadImage(crop));
    }
  } catch (err) {
    console.warn('[PromptLift] frame capture failed', err);
  } finally {
    await exec(() => window.__plRec?.filmEnd(), [], 'MAIN').catch(() => {});
    await goBack();
    await ui('setCapturing', false);
    state.filming = false;
  }
  if (frames.length < 2 && stillFor(v) && attempt < 2) { await sleep(400); return makeFilm(g, attempt + 1, v); }
  if (frames.length < 2) { state.films.set(g.gid, state.screen === 'pick' ? 'failed' : undefined); if (state.films.get(g.gid) === undefined) state.films.delete(g.gid); refreshFilm(g.gid); return; }
  state.films.set(g.gid, composeStrip(frames));
  state.frames.set(g.gid, smallFrames(frames));
  refreshFilm(g.gid);
}

/** Each frame shrunk to a thumbnail, for the moving preview. */
function smallFrames(frames) {
  return frames.map((f) => {
    const W = Math.min(240, f.naturalWidth); const H = Math.max(1, Math.round(W * f.naturalHeight / f.naturalWidth));
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    c.getContext('2d').drawImage(f, 0, 0, W, H);
    return c.toDataURL('image/jpeg', 0.8);
  });
}

/** Frames side by side (or stacked, for wide things like headings), with thin separators. */
function composeStrip(frames) {
  const w0 = frames[0].naturalWidth; const h0 = frames[0].naturalHeight;
  const stack = w0 / h0 >= 2.5;
  const gap = 4;
  const c = document.createElement('canvas');
  if (stack) {
    const W = Math.min(480, w0); const H = Math.round(W * h0 / w0);
    c.width = W; c.height = frames.length * H + (frames.length - 1) * gap;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#e4e4e7'; ctx.fillRect(0, 0, c.width, c.height);
    frames.forEach((f, i) => ctx.drawImage(f, 0, i * (H + gap), W, H));
  } else {
    const H = Math.min(140, h0); const W = Math.round(H * w0 / h0);
    c.width = frames.length * W + (frames.length - 1) * gap; c.height = H;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#e4e4e7'; ctx.fillRect(0, 0, c.width, c.height);
    frames.forEach((f, i) => ctx.drawImage(f, i * (W + gap), 0, W, H));
  }
  return c.toDataURL('image/jpeg', 0.85);
}

// ---------- step 2: make it yours ----------

function renderApply() {
  $('title').textContent = 'Where should it go?';
  if (!state.basket.length) {
    main.append(h('p', { class: 'empty' }, 'Nothing chosen yet.'), h('button', { class: 'btn btn-outline wide', onclick: () => go('home') }, 'Pick something'));
    return;
  }
  // What the prompts are for: asked once (first time), then a one-line summary.
  main.append(siteCard());
  if (state.sectionNote) { main.append(h('p', { class: 'small muted', role: 'status' }, state.sectionNote)); state.sectionNote = ''; }
  for (const b of state.basket) main.append(changeCard(b));
  // Only an existing site has "its own" colors and fonts to use instead.
  if (state.site.mode === 'change') {
    const fit = h('input', { type: 'checkbox', id: 'fit', onchange: (e) => { state.fit = e.target.checked ? 'adapt' : 'exact'; } });
    fit.checked = state.fit === 'adapt';
    main.append(h('label', { class: 'check page-check', for: 'fit' }, fit, "Use my site's colors and fonts instead of these"));
  } else state.fit = 'exact';
  if (!state.site.mode) setTray('Choose new site or changing first', 'Copy prompt', copyPrompt, true);
  else setTray('', 'Copy prompt', copyPrompt);
}

/** Copy the prompt, keep it in "Your prompts", and start over on the first screen. */
async function copyPrompt() {
  if (!state.site.mode) { announce('Choose: building a new site, or changing my site'); document.getElementById('mode-new')?.focus(); return; }
  const { text, shotEntry } = promptFor(state.basket, state.fit);
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    console.warn('[PromptLift] clipboard failed', err);
    const ta = h('textarea', { class: 'output', readonly: true, spellcheck: 'false' });
    ta.value = text;
    main.prepend(h('div', { class: 'alert' }, h('strong', {}, "Couldn't copy automatically"), h('p', {}, 'Select the text below and press Ctrl+C (⌘C on Mac).'), ta));
    ta.select();
    return;
  }
  announce('Prompt copied');
  state.notice = { picture: shotEntry?.shot || null, long: state.site.app === 'builder' && state.basket.length > 2 };
  await archiveBasket();
  state.history = [];
  go('home', false);
}

/** Quick "where" chips that fit the thing itself (a heading gets "All headings", a section a place on the page). */
function whereChips(b) {
  const m = b.meta || {};
  if (b.type === 'palette' || b.type === 'design-system' || b.title === 'Page structure') return ['Whole site'];
  if (b.type === 'navigation' || m.kind === 'nav' || m.kind === 'header') return ['Top of every page', 'Top of homepage'];
  if (m.kind === 'footer') return ['Bottom of every page'];
  if (b.type === 'portion' || b.type === 'section' || m.kind === 'section') return ['Top of homepage', 'Middle of homepage', 'Bottom of homepage'];
  const byKind = { heading: /^h[1-6]$/.test(m.tag || '') ? [`All ${m.tag} headings`, 'All headings'] : ['All headings'], button: ['All buttons'], card: ['All cards'], 'nav link': ['All menu links'], link: ['All links'], image: ['All pictures'], input: ['All input boxes'], badge: ['All badges'] };
  if (b.type === 'font') {
    if (/Button/.test(b.title || '')) return ['All buttons', 'Whole site'];
    if (/Heading/.test(b.title || '')) return [...(byKind.heading || []), 'Whole site'];
    return ['All body text', 'Whole site'];
  }
  if (/^(color|gradient|text-gradient)$/.test(b.type)) return [...(byKind[m.kind] || []), 'Top of homepage', 'Whole site'];
  return [...(byKind[m.kind] || []), 'Top of homepage'];
}

function changeCard(b) {
  ADJ.init(b);
  const input = h('input', { type: 'text', id: `where-${b.bid}`, value: b.where, placeholder: state.site.mode === 'new' && !/palette|design-system/.test(b.type) ? 'e.g. homepage, right after the hero' : placeholderFor(b), oninput: (e) => { b.where = e.target.value; saveBasket(); } });
  const chips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Common places' }, whereChips(b).map((c) => h('button', { class: 'chip', type: 'button', onclick: () => { input.value = c; b.where = c; saveBasket(); announce(`Where: ${c}`); } }, c)));
  const head = h('div', { class: 'change-head' },
    b.frames?.length > 1 ? movingPreview(b.frames) : b.shot ? h('img', { class: 'thumb', src: b.shot, alt: '' }) : swatch(b.preview, b.type),
    h('b', {}, b.title || b.label),
    h('button', { class: 'btn btn-ghost icon', 'aria-label': `Remove ${b.title || 'this'}`, html: svg('x'), onclick: () => { state.basket = state.basket.filter((x) => x !== b); saveBasket(); announce('Removed'); go('apply', false); } }));
  // Parts that hold content (a section, a navigation bar, a card…) also ask what they should show.
  const holdsContent = /^(structure|navigation|component|section|section-format)$/.test(b.type) || (b.type === 'portion' && b.parts?.format !== false && /format/i.test(b.label || ''));
  const content = holdsContent ? h('label', { class: 'field', for: `content-${b.bid}` }, h('span', {}, 'What should it show? ', h('span', { class: 'field-optional' }, 'optional')),
    h('textarea', { id: `content-${b.bid}`, rows: 2, placeholder: contentPlaceholder(b), oninput: (e) => { b.content = e.target.value; saveBasket(); } }, b.content || '')) : null;
  // Everything about changing it lives under "Adjust", closed unless something was already changed.
  const changed = !!(b.request?.trim() || b.adjustNote || b.makePicture || b.keepColors || (b.textParts && Object.values(b.textParts).includes(false)));
  const adjust = h('details', { class: 'adjust-box', open: (b.adjustOpen ?? changed) || null, ontoggle: (e) => { b.adjustOpen = e.target.open; } },
    h('summary', { html: `${svg('sliders')}<span>Adjust</span>` }),
    b.textParts ? textPartsRow(b) : null,
    tweakSection(b),
    b.shot && b.shotKind === 'screenshot' && b.type !== 'portion' ? pictureToggle(b) : null);
  return h('section', { class: 'change', 'aria-label': b.title || b.label }, head,
    h('label', { class: 'sr-only', for: `where-${b.bid}` }, `Where should ${b.title || 'it'} go on your site?`), input, chips,
    content,
    state.site.mode === 'change' ? taskRow(b) : null,
    adjust);
}

/** An example of what this part could show, from what its parts are for (cards, headline, menu links…). */
function contentPlaceholder(b) {
  const { list } = P.purposesIn(b.code);
  const has = (re) => list.find((p) => re.test(p.purpose));
  const cards = has(/^card title/);
  if (cards) return `e.g. my ${cards.count > 1 ? cards.count : ''} best sellers, each with a price`.replace('  ', ' ');
  if (has(/^page links?/)) return 'e.g. Home, Menu, About, Contact';
  if (has(/^main headline/)) return 'e.g. fresh bread every morning; order online for pickup';
  if (has(/^price/)) return 'e.g. my plans and their prices';
  return 'e.g. my opening hours and address';
}

/** Changing a site: does this change something that's there, or add something new? */
function taskRow(b) {
  b.task ??= 'replace';
  const btn = (task, label) => h('button', {
    class: 'seg-btn', type: 'button', 'aria-pressed': String(b.task === task), 'data-task': task,
    onclick: (e) => { b.task = task; saveBasket(); e.currentTarget.parentElement.querySelectorAll('.seg-btn').forEach((x) => x.setAttribute('aria-pressed', String(x === e.currentTarget))); },
  }, label);
  return h('div', { class: 'seg small-seg', role: 'group', 'aria-label': 'Change something there, or add new' }, btn('replace', 'Change what is there'), btn('add', 'Add as new'));
}

/** "Make a new picture from this": the change box then describes the picture you want. */
function pictureToggle(b) {
  const id = `mkpic-${b.bid}`;
  const cb = h('input', { type: 'checkbox', id, onchange: (e) => {
    b.makePicture = e.target.checked; saveBasket();
    const req = document.getElementById(`req-${b.bid}`);
    if (req) req.placeholder = b.makePicture ? 'Describe the picture: e.g. "the same scene at night" or "just the glowing ball, on dark"' : req.dataset.placeholder || '';
  } });
  cb.checked = !!b.makePicture;
  return h('label', { class: 'check', for: id }, cb, 'Make a new picture from this');
}

/** The animation playing in a loop, from its captured frames (a still frame with reduced motion). */
function movingPreview(frames) {
  const img = h('img', { class: 'thumb moving', src: frames[0], alt: 'The animation, playing' });
  if (REDUCED_MOTION) return img;
  let i = 0;
  const timer = setInterval(() => {
    if (!img.isConnected) { clearInterval(timer); return; }
    i = (i + 1) % (frames.length + 2); // hold the last frame a moment before starting over
    img.src = frames[Math.min(i, frames.length - 1)];
  }, 220);
  return img;
}


/** For text: which parts to copy. Unticked parts are left for Claude to choose. */
function textPartsRow(b) {
  const box = h('div', { class: 'parts', role: 'group', 'aria-label': 'What to copy' }, h('span', { class: 'field-label' }, 'Copy:'));
  const hasColor = /(^|\n)color:/.test(b.origCode || b.code);
  for (const [key, label] of [['font', 'Font'], ['size', 'Size'], ['color', 'Color']]) {
    if (key === 'color' && !hasColor) continue;
    const id = `part-${key}-${b.bid}`;
    const cb = h('input', { type: 'checkbox', id, onchange: (e) => { b.textParts[key] = e.target.checked; saveBasket(); } });
    cb.checked = b.textParts[key] !== false;
    box.append(h('label', { class: 'check part', for: id }, cb, label));
  }
  return box;
}

function placeholderFor(b) {
  if (b.type === 'recorded-animation') return b.unit === 'letter' || b.unit === 'word' ? 'e.g. my main heading' : 'e.g. my homepage cards';
  if (b.type === 'palette' || b.type === 'design-system' || b.title === 'Page structure') return 'e.g. my whole site';
  if (/^section-/.test(b.type)) return 'e.g. my pricing section';
  if (b.type === 'navigation') return 'e.g. the top of every page';
  if (/gradient/.test(b.type)) return 'e.g. top of my homepage';
  if (b.type === 'picture') return 'e.g. my homepage banner';
  if (b.type === 'font') return 'e.g. all my headings';
  if (b.type === 'hover' || b.type === 'focus') return 'e.g. all my buttons';
  return 'e.g. top of my homepage';
}

/** Tweak area: one-tap tweaks + "show it on the page"; describe / fine-tune / undo live under More options. */
function tweakSection(b) {
  const box = h('div', { class: 'tweak' });
  const note = h('p', { class: 'small muted adjust-note', role: 'status' });
  const paintNote = () => { note.textContent = b.adjustNote ? `Changed: ${b.adjustNote}` : ''; };
  let saveTimer = null;
  const changedNow = () => {
    paintNote();
    const head = box.closest('.change')?.querySelector('.change-head .pv');
    if (head) head.replaceWith(swatch(b.preview, b.type));
    clearTimeout(saveTimer); saveTimer = setTimeout(saveBasket, 300);
    if (state.previewing?.bid === b.bid) applyPreview(b, false);
    if (b.type === 'recorded-animation' && b.livePreview) applyPreview(b, false);
  };
  const inputs = [];
  const syncControls = () => { for (const c of inputs) c.sync(); };

  const presets = ADJ.presets(b);
  const canPreview = (b.type === 'recorded-animation' && b.gid != null) || (b.target && ADJ.previewCss(b));
  const pvBtn = h('button', { class: 'chip chip-strong chip-preview', type: 'button' });
  const paintPv = () => {
    const anim = b.type === 'recorded-animation';
    pvBtn.innerHTML = `${svg(anim ? 'play' : 'eye')}<span></span>`;
    pvBtn.querySelector('span').textContent = anim ? 'Play it' : state.previewing?.bid === b.bid ? 'Stop showing' : 'Show on page';
  };
  paintPv();
  pvBtn.onclick = async () => {
    if (b.type !== 'recorded-animation' && state.previewing?.bid === b.bid) await stopPreview();
    else await applyPreview(b, true);
    paintPv();
  };
  // "How should it change?" first: the quickest way to ask for something different.
  const req = h('textarea', { id: `req-${b.bid}`, rows: 2, placeholder: requestPlaceholder(b), 'data-placeholder': requestPlaceholder(b), oninput: (e) => { b.request = e.target.value; changedNow(); } });
  if (b.makePicture) req.placeholder = 'Describe the picture: e.g. "the same scene at night" or "just the glowing ball, on dark"';
  req.value = b.request || '';
  box.append(h('label', { class: 'field', for: `req-${b.bid}` }, 'How should it change? (optional)', req));

  if (presets.length || canPreview) {
    box.append(h('div', { class: 'chips', role: 'group', 'aria-label': 'Quick tweaks' },
      presets.map((p, i) => h('button', { class: 'chip chip-strong', type: 'button', onclick: () => { ADJ.applyPreset(b, i); announce(p.label); changedNow(); syncControls(); } }, p.label)),
      canPreview ? pvBtn : null));
  }
  box.append(note);

  // More options: exact numbers, undo.
  const more = h('details', { class: 'fine', open: b.fineOpen || null, ontoggle: (e) => { b.fineOpen = e.target.open; } }, h('summary', {}, 'More options'));
  const ctrls = ADJ.controls(b);
  if (ctrls.length) {
    const grid = h('div', { class: 'adjust-grid' });
    for (const c of ctrls) { const ctl = control(b, c, changedNow); inputs.push(ctl); grid.append(ctl.el); }
    more.append(grid);
  }
  if (/animation|hover|focus|scroll/.test(b.type) && P.colorsIn(b.code).length) {
    const id = `keep-${b.bid}`;
    const keep = h('input', { type: 'checkbox', id, onchange: (e) => { b.keepColors = e.target.checked; saveBasket(); } });
    keep.checked = !!b.keepColors;
    more.append(h('label', { class: 'check', for: id }, keep, 'Keep the original colors (otherwise your site\'s own colors are used)'));
  }
  more.append(h('button', { class: 'btn btn-ghost sm', type: 'button', html: `${svg('reset')}<span>Undo changes</span>`, onclick: () => { ADJ.reset(b); b.request = ''; saveBasket(); if (state.previewing?.bid === b.bid) stopPreview(); announce('Back to the original'); go('apply', false); } }));
  box.append(more);
  paintNote();
  return box;
}

function control(b, c, onChange) {
  const id = `c-${b.bid}-${c.key.replace(/\W/g, '-')}`;
  let input;
  const out = h('output', { for: id, class: 'small muted' });
  const paintOut = (val) => { out.textContent = c.kind === 'range' ? `${val}${c.unit || ''}` : ''; };
  const commit = (raw) => {
    const val = c.kind === 'number' || c.kind === 'range' ? Number(raw) : raw;
    if ((c.kind === 'number' || c.kind === 'range') && !Number.isFinite(val)) return;
    ADJ.update(b, c.key, val);
    paintOut(val);
    onChange();
  };
  if (c.kind === 'select') input = h('select', { id, onchange: (e) => commit(e.target.value) }, c.options.map(([val, label]) => h('option', { value: val }, label)));
  else input = h('input', { id, type: c.kind, min: c.min, max: c.max, step: c.step, oninput: (e) => commit(e.target.value) });
  const sync = () => { const v = ADJ.value(b, c.key); input.value = String(v); paintOut(v); };
  sync();
  const el = h('label', { class: `ctl ctl-${c.kind}`, for: id }, h('span', {}, c.label, c.unit && c.kind === 'number' ? ` (${c.unit})` : ''), input, out);
  return { el, sync };
}

function requestPlaceholder(b) {
  if (/gradient/.test(b.type)) return 'e.g. "fade to white at the bottom"';
  if (/animation/.test(b.type)) return 'e.g. "words, not letters"';
  if (b.type === 'font') return 'e.g. "make it italic"';
  if (b.type === 'hover' || b.type === 'focus') return 'e.g. "turn the text white too"';
  return 'e.g. "a bit softer"';
}

/** Show the tweaked item on the source page (restyle the element, or replay the animation). */
async function applyPreview(b, explicit) {
  try {
    if (state.tab?.id !== b.tabId || state.tab?.url !== b.url) throw new Error('Go back to the page you picked this from to see it.');
    if (b.type === 'recorded-animation') {
      b.livePreview = true;
      const r = await exec((gid, opts) => window.__plRec?.replay(gid, opts) ?? { ok: false, error: 'The recording is gone because the page reloaded. Use "Find animations" again to see it.' }, [b.gid, ADJ.replayOptions(b)], 'MAIN');
      if (!r?.ok) throw new Error(r?.error || 'Could not play it.');
      return;
    }
    const css = ADJ.previewCss(b);
    if (state.previewing && state.previewing.bid !== b.bid) await stopPreview();
    const r = await exec(pagePreview, [b.target, css]);
    if (!r?.ok) throw new Error(r?.error || 'Could not show it.');
    state.previewing = { bid: b.bid, ref: b.target };
    if (explicit) announce('Showing your version on the page');
  } catch (err) {
    console.warn('[PromptLift] preview failed', err);
    if (explicit) announce(err.message);
  }
}

async function stopPreview() {
  const p = state.previewing;
  state.previewing = null;
  if (!p) return;
  try { await exec(pagePreview, [p.ref, null]); }
  catch (err) { console.warn('[PromptLift] could not restore preview', err); }
}

/** Runs in the page (isolated world): apply `css` inline on a registered element, or restore it when css is null. */
function pagePreview(ref, css) {
  const el = globalThis.__plTargets?.get(ref)?.deref();
  if (!el || !el.isConnected) return { ok: false, error: 'That part of the page changed or reloaded. Pick it again to see it.' };
  globalThis.__plPreview ??= new Map();
  if (!globalThis.__plPreview.has(el)) globalThis.__plPreview.set(el, el.getAttribute('style'));
  const orig = globalThis.__plPreview.get(el);
  if (css == null) {
    if (orig == null) el.removeAttribute('style'); else el.setAttribute('style', orig);
    globalThis.__plPreview.delete(el);
    return { ok: true };
  }
  const important = css.split(';').map((d) => d.trim()).filter(Boolean).map((d) => `${d} !important`).join('; ');
  el.setAttribute('style', `${orig ? orig.replace(/;?\s*$/, '; ') : ''}${important}`);
  const r = el.getBoundingClientRect();
  if (r.bottom < 0 || r.top > innerHeight) el.scrollIntoView({ block: 'center' });
  return { ok: true };
}

// ---------- step 3: the prompt ----------


async function toPng(blob) {
  const img = await loadImage(URL.createObjectURL(blob));
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  c.getContext('2d').drawImage(img, 0, 0);
  return new Promise((res) => c.toBlob(res, 'image/png'));
}

function flash(btn, text, original, icon) {
  btn.innerHTML = `${svg('check')}<span></span>`;
  btn.querySelector('span').textContent = text;
  setTimeout(() => { btn.innerHTML = `${svg(icon)}<span></span>`; btn.querySelector('span').textContent = original; }, 1800);
}

// ---------- tab tracking + incoming picks ----------

async function refreshTab() {
  state.tab = await currentTab();
  let host = '—';
  try { host = new URL(state.tab.url).host || state.tab.url; } catch { /* keep dash */ }
  $('host').textContent = host;
  // Not awaited: on a busy page (heavy WebGL, endless animation) injecting can take many seconds,
  // and the panel must not stay blank meanwhile.
  ensureRecorder();
}

/** Header "More": things needed now and then, not on every screen. */
$('more').addEventListener('click', async () => {
  const saved = (await sget('saved')) || [];
  const pageOk = state.tab && !restricted(state.tab.url);
  openMenu($('more'), [
    MODE === 'side' && pageOk && { label: 'Open in its own window', icon: 'popout', run: popOut },
    MODE === 'window' && chrome.sidePanel?.open && { label: 'Back to the side panel', icon: 'dock', run: dockBack },
    pageOk && { label: 'Reload the page', icon: 'refresh', run: reloadPage },
    saved.length && { label: `Clear your prompts (${saved.length})`, icon: 'trash', danger: true, confirm: 'Tap again to clear them all', run: clearPrompts },
    { label: 'How it works', icon: 'help', run: async () => { await chrome.storage.local.set({ tipSeen: false }); state.history = []; go('home', false); } },
  ]);
});

/** Side panel → a window of its own the person can move anywhere. The new window opens on the same
 *  screen when there is something being placed; this panel closes once the window is up. */
async function popOut() {
  const screen = state.screen === 'apply' && state.basket.length ? 'apply' : '';
  if (screen) await saveBasket();
  const res = await send({ type: 'promptlift:popOut', tabId: state.tab.id, screen });
  if (!res.connected) console.warn('[PromptLift] the new window did not connect in time');
  state.basket = []; // the window has it now; don't save it to Your prompts on the way out
  window.close();
}

/** Window → back into the browser's side panel (needs the click itself, so it's called first). */
function dockBack() {
  const windowId = state.boundWindow ?? state.tab?.windowId;
  return chrome.sidePanel.open({ windowId }).then(() => window.close());
}

/** Reload the page so animations that play while it loads are caught. */
async function reloadPage() {
  if (!state.tab || restricted(state.tab.url)) return;
  state.recLate = false;
  await chrome.tabs.reload(state.tab.id);
  announce('Page reloaded');
  state.history = [];
  go('home', false);
}

async function ensureRecorder() {
  state.recLate = false;
  if (!state.tab || restricted(state.tab.url)) return;
  try { state.recLate = !!(await send({ type: 'promptlift:ensureRecorder', tabId: state.tab.id })).late; }
  catch (err) {
    // The tab may have just moved to a browser page the extension can't reach: nothing to do.
    const blocked = /Cannot access|No tab with id|Frame with ID/.test(String(err?.message || err));
    (blocked ? console.debug : console.warn)('[PromptLift] could not start the recorder', err);
  }
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'session' || !state.tab) return;
  const ch = changes[`picks:${state.tab.id}`];
  if (!ch?.newValue?.length) return;
  const latest = ch.newValue[0];
  if (latest.at > state.lastSeenPick && latest.url === state.tab.url) openPick(latest);
});

chrome.tabs.onActivated.addListener(async (info) => {
  if (state.boundWindow != null && info.windowId !== state.boundWindow) return; // another window
  if (state.boundWindow == null && new URLSearchParams(location.search).get('tabId')) return; // pinned to one tab (tests)
  if (state.picking) { ui('stopPicking', false); state.picking = false; }
  await refreshTab();
  if (['pick', 'element', 'sections', 'record'].includes(state.screen)) { state.history = []; go('home', false); }
  else if (state.screen === 'home') go('home', false);
});

chrome.tabs.onUpdated.addListener(async (id, info) => {
  if (id !== state.tab?.id) return;
  if (info.status === 'complete' && !info.url) { await ensureRecorder(); if (state.screen === 'home') go('home', false); return; }
  if (!info.url) return;
  await refreshTab();
  if (state.screen === 'home') go('home', false);
});

$('back').addEventListener('click', back);

(async function init() {
  if (IS_POPUP) document.body.classList.add('popup');
  state.port = chrome.runtime.connect({ name: 'panel' });
  if (IS_POPUP) state.port.postMessage({ popup: true });
  state.basket = ((await sget('basket')) || []).map((b) => ADJ.init(b));
  state.site = { mode: null, about: '', ...((await lget('site')) || {}) };
  await refreshTab();
  // In popup mode the popup closed while picking; open the pick that arrived meanwhile.
  const picks = state.tab ? (await sget(`picks:${state.tab.id}`)) || [] : [];
  state.lastSeenPick = (await sget('lastSeenPick')) || 0;
  const fresh = picks[0] && picks[0].url === state.tab?.url && picks[0].at > state.lastSeenPick && Date.now() - picks[0].at < 5 * 60 * 1000;
  if (fresh) openPick(picks[0]);
  else if (new URLSearchParams(location.search).get('screen') === 'apply' && state.basket.length) go('apply', false);
  else go('home', false);
})();
