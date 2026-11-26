// Huescribe side panel (also used as a popup in browsers without a side panel).
// Three steps for anyone: 1) pick something you like on a site, 2) choose and tweak exactly
// what you want from it, 3) paste the ready-made prompt into Claude Code.

const P = globalThis.HuescribePrompts;
const ADJ = globalThis.HuescribeAdjust;
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
  arrowRight: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  blank: '',
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
  logOut: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  box: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>',
};
const svg = (name, cls = 'i') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICON[name]}</svg>`;

const WHERE_CHIPS = [tk('Top of homepage'), tk('Whole site'), tk('All buttons'), tk('All headings')];
// Group and "when" names are identifiers (compared, used in data-group); they are translated only where shown.
const GROUP_ORDER = [tk('Colors'), tk('Fonts'), tk('Layout'), tk('Motion')];
const WHEN_ORDER = [tk('On load'), tk('On scroll'), tk('As you scroll'), tk('On hover'), tk('On click'), tk('Loops'), tk('Later')];

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
  recLate: false,      // the recorder started after this page loaded: load-time animations weren't seen
  notice: null,        // { text, picture } shown once on the home screen after copying
  site: { app: 'claude-code' }, // the one setting: which AI app the prompt goes into (kept in local storage)
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

/** Translated text with {placeholders} filled by DOM nodes (page text stays text, never HTML). */
function tNodes(text, nodes) {
  return text.split(/(\{\w+\})/).map((part) => {
    const m = /^\{(\w+)\}$/.exec(part);
    return m && m[1] in nodes ? nodes[m[1]] : part;
  }).filter((part) => part !== '');
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
  await injectI18n(state.tab.id);
  await chrome.scripting.executeScript({ target: { tabId: state.tab.id }, files });
}

/** Give a tab's isolated world the panel's language and its catalog, before any of our scripts run there. */
async function injectI18n(tabId) {
  const code = I18N.lang;
  await chrome.scripting.executeScript({ target: { tabId }, func: (c) => { globalThis.__huescribeLang = c; }, args: [code] });
  await chrome.scripting.executeScript({ target: { tabId }, files: ['i18n.js'] });
  if (code !== 'en') {
    try { await chrome.scripting.executeScript({ target: { tabId }, files: [`locales/${code}.js`] }); }
    catch (err) { console.warn('[Huescribe] could not load the page translation, using English', code, err); }
  }
  // i18n.js returns early when it was already there: switch it to the current language anyway.
  await chrome.scripting.executeScript({ target: { tabId }, func: (c) => { globalThis.I18N?.use(c); }, args: [code] });
}

async function exec(func, args = [], world = 'ISOLATED') {
  const [res] = await chrome.scripting.executeScript({ target: { tabId: state.tab.id }, func, args, world });
  if (res?.error) throw new Error(res.error.message || String(res.error));
  return res?.result;
}

async function send(msg) {
  const res = await chrome.runtime.sendMessage(msg);
  if (!res?.ok) throw new Error(res?.error || t("Huescribe didn't answer. Try again in a moment."));
  return res;
}

const sget = async (key) => (await chrome.storage.session.get(key))[key];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Build the prompt text for a basket (also used when saving it to the list). */
// ---------- keeping the list ----------
// Session storage holds only 10 MB, and a few real picks with their pictures and preview frames go
// over that. So the list's text goes to session storage and its pictures to the extension's own
// IndexedDB (cleared with the list, and when the browser closes the session entries are gone too).
const PIC_FIELDS = ['shot', 'rowShot', 'frames'];
let picDb = null;
function openPicDb() {
  if (picDb) return picDb;
  picDb = new Promise((resolve, reject) => {
    const req = indexedDB.open('huescribe', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('pics');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return picDb;
}
async function picStore(mode, fn) {
  const db = await openPicDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pics', mode);
    const out = fn(tx.objectStore('pics'));
    tx.oncomplete = () => resolve(out?.result ?? out);
    tx.onerror = () => reject(tx.error);
  });
}

async function saveBasket() {
  const light = state.basket.map((b) => { const o = { ...b }; for (const f of PIC_FIELDS) if (o[f] != null) { o[f] = null; o.hasPics = true; } return o; });
  try { await chrome.storage.session.set({ basket: light }); }
  catch (err) { console.warn('[Huescribe] could not save the list', err); }
  try {
    await picStore('readwrite', (st) => {
      st.clear();
      for (const b of state.basket) {
        const pics = {};
        for (const f of PIC_FIELDS) if (b[f] != null) pics[f] = b[f];
        if (Object.keys(pics).length) st.put(pics, b.bid);
      }
    });
  } catch (err) { console.warn('[Huescribe] could not save the list pictures', err); }
}

/** The saved list, with its pictures put back. Pictures that can't be read just stay out. */
async function loadBasket() {
  const list = (await sget('basket')) || [];
  if (!list.some((b) => b.hasPics)) return list;
  try {
    const db = await openPicDb();
    await Promise.all(list.filter((b) => b.hasPics).map((b) => new Promise((resolve) => {
      const req = db.transaction('pics').objectStore('pics').get(b.bid);
      req.onsuccess = () => { Object.assign(b, req.result || {}); delete b.hasPics; resolve(); };
      req.onerror = () => resolve();
    })));
  } catch (err) { console.warn('[Huescribe] could not read the list pictures', err); }
  return list;
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
    console.debug('[Huescribe] capture failed once, retrying', err);
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
    (gone ? console.debug : console.warn)('[Huescribe] page UI call failed', name, err);
    return null;
  }
}

/** Selection boxes for everything chosen from this page, so the user sees what they're editing. */
// ---------- navigation ----------

function go(screen, push = true) {
  if (!state.account && screen !== 'signin') { state.history = []; screen = 'signin'; push = false; }
  if (state.previewing && screen !== 'home') stopPreview();
  if (state.recording && screen !== 'record') stopRecording();
  if (screen !== 'pick') { stopPreviewLoop(); abortScrollCheck(); }
  if (push && state.screen !== screen) state.history.push(state.screen);
  state.screen = screen;
  state.renderSeq = (state.renderSeq || 0) + 1; // async screens drop out if a newer render started
  clearInterval(state.pollTimer);
  state.pollTimer = null;
  $('back').hidden = screen === 'home';
  main.replaceChildren();
  setTray(null);
  window.scrollTo(0, 0);
  if (screen === 'signin') { if (state.picking) { ui('stopPicking', false); state.picking = false; } }
  else if (!IS_POPUP && state.tab && !restricted(state.tab.url)) {
    // Picking is always on, except while recording a press or scroll.
    if (screen !== 'record') { if (!state.picking && !state.pickPaused) startPick(true); }
    else if (state.picking) { state.picking = false; ui('stopPicking', false); }
  }
  if (screen === 'home') ui('clearSelection');
  SCREENS[screen]();
  if (push) $('title').focus({ preventScroll: true });
}

function back() { go(state.history.pop() || 'home', false); }

// The main button's label, like the website's buttons: on hover the label rolls up (its twin rises in from below; the
// twin is a CSS pseudo-element, so textContent is still exactly the label) and a thick right arrow opens out after it.
function setBtnLabel(b, label) {
  b.replaceChildren(h('span', { class: 'roll' }, h('span', { class: 'roll-in', 'data-t': label }, label)),
    h('span', { class: 'arw', 'aria-hidden': 'true', html: svg('arrowRight') }));
}

function setTray(text, label, onClick, disabled = false) {
  const tray = $('tray');
  if (!label) { tray.hidden = true; return; }
  tray.hidden = false;
  $('tray-text').textContent = text || '';
  const b = $('tray-btn');
  setBtnLabel(b, label);
  b.disabled = disabled;
  b.onclick = onClick;
  // The shortcut is shown on the button itself (a pseudo-element, so the label stays the label).
  b.dataset.kbd = IS_MAC ? '⌘↵' : 'Ctrl ↵';
  b.title = `${label} (${IS_MAC ? '⌘' : 'Ctrl'}+Enter)`; // label is already translated; key names stay
}

const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
// ⌘/Ctrl+Enter runs the main button of whatever screen is open (add, copy).
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' || !(e.metaKey || e.ctrlKey) || e.repeat) return;
  const b = $('tray-btn');
  if (!b || $('tray').hidden || b.disabled) return;
  e.preventDefault();
  b.click();
});

function spinner(text) {
  main.replaceChildren(h('div', { class: 'spinner', 'aria-hidden': 'true' }), h('p', { class: 'muted center', role: 'status' }, text));
}

function showError(title, text, retry) {
  main.replaceChildren(h('div', { class: 'alert', role: 'alert' }, h('strong', {}, title), h('p', {}, text)),
    retry ? h('button', { class: 'btn btn-outline wide', onclick: retry }, t('Try again')) : null);
}

// ---------- screens ----------

// Google's "G" (brand mark required next to "Continue with Google"; the one place a non-Lucide icon is allowed)
const GOOGLE_G = '<svg viewBox="0 0 48 48" width="18" height="18"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';

/** The sentence for a sign-in problem (codes from account.js). */
function signinMessage(code) {
  return {
    cancelled: t('Sign-in was closed. Try again when you are ready.'),
    offline: t("Can't reach Google. Check your connection and try again."),
    'not-configured': t("Google sign-in isn't set up in this copy of Huescribe yet."),
    'signed-out': t('Google asked to sign in again. Try once more.'),
  }[code] || t("Google sign-in didn't work. Try again in a moment.");
}

/** Who is signed in, for the ⋯ menu. */
function paintAccount() {
  document.body.classList.toggle('signed-out', !state.account);
}

/** Sign out: forget the account here, give Google's permission back, show the sign-in screen. */
async function signOut() {
  try { await HuescribeAccount.signOut(); } catch (err) { console.error('[Huescribe] sign-out failed', err); }
  state.account = null;
  paintAccount();
  announce(t('Signed out'));
  go('signin', false);
}

// Signed in or out somewhere else (another window of the panel, or the account was removed): follow it.
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== 'local' || !('account' in changes || 'accountTestUser' in changes)) return;
  const was = !!state.account;
  state.account = await HuescribeAccount.get();
  paintAccount();
  if (was && !state.account) go('signin', false);
  else if (!was && state.account && state.screen === 'signin') go('home', false);
});

const SCREENS = {
  /** Signed out: one screen, "Continue with Google" (and the practice, which needs no account). */
  signin() {
    $('title').textContent = t('Sign in to start');
    $('back').hidden = true;
    const msg = h('p', { class: 'signin-msg', role: 'status', 'aria-live': 'polite' });
    const go_ = h('button', { class: 'btn btn-google', type: 'button', id: 'google-signin' },
      h('span', { class: 'g-logo', 'aria-hidden': 'true', html: GOOGLE_G }), h('span', {}, t('Continue with Google')));
    go_.addEventListener('click', async () => {
      go_.disabled = true; msg.textContent = t('Waiting for Google…'); msg.className = 'signin-msg';
      try {
        state.account = await HuescribeAccount.signIn();
        announce(t('Signed in as {email}', { email: state.account.email }));
        paintAccount();
        go('home', false);
      } catch (err) {
        console.error('[Huescribe] Google sign-in failed', err.cause || err);
        msg.textContent = signinMessage(err.code);
        msg.className = 'signin-msg ' + (err.code === 'cancelled' ? '' : 'bad');
        go_.disabled = false;
      }
    });
    main.append(h('div', { class: 'signin' },
      h('div', { class: 'signin-art', 'aria-hidden': 'true' }, h('i'), h('i', { class: 'on' }), h('i')),
      h('h2', {}, t('Turn any website into an AI prompt')),
      h('p', { class: 'muted' }, t('Sign in once with your Google account to use Huescribe.')),
      go_, msg,
      h('p', { class: 'signin-fine' }, t('Huescribe gets your name, email and photo from Google, and keeps them in this browser.')),
      h('button', { class: 'btn btn-outline wide', type: 'button', id: 'signin-practice', onclick: openWelcome }, t('Try the 1-minute practice first'))));
    if (!HuescribeAccount.isConfigured()) { msg.textContent = signinMessage('not-configured'); msg.className = 'signin-msg bad'; }
  },
  /** The main screen: picking is on, and everything chosen so far is one list that becomes one prompt. */
  async home() {
    const seq = state.renderSeq;
    ensureRows();
    $('title').textContent = t('My list');
    if (state.notice) main.append(noticeCard(state.notice));
    state.notice = null;
    if (!state.tab || restricted(state.tab.url)) {
      if (state.tab?.url?.startsWith(chrome.runtime.getURL('welcome.html'))) main.append(h('div', { class: 'alert' }, h('strong', {}, t("You're ready")), h('p', {}, t('Open any website and click a part you like.'))));
      else main.append(h('div', { class: 'alert' }, h('strong', {}, t('Open a website first')), h('p', {}, t('Then open Huescribe again from there.'))));
    } else main.append(pickingStatus());
    const tipSeen = await lget('tipSeen');
    if (seq !== state.renderSeq) return;
    const rows = rowsOf(state.basket);
    if (!rows.length) {
      if (!tipSeen) main.append(tipCard());
      else main.append(h('div', { class: 'empty-state', id: 'list-empty' },
        h('b', {}, t('Your list is empty')),
        h('p', {}, t('Nothing here yet. Click something you like on the page and it shows up here.'))));
      main.append(customBox());
      setTray(null);
      return;
    }
    const list = h('ol', { class: 'row-list', 'aria-label': t('My list') });
    rows.forEach((r, i) => list.append(h('li', {}, rowCard(r, i, rows))));
    // The row just added catches the eye for a moment.
    if (state.freshRow) { const k = rows.findIndex((r) => r[0].row === state.freshRow); if (k >= 0) list.children[k].classList.add('fresh'); state.freshRow = null; }
    main.append(list);
    main.append(customBox());
    setTray('', tn(rows.length, 'Copy prompt ({n} part)', 'Copy prompt ({n} parts)'), copyPrompt);
  },
  pick() { renderItems(state.view); if (state.view?.filmGroups?.length || state.view?.items.some((i) => i.stateCss)) startPreviewLoop(state.view, state.view.filmGroups || []); },
  secpick() { renderSectionPick(); },
  record() { renderRecording(); },
};

/** The list in rows: the parts copied from one pick stay together. */
function rowsOf(basket) {
  const rows = [];
  const at = new Map();
  for (const b of basket) {
    if (!at.has(b.row)) { at.set(b.row, rows.length); rows.push([]); }
    rows[at.get(b.row)].push(b);
  }
  return rows;
}

/** Older lists (one entry per part, or saved prompts from version 8) become rows, once. */
function ensureRows() {
  for (const b of state.basket) if (!b.row) { b.row = b.bid; b.rowTitle = b.title; b.rowShot = b.shot || null; }
}

/** Empty the list (from the header menu; asks once more first). */
async function clearList() {
  state.basket = [];
  await saveBasket();
  announce(t('List cleared'));
  if (state.screen === 'home') go('home', false);
}

let openMenuEl = null;
function closeMenu() {
  if (!openMenuEl) return;
  openMenuEl.anchor.setAttribute('aria-expanded', 'false');
  openMenuEl.remove();
  openMenuEl = null;
}

/** A small menu under `anchor`. entries: [{ label, icon, run, danger, confirm, lang }] (falsy ones skipped). */
function openMenu(anchor, entries) {
  const was = openMenuEl?.anchor === anchor;
  closeMenu();
  if (was) return;
  const menu = h('div', { class: 'menu', role: 'menu' });
  for (const e of entries.filter(Boolean)) {
    const item = h('button', { class: `menu-item${e.danger ? ' danger' : ''}`, type: 'button', role: 'menuitem', html: `${e.icon === 'check' || e.icon === 'blank' ? svg(e.icon) : ''}<span></span>` }); // only the AI-app menu marks its choice; other menus are text only
    item.querySelector('span').textContent = e.label;
    if (e.lang) item.querySelector('span').lang = e.lang; // a language's own name, read in that language
    item.onclick = async () => {
      if (e.confirm && item.dataset.sure !== '1') { item.dataset.sure = '1'; item.querySelector('span').textContent = e.confirm; return; }
      closeMenu();
      try { await e.run(); } catch (err) { console.warn('[Huescribe] menu action failed', e.label, err); announce(t('That did not work. Try again.')); }
    };
    menu.append(item);
  }
  const r = anchor.getBoundingClientRect();
  menu.style.top = `${r.bottom + window.scrollY + 4}px`;
  // Near the bottom of the panel: open upwards so every item can be reached without scrolling.
  const tall = 44 * entries.filter(Boolean).length + 12;
  if (r.bottom + tall > innerHeight && r.top - tall > 0) { menu.style.top = `${r.top + window.scrollY - tall - 4}px`; menu.classList.add('up'); }
  menu.style.right = `${Math.max(8, document.documentElement.clientWidth - r.right)}px`;
  menu.anchor = anchor;
  document.body.append(menu);
  anchor.setAttribute('aria-expanded', 'true');
  openMenuEl = menu;
  menu.querySelector('button')?.focus();
}
document.addEventListener('click', (e) => { if (openMenuEl && !openMenuEl.contains(e.target) && !openMenuEl.anchor.contains(e.target)) closeMenu(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && openMenuEl) { const a = openMenuEl.anchor; closeMenu(); a.focus(); } });
// The menu sits in the page and scrolls with it, so scrolling (e.g. to reach its last item) keeps it open.

/** The one setting: which AI app the prompt goes into (each gets it in the form it reads best). */
function paintAppButton() {
  const btn = $('app');
  if (!btn) return;
  const label = t((P.APPS[state.site.app] || P.APPS['claude-code']).label);
  btn.querySelector('span').textContent = label;
  btn.setAttribute('aria-label', t('Prompts for {app}. Change', { app: label }));
}
async function setApp(app) {
  state.site.app = app;
  try { await chrome.storage.local.set({ site: { app } }); } catch (err) { console.warn('[Huescribe] could not save the app', err); }
  paintAppButton();
  announce(t('Prompts are written for {app}', { app: t(P.APPS[app].label) }));
}

function noticeCard(n) {
  if (!n.added) return copiedCard(n);
  const box = h('div', { class: 'notice', role: 'status' },
    h('span', { class: 'notice-text' }, h('b', {}, t('Added')), ` · ${t(n.added)}`));
  if (n.long) box.append(h('span', { class: 'small muted' }, t('AI apps do better with a few parts at a time.')));
  const pics = n.pictures || [];
  if (pics.length) box.append(h('div', { class: 'pic-row' }, ...pics.map((src, k) => pictureButton(src, pics.length > 1 ? t('Copy picture {n}', { n: k + 1 }) : t('Copy picture too')))));
  return box;
}

/** After copying: unmistakable. What was copied, where it is, and the one next step. */
function copiedCard(n) {
  const c = n.copied || {};
  const pics = n.pictures || [];
  const what = [c.parts ? tn(c.parts, '{n} part', '{n} parts') : '', c.chars ? t('{count} characters', { count: I18N.num(c.chars) }) : '', pics.length ? tn(pics.length, '{n} picture to add', '{n} pictures to add') : ''].filter(Boolean).join(' · ');
  const box = h('div', { class: 'notice copied-card', role: 'status' },
    h('span', { class: 'copied-badge', html: svg('check') }),
    h('div', { class: 'copied-text' },
      h('b', {}, t('Copied to your clipboard')),
      what ? h('span', { class: 'copied-what' }, what) : null),
    h('ol', { class: 'next-steps' },
      h('li', {}, t('Open {app}', { app: appName() })),
      h('li', {}, ...tNodes(t('Paste: {mod}{key} and send'), { mod: h('kbd', {}, IS_MAC ? '⌘' : 'Ctrl'), key: h('kbd', {}, 'V') })),
      pics.length ? h('li', {}, tn(pics.length, 'Then add the picture (buttons below)', 'Then add the pictures (buttons below)')) : null));
  if (n.long) box.append(h('span', { class: 'small muted copied-note' }, t('AI apps do better with a few parts at a time.')));
  if (c.cleared && state.lastCopy) {
    box.append(h('div', { class: 'copied-actions' },
      h('span', { class: 'small muted' }, t('Your list is empty again, ready for the next idea.')),
      h('button', { class: 'btn btn-ghost sm', type: 'button', id: 'copy-again', onclick: async () => {
        try { await navigator.clipboard.writeText(state.lastCopy.text); announce(t('Copied again')); ui('toast', t('Prompt copied again'), true); } catch (err) { console.warn('[Huescribe] clipboard failed', err); announce(t("Couldn't copy")); }
      } }, t('Copy again')),
      h('button', { class: 'btn btn-ghost sm', type: 'button', id: 'undo-clear', onclick: async () => {
        state.basket = state.lastCopy.basket; state.lastCopy = null; state.notice = null;
        await saveBasket(); announce(t('List is back')); go('home', false);
      } }, t('Undo'))));
  }
  if (pics.length) box.append(h('div', { class: 'pic-row' }, ...pics.map((src, k) => pictureButton(src, pics.length > 1 ? t('Copy picture {n}', { n: k + 1 }) : t('Copy picture too')))));
  return box;
}

/** The hands-on practice page (welcome.html) in a new tab next to this one. */
function openWelcome() {
  chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html'), index: state.tab ? state.tab.index + 1 : undefined })
    .catch((err) => { console.error('[Huescribe] could not open the practice page', err); announce(t("Couldn't open the practice")); });
}

/** First run in the panel: show (not tell) the three moves in a small loop, and offer the practice page. */
function tipCard() {
  const loop = h('div', { class: 'tip-loop', 'aria-hidden': 'true' },
    h('span', { class: 'tl-site' }, h('i'), h('i', { class: 'tl-pick' }), h('i')),
    h('span', { class: 'tl-chips' }, h('i'), h('i'), h('i')),
    h('span', { class: 'tl-copy' }),
    h('span', { class: 'tl-cur' }));
  const box = h('div', { class: 'tip' },
    loop,
    h('span', { class: 'tip-steps', 'aria-label': t('Click a part, choose what to take, copy the prompt.') },
      h('b', {}, t('Click')), h('span', { 'aria-hidden': 'true' }, '→'), h('b', {}, t('Choose')), h('span', { 'aria-hidden': 'true' }, '→'), h('b', {}, t('Copy'))),
    h('span', { class: 'tip-btns' },
      h('button', { class: 'btn btn-primary sm', type: 'button', id: 'tip-try', onclick: openWelcome }, t('Practice (1 minute)')),
      h('button', { class: 'btn btn-outline sm', type: 'button', id: 'tip-ok', onclick: async () => { await chrome.storage.local.set({ tipSeen: true }); go('home', false); } }, t('Got it'))));
  return box;
}

async function lget(key) {
  try { return (await chrome.storage.local.get(key))[key]; } catch { return undefined; }
}

/** Copy a picture to the clipboard (or download it where images can't be copied). */
function pictureButton(src, label = t('Copy picture'), iconOnly = false) {
  const btn = h('button', { class: `btn btn-outline sm${iconOnly ? ' icon-btn' : ''}`, type: 'button', 'aria-label': iconOnly ? t('Copy picture') : null, title: iconOnly ? t('Copy picture') : null, html: iconOnly ? svg('image') : `<span>${label}</span>` });
  btn.onclick = async () => {
    try {
      const blob = await (await fetch(src)).blob();
      const png = blob.type === 'image/png' ? blob : await toPng(blob);
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
      if (iconOnly) announce(t('Picture copied')); else flash(btn, t('Copied!'), label, 'image');
      announce(t('Picture copied'));
    } catch (err) {
      console.warn('[Huescribe] image copy failed, downloading', err);
      const a = h('a', { href: src, download: 'huescribe-picture.png' });
      document.body.append(a); a.click(); a.remove();
      if (iconOnly) announce(t('Picture saved to downloads')); else flash(btn, t('Saved to downloads'), label, 'image');
    }
  };
  return btn;
}

/** What a row copies, in the five words of the pick card. */
function rowWhat(entries) {
  const has = new Set();
  for (const b of entries) {
    if (b.type === 'portion') {
      if (b.parts?.colors) has.add('Colors');
      if (b.parts?.fonts) has.add('Fonts');
      if (b.parts?.format) has.add('Layout');
      if (b.parts?.scroll) has.add('Motion');
    } else if (b.group) has.add(b.group);
  }
  return GROUP_ORDER.filter((g) => has.has(g)).map((g) => t(g)).join(' · ');
}

/** The picture that goes with a row (a filmstrip, before → after, a scroll film, or a new picture). */
const rowPicture = (entries) => entries.find((b) => b.makePicture && b.shot) || entries.find((b) => /film|beforeafter|scrollfilm/.test(b.shotKind || '') && b.shot) || null;

/** One row of my list: what it is, what is copied, where it goes, what it should show; the rest under ⋯. */
function rowCard(entries, i, rows) {
  const first = entries[0];
  const name = t(first.rowTitle || first.title || first.label); // shown only; titles may be English keys
  const thumb = first.frames?.length > 1 ? movingPreview(first.frames) : (first.rowShot || first.shot) ? h('img', { class: 'thumb', src: first.rowShot || first.shot, alt: '' }) : swatch(first.preview, first.type);
  const move = (d) => {
    const order = rows.map((r) => r[0].row);
    const k = order.indexOf(first.row);
    if (k + d < 0 || k + d >= order.length) return;
    [order[k], order[k + d]] = [order[k + d], order[k]];
    state.basket = order.flatMap((id) => state.basket.filter((b) => b.row === id));
    saveBasket();
    announce(t('Moved to number {n}', { n: k + d + 1 }));
    go('home', false);
  };
  const remove = () => { state.basket = state.basket.filter((b) => b.row !== first.row); saveBasket(); announce(t('Removed {name}', { name })); go('home', false); };
  const pic = rowPicture(entries);
  const adjust = h('details', { class: 'adjust-box', open: first.adjustOpen || null, ontoggle: (e) => { first.adjustOpen = e.target.open; } },
    h('summary', { html: `<span>${t('Adjust')}</span>${svg('down', 'i adj-chev')}` }),
    ...entries.map((b) => h('div', { class: 'adjust-part' },
      entries.length > 1 ? h('b', { class: 'adjust-part-name' }, t(b.title || b.label)) : null,
      tweakSection(b),
      b.shot && b.shotKind === 'screenshot' && b.type !== 'portion' ? pictureToggle(b) : null)));
  const more = h('button', { class: 'btn btn-ghost icon-btn row-more', type: 'button', 'aria-label': t('More for {name}', { name }), 'aria-haspopup': 'menu', 'aria-expanded': 'false', html: svg('more') });
  more.onclick = () => openMenu(more, [
    { label: t('Adjust'), icon: 'sliders', run: () => { adjust.open = true; adjust.scrollIntoView({ block: 'nearest' }); } },
    { label: t('Copy just this'), icon: 'copy', run: async () => { await navigator.clipboard.writeText(P.buildSupplemental(entries, { fit: 'exact', pictureFor: pic?.bid || null, ctx: state.site })); announce(t('This part copied')); } },
    pic && { label: t('Copy picture'), icon: 'image', run: async () => { const blob = await (await fetch(pic.shot)).blob(); await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob.type === 'image/png' ? blob : await toPng(blob) })]); announce(t('Picture copied')); } },
    i > 0 && { label: t('Move up'), icon: 'up', run: () => move(-1) },
    i < rows.length - 1 && { label: t('Move down'), icon: 'down', run: () => move(1) },
    { label: t('Remove'), icon: 'trash', danger: true, run: remove },
  ]);
  // Where it goes: one box for the whole row (empty = in list order, top to bottom).
  const whereId = `where-${first.row}`;
  const input = h('input', { type: 'text', id: whereId, value: first.where || '', placeholder: placeholderFor(first), oninput: (e) => { for (const b of entries) b.where = e.target.value; saveBasket(); } });
  const chips = h('div', { class: 'chips', role: 'group', 'aria-label': t('Common places') }, whereChips(first).map((c) => h('button', { class: 'chip', type: 'button', onclick: () => { input.value = c; for (const b of entries) b.where = c; saveBasket(); announce(t('Where: {place}', { place: c })); } }, c)));
  // Parts that hold content (a section, a navigation bar, a card…) also ask what they should show.
  const holders = entries.filter(holdsContent);
  const content = holders.length ? h('label', { class: 'field', for: `content-${first.row}` }, h('span', {}, `${t('What should it show?')} `, h('span', { class: 'field-optional' }, t('optional'))),
    h('textarea', { id: `content-${first.row}`, rows: 2, placeholder: contentPlaceholder(holders[0]), oninput: (e) => { for (const b of holders) b.content = e.target.value; saveBasket(); } }, holders[0].content || '')) : null;
  return h('section', { class: 'change row-card', 'aria-label': name },
    h('div', { class: 'change-head' }, h('span', { class: 'row-num', 'aria-hidden': 'true' }, String(i + 1).padStart(2, '0')), thumb,
      h('span', { class: 'row-name' }, h('b', {}, name), h('small', {}, rowWhat(entries))), more),
    h('label', { class: 'sr-only', for: whereId }, t('Where should {name} go on your site?', { name })), input, chips, content, adjust);
}

/** Parts that hold content (a section, a navigation bar, a card…). */
const holdsContent = (b) => /^(structure|navigation|component|section|section-format)$/.test(b.type) || (b.type === 'portion' && b.parts?.format !== false);

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
    await send({ type: 'huescribe:startPicker', tabId: state.tab.id });
    state.picking = true;
    (state.pickingTabs ||= new Set()).add(state.tab.id);
    state.port?.postMessage({ pickingTab: state.tab.id });
    if (IS_POPUP) { window.close(); return; }
    if (!quiet && state.screen === 'home') go('home', false);
    refreshPickingStatus();
  } catch (err) {
    // A browser page or a page that just went away can't be picked on: not an error.
    const gone = /Cannot access|chrome:\/\/|No tab with id|Frame with ID|was removed/.test(String(err?.message || err));
    (gone && quiet ? console.debug : console.error)('[Huescribe] picker failed', err);
    state.picking = false;
    if (/signed-out/.test(String(err?.message || err))) { state.account = null; go('signin', false); return; }
    if (!quiet) showError(t("Couldn't start"), t('Reload the page and try again.'), () => startPick(false));
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
    // Quiet and scannable: a live dot, then the three gestures as key caps.
    box.replaceChildren(h('div', { class: 'status live', role: 'status' },
      h('span', { class: 'live-dot', 'aria-hidden': 'true' }),
      h('span', { class: 'gestures' },
        h('span', { html: t('<b>Click anything</b> on the page') }),
        h('span', {}, ...tNodes(t('{up}{down} whole section'), { up: h('kbd', {}, '↑'), down: h('kbd', {}, '↓') })),
        h('span', {}, ...tNodes(t('{drag} an area'), { drag: h('kbd', {}, t('Drag')) })))));
  } else if (state.startingPick) {
    box.replaceChildren(h('div', { class: 'status', role: 'status' }, h('span', { class: 'spinner sm', 'aria-hidden': 'true' }), h('span', {}, t('Getting the page ready…'))));
  } else {
    box.replaceChildren(h('button', { class: 'hero-btn', id: 'pick-btn', onclick: () => { state.pickPaused = false; startPick(false); } }, h('span', {}, h('b', {}, t('Start picking')), h('small', {}, t('Click anything on the page')))));
  }
}

function refreshPickingStatus() {
  const box = document.getElementById('picking-status');
  if (box) paintPickingStatus(box);
}

/** The page says a click is being read: show it right away, so the click never feels ignored. */
function showReadingStatus(title) {
  document.getElementById('reading-status')?.remove();
  if (!['home', 'pick', 'secpick'].includes(state.screen)) return;
  const box = h('div', { class: 'status reading-status', role: 'status', id: 'reading-status' }, h('span', { class: 'spinner sm', 'aria-hidden': 'true' }), h('span', {}, ...tNodes(t('Reading {what}…'), { what: h('b', {}, title ? t(title) : t('your pick')) })));
  main.prepend(box);
  window.scrollTo({ top: 0, behavior: REDUCED_MOTION ? 'auto' : 'smooth' });
  clearTimeout(state.readingTimer);
  state.readingTimer = setTimeout(() => box.remove(), 15000); // a pick that never arrives
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Esc on the page: picking stays off (even on other screens) until Start picking.
  if (msg?.type === 'huescribe:pickingStopped') { state.picking = false; state.pickPaused = true; refreshPickingStatus(); }
  if (msg?.type === 'huescribe:reading' && sender.tab?.id === state.tab?.id) showReadingStatus(msg.title);
  if (msg?.type === 'huescribe:readingFailed' && sender.tab?.id === state.tab?.id) {
    // Say so in the panel too (the page shows a short toast that is easy to miss).
    const box = document.getElementById('reading-status');
    if (box) {
      clearTimeout(state.readingTimer);
      box.className = 'status reading-status failed';
      box.setAttribute('role', 'alert');
      box.replaceChildren(h('span', {}, h('b', {}, t("Couldn't read that part.")), ` ${t('Try another.')}`));
      state.readingTimer = setTimeout(() => box.remove(), 6000);
    }
  }
  if (msg?.type === 'huescribe:section') {
    if (!msg.add || sender.tab?.id !== state.tab?.id) { sendResponse({ ok: false }); return; }
    openSectionPick(msg.add);
    sendResponse({ ok: true });
  }
});

function openPick(p) {
  abortScrollCheck(); // the previous pick's scroll check stops (and puts the page back)
  state.lastSeenPick = Math.max(state.lastSeenPick, p.at);
  chrome.storage.session.set({ lastSeenPick: state.lastSeenPick }).catch((e) => console.warn('[Huescribe] could not save lastSeenPick', e));
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
    console.warn('[Huescribe] recorder query failed', err);
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
      } catch (err) { console.debug('[Huescribe] could not restart CSS animations', err); }
    }
  }
  if (!view.sel?.docRect) {
    // Something you can press (button, link, menu toggle…): offer to catch what happens when pressed.
    const info = await exec((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const p = el.closest('a[href], button, [role=button], summary, label, input[type=checkbox], input[type=radio], [onclick], [aria-expanded], [aria-controls]');
      return { pressable: !!p || getComputedStyle(el).cursor === 'pointer', meta: globalThis.__Huescribe?.metaOf?.(el) || null };
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
    await state.filmQueue.catch(() => {}); // pictures first, so the test cursor and CSS states stay out of them
    await catchHoverFor(view);
    await state.filmQueue.catch(() => {});
    if (state.view === view && state.screen === 'pick') runScrollCheck(view);
  }
}

/** Show a hover / press effect on the real element (its own transition plays, then it plays back). */
function playStateOnPage(it, opts = {}) {
  if (!it.stateOn || !it.stateCss) return;
  exec((ref, css, o) => globalThis.__Huescribe?.playState(ref, css, o), [it.stateOn, it.stateCss, opts]).catch((e) => console.debug('[Huescribe] could not show the effect', e));
}

/** Before → after pictures of a hover / press effect, for the card and the prompt. */
function queueStateFilms(items) {
  for (const it of items) {
    if (!it.stateCss || !it.stateOn) continue;
    it.filmKey = `state-${it.id}`;
    if (state.films.has(it.filmKey)) continue;
    state.films.set(it.filmKey, 'pending');
    { const v = state.view; state.filmQueue = state.filmQueue.then(() => makeStateFilm(it, v)).catch((e) => console.warn('[Huescribe] state film failed', e)); }
  }
}

async function makeStateFilm(it, v = state.view) {
  const key = it.filmKey;
  if (!stillFor(v)) { state.films.delete(key); return; }
  const frames = [];
  let away = false;
  state.filming = true;
  await ui('setCapturing', true);
  const backTo = await bringIntoView(it.target, v);
  try {
    for (const on of [false, true]) {
      if (!stillFor(v)) break;
      const box = await exec((ref, stateOn, css, apply) => {
        const L = globalThis.__Huescribe;
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
    console.warn('[Huescribe] before/after capture failed', err);
  } finally {
    await exec((ref) => globalThis.__Huescribe?.restoreState(ref), [it.stateOn]).catch(() => {});
    await scrollBack(backTo, v);
    await ui('setCapturing', false);
    state.filming = false;
  }
  if (frames.length < 2) { state.films.set(key, away ? 'away' : 'failed'); refreshFilm(key); return; }
  state.films.set(key, composeStrip(frames));
  state.frames.set(key, smallFrames(frames));
  refreshFilm(key);
}

/**
 * After picking: the pointer test (9.3). A cursor glides onto the pick on the page, rests (hover),
 * and, for things you can press, presses and lets go, then moves away. The page's JavaScript
 * effects are recorded at each step (hover and press apart); its CSS :hover / :active looks are
 * shown on the element at the same moments so you see everything the test sees. No click is sent.
 */
async function catchHoverFor(view) {
  const sel = `[data-pl-pick="${view.pickId}"]`;
  const live = () => state.view === view && state.screen === 'pick';
  const cssStates = (when) => view.items.filter((i) => i.stateCss && i.stateOn && i.when === when);
  const showStates = (list) => Promise.all(list.map((it) => exec((ref, css) => globalThis.__Huescribe?.playState(ref, css, { still: true }), [it.stateOn, it.stateCss]).catch(() => {})));
  const clearStates = (list) => Promise.all(list.map((it) => exec((ref) => globalThis.__Huescribe?.restoreState(ref), [it.stateOn]).catch(() => {})));
  let began = false;
  try {
    // Text boxes and menus are only hovered: pressing them would focus or open them.
    const canPress = view.pressable && await exec((s) => {
      const el = document.querySelector(s);
      return !!el && !el.closest('input:not([type=button]):not([type=submit]):not([type=reset]):not([type=checkbox]):not([type=radio]), textarea, select, [contenteditable=""], [contenteditable=true]');
    }, [sel], 'MAIN').catch(() => false);
    const rect = await exec((s) => window.__plRec?.pointerBegin(s) || null, [sel], 'MAIN');
    if (!rect) return;
    began = true;
    view.pointerTest = canPress ? 'hover and press' : 'hover';
    if (live()) renderItems(view);
    await ui('testCursor', 'enter', rect);
    const hoverCss = cssStates('On hover');
    await sleep(450); // the cursor arrives
    if (live()) await showStates(hoverCss);
    if (live()) await sleep(900);
    if (canPress && live()) {
      const pressCss = cssStates('On click');
      await ui('testCursor', 'press');
      await exec(() => window.__plRec?.pointerPress(true), [], 'MAIN');
      await showStates(pressCss);
      await sleep(600);
      await clearStates(pressCss);
      await exec(() => window.__plRec?.pointerPress(false), [], 'MAIN');
      await ui('testCursor', 'release');
      await sleep(300);
    }
    await clearStates(hoverCss);
    await ui('testCursor', 'leave');
    const found = await exec((ms) => window.__plRec?.pointerEnd(ms) || { hover: [], press: [] }, [500], 'MAIN') || { hover: [], press: [] };
    began = false;
    const groups = [...(found.hover || []), ...(found.press || [])];
    view.pointerTest = 'done';
    if (state.view !== view) return;
    const have = new Set(view.items.filter((i) => i.anim).map((i) => i.anim.gid));
    const fresh = groups.filter((g) => !have.has(g.gid));
    for (const g of fresh) view.items.push(animItem(g));
    if (fresh.length) view.filmGroups = [...(view.filmGroups || []), ...fresh];
    if (live()) { renderItems(view); if (fresh.length) startPreviewLoop(view, view.filmGroups); }
  } catch (err) {
    console.debug('[Huescribe] pointer test failed', err);
    view.pointerTest = 'done';
    if (live()) renderItems(view);
  } finally {
    if (began) await exec(() => window.__plRec?.pointerEnd(0), [], 'MAIN').catch(() => {});
    await ui('testCursor', 'leave');
  }
}

/** Stop a scroll check that is still running (the person moved on). */
function abortScrollCheck() {
  if (state.view?.scrollState !== 'checking' || !state.tab) return;
  // Only the check for this pick: by the time this arrives, a new pick's check may have started.
  exec((pid) => {
    if (!pid) return;
    (globalThis.__plScrollStops ??= new Set()).add(pid);
    // Put the page back right away, but only if that check is the one scrolling it now.
    if (globalThis.__plScrollFor === pid && globalThis.__plScrollStart != null) { window.scrollTo({ top: globalThis.__plScrollStart, behavior: 'instant' }); globalThis.__plScrollStart = null; }
  }, [state.view.pickId || null]).catch(() => {});
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
      return el ? globalThis.__Huescribe.elementScroll(el) : { facts: [] };
    }, [`[data-pl-pick="${view.pickId}"]`]) || {};
    facts = res.facts || [];
    ys = res.ys || [];
  } catch (err) { console.warn('[Huescribe] scroll check failed', err); }
  // Reveals that fired while scrolling were recorded: add any new ones.
  try {
    const groups = await exec((sel) => window.__plRec?.groupsWithin(sel) || [], [`[data-pl-pick="${view.pickId}"]`], 'MAIN') || [];
    const have = new Set(view.items.filter((i) => i.anim).map((i) => i.anim.gid));
    const fresh = groups.filter((g) => !have.has(g.gid));
    for (const g of fresh) view.items.push(animItem(g));
    view.filmGroups = [...(view.filmGroups || []), ...fresh];
  } catch (err) { console.debug('[Huescribe] could not refresh movement after scrolling', err); }
  if (facts.length) {
    view.items.push({
      id: `scroll-${view.pickId}`, group: 'Motion', when: 'On scroll', type: 'scroll', title: t('When you scroll'),
      desc: `${facts[0].charAt(0).toUpperCase()}${facts[0].slice(1)}${facts.length > 1 ? ` ${t('(+{n} more)', { n: facts.length - 1 })}` : ''}.`, tech: '',
      label: t('What it does as the page scrolls'), code: facts.map((f) => `- ${f}`).join('\n'), preview: { kind: 'none' }, context: '',
      filmKey: `scroll-${view.pickId}`, scrollYs: ys, scrollSel: `[data-pl-pick="${view.pickId}"]`,
    });
  }
  view.scrollState = facts.length ? 'found' : 'none';
  if (state.view === view && state.screen === 'pick') renderItems(view);
}

// ---------- screen portions ----------


// ---------- chosen sections ----------

// ---------- a whole section, several sections, or part of one ----------

const SECTION_CHIPS = [['colors', tk('Colors')], ['fonts', tk('Fonts')], ['format', tk('Layout')], ['scroll', tk('Motion')]];

/** A section or dragged area arrived from the page: choose what to copy from it. */
function openSectionPick(add) {
  abortScrollCheck();
  stopPreviewLoop();
  const x = { ...add, kind: 'section', parts: { colors: false, fonts: false, format: false, scroll: false }, scrollHint: null };
  state.view = x;
  go('secpick');
  // "Motion" (scroll behavior) is offered only where something in it reacts to scrolling.
  const ids = x.pickIds || [x.pickId];
  // Things still waiting to be revealed, sticky parts… or reveals the recorder already saw play as the page scrolled.
  Promise.all([
    exec((list) => list.some((id) => { const el = document.querySelector(`[data-pl-pick="${id}"]`); return !!el && !!globalThis.__Huescribe?.areaScrollHint?.(el); }), [ids]),
    exec((list) => list.some((id) => (window.__plRec?.groupsWithin(`[data-pl-pick="${id}"]`) || []).some((g) => g.trigger === 'scroll' || g.scrollLinked)), [ids], 'MAIN').catch(() => false),
  ])
    .then(([look, seen]) => { x.scrollHint = !!(look || seen); })
    .catch((err) => { console.debug('[Huescribe] scroll hint failed', err); x.scrollHint = true; })
    .finally(() => { if (state.view === x && state.screen === 'secpick') renderSectionPick(); });
}

function sectionTitle(x) {
  const name = (x.name || '').replace(/^Section: /, '');
  return x.group === 'span' ? t('Sections together: {name}', { name: name.replace(/\s*\(together\)$/, '') }) : x.group === 'part' ? name : t('Section: {name}', { name });
}

function renderSectionPick() {
  const x = state.view;
  if (!x || x.kind !== 'section') { go('home', false); return; }
  $('title').textContent = t('What do you want from it?');
  main.replaceChildren();
  if (x.shot) main.append(h('img', { class: 'shot', src: x.shot, alt: t('What you picked') }));
  main.append(h('p', { class: 'pick-name' }, sectionTitle(x)));
  const chips = SECTION_CHIPS.filter(([k]) => k !== 'scroll' || x.scrollHint);
  const row = h('div', { class: 'part-chips big', role: 'group', 'aria-label': t('What to take from it') });
  const paint = () => {
    row.replaceChildren(...chips.map(([k, label]) => h('button', { class: 'chip toggle', type: 'button', 'aria-pressed': String(!!x.parts[k]), 'data-part': k,
      onclick: () => { x.parts[k] = !x.parts[k]; paint(); } }, t(label))));
    const n = chips.filter(([k]) => x.parts[k]).length;
    setTray(n ? '' : t('Turn on at least one'), t('Add to my list'), () => sectionToList(x), !n);
  };
  paint();
  main.append(row);
  if (x.scrollHint === null) main.append(h('p', { class: 'small muted', role: 'status' }, t('Checking scroll…')));
  // A whole section can also be taken apart: its gradient, a hover effect, its own shape…
  if (!x.group && x.path) main.append(h('button', { class: 'btn btn-outline sm single-parts', type: 'button', id: 'as-element', html: `<span>${t('Single parts instead (its gradient, hovers…)')}</span>`, onclick: () => ui('pickByPath', x.path) }));
}

/** Read the section with the chosen parts and add it to my list as one row. */
async function sectionToList(x) {
  spinner(x.parts.scroll ? t('Reading it… the page will scroll through it and come back.') : t('Reading it…'));
  setTray(null);
  const r = await exec(async (job) => {
    try {
      if (job.ids) {
        const els = job.ids.map((i) => document.querySelector(`[data-pl-pick="${i}"]`)).filter(Boolean);
        return els.length ? await globalThis.__Huescribe.portionReportGroup(els, job.parts, job.group) : null;
      }
      const el = document.querySelector(`[data-pl-pick="${job.id}"]`);
      return el ? await globalThis.__Huescribe.portionReport(el, job.parts) : null;
    } catch (e) { console.error('[Huescribe] section report failed', e); return null; }
  }, [{ id: x.pickId, ids: x.pickIds || null, group: x.group || null, parts: x.parts }]).catch((err) => { console.error('[Huescribe] section report failed', err); return null; });
  if (!r || !r.code) { showError(t("Couldn't read that"), t('The page may have changed. Reload it and pick it again.'), () => go('home', false)); return; }
  // Scroll behavior gets a preview: the page at points along the scroll.
  const film = r.scrollFound && r.scrollYs?.length ? await makeScrollFilm(`secscroll-${x.pickId}`, `[data-pl-pick="${x.pickIds ? x.pickIds[0] : x.pickId}"]`, r.scrollYs, true, x) : null;
  const what = [x.parts.colors && t('color scheme'), x.parts.fonts && t('font scheme'), x.parts.format && t('format'), x.parts.scroll && r.scrollFound && t('scroll behavior')].filter(Boolean);
  const name = r.name.replace(/^Section: /, '');
  const of = x.group === 'span' ? t('several sections of the page, together ({name})', { name: name.replace(/\s*\(together\)$/, '') }) : x.group === 'part' ? `${name}` : t('one section of the page ({name})', { name });
  const row = `r${Date.now().toString(36)}`;
  state.basket.push(ADJ.init({
    bid: `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, srcId: `sec-${x.pickId}`, row, rowTitle: sectionTitle(x), rowShot: x.shot || null,
    type: 'portion', title: cap1(name), desc: '',
    label: t('{what} of {of}', { what: cap1(andList(what)), of }), code: r.code, lang: 'text',
    preview: { kind: 'none' }, shot: film ? state.films.get(`secscroll-${x.pickId}`) : x.shot || null,
    shotKind: film ? 'scrollfilm' : x.shot ? 'screenshot' : null,
    frames: film ? state.frames.get(`secscroll-${x.pickId}`) : null, where: '', picturePrompt: '',
    tabId: state.tab.id, url: state.tab.url, sel: x.sel, pickId: x.pickId,
    parts: { colors: !!x.parts.colors, format: !!x.parts.format, fonts: !!x.parts.fonts, scroll: !!(x.parts.scroll && r.scrollFound) }, group: x.group || null,
    meta: /navigation|header/i.test(name) ? { kind: 'nav', tag: 'nav', noun: 'menu' } : /footer/i.test(name) ? { kind: 'footer', tag: 'footer', noun: 'footer' } : { kind: 'section', tag: 'section', noun: 'section' },
  }));
  saveBasket();
  state.freshRow = state.basket[state.basket.length - 1]?.row || null;
  state.notice = { added: x.parts.scroll && !r.scrollFound ? t('{title} (no scroll behavior found)', { title: sectionTitle(x) }) : sectionTitle(x) };
  state.view = null;
  go('home', false);
}

