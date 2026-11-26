// PromptLift analyzer — injected into the inspected page (isolated world).
// Extracts a site's design system (type, color, motion, layout, shape, components)
// as compact, site-agnostic data: elements are described by their role ("button",
// "card"…), never by the site's class names. Can be scoped to a screen region.

(() => {
  if (globalThis.__PromptLift?.version === 13) return;

  const MAX_ELEMENTS = 4000;
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'META', 'LINK', 'HEAD', 'TITLE', 'BR', 'WBR', 'IFRAME', 'OBJECT']);

  // ---------- helpers ----------

  const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
  const trunc = (s, n) => (s && s.length > n ? s.slice(0, n) + '…' : s || '');
  const px = (v) => parseFloat(v) || 0;

  function tally(map, key, weight = 1, tag) {
    if (key == null || key === '') return;
    const cur = map.get(key);
    if (cur) { cur.count += weight; if (tag) cur.tags.add(tag); }
    else map.set(key, { value: key, count: weight, tags: new Set(tag ? [tag] : []) });
  }

  function top(map, n, minCount = 0) {
    return [...map.values()]
      .filter((e) => e.count >= minCount)
      .sort((a, b) => b.count - a.count)
      .slice(0, n)
      .map((e) => ({ value: e.value, count: Math.round(e.count), kinds: [...e.tags].slice(0, 3) }));
  }

  function parseColor(str) {
    const m = str && str.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/);
    if (!m) return null;
    const a = m[4] == null ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return { r: +m[1], g: +m[2], b: +m[3], a };
  }

  /** Computed color → `#rrggbb`, `rgba(...)` when translucent, or the raw string for oklch()/color(). Null if invisible. */
  function normColor(str) {
    if (!str || str === 'transparent') return null;
    const c = parseColor(str);
    if (!c) return /^(color|oklch|oklab|lab|lch)\(/.test(str) ? str : null;
    if (c.a === 0) return null;
    if (c.a < 1) return `rgba(${c.r},${c.g},${c.b},${round(c.a, 2)})`;
    return '#' + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  }

  /** Replace rgb()/rgba() inside compound values (shadows, borders, gradients) with compact forms. */
  function hexify(v) {
    return (v || '').replace(/rgba?\([^)]+\)/g, (m) => normColor(m) || 'transparent');
  }

  /** Minify a declaration block / value for compact output. */
  function mini(css) {
    return hexify(css).replace(/\s+/g, ' ').replace(/\s*([:;{},])\s*/g, '$1').replace(/;}/g, '}').replace(/;$/, '').replace(/\b0\.(\d)/g, '.$1');
  }

  function cleanFamily(f) {
    const name = (f || '').trim().replace(/^["']|["']$/g, '');
    const m = name.match(/^__(.+?)_(?:Fallback_)?[0-9a-f]{5,8}$/i);
    return m ? m[1].replace(/_/g, ' ') : name;
  }
  const primaryFamily = (stack) => cleanFamily((stack || '').split(',')[0]);

  function isVisible(el, cs) {
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  function ownText(el) {
    let t = '';
    for (const n of el.childNodes) if (n.nodeType === 3) t += n.textContent;
    return t.replace(/\s+/g, ' ').trim();
  }

  function safeMatches(el, sel) { try { return el.matches(sel); } catch { return false; } }
  function safeQueryAll(sel) { try { return [...document.querySelectorAll(sel)]; } catch { return []; } }

  /** Background color actually visible behind an element (walks up past transparent parents). */
  function effectiveBg(el) {
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const c = normColor(getComputedStyle(n).backgroundColor);
      if (c && !c.startsWith('rgba')) return c;
    }
    return '#ffffff';
  }

  // ---------- element roles ----------

  /** Classify an element by its UI role, independent of the site's class names. */
  function kindOf(el, cs = getComputedStyle(el)) {
    const t = el.tagName;
    if (/^H[1-6]$/.test(t)) return 'heading';
    if (t === 'INPUT') return /^(submit|button|reset)$/.test(el.type) ? 'button' : 'input';
    if (t === 'TEXTAREA' || t === 'SELECT') return 'input';
    if (t === 'BUTTON' || el.getAttribute('role') === 'button') return 'button';
    if (t === 'IMG' || t === 'PICTURE' || t === 'VIDEO' || t === 'CANVAS' || t === 'svg') return 'image';
    if (t === 'HEADER' || el.getAttribute('role') === 'banner') return 'header';
    if (t === 'FOOTER' || el.getAttribute('role') === 'contentinfo') return 'footer';
    if (t === 'NAV') return 'nav';
    const r = el.getBoundingClientRect();
    const filled = !!normColor(cs.backgroundColor) || cs.backgroundImage.includes('gradient');
    const bordered = px(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none';
    if (t === 'A') {
      if ((filled || bordered) && px(cs.paddingLeft) >= 8 && r.height <= 72) return 'button';
      return el.closest('nav, header') ? 'nav link' : 'link';
    }
    if ((filled || bordered) && px(cs.borderRadius) > 0 && r.height < 36 && r.width < 220 && el.textContent.trim()) return 'badge';
    const surface = cs.boxShadow !== 'none' || bordered || (filled && normColor(cs.backgroundColor) !== effectiveBg(el.parentElement || el));
    if (surface && px(cs.borderRadius) > 0 && r.width >= 140 && r.width <= innerWidth * 0.9 && r.height >= 70) return 'card';
    if (t === 'SECTION' || (r.width >= innerWidth * 0.9 && r.height >= 200)) return 'section';
    if (/^(P|SPAN|LI|LABEL|SMALL|STRONG|EM|BLOCKQUOTE|FIGCAPTION|TD|TH)$/.test(t)) return 'text';
    return 'container';
  }

  // ---------- scope (whole page or a region) ----------

  let scope = null; // { left, top, right, bottom } in viewport px, or null for whole page

  function inScope(el) {
    if (!scope) return true;
    const r = el.getBoundingClientRect();
    const w = Math.min(r.right, scope.right) - Math.max(r.left, scope.left);
    const h = Math.min(r.bottom, scope.bottom) - Math.max(r.top, scope.top);
    if (w <= 0 || h <= 0) return false;
    return (w * h) / Math.max(1, r.width * r.height) >= 0.5;
  }

  const qsa = (sel) => safeQueryAll(sel).filter((el) => !el.closest('#__promptlift-root') && inScope(el));

  function collectElements() {
    const out = [];
    const all = document.body ? document.body.getElementsByTagName('*') : [];
    for (let i = 0; i < all.length && out.length < MAX_ELEMENTS; i++) {
      const el = all[i];
      if (SKIP_TAGS.has(el.tagName) || el.id === '__promptlift-root') continue;
      const cs = getComputedStyle(el);
      if (!isVisible(el, cs) || !inScope(el)) continue;
      out.push({ el, cs, rect: el.getBoundingClientRect(), kind: kindOf(el, cs) });
    }
    return out;
  }

  // ---------- stylesheets (incl. cross-origin via the service worker) ----------

  let sheetCache = null;

  async function fetchCssText(url) {
    try {
      const res = await chrome.runtime.sendMessage({ type: 'promptlift:fetchCss', url });
      return res?.ok ? res.text : null;
    } catch (e) {
      console.warn('[PromptLift] could not reach background for', url, e);
      return null;
    }
  }

  async function loadRules() {
    if (sheetCache) return sheetCache;
    const res = { styleRules: [], keyframes: [], fontFaces: [], mediaTexts: [], imports: [], unreadable: [] };
    const pending = [];
    const seen = new Set();

    function walk(rules, baseHref, media) {
      for (const rule of rules) {
        try {
          if (rule instanceof CSSStyleRule) {
            res.styleRules.push({ rule, selector: rule.selectorText, media });
            if (rule.cssRules?.length) walk(rule.cssRules, baseHref, media);
          } else if (rule instanceof CSSKeyframesRule) res.keyframes.push(rule);
          else if (rule instanceof CSSFontFaceRule) res.fontFaces.push({ rule, baseHref });
          else if (rule instanceof CSSMediaRule) {
            const m = rule.conditionText || rule.media.mediaText;
            res.mediaTexts.push(m);
            walk(rule.cssRules, baseHref, m);
          } else if (rule instanceof CSSImportRule) {
            res.imports.push(rule.href);
            try { if (rule.styleSheet) walk(rule.styleSheet.cssRules, rule.styleSheet.href || baseHref, media); }
            catch { pending.push(new URL(rule.href, baseHref).href); }
          } else if (rule.cssRules) walk(rule.cssRules, baseHref, media);
        } catch (e) {
          console.debug('[PromptLift] skipped rule', e);
        }
      }
    }

    for (const sheet of document.styleSheets) {
      if (sheet.href) { if (seen.has(sheet.href)) continue; seen.add(sheet.href); }
      try { walk(sheet.cssRules, sheet.href || location.href, null); }
      catch { if (sheet.href) pending.push(sheet.href); }
    }
    for (const sheet of document.adoptedStyleSheets || []) {
      try { walk(sheet.cssRules, location.href, null); } catch { /* ignore */ }
    }
    const texts = await Promise.all(pending.slice(0, 25).map(async (url) => ({ url, text: await fetchCssText(url) })));
    for (const { url, text } of texts) {
      if (!text) { res.unreadable.push(url); continue; }
      try {
        const s = new CSSStyleSheet();
        s.replaceSync(text.replace(/@import[^;]+;/g, ''));
        walk(s.cssRules, url, null);
      } catch (e) {
        console.warn('[PromptLift] failed to parse', url, e);
        res.unreadable.push(url);
      }
    }
    sheetCache = res;
    setTimeout(() => { sheetCache = null; }, 30000);
    return res;
  }

  /** Strip pseudo-classes/elements so `el.matches()` can test a state rule's base selector. */
  function baseSelector(sel) {
    return sel.replace(/::?(hover|focus|focus-visible|focus-within|active|visited|before|after|placeholder|marker|selection)(\([^)]*\))?/g, '')
      .replace(/:(not|is|where|has)\(\s*\)/g, '') // ":not(:hover)" leaves ":not()" behind
      .trim() || '*';
  }

  /** Split a selector list at top-level commas only (":is(.a, .b):hover" stays one selector). */
  function splitSelectors(sel) {
    const out = [];
    let depth = 0, start = 0;
    for (let i = 0; i < sel.length; i++) {
      const c = sel[i];
      if (c === '(' || c === '[') depth++;
      else if (c === ')' || c === ']') depth = Math.max(0, depth - 1);
      else if (c === ',' && depth === 0) { out.push(sel.slice(start, i)); start = i + 1; }
    }
    out.push(sel.slice(start));
    return out;
  }
  function safeClosest(el, sel) { try { return el?.closest(sel) || null; } catch { return null; } }
  function safeQueryIn(el, sel) { try { return [...el.querySelectorAll(sel)]; } catch { return []; } }

  const STATE_RE = /:(hover|focus-visible|focus|active)\b/;

  /**
   * State rules (hover/focus/active) that involve `el`: [{ state, css, scope, other }].
   * scope 'self':   `.btn:hover { … }` — el itself changes.
   * scope 'inside': `.card:hover .arrow { … }` with el = the card — hovering el changes a part inside.
   * scope 'outer':  same rule with el = the arrow — el changes when its card is hovered.
   */
  function statesFor(el, sheets, limit = 4, allScopes = false) {
    const out = [];
    const seen = new Set();
    for (const { rule, selector } of sheets.styleRules) {
      if (!selector || !STATE_RE.test(selector)) continue;
      for (const part of splitSelectors(selector).filter((p) => STATE_RE.test(p))) {
        const p = part.trim();
        const state = p.match(STATE_RE)[1];
        const css = mini(rule.style.cssText);
        if (!css) continue;
        // Split at the compound that carries the state: "<host>:hover <rest>".
        const m = p.match(/^(.*?:(?:hover|focus-visible|focus|active)(?:\([^)]*\))?[^\s>+~]*)\s*([>+~]?\s*.*)$/);
        const host = baseSelector(m ? m[1] : p);
        const rest = m ? m[2].replace(/^[>+~]\s*/, '').trim() : '';
        let entry = null;
        if (!rest) {
          if (safeMatches(el, host)) entry = { state, css, scope: 'self' };
        } else {
          const restSel = baseSelector(rest);
          if (safeMatches(el, host)) {
            const inner = safeQueryIn(el, restSel).find((n) => n !== el);
            if (inner) entry = { state, css, scope: 'inside', other: inner };
          } else if (safeMatches(el, restSel)) {
            const anc = safeClosest(el.parentElement, host);
            if (anc) entry = { state, css, scope: 'outer', other: anc };
          }
        }
        if (!entry || (!allScopes && entry.scope !== 'self')) continue;
        const key = state + css + entry.scope;
        if (seen.has(key)) continue;
        seen.add(key);
        entry.css = trunc(css, 220);
        out.push(entry);
        if (out.length >= limit) return out;
      }
    }
    return out;
  }

  // ---------- TYPOGRAPHY ----------

  const GENERIC_FONTS = /^(system-ui|-apple-system|BlinkMacSystemFont|Segoe UI|Roboto|Helvetica( Neue)?|Arial|sans-serif|serif|monospace|Georgia|Times( New Roman)?|ui-sans-serif|ui-serif|ui-monospace|Menlo|Monaco|Consolas|Courier( New)?)$/i;

  function textSpec(cs) {
    const size = px(cs.fontSize);
    const lh = cs.lineHeight === 'normal' ? 'normal' : round(px(cs.lineHeight) / size, 2);
    const ls = cs.letterSpacing === 'normal' ? 0 : round(px(cs.letterSpacing) / size, 3);
    const stack = cs.fontFamily.toLowerCase();
    return {
      family: primaryFamily(cs.fontFamily),
      class: /monospace|mono\b|code/.test(stack) ? 'mono' : /(^|,)\s*"?serif"?\s*(,|$)|georgia|times|garamond|playfair|fraunces|merriweather|lora|serif display/.test(stack) && !/sans-serif/.test(stack.split(',').slice(-1)[0]) ? 'serif' : 'sans',
      size: round(size, 1),
      weight: cs.fontWeight,
      lineHeight: lh,
      tracking: ls,
      transform: cs.textTransform !== 'none' ? cs.textTransform : undefined,
      italic: cs.fontStyle === 'italic' || undefined,
    };
  }

  async function analyzeFonts(els, sheets) {
    const roles = {};
    // Headings: first visible of each level in scope.
    for (const h of ['h1', 'h2', 'h3', 'h4']) {
      const el = qsa(h).find((e) => isVisible(e, getComputedStyle(e)) && e.textContent.trim());
      if (el) roles[h] = textSpec(getComputedStyle(el));
    }
    // Body = dominant style of running text; small = dominant text style smaller than body.
    const bodyStyles = new Map();
    for (const { el, cs, kind } of els) {
      if (!['text', 'container', 'section', 'card'].includes(kind)) continue;
      const t = ownText(el);
      if (t.length < 2) continue;
      const s = textSpec(cs);
      tally(bodyStyles, JSON.stringify(s), t.length);
    }
    const ranked = top(bodyStyles, 6).map((e) => JSON.parse(e.value));
    if (ranked[0]) roles.body = ranked[0];
    const small = ranked.find((s) => roles.body && s.size < roles.body.size - 0.5);
    if (small) roles.small = small;
    for (const [role, kind] of [['button', 'button'], ['nav link', 'nav link'], ['input', 'input']]) {
      const hit = els.find((e) => e.kind === kind && (e.el.innerText || e.el.placeholder || e.el.value || '').trim());
      if (hit) roles[role] = textSpec(hit.cs);
    }
    const code = qsa('code, pre').find((e) => isVisible(e, getComputedStyle(e)));
    if (code) roles.code = textSpec(getComputedStyle(code));

    // Families with their source.
    const famUse = new Map();
    for (const [role, s] of Object.entries(roles)) tally(famUse, s.family, 1, role);
    const googleLinks = [...document.querySelectorAll('link[href*="fonts.googleapis.com"], link[href*="fonts.bunny.net"]')].map((l) => decodeURIComponent(l.href)).concat(sheets.imports.filter((u) => /fonts\.(googleapis|bunny)/.test(u)).map(decodeURIComponent));
    const adobe = !!document.querySelector('link[href*="typekit.net"], script[src*="typekit.net"]') || sheets.imports.some((u) => /typekit/.test(u));
    const nextFont = /__\w+_[0-9a-f]{5,8}/.test(getComputedStyle(document.body || document.documentElement).fontFamily);
    const faces = new Set(sheets.fontFaces.map(({ rule }) => cleanFamily(rule.style.getPropertyValue('font-family')).toLowerCase()));

    const families = [...famUse.values()].map((f) => {
      const name = f.value;
      const re = new RegExp('family=' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '[+ ]'), 'i');
      let source = 'unknown';
      if (GENERIC_FONTS.test(name)) source = 'system font';
      else if (googleLinks.some((u) => re.test(u))) source = 'Google Fonts';
      else if (adobe && !faces.has(name.toLowerCase())) source = 'Adobe Fonts (licensed)';
      else if (nextFont) source = 'next/font (often a Google font)';
      else if (faces.has(name.toLowerCase())) source = 'self-hosted, check license';
      return { family: name, source, roles: [...f.tags] };
    });

    return { families, roles };
  }

  // ---------- COLORS ----------

  async function analyzeColors(els, sheets) {
    const text = new Map(); const bg = new Map(); const border = new Map(); const accents = new Map(); const gradients = new Map(); const onAccent = new Map();
    const vpArea = innerWidth * innerHeight;
    for (const { el, cs, rect, kind } of els) {
      const t = ownText(el);
      if (t) tally(text, normColor(cs.color), Math.min(t.length, 300), kind);
      const b = normColor(cs.backgroundColor);
      if (b) tally(bg, b, Math.min(rect.width * rect.height, vpArea) / 1000 + 1, kind);
      if (cs.backgroundImage.includes('gradient(')) tally(gradients, mini(cs.backgroundImage), 1, kind);
      if (px(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none' && normColor(cs.borderTopColor)) tally(border, normColor(cs.borderTopColor), 1, kind);
      if (kind === 'button' && b) { tally(accents, b, 3, 'button bg'); tally(onAccent, `${b}|${normColor(cs.color)}`, 1); }
      if (kind === 'link') tally(accents, normColor(cs.color), 1, 'link');
      if (kind === 'badge' && b) tally(accents, b, 1, 'badge');
    }
    const scopeRoot = scope ? (els[0]?.el || document.body) : document.body;
    // Many sites leave <body> transparent and paint each section: then the page's real base is
    // the background that covers the most height, not the browser's white.
    const base = scope ? effectiveBg(scopeRoot) : (normColor(getComputedStyle(document.body).backgroundColor) || normColor(getComputedStyle(document.documentElement).backgroundColor) || dominantBandBg() || '#ffffff');

    // Semantic design tokens declared on :root-like selectors (page-wide only).
    let tokens = null;
    if (!scope) {
      const rootRe = /^(:root|html|body|:host)\b|^\[data-theme|^\.(light|dark)\b|^html[.[]/;
      const semantic = /(^--(color-)?)(background|foreground|bg|fg|text|primary|secondary|accent|muted|border|ring|card|surface|brand|destructive|danger|success|warning|popover|input)(\b|-|$)/i;
      const light = new Map(); const dark = new Map();
      for (const { rule, selector, media } of sheets.styleRules) {
        if (!selector || !rootRe.test(selector.trim())) continue;
        const isDark = /dark/i.test(selector) || /prefers-color-scheme:\s*dark/.test(media || '');
        const st = rule.style;
        for (let i = 0; i < st.length; i++) {
          const k = st[i];
          if (!k.startsWith('--') || !semantic.test(k)) continue;
          let v = st.getPropertyValue(k).trim();
          if (/^\d+(\.\d+)?\s+\d+(\.\d+)?%\s+\d+(\.\d+)?%$/.test(v)) v = `hsl(${v})`; // shadcn-style raw HSL
          if (!/#|rgb|hsl|oklch|oklab|lab\(|lch\(|color\(|var\(/.test(v)) continue;
          (isDark ? dark : light).set(k, trunc(v, 60));
        }
      }
      if (light.size) tokens = { light: [...light].slice(0, 16), dark: [...dark].slice(0, 16) };
    }
    return {
      base,
      text: top(text, 4),
      backgrounds: top(bg, 6),
      borders: top(border, 3),
      accents: top(accents, 4),
      onAccent: Object.fromEntries(top(onAccent, 6).reverse().map((e) => e.value.split('|'))),
      gradients: top(gradients, 3),
      tokens,
      darkMode: !scope && (sheets.mediaTexts.some((m) => /prefers-color-scheme:\s*dark/.test(m)) || !!tokens?.dark?.length),
    };
  }

  // ---------- MOTION ----------

  const toMs = (s) => Math.round(parseFloat(s) * (s.trim().endsWith('ms') ? 1 : 1000));

  async function analyzeAnimations(els, sheets) {
    const easings = new Map(); const durations = new Map();
    const used = new Map(); // keyframe name → {kind, timing}
    for (const { cs, kind } of els) {
      if (cs.transitionDuration && cs.transitionDuration.split(',').some((d) => px(d) > 0)) {
        cs.transitionTimingFunction.split(/,(?![^(]*\))/).forEach((e) => tally(easings, e.trim(), 1));
        cs.transitionDuration.split(',').forEach((d) => { const ms = toMs(d); if (ms > 0) tally(durations, ms, 1); });
      }
      if (cs.animationName && cs.animationName !== 'none') {
        const names = cs.animationName.split(',').map((n) => n.trim());
        names.forEach((n, i) => {
          if (used.has(n)) return;
          const pick = (v) => v.split(/,(?![^(]*\))/)[i]?.trim() || v.split(/,(?![^(]*\))/)[0].trim();
          const dur = pick(cs.animationDuration);
          const timing = [toMs(dur) + 'ms', pick(cs.animationTimingFunction), pick(cs.animationIterationCount) !== '1' ? pick(cs.animationIterationCount) : '', pick(cs.animationDelay) !== '0s' ? 'delay ' + toMs(pick(cs.animationDelay)) + 'ms' : ''].filter(Boolean).join(' ');
          used.set(n, { kind, timing });
        });
      }
    }
    const keyframes = [];
    for (const kf of sheets.keyframes) {
      const u = used.get(kf.name);
      if (!u || keyframes.some((k) => k.name === kf.name)) continue;
      const body = [...kf.cssRules].map((r) => `${r.keyText}{${mini(r.style.cssText)}}`).join(' ');
      keyframes.push({ name: kf.name, on: u.kind, timing: u.timing, frames: trunc(body, 240) });
      if (keyframes.length >= 5) break;
    }

    // Interaction states, grouped by element role.
    const interactions = [];
    const seen = new Set();
    const interactive = els.filter((e) => ['button', 'link', 'nav link', 'card', 'input', 'badge', 'image'].includes(e.kind));
    for (const { el, kind } of interactive) {
      for (const s of statesFor(el, sheets, 3)) {
        const key = kind + s.state + s.css;
        if (seen.has(key)) continue;
        seen.add(key);
        interactions.push({ kind, state: s.state, css: s.css });
      }
      if (interactions.length >= 8) break;
    }

    const htmlCs = getComputedStyle(document.documentElement);
    const libs = detectMotionLibraries();
    return {
      easings: top(easings, 3).map((e) => e.value),
      durations: top(durations, 4).map((e) => e.value).sort((a, b) => a - b),
      keyframes,
      interactions,
      smoothScroll: htmlCs.scrollBehavior === 'smooth',
      sticky: [...new Set(els.filter((e) => e.cs.position === 'sticky' || (e.cs.position === 'fixed' && e.rect.top < 5)).map((e) => e.kind))].slice(0, 3),
      scrollSnap: els.some(({ cs }) => cs.scrollSnapType && cs.scrollSnapType !== 'none'),
      scrollDriven: sheets.styleRules.some(({ rule }) => /animation-timeline|view-timeline/.test(rule.style.cssText)),
      reducedMotion: sheets.mediaTexts.some((m) => /prefers-reduced-motion/.test(m)),
      jsReveal: els.filter(({ el }) => /opacity:\s*0/.test(el.getAttribute('style') || '')).length >= 3,
      libraries: libs,
    };
  }

  function detectMotionLibraries() {
    const found = new Set();
    const scripts = [...document.scripts].map((s) => s.src).join(' ');
    const checks = [
      [/gsap|greensock/i, 'GSAP'], [/ScrollTrigger/i, 'GSAP ScrollTrigger'], [/framer-motion|motion\.dev/i, 'Framer Motion'],
      [/animejs|anime(\.min)?\.js/i, 'anime.js'], [/\/aos[@.]/i, 'AOS'], [/lottie/i, 'Lottie'], [/lenis/i, 'Lenis smooth scroll'],
      [/locomotive/i, 'Locomotive Scroll'], [/swiper/i, 'Swiper'], [/three(\.module)?(\.min)?\.js|three@/i, 'three.js'], [/split-?type|splitting/i, 'split-text animation'],
    ];
    for (const [re, name] of checks) if (re.test(scripts)) found.add(name);
    const dom = [['[data-aos]', 'AOS'], ['lottie-player, dotlottie-player', 'Lottie'], ['html.lenis', 'Lenis smooth scroll'], ['[data-scroll-container]', 'Locomotive Scroll'],
      ['.swiper', 'Swiper'], ['[data-framer-component-type]', 'Framer'], ['spline-viewer', 'Spline 3D'], ['[data-w-id]', 'Webflow interactions']];
    for (const [sel, name] of dom) if (safeQueryAll(sel).length) found.add(name);
    return [...found];
  }

  // ---------- LAYOUT ----------

  async function analyzeLayout(els, sheets) {
    const vw = innerWidth;
    const containers = new Map(); const sectionPad = new Map(); const grids = new Map();
    for (const { el, cs, rect, kind } of els) {
      const ml = px(cs.marginLeft);
      if (cs.maxWidth !== 'none' && rect.width > 320 && ml > 0 && Math.abs(ml - px(cs.marginRight)) < 2) {
        tally(containers, `${cs.maxWidth}|${cs.paddingLeft}`, 1);
      }
      if (rect.width >= vw * 0.8 && rect.height >= 200 && px(cs.paddingTop) >= 32) tally(sectionPad, cs.paddingTop === cs.paddingBottom ? cs.paddingTop : `${cs.paddingTop} / ${cs.paddingBottom}`, 1);
      if (cs.display.includes('grid') && el.children.length >= 2) {
        const cols = cs.gridTemplateColumns.split(' ').filter(Boolean).length;
        const childKinds = new Map();
        [...el.children].forEach((c) => tally(childKinds, kindOf(c), 1));
        const child = top(childKinds, 1)[0]?.value || 'item';
        tally(grids, `${cols}|${cs.gap}|${child}`, 1);
      }
      if (cs.display.includes('flex') && kind === 'card' && el.parentElement) { /* card rows via flex counted below */ }
    }

    const bps = new Set();
    for (const m of sheets.mediaTexts) {
      for (const x of m.matchAll(/(?:min|max)-width:\s*([\d.]+)(px|em|rem)/g)) bps.add(Math.round(x[2] === 'px' ? +x[1] : +x[1] * 16));
      for (const x of m.matchAll(/width\s*[<>]=?\s*([\d.]+)(px|em|rem)/g)) bps.add(Math.round(x[2] === 'px' ? +x[1] : +x[1] * 16));
    }

    let header = null;
    const h = scope ? null : document.querySelector('header, [role="banner"]') || document.querySelector('nav');
    if (h) {
      const cs = getComputedStyle(h);
      const bgc = normColor(cs.backgroundColor);
      header = {
        position: cs.position,
        height: Math.round(h.getBoundingClientRect().height),
        blur: cs.backdropFilter !== 'none' ? cs.backdropFilter : undefined,
        translucent: !!bgc && bgc.startsWith('rgba'),
        border: px(cs.borderBottomWidth) > 0 && normColor(cs.borderBottomColor) ? `${cs.borderBottomWidth} ${normColor(cs.borderBottomColor)}` : undefined,
      };
    }

    return {
      container: top(containers, 1).map((c) => { const [max, pad] = c.value.split('|'); return { max, pad }; })[0],
      sectionPadding: top(sectionPad, 2).map((e) => e.value),
      grids: top(grids, 4).map((g) => { const [cols, gap, child] = g.value.split('|'); return { cols: +cols, gap, child }; }),
      breakpoints: [...bps].filter((b) => b >= 320 && b <= 1920).sort((a, b) => a - b).slice(0, 6),
      header,
      pattern: scope ? [] : pagePattern(),
    };
  }

  /** Top-to-bottom sequence of page blocks described generically ("hero", "3-col card grid"…). */
  function pagePattern() {
    const blocks = [];
    const main = document.querySelector('main') || document.body;
    let candidates = [...document.querySelectorAll('body > header, body > footer, main > *, body > section, body > div > section, body > div > main > *, body > div > header, body > div > footer')];
    candidates = candidates.filter((el, i, arr) => arr.indexOf(el) === i && !el.closest('#__promptlift-root'));
    if (candidates.length < 2) candidates = [...main.children];
    candidates.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
    for (const el of candidates) {
      const cs = getComputedStyle(el);
      if (!isVisible(el, cs)) continue;
      const r = el.getBoundingClientRect();
      if (r.height < 60) continue;
      const bgc = effectiveBg(el);
      const dark = luminance(bgc) < 0.25;
      const kind = kindOf(el, cs);
      let label;
      if (kind === 'header' || el.tagName === 'NAV') label = 'header';
      else if (kind === 'footer') label = 'footer';
      else if (el.querySelector('h1')) label = 'hero';
      else {
        const grid = [...el.querySelectorAll('*')].find((n) => { const c = getComputedStyle(n); return (c.display.includes('grid') || c.display.includes('flex')) && n.children.length >= 3; });
        if (grid) {
          const gc = getComputedStyle(grid);
          const cols = gc.display.includes('grid') ? gc.gridTemplateColumns.split(' ').filter(Boolean).length : grid.children.length;
          label = `${cols}-col ${kindOf(grid.children[0]) === 'card' ? 'cards' : 'items'}`;
        } else if (el.querySelector('img, picture, video') && el.querySelector('h2, h3, p')) label = 'media + text';
        else label = 'content section';
      }
      if (el.style.backgroundImage || cs.backgroundImage.includes('gradient')) label += ' (gradient bg)';
      else if (dark && label !== 'footer') label += ' (dark band)';
      else if (dark) label = 'dark footer';
      blocks.push(label);
      if (blocks.length >= 10) break;
    }
    return blocks;
  }

  function luminance(hex) {
    const m = /^#([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return 1;
    const n = parseInt(m[1], 16);
    return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
  }

  // ---------- SHAPE ----------

  async function analyzeShape(els) {
    const radiusByKind = new Map(); const shadows = new Map(); const borders = new Map(); const spacing = new Map(); const effects = new Map();
    for (const { el, cs, rect, kind } of els) {
      const r = px(cs.borderTopLeftRadius);
      if (r > 0 && !['text', 'container', 'section'].includes(kind) || (r > 0 && kind === 'container' && rect.width > 60)) {
        const v = r >= rect.height / 2 - 1 && rect.width > rect.height ? 'pill' : r >= rect.width / 2 - 1 && Math.abs(rect.width - rect.height) < 2 ? 'circle' : cs.borderRadius;
        if (!radiusByKind.has(kind)) radiusByKind.set(kind, new Map());
        tally(radiusByKind.get(kind), v, 1);
      }
      if (cs.boxShadow !== 'none') tally(shadows, mini(cs.boxShadow), 1, kind);
      if (px(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none' && normColor(cs.borderTopColor)) tally(borders, `${cs.borderTopWidth} ${cs.borderTopStyle} ${normColor(cs.borderTopColor)}`, 1, kind);
      for (const v of [cs.paddingTop, cs.paddingLeft, cs.rowGap, cs.columnGap]) {
        const n = Math.round(px(v));
        if (n > 0 && n <= 160) tally(spacing, n, 1);
      }
      if (cs.backdropFilter && cs.backdropFilter !== 'none') tally(effects, `backdrop-filter: ${cs.backdropFilter}`, 1, kind);
    }
    const radii = [...radiusByKind].map(([kind, m]) => ({ kind, value: top(m, 1)[0].value, count: [...m.values()].reduce((a, b) => a + b.count, 0) }))
      .filter((r) => r.kind !== 'container' || r.count >= 3).sort((a, b) => b.count - a.count).slice(0, 6);
    return {
      radii,
      shadows: top(shadows, 3),
      borders: top(borders, 2),
      spacing: top(spacing, 12, 2).map((e) => e.value).sort((a, b) => a - b),
      effects: top(effects, 2),
    };
  }

  // ---------- COMPONENTS ----------

  /** Compact, generic style recipe for a component: only the properties that define its look. */
  function recipe(el, cs = getComputedStyle(el), parentCs = el.parentElement ? getComputedStyle(el.parentElement) : null) {
    const o = {};
    const bgc = normColor(cs.backgroundColor);
    if (cs.backgroundImage.includes('gradient')) o.background = mini(cs.backgroundImage);
    else if (bgc) o.background = bgc;
    const inherited = (p) => parentCs && cs[p] === parentCs[p];
    if (!inherited('color')) o.color = normColor(cs.color) || 'transparent'; // see-through text (gradient or picture inside the letters)
    const size = px(cs.fontSize);
    const lh = cs.lineHeight === 'normal' ? 'normal' : round(px(cs.lineHeight) / size, 2);
    if (!(inherited('fontSize') && inherited('fontWeight') && inherited('fontFamily'))) {
      o.font = `${cs.fontWeight} ${round(size, 1)}px/${lh} ${primaryFamily(cs.fontFamily)}`;
    }
    if (cs.letterSpacing !== 'normal' && px(cs.letterSpacing) !== 0) o['letter-spacing'] = round(px(cs.letterSpacing) / size, 3) + 'em';
    if (cs.textTransform !== 'none') o['text-transform'] = cs.textTransform;
    const pad = [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map((v) => Math.round(px(v)));
    if (pad.some(Boolean)) o.padding = (pad[0] === pad[2] && pad[1] === pad[3] ? (pad[0] === pad[1] ? [pad[0]] : [pad[0], pad[1]]) : pad).map((n) => n + 'px').join(' ');
    if (px(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none' && normColor(cs.borderTopColor)) o.border = `${cs.borderTopWidth} ${cs.borderTopStyle} ${normColor(cs.borderTopColor)}`;
    else if (px(cs.borderBottomWidth) > 0 && cs.borderBottomStyle !== 'none' && normColor(cs.borderBottomColor)) o['border-bottom'] = `${cs.borderBottomWidth} ${cs.borderBottomStyle} ${normColor(cs.borderBottomColor)}`;
    const r = cs.borderRadius;
    if (r !== '0px') { const rect = el.getBoundingClientRect(); o['border-radius'] = px(r) >= rect.height / 2 - 1 && rect.width > rect.height ? '999px' : r; }
    if (cs.boxShadow !== 'none') o['box-shadow'] = mini(cs.boxShadow);
    if (/flex|grid/.test(cs.display)) {
      o.display = cs.display;
      if (cs.display.includes('grid')) o['grid-template-columns'] = `repeat(${cs.gridTemplateColumns.split(' ').filter(Boolean).length}, 1fr)`;
      else if (cs.flexDirection !== 'row') o['flex-direction'] = cs.flexDirection;
      if (cs.alignItems !== 'normal' && cs.alignItems !== 'stretch') o['align-items'] = cs.alignItems;
      if (cs.justifyContent !== 'normal' && cs.justifyContent !== 'flex-start') o['justify-content'] = cs.justifyContent;
      if (cs.gap !== 'normal' && cs.gap !== '0px') o.gap = cs.gap;
    }
    const kind = kindOf(el, cs);
    if (['button', 'input', 'badge'].includes(kind)) o.height = Math.round(el.getBoundingClientRect().height) + 'px';
    if (cs.transitionDuration.split(',').some((d) => px(d) > 0)) o.transition = mini(cs.transition).replace(/,/g, ', ');
    if (cs.backdropFilter && cs.backdropFilter !== 'none') o['backdrop-filter'] = cs.backdropFilter;
    if (cs.opacity !== '1') o.opacity = cs.opacity;
    return o;
  }

  async function analyzeComponents(els, sheets) {
    const out = [];
    const want = [['button', 2], ['input', 1], ['card', 1], ['badge', 1], ['link', 1], ['nav link', 1]];
    for (const [kind, n] of want) {
      const seen = new Set();
      let count = 0;
      for (const e of els) {
        if (e.kind !== kind) continue;
        const rec = recipe(e.el, e.cs);
        const sig = JSON.stringify([rec.background, rec.color, rec.border, rec['border-radius']]);
        if (seen.has(sig)) continue;
        // Unstyled browser-default controls (e.g. Arial + outset border) say nothing about the design.
        if (/outset|inset/.test(rec.border || '') || (kind === 'button' && /\b(Arial|Times New Roman)$/.test(rec.font || ''))) continue;
        seen.add(sig);
        let label = kind;
        if (kind === 'button') label = count === 0 ? 'primary button' : 'secondary button';
        out.push({ kind: label, style: rec, states: statesFor(e.el, sheets, 3) });
        if (++count >= n) break;
      }
    }
    return out;
  }

  // ---------- STACK (context only) ----------

  function analyzeStack(sheets) {
    const found = [];
    const has = (sel) => safeQueryAll(sel).length > 0;
    if (has('#__next') || [...document.scripts].some((s) => /\/_next\//.test(s.src))) found.push('Next.js');
    if (has('#__nuxt')) found.push('Nuxt');
    if (has('html[data-wf-page]')) found.push('Webflow');
    if (has('[data-framer-component-type]')) found.push('Framer');
    const twVars = sheets.styleRules.slice(0, 3000).some(({ rule }) => /--tw-/.test(rule.style.cssText));
    if (twVars) found.push('Tailwind');
    if (sheets.styleRules.some(({ selector }) => /data-radix|\[data-state=/.test(selector || ''))) found.push('Radix/shadcn');
    if (has('svg.lucide, svg[class*="lucide"]')) found.push('Lucide icons');
    return found;
  }

  // ---------- single element ----------

  function genericName(kind) { return kind.replace(/\s+/g, '-'); }

  async function analyzeElement(el) {
    const sheets = await loadRules();
    const rootCs = getComputedStyle(el);
    const rootKind = kindOf(el, rootCs);
    const rootName = genericName(rootKind === 'container' || rootKind === 'section' ? 'block' : rootKind);
    const keyframeNames = new Set();
    const rules = [];
    const seen = new Set();

    function nameFor(n) {
      if (n === el) return `.${rootName}`;
      const parts = [];
      for (let p = n; p && p !== el; p = p.parentElement) {
        const k = kindOf(p);
        parts.unshift(['heading', 'text', 'container', 'image'].includes(k) ? p.tagName.toLowerCase() : `.${genericName(k)}`);
      }
      return `.${rootName} ${parts.slice(-2).join(' ')}`;
    }

    const nodes = [el, ...[...el.querySelectorAll('*')].filter((n) => !SKIP_TAGS.has(n.tagName) && isVisible(n, getComputedStyle(n)))].slice(0, 40);
    for (const n of nodes) {
      const cs = getComputedStyle(n);
      if (cs.animationName !== 'none') cs.animationName.split(',').forEach((k) => keyframeNames.add(k.trim()));
      const rec = recipe(n, cs, n === el ? null : getComputedStyle(n.parentElement));
      if (n === el) { delete rec.height; const r = n.getBoundingClientRect(); if (r.width < 600) rec['max-width'] = Math.round(r.width) + 'px'; }
      const sel = nameFor(n);
      const body = Object.entries(rec).filter(([, v]) => v != null && v !== '').map(([k, v]) => `${k}:${v}`).join(';'); // never print a missing value
      if (body && !seen.has(sel + body)) {
        seen.add(sel + body);
        rules.push(`${sel}{${body}}`);
      }
      for (const s of statesFor(n, sheets, 3)) {
        const line = `${sel}:${s.state}{${s.css}}`;
        if (!seen.has(line)) { seen.add(line); rules.push(line); }
      }
      for (const pseudo of ['::before', '::after']) {
        const ps = getComputedStyle(n, pseudo);
        if (ps.content && ps.content !== 'none' && ps.content !== 'normal') {
          const p = { content: trunc(ps.content, 30), background: normColor(ps.backgroundColor) || (ps.backgroundImage !== 'none' ? mini(ps.backgroundImage) : undefined), position: ps.position !== 'static' ? ps.position : undefined, inset: ps.position === 'absolute' ? ps.inset : undefined, transform: ps.transform !== 'none' ? ps.transform : undefined };
          rules.push(`${sel}${pseudo}{${Object.entries(p).filter(([, v]) => v).map(([k, v]) => `${k}:${v}`).join(';')}}`);
        }
      }
      if (rules.length >= 24) break;
    }
    const keyframes = sheets.keyframes.filter((k) => keyframeNames.has(k.name)).slice(0, 3)
      .map((k) => `@keyframes ${k.name}{${[...k.cssRules].map((r) => `${r.keyText}{${mini(r.style.cssText)}}`).join('')}}`);
    const r = el.getBoundingClientRect();
    return {
      kind: rootKind,
      name: rootName,
      structure: skeleton(el, rootName),
      rules,
      keyframes,
      fonts: [...new Set(nodes.map((n) => primaryFamily(getComputedStyle(n).fontFamily)))].slice(0, 3),
      rect: { left: r.left, top: r.top, width: r.width, height: r.height },
    };
  }

  /** Generic markup outline: tags + role names, no site classes, no content. */
  function skeleton(root, rootName, depth = 0, budget = { n: 0 }) {
    if (budget.n++ > 30) return '';
    const pad = '  '.repeat(depth);
    const tag = root.tagName.toLowerCase();
    const k = kindOf(root);
    const cls = depth === 0 ? ` class="${rootName}"` : ['card', 'badge', 'button'].includes(k) && tag !== 'button' ? ` class="${genericName(k)}"` : '';
    if (tag === 'svg' || tag === 'img') return `${pad}<${tag}${cls}/>`;
    const kids = [...root.children].filter((c) => !SKIP_TAGS.has(c.tagName) && isVisible(c, getComputedStyle(c)));
    const text = ownText(root) ? '…' : '';
    if (!kids.length || depth >= 3) return `${pad}<${tag}${cls}>${text || (kids.length ? '…' : '')}</${tag}>`;
    // Collapse repeated identical siblings.
    const lines = [];
    let prev = null; let rep = 0;
    for (const kid of kids.slice(0, 8)) {
      const s = skeleton(kid, rootName, depth + 1, budget);
      if (s === prev) { rep++; continue; }
      if (rep) lines.push(`${pad}  <!-- ×${rep + 1} -->`);
      rep = 0; prev = s; lines.push(s);
    }
    if (rep) lines.push(`${pad}  <!-- ×${rep + 1} -->`);
    if (kids.length > 8) lines.push(`${pad}  <!-- +${kids.length - 8} more -->`);
    return `${pad}<${tag}${cls}>\n${lines.filter(Boolean).join('\n')}\n${pad}</${tag}>`;
  }

  /** Layout of the smallest element that contains a region. */
  function regionContainer(region) {
    const cx = (region.left + region.right) / 2;
    const cy = (region.top + region.bottom) / 2;
    let el = document.elementsFromPoint(cx, cy).find((n) => n.id !== '__promptlift-root' && !n.closest('#__promptlift-root'));
    while (el && el.parentElement) {
      const r = el.getBoundingClientRect();
      if (r.left <= region.left + 8 && r.top <= region.top + 8 && r.right >= region.right - 8 && r.bottom >= region.bottom - 8) break;
      el = el.parentElement;
    }
    if (!el || el === document.documentElement) el = document.body;
    // The visual layout (grid/flex of several items) is often a few levels down: find it breadth-first.
    let layoutEl = null;
    const queue = [[el, 0]];
    while (queue.length && !layoutEl) {
      const [n, d] = queue.shift();
      const cs = getComputedStyle(n);
      const kids = [...n.children].filter((c) => isVisible(c, getComputedStyle(c)));
      if (/flex|grid/.test(cs.display) && kids.length >= 2 && n.getBoundingClientRect().width >= (region.right - region.left) * 0.5) layoutEl = n;
      else if (d < 4) kids.forEach((k) => queue.push([k, d + 1]));
    }
    const outer = recipe(el);
    return {
      structure: skeleton(el, 'section'),
      style: outer,
      layout: layoutEl && layoutEl !== el ? recipe(layoutEl) : null,
      layoutEl: layoutEl && layoutEl !== el ? layoutEl : null,
    };
  }

  // ---------- INGREDIENTS (tickable items for supplemental prompts) ----------
  // Each item: { id, group, type, label, context, code, preview }.
  // `label` and `code` are site-agnostic and go into the prompt; `context` only helps the
  // user recognize the item in the panel (it may contain the source page's text).

  function hslOf(hex) {
    const m = /^#([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return null;
    const n = parseInt(m[1], 16);
    const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
    const max = Math.max(r, g, b); const min = Math.min(r, g, b); const l = (max + min) / 2;
    if (max === min) return { h: 0, s: 0, l };
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    const h = (max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60;
    return { h, s, l };
  }

  /** Plain-language color name, e.g. "pale orange", "dark grey". */
  function colorName(c) {
    let hex = c;
    let alpha = '';
    const rgba = /^rgba\((\d+),(\d+),(\d+),([\d.]+)\)$/.exec(c || '');
    if (rgba) { hex = '#' + [rgba[1], rgba[2], rgba[3]].map((v) => (+v).toString(16).padStart(2, '0')).join(''); alpha = +rgba[4] < 0.05 ? 'transparent ' : 'translucent '; }
    if (c === 'transparent') return 'transparent';
    const x = hslOf(hex);
    if (!x) return 'color';
    if (alpha === 'transparent ') return 'transparent';
    if (x.s < 0.12) return alpha + (x.l > 0.93 ? 'white' : x.l > 0.75 ? 'light grey' : x.l > 0.4 ? 'grey' : x.l > 0.1 ? 'dark grey' : 'black');
    const h = x.h;
    const hue = h < 15 || h >= 345 ? 'red' : h < 40 ? 'orange' : h < 65 ? 'yellow' : h < 90 ? 'lime' : h < 165 ? 'green' : h < 190 ? 'teal' : h < 205 ? 'cyan' : h < 250 ? 'blue' : h < 270 ? 'indigo' : h < 295 ? 'violet' : h < 320 ? 'purple' : 'pink';
    const tone = x.l > 0.85 ? 'pale ' : x.l > 0.68 ? 'light ' : x.l < 0.28 ? 'dark ' : x.s > 0.75 && x.l > 0.4 && x.l < 0.6 ? 'vivid ' : '';
    return alpha + tone + hue;
  }

  function splitTop(value) {
    const out = []; let depth = 0; let cur = '';
    for (const ch of value) {
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }

  /** "Diagonal gradient (135°): pale orange → light pink" from a computed background-image. */
  // ---------- plain-language words for items ----------
  // Each item gets: title (short headline), desc (one plain sentence), tech (numbers for "Details").
  // label (what goes in the prompt) = title + desc + tech.

  const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);

  function gradientWords(value, isText) {
    const layers = splitTop(value).filter((l) => l.includes('gradient('));
    const g = layers[0] || '';
    const type = /radial/.test(g) ? 'radial' : /conic/.test(g) ? 'conic' : 'linear';
    const inner = g.slice(g.indexOf('(') + 1, g.lastIndexOf(')'));
    const args = splitTop(inner);
    let dir = ''; let angle = null;
    if (type === 'linear') {
      const deg = /^(-?[\d.]+)deg$/.exec(args[0] || '');
      angle = deg ? ((Math.round(+deg[1]) % 360) + 360) % 360 : /^to /.test(args[0] || '') ? null : 180;
      dir = angle == null ? args[0].replace(/^to /, 'toward ') : angle % 180 === 0 ? 'top to bottom' : angle % 180 === 90 ? 'left to right' : 'diagonal';
    } else dir = type === 'radial' ? 'from the center' : 'in a circle';
    const colors = (inner.match(/rgba?\([^)]*\)|#[0-9a-f]{3,8}\b|oklch\([^)]*\)|\btransparent\b/gi) || []).map((c) => colorName(normColor(c) || c));
    const uniq = colors.filter((c, i) => c !== colors[i - 1]).slice(0, 4);
    return {
      title: isText ? 'Gradient text' : type === 'radial' ? 'Glow' : 'Gradient',
      desc: `${cap(uniq.join(' to '))}, ${dir}.`,
      tech: [type, angle != null ? `${angle}°` : null, layers.length > 1 ? `${layers.length} layers` : null].filter(Boolean).join(', '),
    };
  }

  /** "lifts up slightly, grows a little and gets a different shadow" from a state rule. */
  function stateWords(css) {
    const w = [];
    const ty = /translateY\((-?[\d.]+)px\)/.exec(css) || /translate\(-?[\d.]+px,\s*(-?[\d.]+)px\)/.exec(css) || /translate:\s*-?[\d.]+px\s+(-?[\d.]+)px/.exec(css);
    if (ty) w.push(+ty[1] < 0 ? 'lifts up' : 'moves down');
    if (/translateX\(/.test(css)) w.push('moves sideways');
    const sc = /scale\(([\d.]+)\)/.exec(css);
    if (sc) w.push(+sc[1] > 1 ? 'grows' : 'shrinks');
    if (/rotate\(/.test(css)) w.push('tilts');
    if (/box-shadow:[^;]*0px 0px 0px \d/.test(css) || /outline:(?!none)/.test(css)) w.push('shows a ring');
    else if (/box-shadow/.test(css)) w.push('shadow changes');
    if (/background(-color)?:/.test(css)) w.push('color changes');
    if (/(^|;)color:/.test(css)) w.push('text color changes');
    if (/border(-color)?:/.test(css)) w.push('border changes');
    if (/opacity:/.test(css)) w.push('fades a bit');
    if (/filter:/.test(css)) w.push('looks different');
    if (/text-decoration/.test(css)) w.push('gets underlined');
    return w.length ? w.join(', ') : 'changes';
  }

  function shadowWords(value, isText) {
    const alphas = [...value.matchAll(/rgba\([^)]*,([\d.]+)\)/g)].map((m) => +m[1]);
    const alpha = alphas.length ? Math.max(...alphas) : /#[0-9a-f]{6}/i.test(value) ? 1 : 0.2;
    const blur = Math.max(0, ...[...value.matchAll(/(-?[\d.]+)px/g)].map((m) => Math.abs(+m[1])));
    const tint = (() => { const c = /rgba?\((\d+),(\d+),(\d+)/.exec(value); if (!c) return ''; const n = colorName('#' + [c[1], c[2], c[3]].map((v) => (+v).toString(16).padStart(2, '0')).join('')); return /grey|black|white/.test(n) ? '' : n; })();
    const strength = alpha <= 0.15 ? 'Soft' : alpha <= 0.35 ? 'Medium' : 'Strong';
    return `${strength}${blur >= 30 ? ', wide' : ''} ${tint ? `${tint} glow` : isText ? 'text shadow' : 'shadow'}${/inset/.test(value) ? ' inside' : ''}.`;
  }

  function filterWords(f) {
    const w = [];
    if (/grayscale/.test(f)) w.push('black and white');
    if (/sepia/.test(f)) w.push('old-photo look');
    if (/blur/.test(f)) w.push('blurry');
    if (/brightness/.test(f)) w.push('brightness changed');
    if (/saturate/.test(f)) w.push('stronger colors');
    if (/contrast/.test(f)) w.push('more contrast');
    if (/hue-rotate/.test(f)) w.push('colors shifted');
    return w.length ? `${cap(w.join(', '))}.` : 'Changed look.';
  }

  function fontWords(s) {
    const size = s.size >= 48 ? 'very big' : s.size >= 30 ? 'big' : s.size >= 20 ? 'medium' : s.size >= 15 ? 'normal size' : 'small';
    const weight = +s.weight >= 700 ? 'bold' : +s.weight >= 600 ? 'semi-bold' : +s.weight <= 300 ? 'thin' : '';
    const extra = [s.tracking < -0.005 ? 'tight' : s.tracking > 0.02 ? 'spaced out' : '', s.transform === 'uppercase' ? 'all caps' : '', s.italic ? 'italic' : ''];
    return {
      desc: `${[s.family, size, weight, ...extra].filter(Boolean).join(', ')}.`,
      tech: `${s.size}px, weight ${s.weight}, line height ${s.lineHeight}${s.tracking ? `, letter spacing ${s.tracking}em` : ''}`,
    };
  }

  const ROLE_NOUN = { button: 'button', card: 'card', link: 'link', 'nav link': 'menu link', input: 'input box', badge: 'badge', image: 'image', heading: 'heading', section: 'section', header: 'header', footer: 'footer', nav: 'menu', text: 'text', container: 'element' };

  /** Cards stay short: no extra context line for page items. */
  function contextOf() { return ''; }

  let itemSeq = 0;
  /** What kind of thing an item comes from (heading level, button, card…), so the prompt can say
   *  how it fits the person's own site ("every h2 heading", "all my cards"). */
  function metaOf(el) {
    if (!el || el.nodeType !== 1) return null;
    const kind = kindOf(el);
    return { kind, tag: el.tagName.toLowerCase(), noun: ROLE_NOUN[kind] || 'element' };
  }
  /** Build an item; `label` (used in the prompt) combines the plain words with the numbers. */
  const mk = (o) => ({ id: `i${Date.now().toString(36)}${(itemSeq++).toString(36)}`, label: `${o.title}: ${o.desc.replace(/\.$/, '')}${o.tech ? ` (${o.tech})` : ''}`, ...o });

  /** Remember the page element an item came from (for previews and highlighting). */
  function reg(el) {
    if (!el) return undefined;
    globalThis.__plTargets ??= new Map();
    const id = `t${Date.now().toString(36)}${(itemSeq++).toString(36)}`;
    globalThis.__plTargets.set(id, new WeakRef(el));
    return id;
  }

  function rectOf(el) {
    if (!el) return undefined;
    const r = el.getBoundingClientRect();
    return { left: Math.round(r.left), top: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) };
  }

  /** Where a font family comes from on this page (a fact for the prompt), or ''. */
  function familySource(name, sheets) {
    if (GENERIC_FONTS.test(name)) return 'a system font';
    const links = [...document.querySelectorAll('link[href*="fonts.googleapis.com"], link[href*="fonts.bunny.net"]')].map((l) => decodeURIComponent(l.href)).concat(sheets.imports.map(decodeURIComponent));
    const re = new RegExp('family=' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '[+ ]'), 'i');
    if (links.some((u) => re.test(u))) return 'from Google Fonts (free)';
    const faces = new Set(sheets.fontFaces.map(({ rule }) => cleanFamily(rule.style.getPropertyValue('font-family')).toLowerCase()));
    if (document.querySelector('link[href*="typekit.net"], script[src*="typekit.net"]') && !faces.has(name.toLowerCase())) return 'from Adobe Fonts (licensed)';
    if (faces.has(name.toLowerCase())) return 'self-hosted by the site';
    return '';
  }

  function fontCode(s, cs) {
    return [`font-family: ${cs ? cs.fontFamily : `"${s.family}"`};`, `font-size: ${s.size}px;`, `font-weight: ${s.weight};`, `line-height: ${s.lineHeight};`,
      s.tracking ? `letter-spacing: ${s.tracking}em;` : '', s.transform ? `text-transform: ${s.transform};` : '', s.italic ? 'font-style: italic;' : '',
      cs ? `color: ${normColor(cs.color) || 'transparent'};` : ''].filter(Boolean).join('\n');
  }

  function keyframesCode(rule) {
    return `@keyframes ${rule.name} {\n${[...rule.cssRules].map((r) => `  ${r.keyText} { ${mini(r.style.cssText).replace(/;/g, '; ')} }`).join('\n')}\n}`;
  }

  /** Keyframes rule → frames in the shape PromptLiftMotion expects. */
  function framesOfRule(rule) {
    const frames = [];
    for (const r of rule.cssRules) {
      const props = {};
      for (let i = 0; i < r.style.length; i++) props[r.style[i]] = r.style.getPropertyValue(r.style[i]);
      for (const key of r.keyText.split(',')) {
        const k = key.trim();
        frames.push({ offset: k === 'from' ? 0 : k === 'to' ? 1 : parseFloat(k) / 100, props });
      }
    }
    return frames.sort((a, b) => a.offset - b.offset);
  }

  /** Detect self-moving media inside a pick. Returns { title, desc, when, tech, code } or null. */
  function mediaMotion(el) {
    const t = el.tagName;
    const r = el.getBoundingClientRect();
    const size = `${Math.round(r.width)}×${Math.round(r.height)}`;
    if (t === 'CANVAS' && r.width >= 40 && r.height >= 40) {
      const lib = detectMotionLibraries().find((l) => /three|Spline|Rive|Lottie/.test(l));
      const cs = getComputedStyle(el);
      const place = r.width >= document.documentElement.clientWidth * 0.9 ? 'full width' : `${size} px`;
      const behind = cs.position === 'absolute' || cs.position === 'fixed' || px(cs.zIndex) < 0 ? ', sits behind the content' : '';
      return { title: 'Moving drawing', desc: `Drawn by code${lib ? ` (${lib})` : ''}, so it can't be copied as-is. Claude can make something similar.`, when: 'Loops', tech: `canvas ${size}`,
        code: `A <canvas> ${place}${behind}, redrawn by JavaScript every frame (keeps moving)${lib ? `; made with ${lib}` : ''}.\nIt has no CSS to copy: the pasted frames show how it changes over about 2 seconds.` };
    }
    if (t === 'VIDEO' && (el.autoplay || el.loop || !el.paused)) {
      return { title: 'Background video', desc: 'A video that plays by itself. Use your own video file.', when: el.loop ? 'Loops' : 'On load', tech: `video ${size}${el.muted ? ', muted' : ''}${el.loop ? ', loop' : ''}`,
        code: `A video ${size} px that plays by itself${el.muted ? ', muted' : ''}${el.loop ? ', on a loop' : ''}, no controls, fit: ${getComputedStyle(el).objectFit}.\nThe pasted frames show what it looks like; use my own video file.` };
    }
    if (/^(LOTTIE-PLAYER|DOTLOTTIE-PLAYER|DOTLOTTIE-WC)$/.test(t) || el.hasAttribute?.('data-lottie')) {
      return { title: 'Lottie animation', desc: 'A ready-made animation file. You can reuse it only if you have the rights to it.', when: el.hasAttribute('loop') ? 'Loops' : 'On load', tech: `lottie ${size}`, code: `<${t.toLowerCase()} src="(animation file)"${el.hasAttribute('loop') ? ' loop' : ''} autoplay></${t.toLowerCase()}>` };
    }
    if (t === 'svg' && el.querySelector('animate, animateTransform, animateMotion')) {
      const a = el.querySelector('animate, animateTransform, animateMotion');
      return { title: 'Animated icon', desc: 'An SVG picture with built-in movement.', when: a.getAttribute('repeatCount') === 'indefinite' ? 'Loops' : 'On load', tech: `SVG <${a.tagName}> ${a.getAttribute('attributeName') || ''} ${a.getAttribute('dur') || ''}`.trim(), code: el.outerHTML.length < 3000 ? el.outerHTML : `<!-- SVG with <${a.tagName}> (too large to include) -->` };
    }
    if (t === 'IMG' && /\.gif(\?|$)/i.test(el.currentSrc || el.src || '')) {
      return { title: 'Moving picture (GIF)', desc: 'An animated image. Use your own GIF or video.', when: 'Loops', tech: `gif ${size}`, code: '<!-- animated GIF -->' };
    }
    return null;
  }

  // 'All of it' holds the copy-everything items (the whole button / area / look): Format stays layout only.
  const GROUPS = { bg: 'Colors', text: 'Text', fx: 'Colors', shape: 'Format', hover: 'Movement', anim: 'Movement', layout: 'Format', all: 'All of it' };

  /** Items found in a set of elements (a picked element + descendants, or a region). */
  function collectItems(nodes, sheets, root) {
    const items = [];
    const seen = new Set();
    const push = (node, key, o) => { if (seen.has(key)) return; seen.add(key); items.push(mk({ ...o, target: reg(node), rect: rectOf(node), meta: metaOf(node) })); };
    const fonts = [];

    for (const el of nodes.slice(0, 120)) {
      const cs = getComputedStyle(el);
      const kind = kindOf(el, cs);
      const noun = ROLE_NOUN[kind] || 'element';
      const ctx = contextOf(el);
      const bgi = cs.backgroundImage;
      if (bgi.includes('gradient(')) {
        const isText = /text/.test(cs.webkitBackgroundClip || cs.backgroundClip || '');
        const code = isText
          ? `background-image: ${hexify(bgi)};\n-webkit-background-clip: text;\nbackground-clip: text;\ncolor: transparent;`
          : `background-image: ${hexify(bgi)};` + (cs.backgroundSize !== 'auto' ? `\nbackground-size: ${cs.backgroundSize};` : '') + (cs.backgroundAttachment === 'fixed' ? '\nbackground-attachment: fixed;' : '');
        push(el, 'g' + bgi, { group: GROUPS.bg, type: isText ? 'text-gradient' : 'gradient', ...gradientWords(bgi, isText), context: '', code, preview: { kind: 'gradient', value: mini(bgi) } });
      }
      if (cs.boxShadow !== 'none') push(el, 's' + cs.boxShadow, { group: GROUPS.fx, type: 'shadow', title: 'Shadow', desc: shadowWords(mini(cs.boxShadow), false), tech: mini(cs.boxShadow), context: ctx, code: `box-shadow: ${mini(cs.boxShadow)};`, preview: { kind: 'shadow', value: mini(cs.boxShadow) } });
      if (cs.textShadow !== 'none') push(el, 'ts' + cs.textShadow, { group: GROUPS.fx, type: 'text-shadow', title: 'Text shadow', desc: shadowWords(mini(cs.textShadow), true), tech: mini(cs.textShadow), context: ctx, code: `text-shadow: ${mini(cs.textShadow)};`, preview: { kind: 'text-shadow', value: mini(cs.textShadow) } });
      if (cs.backdropFilter && cs.backdropFilter !== 'none') push(el, 'bf' + cs.backdropFilter, { group: GROUPS.fx, type: 'glass', title: 'Frosted glass', desc: "Blurs what's behind it.", tech: cs.backdropFilter, context: ctx, code: `backdrop-filter: ${cs.backdropFilter};\n-webkit-backdrop-filter: ${cs.backdropFilter};\nbackground: ${normColor(cs.backgroundColor) || 'rgba(255,255,255,.6)'};`, preview: { kind: 'none' } });
      if (cs.filter && cs.filter !== 'none' && kind === 'image') push(el, 'f' + cs.filter, { group: GROUPS.fx, type: 'filter', title: 'Photo filter', desc: filterWords(cs.filter), tech: cs.filter, context: ctx, code: `filter: ${cs.filter};`, preview: { kind: 'none' } });
      if (cs.clipPath && cs.clipPath !== 'none') push(el, 'cp' + cs.clipPath, { group: GROUPS.shape, type: 'shape', title: 'Cut-out shape', desc: 'Cut into a special shape.', tech: 'clip-path', context: ctx, code: `clip-path: ${cs.clipPath};`, preview: { kind: 'none' } });
      // Hover / focus effects
      for (const st of statesFor(el, sheets, 6, true)) {
        // Already listed from its host's side ("Card hover: the heading inside") when the host is in the pick.
        if (st.scope === 'outer' && root && (st.other === root || root.contains(st.other))) continue;
        // The element that actually changes (itself, a part inside it, or itself inside a hovered parent).
        const changer = st.scope === 'inside' ? st.other : el;
        const ccs = getComputedStyle(changer);
        const hasTrans = ccs.transitionDuration.split(',').some((d) => px(d) > 0);
        const trans = hasTrans ? `transition: ${mini(ccs.transition).replace(/,/g, ', ')};\n` : '';
        const ms = hasTrans ? Math.max(...ccs.transitionDuration.split(',').map((d) => parseFloat(d) * (d.trim().endsWith('ms') ? 1 : 1000))) : 0;
        const state = st.state === 'hover' ? 'hover' : 'click';
        const verb = state === 'hover' ? 'hover' : 'click';
        const partNoun = ROLE_NOUN[kindOf(changer)] || 'part';
        const hostNoun = st.scope === 'outer' ? ROLE_NOUN[kindOf(st.other)] || 'parent' : noun;
        const title = st.scope === 'self' ? `${cap(noun)} ${verb}` : st.scope === 'inside' ? `${cap(noun)} ${verb}: the ${partNoun} inside` : `${cap(noun)} on ${hostNoun} ${verb}`;
        const what = stateWords(st.css).replace(/^./, (c) => c.toLowerCase());
        const desc = st.scope === 'self' ? `${cap(stateWords(st.css))}.` : st.scope === 'inside' ? `${cap(verb === 'hover' ? 'hovering' : 'clicking')} the ${noun} affects the ${partNoun} inside it: ${what}.` : `${cap(verb === 'hover' ? 'hovering' : 'clicking')} the ${hostNoun} around it affects it: ${what}.`;
        const where = st.scope === 'self' ? `/* :${st.state} */` : st.scope === 'inside' ? `/* when the ${noun} is :${st.state}, the ${partNoun} inside it gets: */` : `/* when the ${hostNoun} around it is :${st.state}, this ${noun} gets: */`;
        push(el, 'h' + kind + st.state + st.css + st.scope, { group: GROUPS.hover, when: state === 'hover' ? 'On hover' : 'On click', type: state === 'hover' ? 'hover' : 'focus', title, desc, tech: hasTrans ? `${ms}ms` : '', context: ctx, code: `/* resting */\n${trans}${where}\n${st.css.replace(/;/g, ';\n')};`, preview: { kind: 'none' },
          stateCss: st.css, stateOn: reg(changer) });
      }
      // CSS animations currently applied (loops, entrances defined in CSS)
      if (cs.animationName && cs.animationName !== 'none') {
        // Each list (name, duration, count, easing) lines up by position; shorter lists repeat.
        const nth = (v, i) => { const l = splitSelectors(v).map((x) => x.trim()); return l[i % l.length]; };
        const names = cs.animationName.split(',').map((n) => n.trim());
        for (const [ni, name] of names.entries()) {
          const rule = sheets.keyframes.find((k) => k.name === name);
          if (!rule) continue;
          const count = nth(cs.animationIterationCount, ni);
          const loop = count === 'infinite';
          const dur = nth(cs.animationDuration, ni);
          let ms = Math.round(parseFloat(dur) * (dur.endsWith('ms') ? 1 : 1000));
          // "auto" (scroll-driven animations) has no length in time: it follows the scroll.
          const scrollDriven = !Number.isFinite(ms) || (cs.animationTimeline && !/^(auto|none)$/.test(cs.animationTimeline));
          if (!Number.isFinite(ms)) ms = 1000;
          const words = globalThis.PromptLiftMotion?.describe({
            frames: framesOfRule(rule), iterations: loop ? 'infinite' : +count || 1,
            duration: ms, scrollLinked: scrollDriven,
            stagger: 0, count: 1, unit: 'element', easing: nth(cs.animationTimingFunction, ni), trigger: scrollDriven ? 'scrolllinked' : loop ? 'loop' : 'load', target: `the ${noun}`,
          });
          push(el, 'a' + name, { group: GROUPS.anim, when: scrollDriven ? 'As you scroll' : loop ? 'Loops' : 'On load', animName: name, type: 'animation', title: words ? words.name : 'Animation', desc: words ? words.sentence : 'Moves.', tech: words ? `${words.numbers}; plays ${words.when}` : '', context: ctx, code: `${keyframesCode(rule)}\n\n/* on the element */\nanimation: ${mini(cs.animation).replace(/,/g, ', ')};`, preview: { kind: 'none' } });
        }
      }
      // Things that move but can't be turned into CSS: canvas drawings, videos, Lottie, SVG <animate>, GIFs.
      const media = mediaMotion(el);
      if (media) push(el, 'm' + media.title + el.tagName, { group: GROUPS.anim, when: media.when, type: 'media', title: media.title, desc: media.desc, tech: media.tech, context: ctx, code: media.code, preview: { kind: 'none' } });
      // Typography: distinct text styles (ranked below)
      // Headings count their full text: split-text effects leave them with no direct text nodes.
      const txt = /^H[1-6]$/.test(el.tagName) ? el.textContent.replace(/\s+/g, ' ').trim() : ownText(el);
      if (txt.length >= 1) {
        const s = textSpec(cs);
        const uaDefault = /^(Arial|Times New Roman)$/.test(s.family) && /^(BUTTON|INPUT|SELECT|TEXTAREA)$/.test(el.tagName);
        const key = `${s.family}|${s.size}|${s.weight}`;
        const hit = fonts.find((f) => f.key === key);
        if (hit) hit.chars += txt.length;
        else if (!uaDefault && fonts.length < 12) fonts.push({ key, s, cs, el, kind, chars: txt.length });
      }
    }
    // Headings first (largest first), then buttons, then the most-used running text.
    const rank = (f) => (/^H[1-6]$/.test(f.el.tagName) ? 1e6 + f.s.size : f.kind === 'button' ? 5e5 : f.chars);
    fonts.sort((a, b) => rank(b) - rank(a));
    fonts.splice(3);
    for (const f of fonts) {
      const role = /^H[1-3]$/.test(f.el.tagName) ? 'Heading font' : f.kind === 'button' ? 'Button font' : f.s.size < 14 ? 'Small text font' : 'Text font';
      push(f.el, 't' + f.key, { group: GROUPS.text, type: 'font', title: role, ...fontWords(f.s), fontSource: familySource(f.s.family, sheets), context: `“${trunc(f.el.textContent.replace(/\s+/g, ' ').trim(), 30)}”`, code: fontCode(f.s, f.cs), preview: { kind: 'font', value: { family: f.cs.fontFamily, size: Math.min(f.s.size, 22), weight: f.s.weight } } });
    }
    if (root) {
      const cs = getComputedStyle(root);
      const bg = normColor(cs.backgroundColor);
      const noun = ROLE_NOUN[kindOf(root, cs)] || 'element';
      if (bg && !cs.backgroundImage.includes('gradient')) items.push(mk({ target: reg(root), rect: rectOf(root), group: GROUPS.bg, type: 'color', title: 'Background color', desc: `${cap(colorName(bg))}.`, tech: bg, context: '', code: `background-color: ${bg};`, preview: { kind: 'color', value: bg } }));
      const rad = cs.borderRadius !== '0px'; const bord = px(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none' && !!normColor(cs.borderTopColor); // a transparent border is only spacing
      if (rad || bord) {
        const rr = root.getBoundingClientRect();
        const pill = px(cs.borderRadius) >= rr.height / 2 - 1 && rr.width > rr.height;
        const r = px(cs.borderRadius);
        const corner = pill ? 'Pill shape' : rad ? `${r <= 6 ? 'Slightly rounded' : r <= 16 ? 'Rounded' : 'Very rounded'} corners` : 'Square corners';
        const border = bord ? `${px(cs.borderTopWidth) <= 1 ? 'thin' : 'thick'} border` : ''; // its color belongs with the colors, not the format
        items.push(mk({ target: reg(root), rect: rectOf(root), group: GROUPS.shape, type: 'shape', title: pill ? 'Pill shape' : rad ? 'Rounded corners' : 'Border', desc: `${corner}${border ? `, ${border}` : ''}.`, tech: [rad && (pill ? '999px' : cs.borderRadius), bord && `${cs.borderTopWidth} border`].filter(Boolean).join(', '), context: '', code: [rad && `border-radius: ${pill ? '999px' : cs.borderRadius};`, bord && `border-width: ${cs.borderTopWidth};\nborder-style: ${cs.borderTopStyle};`].filter(Boolean).join('\n'), preview: { kind: 'shape', value: pill ? '999px' : cs.borderRadius } }));
        if (bord) { const bc = normColor(cs.borderTopColor); items.push(mk({ target: reg(root), rect: rectOf(root), group: GROUPS.bg, type: 'color', title: 'Border color', desc: `${cap(colorName(bc))}.`, tech: bc, context: '', code: `border-color: ${bc};`, preview: { kind: 'color', value: bc } })); }
      }
      // Layout: the element itself or the first grid/flex inside it with several children.
      const lay = [root, ...root.querySelectorAll('*')].slice(0, 40).find((n) => { const c = getComputedStyle(n); return /flex|grid/.test(c.display) && n.children.length >= 2; });
      if (lay) items.push(layoutItem(lay));
    }
    return items;
  }

  function layoutItem(lay) {
    const c = getComputedStyle(lay);
    const grid = c.display.includes('grid');
    const cols = grid ? c.gridTemplateColumns.split(' ').filter(Boolean).length : 0;
    const gap = c.gap !== 'normal' && c.gap !== '0px' ? c.gap.split(' ')[0] : '';
    const desc = grid ? `${cols} column${cols > 1 ? 's' : ''}.` : c.flexDirection.startsWith('column') ? 'Stacked.' : `In a row${c.justifyContent === 'space-between' ? ', spread out' : c.justifyContent === 'center' ? ', centered' : ''}.`;
    const code = grid ? `display: grid;\ngrid-template-columns: repeat(${cols}, minmax(0, 1fr));\ngap: ${c.gap};${c.alignItems !== 'normal' ? `\nalign-items: ${c.alignItems};` : ''}`
      : `display: flex;\nflex-direction: ${c.flexDirection};\ngap: ${c.gap};${c.alignItems !== 'normal' ? `\nalign-items: ${c.alignItems};` : ''}${c.justifyContent !== 'normal' ? `\njustify-content: ${c.justifyContent};` : ''}${c.flexWrap !== 'nowrap' ? `\nflex-wrap: ${c.flexWrap};` : ''}`;
    return mk({ target: reg(lay), rect: rectOf(lay), group: GROUPS.layout, type: 'layout', title: 'Spacing', desc, tech: grid ? `grid, ${cols} columns, gap ${c.gap}` : `flex ${c.flexDirection}, gap ${c.gap}`, context: '', code, preview: { kind: 'none' } });
  }

  // ---------- structure outline, navigation bar, color journey (v7.3) ----------
  // These describe what the page IS (order, arrangement, sizes, colors per section) so Claude can
  // rebuild it exactly. Elements still waiting for a scroll reveal (opacity 0) count as present.

  const shown = (el) => {
    if (!(el instanceof Element) || SKIP_TAGS.has(el.tagName) || el.id === '__promptlift-root' || el.closest?.('[data-pl-ignore]')) return false;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  };
  /** Visible children. Wrappers with `display: contents` have no box of their own (zero size), so
   *  their children stand in for them (frameworks wrap whole pages in these). */
  const kidsOf = (el) => [...el.children].flatMap((k) => (k instanceof Element && !SKIP_TAGS.has(k.tagName) && getComputedStyle(k).display === 'contents' ? kidsOf(k) : [k])).filter(shown);
  const r0 = (n) => Math.round(n);
  const pxv = (v) => `${r0(px(v))}px`;

  // ---------- what a piece of text is FOR (never what it says) ----------

  const textOf = (el) => (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
  const wordCount = (el) => (textOf(el).match(/\S+/g) || []).length;
  /** "3 words", or for several: "1 word each" / "1–2 words each". */
  function wordsLabel(list) {
    const n = list.map(wordCount);
    const lo = Math.min(...n), hi = Math.max(...n);
    const each = list.length > 1 ? ' each' : '';
    const num = lo === hi ? `${lo}` : `${lo}–${hi}`;
    return hi > 25 && list.length === 1 ? `about ${Math.round(hi / 5) * 5} words` : `${num} word${hi === 1 ? '' : 's'}${each}`;
  }

  /** The job a piece of text does on the page, guessed from its role, place and wording. */
  function purposeOf(el, kind) {
    const t = textOf(el).toLowerCase();
    const inFooter = !!el.closest('footer, [role=contentinfo]');
    const inNav = !!el.closest('nav, header, [role=banner]');
    const inCard = !!el.parentElement?.closest('*') && (() => { for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) if (kindOf(n) === 'card') return true; return false; })();
    if (kind === 'heading') {
      if (el.tagName === 'H1') return 'main headline';
      if (inCard) return 'card title';
      if (inFooter) return 'footer column title';
      return el.tagName === 'H2' ? 'section title' : 'subheading';
    }
    if (kind === 'button' || kind === 'link' || kind === 'nav link') {
      if (/\b(sign|log) ?in\b/.test(t)) return 'sign-in';
      if (/sign ?up|get started|start|try|create (an )?account|join|register|free trial/.test(t)) return 'sign-up call to action';
      if (/contact|book|demo|talk to|schedule|get in touch/.test(t)) return 'contact / demo request';
      if (/buy|cart|order|shop|checkout|subscribe|pricing|plans?\b/.test(t) && kind === 'button') return 'purchase';
      if (/learn more|read more|see (more|all|how)|view|explore|discover/.test(t)) return 'learn-more link';
      if (/download|install|get the app/.test(t)) return 'download';
      if (inFooter && /privacy|terms|cookie|legal|imprint/.test(t)) return 'legal link';
      if (kind === 'nav link' || (inNav && kind === 'link')) return 'page link';
      if (inFooter) return 'footer link';
      if (kind === 'button') return paintOf(el).length ? 'main call to action' : 'secondary action';
      return 'link';
    }
    if (kind === 'badge') return 'small tag';
    if (/©|copyright|all rights reserved/.test(t)) return 'copyright line';
    if (/[$€£]\s?\d|\d\s?[$€£]|\/\s?(mo|month|yr|year)\b/.test(t)) return 'price';
    const cs = getComputedStyle(el);
    const next = el.nextElementSibling;
    if (wordCount(el) <= 4 && (cs.textTransform === 'uppercase' || px(cs.letterSpacing) > 0.5) && next && kindOf(next) === 'heading') return 'small label above the title';
    if (inCard) return 'card description';
    const prev = el.previousElementSibling;
    if (prev && prev.tagName === 'H1') return 'supporting line under the headline';
    if (prev && kindOf(prev) === 'heading') return 'description under the title';
    if (inFooter) return 'footer text';
    if (wordCount(el) <= 3) return 'short label';
    return 'paragraph';
  }

  /** A section's job: hero, cards, pricing, questions, call to action… */
  function sectionPurpose(band) {
    const all = [...band.querySelectorAll('*')].filter(shown);
    const cards = all.filter((e) => kindOf(e) === 'card' && !e.parentElement.closest('*') === false).filter((e) => { for (let n = e.parentElement; n && n !== band; n = n.parentElement) if (kindOf(n) === 'card') return false; return true; });
    const text = textOf(band);
    if (/[$€£]\s?\d.*(mo|month|yr|year)/i.test(text) && cards.length >= 2) return `pricing (${cards.length} plans)`;
    if (band.querySelector('details, [aria-expanded]') && (text.match(/\?/g) || []).length >= 3) return 'questions and answers (FAQ)';
    if (band.querySelector('blockquote, q') || /testimonial|review/i.test(band.className)) return 'testimonials';
    if (band.querySelector('form, input:not([type=hidden])')) return 'form';
    if (cards.length >= 2) return `cards section (${cards.length} cards)`;
    const imgs = all.filter((e) => /^(IMG|svg)$/i.test(e.tagName) && e.getBoundingClientRect().height <= 80);
    if (imgs.length >= 4 && wordCount(band) < 20) return 'logo strip';
    const btns = all.filter((e) => kindOf(e) === 'button');
    if (btns.length && wordCount(band) <= 20) return 'call-to-action band';
    if (all.some((e) => /^(IMG|VIDEO|PICTURE)$/.test(e.tagName) && e.getBoundingClientRect().width >= band.getBoundingClientRect().width * 0.35)) return 'text with a large picture';
    return 'text section';
  }

  function textSample(el, max = 40) {
    const t = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
    if (!t) return '';
    if (t.length <= max) return `"${t}"`;
    const words = t.split(' ');
    return `"${words.slice(0, 6).join(' ')}…" (${words.length} words)`;
  }

  /** The color text is painted in: a gradient when the text is gradient-filled. */
  function textPaint(cs) {
    const clip = cs.backgroundClip || cs.webkitBackgroundClip || '';
    if (/text/.test(clip) && cs.backgroundImage.includes('gradient')) return `gradient text ${hexify(cs.backgroundImage)}`;
    return normColor(cs.color) || cs.color;
  }

  /** Everything painted behind an element's own box: color, gradients, picture, blur. */
  function paintOf(el, cs = getComputedStyle(el)) {
    const out = [];
    const bg = normColor(cs.backgroundColor);
    const clipText = /text/.test(cs.backgroundClip || cs.webkitBackgroundClip || '');
    if (!clipText) {
      for (const layer of cs.backgroundImage === 'none' ? [] : splitTop(cs.backgroundImage)) {
        if (layer.includes('gradient')) out.push(hexify(layer));
        else if (layer.startsWith('url(')) out.push(`picture (${cs.backgroundSize === 'cover' ? 'covers the area' : cs.backgroundSize})`);
      }
    }
    if (bg) out.push(bg);
    const blur = (cs.backdropFilter || cs.webkitBackdropFilter || '').match(/blur\(([^)]+)\)/);
    if (blur) out.push(`see-through with ${blur[1]} blur behind`);
    return out;
  }
  /** Split a comma list at the top level (gradients contain commas). */
  function splitTop(v) {
    const out = []; let depth = 0, cur = '';
    for (const ch of v) {
      if (ch === '(') depth++; else if (ch === ')') depth--;
      if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }

  // Layout only (formats): no font families, weights or colors, just how things are arranged and sized.
  let bareMode = false;

  function boxWords(cs) {
    const out = [];
    const pad = [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map(pxv);
    if (pad.some((p) => p !== '0px')) out.push(`padding ${pad[0] === pad[2] && pad[1] === pad[3] ? (pad[0] === pad[1] ? pad[0] : `${pad[0]} ${pad[1]}`) : pad.join(' ')}`);
    if (px(cs.borderTopLeftRadius) > 0) out.push(`radius ${cs.borderTopLeftRadius === '9999px' || px(cs.borderTopLeftRadius) > 500 ? 'full (pill)' : pxv(cs.borderTopLeftRadius)}`);
    const sides = ['Top', 'Right', 'Bottom', 'Left'].filter((s) => px(cs[`border${s}Width`]) > 0 && cs[`border${s}Style`] !== 'none' && normColor(cs[`border${s}Color`]));
    if (sides.length) out.push(`border ${sides.length === 4 ? '' : `(${sides.join('/').toLowerCase()}) `}${pxv(cs[`border${sides[0]}Width`])}${bareMode ? '' : ` ${cs[`border${sides[0]}Style`]} ${normColor(cs[`border${sides[0]}Color`]) || ''}`}`.trim());
    if (cs.boxShadow !== 'none') out.push(bareMode ? 'raised (shadow)' : `shadow ${hexify(cs.boxShadow)}`);
    return out;
  }

  function fontWordsShort(cs) {
    if (bareMode) return `text size ${pxv(cs.fontSize)}`; // the size sets the hierarchy; the font itself is not part of a format
    const fam = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim();
    return `${fam} ${pxv(cs.fontSize)}, weight ${cs.fontWeight}${cs.textTransform === 'uppercase' ? ', uppercase' : ''}${px(cs.letterSpacing) ? `, letter-spacing ${cs.letterSpacing}` : ''}, ${textPaint(cs)}`;
  }

  /** How a container arranges its children, in words + numbers. */
  function arrangeWords(el, cs, kids) {
    const out = [];
    const gap = cs.gap && cs.gap !== 'normal' && cs.gap !== '0px' ? cs.gap.split(' ')[0] : '';
    if (cs.display.includes('grid')) {
      const cols = cs.gridTemplateColumns.split(' ').filter(Boolean);
      const w = cols.map(px);
      const equal = w.every((v) => Math.abs(v - w[0]) <= 1.5);
      out.push(`grid, ${cols.length} ${equal && cols.length > 1 ? 'equal ' : ''}column${cols.length > 1 ? 's' : ''}${equal ? '' : ` (${w.map((v) => `${r0(v)}px`).join(' ')})`}${gap ? `, gap ${gap}` : ''}`);
    } else if (cs.display.includes('flex')) {
      const row = !cs.flexDirection.startsWith('column');
      const just = { 'space-between': 'spread to both ends', center: 'centered', 'flex-end': 'pushed to the end', end: 'pushed to the end', 'space-around': 'spaced evenly', 'space-evenly': 'spaced evenly' }[cs.justifyContent];
      out.push(`${row ? 'in a row' : 'stacked'}${just ? `, ${just}` : ''}${row && cs.alignItems === 'center' ? ', vertically centered' : !row && cs.alignItems === 'center' ? ', centered' : ''}${gap ? `, gap ${gap}` : ''}${cs.flexWrap === 'wrap' ? ', wraps' : ''}`);
      if (row && kids.length >= 2 && kids.length <= 4) {
        const pr = el.getBoundingClientRect();
        const where = kids.map((k) => { const r = k.getBoundingClientRect(); const c = (r.left + r.width / 2 - pr.left) / pr.width; return c < 0.34 ? 'left' : c > 0.66 ? 'right' : 'middle'; });
        if (new Set(where).size > 1) out.push(`positions: ${where.join(', ')}`);
      }
    } else if (kids.length > 1) out.push('stacked');
    if (cs.textAlign === 'center') out.push('text centered');
    return out;
  }

  function sizeWords(el, cs, lean = false) {
    const r = el.getBoundingClientRect();
    const docW = document.documentElement.clientWidth;
    const out = [];
    const pcs = el.parentElement ? getComputedStyle(el.parentElement) : null;
    const flowChild = pcs && /flex|grid/.test(pcs.display); // its width comes from the parent's layout
    if (r.width >= docW * 0.97) out.push('full width');
    else if (cs.maxWidth !== 'none') out.push(`max-width ${cs.maxWidth}${px(cs.marginLeft) > 0 && Math.abs(px(cs.marginLeft) - px(cs.marginRight)) < 2 ? ', centered' : ''}`);
    else if (!(lean && flowChild)) out.push(`${r0(r.width)}px wide`);
    if (px(cs.minHeight) >= 200 || /vh/.test(el.style.minHeight)) out.push(`min-height ${cs.minHeight}`);
    if (cs.position === 'sticky' || cs.position === 'fixed') out.push(`${cs.position === 'fixed' ? 'fixed' : 'sticky'} at the ${px(cs.top) <= 1 || cs.top === 'auto' ? 'top' : `top + ${cs.top}`} (stays while scrolling)`);
    return out;
  }

  const isInline = (k) => /^inline/.test(getComputedStyle(k).display) && !['IMG', 'SVG', 'BUTTON', 'INPUT', 'SELECT', 'VIDEO', 'CANVAS'].includes(k.tagName.toUpperCase());

  /** One line for a leaf (something you see, not a box of other things). */
  function leafLine(el, cs, kind, inNav, same = []) {
    const r = el.getBoundingClientRect();
    // Look-alike siblings: name each one's text (e.g. every menu link), then their shared style.
    const list = same.length > 1 ? same : [el];
    const plural = (w) => (list.length > 1 && /(link|title|tag|label|action)$/.test(w) ? `${w}s` : w);
    const purpose = (k) => (textOf(el) ? `${plural(purposeOf(el, k))}, ${wordsLabel(list)}` : plural(purposeOf(el, k)));
    const icon = [...el.children].find((k) => /^(svg|img)$/i.test(k.tagName) && k.getBoundingClientRect().width <= 64);
    const iconWords = icon && (el.innerText || '').trim() ? `, with a ${r0(icon.getBoundingClientRect().width)}×${r0(icon.getBoundingClientRect().height)} ${inNav && !el.previousElementSibling ? 'logo mark' : 'icon'} ${icon.compareDocumentPosition(el.lastChild) & Node.DOCUMENT_POSITION_FOLLOWING || icon === el.firstElementChild ? 'before' : 'after'} the text` : '';
    if (kind === 'image') {
      const what = el.tagName === 'VIDEO' ? 'video' : el.tagName === 'CANVAS' ? 'canvas (drawn graphic)' : (r.width <= 48 && r.height <= 48) ? 'icon' : inNav && r.height <= 64 ? 'logo' : el.tagName.toLowerCase() === 'svg' ? 'illustration (svg)' : 'image';
      return `${what} ${r0(r.width)}×${r0(r.height)}${px(cs.borderTopLeftRadius) ? `, radius ${pxv(cs.borderTopLeftRadius)}` : ''}${cs.objectFit && cs.objectFit !== 'fill' ? `, ${cs.objectFit}` : ''}`;
    }
    if (kind === 'button') {
      const fill = paintOf(el, cs);
      const look = fill.length ? (bareMode ? 'filled' : `filled ${fill.join(' + ')}`) : px(cs.borderTopWidth) > 0 ? 'outlined' : 'text only';
      return `button${same.length > 1 ? ` ×${same.length}` : ''}: ${purpose('button')} — ${look}; ${fontWordsShort(cs)}; ${boxWords(cs).join(', ')}`;
    }
    if (kind === 'input') return `input box ${r0(r.width)}×${r0(r.height)} — ${[...(bareMode ? [] : paintOf(el, cs)), ...boxWords(cs)].join(', ')}`;
    if (kind === 'badge') return `badge: ${purpose('badge')} — ${bareMode ? 'filled' : paintOf(el, cs).join(' + ')}; ${fontWordsShort(cs)}; ${boxWords(cs).join(', ')}`;
    const logo = inNav && icon && !el.previousElementSibling && /^(A)$/.test(el.tagName);
    const name = logo ? 'logo' : kind === 'heading' ? `heading (${el.tagName.toLowerCase()})` : kind === 'nav link' ? 'menu link' : kind === 'link' ? 'link' : el.tagName === 'LI' ? 'list item' : 'text';
    const extra = cs.maxWidth !== 'none' ? `, max-width ${cs.maxWidth}` : '';
    const deco = cs.textDecorationLine !== 'none' && !/^(A)$/.test(el.tagName) ? `, ${cs.textDecorationLine}` : '';
    const job = logo ? (textOf(el) ? `picture + brand name, ${wordsLabel(list)}` : 'picture only') : purpose(kind === 'container' ? 'text' : kind);
    return `${name}${same.length > 1 ? ` ×${same.length}` : ''}: ${job} — ${fontWordsShort(cs)}${extra}${deco}${iconWords}`;
  }

  const LEAF_KINDS = new Set(['heading', 'text', 'link', 'nav link', 'button', 'image', 'input', 'badge']);

  /**
   * An indented outline of what is inside `root`: each box, how it arranges its children, sizes,
   * colors and type. Look-alike siblings are folded into one ("card ×3").
   */
  function outline(root, { maxDepth = 7, maxLines = 70, lean = false, bare = false } = {}) {
    const prevBare = bareMode;
    bareMode = bare;
    try { return outlineNow(root, maxDepth, maxLines, lean); } finally { bareMode = prevBare; }
  }
  function outlineNow(root, maxDepth, maxLines, lean) {
    const lines = [];
    const inNavRoot = !!root.closest?.('nav, header, [role=banner]') || root.tagName === 'NAV';
    const sig = (el) => `${el.tagName}|${kindOf(el)}|${kidsOf(el).length}|${[...el.classList].slice(0, 2).join('.')}`;
    const walk = (el, depth, count = 1, group = [el]) => {
      if (lines.length >= maxLines) return;
      const cs = getComputedStyle(el);
      const kind = kindOf(el, cs);
      let kids = kidsOf(el);
      const inNav = inNavRoot || !!el.closest('nav, header');
      const pad = '  '.repeat(depth);
      const times = count > 1 ? ` ×${count}` : '';
      // Text with inline bits (a <strong>, a split heading, a small icon) is one line of text.
      const smallPic = (k) => /^(svg|img)$/i.test(k.tagName) && k.getBoundingClientRect().width <= 64;
      const textLeaf = kids.every((k) => isInline(k) || smallPic(k)) && (el.innerText || '').trim();
      const leafGroup = count > 1 ? group : [];
      if (LEAF_KINDS.has(kind) && (textLeaf || !kids.length || kind === 'button' || kind === 'image' || kind === 'input')) {
        lines.push(`${pad}- ${leafLine(el, cs, kind, inNav, leafGroup)}${leafGroup.length ? '' : times}`);
        return;
      }
      if (!kids.length) {
        if (textLeaf) lines.push(`${pad}- ${leafLine(el, cs, 'text', inNav, leafGroup)}${leafGroup.length ? '' : times}`);
        else { const p = paintOf(el, cs); if (p.length) lines.push(`${pad}- decoration ${r0(el.getBoundingClientRect().width)}×${r0(el.getBoundingClientRect().height)}${bareMode ? ' (a colored shape behind the content)' : ` — ${p.join(' + ')}${cs.filter !== 'none' ? `, ${cs.filter}` : ''}`}`); }
        return;
      }
      if (textLeaf) { lines.push(`${pad}- ${leafLine(el, cs, /^(A)$/.test(el.tagName) ? (inNav ? 'nav link' : 'link') : 'text', inNav, leafGroup)}${leafGroup.length ? '' : times}`); return; }
      const own = [...(bareMode ? (paintOf(el, cs).length ? ['own background'] : []) : paintOf(el, cs)), ...boxWords(cs)];
      // A plain wrapper around one thing adds nothing: describe the thing.
      if (kids.length === 1 && !own.length && cs.maxWidth === 'none' && el !== root && !/^(NAV|HEADER|FOOTER|SECTION|UL|OL)$/.test(el.tagName)) { walk(kids[0], depth, count, group.map((g) => kidsOf(g)[0] || g)); return; }
      const noun = { nav: 'menu', header: 'header', footer: 'footer', card: 'card', section: 'section' }[kind] || (el.tagName === 'UL' || el.tagName === 'OL' ? 'list' : 'box');
      const bits = [...arrangeWords(el, cs, kids), ...sizeWords(el, cs, lean), ...own];
      lines.push(`${pad}- ${noun}${times}${bits.length ? ` — ${bits.join('; ')}` : ''}`);
      if (depth >= maxDepth) { lines.push(`${pad}  - … (${kids.length} more inside)`); return; }
      for (let i = 0; i < kids.length;) {
        let j = i + 1;
        while (j < kids.length && sig(kids[j]) === sig(kids[i])) j++;
        walk(kids[i], depth + 1, j - i, kids.slice(i, j));
        i = j;
      }
    };
    walk(root, 0);
    if (lines.length >= maxLines) lines.push('- … (shortened)');
    return lines.join('\n');
  }

  function structureItem(el, title = 'Structure') {
    const kids = kidsOf(el).length;
    let extra = '';
    if (el.getBoundingClientRect().height >= 120) {
      try { extra = `\n\n${spacingFacts(el)}\n\nColor relationships (keep these even in other colors):\n${colorRelations(el).join('\n')}`; }
      catch (err) { console.debug('[PromptLift] spacing/color relationships failed', err); }
    }
    try { extra = `\n\n${positionFacts(el)}${extra}`; } catch (err) { console.debug('[PromptLift] position facts failed', err); }
    return mk({ target: reg(el), rect: rectOf(el), group: GROUPS.layout, type: 'structure', title, desc: 'What is inside, in what order, and how it is laid out, and where it sits.', tech: '', context: `${kids} part${kids === 1 ? '' : 's'} inside`, code: outline(el, { bare: true }) + extra, preview: { kind: 'none' } });
  }

  // ---------- navigation bar ----------

  function navRootFor(el) {
    if (!el) return null;
    const own = el.matches('header, nav, [role=banner], [role=navigation]') ? el : el.querySelector?.('header, nav, [role=banner], [role=navigation]');
    if (!own) return null;
    const top = own.closest('header, [role=banner]') || own;
    const r = top.getBoundingClientRect();
    return r.height <= 220 ? top : own;
  }

  function navItem(nav) {
    const cs = getComputedStyle(nav);
    const r = nav.getBoundingClientRect();
    const facts = [];
    facts.push(`Bar: ${r0(r.height)}px tall; ${sizeWords(nav, cs).join('; ')}${cs.position === 'absolute' ? '; laid over the top of the first section' : ''}`);
    const paint = paintOf(nav, cs);
    facts.push(`Background: ${paint.length ? paint.join(' + ') : 'none (see-through, shows what is behind it)'}${boxWords(cs).length ? `; ${boxWords(cs).join(', ')}` : ''}`);
    if (/background|backdrop|box-shadow|all/.test(cs.transitionProperty) && cs.transitionDuration !== '0s') facts.push(`Changes smoothly (${cs.transitionProperty} ${cs.transitionDuration}), likely when you scroll`);
    const links = [...nav.querySelectorAll('a, button')].filter(shown);
    const isLogo = (a) => !!a.querySelector('img, svg') && a === links[0];
    const textLinks = links.filter((a) => !isLogo(a) && /link/.test(kindOf(a)));
    // The menu's links share one style; other links (like "Sign in") are listed separately.
    const styleKey = (a) => fontWordsShort(getComputedStyle(a));
    const byStyle = new Map();
    for (const a of textLinks) bump(byStyle, styleKey(a));
    const mainStyle = topBy(byStyle, 1)[0];
    const menu = textLinks.filter((a) => styleKey(a) === mainStyle);
    const others = textLinks.filter((a) => styleKey(a) !== mainStyle);
    const buttons = links.filter((a) => kindOf(a) === 'button');
    if (links[0] && isLogo(links[0])) facts.push(`Logo: first, ${textOf(links[0]) ? 'picture + brand name' : 'picture only'}`);
    if (menu.length) facts.push(`Menu links: ${menu.length} page links, ${wordsLabel(menu)}; ${mainStyle}`);
    for (const a of others) facts.push(`Also a ${purposeOf(a, kindOf(a))} link (${styleKey(a)})`);
    if (buttons.length) facts.push(`Buttons: ${buttons.map((b) => `${purposeOf(b, 'button')} (${wordsLabel([b])})`).join(', ')}`);
    const ord = (i) => `${i + 1}${['st', 'nd', 'rd'][i] || 'th'}`;
    const drop = menu.map((a, i) => (a.getAttribute('aria-haspopup') || a.hasAttribute('aria-expanded') || a.lastElementChild?.tagName.toLowerCase() === 'svg' ? ord(i) : null)).filter(Boolean);
    if (drop.length) facts.push(`The ${drop.join(' and ')} menu link${drop.length > 1 ? 's open dropdowns' : ' opens a dropdown'}`);
    const burger = [...nav.querySelectorAll('button, [role=button], a')].find((b) => getComputedStyle(b).display === 'none' && /menu|burger|toggle|nav/i.test(`${b.getAttribute('aria-label') || ''} ${b.className || ''}`));
    if (burger) facts.push('Small screens: a menu button replaces the links (hidden at this width)');
    return mk({ target: reg(nav), rect: rectOf(nav), group: GROUPS.layout, type: 'navigation', title: 'Navigation bar', desc: 'Where everything sits, its size, look and behavior.', tech: '', context: '', code: `${facts.join('\n')}\n\nStructure:\n${outline(nav, { maxDepth: 6, maxLines: 40, bare: true })}`, preview: { kind: 'none' } });
  }

  // ---------- the page, section by section ----------

  /** The page's full-width bands from top to bottom (header, hero, sections, footer). */
  function pageBands() {
    const docW = document.documentElement.clientWidth;
    // Full-screen fixed layers (menu backdrops, chat and feedback widgets) sit over the page: not sections.
    const overlay = (k) => { const cs = getComputedStyle(k); return cs.position === 'fixed' && k.getBoundingClientRect().height >= innerHeight * 0.6; };
    const wide = (k) => { const r = k.getBoundingClientRect(); return r.width >= docW * 0.8 && r.height >= 40 && !overlay(k); };
    const hasPaint = (k) => paintOf(k).length > 0;
    const out = [];
    const walk = (el, d) => {
      for (const k of kidsOf(el).filter(wide)) {
        const inner = kidsOf(k).filter(wide);
        const tall = k.getBoundingClientRect().height > innerHeight * 1.2;
        // Descend through wrappers. A painted wrapper (e.g. a dark page shell) that holds several
        // tall sections is a backdrop, not one section: its sections are what we list.
        // A wrapper with one child of (almost) the same size is just a wrapper, painted or not
        // (app frameworks nest ten of them around the real sections).
        const kr = k.getBoundingClientRect();
        const sameAsChild = inner.length === 1 && inner[0].getBoundingClientRect().height >= kr.height * 0.9;
        if (d < 14 && ((!hasPaint(k) && (inner.length === 1 || (inner.length >= 2 && tall))) || sameAsChild || (hasPaint(k) && inner.length >= 2 && kr.height > innerHeight * 1.5))) walk(k, d + 1);
        else out.push(k);
      }
    };
    walk(document.body, 0);
    const top = (e) => e.getBoundingClientRect().top + scrollY;
    return out.sort((a, b) => top(a) - top(b));
  }

  /** The page background behind everything (html/body), which bands without their own show. */
  function pageBackground() {
    const parts = [...paintOf(document.documentElement), ...paintOf(document.body)];
    return parts.length ? parts : ['none set (browser white shows only where a section has no background of its own)'];
  }

  function bump(map, key, w = 1) { if (key) map.set(key, (map.get(key) || 0) + w); }
  const topBy = (map, n) => [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);

  /** The colors used inside one band: headings, text, links, buttons, cards, glows. */
  function bandColors(band) {
    const heads = new Map(), text = new Map(), links = new Map(), btns = new Map(), cards = new Map(), glows = [];
    const all = [band, ...band.querySelectorAll('*')].filter(shown).slice(0, 800);
    const br = band.getBoundingClientRect();
    for (const el of all) {
      const cs = getComputedStyle(el);
      const kind = kindOf(el, cs);
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (kind === 'heading') bump(heads, textPaint(cs), 1);
      else if (kind === 'button') bump(btns, `${paintOf(el, cs).join(' + ') || 'no fill'} with ${textPaint(cs)} text${px(cs.borderTopWidth) && normColor(cs.borderTopColor) ? `, border ${normColor(cs.borderTopColor)}` : ''}`);
      else if (kind === 'link' || kind === 'nav link') bump(links, textPaint(cs));
      else if (kind === 'card') bump(cards, `${paintOf(el, cs).join(' + ') || 'no fill'}${px(cs.borderTopWidth) && normColor(cs.borderTopColor) ? `, border ${normColor(cs.borderTopColor)}` : ''}`);
      else if (own && !el.closest('h1,h2,h3,h4,h5,h6,a,button')) bump(text, textPaint(cs), (el.textContent || '').trim().length);
      if (el !== band && (cs.position === 'absolute' || cs.position === 'fixed') && !own) {
        const r = el.getBoundingClientRect();
        const p = paintOf(el, cs);
        if (p.length && r.width * r.height >= br.width * br.height * 0.05 && glows.length < 3) glows.push(`${p.join(' + ')}${cs.filter !== 'none' ? ` (${cs.filter})` : ''}${cs.opacity !== '1' ? `, opacity ${cs.opacity}` : ''}`);
      }
      if (el !== band && (el.tagName === 'VIDEO' || el.tagName === 'IMG' || el.tagName === 'CANVAS')) {
        const r = el.getBoundingClientRect();
        if (r.width * r.height >= br.width * br.height * 0.6 && glows.length < 3) glows.push(`full-size ${el.tagName === 'VIDEO' ? 'video' : el.tagName === 'CANVAS' ? 'animated canvas' : 'photo'} behind the content`);
      }
    }
    return { heads: topBy(heads, 2), text: topBy(text, 2), links: topBy(links, 2), btns: topBy(btns, 2), cards: topBy(cards, 2), glows };
  }

  function bandName(band, i, bands) {
    const kind = kindOf(band);
    if (kind === 'header' || kind === 'nav' || band.querySelector(':scope > nav') && band.getBoundingClientRect().height < 200) return 'Navigation bar';
    if (kind === 'footer') return 'Footer';
    const firstContent = bands.findIndex((b) => !/^(Navigation bar)$/.test(bandName(b, 0, [])) && kindOf(b) !== 'header');
    if (i === firstContent) return 'Hero (first section)';
    return `Section: ${sectionPurpose(band)}`;
  }

  /** The color scheme as it actually runs down the page, band by band. */
  function colorJourney() {
    const bands = pageBands();
    const lines = [`Page background (behind everything): ${pageBackground().join(' + ')}`];
    const swatches = [];
    let n = 0;
    for (const [i, band] of bands.entries()) {
      if (n >= 14) { lines.push(`… and ${bands.length - n} more sections`); break; }
      n++;
      const r = band.getBoundingClientRect();
      const own = paintOf(band);
      const top = r0(r.top + scrollY);
      lines.push('');
      lines.push(`${n}. ${bandName(band, i, bands)} (${top}–${top + r0(r.height)}px)`);
      lines.push(colorReport(band, '   '));
      const sw = own.find((p) => /^#|^rgba/.test(p)) || (own[0] || '').match(/#[0-9a-f]{6}/i)?.[0];
      if (sw) swatches.push(sw);
    }
    const grads = (lines.join('\n').match(/gradient\(/g) || []).length;
    const desc = `${bands.length} sections from top to bottom${grads ? `, ${grads} gradient${grads > 1 ? 's' : ''}` : ''}, each with its own colors.`;
    return { code: lines.join('\n'), desc, swatches: [...new Set(swatches)].slice(0, 5) };
  }

  function dominantBandBg() {
    const byHeight = new Map();
    for (const b of pageBands()) { const c = normColor(getComputedStyle(b).backgroundColor); if (c) bump(byHeight, c, b.getBoundingClientRect().height); }
    return topBy(byHeight, 1)[0] || null;
  }

  function pageStructure() {
    const bands = pageBands();
    const lines = [];
    for (const [i, band] of bands.slice(0, 14).entries()) {
      const r = band.getBoundingClientRect();
      lines.push(`${i + 1}. ${bandName(band, i, bands)} — ${r0(r.height)}px tall`);
      lines.push(outline(band, { maxDepth: 3, maxLines: 14 }).split('\n').map((l) => `   ${l}`).join('\n'));
    }
    return lines.join('\n');
  }


  // ---------- showing a hover / press effect on the page (v8.2) ----------

  /**
   * Show a CSS state (hover, press) on the real element: its :hover declarations are applied inline
   * (so its own transition plays), held, then removed (so it plays back). Returns false if gone.
   * `still`: apply without transition and keep it until `restore` is called (for a picture of the state).
   */
  function playState(ref, css, { hold = 900, still = false } = {}) {
    const el = globalThis.__plTargets?.get(ref)?.deref();
    if (!el || !el.isConnected) return false;
    // Overlapping plays (replay loop, Play, pointing at the card) all go back to the TRUE original.
    if (!('__plOrig' in el)) el.__plOrig = el.getAttribute('style');
    el.__plPlays = (el.__plPlays || 0) + 1;
    el.setAttribute('data-pl-own', ''); // the recorder ignores the transitions this causes
    const decls = css.split(';').map((d) => d.trim()).filter(Boolean).map((d) => { const i = d.indexOf(':'); return [d.slice(0, i).trim(), d.slice(i + 1).replace(/!important/, '').trim()]; });
    if (still) el.style.transition = 'none';
    for (const [prop, val] of decls) if (prop && val) el.style.setProperty(prop, val, 'important');
    if (still) return true; // kept until restoreState()
    setTimeout(() => {
      for (const [prop] of decls) el.style.removeProperty(prop);
      setTimeout(() => endPlay(el), 600);
    }, hold);
    return true;
  }
  function endPlay(el) {
    el.__plPlays = Math.max(0, (el.__plPlays || 1) - 1);
    if (el.__plPlays) return;
    const orig = el.__plOrig;
    delete el.__plOrig;
    if (orig === null || orig === undefined) el.removeAttribute('style'); else el.setAttribute('style', orig);
    // Keep the mark until the play-back transition has finished, then the element is the page's again.
    setTimeout(() => { if (!el.__plPlays) el.removeAttribute('data-pl-own'); }, 1200);
  }
  function restoreState(ref) {
    const el = globalThis.__plTargets?.get(ref)?.deref();
    if (el && '__plOrig' in el) endPlay(el);
  }

  // ---------- scroll behavior (v8) ----------
  // Measured by scrolling the page a little and back: what stays put, what moves slower or
  // sideways, what fades/moves in, and which colors change. Scroll reveals that fire meanwhile
  // are caught by the recorder too. The page is put back where it was.

  const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
  async function settleScroll(y) {
    window.scrollTo({ top: y, left: scrollX, behavior: 'instant' });
    await frame(); await frame();
    await new Promise((r) => setTimeout(r, 70));
  }

  const SNAP_PROPS = ['opacity', 'transform', 'backgroundColor', 'color', 'boxShadow', 'height', 'width', 'backgroundImage', 'filter'];
  function snap(el) {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    // Where its box sits without its own transform, so "moves into place" isn't mistaken for parallax.
    const m = cs.transform.match(/matrix\(([^)]+)\)/);
    const [tx, ty] = m ? m[1].split(',').slice(4).map(Number) : [0, 0];
    const o = { top: r.top - ty, left: r.left - tx, w: r.width, h: r.height, ty, tx };
    for (const p of SNAP_PROPS) o[p] = cs[p];
    return o;
  }

  function nounFor(el) {
    const k = kindOf(el);
    if (k === 'heading') return purposeOf(el, 'heading');
    if (k === 'text') return purposeOf(el, 'text');
    if (k === 'button') return `button (${purposeOf(el, 'button')})`;
    return ROLE_NOUN[k] === 'element' ? (el.tagName === 'IMG' ? 'picture' : 'block') : ROLE_NOUN[k] || 'block';
  }

  /** Words for how one thing behaved over the samples (positions vs. how far the page scrolled). */
  function behaviorOf(samples, ys) {
    const out = [];
    const n = samples.length;
    const scroll = ys[n - 1] - ys[0];
    if (Math.abs(scroll) < 50) return out;
    const moved = samples[n - 1].top - samples[0].top;      // a normal element moves by -scroll
    const rate = -moved / scroll;                              // 1 = scrolls with the page
    const dx = samples[n - 1].left - samples[0].left;
    const pinnedRuns = [];
    for (let i = 1; i < n; i++) if (Math.abs(samples[i].top - samples[i - 1].top) < 2 && ys[i] - ys[i - 1] > 20) pinnedRuns.push(i);
    if (pinnedRuns.length === n - 1) out.push('stays in the same place on screen while you scroll');
    else if (pinnedRuns.length >= 2) out.push(`sticks in place for about ${r0(pinnedRuns.length * (scroll / (n - 1)))}px of scrolling, then moves on`);
    else if (rate > 0.05 && rate < 0.92) out.push(`moves slower than the page (${Math.round(rate * 100)}% of the scroll speed, parallax)`);
    else if (rate > 1.08) out.push(`moves faster than the page (${Math.round(rate * 100)}% of the scroll speed)`);
    if (Math.abs(dx) >= 20) out.push(`moves ${dx < 0 ? 'left' : 'right'} by ${r0(Math.abs(dx))}px over ${r0(scroll)}px of scrolling`);
    // A reveal: faded/moved out at first, in place at the end.
    const o0 = Number(samples[0].opacity), o1 = Number(samples[n - 1].opacity);
    const ty0 = samples[0].ty, ty1 = samples[n - 1].ty, tx0 = samples[0].tx, tx1 = samples[n - 1].tx;
    const fades = o0 < 0.2 && o1 > 0.8;
    const slides = Math.abs(ty0 - ty1) >= 4 ? (ty0 > ty1 ? `moves up ${r0(ty0 - ty1)}px` : `moves down ${r0(ty1 - ty0)}px`) : Math.abs(tx0 - tx1) >= 4 ? `slides ${tx0 > tx1 ? 'left' : 'right'} ${r0(Math.abs(tx0 - tx1))}px` : '';
    const at = (p) => { const vals = samples.map((s) => s[p]); const i = vals.findIndex((v) => v !== vals[0]); return i > 0 ? ys[i] - ys[0] : 0; };
    if (fades || slides) out.push(`${[fades && 'fades in', slides && `${slides} into place`].filter(Boolean).join(' and ')} when you scroll to it, starting about ${r0(at(fades ? 'opacity' : 'transform'))}px into the scroll`);
    for (const p of SNAP_PROPS) {
      if ((fades && p === 'opacity') || (slides && p === 'transform')) continue;
      if (p === 'height' || p === 'width') {
        const a = px(samples[0][p]), b = px(samples[n - 1][p]);
        if (Math.abs(a - b) >= 6) out.push(`${p} goes from ${r0(a)}px to ${r0(b)}px`);
        continue;
      }
      const vals = samples.map((s) => s[p]);
      const first = vals[0], last = vals[n - 1];
      if (new Set(vals).size <= 1) continue;
      const at = ys[vals.findIndex((v) => v !== first)] - ys[0];
      const word = { opacity: 'opacity', transform: 'position/size (transform)', backgroundColor: 'background', color: 'text color', boxShadow: 'shadow', backgroundImage: 'background', filter: 'filter' }[p];
      const show = (v) => (p === 'opacity' ? v : hexify(v));
      out.push(`${word} changes from ${show(first)} to ${show(last)}, starting about ${r0(at)}px into the scroll`);
    }
    return out;
  }

  /** Scroll through `ys` positions, snapshotting `els` at each; always scrolls back. */
  async function sampleScroll(els, ys) {
    const y0 = scrollY;
    const samples = els.map(() => []);
    // Where to put the page back. Aborting (see the panel) puts it back right away, so a person who
    // moved on and scrolls somewhere else is not yanked back later.
    globalThis.__plScrollStart = y0;
    try {
      globalThis.__plScrollAbort = false;
      for (const [k, y] of ys.entries()) {
        if (globalThis.__plScrollAbort) break; // the person moved on: stop and put the page back
        await settleScroll(y);
        // At the start, let things that just left the screen finish hiding (reveals that reset).
        if (k === 0) await new Promise((r) => setTimeout(r, 700));
        els.forEach((el, i) => samples[i].push(snap(el)));
      }
      // Let reveals that just started finish, then take the end state at the same spot.
      if (!globalThis.__plScrollAbort) {
        await new Promise((r) => setTimeout(r, 900));
        els.forEach((el, i) => { if (samples[i].length) samples[i][samples[i].length - 1] = snap(el); });
      }
    } finally {
      if (!globalThis.__plScrollAbort) await settleScroll(y0);
      globalThis.__plScrollStart = null;
    }
    return samples;
  }

  /** One element: does it behave differently when the page scrolls? */
  async function elementScroll(el) {
    const max = document.documentElement.scrollHeight - innerHeight;
    if (max < 100) return { facts: [] };
    // Scroll from just before it enters the screen until it has passed (at least 600px).
    const top = el.getBoundingClientRect().top + scrollY, h = el.getBoundingClientRect().height;
    const from = Math.max(0, Math.min(top - innerHeight * 0.9, max - 600));
    const to = Math.min(max, Math.max(from + 600, top + h));
    const ys = [0, 1, 2, 3, 4, 5, 6].map((i) => r0(from + ((to - from) * i) / 6)).filter((y, i, a) => i === 0 || y !== a[i - 1]);
    const [samples] = await sampleScroll([el], ys);
    const facts = behaviorOf(samples, ys);
    const cs = getComputedStyle(el);
    if ((cs.position === 'sticky' || cs.position === 'fixed') && !facts.some((f) => /same place|sticks/.test(f))) facts.unshift(`position ${cs.position}, top ${cs.top}`);
    return { facts, ys };
  }

  /** Is it worth measuring this element's scroll behavior right away? (cheap check) */
  // Only clear signs: checking scrolls the page, so it must not run for every hover-able card.
  function scrollHint(el) {
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.position === 'sticky' || cs.position === 'fixed') return true;
      if (n === el && (cs.willChange.includes('transform') || (cs.animationTimeline && cs.animationTimeline !== 'auto'))) return true;
    }
    return false;
  }

  /** Does anything in this section look like it reacts to scrolling? (cheap, no scrolling)
   *  Sticky/fixed parts, scroll-driven animations, fixed backgrounds, reveal libraries, or parts
   *  waiting hidden/shifted with a transition (typical scroll reveals). */
  function areaScrollHint(band) {
    if (scrollHint(band)) return true;
    const all = [band, ...band.querySelectorAll('*')].slice(0, 600);
    for (const n of all) {
      if (n.hasAttribute('data-aos') || n.hasAttribute('data-scroll') || n.hasAttribute('data-sal') || /\b(reveal|aos-|wow|fade-?in|scroll)/i.test(n.className?.baseVal ?? n.className ?? '')) return true;
      const cs = getComputedStyle(n);
      if (cs.position === 'sticky' || cs.position === 'fixed' || cs.backgroundAttachment === 'fixed') return true;
      if (cs.animationTimeline && cs.animationTimeline !== 'auto') return true;
      const waiting = parseFloat(cs.opacity) < 0.05 || (cs.transform !== 'none' && /translate|matrix/.test(cs.transform));
      if (waiting && cs.transitionDuration.split(',').some((d) => parseFloat(d) > 0)) return true;
    }
    return false;
  }

  /** A whole section: scroll through it and describe what happens as you go. */
  async function sectionScroll(band) {
    const max = document.documentElement.scrollHeight - innerHeight;
    const top = band.getBoundingClientRect().top + scrollY;
    const h = band.getBoundingClientRect().height;
    // At least 600px of scrolling, so a short sticky header at the very top is still put to the test.
    const from = Math.max(0, top - innerHeight), to = Math.min(max, Math.max(top + h, from + 600));
    if (to - from < 80) return { facts: [] };
    const steps = Math.min(10, Math.max(4, Math.round((to - from) / 250)));
    const ys = [...Array(steps + 1)].map((_, i) => r0(from + ((to - from) * i) / steps));
    // The parts worth following: visible boxes down to 3 levels that are big enough to notice.
    const parts = [];
    const br = band.getBoundingClientRect();
    const walk = (el, d) => {
      for (const k of kidsOf(el)) {
        const r = k.getBoundingClientRect();
        if (r.width * r.height >= br.width * br.height * 0.004 || /^(H1|H2|H3|IMG|VIDEO|BUTTON|A)$/.test(k.tagName)) parts.push(k);
        if (d < 3 && parts.length < 80) walk(k, d + 1);
      }
    };
    walk(band, 0);
    const els = [band, ...parts.slice(0, 80)];
    const samples = await sampleScroll(els, ys);
    const facts = [];
    const self = behaviorOf(samples[0], ys);
    const bcs = getComputedStyle(band);
    if ((bcs.position === 'sticky' || bcs.position === 'fixed') && !self.some((f) => /same place|sticks/.test(f))) self.unshift(`stays in the same place on screen while you scroll (position ${bcs.position}, top ${bcs.top})`);
    if (self.length) facts.push(`The section itself: ${self.join('; ')}`);
    // Report each distinct behavior once, saying which parts do it and in what order.
    const byBehavior = new Map();
    els.slice(1).forEach((el, i) => {
      for (const b of behaviorOf(samples[i + 1], ys)) {
        if (/^(position|transform)/.test(b) && byBehavior.size > 30) continue;
        const key = b.replace(/starting about \d+px into the scroll/, '').trim();
        const entry = byBehavior.get(key) || { text: b, who: [], at: [] };
        entry.who.push(nounFor(el));
        const m = b.match(/starting about (\d+)px/);
        entry.at.push(m ? Number(m[1]) : 0);
        byBehavior.set(key, entry);
      }
    });
    for (const { text, who, at } of [...byBehavior.values()].slice(0, 12)) {
      const names = [...new Set(who)];
      const order = at.length > 1 && new Set(at).size > 1 ? ', one after another as you scroll' : '';
      facts.push(`${who.length > 1 ? `${who.length} parts (${names.slice(0, 4).join(', ')})` : names[0]}: ${text.replace(/, starting about \d+px into the scroll/, '')}${order}`);
    }
    return { facts, ys, range: `measured from ${r0(from)}px to ${r0(to)}px of page scroll` };
  }

  // ---------- chosen sections (v7.4): full colors and format of the sections you pick ----------

  /** The section (full-width band) a clicked element belongs to. */
  function sectionOf(el) {
    const bands = pageBands();
    for (let n = el; n && n !== document.body; n = n.parentElement) if (bands.includes(n)) return n;
    // Not inside a detected band: the widest reasonable box around it.
    const docW = document.documentElement.clientWidth;
    let best = el;
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      const r = n.getBoundingClientRect();
      if (r.width >= docW * 0.6 && r.height >= 80) { best = n; if (r.width >= docW * 0.95) break; }
    }
    return best;
  }

  function sectionName(el) {
    const bands = pageBands();
    const i = bands.indexOf(el);
    return i >= 0 ? bandName(el, i, bands) : `Section: ${sectionPurpose(el)}`;
  }

  /** Paint of an element's ::before/::after layers (decorative gradients often live there). */
  function pseudoPaints(el) {
    const out = [];
    for (const which of ['::before', '::after']) {
      const cs = getComputedStyle(el, which);
      if (!cs || cs.content === 'none' || cs.content === 'normal' || cs.display === 'none') continue;
      const p = paintOf(el, cs);
      if (p.length) out.push(`${p.join(' + ')}${cs.filter !== 'none' ? ` (${cs.filter})` : ''}${cs.opacity !== '1' ? `, opacity ${cs.opacity}` : ''}${cs.mixBlendMode !== 'normal' ? `, blend ${cs.mixBlendMode}` : ''}`);
    }
    return out;
  }

  /** Where something sits inside the section, in words ("top left", "center"…). */
  function placeWords(el, band) {
    const b = band.getBoundingClientRect(), r = el.getBoundingClientRect();
    const x = (r.left + r.width / 2 - b.left) / b.width, y = (r.top + r.height / 2 - b.top) / b.height;
    const v = y < 0.34 ? 'top' : y > 0.66 ? 'bottom' : 'middle';
    const h = x < 0.34 ? 'left' : x > 0.66 ? 'right' : 'center';
    return v === 'middle' && h === 'center' ? 'center' : `${v} ${h}`;
  }

  /**
   * Every color in a section, by what it is used for: background (and what shows through it),
   * decorations (gradients, glows, ::before/::after layers), text by role, each button style,
   * cards, borders/dividers, icons and colored shadows.
   */
  function sectionColors(band) {
    const out = { background: [], decorations: [], text: new Map(), buttons: new Map(), cards: new Map(), lines: new Map(), icons: new Map(), shadows: new Map(), badges: new Map() };
    const own = paintOf(band);
    if (own.length) out.background.push(own.join(' + '));
    else {
      for (let n = band.parentElement; n; n = n.parentElement) { const p = paintOf(n); if (p.length) { out.background.push(`none of its own; shows ${p.join(' + ')} from behind`); break; } }
      if (!out.background.length) out.background.push('none (browser white)');
    }
    for (const p of pseudoPaints(band)) out.decorations.push(`layer over the whole section: ${p}`);
    const br = band.getBoundingClientRect();
    const all = [...band.querySelectorAll('*')].filter(shown).slice(0, 1500);
    const seenDeco = new Set();
    for (const el of all) {
      const cs = getComputedStyle(el);
      const kind = kindOf(el, cs);
      const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      const tag = el.tagName.toLowerCase();
      if (kind === 'button') {
        const fill = paintOf(el, cs).join(' + ') || 'no fill';
        bump(out.buttons, `${purposeOf(el, 'button')}: ${fill}, text ${textPaint(cs)}${px(cs.borderTopWidth) && normColor(cs.borderTopColor) ? `, border ${normColor(cs.borderTopColor)}` : ''}${cs.boxShadow !== 'none' ? `, shadow ${hexify(cs.boxShadow)}` : ''}`);
        continue;
      }
      if (kind === 'card') bump(out.cards, `${paintOf(el, cs).join(' + ') || 'no fill'}${px(cs.borderTopWidth) && normColor(cs.borderTopColor) ? `, border ${normColor(cs.borderTopColor)}` : ''}${cs.boxShadow !== 'none' ? `, shadow ${hexify(cs.boxShadow)}` : ''}`);
      else if (kind === 'badge') bump(out.badges, `${paintOf(el, cs).join(' + ')}, text ${textPaint(cs)}`);
      if (hasText && !el.closest('button, [role=button]')) {
        const role = kind === 'heading' ? purposeOf(el, 'heading') : /link/.test(kind) ? purposeOf(el, kind) : kind === 'badge' ? null : purposeOf(el, 'text');
        if (role) bump(out.text, `${role}: ${textPaint(cs)}`, (el.textContent || '').trim().length + 1);
      }
      // Decorations: painted things that are not text, buttons or cards (blobs, stripes, overlays).
      if (!hasText && kind !== 'card' && kind !== 'button' && el.children.length <= 2) {
        const p = paintOf(el, cs);
        const r = el.getBoundingClientRect();
        const big = r.width * r.height >= br.width * br.height * 0.01;
        if (p.length && big && !/^(svg|path|circle|rect)$/.test(tag)) {
          const d = `${p.join(' + ')}${cs.filter !== 'none' ? ` (${cs.filter})` : ''}${cs.opacity !== '1' ? `, opacity ${cs.opacity}` : ''} — ${r0(r.width)}×${r0(r.height)}, ${placeWords(el, band)}`;
          if (!seenDeco.has(p.join())) { seenDeco.add(p.join()); out.decorations.push(d); }
        }
      }
      for (const p of pseudoPaints(el)) if (!seenDeco.has(p)) { seenDeco.add(p); out.decorations.push(`layer on a ${ROLE_NOUN[kind] || 'box'}: ${p}`); }
      if (px(cs.borderTopWidth) > 0 && kind !== 'card' && kind !== 'button' && cs.borderTopStyle !== 'none') bump(out.lines, normColor(cs.borderTopColor));
      if (/^(hr)$/.test(tag)) bump(out.lines, normColor(cs.borderTopColor) || normColor(cs.backgroundColor));
      if (/^(svg)$/.test(tag)) {
        for (const s of el.querySelectorAll('path, circle, rect, polygon, line, ellipse')) {
          const sc = getComputedStyle(s);
          const f = sc.fill.startsWith('url') ? 'gradient fill' : normColor(sc.fill);
          const st = sc.stroke !== 'none' ? normColor(sc.stroke) : null;
          if (f) bump(out.icons, f); if (st) bump(out.icons, `${st} outline`);
        }
        for (const g of el.querySelectorAll('linearGradient, radialGradient')) bump(out.icons, `${g.tagName.replace('Gradient', ' gradient')}: ${[...g.querySelectorAll('stop')].map((s) => normColor(getComputedStyle(s).stopColor) || s.getAttribute('stop-color')).join(' → ')}`);
      }
      if (cs.boxShadow !== 'none' && kind !== 'button' && kind !== 'card') {
        const colored = (hexify(cs.boxShadow).match(/#[0-9a-f]{6}|rgba\([^)]+\)/gi) || []).filter((c) => !/^rgba\(0,0,0/.test(c) && c !== '#000000');
        if (colored.length) bump(out.shadows, hexify(cs.boxShadow));
      }
    }
    return out;
  }

  function colorReport(band, indent = '') {
    const c = sectionColors(band);
    const L = [];
    const list = (label, map, n = 8) => { const k = topBy(map, n); if (k.length) L.push(`${indent}${label}:`, ...k.map((x) => `${indent}  - ${x}`)); };
    L.push(`${indent}Background: ${c.background.join('; ')}`);
    if (c.decorations.length) L.push(`${indent}Gradients and decorations:`, ...c.decorations.slice(0, 10).map((x) => `${indent}  - ${x}`));
    list('Text', c.text, 10);
    list('Buttons', c.buttons, 6);
    list('Cards and panels', c.cards, 4);
    list('Tags', c.badges, 4);
    list('Lines and borders', c.lines, 4);
    list('Icons and illustrations', c.icons, 6);
    list('Colored glows (shadows)', c.shadows, 4);
    return L.join('\n');
  }

  /** A one-line gist of a section's layout: "title → 3 cards in a row → button". */
  function layoutGist(el) {
    let n = el;
    for (let i = 0; i < 6; i++) { const k = kidsOf(n); if (k.length === 1 && !LEAF_KINDS.has(kindOf(k[0]))) n = k[0]; else break; }
    const kids = kidsOf(n);
    const cs = getComputedStyle(n);
    const row = cs.display.includes('flex') && !cs.flexDirection.startsWith('column') || (cs.display.includes('grid') && cs.gridTemplateColumns.split(' ').filter(Boolean).length > 1);
    const word = (k) => {
      const kc = getComputedStyle(k), kind = kindOf(k, kc);
      if (kind === 'heading') return purposeOf(k, 'heading');
      if (kind === 'button') return purposeOf(k, 'button');
      if (kind === 'image') return 'picture';
      if (kind === 'text') return purposeOf(k, 'text');
      const inner = kidsOf(k);
      if (inner.length >= 2 && inner.every((x) => kindOf(x) === kindOf(inner[0]) && kidsOf(x).length === kidsOf(inner[0]).length)) {
        const ic = getComputedStyle(k);
        const cols = ic.display.includes('grid') ? ic.gridTemplateColumns.split(' ').filter(Boolean).length : 0;
        const noun = ROLE_NOUN[kindOf(inner[0])] || 'item';
        const how = cols > 1 ? (cols >= inner.length ? 'in a row' : `in ${cols} columns`) : ic.display.includes('flex') && !ic.flexDirection.startsWith('column') ? 'in a row' : 'stacked';
        return `${inner.length} ${noun === 'element' ? 'blocks' : `${noun}s`} ${how}`;
      }
      if (inner.every((x) => kindOf(x) === 'button')) return inner.length > 1 ? `${inner.length} buttons side by side` : 'button';
      if (inner.length) return `group (${inner.map((x) => (LEAF_KINDS.has(kindOf(x)) ? (kindOf(x) === 'heading' ? 'title' : ROLE_NOUN[kindOf(x)]) : 'block')).join(' + ')})`;
      return 'block';
    };
    const parts = kids.slice(0, 8).map(word);
    if (row && kids.length >= 2 && kids.length <= 4) return `${kids.length} columns side by side: ${parts.map((p) => `[${p}]`).join(' ')}`;
    return parts.join(' → ');
  }

  // ---------- color relationships and spacing (v8.4) ----------
  // A format copied into someone else's colors should keep how the colors relate (this section is
  // darker than the page, cards are a touch lighter than it, one accent only…), and several formats
  // copied onto one page need one spacing system. Both are measured here.

  /** rgb()/rgba() or #hex → { r, g, b, a }. */
  function anyColor(str) {
    const m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(String(str || '').trim());
    if (m) { const n = parseInt(m[1], 16); return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: m[2] ? parseInt(m[2], 16) / 255 : 1 }; }
    return parseColor(String(str || '').trim());
  }
  /** Solid color seen through a see-through rgba() over `base` (hex). */
  function over(color, base) {
    const c = anyColor(color); const b = anyColor(base || '#ffffff');
    if (!c || !b) return base;
    const a = c.a ?? 1;
    return '#' + ['r', 'g', 'b'].map((k) => Math.round(c[k] * a + b[k] * (1 - a)).toString(16).padStart(2, '0')).join('');
  }
  const satOf = (hex) => {
    const c = anyColor(hex); if (!c) return 0;
    const mx = Math.max(c.r, c.g, c.b) / 255, mn = Math.min(c.r, c.g, c.b) / 255, l = (mx + mn) / 2;
    return mx === mn ? 0 : (mx - mn) / (l > 0.5 ? 2 - mx - mn : mx + mn);
  };
  /** The background you see on an element: its own fill (gradients averaged), or what shows through. */
  function seenBg(el) {
    const cs = getComputedStyle(el);
    const behind = el.parentElement ? seenBgSolid(el.parentElement) : '#ffffff';
    const stops = (cs.backgroundImage.match(/rgba?\([^)]*\)|#[0-9a-f]{3,8}\b/gi) || []).map((x) => over(normColor(x) || x, behind));
    if (cs.backgroundImage.includes('gradient') && stops.length) return { hex: stops[0], stops };
    const own = normColor(cs.backgroundColor);
    return { hex: own ? (own.startsWith('rgba') ? over(own, behind) : own) : behind, stops: [] };
  }
  function seenBgSolid(el) {
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n);
      const g = cs.backgroundImage.includes('gradient') ? (cs.backgroundImage.match(/rgba?\([^)]*\)|#[0-9a-f]{3,8}\b/i) || [])[0] : null;
      if (g) return normColor(g)?.startsWith('#') ? normColor(g) : over(normColor(g), '#ffffff');
      const c = normColor(cs.backgroundColor);
      if (c && !c.startsWith('rgba')) return c;
      if (c) return over(c, n.parentElement ? seenBgSolid(n.parentElement) : '#ffffff');
    }
    return '#ffffff';
  }
  const meanLum = (b) => (b.stops.length ? b.stops.reduce((t, x) => t + luminance(x), 0) / b.stops.length : luminance(b.hex));
  /** "much darker than", "a bit lighter than", "the same as" */
  function relWord(a, b) {
    const d = a - b;
    if (Math.abs(d) < 0.035) return 'the same as';
    const amount = Math.abs(d) > 0.35 ? 'much ' : Math.abs(d) < 0.1 ? 'a bit ' : '';
    return `${amount}${d < 0 ? 'darker' : 'lighter'} than`;
  }
  /** The visible block before / after a section (walking up past wrappers that have nothing else in them). */
  function neighbor(el, dir) {
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      let s = dir < 0 ? n.previousElementSibling : n.nextElementSibling;
      while (s && (!shown(s) || s.getBoundingClientRect().height < 40)) s = dir < 0 ? s.previousElementSibling : s.nextElementSibling;
      if (s) return s;
    }
    return null;
  }

  /** How the colors of a part relate, in words that still hold in someone else's colors. */
  function colorRelations(el) {
    const out = [];
    const me = seenBg(el);
    const L = meanLum(me);
    out.push(`- ${L < 0.4 ? 'A dark part: light text on a dark background' : 'A light part: dark text on a light background'}`);
    // The page's usual background: what covers most of the page (sections usually paint their own).
    const tally = new Map();
    try { for (const b of pageBands()) { const r = b.getBoundingClientRect(); bump(tally, meanLum(seenBg(b)).toFixed(2), r.width * r.height); } } catch { /* fall back below */ }
    const usual = tally.size ? Number(topBy(tally, 1)[0]) : luminance(seenBgSolid(document.body));
    if (el !== document.body && el !== document.documentElement) out.push(`- Its background is ${relWord(L, usual)} the page's usual background`);
    const above = neighbor(el, -1), below = neighbor(el, 1);
    const near = [above && `${relWord(L, meanLum(seenBg(above)))} the part above it`, below && `${relWord(L, meanLum(seenBg(below)))} the part below it`].filter(Boolean);
    if (near.length) out.push(`- Compared with its neighbors: ${near.join(', and ')}`);
    if (me.stops.length > 1) {
      const a = luminance(me.stops[0]), b = luminance(me.stops[me.stops.length - 1]);
      if (Math.abs(a - b) >= 0.035) out.push(`- Its background fades, getting ${a > b ? 'darker' : 'lighter'} toward the end of the gradient`);
    }
    const all = [...el.querySelectorAll('*')].filter(shown).slice(0, 500);
    const card = all.find((e) => kindOf(e) === 'card');
    if (card) {
      const cb = seenBg(card); const cs = getComputedStyle(card);
      const edge = px(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none' ? ', edged with a thin border' : cs.boxShadow !== 'none' ? ', lifted by a shadow' : '';
      out.push(`- Cards are ${relWord(meanLum(cb), L)} the background behind them${edge}`);
    }
    const head = all.find((e) => kindOf(e) === 'heading'); const body = all.find((e) => kindOf(e) === 'text' && ownText(e).length > 20);
    if (head && body) {
      const bgL = L;
      const hc = Math.abs(luminance(normColor(getComputedStyle(head).color) || '#000000') - bgL);
      const tc = Math.abs(luminance(normColor(getComputedStyle(body).color) || '#000000') - bgL);
      if (hc - tc > 0.12) out.push('- Headings stand out the most; running text is softer (muted)');
      else if (Math.abs(hc - tc) <= 0.12) out.push('- Headings and running text have about the same strength');
    }
    const accents = new Map();
    for (const e of all) {
      const k = kindOf(e); const cs = getComputedStyle(e);
      for (const c of [k === 'button' || k === 'badge' ? normColor(cs.backgroundColor) : null, /^(link|nav link|button|heading|text)$/.test(k) ? normColor(cs.color) : null, normColor(cs.borderTopColor), e.tagName === 'svg' || e.closest?.('svg') ? normColor(cs.fill) || normColor(cs.stroke) : null]) {
        if (c && c.startsWith('#') && satOf(c) > 0.35 && luminance(c) > 0.08 && luminance(c) < 0.92) accents.set(c, (accents.get(c) || 0) + 1);
      }
    }
    // How many accents, not which: the colors themselves belong to a color scheme, not a format.
    if (accents.size === 1) out.push('- One accent color, used sparingly; everything else is neutral');
    else if (accents.size > 1) out.push(`- ${accents.size} accent colors; everything else is neutral`);
    else out.push('- No accent color: only neutrals');
    return out;
  }

  /** One spacing line for a part, so several formats copied onto one page can share one spacing system. */
  function spacingFacts(band) {
    const br = band.getBoundingClientRect();
    const blocks = [];
    const word = (k, kind) => {
      if (kind === 'card') return 'cards';
      if (kind === 'heading') return 'title';
      if (kind === 'badge' || purposeOf(k, kind) === 'small label above the title') return 'label';
      if (kind === 'button' || kind === 'link') return 'buttons';
      if (kind === 'image') return 'picture';
      if (kind === 'input') return 'form';
      if (kind === 'nav link') return 'links';
      return 'text';
    };
    const walk = (el) => {
      for (const k of kidsOf(el)) {
        if (!shown(k) || blocks.length >= 40) continue;
        const kind = kindOf(k);
        if (kind === 'card' || LEAF_KINDS.has(kind)) blocks.push({ el: k, r: k.getBoundingClientRect(), w: word(k, kind) });
        else walk(k);
      }
    };
    walk(band);
    if (!blocks.length) return '';
    blocks.sort((a, b) => a.r.top - b.r.top || a.r.left - b.r.left);
    // Things side by side form one row; rows are stacked.
    const rows = [];
    for (const b of blocks) {
      const row = rows[rows.length - 1];
      if (row && b.r.top < row.bottom - 4) { row.bottom = Math.max(row.bottom, b.r.bottom); row.left = Math.min(row.left, b.r.left); row.right = Math.max(row.right, b.r.right); row.items.push(b); }
      else rows.push({ top: b.r.top, bottom: b.r.bottom, left: b.r.left, right: b.r.right, w: b.w, items: [b] });
    }
    const facts = [];
    const cs = getComputedStyle(band);
    const left = Math.min(...rows.map((r) => r.left)), right = Math.max(...rows.map((r) => r.right));
    // Side padding: the section's own padding (or its inner box's); content width: the widest thing in it.
    let sides = px(cs.paddingLeft);
    for (let n = band, i = 0; !sides && n && i < 4; i++) { n = kidsOf(n)[0]; if (n) sides = px(getComputedStyle(n).paddingLeft); }
    if (!sides) sides = Math.max(0, r0(left - br.left));
    facts.push(`sides ${r0(sides)}px`);
    // A capped box that holds several of the blocks is the content width; a capped headline is just a text measure.
    const capped = [band, ...band.querySelectorAll('*')].slice(0, 300).filter((n) => { const c = getComputedStyle(n).maxWidth; return c !== 'none' && px(c) > 300 && px(c) < br.width && blocks.filter((b) => n.contains(b.el)).length >= 2; })
      .sort((a, b) => px(getComputedStyle(b).maxWidth) - px(getComputedStyle(a).maxWidth))[0];
    facts.push(capped ? `content width ${r0(px(getComputedStyle(capped).maxWidth))}px` : `content ${r0(right - left)}px wide`);
    if (rows.length) facts.push(`top ${r0(Math.max(0, rows[0].top - br.top))}px`, `bottom ${r0(Math.max(0, br.bottom - rows[rows.length - 1].bottom))}px`);
    const pairs = new Map();
    for (let i = 1; i < rows.length; i++) {
      const gap = r0(rows[i].top - rows[i - 1].bottom);
      if (gap < 0 || gap > 400) continue;
      const key = `${rows[i - 1].w} → ${rows[i].w}`;
      if (!pairs.has(key)) pairs.set(key, gap);
    }
    for (const [k, g] of [...pairs].slice(0, 6)) facts.push(`${k} ${g}px`);
    const cardRow = rows.find((r) => r.items.length > 1 && r.items.every((x) => x.w === 'cards'));
    if (cardRow) facts.push(`between cards ${r0(cardRow.items[1].r.left - cardRow.items[0].r.right)}px`);
    return `Spacing: ${facts.join(' · ')}`;
  }

  // ---------- font scheme of a section (v8.8) ----------
  const FONT_ROLE_ORDER = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'big numbers', 'body text', 'small text', 'labels', 'buttons', 'menu links', 'links', 'form fields'];
  const FONT_ROLE_NAME = { h1: 'Main heading (h1)', h2: 'Section titles (h2)', h3: 'Smaller titles (h3)', h4: 'Small titles (h4)', h5: 'Small titles (h5)', h6: 'Small titles (h6)', 'big numbers': 'Big numbers', 'body text': 'Body text', 'small text': 'Small text', labels: 'Labels (small, above titles)', buttons: 'Buttons', 'menu links': 'Menu links', links: 'Links', 'form fields': 'Form fields' };

  /**
   * Every kind of text in the given parts, by role (headings, body, labels, buttons…), with the
   * family, size, weight, line height and letter spacing each one uses, and how they relate
   * (the scale against the body text, weight contrast, tight vs relaxed lines).
   */
  async function fontScheme(roots) {
    const sheets = await loadRules();
    const seen = new Set();
    const rows = [];
    for (const root of roots) {
      for (const el of [root, ...root.querySelectorAll('*')].slice(0, 1500)) {
        if (seen.has(el) || SKIP_TAGS.has(el.tagName) || el.closest('#__promptlift-root')) continue;
        seen.add(el);
        const cs = getComputedStyle(el);
        if (!isVisible(el, cs)) continue;
        const kind = kindOf(el, cs);
        const text = kind === 'input' ? (el.placeholder || el.value || '') : ownText(el);
        if (text.trim().length < 2) continue;
        rows.push({ el, cs, kind, text: text.trim(), spec: textSpec(cs) });
      }
    }
    if (!rows.length) return '';
    // Body text first: the most-used style of running text sets the reference size.
    const runs = new Map();
    for (const r of rows) if (r.kind === 'text' || r.kind === 'container' || r.kind === 'card' || r.kind === 'section') tally(runs, JSON.stringify(r.spec), r.text.length);
    const body = runs.size ? JSON.parse(top(runs, 1)[0].value) : rows[0].spec;
    const roleOf = (r) => {
      const tag = r.el.tagName.toLowerCase();
      if (/^h[1-6]$/.test(tag) || r.kind === 'heading') return /^h[1-6]$/.test(tag) ? tag : r.spec.size >= body.size * 2 ? 'h2' : 'h3';
      if (r.kind === 'button') return 'buttons';
      if (r.kind === 'nav link') return 'menu links';
      if (r.kind === 'input') return 'form fields';
      if (r.kind === 'link') return 'links';
      if (/^[\d\s.,+%$€£kKmM×x/:-]+$/.test(r.text) && r.spec.size >= Math.max(28, body.size * 1.8)) return 'big numbers';
      if (r.kind === 'badge' || ((r.spec.transform === 'uppercase' || r.spec.tracking > 0.04) && r.spec.size <= body.size)) return 'labels';
      if (r.spec.size < body.size - 0.5) return 'small text';
      return 'body text';
    };
    const byRole = new Map();
    for (const r of rows) {
      const role = roleOf(r);
      if (!byRole.has(role)) byRole.set(role, { specs: new Map(), n: 0 });
      const g = byRole.get(role);
      tally(g.specs, JSON.stringify(r.spec), Math.max(1, r.text.length));
      g.n++;
    }
    const roles = FONT_ROLE_ORDER.filter((k) => byRole.has(k)).map((k) => ({ role: k, n: byRole.get(k).n, spec: JSON.parse(top(byRole.get(k).specs, 1)[0].value) }));
    const fams = new Map();
    for (const r of roles) { if (!fams.has(r.spec.family)) fams.set(r.spec.family, []); fams.get(r.spec.family).push(FONT_ROLE_NAME[r.role].replace(/ \(.*\)$/, '').toLowerCase()); }
    const out = [];
    out.push(`Families (${fams.size}):`);
    for (const [fam, used] of fams) {
      const src = familySource(fam, sheets);
      out.push(`- ${fam}${src ? `, ${src}` : ''}: ${used.join(', ')}`);
    }
    out.push('', 'By role:');
    for (const r of roles) {
      const sp = r.spec;
      const extra = [sp.tracking ? `letter spacing ${sp.tracking}em` : '', sp.transform === 'uppercase' ? 'all caps' : sp.transform ? sp.transform : '', sp.italic ? 'italic' : ''].filter(Boolean).join(', ');
      out.push(`- ${FONT_ROLE_NAME[r.role]}: ${sp.family} ${sp.size}px, weight ${sp.weight}, line height ${sp.lineHeight}${extra ? `, ${extra}` : ''}${r.n > 1 ? ` (${r.n}×)` : ''}`);
    }
    const rel = [];
    const big = roles.filter((r) => r.role !== 'body text' && r.spec.size > body.size + 0.5);
    if (big.length || roles.some((r) => r.role === 'small text' || r.role === 'labels')) {
      rel.push(`- Scale against the body text (${body.size}px): ${roles.filter((r) => r.role !== 'body text').map((r) => `${FONT_ROLE_NAME[r.role].replace(/ \(.*\)$/, '').toLowerCase()} ${round(r.spec.size / body.size, 2)}×`).join(', ')}`);
    }
    const heads = roles.filter((r) => /^h[1-6]$/.test(r.role));
    if (heads.length) {
      const hw = Math.max(...heads.map((r) => +r.spec.weight)), bw = +body.weight;
      rel.push(`- Weight: headings ${hw}, body ${bw} (${hw - bw >= 300 ? 'strong contrast' : hw - bw >= 100 ? 'some contrast' : 'about the same weight'})`);
      const hl = heads[0].spec.lineHeight, bl = body.lineHeight;
      if (hl !== 'normal' && bl !== 'normal') rel.push(`- Line height: headings ${hl < 1.2 ? 'tight' : 'normal'} (${hl}), body ${bl >= 1.5 ? 'relaxed' : 'normal'} (${bl})`);
      const ht = heads[0].spec.tracking;
      if (ht < -0.005) rel.push(`- Headings are set tighter than normal (letter spacing ${ht}em)`);
    }
    if (fams.size === 1) rel.push('- One family for everything; the roles differ only by size, weight and spacing');
    if (rel.length) out.push('', 'How they relate (keep this even with other fonts):', ...rel);
    return out.join('\n');
  }

  /**
   * A screen portion dragged out by hand, as what it really covers:
   *  - one thing (an element that fills the area),
   *  - a span of whole sections (the area runs over two or more of the page's sections),
   *  - a part of one section (some of the things side by side or stacked in it, not all).
   */
  function areaSelection(region) {
    const bands = pageBands();
    const vis = (b) => { const r = b.getBoundingClientRect(); const o = Math.min(r.bottom, region.bottom) - Math.max(r.top, region.top); return { r, o }; };
    const spanned = bands.filter((b) => { const { r, o } = vis(b); return o > 0 && (o / Math.max(1, r.height) >= 0.5 || o >= 200); });
    if (spanned.length >= 2) return { kind: 'span', els: spanned };
    // From the smallest box holding the whole area, go down while the area holds just one child;
    // stop where it holds several: all of them = that box, some of them = a part of it.
    const cover = (k) => {
      const r = k.getBoundingClientRect();
      const w = Math.min(r.right, region.right) - Math.max(r.left, region.left);
      const h = Math.min(r.bottom, region.bottom) - Math.max(r.top, region.top);
      return w > 0 && h > 0 ? (w * h) / Math.max(1, r.width * r.height) : 0;
    };
    const inside = (k) => cover(k) >= 0.5;
    let n = regionRoot(region);
    for (let depth = 0; n && depth < 12; depth++) {
      const kids = [...n.children].filter((k) => !SKIP_TAGS.has(k.tagName) && !k.closest('#__promptlift-root') && isVisible(k, getComputedStyle(k)) && k.getBoundingClientRect().height > 0);
      const hit = kids.filter(inside);
      const words = hit.every((k) => getComputedStyle(k).display.startsWith('inline') && !k.children.length);
      if (hit.length >= 2) return hit.length === kids.length || words ? { kind: 'one', el: n } : { kind: 'part', parent: n, els: hit };
      // One child holds the area: the area is all of it, or part of it (then look inside it).
      if (hit.length === 1) { if (cover(hit[0]) >= 0.9) return { kind: 'one', el: hit[0] }; n = hit[0]; continue; }
      break;
    }
    return { kind: 'one', el: n || document.body };
  }

  /** A short name for a neighbor: a section's name, or what a part inside a section is for. */
  function neighborName(n) {
    const bands = pageBands();
    const i = bands.indexOf(n);
    if (i >= 0) return bandName(n, i, bands).replace(/^Section: /, '');
    const kind = kindOf(n);
    if (kind === 'heading' || kind === 'text' || kind === 'button' || kind === 'link') return purposeOf(n, kind);
    if (kind === 'image') return 'a picture';
    const noun = ROLE_NOUN[kind];
    const inner = n.querySelector?.('h1, h2, h3, h4');
    return inner ? `the ${noun && noun !== 'element' ? noun : 'part'} with the ${purposeOf(inner, 'heading')}` : noun && noun !== 'element' ? `a ${noun}` : 'another part';
  }

  /**
   * Where it sits relative to everything around it, so the copy goes in the same relation:
   * for a section, its place in the page order, what is directly above and below, full width or a
   * centered column, overlaps or gaps, sticky; for a part inside a section, where in the section
   * and what comes just before and after it.
   */
  function positionFacts(first, last = first) {
    const out = [];
    const bands = pageBands();
    const docW = document.documentElement.clientWidth;
    const r = first.getBoundingClientRect(), rl = last.getBoundingClientRect();
    const i = bands.indexOf(first), j = bands.indexOf(last);
    if (i >= 0) {
      out.push(`Place in the page: ${i === 0 ? 'the first part at the top' : j === bands.length - 1 ? 'the last part at the bottom' : `part ${i + 1} of ${bands.length} from the top`}`);
      if (i > 0) {
        const prev = bands[i - 1], pr = prev.getBoundingClientRect();
        const gap = Math.round(r.top - pr.bottom);
        out.push(`Directly above it: ${neighborName(prev)}${gap < -4 ? `; it overlaps that part by ${-gap}px (pulled up over it)` : gap > 4 ? `; ${gap}px of empty page between them` : ' (they touch, no gap)'}`);
      }
      if (j >= 0 && j < bands.length - 1) out.push(`Directly below it: ${neighborName(bands[j + 1])}`);
    } else {
      const band = sectionOf(first);
      if (band && band !== first) {
        out.push(`Inside the ${neighborName(band)} section, at the ${placeWords(first, band)}`);
        const sib = (el, dir) => { let n = el[dir]; while (n && !(n instanceof Element && n.getBoundingClientRect().height > 1)) n = n[dir]; return n; };
        const before = sib(first, 'previousElementSibling'), after = sib(last, 'nextElementSibling');
        if (before) out.push(`Just before it: ${neighborName(before)}`);
        if (after) out.push(`Just after it: ${neighborName(after)}`);
        const br = band.getBoundingClientRect();
        if (Math.abs((r.left + r.width / 2) - (br.left + br.width / 2)) < 8 && r.width < br.width * 0.9) out.push('Centered in the section');
      }
    }
    const w = Math.max(rl.right, r.right) - Math.min(r.left, rl.left);
    if (w >= docW * 0.97) out.push('Width: edge to edge (full width of the page)');
    else out.push(`Width: ${Math.round(w)}px of the ${docW}px page, ${Math.abs((r.left + w / 2) - docW / 2) < 8 ? 'centered' : r.left < docW * 0.2 ? 'on the left' : 'on the right'}`);
    const cs = getComputedStyle(first);
    if (cs.position === 'sticky' || cs.position === 'fixed') out.push(`Stays ${cs.position === 'fixed' ? 'fixed on screen' : 'stuck to the top'} while the page scrolls, over the parts below`);
    else if (+cs.zIndex > 0 && r.top < 0) out.push('Sits on top of the content around it');
    return `Position on the page (put it in the same relation to my parts):\n${out.map((l) => `- ${l}`).join('\n')}`;
  }

  /** The report for a grouped portion (a span of sections, or part of one section). */
  async function portionReportGroup(els, parts, kind) {
    const names = els.map((e) => sectionName(e).replace(/^Section: /, ''));
    const host = kind === 'part' ? sectionName(sectionOf(els[0].parentElement || els[0])).replace(/^Section: /, '') : '';
    const name = kind === 'span' ? `${names.join(' + ')} (together)` : `part of ${host}: ${els.length} pieces`;
    const out = [];
    if (parts.format) {
      if (kind === 'span') out.push(`Format (${els.length} sections, top to bottom):\n${els.map((e, i) => `Part ${i + 1}, ${names[i]}:\n${sectionReport(e, 'format').code}`).join('\n\n')}`);
      else {
        const arr = arrangementItem(els[0].parentElement, els, 'pieces');
        const outl = els.map((e, i) => `Piece ${i + 1}:\n${outline(e, { maxDepth: 5, maxLines: 25, lean: true, bare: true })}`).join('\n\n');
        let rel = '';
        // No Spacing line here: a part's own padding is not the page's section rhythm.
        try { rel = `\n\nColor relationships (keep these even in other colors):\n${colorRelations(els[0]).join('\n')}`; } catch (err) { console.debug('[PromptLift] part relations failed', err); }
        let pos = '';
        try { pos = `\n\n${positionFacts(els[0], els[els.length - 1])}`; } catch (err) { console.debug('[PromptLift] part position failed', err); }
        out.push(`Format (only these ${els.length} pieces of the section, not the rest of it):\nHow they sit: ${arr.code}${pos}\n\n${outl}${rel}`);
      }
    }
    if (parts.colors) out.push(`Colors:\n${els.map((e, i) => `${kind === 'span' ? names[i] : `Piece ${i + 1}`}:\n${colorReport(e)}`).join('\n\n')}`);
    if (parts.fonts) { const f = await fontScheme(els); if (f) out.push(`Font scheme:\n${f}`); }
    let scrollFound = null; let scrollYs = [];
    if (parts.scroll) {
      const facts = [];
      for (const [i, e] of els.entries()) {
        const sc = await sectionScroll(e);
        if (sc.facts.length) { facts.push(`${kind === 'span' ? names[i] : `Piece ${i + 1}`}: ${sc.facts.join('; ')}`); if (!scrollYs.length) scrollYs = sc.ys || []; }
      }
      scrollFound = facts.length > 0;
      if (facts.length) out.push(`Scroll behavior:\n${facts.map((f) => `- ${f}`).join('\n')}`);
    }
    return { name, code: out.join('\n\n'), scrollFound, scrollYs };
  }

  /** What the panel needs for one chosen section. */
  function sectionReport(el, kind) {
    const name = sectionName(el);
    const r = el.getBoundingClientRect();
    if (kind === 'colors') return { name, code: colorReport(el) };
    let extra = '';
    try { extra = `\n\n${spacingFacts(el)}\n\nColor relationships (keep these even in other colors):\n${colorRelations(el).join('\n')}`; }
    catch (err) { console.debug('[PromptLift] spacing/color relationships failed', err); }
    let pos = '';
    try { pos = `\n\n${positionFacts(el)}`; } catch (err) { console.debug('[PromptLift] position facts failed', err); }
    return { name, code: `In short: ${layoutGist(el)}\n${r0(r.height)}px tall${pos}\n\n${outline(el, { maxDepth: 6, maxLines: 50, lean: true, bare: true })}${extra}` };
  }

  /** A screen portion with the chosen parts (colors / format / scroll) in one block. */
  async function portionReport(el, parts) {
    const name = sectionName(el);
    const out = [];
    if (parts.format) out.push(`Format:\n${sectionReport(el, 'format').code}`);
    if (parts.colors) out.push(`Colors:\n${colorReport(el)}`);
    if (parts.fonts) { const f = await fontScheme([el]); if (f) out.push(`Font scheme:\n${f}`); }
    let scrollFound = null;
    let scrollYs = [];
    if (parts.scroll) {
      const s = await sectionScroll(el);
      scrollFound = s.facts.length > 0;
      scrollYs = s.ys || [];
      if (s.facts.length) out.push(`Scroll behavior (${s.range}):\n${s.facts.map((f) => `- ${f}`).join('\n')}`);
    }
    return { name, code: out.join('\n\n'), scrollFound, scrollYs };
  }

  /** Items for one picked element (+ a "whole element" recipe). */
  async function itemsForElement(el) {
    const sheets = await loadRules();
    const nodes = [el, ...[...el.querySelectorAll('*')].filter((n) => !SKIP_TAGS.has(n.tagName) && isVisible(n, getComputedStyle(n)))];
    const items = collectItems(nodes, sheets, el);
    const nav = navRootFor(el);
    if (nav && (nav === el || el.contains(nav)) && el.getBoundingClientRect().height <= 260) items.push(navItem(nav));
    else if (kidsOf(el).length >= 1 && el.querySelectorAll('*').length >= 2) items.push(structureItem(el));
    const whole = await analyzeElement(el);
    const noun = ROLE_NOUN[whole.kind] || 'element';
    items.push(mk({ target: reg(el), rect: rectOf(el), group: GROUPS.all, type: 'component', title: `The whole ${noun}`, desc: 'All of it, as one piece.', tech: '', context: '', code: `${whole.structure}\n\n${[...whole.rules, ...whole.keyframes].join('\n')}`, lang: 'html+css', preview: { kind: 'none' } }));
    const own = metaOf(el);
    for (const it of items) it.meta ??= own;
    return items;
  }

  /** Items for a dragged screen region. When it covers several similar things (cards, links,
   *  buttons…), only what they SHARE is offered: arrangement, common style, shared fonts, shared
   *  hover and the background behind them; not each element's own details. */
  async function itemsForRegion(region) {
    const sheets = await loadRules();
    scope = region;
    let nodes;
    try { nodes = collectElements().map((e) => e.el); } finally { scope = null; }
    const rc = regionContainer(region);
    const { parent, members } = regionMembers(region);
    const whole = mk({ rect: { left: region.left, top: region.top, width: region.right - region.left, height: region.bottom - region.top }, group: GROUPS.all, type: 'section', title: 'The whole area', desc: 'All of it, as one section.', tech: '', context: '', code: `${rc.structure}\n\n/* section */\n${Object.entries(rc.style).map(([k, v]) => `${k}: ${v};`).join('\n')}${rc.layout ? `\n\n/* inner layout */\n${Object.entries(rc.layout).map(([k, v]) => `${k}: ${v};`).join('\n')}` : ''}`, lang: 'html+css', preview: { kind: 'none' } });
    const root = regionRoot(region);
    const navR = navRootFor(root);
    const shape = navR && (navR === root || root.contains(navR)) && root.getBoundingClientRect().height <= 260 ? navItem(navR) : root && root !== document.body ? structureItem(root) : null;
    if (members.length < 2) {
      const items = collectItems(nodes, sheets, null);
      if (shape) items.push(shape);
      if (rc.layoutEl) items.push(layoutItem(rc.layoutEl));
      whole.meta = { kind: 'section', tag: 'section', noun: 'section' };
      return [...items, whole];
    }
    const items = shape ? [shape] : [];
    const noun = ROLE_NOUN[kindOf(members[0])] || 'item';
    const plural = noun.endsWith('s') ? noun : `${noun}s`;
    items.push(arrangementItem(parent, members, plural));
    const look = sharedLook(members, plural);
    if (look) items.push(look);
    for (const [sel, title] of [['h1,h2,h3,h4,h5,h6', 'Shared heading font'], ['p', 'Shared text font'], ['a,button', 'Shared link font']]) {
      const els = members.map((m) => (m.matches(sel) ? m : m.querySelector(sel)));
      if (els.some((e) => !e)) continue;
      const specs = els.map((e) => textSpec(getComputedStyle(e)));
      if (!specs.every((x) => x.family === specs[0].family && x.size === specs[0].size && x.weight === specs[0].weight)) continue;
      const cs = getComputedStyle(els[0]);
      items.push(mk({ target: reg(els[0]), rect: rectOf(els[0]), group: GROUPS.text, type: 'font', title, ...fontWords(specs[0]), fontSource: familySource(specs[0].family, sheets), context: `Same in all ${members.length}`, code: fontCode(specs[0], cs), preview: { kind: 'font', value: { family: cs.fontFamily, size: Math.min(specs[0].size, 22), weight: specs[0].weight } } }));
    }
    const hovers = members.map((m) => statesFor(m, sheets, 4).map((x) => `${x.state}|${x.css}`));
    const common = hovers[0].filter((h) => hovers.every((list) => list.includes(h)));
    for (const key of common.slice(0, 2)) {
      const [state, css] = key.split('|');
      const cs = getComputedStyle(members[0]);
      const trans = cs.transitionDuration.split(',').some((d) => px(d) > 0) ? `transition: ${mini(cs.transition).replace(/,/g, ', ')};\n` : '';
      items.push(mk({ target: reg(parent), rect: rectOf(parent), group: GROUPS.hover, when: state === 'hover' ? 'On hover' : 'On click', type: state === 'hover' ? 'hover' : 'focus', title: `${cap(noun)} ${state === 'hover' ? 'hover' : 'click'} (all ${members.length})`, desc: `${cap(stateWords(css))}.`, tech: '', context: '', code: `/* resting */\n${trans}/* :${state} */\n${css.replace(/;/g, ';\n')};`, preview: { kind: 'none' } }));
    }
    // Background behind them (the container they sit in).
    const bgEl = [parent, ...ancestors(parent)].find((e) => { const c = getComputedStyle(e); return c.backgroundImage.includes('gradient(') || normColor(c.backgroundColor); });
    if (bgEl && bgEl !== document.body && bgEl !== document.documentElement) {
      const c = getComputedStyle(bgEl);
      if (c.backgroundImage.includes('gradient(')) items.push(mk({ target: reg(bgEl), rect: rectOf(bgEl), group: GROUPS.bg, type: 'gradient', ...gradientWords(c.backgroundImage, false), title: 'Background behind them', context: '', code: `background-image: ${hexify(c.backgroundImage)};`, preview: { kind: 'gradient', value: mini(c.backgroundImage) } }));
      else items.push(mk({ target: reg(bgEl), rect: rectOf(bgEl), group: GROUPS.bg, type: 'color', title: 'Background behind them', desc: `${cap(colorName(normColor(c.backgroundColor)))}.`, tech: normColor(c.backgroundColor), context: '', code: `background-color: ${normColor(c.backgroundColor)};`, preview: { kind: 'color', value: normColor(c.backgroundColor) } }));
    }
    // A CSS animation they all run (recorded group animations are added by the panel).
    const names = members.map((m) => getComputedStyle(m).animationName);
    if (names[0] !== 'none' && names.every((n) => n === names[0])) {
      const rule = sheets.keyframes.find((k) => k.name === names[0].split(',')[0].trim());
      if (rule) {
        const cs = getComputedStyle(members[0]);
        const delays = members.map((m) => parseFloat(getComputedStyle(m).animationDelay) * 1000).sort((a, b) => a - b);
        const stagger = delays.length > 1 ? Math.round((delays[delays.length - 1] - delays[0]) / (delays.length - 1)) : 0;
        const loop = cs.animationIterationCount === 'infinite';
        const words = globalThis.PromptLiftMotion?.describe({ frames: framesOfRule(rule), iterations: loop ? 'infinite' : 1, duration: Math.round(parseFloat(cs.animationDuration) * 1000), stagger, count: members.length, unit: 'item', easing: cs.animationTimingFunction, trigger: loop ? 'loop' : 'load', target: `the ${plural}` });
        items.push(mk({ target: reg(parent), rect: rectOf(parent), group: GROUPS.anim, when: loop ? 'Loops' : 'On load', animName: rule.name, type: 'animation', title: words?.name || 'Shared animation', desc: words?.sentence || '', tech: words?.numbers || '', context: '', code: `${keyframesCode(rule)}\n\n/* on each of the ${members.length} */\nanimation: ${mini(cs.animation)};${stagger ? `\n/* each starts ${stagger}ms after the previous one */` : ''}`, preview: { kind: 'none' } }));
      }
    }
    items.push(whole);
    // Shared details describe the members ("all 3 cards"), so that is what they fit to.
    const shared = metaOf(members[0]);
    for (const it of items) it.meta ??= shared;
    return items;
  }

  function ancestors(el) { const out = []; for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) out.push(n); return out; }

  /** The element with the most visible children inside the region, and those children. */
  // ---------- text split into pieces (letters/words in their own spans) ----------

  /** A short inline bit of text, like a letter or word wrapped in a span for an animation. */
  function isTextPiece(el) {
    if (!(el instanceof HTMLElement) || /^(IMG|SVG|VIDEO|CANVAS|BUTTON|INPUT|SELECT|TEXTAREA|A)$/i.test(el.tagName)) return false;
    if (!/^inline/.test(getComputedStyle(el).display)) return false;
    if (el.querySelector('img,svg,video,canvas,button,input,select,textarea')) return false;
    const t = el.textContent.trim();
    return t.length > 0 && t.length <= 40;
  }
  const INHERITED_KEY = ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'color'];
  const PIECE_KEY = [...INHERITED_KEY, 'backgroundColor', 'backgroundImage', 'textDecorationLine', 'letterSpacing', 'textTransform'];
  const keyOf = (cs, props) => props.map((p) => cs[p]).join('|');

  /** Pieces that look exactly alike: together they are one piece of text, not several things. */
  function indistinctPieces(kids) {
    if (kids.length < 2 || !kids.every(isTextPiece)) return false;
    const k0 = keyOf(getComputedStyle(kids[0]), PIECE_KEY);
    return kids.every((k) => keyOf(getComputedStyle(k), PIECE_KEY) === k0);
  }

  /** Climb from a letter/word span to the whole text when nothing sets it apart from its neighbours. */
  function wholeText(el) {
    let n = el;
    for (let i = 0; i < 4 && n?.parentElement && n.parentElement !== document.body && isTextPiece(n); i++) {
      const parent = n.parentElement;
      const sibs = [...parent.children].filter((c) => !/^(SCRIPT|STYLE|BR)$/.test(c.tagName));
      if (!indistinctPieces(sibs.length > 1 ? sibs : [n, n])) break;
      // The pieces must also match the text around them (a highlighted word is its own thing).
      if (keyOf(getComputedStyle(n), INHERITED_KEY) !== keyOf(getComputedStyle(parent), INHERITED_KEY)) break;
      n = parent;
    }
    return n;
  }

  function regionMembers(region) {
    const overlap = (r) => {
      const w = Math.min(r.right, region.right) - Math.max(r.left, region.left);
      const h = Math.min(r.bottom, region.bottom) - Math.max(r.top, region.top);
      return w > 0 && h > 0 && (w * h) / Math.max(1, r.width * r.height) >= 0.5;
    };
    const root = regionRoot(region);
    let best = { parent: root, members: [] };
    for (const cand of [root, ...root.querySelectorAll('*')].slice(0, 600)) {
      if (SKIP_TAGS.has(cand.tagName) || cand.closest('#__promptlift-root')) continue;
      const kids = [...cand.children].filter((k) => !SKIP_TAGS.has(k.tagName) && isVisible(k, getComputedStyle(k)) && overlap(k.getBoundingClientRect()));
      if (indistinctPieces(kids)) continue; // letters/words of one text are one thing
      if (kids.length > best.members.length) best = { parent: cand, members: kids };
    }
    return best;
  }

  /** How the picked things sit next to each other (measured, not prescribed). */
  function arrangementItem(parent, members, plural) {
    // Layout boxes, not painted ones: a card that is mid-animation (moved by a transform) must not count as a new row.
    const rects = members.map((m) => {
      if (!(m instanceof HTMLElement)) return m.getBoundingClientRect();
      const left = m.offsetLeft, top = m.offsetTop;
      return { left, top, width: m.offsetWidth, height: m.offsetHeight, right: left + m.offsetWidth, bottom: top + m.offsetHeight };
    });
    const rows = [];
    for (const r of [...rects].sort((a, b) => a.top - b.top)) {
      const row = rows.find((x) => Math.abs(x[0].top - r.top) < 6);
      if (row) row.push(r); else rows.push([r]);
    }
    rows.forEach((row) => row.sort((a, b) => a.left - b.left));
    const perRow = Math.max(...rows.map((r) => r.length));
    const med = (arr) => { const a = [...arr].sort((x, y) => x - y); return a.length ? Math.round(a[Math.floor(a.length / 2)]) : 0; };
    const hGap = med(rows.flatMap((row) => row.slice(1).map((r, i) => r.left - row[i].right)));
    const vGap = med(rows.slice(1).map((row, i) => row[0].top - rows[i][0].bottom));
    const widths = rects.map((r) => Math.round(r.width));
    const sameWidth = widths.every((w) => Math.abs(w - widths[0]) <= 2);
    const desc = rows.length === 1 ? `${members.length} side by side${hGap > 0 ? `, ${hGap}px apart` : ''}${sameWidth ? ', same width' : ''}.`
      : perRow === 1 ? `${members.length} stacked${vGap > 0 ? `, ${vGap}px apart` : ''}.` : `${rows.length} rows of ${perRow}${hGap > 0 ? `, ${hGap}px apart` : ''}.`;
    const pc = getComputedStyle(parent);
    const facts = [
      `${members.length} ${plural} in ${rows.length} row${rows.length > 1 ? 's' : ''} of up to ${perRow}`,
      hGap > 0 ? `gap between them side by side: ${hGap}px` : null,
      rows.length > 1 && vGap > 0 ? `gap between rows: ${vGap}px` : null,
      sameWidth ? `each ${widths[0]}px wide` : `widths ${widths.join(', ')}px`,
      `container: display ${pc.display}${pc.display.includes('grid') ? `, ${pc.gridTemplateColumns.split(' ').filter(Boolean).length} columns` : ''}${pc.display.includes('flex') ? `, ${pc.flexDirection}` : ''}, ${Math.round(parent.getBoundingClientRect().width)}px wide (at a ${innerWidth}px window)`,
    ].filter(Boolean).join('\n');
    return mk({ target: reg(parent), rect: rectOf(parent), group: GROUPS.layout, type: 'layout', title: `How the ${plural} are arranged`, desc, tech: '', context: '', code: facts, preview: { kind: 'none' } });
  }

  /** Style properties every picked element has in common. */
  function sharedLook(members, plural) {
    const props = ['background-color', 'background-image', 'border-radius', 'box-shadow', 'border-top', 'padding', 'backdrop-filter', 'text-align'];
    const css = members.map((m) => getComputedStyle(m));
    const decls = [];
    const words = [];
    for (const p of props) {
      const v = css[0].getPropertyValue(p);
      if (!css.every((c) => c.getPropertyValue(p) === v)) continue;
      // Format only: colors, gradients and shadows are offered under Colors.
      if (p === 'background-color' || p === 'background-image' || p === 'box-shadow') continue;
      else if (p === 'border-radius' && v !== '0px') { decls.push(`border-radius: ${v};`); words.push('rounded corners'); }
      else if (p === 'box-shadow' && v !== 'none') { decls.push(`box-shadow: ${mini(v)};`); words.push(shadowWords(mini(v), false).replace(/\.$/, '').toLowerCase()); }
      else if (p === 'border-top' && !/^0px/.test(v)) { decls.push(`border-width: ${v.split(' ')[0]};`); words.push('thin border'); }
      else if (p === 'padding' && !/^0px( 0px)*$/.test(v)) decls.push(`padding: ${v};`);
      else if (p === 'backdrop-filter' && v !== 'none') { decls.push(`backdrop-filter: ${v};`); words.push('frosted glass'); }
      else if (p === 'text-align' && /center|right/.test(v)) { decls.push(`text-align: ${v};`); words.push(`text ${v === 'center' ? 'centered' : 'on the right'}`); }
    }
    if (!decls.length) return null;
    return mk({ target: reg(members[0]), rect: rectOf(members[0]), group: GROUPS.shape, type: 'shared-style', title: `What the ${plural} have in common`, desc: words.length ? `${cap(words.join(', '))}.` : 'Same spacing.', tech: '', context: `Same in all ${members.length}`, code: decls.join('\n'), preview: { kind: 'none' } });
  }

  /** The element enclosing a dragged region (tagged by the picker so recorded movement can be matched). */
  function regionRoot(region) {
    const cx = (region.left + region.right) / 2; const cy = (region.top + region.bottom) / 2;
    let el = document.elementsFromPoint(cx, cy).find((n) => !n.closest('#__promptlift-root'));
    while (el && el.parentElement) {
      const r = el.getBoundingClientRect();
      if (r.left <= region.left + 8 && r.top <= region.top + 8 && r.right >= region.right - 8 && r.bottom >= region.bottom - 8) break;
      el = el.parentElement;
    }
    return el && el !== document.documentElement ? el : document.body;
  }

  /** Page-wide items for "See this page's style". */
  async function itemsForPage() {
    const sheets = await loadRules();
    const els = collectElements();
    const nodes = els.map((e) => e.el);
    const items = collectItems(nodes, sheets, null).filter((i) => i.type !== 'font');
    const data = { fonts: await analyzeFonts(els, sheets), colors: await analyzeColors(els, sheets) };
    for (const [role, title] of [['h1', 'Big heading font'], ['h2', 'Heading font'], ['body', 'Text font'], ['button', 'Button font'], ['nav link', 'Menu font']]) {
      const s = data.fonts.roles[role];
      if (!s) continue;
      const src = data.fonts.families.find((f) => f.family === s.family)?.source;
      items.push(mk({ group: GROUPS.text, type: 'font', title, ...fontWords(s), fontSource: familySource(s.family, sheets), context: '', code: fontCode(s, null) + (src && src !== 'unknown' ? `\n/* source on the original: ${src} */` : ''), preview: { kind: 'font', value: { family: s.family, size: Math.min(s.size, 22), weight: s.weight } } }));
    }
    const c = data.colors;
    // The color scheme as it runs down the page, section by section: what people mean by
    // "copy this site's colors" when backgrounds, gradients and text colors change as you scroll.
    const journey = colorJourney();
    items.unshift(mk({ group: GROUPS.bg, type: 'palette', title: 'Color scheme', desc: journey.desc, tech: '', context: 'The whole page, top to bottom', code: journey.code, preview: { kind: 'palette', value: journey.swatches.length ? journey.swatches : [c.base] } }));
    items.push(mk({ group: GROUPS.layout, type: 'structure', title: 'Page structure', desc: 'Every section from top to bottom: what is in it and how it is laid out.', tech: '', context: 'The whole page', code: pageStructure(), preview: { kind: 'none' } }));
    const pageNav = navRootFor(document.body);
    if (pageNav) items.push(navItem(pageNav));
    const add = (title, hex) => hex && items.push(mk({ group: GROUPS.bg, type: 'color', title, desc: `${cap(colorName(hex))}.`, tech: hex, context: '', code: `${hex}`, preview: { kind: 'color', value: hex } }));
    add('Background color', c.base);
    const accents = (c.accents || []).map((a) => a.value).filter((v) => /^#/.test(v) && (hslOf(v)?.s || 0) > 0.3);
    add('Main color', accents[0]);
    if (accents[1]) add('Second color', accents[1]);
    add('Text color', c.text?.[0]?.value);
    for (const b of (c.backgrounds || []).slice(0, 4)) if (b.value !== c.base && /^#/.test(b.value)) add(`${cap(ROLE_NOUN[b.kinds[0]] || 'box')} color`, b.value);
    const all = await analyze(['all']);
    items.push(mk({ group: GROUPS.all, type: 'design-system', title: 'The whole look', desc: 'Fonts, colors, shapes and motion together.', tech: '', context: '', code: globalThis.PromptLiftPrompts ? globalThis.PromptLiftPrompts.guideBody(all) : '', preview: { kind: 'none' } }));
    return items;
  }

  // Lazy access to the guide renderer in prompts.js (injected alongside when browsing).
  function PromptLiftGuideSection(cat, data) {
    return globalThis.PromptLiftPrompts ? globalThis.PromptLiftPrompts.section(cat, data) : '';
  }


  // ---------- public API ----------

  const ANALYZERS = { fonts: analyzeFonts, colors: analyzeColors, animations: analyzeAnimations, layout: analyzeLayout, shape: analyzeShape, components: analyzeComponents };

  /**
   * @param {string[]} categories subset of ANALYZERS keys, or ['all']
   * @param {{region?: {left:number, top:number, right:number, bottom:number}}} [opts]
   */
  async function analyze(categories, opts = {}) {
    const started = performance.now();
    scope = opts.region || null;
    try {
      const sheets = await loadRules();
      const els = collectElements();
      const want = categories.includes('all') ? Object.keys(ANALYZERS) : categories;
      const data = { scoped: !!scope, stack: analyzeStack(sheets) };
      for (const c of want) {
        if (!ANALYZERS[c]) continue;
        try { data[c] = await ANALYZERS[c](els, sheets); }
        catch (e) { console.error('[PromptLift] analyzer failed:', c, e); data[c] = { error: String(e?.message || e) }; }
      }
      if (scope) { const { layoutEl, ...rc } = regionContainer(scope); void layoutEl; data.region = rc; }
      data.diagnostics = { elements: els.length, rules: sheets.styleRules.length, unreadable: sheets.unreadable.length, ms: Math.round(performance.now() - started) };
      return data;
    } finally {
      scope = null;
    }
  }

  globalThis.__PromptLift = { version: 13, fontScheme, areaSelection, portionReportGroup, colorRelations, spacingFacts, kindOf, metaOf, areaScrollHint, playState, restoreState, elementScroll, scrollHint, portionReport, sectionOf, sectionName, sectionReport, analyze, analyzeElement, itemsForElement, itemsForRegion, itemsForPage, regionRoot, wholeText };
})();
