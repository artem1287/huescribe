// Huescribe animation recorder. Runs in the page's MAIN world only while the Huescribe panel is
// open: background.js registers it for document_start on new loads and injects it into the open
// tab; closing the panel calls __plRec.stop(), which makes every hook and listener a no-op.
// Records every animation that plays:
//   - CSS animations and transitions (animationstart / transitionrun + their Animation objects),
//     including ::before/::after and inside shadow DOM (attachShadow hook)
//   - Web Animations API (Element.animate + Animation.play hooks; Motion / Framer Motion)
//   - a catch-all sweep of document.getAnimations() for anything started some other way,
//     including scroll-driven animations (ScrollTimeline / ViewTimeline)
//   - JS tweens that write inline styles or SVG attributes every frame (GSAP, anime.js, progress
//     bars, line drawing…) via a MutationObserver
// Then groups per-element animations into human-level "effects" (e.g. letters staggering in),
// describes them in plain words, and can replay them on the page.

(() => {
  if (window.__plRec) { window.__plRec.start?.(); return; }

  // MAIN world: i18n.js isn't loaded here and a page may have its own global `t`. Use Huescribe's runtime only
  // when it is really there; otherwise text stays English (tk-marked data is translated by the panel where shown).
  const L10N = () => { const I = globalThis.I18N; return I && Array.isArray(I.LANGS) && typeof I.t === 'function' ? I : null; };
  const t = (s, v) => { const I = L10N(); return I ? I.t(s, v) : (v ? s.replace(/\{(\w+)\}/g, (m, k) => (k in v ? String(v[k]) : m)) : s); };
  const tk = (s) => s;

  const T0 = performance.now();
  const now = () => performance.now() - T0;
  const MAX_TWEEN_SAMPLES = 50000;
  const TRACKED = ['opacity', 'transform', 'translate', 'scale', 'rotate', 'filter', 'clipPath', 'width', 'height', 'top', 'left',
    'backgroundPosition', 'strokeDashoffset', 'letterSpacing', 'color', 'backgroundColor'];
  const SVG_ATTRS = ['transform', 'd', 'points', 'cx', 'cy', 'r', 'x', 'y', 'stroke-dashoffset', 'opacity'];

  const rec = {
    raw: [],              // finished keyframe-based records (css / transition / waapi)
    tweens: new Map(),    // element → { info, samples: [{t, v}] }
    refs: new Map(),      // element id → WeakRef(element)
    ids: new WeakMap(),
    nextId: 1,
    active: true,         // false after stop(): hooks stay installed but record nothing
    // Injected after the page finished loading: load-time animations already happened unseen.
    lateStart: document.readyState === 'complete' || document.readyState === 'interactive' && performance.now() > 1500,
    scrolls: [],          // times of scroll events
    clicks: [],           // times of clicks/presses on the page (not on Huescribe's own overlay)
    loadAt: Infinity,
    sampleCount: 0,
    replaying: false,
    seenAnims: new WeakSet(),
    shadowRoots: [],
  };
  Object.defineProperty(window, '__plRec', { value: rec, enumerable: false, configurable: true });

  addEventListener('scroll', () => { if (!rec.active) return; const t = now(); if (!rec.scrolls.length || t - rec.scrolls[rec.scrolls.length - 1] > 100) rec.scrolls.push(t); }, { capture: true, passive: true });
  addEventListener('load', () => { rec.loadAt = now(); }, { once: true });
  const onPress = (e) => {
    // The person pressing something for real ends a pointer test that is still running.
    if (rec.pointerTest && e.isTrusted) pointerEnd(0);
    if (!rec.active || e.target?.id === '__huescribe-root' || rec.replaying || !e.isTrusted) return; rec.clicks.push(now()); if (rec.clicks.length > 200) rec.clicks.shift(); };
  addEventListener('pointerdown', onPress, { capture: true, passive: true });
  addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') onPress(e); }, { capture: true, passive: true });

  // ---------- element bookkeeping ----------

  function idOf(el) {
    let id = rec.ids.get(el);
    if (!id) { id = rec.nextId++; rec.ids.set(el, id); rec.refs.set(id, new WeakRef(el)); }
    return id;
  }

  const CONTAINER_SEL = 'h1,h2,h3,h4,h5,h6,p,a,button,li,figure,blockquote,label';
  const SECTION_SEL = 'section,header,footer,nav,article,aside,main,form';

  function ownText(el) {
    let t = '';
    for (const n of el.childNodes) if (n.nodeType === 3) t += n.textContent;
    return t.replace(/\s+/g, ' ').trim();
  }

  function info(el) {
    const container = el.closest(CONTAINER_SEL) || el.closest(SECTION_SEL) || el.parentElement || el;
    const r = el.getBoundingClientRect();
    return {
      id: idOf(el),
      tag: el.tagName.toLowerCase(),
      text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40),
      ownText: ownText(el),
      container: { id: idOf(container), tag: container.tagName.toLowerCase(), text: ((container.matches(SECTION_SEL) && container.querySelector('h1,h2,h3')) || container).textContent.replace(/\s+/g, ' ').trim().slice(0, 50) },
      inView: r.bottom > 0 && r.top < innerHeight,
    };
  }

  /** Hover/focus state of an element right now (recorded when an animation starts). */
  function pointerState(el) {
    const st = { hovered: false, focused: false };
    if (!el) return st;
    try { st.hovered = el.matches(':hover') || !!el.closest(':hover:not(html):not(body)'); } catch { /* old engines */ }
    try { st.focused = el.matches(':focus-within'); } catch { /* ignore */ }
    return st;
  }

  /** When an animation plays. Something that starts invisible or far away is an entrance
   *  (load / scroll reveal) even if the mouse happens to be over it; real hover effects start
   *  from the element's normal resting state. */
  function triggerOf(it) {
    if (it.iterations === Infinity) return 'loop';
    const c0 = channels(it.frames[0]?.props || {});
    const reveal = (c0.opacity !== undefined && c0.opacity < 0.5) || Math.abs(c0.ty || 0) >= 10 || Math.abs(c0.tx || 0) >= 10 || (c0.sc !== undefined && c0.sc < 0.8);
    // Something that starts right after a press is a click effect (a menu opening, a button
    // bouncing), unless it is a scroll reveal set off by a link that scrolled the page.
    const t0 = it.start;
    // Whichever input came last decides (a link that scrolls the page: the scroll comes after).
    const last = (list, win) => { let x = -Infinity; for (const v of list) if (t0 - v >= 0 && t0 - v < win && v > x) x = v; return x; };
    const press = last(rec.clicks, 1200);
    const scroll = t0 > 800 ? last(rec.scrolls, 1500) : -Infinity;
    // (a scroll event fires a frame after the press that caused it, so allow ~60ms)
    if (press > -Infinity && (!reveal || scroll - press < 60)) return 'click';
    // A simulated hover we ran (catchHover): what started then is that element's JS hover effect.
    if (it.forcedTrigger) return it.forcedTrigger;
    if (rec.forced && t0 >= rec.forced.from && t0 <= rec.forced.to) return rec.forced.trigger;
    if (!reveal && it.hovered) return 'hover';
    if (!reveal && it.focused) return 'focus';
    const t = it.start;
    if (rec.scrolls.some((s) => t - s >= 0 && t - s < 1500) && t > 800) return 'scroll';
    if (t <= Math.min(rec.loadAt, 6000) + 2500) return 'load';
    return 'later';
  }

  // ---------- keyframe-based records ----------

  const NON_STYLE = new Set(['offset', 'computedOffset', 'easing', 'composite']);

  function framesOf(anim) {
    try {
      return anim.effect.getKeyframes().map((k) => {
        const props = {};
        for (const [p, v] of Object.entries(k)) if (!NON_STYLE.has(p) && v != null && v !== '') props[p] = String(v);
        return { offset: k.computedOffset ?? k.offset, easing: k.easing && k.easing !== 'linear' ? k.easing : undefined, props };
      }).filter((f) => Object.keys(f.props).length);
    } catch { return []; }
  }

  function ignored(el) {
    // data-pl-own: Huescribe is showing a hover/press effect on it right now (not the page's own motion).
    return el.hasAttribute?.('data-pl-ignore') || el.hasAttribute?.('data-pl-own') || el.id === '__huescribe-root' || !!el.closest?.('#__huescribe-root');
  }

  function addAnim(el, kind, anim, name) {
    // Our own replays are in seenAnims; during a simulated hover keep recording even while filming.
    if (!rec.active || (rec.replaying && !rec.forced) || !el || el.nodeType !== 1 || !anim?.effect || ignored(el) || rec.seenAnims.has(anim)) return;
    rec.seenAnims.add(anim);
    const timing = anim.effect.getTiming ? anim.effect.getTiming() : {};
    const scrollLinked = !!anim.timeline && anim.timeline !== document.timeline && !(anim.timeline instanceof DocumentTimeline);
    const t = now();
    const frames = framesOf(anim);
    if (!frames.length) return;
    // Merge transitions on the same element that start together (opacity + transform = one effect).
    const last = rec.raw[rec.raw.length - 1];
    const id = idOf(el);
    if (kind === 'transition' && last && last.kind === 'transition' && last.el.id === id && t - last.start < 60) {
      for (const f of frames) {
        const target = last.frames.find((x) => x.offset === f.offset);
        if (target) Object.assign(target.props, f.props); else last.frames.push(f);
      }
      return;
    }
    const iterations = timing.iterations ?? 1;
    // CSS animations keep animation-timing-function on each keyframe, not on the effect.
    let easing = timing.easing || 'linear';
    if (easing === 'linear' && frames[0]?.easing) {
      easing = frames[0].easing;
      if (frames.every((f, i) => i === frames.length - 1 || f.easing === easing)) frames.forEach((f) => { delete f.easing; });
    }
    rec.raw.push({
      kind, name: name || null, el: info(el), start: t + (Number(timing.delay) || 0), scrollLinked,
      duration: scrollLinked ? 1000 : Number(timing.duration) || 0, easing,
      delay: Number(timing.delay) || 0, iterations, direction: timing.direction || 'normal', fill: timing.fill || 'auto',
      frames, ...pointerState(el), pseudo: anim.effect.pseudoElement || null,
    });
  }

  function onAnimStart(e) {
    const a = e.target.getAnimations?.().find((x) => x.animationName === e.animationName && (x.effect?.pseudoElement || '') === (e.pseudoElement || ''));
    addAnim(e.target, 'css', a, e.animationName);
  }
  function onTransRun(e) {
    const a = e.target.getAnimations?.().find((x) => x.transitionProperty === e.propertyName && (x.effect?.pseudoElement || '') === (e.pseudoElement || ''));
    addAnim(e.target, 'transition', a, null);
  }
  function listen(root) {
    root.addEventListener('animationstart', onAnimStart, true);
    root.addEventListener('transitionrun', onTransRun, true);
  }
  listen(document);

  const kindOfAnim = (a) => (typeof CSSAnimation !== 'undefined' && a instanceof CSSAnimation ? 'css' : typeof CSSTransition !== 'undefined' && a instanceof CSSTransition ? 'transition' : 'waapi');

  const origAnimate = Element.prototype.animate;
  Element.prototype.animate = function patchedAnimate(...args) {
    const a = origAnimate.apply(this, args);
    try { addAnim(this, 'waapi', a, null); } catch (e) { console.debug('[Huescribe] waapi record failed', e); }
    return a;
  };

  // `new Animation(new KeyframeEffect(...)).play()` never goes through Element.animate.
  const origPlay = Animation.prototype.play;
  Animation.prototype.play = function patchedPlay(...args) {
    const r = origPlay.apply(this, args);
    try { const t = this.effect?.target; if (t) addAnim(t, kindOfAnim(this), this, this.animationName || null); } catch (e) { console.debug('[Huescribe] play record failed', e); }
    return r;
  };

  // Web components: watch their shadow roots too.
  const origAttachShadow = Element.prototype.attachShadow;
  Element.prototype.attachShadow = function patchedAttachShadow(...args) {
    const root = origAttachShadow.apply(this, args);
    try {
      listen(root);
      setTimeout(() => mo.observe(root, MO_OPTS), 0);
      rec.shadowRoots.push(new WeakRef(root));
    } catch (e) { console.debug('[Huescribe] shadow root hook failed', e); }
    return root;
  };

  // Catch-all: anything running that the events/hooks missed (other start paths, scroll timelines…).
  function sweep() {
    if (rec.replaying) return;
    const lists = [document.getAnimations?.() || []];
    for (const ref of rec.shadowRoots) { const r = ref.deref(); if (r?.getAnimations) lists.push(r.getAnimations()); }
    for (const list of lists) {
      for (const a of list) {
        if (rec.seenAnims.has(a)) continue;
        const t = a.effect?.target;
        if (t) addAnim(t, kindOfAnim(a), a, a.animationName || null);
      }
    }
  }
  let sweeps = 0;
  let sweepTimer = 0;
  // document.getAnimations() makes the browser bring styles up to date first. Run right after a
  // frame was drawn, when they already are: otherwise that style work (and anything it sets off,
  // like another extension's font failing to load) happens inside our call and is blamed on us.
  function afterPaint(fn) {
    requestAnimationFrame(() => setTimeout(fn, 0));
  }
  function tick() {
    if (!rec.active) { sweepTimer = 0; return; } // stopped: no timer left running
    const next = () => { sweeps++; sweepTimer = setTimeout(tick, sweeps < 100 ? 300 : 1000); }; // frequent during the first ~30s, then relaxed
    // A hidden tab draws no frames and nothing in it is seen moving: check again later.
    if (document.hidden) { next(); return; }
    sweepTimer = -1; // waiting for a frame (non-zero: a restart must not start a second loop)
    afterPaint(() => {
      if (!rec.active) { sweepTimer = 0; return; }
      try { sweep(); } catch (e) { console.debug('[Huescribe] sweep failed', e); }
      next();
    });
  }
  tick();

  // ---------- inline-style tweens (JS libraries) ----------

  function sample(el, t) {
    const st = el.style;
    if (!st) return;
    const v = {};
    let any = false;
    for (const p of TRACKED) { const x = st[p]; if (x) { v[p] = x; any = true; } }
    if (el instanceof SVGElement) {
      for (const a of SVG_ATTRS) {
        const x = el.getAttribute(a);
        if (x == null) continue;
        any = true;
        if (a === 'stroke-dashoffset') v.strokeDashoffset ??= x;
        else if (a === 'opacity') v.opacity ??= x;
        else if (a === 'transform') v.transform ??= x.replace(/(\d)\s+(-?\d)/g, '$1, $2');
        else v.shape = `${v.shape || ''}${a}=${x};`;
      }
    }
    let tw = rec.tweens.get(el);
    if (!any && !tw) return;
    if (!tw) { tw = { info: info(el), samples: [] }; rec.tweens.set(el, tw); }
    const last = tw.samples[tw.samples.length - 1];
    if (last && Math.abs(last.t - t) < 1) { last.v = v; return; } // several props set in one frame
    if (tw.samples.length >= 800) return;
    const s0 = { t, v };
    if (!last || t - last.t > 50) { try { s0.hover = el.matches(':hover') || !!el.closest(':hover:not(html):not(body)'); } catch { /* ignore */ } }
    tw.samples.push(s0);
    rec.sampleCount++;
  }

  const MO_OPTS = { attributes: true, attributeFilter: ['style', ...SVG_ATTRS], subtree: true, childList: true };
  const mo = new MutationObserver((muts) => {
    if (!rec.active || rec.replaying || rec.sampleCount > MAX_TWEEN_SAMPLES) return;
    const t = now();
    for (const m of muts) {
      if (m.type === 'attributes') {
        if (m.target.nodeType === 1 && !ignored(m.target)) sample(m.target, t);
      } else {
        // Elements often get their start state (opacity 0…) before being inserted, e.g. split text.
        for (const n of m.addedNodes) {
          if (n.nodeType !== 1 || ignored(n)) continue;
          if (n.hasAttribute('style')) sample(n, t);
          const styled = n.querySelectorAll ? n.querySelectorAll('[style]') : [];
          for (let i = 0; i < styled.length && i < 300; i++) sample(styled[i], t);
        }
      }
    }
  });
  mo.observe(document, MO_OPTS);

  // Channels used to measure a tween's progress curve (shared with the motion vocabulary),
  // plus top/left for position-based movement.
  function channels(v) {
    const out = { ...globalThis.HuescribeMotion.channels(v) };
    const px = (x) => { const m = /^(-?[\d.]+)px$/.exec(String(x || '')); return m ? +m[1] : undefined; };
    if (out.ty === undefined && px(v.top) !== undefined) out.ty = px(v.top);
    if (out.tx === undefined && px(v.left) !== undefined) out.tx = px(v.left);
    return out;
  }

  const EASE_GUESS = [
    [0.85, 'cubic-bezier(0.16, 1, 0.3, 1)'],   // strong ease-out (expo/power3-out)
    [0.65, 'cubic-bezier(0.33, 1, 0.68, 1)'],  // ease-out (cubic-out)
  ];

  function tweenItems() {
    const out = [];
    for (const [el, tw] of rec.tweens) {
      const s = tw.samples;
      if (s.length < 3) continue;
      // Split into separate animations at long idle gaps (> 1s). Within one, a value that was set
      // and then left alone before the motion began (e.g. opacity 0 at load, tween starts later)
      // is the real starting point; detected relative to the frame rate, so throttled tabs work too.
      const segs = [];
      let cur = [s[0]];
      for (let i = 1; i < s.length; i++) {
        if (s[i].t - s[i - 1].t > 1000) { segs.push(cur); cur = []; }
        cur.push(s[i]);
      }
      segs.push(cur);
      for (const seg of segs) {
        if (seg.length >= 3) {
          const gaps = seg.slice(2).map((x, i) => x.t - seg[i + 1].t);
          const frame = Math.max(8, median(gaps));
          if (seg[1].t - seg[0].t > Math.max(50, 2 * frame)) seg[0] = { ...seg[0], t: seg[1].t - frame, hover: seg[1].hover ?? seg[0].hover };
        }
      }
      for (const seg of segs) {
        if (seg.length < 3) continue;
        const a = seg[0]; const b = seg[seg.length - 1];
        const ca = channels(a.v); const cb = channels(b.v);
        let best = null; let delta = 0;
        for (const k of Object.keys(ca)) {
          if (typeof ca[k] !== 'number' || typeof cb[k] !== 'number') continue;
          const d = Math.abs(cb[k] - ca[k]) / (k === 'opacity' || k === 'sc' ? 0.01 : 1);
          if (d > delta) { delta = d; best = k; }
        }
        // Non-numeric changes (color, background position, SVG shape) still count as motion.
        const textual = Object.keys({ ...a.v, ...b.v }).some((k) => /color|backgroundPosition|shape|clipPath/i.test(k) && a.v[k] !== b.v[k]);
        if ((!best || delta < 2) && !textual) continue;
        const duration = b.t - a.t;
        if (duration < 50) continue;
        const progressAt = (frac) => {
          if (!best) return frac;
          const t = a.t + duration * frac;
          const smp = seg.reduce((p, x) => (Math.abs(x.t - t) < Math.abs(p.t - t) ? x : p), a);
          const v = channels(smp.v)[best];
          return (v - ca[best]) / ((cb[best] - ca[best]) || 1);
        };
        const p50 = progressAt(0.5); const p25 = progressAt(0.25);
        let easing = EASE_GUESS.find(([th]) => p50 >= th)?.[1];
        if (!easing) easing = p50 < 0.38 ? 'cubic-bezier(0.32, 0, 0.67, 0)' : p25 < 0.2 ? 'cubic-bezier(0.65, 0, 0.35, 1)' : 'linear';
        const from = {}; const to = {};
        for (const p of [...TRACKED, 'shape']) {
          if (a.v[p] !== undefined || b.v[p] !== undefined) {
            from[p] = a.v[p] ?? (p === 'opacity' ? '1' : 'none');
            to[p] = b.v[p] ?? (p === 'opacity' ? '1' : 'none');
          }
        }
        out.push({
          // Frame-sampled, so durations are rounded to 50ms.
          kind: 'js', name: null, el: tw.info, start: a.t, duration: Math.max(50, Math.round(duration / 50) * 50), easing, delay: 0, iterations: 1,
          direction: 'normal', fill: 'both', frames: [{ offset: 0, props: from }, { offset: 1, props: to }],
          hovered: !!(seg[0].hover || seg[1]?.hover), focused: false,
        });
      }
    }
    return out;
  }

  // ---------- grouping + description ----------

  const kebab = (p) => p.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());

  function signature(item) {
    const f0 = item.frames[0]?.props || {};
    const shape = Object.keys(f0).sort().map((k) => `${k}=${String(f0[k]).replace(/-?\d+(\.\d+)?/g, (n) => Math.round(+n))}`).join(';');
    return [item.kind === 'transition' ? 't' : 'a', Math.round(item.duration / 100), item.iterations, shape, item.name || ''].join('|');
  }

  function median(arr) {
    if (!arr.length) return 0;
    const s = [...arr].sort((x, y) => x - y);
    return s[Math.floor(s.length / 2)];
  }

  const NOUNS = { h1: tk('the main heading'), h2: tk('a heading'), h3: tk('a subheading'), h4: tk('a subheading'), p: tk('a paragraph'), a: tk('a link'), button: tk('a button'), li: tk('a list item'), figure: tk('an image'), img: tk('an image'), svg: tk('an icon'), section: tk('a section'), header: tk('the header'), footer: tk('the footer'), nav: tk('the navigation'), span: tk('a text label'), strong: tk('a text label'), div: tk('a block') };

  const ITEM_NOUNS = { li: [tk('List items'), tk('list item')], img: [tk('Images'), tk('image')], a: [tk('Links'), tk('link')], button: [tk('Buttons'), tk('button')], p: [tk('Lines'), tk('line')], h2: [tk('Headings'), tk('heading')], h3: [tk('Headings'), tk('heading')], svg: [tk('Icons'), tk('icon')] };

  function summary() {
    const items = [...rec.raw, ...tweenItems()].map((i) => ({ ...i, trigger: triggerOf(i) })).filter((i) => i.trigger !== 'hover' && i.trigger !== 'focus' && (i.duration >= 50 || i.scrollLinked));
    const groups = new Map();
    for (const it of items) {
      const key = `${signature(it)}|${it.el.container.id}|${it.trigger}|${it.pseudo || ''}|${it.scrollLinked ? 's' : ''}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(it);
    }
    const out = [];
    for (const [key, members] of groups) {
      // Ignore the same element animating the same way again (e.g. a repeated reveal), keep first.
      const uniq = [];
      const seenEl = new Set();
      for (const m of members.sort((a, b) => a.start - b.start)) { if (!seenEl.has(m.el.id)) { seenEl.add(m.el.id); uniq.push(m); } }
      const first = uniq[0];
      const starts = uniq.map((m) => m.start);
      // Average spacing is robust to frame quantization of individual start times.
      const rawStagger = uniq.length > 2 ? (starts[starts.length - 1] - starts[0]) / (starts.length - 1) : uniq.length === 2 ? starts[1] - starts[0] : 0;
      const stagger = rawStagger < 5 ? 0 : Math.round(rawStagger / 10) * 10;
      const texts = uniq.map((m) => m.el.ownText || m.el.text);
      const unit = uniq.length > 1 && texts.every((t) => t.length === 1) ? 'letter'
        : uniq.length > 1 && texts.every((t) => t && !/\s/.test(t)) ? 'word'
        : uniq.length > 1 ? 'item' : 'element';
      // Plain noun for the prompt (no page text) + the page's own text for the panel only.
      const tag = unit === 'element' ? first.el.tag : first.el.container.tag;
      const target = first.pseudo ? t('a decoration on {thing}', { thing: (NOUNS[first.el.tag] || 'an element').replace(/^an? /, 'the ') }) : NOUNS[tag] || tk('an element');
      const itemNoun = ITEM_NOUNS[first.el.tag] || null;
      const sourceText = unit === 'element' ? first.el.text : first.el.container.text;
      const g = {
        gid: key, target, sourceText, unit, count: uniq.length, stagger, start: Math.round(first.start), duration: first.duration,
        easing: first.easing, iterations: first.iterations === Infinity ? 'infinite' : first.iterations, direction: first.direction,
        trigger: first.trigger, source: first.kind, name: first.name, frames: first.frames.map((f) => ({ offset: f.offset, easing: f.easing, props: Object.fromEntries(Object.entries(f.props).map(([k, v]) => [kebab(k), v])) })),
        containerId: first.el.container.id, memberIds: uniq.map((m) => m.el.id), starts: starts.map((x) => Math.round(x)),
        pseudo: first.pseudo || null, scrollLinked: !!first.scrollLinked, itemNoun,
      };
      g.words = globalThis.HuescribeMotion.describe(g);
      out.push(g);
    }
    out.sort((a, b) => a.start - b.start);
    return { groups: out.slice(0, 40), recordingFor: Math.round(now()), samples: rec.sampleCount };
  }

  // ---------- replay, highlight, filmstrip ----------

  function el(id) { return rec.refs.get(id)?.deref() || null; }

  function framesFor(g, opts = {}) {
    const dist = opts.distance ?? 1;
    const scale = (v) => v.replace(/(-?\d*\.?\d+)px/g, (m, n) => `${+n * dist}px`);
    return g.frames.map((f) => {
      const k = { offset: f.offset };
      for (const [p, v] of Object.entries(f.props)) k[p.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = /transform|translate|filter/.test(p) ? scale(v) : v;
      if (f.easing) k.easing = f.easing;
      return k;
    });
  }

  /** Our own replays must never be recorded as page animations (the sweep would see them). */
  const markOwn = (a) => { rec.seenAnims.add(a); return a; };

  /** Start the group's animation on its elements. Returns the Animation objects. */
  function play(g, opts, fill) {
    const frames = framesFor(g, opts);
    const anims = [];
    rec.replaying = true;
    try {
      g.memberIds.forEach((id, i) => {
        const e = el(id);
        if (!e || !e.isConnected) return;
        anims.push(markOwn(origAnimate.call(e, frames, { duration: opts.duration ?? g.duration, easing: opts.easing ?? g.easing, delay: i * (opts.stagger ?? g.stagger), iterations: g.iterations === 'infinite' ? (opts.iterations ?? 2) : 1, direction: g.direction, fill, ...(g.pseudo ? { pseudoElement: g.pseudo } : {}) })));
      });
    } finally {
      setTimeout(() => { rec.replaying = false; }, 50);
    }
    return anims;
  }

  function groupBox(g) {
    const rects = g.memberIds.map(el).filter((e) => e && e.isConnected).map((e) => e.getBoundingClientRect()).filter((r) => r.width || r.height);
    const c = el(g.containerId);
    if (c?.isConnected && g.count > 1) rects.push(c.getBoundingClientRect());
    if (!rects.length) return null;
    return { left: Math.min(...rects.map((r) => r.left)), top: Math.min(...rects.map((r) => r.top)), right: Math.max(...rects.map((r) => r.right)), bottom: Math.max(...rects.map((r) => r.bottom)) };
  }

  const findGroup = (gid) => summary().groups.find((x) => x.gid === gid);

  /** Replay a group on the page. opts: duration / stagger / easing / distance (adjust preview),
   *  scroll (default true), speed (e.g. 0.25 for slow motion). */
  function replay(gid, opts = {}) {
    const g = findGroup(gid);
    if (!g) return { ok: false, error: tk('This animation is no longer in the recording.') };
    const container = el(g.containerId) || el(g.memberIds[0]);
    if (!container || !container.isConnected) return { ok: false, error: tk('The element is no longer on the page.') };
    const box = groupBox(g);
    const visible = box && box.bottom > 0 && box.top < innerHeight;
    if (opts.scroll === false && !visible) return { ok: false, offscreen: true };
    if (!visible) container.scrollIntoView({ block: 'center', behavior: 'instant' });
    const speed = opts.speed ?? 1;
    const o = { ...opts, duration: (opts.duration ?? g.duration) / speed, stagger: (opts.stagger ?? g.stagger) / speed };
    const anims = play(g, o, 'backwards');
    if (opts.flash !== false) flash(groupBox(g) || container.getBoundingClientRect());
    return { ok: anims.length > 0, played: anims.length };
  }

  /** Outline the group's elements on the page without playing anything. */
  function highlight(gid) {
    const g = findGroup(gid);
    const box = g && groupBox(g);
    if (!box || box.bottom < 0 || box.top > innerHeight) return { ok: false };
    flash(box);
    return { ok: true };
  }

  function flash(r) {
    const box = document.createElement('div');
    box.setAttribute('data-pl-ignore', '');
    box.style.cssText = `position:fixed;left:${r.left - 4}px;top:${r.top - 4}px;width:${r.right - r.left + 8}px;height:${r.bottom - r.top + 8}px;border:2px solid #7c3aed;border-radius:6px;pointer-events:none;z-index:2147483646;transition:opacity .6s ease;`;
    document.documentElement.appendChild(box);
    setTimeout(() => { box.style.opacity = '0'; }, 1200);
    setTimeout(() => box.remove(), 2000);
  }

  // Filmstrip: create the animation paused, then seek it to chosen moments so the panel can
  // screenshot exact frames (screenshots are rate-limited, so real-time capture would blur).
  let film = null;

  function filmStart(gid, opts = {}) {
    filmEnd();
    document.querySelectorAll('[data-pl-ignore]').forEach((n) => n.remove()); // no outlines in the frames
    const g = findGroup(gid);
    if (!g) return { ok: false, error: 'not found' };
    let box = groupBox(g);
    if (!box) return { ok: false, error: 'gone' };
    const visible = box.top >= 0 && box.bottom <= innerHeight;
    if (!visible) {
      if (!opts.scroll) return { ok: false, offscreen: true };
      (el(g.containerId) || el(g.memberIds[0])).scrollIntoView({ block: 'center', behavior: 'instant' });
    }
    const anims = play(g, opts, 'both');
    anims.forEach((a) => a.pause());
    rec.replaying = true;
    film = { anims };
    box = groupBox(g);
    const pad = 12 + Math.max(...g.frames.map((f) => Math.max(0, ...[...(Object.values(f.props).join(' ').matchAll(/(-?\d*\.?\d+)px/g))].map((m) => Math.abs(+m[1])))), 0);
    anims.forEach((a) => { a.currentTime = 0; });
    film.g = g; film.pad = pad;
    const total = g.iterations === 'infinite' ? g.duration : g.duration + g.stagger * (g.count - 1);
    return { ok: true, total, rect: filmRect(), vw: innerWidth, vh: innerHeight };
  }

  /** Where the filmed thing is right now (re-measured per frame in case the page scrolls). */
  function filmRect() {
    const box = groupBox(film.g);
    if (!box) return null;
    const p = film.pad;
    return { left: Math.max(0, box.left - p), top: Math.max(0, box.top - p), right: Math.min(innerWidth, box.right + p), bottom: Math.min(innerHeight, box.bottom + p) };
  }

  function filmSeek(t) {
    if (!film) return null;
    document.querySelectorAll('[data-pl-ignore]').forEach((n) => n.remove());
    film.anims.forEach((a) => { a.currentTime = t; });
    return filmRect();
  }

  function filmEnd() {
    if (!film) return;
    film.anims.forEach((a) => { try { a.cancel(); } catch { /* already gone */ } });
    film = null;
    setTimeout(() => { rec.replaying = false; }, 50);
  }

  /** Groups with at least one member inside `root` (an element tagged by the picker). */
  function groupsWithin(selector) {
    const root = document.querySelector(selector);
    if (!root) return [];
    return summary().groups.filter((g) => g.memberIds.some((id) => { const e = el(id); return e && (within(root, e) || within(e, root)); }))
      .map((g) => ({ ...g, partOf: g.count > 1 && !g.memberIds.every((id) => { const e = el(id); return e && within(root, e); }) }));
  }

  /** `outer` contains `inner`, also across shadow-DOM boundaries (web components). */
  function within(outer, inner) {
    for (let n = inner; n; n = n.parentNode || n.host) if (n === outer) return true;
    return false;
  }

  /** For "Press it to catch it": the next click inside the picked element does not leave the page. */
  function holdNavigationOnce(selector) {
    const stop = (e) => {
      const target = document.querySelector(selector);
      const a = e.target.closest?.('a[href]');
      if (!target || !a || !target.contains(e.target)) return;
      const href = a.getAttribute('href') || '';
      if (href.startsWith('#') || href.startsWith('javascript:')) return;
      e.preventDefault();
      removeEventListener('click', stop, true);
    };
    addEventListener('click', stop, true);
    setTimeout(() => removeEventListener('click', stop, true), 20000);
  }

  /**
   * Pointer test (9.3): the panel moves a visible cursor onto a pick, presses it and lets go, one
   * step at a time (so the cursor on the page can follow). Each step fires the same events a real
   * pointer would, so effects driven by JavaScript (Framer Motion, GSAP, React handlers) play;
   * CSS :hover / :active can't be set this way (the panel shows those from the analyzer's rules).
   * Never sends a click: links don't navigate and forms don't submit (and both are blocked while
   * the test runs, in case a page turns a press into one).
   */
  function pointerBegin(selector) {
    const target = document.querySelector(selector);
    if (!target) return null;
    pointerEnd(); // a test still running for an older pick
    const r = target.getBoundingClientRect();
    const at = { bubbles: true, cancelable: true, composed: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, view: window };
    const outside = target.parentElement || document.body;
    const fire = (type, Ctor, extra = {}) => { try { target.dispatchEvent(new Ctor(type, { ...at, ...extra })); } catch { /* old browsers */ } };
    // While the test runs: no clicks, no form submits, from anything we set off.
    // Only clicks and submits the test itself set off (untrusted); the person's own clicks still work.
    const block = (e) => { if (!e.isTrusted) { e.preventDefault(); e.stopImmediatePropagation(); } };
    addEventListener('click', block, true);
    addEventListener('submit', block, true);
    const t0 = now();
    rec.pointerTest = { target, fire, outside, block, t0, phases: [{ trigger: 'hover-js', from: t0, to: Infinity }] };
    rec.forced = { from: t0, to: Infinity, trigger: 'hover-js' };
    fire('pointerover', PointerEvent, { relatedTarget: outside, pointerType: 'mouse' });
    fire('pointerenter', PointerEvent, { bubbles: false, relatedTarget: outside, pointerType: 'mouse' });
    fire('mouseover', MouseEvent, { relatedTarget: outside });
    fire('mouseenter', MouseEvent, { bubbles: false, relatedTarget: outside });
    fire('pointermove', PointerEvent, { pointerType: 'mouse' });
    fire('mousemove', MouseEvent);
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  }
  /** Press (down = true) or let go (down = false). What starts from the press on is a press effect. */
  function pointerPress(down) {
    const pt = rec.pointerTest;
    if (!pt) return false;
    const t = now();
    pt.phases[pt.phases.length - 1].to = t;
    pt.phases.push({ trigger: down ? 'press-js' : 'hover-js', from: t, to: Infinity });
    rec.forced = { from: t, to: Infinity, trigger: down ? 'press-js' : 'hover-js' };
    if (down) {
      pt.fire('pointerdown', PointerEvent, { pointerType: 'mouse', button: 0, buttons: 1, isPrimary: true });
      pt.fire('mousedown', MouseEvent, { button: 0, buttons: 1 });
    } else {
      pt.fire('pointerup', PointerEvent, { pointerType: 'mouse', button: 0, buttons: 0, isPrimary: true });
      pt.fire('mouseup', MouseEvent, { button: 0, buttons: 0 });
    }
    return true;
  }
  /** Move away (the effects play back), then report what played, hover and press apart. */
  async function pointerEnd(settle = 0) {
    const pt = rec.pointerTest;
    if (!pt) return { hover: [], press: [] };
    const t = now();
    pt.phases[pt.phases.length - 1].to = t;
    rec.forced = null;
    pt.fire('pointerout', PointerEvent, { relatedTarget: pt.outside, pointerType: 'mouse' });
    pt.fire('pointerleave', PointerEvent, { bubbles: false, relatedTarget: pt.outside, pointerType: 'mouse' });
    pt.fire('mouseout', MouseEvent, { relatedTarget: pt.outside });
    pt.fire('mouseleave', MouseEvent, { bubbles: false, relatedTarget: pt.outside });
    // Remember on the recorded animations themselves, so later lookups (filmstrips) agree.
    for (const i of rec.raw) {
      const ph = pt.phases.find((p) => i.start >= p.from && i.start <= p.to);
      if (ph) i.forcedTrigger = ph.trigger;
    }
    if (settle) await new Promise((res) => setTimeout(res, settle));
    removeEventListener('click', pt.block, true);
    removeEventListener('submit', pt.block, true);
    rec.pointerTest = null;
    const groups = summary().groups.filter((g) => g.start >= pt.t0);
    return { hover: groups.filter((g) => g.trigger === 'hover-js'), press: groups.filter((g) => g.trigger === 'press-js') };
  }

  /** The older one-call hover check (no cursor, no press): kept for callers that only need hover. */
  async function catchHover(selector) {
    if (!pointerBegin(selector)) return [];
    await new Promise((res) => setTimeout(res, 900));
    return (await pointerEnd(500)).hover;
  }

  /**
   * CSS animations that finished before we were watching have nothing to film. Restart them once
   * (the page shows them again, like the replay preview) so they are recorded, keeping the trigger
   * they really have (e.g. 'load'). Resolves when they have played.
   */
  async function restartCss(selector, names, trigger) {
    const root = document.querySelector(selector);
    if (!root) return 0;
    const els = [root, ...root.querySelectorAll('*')].filter((e) => {
      const cs = getComputedStyle(e);
      const n = cs.animationName;
      // Scroll-linked animations follow the scroll position: restarting would break that.
      if (cs.animationTimeline && cs.animationTimeline !== 'auto') return false;
      return n && n !== 'none' && n.split(',').some((x) => names.includes(x.trim()));
    }).slice(0, 30);
    if (!els.length) return 0;
    const t0 = now();
    rec.forced = { from: t0, to: t0 + 1500, trigger };
    let longest = 0;
    for (const e of els) {
      const cs = getComputedStyle(e);
      longest = Math.max(longest, ...cs.animationDuration.split(',').map((d) => parseFloat(d) * (d.trim().endsWith('ms') ? 1 : 1000) || 0), 0)
        + Math.max(0, ...cs.animationDelay.split(',').map((d) => parseFloat(d) * (d.trim().endsWith('ms') ? 1 : 1000) || 0));
      e.style.animationName = 'none';
    }
    void document.body.offsetWidth; // reflow so the animation really starts over
    for (const e of els) e.style.animationName = '';
    await new Promise((res) => setTimeout(res, Math.min(2500, longest + 150)));
    for (const i of rec.raw) if (i.start >= t0 && i.start <= t0 + 1500) i.forcedTrigger = trigger;
    rec.forced = null;
    return els.length;
  }

  /** Groups that played (again) since `t` on the recorder's clock: what a recording caught. */
  function groupsSince(t) {
    return summary().groups.filter((g) => g.starts.some((s) => s >= t) || g.start >= t);
  }

  /** Panel closed: record nothing and stop watching until it opens again. */
  function stop() {
    rec.active = false;
    mo.disconnect();
  }
  /** Panel opened again on this page: what happened in between was not seen. */
  function start() {
    if (rec.active) return;
    rec.active = true;
    rec.lateStart = true;
    mo.observe(document, MO_OPTS);
    for (const r of rec.shadowRoots) { const root = r.deref(); if (root) mo.observe(root, MO_OPTS); }
    sweeps = 0;
    if (!sweepTimer) tick();
  }

  Object.assign(rec, { now, stop, start, groupsSince, holdNavigationOnce, catchHover, pointerBegin, pointerPress, pointerEnd, restartCss, summary, replay, highlight, filmStart, filmSeek, filmEnd, groupsWithin });
})();