const cap1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);
/** "a, b and c" (the joining word translated). */
const andList = (list) => (list.length < 2 ? list.join('') : t('{list} and {last}', { list: list.slice(0, -1).join(', '), last: list[list.length - 1] }));



// ---------- record a scroll or click ----------


/** Watch the page while the person scrolls or clicks; everything that moves meanwhile is caught. */
async function startRecording(opts = {}) {
  try {
    const since = await exec(() => window.__plRec?.now() ?? null, [], 'MAIN');
    await exec(() => window.__plRec?.pointerEnd(0), [], 'MAIN').catch(() => {}); // a pointer test still running ends here
    if (opts.press && since != null) await exec((sel) => window.__plRec.holdNavigationOnce(sel), [`[data-pl-pick="${opts.press}"]`], 'MAIN');
    if (since == null) { showError(t('This page needs a reload first'), t('Huescribe starts watching a page when it opens. Reload the page, then record again.'), () => go('home', false)); return; }
    if (state.picking) { state.picking = false; await ui('stopPicking', false); }
    await ui('setRecording', true);
    // press: started from "Press it" on a pick, so it finishes by itself once the movement settles.
    state.recording = { since, count: 0, timer: null, press: opts.press || null, quietSince: 0, names: [] };
    go('record');
  } catch (err) {
    console.error('[Huescribe] could not start recording', err);
    showError(t("Couldn't start recording"), t('Reload the page and try again.'), () => go('home', false));
  }
}

