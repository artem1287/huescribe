importScripts('account.js'); // HuescribeAccount: picking only runs for a signed-in user
// Huescribe service worker.
// - Opens the side panel on toolbar click. Browsers without a side panel (e.g. Arc) get the panel
//   as its own window docked next to the browser window, because a popup closes as soon as you
//   click the page, which is exactly when you need the panel.
// - Injects the analyzer / picker, takes screenshots, fetches cross-origin CSS.
// - The animation recorder (recorder.js) runs on every page from document_start via the manifest.
// - Stores picks per tab in chrome.storage.session so the panel (or a re-opened popup) gets them.

const MAX_CSS_BYTES = 3 * 1024 * 1024;
const panelPorts = new Set();
// When this worker started: right after a restart a still-open panel needs a moment to reconnect.
const SW_STARTED = Date.now();

const PANEL_W = 400;

async function setupUi() {
  try {
    if (chrome.sidePanel?.setPanelBehavior) {
      await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    }
    await chrome.action.setPopup({ popup: '' }); // no side panel: action.onClicked opens a window
  } catch (err) {
    console.error('[Huescribe] UI setup failed, using popup', err);
    await chrome.action.setPopup({ popup: 'panel.html' }).catch(() => {});
  }
}

/** No side panel: open (or focus) the panel as a window beside the browser window. */
chrome.action.onClicked.addListener(async (tab) => {
  if (chrome.sidePanel?.setPanelBehavior) return; // the side panel opens by itself
  try {
    await openPanelWindow(tab);
  } catch (err) {
    console.error('[Huescribe] could not open the panel window, falling back to a popup', err);
    await chrome.action.setPopup({ popup: 'panel.html' }).catch(() => {});
    chrome.action.openPopup?.().catch(() => {});
  }
});

/**
 * The panel as its own window: placed beside the browser window (which makes room for it, and gets
 * its size back when the panel window closes). It is a normal window, so it can be moved anywhere,
 * e.g. to a second screen. `screen`: which screen the window opens on (the panel's state is shared).
 */
async function openPanelWindow(tab, screen = '') {
  {
    const key = `panelWin:${tab.windowId}`;
    const existing = (await chrome.storage.session.get(key))[key];
    if (existing) {
      const ok = await chrome.windows.update(existing.panelId, { focused: true }).then(() => true, () => false);
      if (ok) return;
    }
    const win = await chrome.windows.get(tab.windowId);
    let { left = 0, top = 0, width = 1280, height = 800 } = win;
    const restore = { state: win.state, left, top, width, height };
    // Make room on the right so the panel never covers the page (and stays visible while you click it).
    if (win.state !== 'normal') await chrome.windows.update(win.id, { state: 'normal' });
    if (width - PANEL_W >= 700) { width -= PANEL_W; await chrome.windows.update(win.id, { left, top, width, height }); }
    const url = `panel.html?tabId=${tab.id}&mode=window${screen ? `&screen=${screen}` : ''}`;
    // Beside the browser window; where that would be off screen, the browser picks the place.
    const panel = await chrome.windows.create({ url, type: 'popup', width: PANEL_W, height, left: left + width, top })
      .catch((err) => { console.debug('[Huescribe] panel window placement refused, using the default place', err); return chrome.windows.create({ url, type: 'popup', width: PANEL_W, height: Math.min(height, 900) }); });
    await chrome.storage.session.set({ [key]: { panelId: panel.id, browserId: win.id, restore } });
    return panel;
  }
}

/** Wait until a new panel connects (or give up after `ms`), so switching panels never leaves none open. */
function nextPanel(ms) {
  const before = panelPorts.size;
  return new Promise((resolve) => {
    const t0 = Date.now();
    const tick = () => (panelPorts.size > before || Date.now() - t0 > ms ? resolve(panelPorts.size > before) : setTimeout(tick, 100));
    tick();
  });
}

/** Closing the panel window gives the browser window its size back. */
chrome.windows.onRemoved.addListener(async (id) => {
  const all = await chrome.storage.session.get(null);
  for (const [key, v] of Object.entries(all)) {
    if (!key.startsWith('panelWin:') || v.panelId !== id) continue;
    await chrome.storage.session.remove(key);
    const { state, ...box } = v.restore;
    await chrome.windows.update(v.browserId, state === 'normal' ? box : { state }).catch(() => {});
  }
});
chrome.runtime.onInstalled.addListener(setupUi);
// First install: open the welcome page, a one-minute hands-on practice (welcome.html). Updates don't open it.
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason !== 'install') return;
  chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') }).catch((err) => console.error('[Huescribe] could not open the welcome page', err));
});
chrome.runtime.onStartup.addListener(setupUi);

