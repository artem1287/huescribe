// Huescribe adjustments: lets the user tweak a picked item before it goes into the prompt
// (gradient colors/angle, font size/weight, animation duration/stagger/distance/easing, …).
// For each item type: parse(code) → params, render(params) → code, controls, a plain-language
// diff of what changed, and CSS for a live preview on the source page. Loaded by the panel.

(() => {
  const COLOR_RE = /^(#[0-9a-f]{3,8}\b|rgba?\([^)]*\))/i;

  // ---------- small helpers ----------

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

  /** Color string → { hex: '#rrggbb', alpha } (null for formats we can't edit, e.g. oklch). */
  function toHex(c) {
    let m = /^#([0-9a-f]{3})$/i.exec(c);
    if (m) return { hex: '#' + m[1].split('').map((x) => x + x).join('').toLowerCase(), alpha: 1 };
    m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(c);
    if (m) return { hex: '#' + m[1].toLowerCase(), alpha: m[2] ? parseInt(m[2], 16) / 255 : 1 };
    m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?\s*\)$/i.exec(c);
    if (m) return { hex: '#' + [m[1], m[2], m[3]].map((v) => Math.round(+v).toString(16).padStart(2, '0')).join(''), alpha: m[4] == null ? 1 : +m[4] };
    return null;
  }

  function fromHex(hex, alpha = 1) {
    if (alpha >= 1) return hex;
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.round(alpha * 100) / 100})`;
  }

  const getDecl = (code, prop) => { const m = new RegExp(`(^|\\n)\\s*${prop}:\\s*([^;\\n]+);?`).exec(code); return m ? m[2].trim() : null; };
  function setDecl(code, prop, value) {
    const re = new RegExp(`(^|\\n)(\\s*)${prop}:\\s*[^;\\n]+;?`);
    if (re.test(code)) return code.replace(re, `$1$2${prop}: ${value};`);
    return `${code.trimEnd()}\n${prop}: ${value};`;
  }
  const scalePx = (str, k) => str.replace(/(-?\d*\.?\d+)px/g, (m, n) => `${Math.round(+n * k * 100) / 100}px`);
  const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
  const msOf = (t) => (/ms$/.test(t) ? parseFloat(t) : parseFloat(t) * 1000);

  const EASINGS = [
    ['cubic-bezier(0.16, 1, 0.3, 1)', tk('Settles softly')],
    ['ease-out', tk('Eases out')],
    ['ease-in-out', tk('Gentle')],
    ['ease-in', tk('Speeds up')],
    ['linear', tk('Steady')],
    ['cubic-bezier(0.34, 1.56, 0.64, 1)', tk('Bouncy')],
  ];
  const easingName = (v) => { const n = EASINGS.find(([x]) => x === v)?.[1]; return n ? t(n) : null; };
  const easingOptions = (orig) => [[orig, t('Original ({feel})', { feel: easingName(orig) || t('as on the site') })], ...EASINGS.filter(([v]) => v !== orig).map(([v, n]) => [v, t(n)])];
  /** "feel" in the change note: the easing's name in lower case, or the raw value. */
  const feelWord = (v) => easingName(v)?.toLowerCase() || v;
  // Recorded groups of several things are letters, words or items.
  const eachLabel = (unit) => (unit === 'letter' ? t('Length of each letter') : unit === 'word' ? t('Length of each word') : unit === 'item' ? t('Length of each item') : t('Length of each {unit}', { unit }));
  const betweenLabel = (unit) => (unit === 'letter' ? t('Delay between letters') : unit === 'word' ? t('Delay between words') : unit === 'item' ? t('Delay between items') : t('Delay between {unit}s', { unit }));

  function mixHex(hex, target, k) {
    const a = parseInt(hex.slice(1), 16); const b = parseInt(target.slice(1), 16);
    const ch = (n, sh) => (n >> sh) & 255;
    return '#' + [16, 8, 0].map((sh) => Math.round(ch(a, sh) + (ch(b, sh) - ch(a, sh)) * k).toString(16).padStart(2, '0')).join('');
  }
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

  // ---------- per-type definitions ----------

  function parseGradient(value) {
    const layers = splitTop(value);
    const idx = layers.findIndex((l) => /gradient\(/.test(l));
    if (idx < 0) return null;
    const g = layers[idx];
    const m = /^(repeating-)?(linear|radial|conic)-gradient\(([\s\S]*)\)$/.exec(g);
    if (!m) return null;
    const args = splitTop(m[3]);
    let angle = null; let head = null;
    if (!COLOR_RE.test(args[0]) && !/^transparent\b/.test(args[0])) {
      const first = args.shift();
      const deg = /^(-?[\d.]+)deg$/.exec(first);
      if (m[2] === 'linear' && deg) angle = ((Math.round(+deg[1]) % 360) + 360) % 360;
      else head = first;
    } else if (m[2] === 'linear') angle = 180;
    const stops = args.map((a) => {
      const cm = /^(#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|transparent)\s*(.*)$/i.exec(a);
      if (!cm) return { raw: a };
      const c = cm[1] === 'transparent' ? { hex: '#ffffff', alpha: 0 } : toHex(cm[1]);
      return c ? { hex: c.hex, alpha: c.alpha, pos: cm[2] || '' } : { raw: a };
    });
    return { layers, idx, repeating: !!m[1], kind: m[2], angle, head, stops };
  }

  function renderGradient(p) {
    const args = [];
    if (p.kind === 'linear' && p.angle != null) args.push(`${p.angle}deg`);
    else if (p.head) args.push(p.head);
    for (const s of p.stops) args.push(s.raw || `${fromHex(s.hex, s.alpha)}${s.pos ? ' ' + s.pos : ''}`);
    const layers = [...p.layers];
    layers[p.idx] = `${p.repeating ? 'repeating-' : ''}${p.kind}-gradient(${args.join(', ')})`;
    return layers.join(', ');
  }

  const TYPES = {
    gradient: {
      parse: (code) => { const v = getDecl(code, 'background-image'); const g = v && parseGradient(v); return g && { g }; },
      render: (code, p) => setDecl(code, 'background-image', renderGradient(p.g)),
      controls: (p) => [
        ...(p.g.kind === 'linear' && p.g.angle != null ? [{ key: 'g.angle', label: t('Direction (angle)'), kind: 'range', min: 0, max: 360, step: 5, unit: '°' }] : []),
        ...p.g.stops.map((s, i) => (s.raw ? null : { key: `g.stops.${i}.hex`, label: t('Color {n}', { n: i + 1 }), kind: 'color' })).filter(Boolean),
      ],
      diff: (o, p) => [
        o.g.angle !== p.g.angle && t('angle {from} → {to}', { from: `${o.g.angle}°`, to: `${p.g.angle}°` }),
        ...p.g.stops.map((s, i) => !s.raw && s.hex !== o.g.stops[i].hex && t('color {n} {from} → {to}', { n: i + 1, from: o.g.stops[i].hex, to: s.hex })),
      ],
      preview: (code) => code,
      swatch: (p) => ({ kind: 'gradient', value: renderGradient(p.g) }),
    },
    color: {
      parse: (code) => { const m = /#[0-9a-f]{6}\b/i.exec(code); return m && { hex: m[0].toLowerCase() }; },
      render: (code, p) => code.replace(/#[0-9a-f]{6}\b/i, p.hex),
      controls: () => [{ key: 'hex', label: t('Color'), kind: 'color' }],
      diff: (o, p) => [o.hex !== p.hex && t('color {from} → {to}', { from: o.hex, to: p.hex })],
      preview: (code) => (code.includes(':') ? code : null),
      swatch: (p) => ({ kind: 'color', value: p.hex }),
    },
    font: {
      parse: (code) => ({
        size: parseFloat(getDecl(code, 'font-size')) || 16,
        weight: String(getDecl(code, 'font-weight') || '400'),
        tracking: parseFloat(getDecl(code, 'letter-spacing')) || 0,
        lineHeight: parseFloat(getDecl(code, 'line-height')) || 1.5,
      }),
      render: (code, p) => {
        let c = setDecl(code, 'font-size', `${p.size}px`);
        c = setDecl(c, 'font-weight', p.weight);
        c = setDecl(c, 'line-height', p.lineHeight);
        return p.tracking ? setDecl(c, 'letter-spacing', `${p.tracking}em`) : c.replace(/\n?\s*letter-spacing:[^;\n]+;?/, '');
      },
      controls: () => [
        { key: 'size', label: t('Size'), kind: 'number', min: 8, max: 200, step: 1, unit: 'px' },
        { key: 'weight', label: t('Weight'), kind: 'select', options: ['300', '400', '500', '600', '700', '800', '900'].map((w) => [w, w]) },
        { key: 'lineHeight', label: t('Line height'), kind: 'number', min: 0.8, max: 3, step: 0.05 },
        { key: 'tracking', label: t('Letter spacing'), kind: 'number', min: -0.2, max: 0.5, step: 0.005, unit: 'em' },
      ],
      diff: (o, p) => [o.size !== p.size && t('size {from} → {to}', { from: `${o.size}px`, to: `${p.size}px` }), o.weight !== p.weight && t('weight {from} → {to}', { from: o.weight, to: p.weight }),
        o.lineHeight !== p.lineHeight && t('line height {from} → {to}', { from: o.lineHeight, to: p.lineHeight }), o.tracking !== p.tracking && t('letter spacing {from} → {to}', { from: `${o.tracking}em`, to: `${p.tracking}em` })],
      preview: (code) => code.replace(/\/\*[\s\S]*?\*\//g, ''),
    },
    shape: {
      parse: (code) => { const r = getDecl(code, 'border-radius'); return r && /^\d+(\.\d+)?px$/.test(r) ? { radius: parseFloat(r) } : null; },
      render: (code, p) => setDecl(code, 'border-radius', `${p.radius}px`),
      controls: () => [{ key: 'radius', label: t('Corner radius'), kind: 'range', min: 0, max: 64, step: 1, unit: 'px' }],
      diff: (o, p) => [o.radius !== p.radius && t('corner radius {from} → {to}', { from: `${o.radius}px`, to: `${p.radius}px` })],
      preview: (code) => code,
      swatch: (p) => ({ kind: 'shape', value: `${p.radius}px` }),
    },
    shadow: {
      parse: (code) => ({ strength: 100, base: getDecl(code, 'box-shadow') }),
      render: (code, p) => setDecl(code, 'box-shadow', scaleShadow(p.base, p.strength / 100)),
      controls: () => [{ key: 'strength', label: t('Strength'), kind: 'range', min: 0, max: 250, step: 10, unit: '%' }],
      diff: (o, p) => [o.strength !== p.strength && t('shadow strength {pct} of the original', { pct: `${p.strength}%` })],
      preview: (code) => code,
      swatch: (p) => ({ kind: 'shadow', value: scaleShadow(p.base, p.strength / 100) }),
    },
    'text-shadow': {
      parse: (code) => ({ strength: 100, base: getDecl(code, 'text-shadow') }),
      render: (code, p) => setDecl(code, 'text-shadow', scaleShadow(p.base, p.strength / 100)),
      controls: () => [{ key: 'strength', label: t('Strength'), kind: 'range', min: 0, max: 250, step: 10, unit: '%' }],
      diff: (o, p) => [o.strength !== p.strength && t('glow strength {pct} of the original', { pct: `${p.strength}%` })],
      preview: (code) => code,
    },
    hover: {
      parse: () => ({ speed: 100, intensity: 100 }),
      render: (code, p) => code
        .replace(/(transition:[^\n]*)/, (line) => line.replace(/(\d*\.?\d+)(ms|s)\b/g, (m, n, u) => `${round(+n * 100 / p.speed, 3)}${u}`))
        .replace(/(\/\* :[\s\S]*)$/, (block) => block
          .replace(/translate([XY]?)\(([^)]*)\)/g, (m, ax, args) => `translate${ax}(${scalePx(args, p.intensity / 100)})`)
          .replace(/scale\(([\d.]+)\)/g, (m, s) => `scale(${round(1 + (+s - 1) * p.intensity / 100, 3)})`)),
      controls: () => [
        { key: 'speed', label: t('Speed'), kind: 'range', min: 25, max: 300, step: 25, unit: '%' },
        { key: 'intensity', label: t('Intensity'), kind: 'range', min: 0, max: 300, step: 25, unit: '%' },
      ],
      diff: (o, p) => [o.speed !== p.speed && (p.speed > 100 ? t('transition speed {pct} of the original (faster)', { pct: `${p.speed}%` }) : t('transition speed {pct} of the original (slower)', { pct: `${p.speed}%` })), o.intensity !== p.intensity && t('movement {pct} of the original', { pct: `${p.intensity}%` })],
      preview: () => null,
    },
    animation: {
      parse: (code) => { const a = getDecl(code, 'animation'); const t = a && /(\d*\.?\d+)(ms|s)\b/.exec(a); return t ? { duration: Math.round(msOf(t[0])) } : null; },
      render: (code, p) => code.replace(/(\nanimation:\s*[^\n]*?)(\d*\.?\d+)(ms|s)\b/, (m, pre) => `${pre}${p.duration}ms`),
      controls: () => [{ key: 'duration', label: t('Length'), kind: 'number', min: 50, max: 20000, step: 50, unit: 'ms' }],
      diff: (o, p) => [o.duration !== p.duration && t('duration {from} → {to}', { from: `${o.duration}ms`, to: `${p.duration}ms` })],
      preview: () => null,
    },
    'recorded-animation': {
      parse: (code, b) => b.anim && { duration: b.anim.duration, stagger: b.anim.stagger || 0, distance: 100, easing: b.anim.easing },
      render: (code, p, b) => globalThis.HuescribePrompts.animationCode(scaledAnim(b.anim, p)),
      controls: (p, b) => [
        { key: 'duration', label: b.anim.count > 1 ? eachLabel(b.anim.unit) : t('Length'), kind: 'number', min: 50, max: 20000, step: 50, unit: 'ms' },
        ...(b.anim.count > 1 ? [{ key: 'stagger', label: betweenLabel(b.anim.unit), kind: 'number', min: 0, max: 2000, step: 5, unit: 'ms' }] : []),
        { key: 'distance', label: t('Movement distance'), kind: 'range', min: 0, max: 300, step: 10, unit: '%' },
        { key: 'easing', label: t('Feel'), kind: 'select', options: easingOptions(b.anim.easing) },
      ],
      diff: (o, p) => [o.duration !== p.duration && t('duration {from} → {to}', { from: `${o.duration}ms`, to: `${p.duration}ms` }), o.stagger !== p.stagger && t('delay between items {from} → {to}', { from: `${o.stagger}ms`, to: `${p.stagger}ms` }),
        o.distance !== p.distance && t('movement distance {pct} of the original', { pct: `${p.distance}%` }), o.easing !== p.easing && t('feel {from} → {to} (easing {easing})', { from: feelWord(o.easing), to: feelWord(p.easing), easing: p.easing })],
      preview: () => null,
    },
    layout: {
      parse: (code) => ({ gap: parseFloat(getDecl(code, 'gap')) || 0, cols: +(/repeat\((\d+)/.exec(code)?.[1] || 0) }),
      render: (code, p) => { let c = setDecl(code, 'gap', `${p.gap}px`); if (p.cols) c = c.replace(/repeat\(\d+/, `repeat(${p.cols}`); return c; },
      controls: (p) => [{ key: 'gap', label: t('Gap'), kind: 'number', min: 0, max: 200, step: 2, unit: 'px' }, ...(p.cols ? [{ key: 'cols', label: t('Columns'), kind: 'number', min: 1, max: 12, step: 1 }] : [])],
      diff: (o, p) => [o.gap !== p.gap && t('gap {from} → {to}', { from: `${o.gap}px`, to: `${p.gap}px` }), o.cols !== p.cols && t('columns {from} → {to}', { from: o.cols, to: p.cols })],
      preview: (code) => code,
    },
  };
  // One-tap tweaks: each returns { key: newValue } changes for the current params.
  const PRESETS = {
    gradient: (p) => (p.g.angle != null ? [[tk('Flip direction'), { 'g.angle': (p.g.angle + 180) % 360 }]] : []),
    color: (p) => [[tk('Lighter'), { hex: mixHex(p.hex, '#ffffff', 0.25) }], [tk('Darker'), { hex: mixHex(p.hex, '#000000', 0.25) }]],
    font: (p) => [[tk('Bigger'), { size: Math.round(p.size * 1.15) }], [tk('Smaller'), { size: Math.max(8, Math.round(p.size * 0.87)) }],
      [tk('Bolder'), { weight: String(clamp(+p.weight + 100, 100, 900)) }], [tk('Lighter'), { weight: String(clamp(+p.weight - 100, 100, 900)) }]],
    shape: (p) => [[tk('Rounder'), { radius: Math.round(p.radius * 1.5 + 4) }], [tk('Squarer'), { radius: Math.round(p.radius * 0.5) }]],
    shadow: (p) => [[tk('Softer'), { strength: Math.max(0, Math.round(p.strength * 0.6)) }], [tk('Stronger'), { strength: Math.min(250, Math.round(p.strength * 1.5)) }]],
    hover: (p) => [[tk('Subtler'), { intensity: Math.max(0, Math.round(p.intensity * 0.5)) }], [tk('Stronger'), { intensity: Math.min(300, Math.round(p.intensity * 1.5)) }],
      [tk('Faster'), { speed: Math.min(300, Math.round(p.speed * 1.5)) }], [tk('Slower'), { speed: Math.max(25, Math.round(p.speed / 1.5)) }]],
    animation: (p) => [[tk('Faster'), { duration: Math.max(50, Math.round(p.duration * 0.7)) }], [tk('Slower'), { duration: Math.round(p.duration * 1.4) }]],
    'recorded-animation': (p) => [
      [tk('Snappier'), { duration: Math.max(50, Math.round(p.duration * 0.7 / 10) * 10), stagger: Math.round(p.stagger * 0.7), easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }],
      [tk('Softer'), { duration: Math.round(p.duration * 1.3 / 10) * 10, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }],
      [tk('Bouncier'), { easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }],
      [tk('More dramatic'), { distance: Math.min(300, p.distance + 60) }],
      [tk('More subtle'), { distance: Math.max(0, p.distance - 50) }],
      [tk('Slower'), { duration: Math.round(p.duration * 1.4 / 10) * 10, stagger: Math.round(p.stagger * 1.4) }],
    ],
    layout: (p) => [[tk('More space'), { gap: Math.round(p.gap * 1.5 + 4) }], [tk('Less space'), { gap: Math.round(p.gap * 0.6) }]],
  };
  PRESETS['text-gradient'] = PRESETS.gradient;
  PRESETS['text-shadow'] = PRESETS.shadow;
  PRESETS.focus = PRESETS.hover;

  TYPES['text-gradient'] = { ...TYPES.gradient, preview: (code) => code };
  TYPES.focus = TYPES.hover;

  function scaleShadow(base, k) {
    if (!base) return 'none';
    return splitTop(base).map((layer) => scalePx(layer, k).replace(/rgba\(([^)]*),([\d.]+)\)/g, (m, rgb, a) => `rgba(${rgb},${round(Math.min(1, +a * Math.max(k, 0.0001)))})`)).join(', ');
  }

  /** Recorded-animation group with adjusted timing / distance (also used for page replay). */
  function scaledAnim(anim, p) {
    const k = p.distance / 100;
    return {
      ...anim, duration: p.duration, stagger: p.stagger, easing: p.easing,
      frames: anim.frames.map((f) => ({ ...f, props: Object.fromEntries(Object.entries(f.props).map(([prop, v]) => [prop, /transform|translate|filter/.test(prop) ? scalePx(v, k) : v])) })),
    };
  }

  // ---------- public API (operates on basket entries) ----------

  const get = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj);
  function set(obj, path, v) { const ks = path.split('.'); const last = ks.pop(); ks.reduce((o, k) => o[k], obj)[last] = v; }

  /** Prepare a basket entry: keep the original code, derive editable params. */
  function init(b) {
    b.origCode ??= b.code;
    b.request ??= '';
    const t = TYPES[b.type];
    if (!t || b.params) return b;
    try {
      const p = t.parse(b.origCode, b);
      if (p) { b.params = structuredClone(p); b.orig = structuredClone(p); }
    } catch (err) {
      console.warn('[Huescribe] could not parse item for adjusting', b.type, err);
    }
    return b;
  }

  function controls(b) { return b.params ? TYPES[b.type].controls(b.params, b) : []; }

  /** One-tap tweaks for this item: [{ label }]; apply with applyPreset(b, index). */
  function presets(b) { return b.params && PRESETS[b.type] ? PRESETS[b.type](b.params).map(([label]) => ({ label: t(label) })) : []; }

  function applyPreset(b, i) {
    const [, changes] = PRESETS[b.type](b.params)[i];
    for (const [k, v] of Object.entries(changes)) update(b, k, v);
  }
  const value = (b, key) => get(b.params, key);

  /** Set one param and re-render code, diff note and swatch. */
  function update(b, key, v) {
    set(b.params, key, v);
    const t = TYPES[b.type];
    b.code = t.render(b.origCode, b.params, b);
    b.adjustNote = t.diff(b.orig, b.params).filter(Boolean).join('; ');
    if (t.swatch) b.preview = t.swatch(b.params);
  }

  function reset(b) {
    if (!b.orig) return;
    b.params = structuredClone(b.orig);
    b.code = b.origCode;
    b.adjustNote = '';
    const t = TYPES[b.type];
    if (t.swatch) b.preview = t.swatch(b.params);
  }

  /** CSS declarations to preview on the page's element, or null if this type can't be previewed inline. */
  function previewCss(b) {
    const t = TYPES[b.type];
    const css = t?.preview ? t.preview(b.code) : null;
    return css ? css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\n+/g, ' ').trim() : null;
  }

  /** Replay options for a recorded animation preview. */
  const replayOptions = (b) => b.params && { duration: b.params.duration, stagger: b.params.stagger, easing: b.params.easing, distance: b.params.distance / 100 };

  globalThis.HuescribeAdjust = { init, controls, presets, applyPreset, value, update, reset, previewCss, replayOptions };
})();
