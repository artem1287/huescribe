/* Huescribe translations: one tiny runtime shared by the side panel and the scripts injected into pages.

   English text is the key (like gettext): t('Add to my list') returns the text in the chosen language, or the
   English when a translation is missing, so nothing ever shows a raw key.
   - Placeholders: t('{n} parts', { n: 3 }). Keep {names} identical in translations.
   - Text kept in tables and translated where it's shown: tk('Colors') marks it, t(label) translates it.
   - Plurals: tn(count, 'One part', '{n} parts') picks the right form with Intl.PluralRules. A catalog entry for the
     plural key ('{n} parts') is either a string or an object { one, few, many, other, zero, two }.
   - Catalogs live in locales/<code>.js and register themselves on globalThis.HS_L10N[code]. Only the chosen one is
     loaded: the panel loads it while parsing (see below), page scripts get it injected before them.
   - Language choice: 'auto' (default) follows Chrome's language; the panel's ⋯ menu can pick one of LANGS.
     Stored in chrome.storage.local "uiLang"; the panel also mirrors it in localStorage so it can load the right
     catalog synchronously before panel.js runs.
*/
(() => {
  const g = globalThis;
  if (g.I18N && g.I18N.t) return;

  const LANGS = [
    ['en', 'English'], ['es', 'Español'], ['pt', 'Português'], ['fr', 'Français'], ['de', 'Deutsch'], ['it', 'Italiano'],
    ['tr', 'Türkçe'], ['id', 'Bahasa Indonesia'], ['vi', 'Tiếng Việt'], ['ru', 'Русский'], ['ar', 'العربية'], ['hi', 'हिन्दी'],
    ['zh', '中文'], ['ja', '日本語'], ['ko', '한국어'],
  ];
  const CODES = LANGS.map((l) => l[0]);
  const RTL = new Set(['ar']);

  /** Maps a browser locale like "pt-BR" or "zh_CN" to one of ours; 'en' when we don't have it. */
  function match(locale) {
    const base = String(locale || 'en').toLowerCase().replace('_', '-').split('-')[0];
    return CODES.includes(base) ? base : 'en';
  }

  function chromeLang() {
    try { return g.chrome?.i18n?.getUILanguage?.() || g.navigator?.language || 'en'; } catch { return 'en'; }
  }

  /** The language to use now: an explicit choice wins, then Chrome's language. */
  function resolve(choice) {
    return choice && choice !== 'auto' && CODES.includes(choice) ? choice : match(chromeLang());
  }

  let lang = resolve(g.__huescribeLang);
  let plural = new Intl.PluralRules(lang);

  function catalog() {
    return (g.HS_L10N && g.HS_L10N[lang]) || null;
  }

  function fill(text, vars) {
    if (!vars) return text;
    return text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
  }

  /** Translate English text; vars fill {placeholders}. */
  function t(en, vars) {
    const c = catalog();
    let out = c && typeof c[en] === 'string' && c[en] ? c[en] : en;
    return fill(out, vars);
  }

  /** Count-aware text: tn(n, 'One part', '{n} parts', vars). {n} is filled with the count. */
  function tn(count, one, other, vars) {
    const all = Object.assign({ n: count }, vars || {});
    const c = catalog();
    const entry = c && c[other];
    if (entry && typeof entry === 'object') {
      const form = entry[plural.select(count)] || entry.other || other;
      return fill(form, all);
    }
    if (entry && typeof entry === 'string' && lang !== 'en') {
      // A language without plural forms (zh, ja, ko, id, vi, tr…) gives one string for every count.
      return fill(entry, all);
    }
    return fill(count === 1 ? one : other, all);
  }

  g.I18N = {
    LANGS, CODES, RTL, match, resolve, t, tn,
    get lang() { return lang; },
    get dir() { return RTL.has(lang) ? 'rtl' : 'ltr'; },
    /** Switch language for this page (the catalog must already be loaded). */
    use(code) { lang = resolve(code); plural = new Intl.PluralRules(lang); },
    /** Number formatting in the chosen language (keeps Western digits for ar so code-like values read the same). */
    num(n) { return new Intl.NumberFormat(lang === 'ar' ? 'ar-u-nu-latn' : lang).format(n); },
  };
  g.t = t;
  g.tn = tn;
  /** Marks English text kept in a table (shown later with t(value)) so the string extractor finds it. */
  g.tk = (en) => en;

  // In the side panel: pick the language from the localStorage mirror and load its catalog while the page parses,
  // so panel.js starts with the right language. (Page scripts are injected with their catalog instead.)
  if (g.document && g.location && g.location.protocol === 'chrome-extension:' && g.document.readyState === 'loading') {
    let choice = 'auto';
    try { choice = g.localStorage.getItem('huescribe.uiLang') || 'auto'; } catch { /* storage blocked: follow Chrome */ }
    g.I18N.use(choice);
    if (lang !== 'en') g.document.write(`<script src="locales/${lang}.js"></scr` + 'ipt>');
    g.document.documentElement.lang = lang;
    g.document.documentElement.dir = g.I18N.dir;
  }
})();