// ---------- the animation recorder lives only while the panel is open ----------
// Registered for document_start on every load while a panel is open (so reloads catch load-time
// animations), injected right away into tabs the panel works on, and stopped + unregistered when
// the last panel closes: with the sidebar closed, Huescribe runs nothing on any page.
const REC_ID = 'huescribe-recorder';
const recorderTabs = new Set();

async function registerRecorder() {
  try {
    const have = await chrome.scripting.getRegisteredContentScripts({ ids: [REC_ID] });
    if (have.length) return;
    await chrome.scripting.registerContentScripts([{ id: REC_ID, matches: ['<all_urls>'], js: ['motion.js', 'recorder.js'], runAt: 'document_start', world: 'MAIN', allFrames: false, persistAcrossSessions: false }]);
  } catch (err) { console.error('[Huescribe] could not register the recorder', err); }
}

async function unregisterRecorder() {
  try { await chrome.scripting.unregisterContentScripts({ ids: [REC_ID] }); } catch (err) { console.debug('[Huescribe] recorder was not registered', err); }
  for (const tabId of recorderTabs) {
    chrome.scripting.executeScript({ target: { tabId }, world: 'MAIN', func: () => { window.__plRec?.stop(); } })
      .catch((e) => console.debug('[Huescribe] could not stop the recorder in tab', tabId, e));
  }
  recorderTabs.clear();
}

/** Make sure the recorder runs in this tab now; tells whether it started after the page loaded. */
async function ensureRecorder(tabId) {
  recorderTabs.add(tabId);
  await chrome.scripting.executeScript({ target: { tabId }, world: 'MAIN', files: ['motion.js', 'recorder.js'] });
  const [res] = await chrome.scripting.executeScript({ target: { tabId }, world: 'MAIN', func: () => !!window.__plRec?.lateStart });
  return { late: !!res?.result };
}

chrome.runtime.onConnect.addListener((port) => {
  // Only Huescribe's own panel page may hold this port (it decides when picking stops on every tab).
  if (port.name !== 'panel' || port.sender?.id !== chrome.runtime.id || !(port.sender?.url || '').startsWith(chrome.runtime.getURL('panel.html'))) {
    if (port.name === 'panel') { console.warn('[Huescribe] refused a panel connection from', port.sender?.url); port.disconnect(); }
    return;
  }
  panelPorts.add(port);
  registerRecorder();
  const pickingTabs = new Set();
  let isPopup = false;
  chrome.storage.session.set({ popupPicking: false }).catch(() => {});
  port.onMessage.addListener((msg) => {
    // The tabs Huescribe draws on are also kept in session storage, so a restarted worker still knows them.
    const tabs = [msg?.pickingTab, ...(msg?.pickingTabs || [])].filter(Boolean);
    if (tabs.length) {
      for (const t of tabs) pickingTabs.add(t);
      chrome.storage.session.get('pickingTabs').then(({ pickingTabs: had = [] }) => chrome.storage.session.set({ pickingTabs: [...new Set([...had, ...tabs])] })).catch(() => {});
    }
    if (msg?.popup) { isPopup = true; chrome.storage.session.set({ popupPicking: true }).catch(() => {}); }
    // msg.ping: the panel's heartbeat; receiving it keeps this worker (and so this port) alive.
  });
  // When the panel closes, give the page back: stop highlight mode and remove selection boxes.
  // A popup closes on purpose when you go to click the page, so picking keeps going then.
  port.onDisconnect.addListener(() => {
    panelPorts.delete(port);
    if (isPopup) return;
    // Another Huescribe is still open (it moved into its own window): it keeps the page as it is.
    if (panelPorts.size) return;
    unregisterRecorder();
    cleanUpTabs([...pickingTabs]);
  });
});