function renderRecording() {
  $('title').textContent = t('Recording');
  const rec = state.recording;
  const count = h('p', { class: 'small muted', role: 'status', id: 'rec-count' }, '');
  const caught = h('ul', { class: 'rec-list', id: 'rec-list', 'aria-label': t('Caught so far') });
  main.append(
    h('div', { class: 'status rec-status' }, h('span', { class: 'rec-dot', 'aria-hidden': 'true' }),
      rec?.press
        ? h('span', {}, h('b', {}, t('Press it on the page')))
        : h('span', {}, h('b', {}, t('Scroll or click on the page')))),
    count, caught);
  setTray('', t('Cancel'), cancelRecording);
  if (!rec) return;
  clearInterval(rec.timer);
  rec.timer = setInterval(async () => {
    try {
      // The page (main world) has no translations: the fallback name is filled in here.
      const names = (await exec((since) => (window.__plRec?.groupsSince(since) || []).map((g) => [g.words?.name || '', g.words?.when || '']), [rec.since], 'MAIN') || [])
        .map(([name, when]) => `${name ? t(name) : t('Movement')} · ${t(when)}`);
      if (state.recording !== rec) return;
      const changed = names.length !== rec.names.length;
      rec.names = names;
      rec.count = names.length;
      if (changed) rec.quietSince = Date.now();
      if (changed && names.length) setTray('', t('Stop'), finishRecording);
      const el = document.getElementById('rec-count');
      if (el) el.textContent = names.length ? tn(names.length, '{n} movement caught', '{n} movements caught') : '';
      const list = document.getElementById('rec-list');
      if (list && changed) list.replaceChildren(...names.slice(0, 12).map((n) => h('li', {}, n)));
      // "Press it": done once something moved and nothing new has started for a moment.
      if (rec.press && names.length && Date.now() - rec.quietSince > 1400) finishRecording();
    } catch (err) { console.debug('[Huescribe] recording poll failed', err); }
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
  catch (err) { console.warn('[Huescribe] could not read the recording', err); }
  stopRecording();
  if (!groups.length) {
    main.replaceChildren(h('p', { class: 'empty' }, t('Nothing moved while we watched.')),
      h('button', { class: 'btn btn-outline wide', type: 'button', onclick: () => (state.view ? go('pick', false) : go('home', false)) }, t('Go back')));
    setTray(null);
    return;
  }
  // Show what was caught right away, in the order it happened.
  groups.sort((a, b) => a.start - b.start);
  state.view = { title: t('What moved'), items: groups.map(animItem), screenshot: null, pickId: null, sel: null, source: 'record', movement: 'ok' };
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
    }).catch((e) => console.warn('[Huescribe] crop failed', e));
  }
  return holder;
}

