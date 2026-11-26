// Huescribe motion words: turns keyframes + timing into short, simple words.
//   name      "Letters rise in one by one"
//   sentence  "Each letter rises up and fades in, one by one. Smooth, about 1 second."
//   when      "On load"
//   numbers   "moves 40px, 600ms each, 40ms apart, strong ease-out"   (only under Details)
// Loaded in the page (MAIN world for the recorder, isolated world for the analyzer) and the panel.

(() => {
  if (globalThis.HuescribeMotion?.version === 4) return;

  // In the page's MAIN world (recorder) i18n.js isn't loaded and a page may have its own global `t`:
  // use Huescribe's runtime only when it is really there, else English (the panel can word it again).
  const L10N = () => { const I = globalThis.I18N; return I && Array.isArray(I.LANGS) && typeof I.t === 'function' && typeof I.tn === 'function' ? I : null; };
  const fill = (s, v) => (v ? s.replace(/\{(\w+)\}/g, (m, k) => (k in v ? String(v[k]) : m)) : s);
  const t = (s, v) => { const I = L10N(); return I ? I.t(s, v) : fill(s, v); };
  const tn = (n, one, other, v) => { const I = L10N(); return I ? I.tn(n, one, other, v) : fill(n === 1 ? one : other, Object.assign({ n }, v)); };
  const tk = (s) => s;

  const norm = (k) => k.toLowerCase().replace(/-/g, '');
  const num = (v) => { const m = /-?\d*\.?\d+/.exec(String(v ?? '')); return m ? parseFloat(m[0]) : undefined; };

  /** Numeric channels from a keyframe's props (opacity, movement, scale, rotation, blur, size, …). */
  function channels(props = {}) {
    const p = {};
    for (const [k, v] of Object.entries(props)) p[norm(k)] = String(v);
    const out = {};
    if (p.opacity !== undefined) out.opacity = parseFloat(p.opacity);
    const parts = [p.translate && `translate(${p.translate.trim().split(/\s+/).join(',')})`, p.rotate && `rotate(${p.rotate})`, p.scale && `scale(${p.scale.trim().split(/\s+/).join(',')})`, p.transform && p.transform !== 'none' ? p.transform : ''].filter(Boolean).join(' ');
    if (parts && !/translate\([^)]*%/.test(parts)) {
      try {
        const m = new DOMMatrixReadOnly(parts);
        out.tx = m.m41; out.ty = m.m42; out.sc = Math.hypot(m.a, m.b); out.rot = Math.atan2(m.b, m.a) * 180 / Math.PI;
        const turns = /rotate\((-?[\d.]+)(deg|turn)\)/.exec(parts);
        if (turns) out.rot = turns[2] === 'turn' ? +turns[1] * 360 : +turns[1];
      } catch { /* unparsable transform */ }
    } else if (/translate\([^)]*%/.test(parts)) {
      const m = /translate[XY]?\((-?[\d.]+)%(?:,\s*(-?[\d.]+)%)?/.exec(parts);
      if (m) { out.txPct = /translateY/.test(parts) ? 0 : +m[1]; out.tyPct = /translateY/.test(parts) ? +m[1] : +(m[2] || 0); }
    } else if (p.transform === 'none') { out.tx = 0; out.ty = 0; out.sc = 1; out.rot = 0; }
    const blur = /blur\(([\d.]+)px\)/.exec(p.filter || '');
    if (blur) out.blur = +blur[1];
    else if (p.filter === 'none') out.blur = 0;
    if (p.clippath) out.clip = p.clippath;
    if (p.strokedashoffset !== undefined) out.dash = num(p.strokedashoffset);
    if (p.width !== undefined) out.w = num(p.width);
    if (p.height !== undefined) out.h = num(p.height);
    if (p.backgroundposition !== undefined) out.bgpos = p.backgroundposition;
    if (p.color !== undefined) out.color = p.color;
    if (p.backgroundcolor !== undefined) out.bg = p.backgroundcolor;
    if (p.letterspacing !== undefined) out.ls = num(p.letterspacing);
    if (p.shape !== undefined) out.shape = p.shape;
    return out;
  }

  const delta = (a, b, k, def) => (b[k] ?? def) - (a[k] ?? def);

  /** Pattern for one element: { name, verb, kind, dist } — verb is 3rd person singular, simple words. */
  function classify(frames, iterations) {
    const c0 = channels(frames[0]?.props || {});
    const c1 = channels(frames[frames.length - 1]?.props || {});
    const mid = channels(frames[Math.floor(frames.length / 2)]?.props || {});
    const loop = iterations === 'infinite' || iterations === Infinity;
    if (loop) {
      const dy = delta(c0, mid, 'ty', 0); const dx = delta(c0, mid, 'tx', 0);
      if (c0.bgpos !== undefined && c0.bgpos !== c1.bgpos) return { name: tk('Moving background'), verb: tk('has a background that keeps moving'), kind: 'loop' };
      if (Math.abs(dy) >= 2) return { name: tk('Float'), verb: tk('floats up and down'), kind: 'loop', dist: Math.abs(dy) };
      if (Math.abs(dx) >= 2 || Math.abs(delta(c0, c1, 'txPct', 0)) >= 5) return { name: Math.abs(delta(c0, c1, 'txPct', 0)) >= 20 || Math.abs(delta(c0, c1, 'tx', 0)) >= 100 ? tk('Scrolling strip') : tk('Sway'), verb: Math.abs(delta(c0, c1, 'txPct', 0)) >= 20 || Math.abs(delta(c0, c1, 'tx', 0)) >= 100 ? tk('keeps scrolling sideways') : tk('sways side to side'), kind: 'loop', dist: Math.abs(dx) };
      if (Math.abs(delta(c0, mid, 'sc', 1)) > 0.01) return { name: tk('Pulse'), verb: tk('grows and shrinks'), kind: 'loop' };
      if (Math.abs(delta(c0, c1, 'rot', 0)) >= 180) return { name: tk('Spin'), verb: tk('spins around'), kind: 'loop' };
      if (Math.abs(delta(c0, mid, 'opacity', 1)) > 0.05) return { name: tk('Blink'), verb: tk('fades in and out'), kind: 'loop' };
      if (c0.color !== undefined && c0.color !== mid.color) return { name: tk('Color cycle'), verb: tk('keeps changing color'), kind: 'loop' };
      return { name: tk('Loop'), verb: tk('keeps moving'), kind: 'loop' };
    }
    const fadeIn = c0.opacity !== undefined && (c1.opacity ?? 1) > c0.opacity + 0.05;
    const fadeOut = c0.opacity !== undefined && c1.opacity !== undefined && c1.opacity < c0.opacity - 0.05;
    const dy = (c0.ty ?? 0) - (c1.ty ?? 0); const dx = (c0.tx ?? 0) - (c1.tx ?? 0);
    const dyPct = (c0.tyPct ?? 0) - (c1.tyPct ?? 0); const dxPct = (c0.txPct ?? 0) - (c1.txPct ?? 0);
    const ds = (c1.sc ?? 1) - (c0.sc ?? 1);
    const fade = (plain, faded) => (fadeIn ? faded : plain);
    let r;
    if (c0.dash !== undefined && c1.dash !== undefined && Math.abs(c0.dash) > Math.abs(c1.dash)) r = { name: tk('Draw in'), verb: tk('draws itself in, like a pen line') };
    else if (c0.clip && c0.clip !== c1.clip) r = { name: tk('Wipe in'), verb: fade(tk('wipes into view'), tk('wipes into view and fades in')) };
    else if ((c0.blur ?? 0) > (c1.blur ?? 0)) r = { name: tk('Blur in'), verb: fade(tk('goes from blurry to sharp'), tk('goes from blurry to sharp and fades in')) };
    else if (ds > 0.02) r = { name: tk('Pop in'), verb: fade(tk('pops in from small'), tk('pops in from small and fades in')) };
    else if (ds < -0.02) r = { name: tk('Zoom in'), verb: fade(tk('shrinks into place from big'), tk('shrinks into place from big and fades in')) };
    else if (Math.abs(dy) >= 2 || Math.abs(dyPct) >= 5) r = (dy > 0 || dyPct > 0) ? { name: fadeIn ? tk('Rise in') : tk('Rise'), verb: fade(tk('rises up'), tk('rises up and fades in')), dist: Math.abs(dy) } : { name: tk('Drop in'), verb: fade(tk('drops down'), tk('drops down and fades in')), dist: Math.abs(dy) };
    else if (Math.abs(dx) >= 2 || Math.abs(dxPct) >= 5) r = { name: tk('Slide in'), verb: (dx || dxPct) > 0 ? fade(tk('slides in from the right'), tk('slides in from the right and fades in')) : fade(tk('slides in from the left'), tk('slides in from the left and fades in')), dist: Math.abs(dx) };
    else if (Math.abs(delta(c0, c1, 'rot', 0)) > 1) r = { name: tk('Twist in'), verb: fade(tk('twists into place'), tk('twists into place and fades in')) };
    else if (c0.w !== undefined && c1.w !== undefined && c1.w > c0.w) r = { name: tk('Grow'), verb: tk('grows wider') };
    else if (c0.h !== undefined && c1.h !== undefined && c1.h > c0.h) r = { name: tk('Grow'), verb: tk('grows taller') };
    else if (c0.ls !== undefined && c1.ls !== undefined && c0.ls !== c1.ls) r = { name: tk('Letter spread'), verb: c0.ls > c1.ls ? tk('letters move closer together') : tk('letters spread apart') };
    else if (fadeIn) r = { name: tk('Fade in'), verb: tk('fades in') };
    else if (fadeOut) r = { name: tk('Fade out'), verb: tk('fades out'), kind: 'exit' };
    else if ((c0.color !== undefined && c0.color !== c1.color) || (c0.bg !== undefined && c0.bg !== c1.bg)) r = { name: tk('Color change'), verb: tk('changes color') };
    else if (c0.shape !== undefined && c0.shape !== c1.shape) r = { name: tk('Shape change'), verb: tk('changes shape') };
    // There and back (ends where it started): typical button-press and attention effects.
    else if (Math.abs(delta(c0, mid, 'sc', 1)) > 0.01) r = delta(c0, mid, 'sc', 1) < 0 ? { name: tk('Press'), verb: tk('shrinks a little and springs back') } : { name: tk('Bump'), verb: tk('grows a little and settles back') };
    else if (Math.abs(delta(c0, mid, 'ty', 0)) >= 2) r = delta(c0, mid, 'ty', 0) < 0 ? { name: tk('Hop'), verb: tk('hops up and lands back') } : { name: tk('Dip'), verb: tk('dips down and comes back') };
    else if (Math.abs(delta(c0, mid, 'tx', 0)) >= 2) r = { name: tk('Nudge'), verb: tk('moves sideways a little and comes back') };
    else if (Math.abs(delta(c0, mid, 'rot', 0)) > 1) r = { name: tk('Wiggle'), verb: tk('tilts and comes back') };
    else if (Math.abs(delta(c0, mid, 'opacity', 1)) > 0.05) r = { name: tk('Flash'), verb: tk('dims for a moment and comes back') };
    else r = { name: tk('Animation'), verb: tk('moves') };
    return { kind: r.name && /^(Press|Bump|Hop|Dip|Nudge|Wiggle|Flash)$/.test(r.name) ? 'effect' : 'entrance', ...r };
  }

  function speedWord(ms) { return ms < 300 ? tk('Fast') : ms < 800 ? tk('Smooth') : ms < 1600 ? tk('Slow') : tk('Very slow'); }

  const bouncy = (e) => /cubic-bezier\([^)]*,\s*1\.\d|back|elastic|spring/.test(e || '');

  /** Simple feel word for an easing curve (also used by adjust.js labels). */
  function easingWord(e) {
    if (!e || e === 'linear') return tk('steady');
    if (bouncy(e)) return tk('bouncy');
    if (/0\.16,\s*1,\s*0\.3,\s*1|0\.22,\s*1|expo|power[34]/.test(e)) return tk('soft finish');
    if (/ease-in-out|0\.65,\s*0,\s*0\.35,\s*1|0\.4,\s*0,\s*0\.2,\s*1|^ease$/.test(e)) return tk('gentle');
    if (/ease-out|0\.33,\s*1|0\.25,\s*1/.test(e)) return tk('soft finish');
    if (/ease-in|0\.32,\s*0,\s*0\.67,\s*0/.test(e)) return tk('speeds up');
    return tk('custom');
  }

  const EASING_NAMES = { 'cubic-bezier(0.16, 1, 0.3, 1)': 'strong ease-out', 'cubic-bezier(0.33, 1, 0.68, 1)': 'ease-out', 'cubic-bezier(0.65, 0, 0.35, 1)': 'ease-in-out', 'cubic-bezier(0.32, 0, 0.67, 0)': 'ease-in', 'cubic-bezier(0.34, 1.56, 0.64, 1)': 'overshoot' };
  // Stays English in the output (the panel compares and sorts by it); translated where it is shown.
  const WHEN = { load: tk('On load'), scroll: tk('On scroll'), loop: tk('Loops'), later: tk('Later'), hover: tk('On hover'), focus: tk('On click'), click: tk('On click'), 'hover-js': tk('On hover'), 'press-js': tk('On click'), scrolllinked: tk('As you scroll') };
  const PLURAL = { letter: [tk('Letters'), tk('letter')], word: [tk('Words'), tk('word')], item: [tk('Items'), tk('item')] };

  function timeWords(ms) {
    if (ms < 900) return t('under a second');
    const s = Math.round(ms / 1000);
    return tn(s, 'about {n} second', 'about {n} seconds');
  }

  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const lower1 = (s) => s.charAt(0).toLowerCase() + s.slice(1);

  /**
   * @param {{frames, iterations, duration, stagger, count, unit, easing, trigger, target, itemNoun?, scrollLinked?}} g
   *   target: plain noun phrase like "the main heading" (never page text)
   */
  // While hovered/pressed nothing "comes in": entrance names become what the effect does to it.
  const INTERACTION = { 'Pop in': [tk('Grow'), tk('grows a little')], 'Zoom in': [tk('Grow'), tk('grows a little')], 'Rise in': [tk('Lift'), tk('lifts up a little')], 'Drop in': [tk('Sink'), tk('moves down a little')], 'Slide in': [tk('Shift'), tk('shifts sideways')], 'Twist in': [tk('Tilt'), tk('tilts')], 'Fade in': [tk('Brighten'), tk('becomes more visible')], 'Fade out': [tk('Fade'), tk('fades a little')] };

  function describe(g) {
    let c = classify(g.frames, g.iterations);
    // Only when it stays visible the whole time (a menu that fades in while dropping really appears).
    const op = (f) => (f?.props?.opacity === undefined ? 1 : Number(f.props.opacity));
    const staysVisible = Math.abs(op(g.frames?.[0]) - op(g.frames?.[g.frames.length - 1])) < 0.05;
    if (/^(hover|hover-js|press-js|focus|click)$/.test(g.trigger) && INTERACTION[c.name] && staysVisible) {
      const [name, verb] = INTERACTION[c.name];
      c = { ...c, name, verb, kind: 'effect' };
    }
    const many = g.count > 1 && c.kind !== 'loop';
    const [plural, single] = g.unit === 'item' && g.itemNoun ? g.itemNoun : PLURAL[g.unit] || PLURAL.item;
    // Names and verbs are tk() English from classify / INTERACTION / PLURAL / itemNoun.
    const cName = t(c.name); const cVerb = t(c.verb);
    const name = g.scrollLinked ? t('{motion} as you scroll', { motion: cName }) : many ? t('{things} {motion} one by one', { things: t(plural), motion: lower1(cName) }) : cName;
    const speed = bouncy(g.easing) ? t('{speed} and bouncy', { speed: t(speedWord(g.duration)) }) : t(speedWord(g.duration));
    let sentence;
    if (g.scrollLinked) sentence = t('{action} as you scroll the page.', { action: cap(cVerb) });
    else if (c.kind === 'loop') sentence = t('{action}, again and again. {speed}.', { action: cap(cVerb), speed });
    else {
      const total = g.duration + (many ? g.stagger * (g.count - 1) : 0);
      sentence = `${many ? t('Each {thing} {action}, one by one.', { thing: t(single), action: cVerb }) : `${cap(cVerb)}.`} ${t('{speed}, {time}.', { speed, time: timeWords(total) })}`;
    }
    const when = g.scrollLinked ? WHEN.scrolllinked : WHEN[g.trigger] || tk('On load');
    const numbers = [
      c.dist ? t('moves {px}', { px: `${Math.round(c.dist)}px` }) : null,
      g.scrollLinked ? t('linked to scroll position') : many ? t('{ms} each', { ms: `${g.duration}ms` }) : `${g.duration}ms`,
      many && g.stagger ? t('{ms} apart', { ms: `${g.stagger}ms` }) : null,
      c.kind === 'loop' ? t('loops forever') : null,
      EASING_NAMES[g.easing] || g.easing,
    ].filter(Boolean).join(', ');
    return { name, sentence, when, numbers, kind: c.kind };
  }

  globalThis.HuescribeMotion = { version: 4, describe, classify, channels, easingWord, speedWord };
})();
