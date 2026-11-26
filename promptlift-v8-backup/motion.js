// PromptLift motion words: turns keyframes + timing into short, simple words.
//   name      "Letters rise in one by one"
//   sentence  "Each letter rises up and fades in, one by one. Smooth, about 1 second."
//   when      "On load"
//   numbers   "moves 40px, 600ms each, 40ms apart, strong ease-out"   (only under Details)
// Loaded in the page (MAIN world for the recorder, isolated world for the analyzer) and the panel.

(() => {
  if (globalThis.PromptLiftMotion?.version === 4) return;

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
      if (c0.bgpos !== undefined && c0.bgpos !== c1.bgpos) return { name: 'Moving background', verb: 'has a background that keeps moving', kind: 'loop' };
      if (Math.abs(dy) >= 2) return { name: 'Float', verb: 'floats up and down', kind: 'loop', dist: Math.abs(dy) };
      if (Math.abs(dx) >= 2 || Math.abs(delta(c0, c1, 'txPct', 0)) >= 5) return { name: Math.abs(delta(c0, c1, 'txPct', 0)) >= 20 || Math.abs(delta(c0, c1, 'tx', 0)) >= 100 ? 'Scrolling strip' : 'Sway', verb: Math.abs(delta(c0, c1, 'txPct', 0)) >= 20 || Math.abs(delta(c0, c1, 'tx', 0)) >= 100 ? 'keeps scrolling sideways' : 'sways side to side', kind: 'loop', dist: Math.abs(dx) };
      if (Math.abs(delta(c0, mid, 'sc', 1)) > 0.01) return { name: 'Pulse', verb: 'grows and shrinks', kind: 'loop' };
      if (Math.abs(delta(c0, c1, 'rot', 0)) >= 180) return { name: 'Spin', verb: 'spins around', kind: 'loop' };
      if (Math.abs(delta(c0, mid, 'opacity', 1)) > 0.05) return { name: 'Blink', verb: 'fades in and out', kind: 'loop' };
      if (c0.color !== undefined && c0.color !== mid.color) return { name: 'Color cycle', verb: 'keeps changing color', kind: 'loop' };
      return { name: 'Loop', verb: 'keeps moving', kind: 'loop' };
    }
    const fadeIn = c0.opacity !== undefined && (c1.opacity ?? 1) > c0.opacity + 0.05;
    const fadeOut = c0.opacity !== undefined && c1.opacity !== undefined && c1.opacity < c0.opacity - 0.05;
    const dy = (c0.ty ?? 0) - (c1.ty ?? 0); const dx = (c0.tx ?? 0) - (c1.tx ?? 0);
    const dyPct = (c0.tyPct ?? 0) - (c1.tyPct ?? 0); const dxPct = (c0.txPct ?? 0) - (c1.txPct ?? 0);
    const ds = (c1.sc ?? 1) - (c0.sc ?? 1);
    const fade = fadeIn ? ' and fades in' : '';
    let r;
    if (c0.dash !== undefined && c1.dash !== undefined && Math.abs(c0.dash) > Math.abs(c1.dash)) r = { name: 'Draw in', verb: 'draws itself in, like a pen line' };
    else if (c0.clip && c0.clip !== c1.clip) r = { name: 'Wipe in', verb: `wipes into view${fade}` };
    else if ((c0.blur ?? 0) > (c1.blur ?? 0)) r = { name: 'Blur in', verb: `goes from blurry to sharp${fade}` };
    else if (ds > 0.02) r = { name: 'Pop in', verb: `pops in from small${fade}` };
    else if (ds < -0.02) r = { name: 'Zoom in', verb: `shrinks into place from big${fade}` };
    else if (Math.abs(dy) >= 2 || Math.abs(dyPct) >= 5) r = (dy > 0 || dyPct > 0) ? { name: fadeIn ? 'Rise in' : 'Rise', verb: `rises up${fade}`, dist: Math.abs(dy) } : { name: 'Drop in', verb: `drops down${fade}`, dist: Math.abs(dy) };
    else if (Math.abs(dx) >= 2 || Math.abs(dxPct) >= 5) r = { name: 'Slide in', verb: `slides in from the ${(dx || dxPct) > 0 ? 'right' : 'left'}${fade}`, dist: Math.abs(dx) };
    else if (Math.abs(delta(c0, c1, 'rot', 0)) > 1) r = { name: 'Twist in', verb: `twists into place${fade}` };
    else if (c0.w !== undefined && c1.w !== undefined && c1.w > c0.w) r = { name: 'Grow', verb: 'grows wider' };
    else if (c0.h !== undefined && c1.h !== undefined && c1.h > c0.h) r = { name: 'Grow', verb: 'grows taller' };
    else if (c0.ls !== undefined && c1.ls !== undefined && c0.ls !== c1.ls) r = { name: 'Letter spread', verb: c0.ls > c1.ls ? 'letters move closer together' : 'letters spread apart' };
    else if (fadeIn) r = { name: 'Fade in', verb: 'fades in' };
    else if (fadeOut) r = { name: 'Fade out', verb: 'fades out', kind: 'exit' };
    else if ((c0.color !== undefined && c0.color !== c1.color) || (c0.bg !== undefined && c0.bg !== c1.bg)) r = { name: 'Color change', verb: 'changes color' };
    else if (c0.shape !== undefined && c0.shape !== c1.shape) r = { name: 'Shape change', verb: 'changes shape' };
    // There and back (ends where it started): typical button-press and attention effects.
    else if (Math.abs(delta(c0, mid, 'sc', 1)) > 0.01) r = delta(c0, mid, 'sc', 1) < 0 ? { name: 'Press', verb: 'shrinks a little and springs back' } : { name: 'Bump', verb: 'grows a little and settles back' };
    else if (Math.abs(delta(c0, mid, 'ty', 0)) >= 2) r = delta(c0, mid, 'ty', 0) < 0 ? { name: 'Hop', verb: 'hops up and lands back' } : { name: 'Dip', verb: 'dips down and comes back' };
    else if (Math.abs(delta(c0, mid, 'tx', 0)) >= 2) r = { name: 'Nudge', verb: 'moves sideways a little and comes back' };
    else if (Math.abs(delta(c0, mid, 'rot', 0)) > 1) r = { name: 'Wiggle', verb: 'tilts and comes back' };
    else if (Math.abs(delta(c0, mid, 'opacity', 1)) > 0.05) r = { name: 'Flash', verb: 'dims for a moment and comes back' };
    else r = { name: 'Animation', verb: 'moves' };
    return { kind: r.name && /^(Press|Bump|Hop|Dip|Nudge|Wiggle|Flash)$/.test(r.name) ? 'effect' : 'entrance', ...r };
  }

  function speedWord(ms) { return ms < 300 ? 'Fast' : ms < 800 ? 'Smooth' : ms < 1600 ? 'Slow' : 'Very slow'; }

  const bouncy = (e) => /cubic-bezier\([^)]*,\s*1\.\d|back|elastic|spring/.test(e || '');

  /** Simple feel word for an easing curve (also used by adjust.js labels). */
  function easingWord(e) {
    if (!e || e === 'linear') return 'steady';
    if (bouncy(e)) return 'bouncy';
    if (/0\.16,\s*1,\s*0\.3,\s*1|0\.22,\s*1|expo|power[34]/.test(e)) return 'soft finish';
    if (/ease-in-out|0\.65,\s*0,\s*0\.35,\s*1|0\.4,\s*0,\s*0\.2,\s*1|^ease$/.test(e)) return 'gentle';
    if (/ease-out|0\.33,\s*1|0\.25,\s*1/.test(e)) return 'soft finish';
    if (/ease-in|0\.32,\s*0,\s*0\.67,\s*0/.test(e)) return 'speeds up';
    return 'custom';
  }

  const EASING_NAMES = { 'cubic-bezier(0.16, 1, 0.3, 1)': 'strong ease-out', 'cubic-bezier(0.33, 1, 0.68, 1)': 'ease-out', 'cubic-bezier(0.65, 0, 0.35, 1)': 'ease-in-out', 'cubic-bezier(0.32, 0, 0.67, 0)': 'ease-in', 'cubic-bezier(0.34, 1.56, 0.64, 1)': 'overshoot' };
  const WHEN = { load: 'On load', scroll: 'On scroll', loop: 'Loops', later: 'Later', hover: 'On hover', focus: 'On click', click: 'On click', 'hover-js': 'On hover', scrolllinked: 'As you scroll' };
  const PLURAL = { letter: ['Letters', 'letter'], word: ['Words', 'word'], item: ['Items', 'item'] };

  function timeWords(ms) {
    if (ms < 900) return 'under a second';
    const s = Math.round(ms / 1000);
    return `about ${s} second${s === 1 ? '' : 's'}`;
  }

  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const lower1 = (s) => s.charAt(0).toLowerCase() + s.slice(1);

  /**
   * @param {{frames, iterations, duration, stagger, count, unit, easing, trigger, target, itemNoun?, scrollLinked?}} g
   *   target: plain noun phrase like "the main heading" (never page text)
   */
  // While hovered/pressed nothing "comes in": entrance names become what the effect does to it.
  const INTERACTION = { 'Pop in': ['Grow', 'grows a little'], 'Zoom in': ['Grow', 'grows a little'], 'Rise in': ['Lift', 'lifts up a little'], 'Drop in': ['Sink', 'moves down a little'], 'Slide in': ['Shift', 'shifts sideways'], 'Twist in': ['Tilt', 'tilts'], 'Fade in': ['Brighten', 'becomes more visible'], 'Fade out': ['Fade', 'fades a little'] };

  function describe(g) {
    let c = classify(g.frames, g.iterations);
    // Only when it stays visible the whole time (a menu that fades in while dropping really appears).
    const op = (f) => (f?.props?.opacity === undefined ? 1 : Number(f.props.opacity));
    const staysVisible = Math.abs(op(g.frames?.[0]) - op(g.frames?.[g.frames.length - 1])) < 0.05;
    if (/^(hover|hover-js|focus|click)$/.test(g.trigger) && INTERACTION[c.name] && staysVisible) {
      const [name, verb] = INTERACTION[c.name];
      c = { ...c, name, verb, kind: 'effect' };
    }
    const many = g.count > 1 && c.kind !== 'loop';
    const [plural, single] = g.unit === 'item' && g.itemNoun ? g.itemNoun : PLURAL[g.unit] || PLURAL.item;
    const name = g.scrollLinked ? `${c.name} as you scroll` : many ? `${plural} ${lower1(c.name)} one by one` : c.name;
    let sentence;
    if (g.scrollLinked) sentence = `${cap(c.verb)} as you scroll the page.`;
    else if (c.kind === 'loop') sentence = `${cap(c.verb)}, again and again. ${speedWord(g.duration)}${bouncy(g.easing) ? ' and bouncy' : ''}.`;
    else {
      const total = g.duration + (many ? g.stagger * (g.count - 1) : 0);
      sentence = `${many ? `Each ${single} ${c.verb}, one by one.` : `${cap(c.verb)}.`} ${speedWord(g.duration)}${bouncy(g.easing) ? ' and bouncy' : ''}, ${timeWords(total)}.`;
    }
    const when = g.scrollLinked ? WHEN.scrolllinked : WHEN[g.trigger] || 'On load';
    const numbers = [
      c.dist ? `moves ${Math.round(c.dist)}px` : null,
      g.scrollLinked ? 'linked to scroll position' : `${g.duration}ms${many ? ' each' : ''}`,
      many && g.stagger ? `${g.stagger}ms apart` : null,
      c.kind === 'loop' ? 'loops forever' : null,
      EASING_NAMES[g.easing] || g.easing,
    ].filter(Boolean).join(', ');
    return { name, sentence, when, numbers, kind: c.kind };
  }

  globalThis.PromptLiftMotion = { version: 4, describe, classify, channels, easingWord, speedWord };
})();