function card(item, { visual, actions, onHover } = {}) {
  const id = item.id;
  const cb = h('input', { type: 'checkbox', id: `cb-${id}`, onchange: (e) => {
    e.target.checked ? state.selected.add(id) : state.selected.delete(id);
    updatePickTray();
    const sec = e.target.closest('details.section');
    if (sec) { const g = sec.querySelector('summary .group-toggle')?.dataset.group; const list = (state.view?.items || []).filter((x) => x.group === g); refreshGroupHead(sec, g, list); }
    if (e.target.checked && item.anim) playAnim(item.anim, 1, true); // see it move when you choose it
    else if (e.target.checked && item.stateCss) playStateOnPage(item, { hold: 1200 });
    else if (e.target.checked) highlightOnPage(item.target);
  } });
  cb.checked = state.selected.has(id);
  const details = !item.code ? null : h('details', { class: 'details' }, h('summary', {}, t('Details')),
    item.tech ? h('p', { class: 'small muted' }, item.tech) : null,
    h('pre', {}, item.code));
  const el = h('div', { class: 'item' },
    h('label', { class: 'item-main', for: `cb-${id}` }, cb, visual || swatch(item.preview, item.type),
      h('span', { class: 'txt' }, item.when ? h('span', { class: 'when' }, t(item.when)) : null, h('b', {}, t(item.title)), h('span', { class: 'desc' }, item.desc), item.context ? h('small', {}, item.context) : null)),
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
  setTray(n ? '' : t('Turn on at least one'), t('Add to my list'), addSelected, !n);
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
  $('title').textContent = view.source === 'record' ? t('What moved') : t('What do you want from it?');
  main.replaceChildren();
  if (view.screenshot) main.append(h('img', { class: 'shot', src: view.screenshot, alt: t('What you picked') }));
  const groups = new Map();
  for (const it of view.items) {
    if (!groups.has(it.group)) groups.set(it.group, []);
    groups.get(it.group).push(it);
  }
  // A picked element always has Movement: it holds the scroll check and "Press it" even when nothing moves yet.
  const element = view.source === 'pick' && !view.sel?.docRect;
  if (element && !groups.has('Motion')) groups.set('Motion', []);
  const ordered = [...groups.keys()].sort((a, b) => GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b));
  // Movement opens by itself for a picked element (its previews, the scroll check and "Press it"
  // are the point); the other groups start closed so the list stays short.
  view.open ??= new Set();
  if (element && !view.movementToggled && (groups.get('Motion').length || view.pressable)) view.open.add('Motion');
  for (const g of ordered) {
    const list = g === 'Motion' ? [...groups.get(g)].sort((a, b) => WHEN_ORDER.indexOf(a.when) - WHEN_ORDER.indexOf(b.when)) : groups.get(g);
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
    if (g === 'Motion' && element) box.append(...movementExtras(view));
    // Sections start closed so the list stays short; filmstrips are only made once Movement is opened.
    const chosen = list.filter((it) => state.selected.has(it.id)).length;
    const sec = h('details', { class: 'section', open: (view.open.has(g) || ordered.length === 1) || null,
      ontoggle: (e) => { if (g === 'Motion' && e.isTrusted) view.movementToggled = true; if (e.target.open) { view.open.add(g); if (g === 'Motion') { queueFilms(view.filmGroups || []); queueLiveFilms(list); queueStateFilms(list); queueScrollFilms(list); } } else view.open.delete(g); } },
      h('summary', {}, groupToggle(g, list), h('span', { class: 'count' }, chosen ? t('{n} of {total}', { n: chosen, total: list.length }) : list.length ? String(list.length) : view.scrollState === 'checking' || view.movement === 'loading' ? '…' : '')), box);
    main.append(sec);
    if (g === 'Motion' && sec.open) { queueFilms(view.filmGroups || []); queueLiveFilms(list); queueStateFilms(list); queueScrollFilms(list); }
  }
  if (!view.items.length && !element) main.append(h('p', { class: 'empty' }, t("Couldn't find anything here. Try a bigger area.")));
  updatePickTray();
}

