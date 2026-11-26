/* Huescribe account: "Continue with Google", kept in this browser only.
 *
 * Sign-in uses Chrome's own Google sign-in window (chrome.identity.getAuthToken with the OAuth client in
 * manifest.json → oauth2). With the token we read the Google profile (id, email, name, photo) once and keep it in
 * chrome.storage.local "account". The token itself is never stored by us (Chrome caches it) and nothing is sent to
 * any server of ours: there is none yet.
 *
 * Ready for paid plans: the account carries `plan` ('free' for everyone today). A future server can check the same
 * Google token (verify it with Google, look up the plan) and HuescribeAccount.refresh() is where its answer goes in.
 * Until then plans can't be enforced: everything here runs on the user's computer.
 *
 * Test mode: an unpacked (development) install may set chrome.storage.local "accountTestUser" to a profile object;
 * it then counts as signed in without Google. Store installs ignore it.
 *
 * Loaded by panel.html (window) and by background.js (importScripts). */
(function (root) {
  const KEY = 'account';
  const TEST_KEY = 'accountTestUser';
  const SCOPES = ['openid', 'email', 'profile'];
  const USERINFO = 'https://www.googleapis.com/oauth2/v3/userinfo';
  const REVOKE = 'https://oauth2.googleapis.com/revoke';
  const PLACEHOLDER = /^YOUR_|^$/;

  /** Errors with a `code` the UI turns into a human sentence (see messageFor in panel.js). */
  function fail(code, cause) {
    const err = new Error(code);
    err.code = code;
    err.cause = cause;
    return err;
  }

  function clientId() {
    try { return chrome.runtime.getManifest().oauth2?.client_id || ''; } catch { return ''; }
  }
  const isConfigured = () => !PLACEHOLDER.test(clientId());

  let devInstall = null;
  async function isDevInstall() {
    if (devInstall === null) {
      try { devInstall = (await chrome.management.getSelf()).installType === 'development'; } catch { devInstall = false; }
    }
    return devInstall;
  }

  async function testUser() {
    if (!(await isDevInstall())) return null;
    const { [TEST_KEY]: u } = await chrome.storage.local.get(TEST_KEY);
    return u && typeof u === 'object' ? { plan: 'free', ...u, test: true } : null;
  }

  /** The Google token (interactive opens Google's sign-in window). Throws a coded error. */
  async function token(interactive) {
    if (!isConfigured()) throw fail('not-configured');
    let res;
    try {
      res = await chrome.identity.getAuthToken({ interactive, scopes: SCOPES });
    } catch (err) {
      const m = String(err?.message || err);
      if (/did not approve|canceled|cancelled|closed|user turned off/i.test(m)) throw fail('cancelled', err);
      if (/OAuth2 not granted or revoked|not signed in|login required/i.test(m)) throw fail('signed-out', err);
      if (/client id|OAuth2 client|bad client/i.test(m)) throw fail('not-configured', err);
      if (/network|offline|connection|timed out/i.test(m)) throw fail('offline', err);
      throw fail('google', err);
    }
    const t = typeof res === 'string' ? res : res?.token;
    if (!t) throw fail('signed-out');
    return t;
  }

  async function profile(tok) {
    let r;
    try {
      r = await fetch(USERINFO, { headers: { Authorization: `Bearer ${tok}` }, credentials: 'omit', referrerPolicy: 'no-referrer' });
    } catch (err) { throw fail('offline', err); }
    if (r.status === 401) {
      // The cached token went stale: drop it so the next try gets a fresh one.
      await chrome.identity.removeCachedAuthToken({ token: tok }).catch(() => {});
      throw fail('signed-out');
    }
    if (!r.ok) throw fail('google', new Error(`userinfo HTTP ${r.status}`));
    const p = await r.json();
    if (!p?.sub || !p?.email) throw fail('google', new Error('userinfo without id/email'));
    return p;
  }

  async function save(p, prev) {
    const account = {
      id: p.sub,
      email: p.email,
      emailVerified: !!p.email_verified,
      name: p.name || p.email,
      picture: typeof p.picture === 'string' && p.picture.startsWith('https://') ? p.picture : '',
      plan: prev?.id === p.sub ? prev.plan || 'free' : 'free',
      signedInAt: prev?.id === p.sub ? prev.signedInAt : Date.now(),
      checkedAt: Date.now(),
    };
    await chrome.storage.local.set({ [KEY]: account });
    return account;
  }

  const api = {
    isConfigured,

    /** The signed-in account, or null. Doesn't talk to Google. */
    async get() {
      const test = await testUser();
      if (test) return test;
      const { [KEY]: a } = await chrome.storage.local.get(KEY);
      return a && a.id && a.email ? a : null;
    },

    /** Open Google's sign-in and remember who signed in. Must be called from a click. */
    async signIn() {
      const test = await testUser();
      if (test) return test;
      const prev = await api.get();
      const tok = await token(true);
      try {
        return await save(await profile(tok), prev);
      } catch (err) {
        if (err.code !== 'signed-out') throw err;
        return save(await profile(await token(true)), prev); // one retry with a fresh token
      }
    },

    /** Quietly confirm the stored account still works (each time the panel opens). Returns the account or null.
     *  Offline or Google hiccups keep the stored account (no lock-out on a flaky network). */
    async refresh() {
      const test = await testUser();
      if (test) return test;
      const prev = await api.get();
      if (!prev) return null;
      if (Date.now() - (prev.checkedAt || 0) < 10 * 60 * 1000) return prev; // checked recently
      try {
        const next = await save(await profile(await token(false)), prev);
        if (next.id !== prev.id) return next; // Chrome's Google account changed: that person is signed in now
        return next;
      } catch (err) {
        if (err.code === 'signed-out' || err.code === 'not-configured') {
          console.info('[Huescribe] Google sign-in is no longer valid; signing out', err.cause || err);
          await chrome.storage.local.remove(KEY);
          return null;
        }
        console.warn('[Huescribe] could not re-check the Google sign-in; keeping it for now', err.cause || err);
        return prev;
      }
    },

    /** Forget the account here and give the Google permission back. */
    async signOut() {
      if (await testUser()) { await chrome.storage.local.remove(TEST_KEY); return; }
      await chrome.storage.local.remove(KEY);
      if (!isConfigured()) return;
      try {
        const res = await chrome.identity.getAuthToken({ interactive: false, scopes: SCOPES });
        const tok = typeof res === 'string' ? res : res?.token;
        if (tok) {
          await chrome.identity.removeCachedAuthToken({ token: tok });
          await fetch(`${REVOKE}?token=${encodeURIComponent(tok)}`, { method: 'POST', credentials: 'omit' }).catch((err) => console.warn('[Huescribe] could not revoke the Google token', err));
        }
      } catch (err) { console.debug('[Huescribe] no Google token to give back', err); }
    },

    /** Whether picking may run (used by the background before it starts the picker). */
    async allowed() { return !!(await api.get()); },
  };

  root.HuescribeAccount = api;
})(typeof window !== 'undefined' ? window : self);
