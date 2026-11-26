// PromptLift service worker.
// - Opens the side panel on toolbar click. Browsers without a side panel (e.g. Arc) get the panel
//   as its own window docked next to the browser window, because a popup closes as soon as you
//   click the page, which is exactly when you need the panel.
// - Injects the analyzer / picker, takes screenshots, fetches cross-origin CSS.
// - The animation recorder (recorder.js) runs on every page from document_start via the manifest.
// - Stores picks per tab in chrome.storage.session so the panel (or a re-opened popup) gets them.

const MAX_CSS_BYTES = 3 * 1024 * 1024;
const panelPorts = new Set();

const PANEL_W = 400;

async function setupUi() {
  try {
    if (chrome.sidePanel?.setPanelBehavior) {
      await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    }
    await chrome.action.setPopup({ popup: '' }); // no side panel: action.onClicked opens a window
  } catch (err) {
    console.error('[PromptLift] UI setup failed, using popup', err);
    await chrome.action.setPopup({ popup: 'panel.html' }).catch(() => {});
  }
}

/** No side panel: open (or focus) the panel as a window beside the browser window. */
chrome.action.onClicked.addListener(async (tab) => {
  if (chrome.sidePanel?.setPanelBehavior) return; // the side panel opens by itself
  try {
    await openPanelWindow(tab);
  } catch (err) {
    console.error('[PromptLift] could not open the panel window, falling back to a popup', err);
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
      .catch((err) => { console.debug('[PromptLift] panel window placement refused, using the default place', err); return chrome.windows.create({ url, type: 'popup', width: PANEL_W, height: Math.min(height, 900) }); });
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
chrome.runtime.onStartup.addListener(setupUi);

// ---------- the animation recorder lives only while the panel is open ----------
// Registered for document_start on every load while a panel is open (so reloads catch load-time
// animations), injected right away into tabs the panel works on, and stopped + unregistered when
// the last panel closes: with the sidebar closed, PromptLift runs nothing on any page.
const REC_ID = 'promptlift-recorder';
const recorderTabs = new Set();

async function registerRecorder() {
  try {
    const have = await chrome.scripting.getRegisteredContentScripts({ ids: [REC_ID] });
    if (have.length) return;
    await chrome.scripting.registerContentScripts([{ id: REC_ID, matches: ['<all_urls>'], js: ['motion.js', 'recorder.js'], runAt: 'document_start', world: 'MAIN', allFrames: false, persistAcrossSessions: false }]);
  } catch (err) { console.error('[PromptLift] could not register the recorder', err); }
}

async function unregisterRecorder() {
  try { await chrome.scripting.unregisterContentScripts({ ids: [REC_ID] }); } catch (err) { console.debug('[PromptLift] recorder was not registered', err); }
  for (const tabId of recorderTabs) {
    chrome.scripting.executeScript({ target: { tabId }, world: 'MAIN', func: () => { window.__plRec?.stop(); } })
      .catch((e) => console.debug('[PromptLift] could not stop the recorder in tab', tabId, e));
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
  if (port.name !== 'panel') return;
  panelPorts.add(port);
  registerRecorder();
  const pickingTabs = new Set();
  let isPopup = false;
  port.onMessage.addListener((msg) => {
    if (msg?.pickingTab) pickingTabs.add(msg.pickingTab);
    if (msg?.popup) isPopup = true;
  });
  // When the panel closes, give the page back: stop highlight mode and remove selection boxes.
  // A popup closes on purpose when you go to click the page, so picking keeps going then.
  port.onDisconnect.addListener(() => {
    panelPorts.delete(port);
    if (isPopup) return;
    if (!panelPorts.size) unregisterRecorder();
    for (const tabId of pickingTabs) {
      chrome.scripting.executeScript({ target: { tabId }, func: () => { globalThis.__plUI?.destroy(); } })
        .catch((e) => console.debug('[PromptLift] could not clean up tab', tabId, e));
    }
  });
});

/** Inject analyzer + prompt builders + selection UI into a tab. */
async function startPicker(tabId, request = '', autoPick = null) {
  await chrome.scripting.executeScript({ target: { tabId }, func: (r, a) => { globalThis.__promptliftPickRequest = r; globalThis.__promptliftAutoPick = a; }, args: [request, autoPick] });
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
    const res = await fetch(url, { signal: ctrl.signal, credentials: 'omit' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    return text.length > MAX_CSS_BYTES ? text.slice(0, MAX_CSS_BYTES) : text;
  } finally {
    clearTimeout(timer);
  }
}

const HANDLERS = {
  // From the side panel: move into a window of its own that can be moved anywhere.
  'promptlift:popOut': async (msg) => {
    const tab = await chrome.tabs.get(msg.tabId);
    await openPanelWindow(tab, msg.screen || '');
    return { connected: await nextPanel(4000) };
  },
  'promptlift:startPicker': (msg, sender) => startPicker(msg.tabId ?? sender.tab?.id, msg.request ?? '', msg.autoPick ?? null).then(() => ({})),
  'promptlift:picked': async (msg, sender) => {
    await savePick(sender.tab.id, msg.pick);
    return { panelOpen: panelPorts.size > 0 };
  },
  'promptlift:capture': (msg, sender) => captureFor(sender.tab).then((dataUrl) => ({ dataUrl })),
  'promptlift:fetchCss': (msg) => fetchCss(msg.url).then((text) => ({ text })),
  'promptlift:ensureRecorder': (msg) => ensureRecorder(msg.tabId),
};

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const handler = HANDLERS[msg?.type];
  if (!handler) return false;
  Promise.resolve()
    .then(() => handler(msg, sender))
    .then((res) => sendResponse({ ok: true, ...res }))
    .catch((err) => {
      console.error(`[PromptLift] ${msg.type} failed`, err);
      sendResponse({ ok: false, error: String(err?.message || err) });
    });
  return true; // async response
});

setupUi();