/** The group's own switch (Colors, Fonts, Layout, Motion): ticks or unticks the whole group.
 *  The rest of the header opens the group to choose single things. */
function groupToggle(g, list) {
  const n = list.filter((it) => state.selected.has(it.id)).length;
  const btn = h('button', { class: 'chip toggle group-toggle', type: 'button', 'data-group': g, disabled: list.length ? null : true,
    'aria-pressed': n === 0 ? 'false' : n === list.length ? 'true' : 'mixed', 'aria-label': t('{group}: copy the whole group', { group: t(g) }) }, t(g));
  btn.onclick = (e) => {
    e.preventDefault(); e.stopPropagation(); // the switch doesn't open or close the group
    const on = n !== list.length;
    for (const it of list) { if (on) state.selected.add(it.id); else state.selected.delete(it.id); }
    const sec = btn.closest('details.section');
    sec?.querySelectorAll('.item input[type=checkbox]').forEach((cb) => { cb.checked = on; });
    refreshGroupHead(sec, g, list);
    updatePickTray();
    announce(on ? t('{group}: all chosen', { group: t(g) }) : t('{group}: none chosen', { group: t(g) }));
  };
  return btn;
}
function refreshGroupHead(sec, g, list) {
  if (!sec) return;
  const old = sec.querySelector('summary .group-toggle');
  if (old) old.replaceWith(groupToggle(g, list));
  const n = list.filter((it) => state.selected.has(it.id)).length;
  const count = sec.querySelector('summary .count');
  if (count) count.textContent = n ? t('{n} of {total}', { n, total: list.length }) : String(list.length);
}