/** Give pages back: remove Huescribe's highlight and boxes from every tab it drew on. */
async function cleanUpTabs(extra = []) {
  const { pickingTabs: stored = [] } = await chrome.storage.session.get('pickingTabs').catch(() => ({}));
  await chrome.storage.session.set({ pickingTabs: [] }).catch(() => {});
  for (const tabId of new Set([...stored, ...extra])) {
    chrome.scripting.executeScript({ target: { tabId }, func: () => { globalThis.__plUI?.destroy(); } })
      .catch((e) => console.debug('[Huescribe] could not clean up tab', tabId, e));
  }
}

// ---------- the language of what Huescribe writes on the page ----------
const UI_LANGS = ['en', 'es', 'pt', 'fr', 'de', 'it', 'tr', 'id', 'vi', 'ru', 'ar', 'hi', 'zh', 'ja', 'ko'];

/** Chrome's own language mapped to one of ours (the worker has no i18n.js); 'en' when we don't have it. */
function chromeUiLang() {
  const base = String(chrome.i18n?.getUILanguage?.() || 'en').toLowerCase().replace('_', '-').split('-')[0];
  return UI_LANGS.includes(base) ? base : 'en';
}

/** The language the panel resolved (it stores it whenever it starts or the choice changes), else Chrome's. */
async function pageLang() {
  try {
    const { uiLangResolved } = await chrome.storage.local.get('uiLangResolved');
    if (UI_LANGS.includes(uiLangResolved)) return uiLangResolved;
  } catch (err) { console.warn('[Huescribe] could not read the language, using Chrome\'s', err); }
  return chromeUiLang();
}

/** Give a tab the language and its translations before Huescribe's page scripts. A missing catalog never
 *  stops picking: the page then just shows English. */
async function injectI18n(tabId) {
  const code = await pageLang();
  await chrome.scripting.executeScript({ target: { tabId }, func: (c) => { globalThis.__huescribeLang = c; }, args: [code] });
  await chrome.scripting.executeScript({ target: { tabId }, files: ['i18n.js'] });
  if (code !== 'en') {
    try { await chrome.scripting.executeScript({ target: { tabId }, files: [`locales/${code}.js`] }); }
    catch (err) { console.warn('[Huescribe] could not load the page translation, using English', code, err); }
  }
  // i18n.js returns early when it was already there: a changed language must still take effect.
  await chrome.scripting.executeScript({ target: { tabId }, func: (c) => { globalThis.I18N?.use(c); }, args: [code] });
}

/** Inject analyzer + prompt builders + selection UI into a tab. */
async function startPicker(tabId, request = '', autoPick = null) {
  await chrome.scripting.executeScript({ target: { tabId }, func: (r, a) => { globalThis.__huescribePickRequest = r; globalThis.__huescribeAutoPick = a; }, args: [request, autoPick] });
  await injectI18n(tabId);
  await chrome.scripting.executeScript({ target: { tabId }, files: ['motion.js', 'analyzer.js', 'prompts.js', 'picker.js'] });
}

async function savePick(tabId, pick) {
  const key = `picks:${tabId}`;
  const cur = (await chrome.storage.session.get(key))[key] || [];
  // Keep the newest few; screenshots are large and session storage is capped (~10 MB).
  const next = [pick, ...cur].slice(0, 6).map((p, i) => (i < 3 ? p : { ...p, screenshot: null }));
  await chrome.storage.session.set({ [key]: next });
}

async function captureFor(tab) {
  if (!tab.active) {
    await chrome.tabs.update(tab.id, { active: true });
    await new Promise((r) => setTimeout(r, 150));
  }
  return chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
}

async function fetchCss(url) {
  if (!/^https?:/i.test(url)) throw new Error('Unsupported URL scheme');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'force-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (!/^https?:/i.test(res.url)) throw new Error('Redirected to an unsupported URL scheme');
    const type = (res.headers.get('content-type') || '').toLowerCase();
    // Stylesheets only: never hand HTML, JSON or anything else back to the page script that asked.
    if (type && !/text\/css|text\/plain|application\/octet-stream/.test(type)) throw new Error(`Not a stylesheet (${type.split(';')[0]})`);
    const text = await res.text();
    return text.length > MAX_CSS_BYTES ? text.slice(0, MAX_CSS_BYTES) : text;
  } finally {
    clearTimeout(timer);
  }
}

