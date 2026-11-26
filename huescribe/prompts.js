// Huescribe prompt builders: Claude-optimized supplemental prompts ("add this one thing to my
// existing site") plus the site-agnostic style-guide renderer used for whole-palette and
// whole-design-system items. Loaded by the side panel and injected into pages.

(() => {
  if (globalThis.HuescribePrompts?.version === 9) return;

  const CATEGORIES = {
    fonts: { label: tk('Typography'), title: tk('Typography guide') },
    colors: { label: tk('Color'), title: tk('Color guide') },
    animations: { label: tk('Motion'), title: tk('Motion guide') },
    layout: { label: tk('Layout'), title: tk('Layout guide') },
    shape: { label: tk('Shape & depth'), title: tk('Shape & depth guide') },
    components: { label: tk('Components'), title: tk('Component guide') },
    all: { label: tk('Full design system'), title: tk('Design guide') },
  };
  const ORDER = ['fonts', 'colors', 'layout', 'shape', 'components', 'animations'];

  // ---------- color math ----------

  function rgbOf(hex) {
    const m = /^#([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function hsl(hex) {
    const c = rgbOf(hex);
    if (!c) return null;
    const [r, g, b] = c.map((v) => v / 255);
    const max = Math.max(r, g, b); const min = Math.min(r, g, b); const l = (max + min) / 2;
    if (max === min) return { h: 0, s: 0, l };
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return { h: h * 60, s, l };
  }
  const lum = (hex) => { const c = rgbOf(hex); return c ? (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255 : 0.5; };
  const saturated = (hex) => { const x = hsl(hex); return !!x && x.s > 0.3 && x.l > 0.12 && x.l < 0.9; };
  function hueName(hex) {
    const x = hsl(hex); if (!x) return t('accent');
    const h = x.h;
    return h < 15 || h >= 345 ? t('red') : h < 40 ? t('orange') : h < 65 ? t('yellow') : h < 90 ? t('lime') : h < 165 ? t('green') : h < 190 ? t('teal') : h < 205 ? t('cyan') : h < 250 ? t('blue') : h < 270 ? t('indigo') : h < 295 ? t('violet') : h < 320 ? t('purple') : t('pink');
  }
  function neutralTone(hex) {
    const x = hsl(hex); if (!x) return t('neutral');
    if (x.s < 0.06) return t('neutral grey');
    return x.h < 70 || x.h > 300 ? t('warm') : t('cool');
  }

  const EASINGS = {
    'cubic-bezier(0.16, 1, 0.3, 1)': tk('expo-out: fast start, long soft settle'),
    'cubic-bezier(0.22, 1, 0.36, 1)': tk('quint-out: fast start, soft settle'),
    'cubic-bezier(0.4, 0, 0.2, 1)': tk('standard ease-in-out'),
    'cubic-bezier(0.34, 1.56, 0.64, 1)': tk('back-out: slight overshoot'),
    'cubic-bezier(0.68, -0.55, 0.265, 1.55)': tk('back-in-out: springy'),
    'cubic-bezier(0.25, 0.1, 0.25, 1)': 'ease',
  };

  // ---------- formatting ----------

  const join = (arr, sep = ' · ') => arr.filter(Boolean).join(sep);
  const css = (obj) => Object.entries(obj || {}).filter(([, v]) => v != null && v !== '').map(([k, v]) => `${k}:${v}`).join('; ');
  const em = (n) => (n ? `${n}em` : '');
  /** "a and b and c" in the prompt's language. */
  const andJoin = (arr) => arr.reduce((acc, w) => (acc == null ? w : t('{a} and {b}', { a: acc, b: w })), null) || '';

  // Nouns the prompts use for the thing a detail came from: [one, many] (English kept as the key).
  const NOUNS = {
    button: [tk('button'), tk('buttons')], card: [tk('card'), tk('cards')], link: [tk('link'), tk('links')],
    'menu link': [tk('menu link'), tk('menu links')], 'nav link': [tk('nav link'), tk('nav links')],
    'input box': [tk('input box'), tk('input boxes')], input: [tk('input'), tk('inputs')], badge: [tk('badge'), tk('badges')],
    image: [tk('image'), tk('images')], heading: [tk('heading'), tk('headings')], header: [tk('header'), tk('headers')],
    footer: [tk('footer'), tk('footers')], menu: [tk('menu'), tk('menus')], nav: [tk('nav'), tk('navs')],
    section: [tk('section'), tk('sections')], container: [tk('container'), tk('containers')], element: [tk('element'), tk('elements')],
    item: [tk('item'), tk('items')], 'big headline': [tk('big headline'), tk('big headlines')],
    'piece of small text': [tk('piece of small text'), tk('pieces of small text')], 'piece of body text': [tk('piece of body text'), tk('pieces of body text')],
  };
  /** One of a noun, in the prompt's language (unknown nouns stay as given). */
  const nounOne = (n) => (/^h[1-6] heading$/.test(n) ? t('{tag} heading', { tag: n.slice(0, 2) }) : NOUNS[n] ? t(NOUNS[n][0]) : t(n));
  /** Many of a noun; `en` is the English plural the prompt has always used (kept when the table's differs). */
  const nounMany = (n, en = plural(n)) => (/^h[1-6] heading$/.test(n) && en === `${n}s` ? t('{tag} headings', { tag: n.slice(0, 2) }) : NOUNS[n] && (NOUNS[n][1] === en || (globalThis.I18N && globalThis.I18N.lang !== 'en')) ? t(NOUNS[n][1]) : en);

  // ---------- reading the analyzer's labels (English, or written in the person's language) ----------
  const esc = (x) => String(x).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  /** Regex source for a label in English or translated (only English when they are the same). */
  const either = (en, tr) => (tr === en ? esc(en) : `(?:${esc(en)}|${esc(tr)})`);
  const POSITION_RE = () => new RegExp(either('Position on the page', t('Position on the page')));
  const RELATIONS_RE = () => new RegExp(either('Color relationships', t('Color relationships')));
  const RELATE_RE = () => new RegExp(either('How they relate', t('How they relate')));
  const SHARES_RE = () => new RegExp(either('How much of the area each fill covers', t('How much of the area each fill covers')));
  const SCHEME_RE = () => new RegExp(`^${either('Font scheme:', t('Font scheme:'))}`, 'm');
  /** "Spacing: <parts>" lines; flags 'gm' to walk them all. */
  const SPACING_RE = (flags = 'm') => new RegExp(`^${either('Spacing:', t('Spacing:'))} (.+)$`, flags);
  /** "Families (3):" and the lines under it (group 1). */
  const familiesRe = () => {
    const tr = t('Families ({n}):');
    const alt = tr === 'Families ({n}):' ? '' : `|${esc(tr).replace('\\{n\\}', '\\d+')}`;
    return new RegExp(`(?:Families \\(\\d+\\):${alt})\n([\\s\\S]*?)(\n\n|$)`);
  };
  // Where a font comes from (the analyzer writes these, translated in the family lines of a font scheme).
  const FONT_SOURCES = [tk('a system font'), tk('from Google Fonts (free)'), tk('from Adobe Fonts (licensed)'), tk('self-hosted by the site')];
  /** A font source as English (for matching), from English or translated text. */
  const sourceEn = (src) => FONT_SOURCES.find((x) => x === src || t(x) === src) || src;
  // Outline purposes the analyzer writes (translated in other languages); matched in English.
  const PURPOSES = [tk('small label above the title'), tk('main headline'), tk('card title'), tk('footer column title'), tk('section title'), tk('subheading'), tk('sign-in'), tk('sign-up call to action'), tk('contact / demo request'), tk('purchase'), tk('learn-more link'), tk('download'), tk('legal link'), tk('page link'), tk('footer link'), tk('main call to action'), tk('secondary action'), tk('link'), tk('small tag'), tk('copyright line'), tk('price'), tk('card description'), tk('supporting line under the headline'), tk('description under the title'), tk('footer text'), tk('short label'), tk('paragraph'),
    tk('small label above the titles'), tk('card titles'), tk('footer column titles'), tk('section titles'), tk('sign-up call to actions'), tk('learn-more links'), tk('legal links'), tk('page links'), tk('footer links'), tk('main call to actions'), tk('secondary actions'), tk('links'), tk('small tags'), tk('short labels'), tk('description under the titles'),
    tk('picture + brand name'), tk('picture only')];
  /** A purpose as English, from English or translated text (unknown ones stay as written). */
  const purposeEn = (w) => (PURPOSES.includes(w) ? w : PURPOSES.find((x) => t(x) === w) || w);

  // ---------- sections ----------

  function typography(f) {
    if (!f || f.error || !f.roles) return '';
    const roles = f.roles;
    const out = [`## ${t('Typography')}`];
    if (f.families?.length) {
      out.push(t('Fonts:'));
      for (const fam of f.families.slice(0, 3)) {
        const src = fam.source === 'unknown' ? '' : ` (${fam.source})`;
        out.push(`- ${fam.family}${src}: ${fam.roles.join(', ')}`);
      }
    }
    // Merge roles with identical specs.
    const groups = new Map();
    const order = ['h1', 'h2', 'h3', 'h4', 'body', 'small', 'button', 'nav link', 'input', 'code'];
    for (const role of order) {
      const s = roles[role];
      if (!s) continue;
      const spec = join([`${s.size}px`, s.weight, s.lineHeight, em(s.tracking), s.transform, s.italic && 'italic'], ' / ');
      if (!groups.has(spec)) groups.set(spec, []);
      groups.get(spec).push(role);
    }
    out.push(t('Scale (size / weight / line-height / letter-spacing):'));
    for (const [spec, rs] of groups) out.push(`- ${rs.join(', ')}: ${spec}`);

    const feel = [];
    const head = roles.h1 || roles.h2; const body = roles.body;
    if (head && body) {
      if (head.family !== body.family) feel.push(t('{head} headings paired with a {body} body', { head: head.class, body: body.class }));
      else feel.push(t('one {kind} family throughout', { kind: body.class }));
      if (head.tracking < -0.005) feel.push(t('tight heading tracking'));
      const ratio = head.size / body.size;
      feel.push(ratio >= 3 ? t('dramatic size contrast') : ratio < 2 ? t('compact, restrained scale') : t('moderate scale'));
    }
    if (Object.values(roles).some((s) => s.transform === 'uppercase')) feel.push(t('uppercase labels'));
    if (feel.length) out.push(t('Feel: {feel}.', { feel: feel.join(', ') }));
    return out.join('\n');
  }

  function palette(c) {
    if (!c || c.error) return '';
    const base = c.base;
    const baseDark = lum(base) < 0.4;
    const bgs = (c.backgrounds || []).map((b) => b.value).filter((v) => v.startsWith('#'));
    const accentList = (c.accents || []).map((a) => a.value).filter((v) => v && v.startsWith('#') && saturated(v));
    const primary = accentList[0];
    const secondary = accentList.find((a) => a !== primary && Math.abs((hsl(a)?.h ?? 0) - (hsl(primary)?.h ?? 0)) > 25);
    const surface = bgs.find((b) => b !== base && !saturated(b) && (lum(b) < 0.4) === baseDark);
    const inverse = bgs.find((b) => !saturated(b) && (lum(b) < 0.4) !== baseDark);
    const texts = (c.text || []).map((t) => t.value).filter((v) => v && v.startsWith('#') && !saturated(v) && (lum(v) < 0.5) !== baseDark);
    const out = [`## ${t('Color')}`];
    out.push('- ' + join([t('background {color}', { color: base }), surface && t('surface/cards {color}', { color: surface }), inverse && t('inverse sections {color}', { color: inverse })]));
    if (texts.length) out.push('- ' + join([t('text {color}', { color: texts[0] }), texts[1] && t('muted text {color}', { color: texts[1] })]));
    if (primary) out.push('- ' + join([`${t('primary {color}', { color: primary })}${c.onAccent?.[primary] ? ` ${t('(text on it {color})', { color: c.onAccent[primary] })}` : ''}`, secondary && t('secondary accent {color}', { color: secondary })]));
    if (c.borders?.[0]) out.push(`- ${t('border {color}', { color: c.borders[0].value })}`);
    for (const g of (c.gradients || []).slice(0, 2)) out.push(`- ${t('gradient ({kind}): {value}', { kind: g.kinds[0] || t('background'), value: g.value })}`);
    const dark = c.tokens?.dark;
    if (dark?.length) out.push(`- ${t('dark theme tokens: {tokens}', { tokens: dark.slice(0, 8).map(([k, v]) => `${k}: ${v}`).join('; ') })}`);
    else if (c.darkMode) out.push(`- ${t('has a dark theme (derive it from these colors)')}`);
    const feel = { mode: baseDark ? t('dark') : t('light'), tone: neutralTone(base), hue: primary ? hueName(primary) : '', hue2: secondary ? hueName(secondary) : '' };
    out.push(!primary ? t('Feel: {mode}, {tone} base, mostly monochrome.', feel)
      : secondary ? t('Feel: {mode}, {tone} base with {hue} + {hue2} accents.', feel)
        : t('Feel: {mode}, {tone} base with a single {hue} accent.', feel));
    return out.join('\n');
  }

  function layout(l) {
    if (!l || l.error) return '';
    const out = [`## ${t('Layout')}`];
    if (l.container) {
      const v = { max: l.container.max, pad: l.container.pad };
      out.push(`- ${l.container.pad !== '0px' ? t('Content width: max {max}, centered, {pad} side padding', v) : t('Content width: max {max}, centered', v)}`);
    }
    if (l.sectionPadding?.length) out.push(`- ${t('Section spacing: {value} vertical padding', { value: l.sectionPadding[0] })}`);
    if (l.header) {
      const h = l.header;
      out.push(`- ${t('Header:')} ` + join([['sticky', 'fixed'].includes(h.position) ? h.position : 'static', t('{height}px tall', { height: h.height }), h.translucent && t('translucent'), h.blur && t('backdrop {blur}', { blur: h.blur }), h.border && t('{border} bottom border', { border: h.border })], ', '));
    }
    for (const g of (l.grids || []).slice(0, 2)) {
      const v = { children: nounMany(g.child, `${g.child}s`), gap: g.gap };
      out.push(`- ${tn(g.cols, 'Grid: {n} column of {children}, {gap} gap', 'Grid: {n} columns of {children}, {gap} gap', v)}${g.cols > 1 ? ` ${t('(stack on mobile)')}` : ''}`);
    }
    if (l.breakpoints?.length) out.push(`- ${t('Breakpoints: {list}', { list: l.breakpoints.map((b) => b + 'px').join(', ') })}`);
    if (l.pattern?.length) out.push(`- ${t('Typical page: {pattern}', { pattern: l.pattern.join(' → ') })}`);
    return out.length > 1 ? out.join('\n') : '';
  }

  function shape(s) {
    if (!s || s.error) return '';
    const out = [`## ${t('Shape & depth')}`];
    if (s.radii?.length) out.push(`- ${t('Radius: {list}', { list: s.radii.map((r) => `${nounMany(r.kind, `${r.kind}s`)} ${r.value}`).join(' · ') })}`);
    for (const sh of (s.shadows || []).slice(0, 2)) out.push(`- ${t('Shadow ({kinds}): {value}', { kinds: sh.kinds.join('/') || t('surfaces'), value: sh.value })}`);
    if (s.borders?.[0]) out.push(`- ${t('Borders: {value}', { value: s.borders[0].value })}`);
    if (s.spacing?.length) out.push(`- ${t('Spacing values (px): {list}', { list: s.spacing.join(' ') })}`);
    for (const e of s.effects || []) out.push(`- ${t('Effect ({kinds}): {value}', { kinds: e.kinds.join('/'), value: e.value })}`);
    return out.length > 1 ? out.join('\n') : '';
  }

  function components(list) {
    if (!Array.isArray(list) || !list.length) return '';
    const out = [`## ${t('Components')}`];
    const shown = new Map(); // state css → component that first showed it
    for (const c of list) {
      out.push(`- ${c.kind}: ${css(c.style)}`);
      for (const st of c.states || []) {
        const key = st.state + st.css;
        out.push(`  - ${st.state}: ${shown.has(key) ? t('same as {kind}', { kind: shown.get(key) }) : st.css}`);
        if (!shown.has(key)) shown.set(key, c.kind);
      }
    }
    return out.join('\n');
  }

  function motion(a, opts = {}) {
    if (!a || a.error) return '';
    const out = [`## ${t('Motion')}`];
    if (a.easings?.length) {
      const e = a.easings[0];
      const d = a.durations || [];
      const dur = d.length ? `; ${d.length > 1 ? t('durations {from}–{to}ms', { from: d[0], to: d[d.length - 1] }) : t('durations {from}ms', { from: d[0] })}` : '';
      out.push(`- ${t('Easing: {easing}', { easing: e })}${EASINGS[e] ? ` (${t(EASINGS[e])})` : ''}${dur}`);
    }
    if (a.interactions?.length && opts.withComponents) out.push(`- ${t('Hover/focus states: as listed under Components.')}`);
    else if (a.interactions?.length) {
      out.push(`- ${t('Interactions:')}`);
      for (const i of a.interactions.slice(0, 6)) out.push(`  - ${i.kind} ${i.state}: ${i.css}`);
    }
    if (a.keyframes?.length) {
      out.push(`- ${t('Keyframes:')}`);
      for (const k of a.keyframes) out.push(`  - ${k.name} (${k.on}, ${k.timing}): ${k.frames}`);
    }
    const scroll = [a.smoothScroll && t('smooth scrolling'), a.sticky?.length && t('sticky {parts}', { parts: a.sticky.join('/') }), a.scrollSnap && 'scroll-snap', a.scrollDriven && t('scroll-driven animations'), a.jsReveal && t('elements fade/slide in on scroll')].filter(Boolean);
    if (scroll.length) out.push(`- ${t('Scroll: {list}', { list: scroll.join(', ') })}`);
    if (a.libraries?.length) out.push(`- ${t('Built with {libs}; recreate with CSS or the closest equivalent in my stack.', { libs: a.libraries.join(', ') })}`);
    return out.length > 1 ? out.join('\n') : '';
  }

  const RENDER = { fonts: typography, colors: palette, layout, shape, components, animations: motion };

  /** Full style guide body (all sections), used as the "Entire design system" item. */
  function guideBody(data) {
    return ORDER.map((c) => RENDER[c](data[c], { withComponents: true })).filter(Boolean).join('\n\n');
  }
  const section = (cat, data) => RENDER[cat](data, { withComponents: true });

  // ---------- design-detail blocks (Claude-optimized) ----------
  // A prompt is one self-contained <design_detail> block per chosen thing. It only tells Claude
  // what is on the source page (measured values, plain description), where the user wants it and
  // what they want different. It does not tell Claude how to code: Claude knows that.
  // Several blocks (from different picks and sites) can be pasted into one message.

  const WHEN_WORDS = { load: tk('once, when the page loads'), scroll: tk('once, when it scrolls into view'), loop: tk('over and over'), later: tk('a moment after the page loads'), click: tk('when something is clicked'), 'hover-js': tk('when the pointer moves onto it (and plays back when it leaves)'), 'press-js': tk("while it's pressed (and plays back when released)") };

  /** Measured facts about a recorded animation (not implementation code). */
  function animationCode(g) {
    const pct = (o) => `${Math.round((o ?? 0) * 1000) / 10}%`;
    const frames = g.frames.map((f) => `${pct(f.offset)} { ${Object.entries(f.props).map(([k, v]) => `${k}: ${v}`).join('; ')} }`).join(' → ');
    const unit = g.count > 1 ? g.unit : null;
    const lines = [t('Keyframes: {frames}', { frames })];
    const v = { unit: unit && nounOne(unit), count: g.count, duration: g.duration, easing: g.easing, stagger: g.stagger, direction: g.direction };
    lines.push(unit
      ? (g.stagger ? t('Each {unit} ({count} in total): {duration}ms, easing {easing}, starts {stagger}ms after the previous one', v) : t('Each {unit} ({count} in total): {duration}ms, easing {easing}, all at the same time', v))
      : (g.direction && g.direction !== 'normal' ? t('Duration {duration}ms, easing {easing}, direction {direction}', v) : t('Duration {duration}ms, easing {easing}', v)));
    lines.push(g.scrollLinked ? t('Progress follows the scroll position') : t('Plays {when}', { when: WHEN_WORDS[g.trigger] ? t(WHEN_WORDS[g.trigger]) : t('once') }));
    if (g.source === 'js') lines.push(t('Measured from a JavaScript animation, so the easing is approximate'));
    return lines.join('\n');
  }

  // Which CSS properties belong to each text checkbox.
  const TEXT_PARTS = { font: /^(font-family|font-weight|letter-spacing|text-transform|font-style)\s*:/, size: /^(font-size|line-height)\s*:/, color: /^color\s*:/ };

  function textValues(code, parts) {
    return code.split('\n').filter((line) => {
      const l = line.trim();
      if (!l || l.startsWith('/*')) return !!l;
      const part = Object.keys(TEXT_PARTS).find((k) => TEXT_PARTS[k].test(l));
      return !part || parts[part] !== false;
    }).join('\n');
  }

  /** For text with some parts unticked, describe only the parts that are kept. */
  function textWhat(it, parts) {
    if (['font', 'size', 'color'].every((k) => parts[k] !== false)) return it.label;
    const kept = String(it.desc || '').replace(/\.$/, '').split(', ').filter((w, i) => {
      const part = /size|big|small|tiny|huge|large/i.test(w) ? 'size' : i === 0 || /bold|light|thin|heavy|black|tight|wide|caps|italic/i.test(w) ? 'font' : 'font';
      return parts[part] !== false;
    });
    return kept.length ? `${t(it.title)}: ${kept.join(', ')}` : t(it.title);
  }

  // ---------- context: building a new site, or changing an existing one ----------

  /** Whole-site details (a color scheme for every page, all buttons…) set the overall look. */
  const isWholeSite = (it) => /^(whole site|all pages|every page|everywhere|the whole site|my whole site)$/i.test((it.where || '').trim()) || it.task === 'site'
    || (!!it.where && it.where.trim().toLowerCase() === t('Whole site').toLowerCase()); // the panel's chip, in the person's language

  /** What to do with one detail, in the person's situation. */
  function taskFor(it, ctx) {
    if (isWholeSite(it)) return t('Use this across my whole site.');
    return ''; // <where_on_my_site> says whether it changes something I have or is added as new
  }

  /** The opening of a message: who I am building for, and how to treat the details. */
  function header(ctx = {}) {
    if (ctx.app === 'builder') {
      // AI site builders: the same rules in fewer words.
      return t('Apply the design details below to my website, each where it says; if there is no site yet, build one from them, in this order from top to bottom. Keep everything else as it is, and reuse the fonts, colors and corner sizes my site already has. The values are exact requirements, not suggestions. <fit_to_my_site> says which of my colors, fonts and content to use.');
    }
    const exact = t('Match the values exactly (structure, order, sizes, colors, timing): they are requirements, not inspiration, except where <fit_to_my_site>, <shared_spacing>, <one_look>, <content_i_want>, <change_i_want> or <note> say otherwise.');
    // One opening for both situations (the AI can see whether a site exists yet, or asks). The
    // "no site yet" rule is said here once, so the lines below don't each need an exception.
    return [t('Apply the design details below, taken from other websites, to my website: only these changes, each where <where_on_my_site> says (change the part I already have there, or add it); keep everything else as it is. The details are numbered.'),
      t('If there is no site yet, build one from them, top to bottom: where a detail says to use my site\'s colors, fonts or content, use its own values instead, ask me what the site is about, and set colors, fonts and spacing up as shared variables. The color and font schemes below then set the colors and fonts of the whole site, not only the part they came with.'),
      APPS[appOf(ctx)].seesCode
        ? t('First look through my project for its colors, fonts, pages and real content, as each detail\'s <fit_to_my_site> says. Reuse my site\'s existing fonts, colors, corner sizes, shadows and spacing wherever a detail doesn\'t set them, instead of adding near-duplicates.')
        : t("You can't see my site's code. If I already gave you my files in this chat, use those and start right away. If not, ask me once whether I have a site yet: if I do, ask for the fewest files that hold the parts involved and my colors and fonts (for a one-page site that is just its HTML file), not my whole project, and don't guess; if I don't, build it from scratch as complete files. Reuse my site's existing fonts, colors, corner sizes, shadows and spacing wherever a detail doesn't set them, instead of adding near-duplicates."),
      exact].join('\n');
  }

  // ---------- which AI app the prompt is pasted into ----------
  // One prompt is built (tags, for Claude), then shaped for the app: Claude reads XML-style tags as
  // structure; ChatGPT, Gemini and code editors read Markdown sections more naturally; AI site
  // builders do best with short, plain Markdown. Chat apps can't see the site's code unless it is
  // pasted, so they are told to ask for it rather than guess.
  const APPS = {
    'claude-code': { label: 'Claude Code', tags: true, seesCode: true },
    claude: { label: tk('Claude (chat)'), tags: true, seesCode: false },
    chatgpt: { label: tk('ChatGPT or Gemini'), tags: false, seesCode: false },
    editor: { label: tk('Cursor, Windsurf or Copilot'), tags: false, seesCode: true },
    builder: { label: tk('Lovable, v0 or Bolt'), tags: false, seesCode: true, short: true },
  };
  const appOf = (ctx) => APPS[ctx?.app] ? ctx.app : 'claude-code';

  /** Lines for this app, added to the opening. */
  function appLines(ctx) {
    const app = appOf(ctx);
    const out = [];
    if (app === 'chatgpt') out.push(t("Don't round, simplify or swap the values for similar ones; if something can't be done exactly, say so."));
    if (app === 'editor') out.push(t('Find where each part lives in this project before editing, and reuse its existing components, styles and design variables (if the project is empty, set the colors, fonts and spacing up as shared variables first).'));
    return out;
  }

  const LABELS = {
    where_on_my_site: tk('Where on my site'), task: tk('What to do'), what: tk('What it is'), values: tk('Exact values'), fit_to_my_site: tk('Fit it to my site'),
    content_i_want: tk('What it should show'), change_i_want: tk('Change I want'), picture_i_want: tk('Picture I want'), note: tk('Note'), shared_spacing: tk('Shared spacing'), one_look: tk('Keep one look'), when_done: tk('When you are done'),
  };

  /** The tagged prompt as Markdown sections, for apps that read those better than tags. */
  function asMarkdown(text, short) {
    let md = text;
    const L = (k) => t(LABELS[k]);
    const detail = (n, from) => (n ? (from ? t('Detail {n} (from {site})', { n, site: from }) : t('Detail {n}', { n })) : from ? t('Detail (from {site})', { site: from }) : t('Detail'));
    // Blocks first, then any tag still mentioned in running text becomes its label in quotes.
    md = md.replace(/<design_detail(?: id="(\d+)")?(?: from="([^"]+)")?>\n/g, (m, n, from) => `### ${detail(n, from)}\n`);
    md = md.replace(/<\/design_detail>\n?/g, '');
    md = md.replace(/<values>\n([\s\S]*?)\n<\/values>/g, (m, body) => `**${L('values')}:**\n\`\`\`text\n${body}\n\`\`\``);
    md = md.replace(/<shared_spacing>\n([\s\S]*?)\n<\/shared_spacing>/g, (m, body) => `### ${L('shared_spacing')}\n${body}`);
    md = md.replace(/<one_look>\n([\s\S]*?)\n<\/one_look>/g, (m, body) => `### ${L('one_look')}\n${body}`);
    md = md.replace(/<my_instructions>\n([\s\S]*?)\n<\/my_instructions>/g, (m, body) => `### ${t('My own instructions')}\n${body}`);
    md = md.replace(/<when_done>\n([\s\S]*?)\n<\/when_done>/g, (m, body) => `### ${L('when_done')}\n${body}`);
    md = md.replace(/<fit_to_my_site>\n([\s\S]*?)\n<\/fit_to_my_site>/g, (m, body) => `**${L('fit_to_my_site')}:**\n${body}`);
    md = md.replace(/^<(\w+)>([^\n]*?)<\/\1>$/gm, (m, k, v) => (LABELS[k] ? `**${L(k)}:** ${v}` : m));
    md = md.replace(/<(\w+)>/g, (m, k) => (LABELS[k] ? `“${L(k)}”` : m));
    if (short) {
      // Site builders: the same content, tighter. Measured background words and the long
      // "Details" tails go; values and rules stay.
      const shotNote = new RegExp(`^\\*\\*${esc(L('note'))}:\\*\\* ${esc(t(PIC_NOTES.original[0]))}\\n`, 'gm');
      md = md.replace(/\n{3,}/g, '\n\n').replace(shotNote, '');
    }
    return md;
  }

  /** The finished prompt for the app it will be pasted into. */
  function forApp(text, ctx) {
    const app = appOf(ctx);
    return APPS[app].tags ? text : asMarkdown(text, !!APPS[app].short);
  }

  /** Whole-site details first (they set the look), then everything else in the order given. */
  const ordered = (items) => [...items.filter(isWholeSite), ...items.filter((it) => !isWholeSite(it))];

  // ---------- fitting a detail into the person's own site ----------

  const MOTION_TYPES = /^(animation|recorded-animation|hover|focus|scroll|media)$/;
  const SCHEME_TYPES = /^(palette|color|gradient|text-gradient)$/;
  const FORMAT_TYPES = /^(layout|structure|navigation|component|section|shared-style|section-format)$/;
  /** The panel names a section's parts in the person's language ("color scheme of …"): English or that. */
  const labelHas = (it, re, tr) => re.test(it.label || '') || (!!tr && (it.label || '').toLowerCase().includes(tr.toLowerCase()));
  const isMotion = (it) => MOTION_TYPES.test(it.type) || !!it.anim;
  const isScheme = (it) => SCHEME_TYPES.test(it.type) || (it.type === 'portion' && it.parts?.colors !== false && labelHas(it, /color scheme/i, t('color scheme'))) || it.type === 'design-system';
  const isFormat = (it) => FORMAT_TYPES.test(it.type) || (it.type === 'portion' && labelHas(it, /format/i, t('format')));
  const hasScheme = (it) => SCHEME_RE().test(it.code || '');
  const hasFonts = (it) => it.type === 'font' || it.type === 'design-system' || hasScheme(it);

  /** Any CSS color → #rrggbb (alpha dropped), or null. */
  function toHex(v) {
    v = String(v).trim().toLowerCase();
    let m = /^#([0-9a-f]{3,8})$/.exec(v);
    if (m) {
      let x = m[1];
      if (x.length === 3 || x.length === 4) x = x.slice(0, 3).split('').map((c) => c + c).join('');
      return `#${x.slice(0, 6)}`;
    }
    m = /^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:[ ,/]+([\d.]+%?))?\s*\)$/.exec(v);
    if (m) {
      const a = m[4] == null ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
      if (a < 0.15) return null; // nearly see-through: not a color anyone would match
      return `#${[m[1], m[2], m[3]].map((n) => Math.round(+n).toString(16).padStart(2, '0')).join('')}`;
    }
    return null;
  }
  const COLOR_RE = /#[0-9a-f]{3,8}\b|rgba?\([^)]*\)/gi;

  /** What job a color does, from the property it is used in (accent, text, background…). */
  function colorRole(prop, hex) {
    const sat = saturated(hex);
    const dark = lum(hex) < 0.5;
    if (/^(color|-webkit-text-fill-color|caret-color)$/.test(prop)) return sat ? 'accent color, used for text here' : dark ? 'dark text color' : 'light text color';
    if (/^background/.test(prop)) return sat ? 'accent color, as a fill' : 'background color';
    if (/^(border|outline)/.test(prop)) return sat ? 'accent color, as a border' : 'border color';
    if (/shadow|filter/.test(prop)) return sat ? 'accent color, as a glow' : null; // a plain shadow stays as it is
    if (/^(fill|stroke)$/.test(prop)) return sat ? 'accent color, for icons' : 'icon color';
    return sat ? 'accent color' : null;
  }

  /** Every distinct color in a detail's values, with the job it does there. */
  function colorsIn(code) {
    const out = new Map();
    for (const m of String(code || '').matchAll(/([a-z-]+)\s*:\s*([^;{}\n]+)/gi)) {
      const prop = m[1].toLowerCase();
      for (const c of m[2].match(COLOR_RE) || []) {
        const hex = toHex(c);
        if (!hex || out.has(hex)) continue;
        const role = colorRole(prop, hex);
        if (role) out.set(hex, role);
      }
    }
    return [...out].map(([hex, role]) => ({ hex, role }));
  }

  // ---------- colors in motion: relations, not values ----------
  const MOTION_COLOR_RE = /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3})\b|rgba?\([^)]*\)/gi;
  function rgbaOf(c) {
    c = String(c).trim();
    let m = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(c);
    if (m) {
      let h = m[1]; if (h.length === 3) h = h.split('').map((x) => x + x).join('');
      const n = parseInt(h.slice(0, 6), 16);
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1 };
    }
    m = /rgba?\(([^)]*)\)/i.exec(c);
    if (!m) return null;
    const v = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat);
    return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 };
  }
  function hslFrom(c) {
    const r = c.r / 255, g = c.g / 255, b = c.b / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    if (!d) return { h: 0, s: 0, l };
    return { h: (mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60, s: d / (l > 0.5 ? 2 - mx - mn : mx + mn), l };
  }
  /** ", 40% see-through" for a color that isn't solid (empty when it is). */
  const seeThrough = (a) => (a < 0.98 ? t(', {n}% see-through', { n: Math.round((1 - a) * 100) }) : '');
  /** A color in words precise enough to rebuild its role, without its value: "a vivid warm orange, lightness 53%". */
  function describeColor(c) {
    if (c.a < 0.05) return t('transparent');
    const h = hslFrom(c);
    const L = Math.round(h.l * 100);
    const hue = h.h < 15 || h.h >= 345 ? t('red') : h.h < 45 ? t('orange') : h.h < 70 ? t('yellow') : h.h < 160 ? t('green') : h.h < 200 ? t('teal') : h.h < 255 ? t('blue') : h.h < 290 ? t('violet') : t('pink');
    const warm = h.h < 70 || h.h >= 330 ? t('warm') : h.h >= 170 && h.h < 270 ? t('cool') : '';
    const see = seeThrough(c.a);
    if (h.s < 0.12 || h.l > 0.95 || h.l < 0.06) {
      const tint = h.s >= 0.05 && h.l > 0.03 && h.l < 0.98 ? warm || t('slightly tinted') : '';
      const name = h.l >= 0.9 ? t('near-white') : h.l <= 0.12 ? t('near-black') : h.l > 0.6 ? t('light gray') : h.l > 0.35 ? t('mid gray') : t('dark gray');
      const v = { tint, name, l: L, see };
      return tint ? t('a {tint} {name}, lightness {l}%{see}', v) : t('a {name}, lightness {l}%{see}', v);
    }
    const strength = h.s > 0.7 && h.l > 0.3 && h.l < 0.72 ? t('vivid') : h.s > 0.4 ? t('clear') : t('muted');
    const v = { strength, warm, hue, l: L, see };
    return warm ? t('a {strength} {warm} {hue}, lightness {l}%{see}', v) : t('a {strength} {hue}, lightness {l}%{see}', v);
  }
  function contrastOf(a, b) {
    const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    const rel = (x) => 0.2126 * lin(x.r) + 0.7152 * lin(x.g) + 0.0722 * lin(x.b);
    const [hi, lo] = [rel(a), rel(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  }
  /** ": on the original a vivid warm orange, lightness 53%, 3.6:1 against the background behind it". */
  function original(c, bg) {
    const color = describeColor(c);
    return ` (${bg && c.a > 0.5 ? t('on the original: {color}, {ratio}:1 against the background behind it', { color, ratio: contrastOf(c, bg).toFixed(1) }) : t('on the original: {color}', { color })})`;
  }
  const PROP_WORD = (p) => (/^(color|-webkit-text-fill-color)$/.test(p) ? t('text color') : /^background/.test(p) ? t('fill') : /^(border|outline)/.test(p) ? t('border color') : /shadow/.test(p) ? t('glow') : /^(fill|stroke)$/.test(p) ? t('icon color') : t('color'));
  /** A color with no resting value to compare with: its job on my site. */
  function colorJob(c, prop, bg) {
    const job = colorJobWords(c, prop);
    return job === 'transparent' ? job : `[${job}${original(c, bg)}]`;
  }
  /** The words inside the brackets (or the CSS keyword "transparent"). */
  function colorJobWords(c, prop) {
    const h = hslFrom(c);
    const see = { see: seeThrough(c.a) };
    if (c.a === 0) return 'transparent';
    if (/shadow/.test(prop) && h.s < 0.15) return h.l < 0.5 ? t('a dark shadow{see}', see) : t('a light shadow{see}', see);
    if (h.s >= 0.3 && h.l >= 0.2 && h.l <= 0.85) return t("my site's accent color{see}", see);
    if (h.l >= 0.94) return t("my site's lightest background color{see}", see);
    if (h.l <= 0.12) return t("my site's main text color{see}", see);
    return h.l > 0.5 ? t('a neutral gray from my site, light{see}', see) : t('a neutral gray from my site, dark{see}', see);
  }
  /** A color compared with the same property's resting value: "about 12% darker than at rest". */
  function colorVsRest(c, ref, prop, bg, at = 'resting') {
    if (c.a < 0.05) return 'transparent';
    const { said, plain } = colorVsRestWords(c, ref, prop, at);
    // Its resting value unchanged needs no description of the original.
    return plain ? `[${said}]` : `[${said}${original(c, bg)}]`;
  }
  /** The words inside the brackets, and whether they just say "its resting <word>". */
  function colorVsRestWords(c, ref, prop, at) {
    const a = hslFrom(c), b = hslFrom(ref);
    const v = { what: PROP_WORD(prop), state: at === 'starting' ? t('starting') : t('resting'), see: '' };
    const said = (text) => ({ said: text, plain: false });
    // From nothing: it fills in.
    if (ref.a < 0.05) return said(t('fills in where its {state} {what} was see-through', v));
    v.see = Math.abs(c.a - ref.a) > 0.05 ? (c.a < ref.a ? seeThrough(c.a) : t(', fully solid')) : '';
    const same = c.r === ref.r && c.g === ref.g && c.b === ref.b;
    if (same) return { said: t('its {state} {what}{see}', v), plain: !v.see && at === 'resting' };
    const dh = Math.abs(((a.h - b.h + 540) % 360) - 180);
    // Close colors are the same color, a little lighter or darker (checked before calling one neutral).
    if (Math.abs(a.l - b.l) < 0.065 && (dh < 20 || a.s < 0.12 || b.s < 0.12) && Math.abs(a.s - b.s) < 0.2) {
      const dl0 = a.l - b.l;
      return said(Math.abs(dl0) >= 0.02 ? (dl0 < 0 ? t('its {state} {what}, slightly darker{see}', v) : t('its {state} {what}, slightly lighter{see}', v)) : t('its {state} {what}, almost unchanged{see}', v));
    }
    // Very dark or very light colors read as neutrals (a dark navy is a text color, not an accent).
    const neutral = (x) => x.s < 0.15 || x.l < 0.2 || x.l > 0.95;
    if (neutral(b) && !neutral(a) && a.s >= 0.3) return said(b.l < 0.5 ? t("my site's accent color, instead of its dark neutral {state} {what}{see}", v) : t("my site's accent color, instead of its light neutral {state} {what}{see}", v));
    if (neutral(a) && !neutral(b)) return said(a.l > 0.5 ? t('a neutral (light) instead of its colored {state} {what}{see}', v) : t('a neutral (dark) instead of its colored {state} {what}{see}', v));
    if (dh > 25 && a.s >= 0.15 && b.s >= 0.15) return said(a.h < 70 || a.h >= 330 ? t('a different color from its {state} {what}: shifted toward warmer tones{see}', v) : t('a different color from its {state} {what}: shifted toward cooler tones{see}', v));
    const dl = a.l - b.l;
    const ds = a.s - b.s;
    const parts = [];
    if (Math.abs(dl) >= 0.03) parts.push(dl < 0 ? t('about {n}% darker', { n: Math.round(Math.abs(dl) * 100) }) : t('about {n}% lighter', { n: Math.round(Math.abs(dl) * 100) }));
    if (Math.abs(ds) >= 0.12) parts.push(ds > 0 ? t('more saturated') : t('more muted'));
    return said(parts.length ? t('its {state} {what}, {change}{see}', { ...v, change: andJoin(parts) }) : t('its {state} {what}, almost unchanged{see}', v));
  }
  /**
   * Replace every color in a piece of motion with words about how it relates: to the same property
   * at rest (from the site, or the first keyframe), or else to its job on my site.
   */
  function relateMotionColors(code, rest = {}, bgStr = null) {
    const bg = bgStr ? rgbaOf(bgStr) : null;
    const first = {};
    const count = {};
    // The first value of each property in the code (the resting block, or the 0% keyframe) is the reference.
    for (const m of String(code || '').matchAll(/([a-z-]+)\s*:\s*([^;{}\n]+)/gi)) {
      const prop = m[1].toLowerCase();
      const c = (m[2].match(MOTION_COLOR_RE) || [])[0];
      if (c) { count[prop] = (count[prop] || 0) + 1; if (!(prop in first)) first[prop] = c; }
    }
    return String(code || '').replace(/([a-z-]+)(\s*:\s*)([^;{}\n]+)/gi, (all, prop, sep, val) => {
      const p = prop.toLowerCase();
      // A property that appears once, with no resting value known, has nothing to compare with.
      const refStr = rest?.[p] || (count[p] > 1 ? first[p] : null);
      const ref = refStr && rgbaOf(refStr);
      const isFirst = !rest?.[p] && count[p] > 1 && first[p] && val.includes(first[p]) && val.indexOf(first[p]) === val.search(MOTION_COLOR_RE);
      MOTION_COLOR_RE.lastIndex = 0;
      const out = val.replace(MOTION_COLOR_RE, (m) => {
        const c = rgbaOf(m);
        if (!c) return m;
        if (ref && !(isFirst && m === first[p])) return colorVsRest(c, ref, p, bg, rest?.[p] ? 'resting' : 'starting');
        // The starting value itself: the color it already has on my site (or its job there).
        if (c.a < 0.05) return 'transparent';
        return ref && isFirst ? `[${t('its {what} on my site', { what: PROP_WORD(p) })}${original(c, bg)}]` : colorJob(c, p, bg);
      });
      return `${prop}${sep}${out}`;
    });
  }

  /** "every h2 heading", "button", "card"… for the thing a detail came from. */
  function nounOf(it) {
    const m = it.meta || {};
    if (it.type === 'font') {
      if (/^h[1-6]$/.test(m.tag || '')) return `${m.tag} heading`;
      if (/Button/.test(it.title || '')) return 'button';
      if (/Heading/.test(it.title || '')) return 'heading';
      // Display-size text that isn't an h-tag (e.g. a 57px all-caps line in a div) is a headline, never body text.
      const px = +((/font-size:\s*([\d.]+)px/.exec(it.code || '') || [])[1] || 0);
      if (/Headline/.test(it.title || '') || px >= 30) return 'big headline';
      return /Small/.test(it.title || '') ? 'piece of small text' : 'piece of body text';
    }
    if (m.kind === 'heading' && /^h[1-6]$/.test(m.tag || '')) return `${m.tag} heading`;
    return m.noun && m.noun !== 'element' && m.noun !== 'text' && m.noun !== 'section' ? m.noun : null;
  }
  const plural = (n) => (/y$/.test(n) ? `${n.slice(0, -1)}ies` : /(s|x|ch)$/.test(n) ? `${n}es` : /^piece of /.test(n) ? `pieces of ${n.slice(9)}` : `${n}s`);

  /** Where an earlier detail in the same message can be referred to (color scheme, fonts). */
  function refsFor(items) {
    const refs = { scheme: null, font: null, fontSchemes: items.filter(hasScheme).length, formats: items.flatMap((it) => (isFormat(it) ? spacingsOf(it) : [])).length };
    items.forEach((it, i) => {
      if (refs.scheme == null && isScheme(it) && !isMotion(it)) refs.scheme = i + 1;
      if (refs.font == null && hasFonts(it)) refs.font = i + 1;
    });
    return refs;
  }

  /** Which of my colors to use instead of the original's, in this situation. */
  function colorSource(ctx, refs, self) {
    if (refs.scheme && refs.scheme !== self) return t('the color in the same role from the color scheme in detail {n}', { n: refs.scheme });
    return t("my site's own colors in the same roles instead (for an accent: the color of my main buttons and links)");
  }

  const CONTENT = [
    [/^main headline/, tk('what I offer, said in one line')],
    [/^supporting line/, tk('who it is for and the main benefit')],
    [/^(sign-up call to action|main call to action)/, tk('the main thing I want visitors to do (e.g. order, book, sign up), linking to that page')],
    [/^contact \/ demo/, tk('how to reach me or book, linking to my contact or booking page')],
    [/^purchase/, tk('buying: links to my shop or order page')],
    [/^sign-in/, tk('only if my site has accounts; otherwise leave it out')],
    [/^secondary action/, tk('a second, smaller option (e.g. see the menu, learn more)')],
    [/^page links?/, tk('my real pages, most important first (keep the same look if I have more or fewer)')],
    [/^section title/, tk('what this section is about')],
    [/^subheading/, tk('what this part is about')],
    [/^small label above/, tk('a short category word for the section')],
    [/^description under the title/, tk('one or two sentences expanding on the title')],
    [/^card title/, tk('one of my real services, products or features each (whichever fits this section)')],
    [/^card description/, tk('one short line about each of them')],
    [/^price/, tk('my real prices')],
    [/^footer column title/, tk('groups of my links (e.g. Company, Help)')],
    [/^footer link/, tk('links to my real pages')],
    [/^legal link/, tk('my legal pages, if I have them')],
    [/^copyright/, tk('my business name and the year')],
    [/^learn-more/, tk('a link to the page with more detail on this')],
    [/^download/, tk('my app or file, only if I have one')],
    [/^small tag/, tk('a short tag (e.g. New, Popular)')],
    [/brand name/, tk('my logo and name')],
    [/^paragraph/, tk('my own text on this topic')],
  ];

  /** The block headers that end an outline (English, or the analyzer's translated labels). */
  function blockHead() {
    const tr = [t('Position on the page'), t('Spacing:'), t('Color relationships'), t('Font scheme:'), t('How they relate')].filter((x, i) => x !== ['Position on the page', 'Spacing:', 'Color relationships', 'Font scheme:', 'How they relate'][i]).map(esc);
    const fam = t('Families ({n}):');
    if (fam !== 'Families ({n}):') tr.push(esc(fam).replace('\\{n\\}', '\\d+'));
    return new RegExp(`^(?:(?:Position on the page|Spacing|Color relationships|Colors|Font scheme|Families|By role|How they relate|Background|Text)\\b${tr.length ? `|${tr.join('|')}` : ''})`);
  }

  /**
   * The purposes in an outline ("main headline, 5 words"), with how many there are. `purpose` is
   * English (for matching); `text` is how the outline wrote it (translated in other languages).
   */
  function purposesIn(code) {
    const out = [];
    const stack = []; // [indent, multiplier]
    let images = false;
    let icons = false;
    // Only the outline's own lines name content; the position, spacing, color and font blocks don't.
    let skip = false;
    for (const raw of String(code || '').split('\n')) {
      const m = /^(\s*)-\s+(.*)$/.exec(raw);
      if (!m) {
        if (!raw.trim()) skip = false;
        else if (blockHead().test(raw.trim())) skip = true;
        continue;
      }
      if (skip) continue;
      const indent = m[1].length;
      while (stack.length && stack[stack.length - 1][0] >= indent) stack.pop();
      const head = m[2].split(' — ')[0];
      const times = Number(/×(\d+)/.exec(head.split(':')[0])?.[1] || 1);
      const outer = stack.reduce((n, [, k]) => n * k, 1);
      stack.push([indent, times]);
      if (/^(image|picture|video)\b/.test(head) || /\bpicture\b/.test(head.split(':')[0])) images = true;
      if (/^icon\b/.test(head)) icons = true;
      const c = head.indexOf(':');
      if (c < 0) continue;
      let text = head.slice(c + 1).trim();
      const words = /,\s*(\d+)\s*words?( each)?\s*$/.exec(text);
      text = text.replace(/,\s*\d+\s*words?( each)?\s*$/, '').trim();
      if (!text || /^\d/.test(text)) continue;
      const purpose = purposeEn(text);
      const count = times * outer;
      const hit = out.find((p) => p.purpose === purpose);
      if (hit) { hit.count += count; continue; }
      out.push({ purpose, text, count, words: words ? Number(words[1]) : null });
    }
    return { list: out, images, icons };
  }

  /** What information goes in each part of a format, and where it comes from. */
  function contentGuide(it, ctx) {
    const { list, images, icons } = purposesIn(it.code);
    const lines = [];
    const want = (it.content || '').trim();
    if (want) lines.push(t('Fill it with what <content_i_want> says, spread over the parts below in the way that fits.'));
    const shown = list.filter((p) => CONTENT.some(([re]) => re.test(p.purpose)) || p.words).slice(0, 12);
    if (shown.length) {
      lines.push(t('What goes in it (the values set the layout; this is the content):'));
      for (const p of shown) {
        const hit = CONTENT.find(([re]) => re.test(p.purpose))?.[1];
        const advice = hit ? t(hit) : t('my own content for this');
        const size = p.words ? `, ${p.count > 1 ? tn(p.words, 'about {n} word each', 'about {n} words each') : tn(p.words, 'about {n} word', 'about {n} words')}` : '';
        lines.push(`  - ${p.count > 1 ? `${p.count}× ` : ''}${p.text}${size}: ${advice}`);
      }
    }
    if (icons) lines.push(t("Icons: simple icons that match what each part is about, in my site's icon style."));
    if (images) lines.push(t("Pictures: my own photos of the same kind of subject; where I don't have one, a clearly labeled placeholder saying what it should show."));
    if ((shown.length || images || icons) && !want) {
      lines.push('\u0001' + t("Take the content from my site (what is there now, or my other pages). Don't invent facts (prices, numbers, reviews, logos): leave a marked placeholder."));
    }
    return lines;
  }

  /** The <fit_to_my_site> lines for one detail: how it connects to the rest of the person's site. */
  function fitLines(it, ctx, refs, self) {
    const lines = [];
    const noun = nounOf(it);
    const where = (it.where || '').trim();
    const whole = isWholeSite(it);
    const adapt = (it.fit || 'exact') === 'adapt';
    if (it.type === 'picture' || it.makePicture) return lines;

    if (isMotion(it)) {
      if (MOTION_COLOR_RE.test(it.code || '')) lines.push(t('Its colors are described by how they relate to the rest of the design (lighter or darker than at rest, my accent, my text color…), not given as values: work each one out from my site\'s colors. "On the original" says what kind of color it was and how strongly it stood out; match that strength with my colors. Keep the movement and timing exact.'));
      MOTION_COLOR_RE.lastIndex = 0;
      if (noun && !whole && !/^all\b/i.test(where)) lines.push(t('Give my other {nouns} of the same kind the same movement so they behave alike, unless <where_on_my_site> names just one.', { nouns: nounMany(noun) }));
      lines.push('\u0001' + t('If that part of my site already moves at the same moment, replace that movement instead of adding a second one.'));
    }

    if (it.type === 'font') {
      const parts = it.textParts || {};
      const family = (/font-family:\s*["']?([^"',;\n]+)/.exec(it.code || '') || [])[1]?.trim();
      if (noun) lines.push(where && !whole ? t('Use it for every {noun} in that place, not just one, so they match.', { noun: nounOne(noun) }) : t('Use it for all my {nouns}.', { nouns: nounMany(noun) }));
      if (parts.font !== false && family) {
        const src = sourceEn(it.fontSource || '');
        if (/Google/.test(src)) lines.push(t('{family} is a free Google Font: load only the weights used, the way my site loads fonts.', { family }));
        else if (/system/.test(src)) lines.push(t('{family} is a system font: there is nothing to load.', { family }));
        else if (src) lines.push(t("On the original, {family} is {source}, so it may not be free to use: if I can't use it, pick the closest free font and tell me which.", { family, source: t(src).toLowerCase() }));
        else lines.push(t("If {family} isn't freely available, use the closest free font and tell me which.", { family }));
        const other = refs.font && refs.font !== self ? refs.font : null;
        if (other) lines.push(t('Pair it with the font from detail {n}.', { n: other }));
        else lines.push(t("Keep the rest of my text in my site's current fonts; tell me if the pairing looks off."));
      }
      if (parts.size !== false) lines.push(t('Sizes are for desktop; on phones scale them down in proportion.'));
    }

    if (isFormat(it)) {
      lines.push(...contentGuide(it, ctx));
      if (RELATIONS_RE().test(it.code || '')) lines.push('\u0001' + t('Keep the "Color relationships" in my colors: darker parts stay darker, cards keep their step, neutrals keep their tint (warm, cool or pure gray), text keeps its contrast, and the accent keeps its family and stays the only strong color.'));
      const withColors = it.type === 'portion' && labelHas(it, /color scheme/i, t('color scheme'));
      if (!withColors && !adapt && colorsIn(it.code).length) {
        lines.push(t("The colors in it are the original site's: use {source}.", { source: colorSource(ctx, refs, self) }));
      }
      if (POSITION_RE().test(it.code || '')) {
        lines.push(where && !whole
          ? t('Keep its place (see "Position on the page"): where <where_on_my_site> says, next to my parts like the ones above and below it, with the same width and the same gap or overlap.')
          : t('Keep its place (see "Position on the page"): next to my parts like the ones above and below it, with the same width and the same gap or overlap.'));
      }
      // A format is the layout only: fonts and colors come from elsewhere. ("The whole button /
      // area" copies everything on purpose, so it keeps its own fonts and colors.)
      if (!withColors && !hasScheme(it) && !/^(component|section)$/.test(it.type)) {
        const fontsFrom = refs.font && refs.font !== self ? t('the font scheme in detail {n}', { n: refs.font }) : null;
        const colorsFrom = refs.scheme && refs.scheme !== self ? t('the color scheme in detail {n}', { n: refs.scheme }) : null;
        lines.push(t('It copies the layout only, not fonts or colors: use {fonts} and {colors}. The text sizes listed are kept as a hierarchy (which text is bigger), not as a font.', { fonts: fontsFrom || t("my site's own fonts"), colors: colorsFrom || t("my site's own colors") }));
      }
      if (refs.formats < 2 && SPACING_RE().test(it.code || '')) lines.push('\u0001' + t('Use my other sections\' side padding and content width, so all edges line up.'));
      if (!withColors && !hasScheme(it) && /font-family|system-ui|serif|sans|\b\d+px, weight/i.test(it.code || '')) {
        lines.push(refs.font && refs.font !== self ? t("Fonts: use the font from detail {n} where it applies, and my site's own fonts elsewhere; the sizes, weights and spacing here are the rule.", { n: refs.font }) : t("Fonts: keep my site's own fonts; the sizes, weights and spacing here are the rule."));
      }
    }

    if (hasScheme(it)) {
      const code = it.code || '';
      lines.push(t('Fonts: put each role on my matching text in that place (main heading, section titles, body text, labels, buttons, menu links), replacing what my site uses there now.'));
      const famBlock = (familiesRe().exec(code) || [])[1] || '';
      const fams = [...famBlock.matchAll(/^- ([^,\n:]+)(?:, ([^:\n]+))?: /gm)];
      for (const [, fam, src] of fams.slice(0, 4)) {
        const en = sourceEn(src || '');
        if (/Google/.test(en)) lines.push(t('{family} is a free Google Font: load only the weights used, the way my site loads fonts.', { family: fam }));
        else if (/system/.test(en)) lines.push(t('{family} is a system font: there is nothing to load.', { family: fam }));
        else lines.push(src ? t("If {family} isn't free to use (on the original it is {source}), use the closest free font and tell me which.", { family: fam, source: src.toLowerCase() }) : t("If {family} isn't free to use, use the closest free font and tell me which.", { family: fam }));
      }
      if (RELATE_RE().test(code)) lines.push('\u0001' + t('Keep how the fonts relate (sizes against the body text, heavy vs light weights, tight vs relaxed lines): on phones scale every size down together so the ratios stay the same.'));
      lines.push('\u0001' + t('Fonts: use only the families listed (or their free stand-ins) and only the sizes, weights, line heights and letter spacing of the listed roles. Text with no listed role (buttons, menu links, captions) takes the body text\'s family at the nearest listed size. Add no other families, weights or sizes.'));
      lines.push('\u0001' + t('If this would leave my site with more than two font families, tell me before adding a third.'));
      if (refs.fontSchemes > 1 && refs.font && refs.font !== self) lines.push('\u0001' + t('Use one font scheme for the whole page: where details disagree on a family, follow detail {n}.', { n: refs.font }));
    }

    if (SHARES_RE().test(it.code || '')) {
      lines.push('\u0001' + t('Colors: give each color the share of the area listed under "How much of the area each fill covers": the biggest is the background of that part, not the accent. A color marked accent stays on small details (buttons, links, labels, lines) and is never a large background.'));
      lines.push('\u0001' + t('Add no gradients, glows, patterns or colors that aren\'t listed: where it says "flat colors only", use plain fills.'));
    }
    if (isScheme(it) && !isMotion(it)) {
      lines.push('\u0001' + t("Put the colors in my site's color settings (theme variables or config), named by role; keep my text and buttons readable on them."));
      const kind = it.meta?.kind || '';
      // A color taken from one element (a button, a card, a tag) is that element's fill, never the page's.
      const ofElement = it.type === 'color' && kind && !/^(section|nav|header|footer|page|body)$/.test(kind);
      if (ofElement) {
        const noun = it.meta?.noun || kind;
        lines.push(t('This is the fill of the {noun} I picked, not a page or section background: use it only on {nouns} like it (and their hover), never as the background of the page or of a section.', { noun: nounOne(noun), nouns: nounMany(noun, `${noun}s`) }));
      }
      const insideElement = it.type === 'palette' && it.title === 'Its colors' && kind && !/^(section|page|body)$/.test(kind);
      if (insideElement) lines.push(t('These are the colors of the {noun} I picked and what is inside it: use them there, in the same roles, not across the whole page.', { noun: nounOne(it.meta?.noun || kind) }));
      const band = !whole && !ofElement && it.type !== 'palette' && it.type !== 'design-system' && !/^(nav|header|footer)$/.test(kind) && (it.type === 'portion' || kind === 'section' || /^section/.test(it.type));
      if (band) lines.push('\u0001' + t('Blend its edges into the sections above and below (no hard seams).'));
    }

    if (!isMotion(it) && !isFormat(it) && !isScheme(it) && it.type !== 'font' && noun && !whole) {
      lines.push(t('Use it on every {noun} of this kind in that place, so they match.', { noun: nounOne(noun) }));
    }
    return lines.filter(Boolean);
  }

  // What a pasted picture shows: [one picture, "Picture N" when several are combined].
  const PIC_NOTES = {
    reference: [tk('The pasted picture is the original I picked, as a reference.'), tk('{picture} (pasted with this message) is the original I picked, as a reference.')],
    film: [tk('The pasted picture is a filmstrip of the original animation, frames in order.'), tk('{picture} (pasted with this message) is a filmstrip of the original animation, frames in order.')],
    beforeafter: [tk('The pasted picture shows it at rest, then in that state (before → after).'), tk('{picture} (pasted with this message) shows it at rest, then in that state (before → after).')],
    scrollfilm: [tk('The pasted picture shows the page at points while scrolling through it, in order.'), tk('{picture} (pasted with this message) shows the page at points while scrolling through it, in order.')],
    original: [tk('The pasted picture shows the original.'), tk('{picture} (pasted with this message) shows the original.')],
  };

  function detailBlock(it, opts, n) {
    const from = (() => { try { return new URL(it.url).host; } catch { return ''; } })();
    const ctx = opts.ctx || {};
    const lines = [`<design_detail${n ? ` id="${n}"` : ''}${from ? ` from="${from}"` : ''}>`];
    if (it.where?.trim()) lines.push(`<where_on_my_site>${it.where.trim()}</where_on_my_site>`);
    const task = taskFor(it, ctx);
    if (task) lines.push(`<task>${task}</task>`);
    const parts = it.textParts;
    lines.push(`<what>${parts ? textWhat(it, parts) : it.label}</what>`);
    // The pasted picture: "this message's picture" for one prompt, or "Picture N" when several are combined.
    const picLabel = opts.pictureLabels?.[it.bid] || null;
    const hasPicture = !!(picLabel || (opts.pictureFor ? opts.pictureFor === it.bid : opts.picture && it.shot));
    const picNote = (what) => (picLabel ? t(PIC_NOTES[what][1], { picture: picLabel }) : t(PIC_NOTES[what][0]));
    if (it.makePicture) {
      // "Make a new picture from this": the person's own words are the brief, the pick is the reference.
      lines.push(`<picture_i_want>${(it.request || '').trim() || t('a new picture like this one')}</picture_i_want>`);
      lines.push(`<fit_to_my_site>${t('Make it fit the rest of my site: its colors and style.')}</fit_to_my_site>`);
      lines.push(`<note>${hasPicture ? picNote('reference') : t('I will paste the original picture as a reference.')}</note>`);
      lines.push('</design_detail>');
      return lines.join('\n');
    }
    if (it.type === 'picture') {
      // The person's own words are the whole brief; the pasted picture is the reference.
      if (it.picturePrompt?.trim()) lines.push(`<picture_i_want>${it.picturePrompt.trim()}</picture_i_want>`);
      lines.push(`<note>${hasPicture ? t(PIC_NOTES.reference[0]) : t('I will paste the original picture as a reference.')}</note>`);
      lines.push('</design_detail>');
      return lines.join('\n');
    }
    let values = parts ? textValues(it.code, parts) : it.code;
    // Motion never carries color values: each color is said by how it relates to the rest.
    if (isMotion(it)) values = relateMotionColors(values, it.restColors, it.bgBehind);
    lines.push('<values>', values.trim(), '</values>');
    const fit = (opts.fit_ || fitLines(it, ctx, opts.refs || {}, n)).map((l) => l.replace(/^\u0001/, ''));
    if (fit.length) lines.push('<fit_to_my_site>', ...fit.map((l) => (/^\s+-/.test(l) ? l : `- ${l}`)), '</fit_to_my_site>');
    if (it.content?.trim()) lines.push(`<content_i_want>${it.content.trim()}</content_i_want>`);
    if (it.request?.trim()) lines.push(`<change_i_want>${it.request.trim()}</change_i_want>`);
    const notes = [];
    if (parts) {
      const skipped = ['font', 'size', 'color'].filter((k) => parts[k] === false);
      const word = (k) => (k === 'font' ? t('font') : k === 'size' ? t('size') : t('color'));
      if (skipped.length) notes.push(t('I only want the {kept}; choose the {skipped} yourself, to suit my site.', { kept: andJoin(['font', 'size', 'color'].filter((k) => parts[k] !== false).map(word)) || t('style'), skipped: andJoin(skipped.map(word)) }));
    }
    if (it.adjustNote) notes.push(t('These values include my tweaks ({tweaks}).', { tweaks: it.adjustNote }));
    if ((it.fit || opts.fit) === 'adapt') notes.push(t("I want the effect, but in my site's own colors and fonts rather than these exact values."));
    if (it.type === 'media') notes.push(t("This is media (a drawing, video or animation file), not CSS, so it can't be copied directly."));
    if (hasPicture) notes.push(picNote(/^(film|beforeafter|scrollfilm)$/.test(it.shotKind || '') ? it.shotKind : 'original'));
    for (const note of notes) lines.push(`<note>${note}</note>`);
    lines.push('</design_detail>');
    return lines.join('\n');
  }

  /**
   * Number the details and build them, so they can refer to each other (colors, fonts).
   * General lines that would repeat in two or more details ("take the content from my site",
   * "put the colors in my color settings") are said once, before the details.
   */
  function blocks(items, opts) {
    const list = ordered(items);
    const refs = refsFor(list);
    const fits = list.map((it, i) => fitLines(it, opts.ctx || {}, refs, i + 1));
    const count = new Map();
    for (const f of fits) for (const l of new Set(f.filter((x) => x.startsWith('\u0001')))) count.set(l, (count.get(l) || 0) + 1);
    const shared = [...count].filter(([, k]) => k > 1).map(([l]) => l);
    const out = list.map((it, i) => detailBlock(it, { ...opts, refs, fit_: fits[i].filter((l) => !shared.includes(l)) }, i + 1));
    return { out, shared: shared.map((l) => l.slice(1)), spacing: sharedSpacing(list, opts.ctx || {}), look: sharedLook(list, opts.ctx || {}) };
  }

  /** A measured "Spacing: sides 40px · content width 1120px · …" line, as a map. */
  function spacingMap(line) {
    const out = new Map();
    for (const part of line.split(' · ')) {
      const x = /^(.+?) (\d+)px( wide)?$/.exec(part.trim());
      if (x) out.set(x[3] ? 'content' : x[1], Number(x[2]));
    }
    return out;
  }
  /** Every Spacing line of a detail (a span of sections has one per section), and whether it is a top/bottom bar. */
  function spacingsOf(it) {
    const out = [];
    const code = it.code || '';
    const re = SPACING_RE('gm');
    let m;
    while ((m = re.exec(code))) {
      const before = code.slice(0, m.index);
      const at = before.lastIndexOf('\nPart ');
      const head = at >= 0 ? before.slice(at + 1).split('\n')[0] : '';
      const bar = head ? /navigation|header|footer/i.test(head) : /^(nav|header|footer)$/.test(it.meta?.kind || '');
      out.push({ sp: spacingMap(m[1]), bar });
    }
    return out;
  }
  /** The most common value (the first one on a tie). */
  function mostCommon(values) {
    const n = new Map();
    for (const v of values) n.set(v, (n.get(v) || 0) + 1);
    let best = null;
    for (const [v, k] of n) if (best == null || k > n.get(best)) best = v;
    return best;
  }

  /**
   * Several formats copied onto one page must read as one page: one side padding, one content
   * width, one section rhythm, the same gaps between text blocks. Picked from what the copied parts
   * have in common (the most common value; the first one on a tie).
   */
  function sharedSpacing(items, ctx) {
    const list = items.filter((it) => isFormat(it)).flatMap((it) => spacingsOf(it).map((x) => ({ it, ...x })));
    if (list.length < 2) return '';
    const bands = list.filter((x) => !x.bar);
    const pick = (key, from = list, ok = () => true) => mostCommon(from.map((x) => x.sp.get(key)).filter((v) => v != null && ok(v)));
    const lines = [];
    // Full-bleed sections report 0 side padding; that is not a rule worth sharing.
    const sides = pick('sides', list, (v) => v > 0);
    if (sides != null) lines.push(t('Side padding: {sides}px on every part (on phones, one smaller value for every part, e.g. {phone}px)', { sides, phone: Math.min(sides, 20) }));
    const widths = list.map((x) => x.sp.get('content width')).filter((v) => v != null);
    if (widths.length) lines.push(t('Content width: at most {width}px, centered, for every part', { width: Math.max(...widths) }));
    const rhythm = mostCommon(bands.flatMap((x) => [x.sp.get('top'), x.sp.get('bottom')]).filter((v) => v != null && v >= 24 && v <= 200));
    if (rhythm != null) lines.push(t('Space at the top and bottom of each section: {space}px', { space: rhythm }));
    const pairs = new Map();
    for (const { sp } of list) for (const [k, v] of sp) if (k.includes('→')) { if (!pairs.has(k)) pairs.set(k, []); pairs.get(k).push(v); }
    if (pairs.size) lines.push(t('Between text blocks, the same everywhere: {list}', { list: [...pairs].map(([k, v]) => `${k} ${mostCommon(v)}px`).join(' · ') }));
    const cards = pick('between cards');
    if (cards != null) lines.push(t('Between cards or items side by side: {space}px', { space: cards }));
    if (!lines.length) return '';
    const tail = `\n${t('If the rest of my page already uses one consistent spacing, use that instead, so the new parts line up with the old ones.')}`;
    return `<shared_spacing>\n${t("So the page reads as one, every part below uses one spacing system, even where a detail's own numbers differ:")}\n${lines.map((l) => `- ${l}`).join('\n')}${tail}\n</shared_spacing>`;
  }

  // ---------- one look across details (fonts, accent, corners, shadows, buttons, motion) ----------

  const GENERIC_FAMILY = /^(inherit|initial|system-ui|-apple-system|blinkmacsystemfont|sans-serif|serif|monospace|cursive|ui-sans-serif|ui-serif|ui-monospace|segoe ui|roboto|helvetica( neue)?|arial|times( new roman)?)$/i;

  /** Font families a detail uses, in the forms the analyzer writes them. */
  function familiesIn(code) {
    const out = new Set();
    const add = (f) => {
      const v = String(f || '').trim().replace(/^["']|["']$/g, '').trim();
      if (v && v.length < 40 && !/^\d/.test(v) && !GENERIC_FAMILY.test(v) && !/fallback$/i.test(v) && !/^(there is|body text|text)/i.test(v)) out.add(v);
    };
    const c = String(code || '');
    for (const m of c.matchAll(/font-family:\s*["']?([^"',;\n}]+)/gi)) add(m[1]);
    for (const m of c.matchAll(/\bfont:\s*(?:italic\s+)?\d{3}\s+[\d.]+px\/[\d.a-z]+\s+["']?([^;"'}\n,]+)/gi)) add(m[1]);
    for (const m of c.matchAll(/\bfont:\s*([A-Za-z][^,(\n;:]{1,38}),\s*(?:tiny|small|normal|medium|big|huge|large)/gi)) add(m[1]);
    const fam = familiesRe().exec(c);
    if (fam) for (const m of fam[1].matchAll(/^- ([^,\n:]+)/gm)) add(m[1]);
    return [...out];
  }

  /** Corner sizes in a detail: numbers in px, "pill" for fully rounded. */
  function radiiIn(code) {
    const out = [];
    for (const m of String(code || '').matchAll(/(?:border-radius:\s*|\bradius\s+)(full \(pill\)|999px|9999px|\d+(?:\.\d+)?px)/gi)) {
      const v = m[1];
      out.push(/pill|999/.test(v) ? 'pill' : Math.round(parseFloat(v)));
    }
    return out;
  }

  /** Raised-shadow styles in a detail (insets and focus rings are not "a shadow style"). */
  function shadowsIn(code) {
    const out = [];
    for (const m of String(code || '').matchAll(/(?:box-shadow:\s*|\bshadow\s+)([^;\n·]+)/gi)) {
      const v = m[1].trim().replace(/[.,]$/, '');
      if (!/inset|^none/.test(v) && /\d+px/.test(v)) out.push(v);
    }
    return out;
  }

  /** Easing curves in a detail's movement. */
  function easingsIn(code) {
    const out = [];
    const c = String(code || '');
    for (const m of c.matchAll(/\beasing\s+((?:cubic-bezier\([^)]*\))|ease-in-out|ease-out|ease-in|ease|linear)/gi)) out.push(m[1].replace(/\s+/g, ''));
    for (const m of c.matchAll(/(?:transition|animation):[^;\n]*?((?:cubic-bezier\([^)]*\))|ease-in-out|ease-out|ease-in|\bease\b)/gi)) out.push(m[1].replace(/\s+/g, ''));
    // In another language the word "easing" before the curve is translated: take the curves themselves.
    if (!out.length && globalThis.I18N?.lang && globalThis.I18N.lang !== 'en') {
      for (const m of c.matchAll(/cubic-bezier\([^)]*\)|ease-in-out|ease-out|ease-in/gi)) out.push(m[0].replace(/\s+/g, ''));
    }
    return out;
  }

  /** Two colors that look the same (anti-aliasing and rounding make tiny differences). */
  function sameColor(a, b) {
    const n = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    if (!/^#[0-9a-f]{6}/i.test(a) || !/^#[0-9a-f]{6}/i.test(b)) return a === b;
    const [x, y] = [n(a), n(b)];
    return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]) < 28;
  }

  /**
   * Parts copied from different places must still look like one site: one pair of fonts, one accent,
   * one set of corner sizes, one shadow, one button style, one feel of movement. Picked from what
   * the copied parts use most (the first one on a tie). Said only where the details disagree.
   * Every prompt also says to reuse what my site (or earlier prompts) already set up.
   */
  function sharedLook(items, ctx) {
    const lines = [];
    const looks = items.filter((it) => it.type !== 'picture' && !it.makePicture);
    const many = looks.length >= 2;
    if (many) {
      // Fonts: at most two families on the page.
      const perItem = looks.map((it) => (it.textParts?.font === false || it.fit === 'adapt' ? [] : familiesIn(it.code)));
      const all = perItem.flat();
      const distinct = [...new Set(all)];
      if (distinct.length > 2) {
        const counts = new Map();
        for (const f of all) counts.set(f, (counts.get(f) || 0) + 1);
        // A font or font-scheme detail was chosen on purpose: its families win.
        const fontItem = looks.find((it) => hasFonts(it) && it.textParts?.font !== false);
        const chosen = fontItem ? familiesIn(fontItem.code).slice(0, 2) : [];
        const top = [...chosen, ...[...counts].sort((a, b) => b[1] - a[1]).map(([f]) => f).filter((f) => !chosen.includes(f))].slice(0, 2);
        const rest = distinct.filter((f) => !top.includes(f));
        lines.push(t("Fonts: at most two families on the whole page: my site's own fonts if it has them; otherwise {fonts} (the ones used most here; the bolder or larger one for headings, the other for everything else). Where a detail uses another family ({others}), use these instead, keeping its sizes and weights.", { fonts: andJoin(top), others: rest.join(', ') }));
      }
      // Accent: one strong color for buttons, links and highlights.
      const accents = [];
      looks.forEach((it, i) => {
        if (it.keepColors || it.fit === 'adapt') return;
        const a = colorsIn(it.code).find((c) => /^accent/.test(c.role));
        if (a) accents.push({ hex: a.hex, n: i + 1 });
      });
      const groups = [];
      for (const a of accents) {
        const g = groups.find((x) => sameColor(x.hex, a.hex));
        if (g) g.count++; else groups.push({ hex: a.hex, count: 1 });
      }
      if (groups.length > 1) {
        // A color scheme detail was chosen on purpose: its accent wins over a count.
        const schemeItem = looks.find((it) => isScheme(it) && !isMotion(it));
        const schemeAccent = schemeItem && colorsIn(schemeItem.code).find((c) => /^accent/.test(c.role));
        const main = (schemeAccent && groups.find((g) => sameColor(g.hex, schemeAccent.hex))) || [...groups].sort((a, b) => b.count - a.count)[0];
        const others = groups.filter((g) => g !== main).map((g) => g.hex);
        lines.push(t("Accent color: one strong color for buttons, links and highlights on the whole page: my site's main accent (the color of my main buttons and links) if it has one; otherwise {color}. Where a detail uses another accent ({others}), use that one instead (lighter or darker shades of it are fine for hover states and backgrounds).", { color: main.hex, others: others.join(', ') }));
      }
      // Corners.
      const radii = looks.flatMap((it) => radiiIn(it.code)).filter((r) => r !== 0);
      const nums = radii.filter((r) => r !== 'pill');
      const small = nums.filter((r) => r <= 12), large = nums.filter((r) => r > 12);
      const spread = (l) => (l.length ? Math.max(...l) - Math.min(...l) : 0);
      if (spread(small) > 2 || spread(large) > 4) {
        const parts = [];
        if (small.length) parts.push(t('{size}px for small things (buttons, inputs, tags)', { size: mostCommon(small) }));
        if (large.length) parts.push(t('{size}px for big things (cards, images, panels)', { size: mostCommon(large) }));
        if (radii.includes('pill')) parts.push(t('pill shapes stay pills'));
        lines.push(t("Corners: one set of corner sizes everywhere: {sizes} (or my site's own corner sizes, if it already has them).", { sizes: parts.join('; ') }));
      }
      // Shadows.
      const shadows = looks.map((it) => shadowsIn(it.code)[0]).filter(Boolean);
      if (new Set(shadows.map((x) => x.replace(/\s+/g, ''))).size > 1) lines.push(t("Shadows: one shadow style for raised things (cards, menus, pop-ups): my site's own, if it has one; otherwise {shadow}; use it wherever a detail has a different one.", { shadow: mostCommon(shadows) }));
      // Buttons.
      const withButtons = looks.filter((it) => /\bbutton/i.test(it.code || '') || /button/i.test(it.meta?.kind || '')).length;
      if (withButtons >= 2) lines.push(t('Buttons: every main button on the page looks the same (one color, corner size, height and font); secondary buttons share one second, quieter style.'));
      // Movement.
      const motion = looks.filter((it) => isMotion(it));
      const eases = motion.map((it) => easingsIn(it.code)[0]).filter(Boolean);
      if (new Set(eases).size > 1) lines.push(t("Movement: one easing for every animation here, {easing}, so everything moves with the same feel; keep each detail's own duration.", { easing: mostCommon(eases) }));
    }
    // Only where the details disagree; "reuse what my site has" is said once, in the opening.
    if (!lines.length) return '';
    return `<one_look>\n${t('So every part looks like the same site, even where the details come from different places:')}\n${lines.map((l) => `- ${l}`).join('\n')}\n</one_look>`;
  }

  /**
   * The closing: make every change for real and prove it. Without it, chat apps sometimes report
   * changes they never made, or make tiny tweaks and call the job done.
   */
  function closing(items, ctx) {
    const app = appOf(ctx);
    const layout = items.some((it) => isFormat(it));
    const lines = [];
    if (app === 'builder') {
      lines.push(t('Make every change for real, then list what changed for each detail (old → new).'));
      return `<when_done>\n${lines.map((l) => `- ${l}`).join('\n')}\n</when_done>`;
    }
    lines.push(t("Make every change for real in the code; never describe one you didn't make."));
    if (layout) lines.push(t('Rebuild any layout that differs from its outline (same parts, order, arrangement, widths, gaps); changing only sizes is not enough.'));
    lines.push(t('End with each detail by number as old → new (e.g. "cards stacked → 3 in a row"), or say it already matched and show the values.'));
    if (!APPS[app].seesCode) lines.push(t('Give me the complete updated file(s), not snippets, and say which file each one replaces.'));
    return `<when_done>\n${lines.map((l) => `- ${l}`).join('\n')}\n</when_done>`;
  }

  /** The opening, plus the general lines that apply to several details, plus shared spacing. */
  function opening(ctx, shared, spacing = '', look = '') {
    const general = shared.length ? `\n${t('For every detail below where it applies:')}\n${shared.map((l) => `- ${l}`).join('\n')}` : '';
    const app = appLines(ctx);
    return `${header(ctx)}${app.length ? `\n${app.join('\n')}` : ''}${general}${spacing ? `\n\n${spacing}` : ''}${look ? `\n\n${look}` : ''}`;
  }

  /**
   * One prompt: the context opening (said once; without it Claude treats copied details as loose
   * inspiration and doesn't know whether it is building or changing), then one block per detail.
   * @param {object[]} items basket entries
   * @param {{fit?:'exact'|'adapt', pictureFor?:string|null, ctx?:{mode?:'new'|'change', about?:string}}} opts
   */
  /** What the site is about matters only when building it (the AI writes the text); a site being
   *  changed already says what it is. */
  // The prompts no longer depend on "new site or changing": only the AI app matters.
  const forMode = (ctx) => ({ app: ctx?.app, custom: ctx?.custom });

  /**
   * The person's own standing instructions ("My instructions" in the panel), added to every prompt
   * just before <when_done>, in their own words. Added after the color shift, so colors they type stay exact.
   */
  const CUSTOM_MAX = 2000;
  function withCustom(text, ctx) {
    const own = String(ctx?.custom || '').trim().slice(0, CUSTOM_MAX);
    if (!own) return text;
    const block = `<my_instructions>\n${t('Also follow these instructions of mine for everything above:')}\n${own}\n</my_instructions>\n\n`;
    const at = text.lastIndexOf('<when_done>');
    return at < 0 ? `${text}\n${block}` : text.slice(0, at) + block + text.slice(at);
  }

  function buildSupplemental(items, opts = {}) {
    if (opts.ctx) opts = { ...opts, ctx: forMode(opts.ctx) };
    const fitAll = opts.fit;
    const all = items.map((it) => ({ ...it, fit: it.fit || fitAll }));
    const { out, shared, spacing, look } = blocks(all, opts);
    return forApp(withCustom(`${opening(opts.ctx, shared, spacing, look)}\n\n${out.join('\n\n')}\n\n${closing(all, opts.ctx || {})}\n`, opts.ctx), opts.ctx);
  }

  /**
   * Several saved prompts as ONE message, rebuilt from their details so the opening and context are
   * said once and match the current situation. Pictures are numbered in the order of the list.
   * @param {{basket:object[], fit?:string, pictureBid?:string|null}[]} entries in the order to send
   */
  function combine(entries, ctx = {}) {
    ctx = forMode(ctx);
    const pictureLabels = {};
    let n = 0;
    for (const e of entries) if (e.pictureBid) pictureLabels[e.pictureBid] = t('Picture {n}', { n: ++n });
    const items = entries.flatMap((e) => e.basket.map((b) => ({ ...b, fit: b.fit || e.fit })));
    const { out, shared, spacing, look } = blocks(items, { ctx, pictureLabels });
    const body = `${out.join('\n\n')}\n\n${closing(items, ctx)}\n`;
    const hasColors = SHIFT_RE.test(body);
    SHIFT_RE.lastIndex = 0;
    const note = hasColors ? `\n${t(SHIFT_NOTE)}` : '';
    // Same list → same shift, so copying twice gives the same prompt.
    const seed = hashOf(items.map((b) => b.bid || b.label || '').join('|'));
    const text = `${opening(ctx, shared, spacing, look)}${note}\n\n${body}`;
    // Tests that compare exact values switch the shift off (globalThis.__plNoShift); people never do.
    return forApp(withCustom(globalThis.__plNoShift ? text : shiftColors(text, seed), ctx), ctx);
  }

  // ---------- colors are never copied exactly ----------
  // Every color in the prompt is moved a little (a few degrees of hue, a touch of saturation and
  // lightness), the same way for all of them, so the palette keeps its relationships and contrast
  // but no value is the original site's. One mapping per prompt: equal colors stay equal.
  const SHIFT_RE = /#(?:[0-9a-f]{6}|[0-9a-f]{3})\b|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(?:,\s*[\d.]+\s*)?\)/gi;
  const SHIFT_NOTE = tk('The color values here are deliberately shifted a little from the original site (same relationships and contrast, not the same colors): use them as given, even where a picture shows slightly different ones.');
  function hashOf(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function shiftColors(text, seed = 1) {
    const dir = seed & 1 ? 1 : -1;
    const dh = dir * (5 + (seed % 5)); // 5–9° of hue
    const ds = 0.94 + ((seed >> 3) % 5) / 100; // saturation ×0.94–0.98
    const dl = (((seed >> 6) % 3) + 1) / 100; // lightness 1–3 points, toward the middle
    const cache = new Map();
    const move = (r, g, b) => {
      r /= 255; g /= 255; b /= 255;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      let h = 0, s = 0; const l = (mx + mn) / 2; const d = mx - mn;
      if (d) { s = d / (l > 0.5 ? 2 - mx - mn : mx + mn); h = (mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60; }
      const nh = (h + (s > 0.04 ? dh : 0) + 360) % 360;
      const ns = Math.min(1, s * ds);
      const nl = Math.min(1, Math.max(0, l > 0.5 ? l - dl * (l > 0.9 ? 0.6 : 1) : l + dl * (l < 0.1 ? 0.6 : 1)));
      const q = nl < 0.5 ? nl * (1 + ns) : nl + ns - nl * ns, p = 2 * nl - q;
      const f = (t) => { t = (t + 360) % 360 / 360; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
      return [f(nh + 120), f(nh), f(nh - 120)].map((v) => Math.round(v * 255));
    };
    return text.replace(SHIFT_RE, (m) => {
      if (cache.has(m.toLowerCase())) return cache.get(m.toLowerCase());
      let out = m;
      if (m[0] === '#') {
        const hex = m.length === 4 ? m.slice(1).split('').map((c) => c + c).join('') : m.slice(1);
        const n = parseInt(hex, 16);
        out = '#' + move((n >> 16) & 255, (n >> 8) & 255, n & 255).map((v) => v.toString(16).padStart(2, '0')).join('');
      } else {
        const v = m.match(/[\d.]+/g).map(Number);
        const [r, g, b] = move(v[0], v[1], v[2]);
        out = v.length > 3 ? `rgba(${r},${g},${b},${v[3]})` : `rgb(${r},${g},${b})`;
      }
      cache.set(m.toLowerCase(), out);
      return out;
    });
  }

  globalThis.HuescribePrompts = { version: 11, withCustom, CUSTOM_MAX, relateMotionColors, shiftColors, sharedLook, familiesIn, APPS, CATEGORIES, guideBody, section, buildSupplemental, combine, animationCode, header, colorsIn, purposesIn };
})();