/** The rows at the end of Movement for a picked element: scroll check status, catching a press,
 *  and a reload when movement that plays as the page opens was missed. Shown only when they apply. */
function movementExtras(view) {
  const rows = [];
  const st = view.scrollState;
  if (view.movement === 'loading') rows.push(h('p', { class: 'small muted extra-row', role: 'status' }, t('Looking for movement…')));
  if (view.pointerTest && view.pointerTest !== 'done') rows.push(h('p', { class: 'small muted extra-row', role: 'status', id: 'pointer-status' }, view.pointerTest === 'hover and press' ? t('Testing hover and press…') : t('Testing hover…')));
  if (st === 'checking' || (!st && view.movement !== 'missing')) rows.push(h('p', { class: 'small muted extra-row', role: 'status', id: 'scroll-status' }, t('Checking scroll…')));
  else if (st === 'none') rows.push(h('p', { class: 'small muted extra-row', id: 'scroll-status' }, t('No scroll effect')));
  if (view.pressable) {
    rows.push(h('div', { class: 'extra-row press-row' },
      h('span', { class: 'press-text' }, h('b', {}, t('Moves when you press it?'))),
      h('button', { class: 'btn btn-outline sm', type: 'button', id: 'press-catch', onclick: () => startRecording({ press: view.pickId }) }, t('Press it'))));
  }
  const nothingOnLoad = !view.items.some((i) => i.anim || i.type === 'animation');
  if (view.movement === 'missing' || (state.recLate && nothingOnLoad && view.movement === 'ok')) {
    rows.push(h('div', { class: 'extra-row press-row' },
      h('span', { class: 'press-text' }, h('b', {}, t('Moves when the page opens?')), h('span', { class: 'small muted' }, t('It played before Huescribe opened.'))),
      h('button', { class: 'btn btn-outline sm', type: 'button', id: 'reload-check', onclick: () => reloadAndRepick(view) }, t('Reload'))));
  }
  return rows;
}

/** Reload the tab (the recorder then watches from the start) and pick the same thing again. */
async function reloadAndRepick(view) {
  spinner(t('Reloading…'));
  const tabId = state.tab.id;
  try {
    await new Promise((resolve) => {
      const timer = setTimeout(done, 20000);
      function done() { clearTimeout(timer); chrome.tabs.onUpdated.removeListener(onUpd); resolve(); }
      function onUpd(id, info) { if (id === tabId && info.status === 'complete') done(); }
      chrome.tabs.onUpdated.addListener(onUpd);
      state.reloadingPick = true;
      chrome.tabs.reload(tabId);
    });
    await sleep(2500); // let the opening animations play out
    state.reloadingPick = false;
    state.tab = await chrome.tabs.get(tabId);
    await send({ type: 'huescribe:startPicker', tabId, autoPick: view.path || null });
    if (!view.path) startPick();
  } catch (err) {
    state.reloadingPick = false;
    console.error('[Huescribe] reload failed', err);
    showError(t("Couldn't reload the page"), t('Reload it yourself, then pick it again.'), () => go('home'));
  }
}