const HANDLERS = {
  // From the side panel: move into a window of its own that can be moved anywhere.
  'huescribe:popOut': async (msg) => {
    const tab = await chrome.tabs.get(msg.tabId);
    await openPanelWindow(tab, msg.screen || '');
    return { connected: await nextPanel(4000) };
  },
  'huescribe:startPicker': (msg, sender) => startPicker(msg.tabId ?? sender.tab?.id, msg.request ?? '', msg.autoPick ?? null).then(() => ({})),
  'huescribe:picked': async (msg, sender) => {
    await savePick(sender.tab.id, msg.pick);
    return { panelOpen: panelPorts.size > 0 };
  },
  'huescribe:capture': (msg, sender) => captureFor(sender.tab).then((dataUrl) => ({ dataUrl })),
  'huescribe:fetchCss': (msg) => fetchCss(msg.url).then((text) => ({ text })),
  'huescribe:ensureRecorder': (msg) => ensureRecorder(msg.tabId),
  // From the page: is a panel still open? If not, the page removes Huescribe (safety net for a
  // panel that closed while this worker was asleep, when no "closed" event could arrive).
  'huescribe:panelOpen': async () => {
    if (panelPorts.size || Date.now() - SW_STARTED < 6000) return { open: true };
    const { popupPicking } = await chrome.storage.session.get('popupPicking');
    return { open: !!popupPicking };
  },
};

// Who may send what. Extension pages (the panel, the welcome page) may ask for anything; content scripts only for
// what the picker needs, and only about their own tab. Anything else is refused (and logged) before a handler runs.
const PAGE_ONLY = new Set(['huescribe:popOut', 'huescribe:ensureRecorder']);
const EXT_ORIGIN = chrome.runtime.getURL('');
const fromExtensionPage = (sender) => sender.id === chrome.runtime.id && !sender.tab?.url?.startsWith('http') && (sender.url || '').startsWith(EXT_ORIGIN);
const fromOwnContentScript = (sender) => sender.id === chrome.runtime.id && Number.isInteger(sender.tab?.id) && sender.frameId === 0;
const MAX_MSG_BYTES = 8 * 1024 * 1024; // a pick with its screenshot stays well under this

/** Refuse messages that don't fit their sender or shape. Returns a reason, or '' when the message may run. */
function refuse(msg, sender) {
  if (sender.id !== chrome.runtime.id) return 'not from Huescribe';
  const page = fromExtensionPage(sender);
  if (!page && !fromOwnContentScript(sender)) return 'unknown sender';
  if (PAGE_ONLY.has(msg.type) && !page) return 'panel-only message';
  if ('tabId' in msg && msg.tabId != null) {
    if (!Number.isInteger(msg.tabId)) return 'bad tabId';
    if (!page && msg.tabId !== sender.tab.id) return 'a page may only act on its own tab';
  }
  if (msg.type === 'huescribe:fetchCss' && (typeof msg.url !== 'string' || msg.url.length > 4096)) return 'bad url';
  if (msg.type === 'huescribe:picked') {
    try { if (JSON.stringify(msg.pick ?? null).length > MAX_MSG_BYTES) return 'pick too large'; } catch { return 'pick not serializable'; }
  }
  return '';
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const handler = HANDLERS[msg?.type];
  if (!handler) return false;
  const why = refuse(msg, sender);
  if (!why && msg.type === 'huescribe:startPicker') {
    // Signed out: the picker doesn't start (the panel shows "Continue with Google" instead).
    HuescribeAccount.allowed().then((ok) => {
      if (ok) runHandler(handler, msg, sender, sendResponse);
      else sendResponse({ ok: false, error: 'signed-out' });
    }).catch((err) => { console.error('[Huescribe] could not check the sign-in', err); sendResponse({ ok: false, error: 'signed-out' }); });
    return true;
  }
  if (why) {
    console.warn(`[Huescribe] refused ${msg.type}: ${why}`, sender.url || sender.tab?.url);
    sendResponse({ ok: false, error: 'refused' });
    return false;
  }
  runHandler(handler, msg, sender, sendResponse);
  return true; // async response
});

function runHandler(handler, msg, sender, sendResponse) {
  Promise.resolve()
    .then(() => handler(msg, sender))
    .then((res) => sendResponse({ ok: true, ...res }))
    .catch((err) => {
      console.error(`[Huescribe] ${msg.type} failed`, err);
      sendResponse({ ok: false, error: String(err?.message || err) });
    });
}

setupUi();