/** The ticked parts of a pick become one row of my list. Colors and Fonts left out mean: use mine. */
function addSelected() {
  const view = state.view;
  const chosen = view.items.filter((i) => state.selected.has(i.id));
  if (!chosen.length) return;
  const withColors = chosen.some((i) => i.group === 'Colors');
  const withFonts = chosen.some((i) => i.group === 'Fonts');
  const row = `r${Date.now().toString(36)}`;
  const rowTitle = view.source === 'record' ? t('What moved') : capFirst(view.title && view.title !== 'Something' ? view.title : (chosen[0].meta?.noun || t('Your pick')));
  for (const it of chosen) {
    const fkey = it.gid ?? it.filmKey ?? null;
    const film = fkey != null ? state.films.get(fkey) : null;
    const shot = it.type === 'picture' ? view.screenshot || null : film && film.startsWith('data:') ? film : it.crop || view.screenshot || null;
    const entry = {
      bid: `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, srcId: it.id, row, rowTitle, rowShot: view.screenshot || shot || null, group: it.group,
      type: it.type, title: it.title, desc: it.desc, label: it.label, code: it.code, lang: it.lang, fontSource: it.fontSource || '',
      // Text: the font always; its color only when Colors is chosen too (otherwise my site's).
      textParts: it.type === 'font' ? { font: true, size: true, color: withColors && /(^|\n)color:/.test(it.code) } : null,
      // Motion with colors in it: the original colors only when Colors is chosen too.
      keepColors: withColors && it.group === 'Motion',
      fit: withColors || withFonts ? 'exact' : undefined,
      unit: it.unit || null, trigger: it.trigger || null, preview: it.preview,
      shot, shotKind: it.type !== 'picture' && film && film.startsWith('data:') ? (it.stateCss ? 'beforeafter' : 'film') : shot ? 'screenshot' : null, where: '',
      frames: fkey != null ? state.frames.get(fkey) || null : null, picturePrompt: '',
      target: it.target || null, anim: it.anim || null, gid: it.gid ?? null, restColors: it.restColors || null, bgBehind: it.bgBehind || null, tabId: state.tab.id, url: state.tab.url, sel: view.sel || null, pickId: view.pickId || null,
      // What it came from (an h2 heading, a card…), so the prompt can say how it fits the person's site.
      meta: it.meta || (it.anim || it.type === 'scroll' ? view.meta : null) || null,
    };
    state.basket.push(ADJ.init(entry));
  }
  saveBasket();
  state.freshRow = state.basket[state.basket.length - 1]?.row || null;
  state.notice = { added: rowTitle };
  state.selected = new Set();
  state.view = null;
  state.history = [];
  go('home', false);
}

// ---------- animations ----------

function animItem(g) {
  // The recorder runs in the page, where there are no translations: describe it again here, in the panel's language.
  let w = g.words;
  if (I18N.lang !== 'en' && globalThis.HuescribeMotion?.describe) {
    try { w = Object.assign({}, g.words, globalThis.HuescribeMotion.describe(g)); } catch (err) { console.warn('[Huescribe] could not describe the movement again', err); }
  }
  return {
    id: `anim-${state.tab.id}-${g.gid}-${g.start}`,
    group: 'Motion',
    when: w.when,
    type: 'recorded-animation',
    title: w.name,
    desc: w.sentence,
    tech: `${w.numbers}; ${t(w.when).toLowerCase()}${g.source === 'js' ? `; ${t('made with JavaScript on the original')}` : ''}`,
    label: t('{name} (on {target}): {sentence}', { name: w.name, target: t(g.target), sentence: w.sentence }),
    context: g.partOf ? t('Your pick is one of {count}', { count: g.count }) : '',
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
  const slot = h('span', { class: `film${onPlay ? ' playable' : ''}`, 'data-gid': gid, title: onPlay ? t('Play it on the page') : null });
  if (onPlay) slot.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); onPlay(); });
  paintFilm(slot, gid);
  return slot;
}

function paintFilm(slot, gid) {
  const f = state.films.get(gid);
  if (f && f.startsWith('data:')) slot.replaceChildren(h('img', { src: f, alt: t('Frames of the animation, in order') }));
  else if (f === 'offscreen') slot.replaceChildren(h('span', { class: 'film-ph' }, t('Tap to play it')));
  else if (f === 'failed') slot.replaceChildren(h('span', { class: 'film-ph' }, t('No preview')));
  else if (f === 'away') slot.replaceChildren(h('span', { class: 'film-ph' }, t('Scroll to it for a preview')));
  else slot.replaceChildren(h('span', { class: 'film-ph loading' }, t('Loading…')));
}

function refreshFilm(gid) {
  for (const slot of document.querySelectorAll(`.film[data-gid="${CSS.escape(gid)}"]`)) paintFilm(slot, gid);
}

function animCard(item, g) {
  // It already replays on the page by itself; tapping the strip replays it now, "Slow motion" to study it.
  const slowBtn = h('button', { class: 'btn btn-outline sm slow-btn', type: 'button', html: `<span>${t('Slow motion')}</span>`, onclick: () => playAnim(g, 0.25, true) });
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
    // The page (main world) has no translations: the message goes in from here.
    const r = await exec((id, opts, gone) => window.__plRec?.replay(id, opts) ?? { ok: false, error: gone }, [g.gid, { speed, scroll: explicit, flash }, t('The page reloaded, so pick it again to play it.')], 'MAIN');
    if (!r?.ok && explicit) announce(r?.error ? t(r.error) : t('Could not play it.'));
    if (r?.ok && explicit && state.films.get(g.gid) === 'offscreen') {
      state.films.delete(g.gid);
      setTimeout(() => queueFilms([g]), (g.duration + g.stagger * g.count) / speed + 300);
    }
  } catch (err) {
    console.warn('[Huescribe] replay failed', err);
  }
}

/** Build filmstrips one at a time for animations currently on screen. */
function queueFilms(groups) {
  for (const g of groups) {
    if (state.films.has(g.gid)) continue;
    state.films.set(g.gid, 'pending');
    const v = state.view;
    state.filmQueue = state.filmQueue.then(() => makeFilm(g, 1, v)).catch((e) => console.warn('[Huescribe] film failed', e));
  }
}

/** "When you scroll": frames taken at points along the scroll, around the element (then back). */
function queueScrollFilms(items) {
  for (const it of items) {
    if (it.type !== 'scroll' || !it.filmKey || state.films.has(it.filmKey)) continue;
    state.films.set(it.filmKey, 'pending');
    { const v = state.view; state.filmQueue = state.filmQueue.then(() => makeScrollFilm(it.filmKey, it.scrollSel, it.scrollYs, false, v)).catch((e) => console.warn('[Huescribe] scroll film failed', e)); }
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
    console.warn('[Huescribe] scroll frames failed', err);
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
    { const v = state.view; state.filmQueue = state.filmQueue.then(() => makeLiveFilm(it, v)).catch((e) => console.warn('[Huescribe] live film failed', e)); }
  }
}

/** Previews are made for one pick; once something else is picked (or the screen changes) they stop. */
const stillFor = (v) => state.view === v && (state.screen === 'pick');

/** Bring a target into view for filming; returns the scroll position to come back to (or null). */
async function bringIntoView(ref, v = null) {
  if (v && !stillFor(v)) return null; // the person moved on: never scroll the page for an old pick
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
  const backTo = await bringIntoView(it.target, v);
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
    console.warn('[Huescribe] live frame capture failed', err);
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
    console.warn('[Huescribe] filmStart failed', err);
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
    console.warn('[Huescribe] frame capture failed', err);
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

/** Copy the whole list as one prompt. The list stays, so it can be changed and copied again. */
async function copyPrompt() {
  const rows = rowsOf(state.basket);
  if (!rows.length) return;
  const pics = rows.map(rowPicture);
  const text = P.combine(rows.map((r, k) => ({ basket: r, fit: 'exact', pictureBid: pics[k]?.bid || null })), state.site);
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    console.warn('[Huescribe] clipboard failed', err);
    const ta = h('textarea', { class: 'output', readonly: true, spellcheck: 'false' });
    ta.value = text;
    main.prepend(h('div', { class: 'alert' }, h('strong', {}, t("Couldn't copy automatically")), h('p', {}, t('Select the text below and press Ctrl+C (⌘C on Mac).')), ta));
    ta.select();
    return;
  }
  const app = appName();
  announce(t('Prompt copied. Paste it into {app}.', { app }));
  // Copied means done: the list empties for the next round. Undo and "Copy again" stay on the card.
  state.lastCopy = { basket: state.basket, text };
  const clear = !state.keepAfterCopy; // tests that copy one list several times keep it
  if (clear) { state.basket = []; await saveBasket(); }
  state.notice = { copied: { parts: rows.length, chars: text.length, cleared: clear }, pictures: pics.filter(Boolean).map((b) => b.shot), long: state.site.app === 'builder' && rows.length > 2 };
  go('home', false);
  // 1) The button that was pressed says "Copied" with a check for a moment (when it is still there).
  const b = $('tray-btn');
  // (go() hides the tray until the screen is drawn, so ask the list, not the tray.)
  if (state.basket.length) {
    // A second copy within 2s restarts the "Copied" moment (the old timer must not end it early).
    clearTimeout(state.copiedTimer);
    const label = b.textContent === t('Copied') ? state.copiedLabel : b.textContent;
    state.copiedLabel = label;
    setBtnLabel(b, t('Copied'));
    b.classList.remove('copied'); void b.offsetWidth; b.classList.add('copied');
    state.copiedTimer = setTimeout(() => { b.classList.remove('copied'); if (b.textContent === t('Copied')) setBtnLabel(b, label); }, 2000);
  }
  // 2) The page, where the eyes usually are, shows it too.
  ui('toast', t('Prompt copied: paste it into {app}', { app }), true);
  // 3) The card at the top says what was copied and what to do next (see noticeCard).
}

/**
 * "My instructions": the person's own prompt text, added to every prompt they copy (kept between sessions).
 * Saved as they type (debounced); a failed save says so on screen and in the console.
 */
function customBox() {
  const own = state.site.custom || '';
  const hint = h('p', { class: 'muted small custom-hint', id: 'custom-hint' }, t('Write it once and it goes into every prompt.'));
  const ta = h('textarea', {
    id: 'custom-prompt', rows: 3, maxlength: String(P.CUSTOM_MAX), spellcheck: 'true', 'aria-describedby': 'custom-hint',
    placeholder: t('e.g. Use Tailwind classes. Keep my logo, my brand blue {color} and my wording.', { color: '#1d4ed8' }),
    oninput: (e) => { state.site.custom = e.target.value; saveCustomSoon(); },
  }, own);
  return h('details', { class: 'section custom', id: 'custom', open: !!own.trim() },
    h('summary', {}, h('span', {}, t('My instructions')), h('span', { class: 'muted small custom-state' }, own.trim() ? t('On') : t('Optional'))),
    h('div', { class: 'custom-body' }, h('label', { class: 'sr-only', for: 'custom-prompt' }, t('My instructions')), ta, hint));
}
let customTimer = null;
function saveCustomSoon() {
  clearTimeout(customTimer);
  const st = document.querySelector('#custom .custom-state');
  if (st) st.textContent = (state.site.custom || '').trim() ? t('On') : t('Optional');
  customTimer = setTimeout(async () => {
    try { await chrome.storage.local.set({ customPrompt: state.site.custom || '' }); }
    catch (err) {
      console.warn('[Huescribe] could not save my instructions', err);
      const hint = $('custom-hint');
      if (hint) hint.textContent = t("Couldn't save your instructions; they still apply until you close the panel.");
    }
  }, 400);
}

/** The chosen AI app's short name ("Claude Code"). */
function appName() { return t((P.APPS[state.site?.app] || P.APPS['claude-code']).label).replace(/ ?[(（].*[)）]$/, ''); }

/** Quick "where" chips that fit the thing itself (a heading gets "All headings", a section a place on the page). */
function whereChips(b) {
  const m = b.meta || {};
  if (b.type === 'palette' || b.type === 'design-system' || b.title === 'Page structure') return [t('Whole site')];
  if (b.type === 'navigation' || m.kind === 'nav' || m.kind === 'header') return [t('Top of every page'), t('Top of homepage')];
  if (m.kind === 'footer') return [t('Bottom of every page')];
  if (b.type === 'portion' || b.type === 'section' || m.kind === 'section') return [t('Top of homepage'), t('Middle of homepage'), t('Bottom of homepage')];
  const byKind = { heading: /^h[1-6]$/.test(m.tag || '') ? [t('All {tag} headings', { tag: m.tag }), t('All headings')] : [t('All headings')], button: [t('All buttons')], card: [t('All cards')], 'nav link': [t('All menu links')], link: [t('All links')], image: [t('All pictures')], input: [t('All input boxes')], badge: [t('All badges')] };
  if (b.type === 'font') {
    if (/Button/.test(b.title || '')) return [t('All buttons'), t('Whole site')];
    if (/Heading/.test(b.title || '')) return [...(byKind.heading || []), t('Whole site')];
    return [t('All body text'), t('Whole site')];
  }
  if (/^(color|gradient|text-gradient)$/.test(b.type)) return [...(byKind[m.kind] || []), t('Top of homepage'), t('Whole site')];
  return [...(byKind[m.kind] || []), t('Top of homepage')];
}

/** An example of what this part could show, from what its parts are for (cards, headline, menu links…). */
function contentPlaceholder(b) {
  const { list } = P.purposesIn(b.code);
  const has = (re) => list.find((p) => re.test(p.purpose));
  const cards = has(/^card title/);
  if (cards) return cards.count > 1 ? t('e.g. my {n} best sellers, each with a price', { n: cards.count }) : t('e.g. my best sellers, each with a price');
  if (has(/^page links?/)) return t('e.g. Home, Menu, About, Contact');
  if (has(/^main headline/)) return t('e.g. fresh bread every morning; order online for pickup');
  if (has(/^price/)) return t('e.g. my plans and their prices');
  return t('e.g. my opening hours and address');
}

/** "Make a new picture from this": the change box then describes the picture you want. */
function pictureToggle(b) {
  const id = `mkpic-${b.bid}`;
  const cb = h('input', { type: 'checkbox', id, onchange: (e) => {
    b.makePicture = e.target.checked; saveBasket();
    const req = document.getElementById(`req-${b.bid}`);
    if (req) req.placeholder = b.makePicture ? t('Describe the picture: e.g. "the same scene at night" or "just the glowing ball, on dark"') : req.dataset.placeholder || '';
  } });
  cb.checked = !!b.makePicture;
  return h('label', { class: 'check', for: id }, cb, t('Make a new picture from this'));
}

/** The animation playing in a loop, from its captured frames (a still frame with reduced motion). */
function movingPreview(frames) {
  const img = h('img', { class: 'thumb moving', src: frames[0], alt: t('The animation, playing') });
  if (REDUCED_MOTION) return img;
  let i = 0;
  const timer = setInterval(() => {
    if (!img.isConnected) { clearInterval(timer); return; }
    i = (i + 1) % (frames.length + 2); // hold the last frame a moment before starting over
    img.src = frames[Math.min(i, frames.length - 1)];
  }, 220);
  return img;
}


function placeholderFor(b) {
  if (b.type === 'recorded-animation') return b.unit === 'letter' || b.unit === 'word' ? t('e.g. my main heading') : t('e.g. my homepage cards');
  if (b.type === 'palette' || b.type === 'design-system' || b.title === 'Page structure') return t('e.g. my whole site');
  if (/^section-/.test(b.type)) return t('e.g. my pricing section');
  if (b.type === 'navigation') return t('e.g. the top of every page');
  if (/gradient/.test(b.type)) return t('e.g. top of my homepage');
  if (b.type === 'picture') return t('e.g. my homepage banner');
  if (b.type === 'font') return t('e.g. all my headings');
  if (b.type === 'hover' || b.type === 'focus') return t('e.g. all my buttons');
  return t('e.g. top of my homepage');
}

/** Tweak area: one-tap tweaks + "show it on the page"; describe / fine-tune / undo live under More options. */
function tweakSection(b) {
  const box = h('div', { class: 'tweak' });
  const note = h('p', { class: 'small muted adjust-note', role: 'status' });
  const paintNote = () => { note.textContent = b.adjustNote ? t('Changed: {what}', { what: b.adjustNote }) : ''; };
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
    pvBtn.querySelector('span').textContent = anim ? t('Play it') : state.previewing?.bid === b.bid ? t('Stop showing') : t('Show on page');
  };
  paintPv();
  pvBtn.onclick = async () => {
    if (b.type !== 'recorded-animation' && state.previewing?.bid === b.bid) await stopPreview();
    else await applyPreview(b, true);
    paintPv();
  };
  // "How should it change?" first: the quickest way to ask for something different.
  const req = h('textarea', { id: `req-${b.bid}`, rows: 2, placeholder: requestPlaceholder(b), 'data-placeholder': requestPlaceholder(b), oninput: (e) => { b.request = e.target.value; changedNow(); } });
  if (b.makePicture) req.placeholder = t('Describe the picture: e.g. "the same scene at night" or "just the glowing ball, on dark"');
  req.value = b.request || '';
  box.append(h('label', { class: 'field', for: `req-${b.bid}` }, t('How should it change? (optional)'), req));

  if (presets.length || canPreview) {
    box.append(h('div', { class: 'chips', role: 'group', 'aria-label': t('Quick tweaks') },
      presets.map((p, i) => h('button', { class: 'chip chip-strong', type: 'button', onclick: () => { ADJ.applyPreset(b, i); announce(t(p.label)); changedNow(); syncControls(); } }, t(p.label))),
      canPreview ? pvBtn : null));
  }
  box.append(note);

  // More options: exact numbers, undo.
  const more = h('details', { class: 'fine', open: b.fineOpen || null, ontoggle: (e) => { b.fineOpen = e.target.open; } }, h('summary', {}, t('More options')));
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
    more.append(h('label', { class: 'check', for: id }, keep, t('Keep the original colors (otherwise your site\'s own colors are used)')));
  }
  more.append(h('button', { class: 'btn btn-ghost sm', type: 'button', html: `<span>${t('Undo changes')}</span>`, onclick: () => { ADJ.reset(b); b.request = ''; saveBasket(); if (state.previewing?.bid === b.bid) stopPreview(); announce(t('Back to the original')); go('apply', false); } }));
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
  if (c.kind === 'select') input = h('select', { id, onchange: (e) => commit(e.target.value) }, c.options.map(([val, label]) => h('option', { value: val }, t(label))));
  else input = h('input', { id, type: c.kind, min: c.min, max: c.max, step: c.step, oninput: (e) => commit(e.target.value) });
  const sync = () => { const v = ADJ.value(b, c.key); input.value = String(v); paintOut(v); };
  sync();
  const el = h('label', { class: `ctl ctl-${c.kind}`, for: id }, h('span', {}, t(c.label), c.unit && c.kind === 'number' ? ` (${c.unit})` : ''), input, out);
  return { el, sync };
}

function requestPlaceholder(b) {
  if (/gradient/.test(b.type)) return t('e.g. "fade to white at the bottom"');
  if (/animation/.test(b.type)) return t('e.g. "words, not letters"');
  if (b.type === 'font') return t('e.g. "make it italic"');
  if (b.type === 'hover' || b.type === 'focus') return t('e.g. "turn the text white too"');
  return t('e.g. "a bit softer"');
}

/** Show the tweaked item on the source page (restyle the element, or replay the animation). */
async function applyPreview(b, explicit) {
  try {
    if (state.tab?.id !== b.tabId || state.tab?.url !== b.url) throw new Error(t('Go back to the page you picked this from to see it.'));
    if (b.type === 'recorded-animation') {
      b.livePreview = true;
      const r = await exec((gid, opts, gone) => window.__plRec?.replay(gid, opts) ?? { ok: false, error: gone }, [b.gid, ADJ.replayOptions(b), t('The recording is gone because the page reloaded. Use "Find animations" again to see it.')], 'MAIN');
      if (!r?.ok) throw new Error(r?.error ? t(r.error) : t('Could not play it.'));
      return;
    }
    const css = ADJ.previewCss(b);
    if (state.previewing && state.previewing.bid !== b.bid) await stopPreview();
    const r = await exec(pagePreview, [b.target, css, t('That part of the page changed or reloaded. Pick it again to see it.')]);
    if (!r?.ok) throw new Error(r?.error || t('Could not show it.'));
    state.previewing = { bid: b.bid, ref: b.target };
    if (explicit) announce(t('Showing your version on the page'));
  } catch (err) {
    console.warn('[Huescribe] preview failed', err);
    if (explicit) announce(err.message);
  }
}

async function stopPreview() {
  const p = state.previewing;
  state.previewing = null;
  if (!p) return;
  try { await exec(pagePreview, [p.ref, null]); }
  catch (err) { console.warn('[Huescribe] could not restore preview', err); }
}

/** Runs in the page (isolated world): apply `css` inline on a registered element, or restore it when css is null.
 *  `gone`: the (translated) message for an element that is no longer there. */
function pagePreview(ref, css, gone = '') {
  const el = globalThis.__plTargets?.get(ref)?.deref();
  if (!el || !el.isConnected) return { ok: false, error: gone };
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

/** Header: which AI app the prompt is for (the only setting). */
$('app').addEventListener('click', () => {
  openMenu($('app'), Object.entries(P.APPS).map(([k, a]) => ({ label: t(a.label), icon: (state.site.app || 'claude-code') === k ? 'check' : 'blank', run: () => setApp(k) })));
});

/** Header "More": things needed now and then, not on every screen. */
$('more').addEventListener('click', async () => {
  const pageOk = state.tab && !restricted(state.tab.url);
  openMenu($('more'), [
    MODE === 'side' && pageOk && { label: t('Open in its own window'), icon: 'popout', run: popOut },
    MODE === 'window' && chrome.sidePanel?.open && { label: t('Back to the side panel'), icon: 'dock', run: dockBack },
    pageOk && { label: t('Reload the page'), icon: 'refresh', run: reloadPage },
    state.basket.length && { label: t('Clear my list'), icon: 'trash', danger: true, confirm: t('Tap again to clear it'), run: clearList },
    { label: t('Practice (1 minute)'), icon: 'help', run: openWelcome },
    state.account && { label: t('Sign out ({email})', { email: state.account.email }), icon: 'logOut', run: signOut },
    { label: t('Language: {name}', { name: langName(I18N.lang) }), icon: 'globe', run: () => { setTimeout(openLangMenu, 0); } },
  ]);
});

// ---------- the panel's language ----------
// Chosen in the ⋯ menu; stored in chrome.storage.local "uiLang" ('auto' or a code), mirrored in localStorage
// (i18n.js reads the mirror while panel.html parses, to load the catalog before this file runs), and its resolved
// code in "uiLangResolved" for the background, which injects the same language into pages.
const LANG_MIRROR = 'huescribe.uiLang';
const langName = (code) => (I18N.LANGS.find(([c]) => c === code) || [code, code])[1];

/** Second menu, opened from "Language": Automatic plus every language by its own name. Opened after the
 *  click that chose "Language" is over, so that click doesn't close it again. */
function openLangMenu() {
  const cur = state.uiLang || 'auto';
  openMenu($('more'), [
    { label: t("Automatic (Chrome's language)"), icon: cur === 'auto' ? 'check' : 'blank', run: () => setUiLang('auto') },
    ...I18N.LANGS.map(([code, name]) => ({ label: name, lang: code, icon: cur === code ? 'check' : 'blank', run: () => setUiLang(code) })),
  ]);
}

/** Save the choice (and its mirror), then reload the panel so every text is drawn in the new language. */
async function setUiLang(code) {
  try { await chrome.storage.local.set({ uiLang: code, uiLangResolved: I18N.resolve(code) }); }
  catch (err) { console.warn('[Huescribe] could not save the language', err); announce(t("Couldn't save the language. Try again.")); return; }
  try { localStorage.setItem(LANG_MIRROR, code); } catch (err) { console.warn('[Huescribe] could not mirror the language', err); }
  location.reload();
}

/**
 * At start: chrome.storage.local is the truth. If the localStorage mirror disagrees (first run, or it was
 * cleared), fix the mirror and reload once so i18n.js loads the right catalog. Returns true when reloading.
 * A sessionStorage flag stops a loop if the mirror can't be kept.
 */
async function syncUiLang() {
  const choice = (await lget('uiLang')) || 'auto';
  state.uiLang = choice;
  const resolved = I18N.resolve(choice);
  if ((await lget('uiLangResolved')) !== resolved) chrome.storage.local.set({ uiLangResolved: resolved }).catch((err) => console.warn('[Huescribe] could not save the resolved language', err));
  let mirror = null;
  try { mirror = localStorage.getItem(LANG_MIRROR); } catch (err) { console.debug('[Huescribe] localStorage unavailable', err); }
  const once = 'huescribe.langReloaded';
  if ((mirror || 'auto') === choice && I18N.lang === resolved) {
    try { sessionStorage.removeItem(once); } catch { /* nothing to clear */ }
    return false;
  }
  try {
    if (sessionStorage.getItem(once)) return false; // already reloaded once for this: carry on as is
    localStorage.setItem(LANG_MIRROR, choice);
    sessionStorage.setItem(once, '1');
  } catch (err) { console.warn('[Huescribe] could not sync the language mirror', err); return false; }
  location.reload();
  return true;
}

/** panel.html's own texts stay English in the file; they are translated here once at start. */
function localizeStatic() {
  $('back').setAttribute('aria-label', t('Back'));
  $('more').setAttribute('aria-label', t('More'));
  $('more').title = t('More');
  $('app').title = t('Which AI app the prompt is for');
}

/** Side panel → a window of its own the person can move anywhere. The new window opens on the same
 *  screen when there is something being placed; this panel closes once the window is up. */
async function popOut() {
  const screen = '';
  await saveBasket();
  const res = await send({ type: 'huescribe:popOut', tabId: state.tab.id, screen });
  if (!res.connected) console.warn('[Huescribe] the new window did not connect in time');
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
  announce(t('Page reloaded'));
  state.history = [];
  go('home', false);
}

async function ensureRecorder() {
  state.recLate = false;
  if (!state.tab || restricted(state.tab.url)) return;
  try { state.recLate = !!(await send({ type: 'huescribe:ensureRecorder', tabId: state.tab.id })).late; }
  catch (err) {
    // The tab may have just moved to a browser page the extension can't reach: nothing to do.
    const blocked = /Cannot access|No tab with id|Frame with ID/.test(String(err?.message || err));
    (blocked ? console.debug : console.warn)('[Huescribe] could not start the recorder', err);
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
  if (['pick', 'secpick', 'record'].includes(state.screen)) { state.history = []; go('home', false); }
  else if (state.screen === 'home') go('home', false);
});

chrome.tabs.onUpdated.addListener(async (id, info) => {
  if (id !== state.tab?.id) return;
  // The page is reloading or going elsewhere: what we put on it is gone; picking comes back once it has loaded.
  if (info.status === 'loading') state.picking = false;
  if (info.status === 'complete' && !info.url) {
    state.tab = await currentTab(); // its address may have changed meanwhile (e.g. to a browser page)
    await ensureRecorder();
    if (['home', 'pick', 'secpick'].includes(state.screen) && !state.reloadingPick) { state.history = []; go('home', false); }
    return;
  }
  if (!info.url) return;
  await refreshTab();
  if (state.screen === 'home') go('home', false);
});

$('back').addEventListener('click', back);

/**
 * The link to the background that tells it this panel is open. Its closing is how the background
 * knows to take Huescribe off the page. A heartbeat keeps the background awake (an asleep one drops
 * the link and would miss the close); if the link drops anyway, it is made again with what it knew.
 */
function connectPort() {
  try {
    state.port = chrome.runtime.connect({ name: 'panel' });
  } catch (err) { console.warn('[Huescribe] could not reach the background', err); return; }
  if (IS_POPUP) state.port.postMessage({ popup: true });
  if (state.pickingTabs?.size) state.port.postMessage({ pickingTabs: [...state.pickingTabs] });
  state.port.onDisconnect.addListener(() => {
    state.port = null;
    clearInterval(state.heartbeat);
    setTimeout(connectPort, 200);
  });
  clearInterval(state.heartbeat);
  state.heartbeat = setInterval(() => { try { state.port?.postMessage({ ping: Date.now() }); } catch (err) { console.debug('[Huescribe] heartbeat failed', err); } }, 20000);
}

(async function init() {
  if (IS_POPUP) document.body.classList.add('popup');
  localizeStatic();
  if (await syncUiLang()) return; // reloading in the stored language
  connectPort();
  state.basket = (await loadBasket()).map((b) => ADJ.init(b));
  state.site = { app: ((await lget('site')) || {}).app || 'claude-code', custom: (await lget('customPrompt')) || '' };
  // Version 8 kept copied prompts in "Your prompts": they join the list once, so nothing is lost.
  const saved = (await sget('saved')) || [];
  if (saved.length) {
    for (const sp of saved) for (const b of sp.basket || []) state.basket.push(ADJ.init({ ...b, row: sp.id, rowTitle: sp.title, rowShot: sp.thumb || b.shot || null }));
    await chrome.storage.session.set({ saved: [] });
    saveBasket();
  }
  ensureRows();
  paintAppButton();
  try { state.account = await HuescribeAccount.refresh(); } catch (err) { console.error('[Huescribe] could not read the account', err); state.account = null; }
  paintAccount();
  await refreshTab();
  // In popup mode the popup closed while picking; open the pick that arrived meanwhile.
  const picks = state.tab ? (await sget(`picks:${state.tab.id}`)) || [] : [];
  state.lastSeenPick = (await sget('lastSeenPick')) || 0;
  const fresh = picks[0] && picks[0].url === state.tab?.url && picks[0].at > state.lastSeenPick && Date.now() - picks[0].at < 5 * 60 * 1000;
  if (fresh) openPick(picks[0]);
  else go('home', false);
})();
