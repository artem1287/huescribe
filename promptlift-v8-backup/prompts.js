// PromptLift prompt builders: Claude-optimized supplemental prompts ("add this one thing to my
// existing site") plus the site-agnostic style-guide renderer used for whole-palette and
// whole-design-system items. Loaded by the side panel and injected into pages.

(() => {
  if (globalThis.PromptLiftPrompts?.version === 9) return;

  const CATEGORIES = {
    fonts: { label: 'Typography', title: 'Typography guide' },
    colors: { label: 'Color', title: 'Color guide' },
    animations: { label: 'Motion', title: 'Motion guide' },
    layout: { label: 'Layout', title: 'Layout guide' },
    shape: { label: 'Shape & depth', title: 'Shape & depth guide' },
    components: { label: 'Components', title: 'Component guide' },
    all: { label: 'Full design system', title: 'Design guide' },
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
    const x = hsl(hex); if (!x) return 'accent';
    const h = x.h;
    return h < 15 || h >= 345 ? 'red' : h < 40 ? 'orange' : h < 65 ? 'yellow' : h < 90 ? 'lime' : h < 165 ? 'green' : h < 190 ? 'teal' : h < 205 ? 'cyan' : h < 250 ? 'blue' : h < 270 ? 'indigo' : h < 295 ? 'violet' : h < 320 ? 'purple' : 'pink';
  }
  function neutralTone(hex) {
    const x = hsl(hex); if (!x) return 'neutral';
    if (x.s < 0.06) return 'neutral grey';
    return x.h < 70 || x.h > 300 ? 'warm' : 'cool';
  }

  const EASINGS = {
    'cubic-bezier(0.16, 1, 0.3, 1)': 'expo-out: fast start, long soft settle',
    'cubic-bezier(0.22, 1, 0.36, 1)': 'quint-out: fast start, soft settle',
    'cubic-bezier(0.4, 0, 0.2, 1)': 'standard ease-in-out',
    'cubic-bezier(0.34, 1.56, 0.64, 1)': 'back-out: slight overshoot',
    'cubic-bezier(0.68, -0.55, 0.265, 1.55)': 'back-in-out: springy',
    'cubic-bezier(0.25, 0.1, 0.25, 1)': 'ease',
  };

  // ---------- formatting ----------

  const join = (arr, sep = ' · ') => arr.filter(Boolean).join(sep);
  const css = (obj) => Object.entries(obj || {}).filter(([, v]) => v != null && v !== '').map(([k, v]) => `${k}:${v}`).join('; ');
  const em = (n) => (n ? `${n}em` : '');

  // ---------- sections ----------

  function typography(f) {
    if (!f || f.error || !f.roles) return '';
    const roles = f.roles;
    const out = ['## Typography'];
    if (f.families?.length) {
      out.push('Fonts:');
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
    out.push('Scale (size / weight / line-height / letter-spacing):');
    for (const [spec, rs] of groups) out.push(`- ${rs.join(', ')}: ${spec}`);

    const feel = [];
    const head = roles.h1 || roles.h2; const body = roles.body;
    if (head && body) {
      if (head.family !== body.family) feel.push(`${head.class} headings paired with a ${body.class} body`);
      else feel.push(`one ${body.class} family throughout`);
      if (head.tracking < -0.005) feel.push('tight heading tracking');
      const ratio = head.size / body.size;
      feel.push(ratio >= 3 ? 'dramatic size contrast' : ratio < 2 ? 'compact, restrained scale' : 'moderate scale');
    }
    if (Object.values(roles).some((s) => s.transform === 'uppercase')) feel.push('uppercase labels');
    if (feel.length) out.push(`Feel: ${feel.join(', ')}.`);
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
    const out = ['## Color'];
    out.push('- ' + join([`background ${base}`, surface && `surface/cards ${surface}`, inverse && `inverse sections ${inverse}`]));
    if (texts.length) out.push('- ' + join([`text ${texts[0]}`, texts[1] && `muted text ${texts[1]}`]));
    if (primary) out.push('- ' + join([`primary ${primary}${c.onAccent?.[primary] ? ` (text on it ${c.onAccent[primary]})` : ''}`, secondary && `secondary accent ${secondary}`]));
    if (c.borders?.[0]) out.push(`- border ${c.borders[0].value}`);
    for (const g of (c.gradients || []).slice(0, 2)) out.push(`- gradient (${g.kinds[0] || 'background'}): ${g.value}`);
    const dark = c.tokens?.dark;
    if (dark?.length) out.push(`- dark theme tokens: ${dark.slice(0, 8).map(([k, v]) => `${k}: ${v}`).join('; ')}`);
    else if (c.darkMode) out.push('- has a dark theme (derive it from these colors)');
    const tone = `${baseDark ? 'dark' : 'light'}, ${neutralTone(base)} base`;
    const accent = primary ? ` with ${secondary ? `${hueName(primary)} + ${hueName(secondary)} accents` : `a single ${hueName(primary)} accent`}` : ', mostly monochrome';
    out.push(`Feel: ${tone}${accent}.`);
    return out.join('\n');
  }

  function layout(l) {
    if (!l || l.error) return '';
    const out = ['## Layout'];
    if (l.container) out.push(`- Content width: max ${l.container.max}, centered${l.container.pad !== '0px' ? `, ${l.container.pad} side padding` : ''}`);
    if (l.sectionPadding?.length) out.push(`- Section spacing: ${l.sectionPadding[0]} vertical padding`);
    if (l.header) {
      const h = l.header;
      out.push('- Header: ' + join([['sticky', 'fixed'].includes(h.position) ? h.position : 'static', `${h.height}px tall`, h.translucent && 'translucent', h.blur && `backdrop ${h.blur}`, h.border && `${h.border} bottom border`], ', '));
    }
    for (const g of (l.grids || []).slice(0, 2)) out.push(`- Grid: ${g.cols} column${g.cols > 1 ? 's' : ''} of ${g.child}s, ${g.gap} gap${g.cols > 1 ? ' (stack on mobile)' : ''}`);
    if (l.breakpoints?.length) out.push(`- Breakpoints: ${l.breakpoints.map((b) => b + 'px').join(', ')}`);
    if (l.pattern?.length) out.push(`- Typical page: ${l.pattern.join(' → ')}`);
    return out.length > 1 ? out.join('\n') : '';
  }

  function shape(s) {
    if (!s || s.error) return '';
    const out = ['## Shape & depth'];
    if (s.radii?.length) out.push('- Radius: ' + s.radii.map((r) => `${r.kind}s ${r.value}`).join(' · '));
    for (const sh of (s.shadows || []).slice(0, 2)) out.push(`- Shadow (${sh.kinds.join('/') || 'surfaces'}): ${sh.value}`);
    if (s.borders?.[0]) out.push(`- Borders: ${s.borders[0].value}`);
    if (s.spacing?.length) out.push(`- Spacing values (px): ${s.spacing.join(' ')}`);
    for (const e of s.effects || []) out.push(`- Effect (${e.kinds.join('/')}): ${e.value}`);
    return out.length > 1 ? out.join('\n') : '';
  }

  function components(list) {
    if (!Array.isArray(list) || !list.length) return '';
    const out = ['## Components'];
    const shown = new Map(); // state css → component that first showed it
    for (const c of list) {
      out.push(`- ${c.kind}: ${css(c.style)}`);
      for (const st of c.states || []) {
        const key = st.state + st.css;
        out.push(`  - ${st.state}: ${shown.has(key) ? `same as ${shown.get(key)}` : st.css}`);
        if (!shown.has(key)) shown.set(key, c.kind);
      }
    }
    return out.join('\n');
  }

  function motion(a, opts = {}) {
    if (!a || a.error) return '';
    const out = ['## Motion'];
    if (a.easings?.length) {
      const e = a.easings[0];
      const dur = a.durations?.length ? `; durations ${a.durations[0]}${a.durations.length > 1 ? `–${a.durations[a.durations.length - 1]}` : ''}ms` : '';
      out.push(`- Easing: ${e}${EASINGS[e] ? ` (${EASINGS[e]})` : ''}${dur}`);
    }
    if (a.interactions?.length && opts.withComponents) out.push('- Hover/focus states: as listed under Components.');
    else if (a.interactions?.length) {
      out.push('- Interactions:');
      for (const i of a.interactions.slice(0, 6)) out.push(`  - ${i.kind} ${i.state}: ${i.css}`);
    }
    if (a.keyframes?.length) {
      out.push('- Keyframes:');
      for (const k of a.keyframes) out.push(`  - ${k.name} (${k.on}, ${k.timing}): ${k.frames}`);
    }
    const scroll = [a.smoothScroll && 'smooth scrolling', a.sticky?.length && `sticky ${a.sticky.join('/')}`, a.scrollSnap && 'scroll-snap', a.scrollDriven && 'scroll-driven animations', a.jsReveal && 'elements fade/slide in on scroll'].filter(Boolean);
    if (scroll.length) out.push(`- Scroll: ${scroll.join(', ')}`);
    if (a.libraries?.length) out.push(`- Built with ${a.libraries.join(', ')}; recreate with CSS or the closest equivalent in my stack.`);
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

  const WHEN_WORDS = { load: 'once, when the page loads', scroll: 'once, when it scrolls into view', loop: 'over and over', later: 'a moment after the page loads', click: 'when something is clicked', 'hover-js': 'when the pointer moves onto it (and plays back when it leaves)' };

  /** Measured facts about a recorded animation (not implementation code). */
  function animationCode(g) {
    const pct = (o) => `${Math.round((o ?? 0) * 1000) / 10}%`;
    const frames = g.frames.map((f) => `${pct(f.offset)} { ${Object.entries(f.props).map(([k, v]) => `${k}: ${v}`).join('; ')} }`).join(' → ');
    const unit = g.count > 1 ? g.unit : null;
    const lines = [`Keyframes: ${frames}`];
    lines.push(unit
      ? `Each ${unit} (${g.count} in total): ${g.duration}ms, easing ${g.easing}${g.stagger ? `, starts ${g.stagger}ms after the previous one` : ', all at the same time'}`
      : `Duration ${g.duration}ms, easing ${g.easing}${g.direction && g.direction !== 'normal' ? `, direction ${g.direction}` : ''}`);
    lines.push(g.scrollLinked ? 'Progress follows the scroll position' : `Plays ${WHEN_WORDS[g.trigger] || 'once'}`);
    if (g.source === 'js') lines.push('Measured from a JavaScript animation, so the easing is approximate');
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
    return kept.length ? `${it.title}: ${kept.join(', ')}` : it.title;
  }

  // ---------- context: building a new site, or changing an existing one ----------

  /** Whole-site details (a color scheme for every page, all buttons…) set the overall look. */
  const isWholeSite = (it) => /^(whole site|all pages|every page|everywhere|the whole site|my whole site)$/i.test((it.where || '').trim()) || it.task === 'site';

  /** What to do with one detail, in the person's situation. */
  function taskFor(it, ctx) {
    if (isWholeSite(it)) return ctx.mode === 'new' ? 'Use this across the whole site.' : 'Apply this across my whole site.';
    if (ctx.mode === 'change') return it.task === 'add' ? 'Add this as something new; keep what is already there.' : 'Change what is there now to match this.';
    return '';
  }

  /** The opening of a message: who I am building for, and how to treat the details. */
  function header(ctx = {}) {
    const about = (ctx.about || '').trim();
    if (ctx.app === 'builder') {
      // AI site builders: the same rules in fewer words.
      const fit = '<fit_to_my_site> says which of my colors, fonts and content to use.';
      if (ctx.mode === 'new') return `Build a new website${about ? ` (${about})` : ''} from the design details below, in this order from top to bottom. The values are exact requirements, not suggestions. ${fit}`;
      return `Change my existing website${about ? ` (${about})` : ''}: make only the changes below, each where it says, and keep everything else as it is. The values are exact requirements, not suggestions. ${fit}`;
    }
    const exact = 'Match each detail\'s values exactly (structure, order, sizes, colors and timing): they are requirements taken from another website, not inspiration. The only exceptions are what <fit_to_my_site>, <shared_spacing>, <one_look>, <content_i_want>, <change_i_want> or <note> say.';
    if (ctx.mode === 'new') {
      return [`I'm building a new website${about ? `: ${about}` : ''}.`,
        'Use the design details below, taken from other websites, as its spec, each in the place <where_on_my_site> says. Details for the whole site set the overall look; the others are parts of pages, in the order I want them from top to bottom. They are numbered so they can refer to each other.',
        exact,
        '<fit_to_my_site> connects each detail to the rest of my site: which colors, fonts and content to use, so the parts belong together.'].join('\n');
    }
    if (ctx.mode === 'change') {
      return [`I want to change my existing website${about ? `: ${about}` : ''}.`,
        'Make only the changes below, each in the place <where_on_my_site> says; <task> says whether it changes something I already have or is added as new. Keep everything else on my site as it is. The details are numbered so they can refer to each other.',
        APPS[appOf(ctx)].seesCode
          ? 'Before changing anything, look through my site for its colors, fonts, pages and real content: each detail\'s <fit_to_my_site> says what to take from it, so the changes look like they always belonged.'
          : "You can't see my site's code. If I already gave you my files in this chat, use those and start right away. If not, ask me once, for the fewest files that hold the parts involved and my colors and fonts (for a one-page site that is just its HTML file), not my whole project, and don't guess. Then take my colors, fonts, pages and real content from them: each detail's <fit_to_my_site> says what to take.",
        exact].join('\n');
    }
    return `${exact}\n<fit_to_my_site> says how each detail fits into my site.`;
  }

  // ---------- which AI app the prompt is pasted into ----------
  // One prompt is built (tags, for Claude), then shaped for the app: Claude reads XML-style tags as
  // structure; ChatGPT, Gemini and code editors read Markdown sections more naturally; AI site
  // builders do best with short, plain Markdown. Chat apps can't see the site's code unless it is
  // pasted, so they are told to ask for it rather than guess.
  const APPS = {
    'claude-code': { label: 'Claude Code', tags: true, seesCode: true },
    claude: { label: 'Claude (chat)', tags: true, seesCode: false },
    chatgpt: { label: 'ChatGPT or Gemini', tags: false, seesCode: false },
    editor: { label: 'Cursor, Windsurf or Copilot', tags: false, seesCode: true },
    builder: { label: 'Lovable, v0 or Bolt', tags: false, seesCode: true, short: true },
  };
  const appOf = (ctx) => APPS[ctx?.app] ? ctx.app : 'claude-code';

  /** Lines for this app, added to the opening. */
  function appLines(ctx) {
    const app = appOf(ctx);
    const out = [];
    if (!APPS[app].seesCode && ctx.mode === 'new') out.push('Give me complete files I can use as they are.');
    if (app === 'chatgpt') out.push("Don't round, simplify or swap the values for similar ones; if something can't be done exactly, say so.");
    if (app === 'editor') out.push(ctx.mode === 'new' ? 'Set up the colors, fonts and spacing as shared variables first, then build the parts.' : 'Find where each part lives in this project before editing, and reuse its existing components, styles and design variables.');
    return out;
  }

  const LABELS = {
    where_on_my_site: 'Where on my site', task: 'What to do', what: 'What it is', values: 'Exact values', fit_to_my_site: 'Fit it to my site',
    content_i_want: 'What it should show', change_i_want: 'Change I want', picture_i_want: 'Picture I want', note: 'Note', shared_spacing: 'Shared spacing', one_look: 'Keep one look', when_done: 'When you are done',
  };

  /** The tagged prompt as Markdown sections, for apps that read those better than tags. */
  function asMarkdown(text, short) {
    let t = text;
    // Blocks first, then any tag still mentioned in running text becomes its label in quotes.
    t = t.replace(/<design_detail(?: id="(\d+)")?(?: from="([^"]+)")?>\n/g, (m, n, from) => `### Detail${n ? ` ${n}` : ''}${from ? ` (from ${from})` : ''}\n`);
    t = t.replace(/<\/design_detail>\n?/g, '');
    t = t.replace(/<values>\n([\s\S]*?)\n<\/values>/g, (m, body) => `**${LABELS.values}:**\n\`\`\`text\n${body}\n\`\`\``);
    t = t.replace(/<shared_spacing>\n([\s\S]*?)\n<\/shared_spacing>/g, (m, body) => `### ${LABELS.shared_spacing}\n${body}`);
    t = t.replace(/<one_look>\n([\s\S]*?)\n<\/one_look>/g, (m, body) => `### ${LABELS.one_look}\n${body}`);
    t = t.replace(/<when_done>\n([\s\S]*?)\n<\/when_done>/g, (m, body) => `### ${LABELS.when_done}\n${body}`);
    t = t.replace(/<fit_to_my_site>\n([\s\S]*?)\n<\/fit_to_my_site>/g, (m, body) => `**${LABELS.fit_to_my_site}:**\n${body}`);
    t = t.replace(/^<(\w+)>([^\n]*?)<\/\1>$/gm, (m, k, v) => (LABELS[k] ? `**${LABELS[k]}:** ${v}` : m));
    t = t.replace(/<(\w+)>/g, (m, k) => (LABELS[k] ? `“${LABELS[k]}”` : m));
    if (short) {
      // Site builders: the same content, tighter. Measured background words and the long
      // "Details" tails go; values and rules stay.
      t = t.replace(/\n{3,}/g, '\n\n').replace(/^\*\*Note:\*\* The pasted picture shows the original\.\n/gm, '');
    }
    return t;
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
  const isMotion = (it) => MOTION_TYPES.test(it.type) || !!it.anim;
  const isScheme = (it) => SCHEME_TYPES.test(it.type) || (it.type === 'portion' && it.parts?.colors !== false && /color scheme/i.test(it.label || '')) || it.type === 'design-system';
  const isFormat = (it) => FORMAT_TYPES.test(it.type) || (it.type === 'portion' && /format/i.test(it.label || ''));
  const hasScheme = (it) => /^Font scheme:/m.test(it.code || '');
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

  /** "every h2 heading", "button", "card"… for the thing a detail came from. */
  function nounOf(it) {
    const m = it.meta || {};
    if (it.type === 'font') {
      if (/^h[1-6]$/.test(m.tag || '')) return `${m.tag} heading`;
      if (/Button/.test(it.title || '')) return 'button';
      if (/Heading/.test(it.title || '')) return 'heading';
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
    if (refs.scheme && refs.scheme !== self) return `the color in the same role from the color scheme in detail ${refs.scheme}`;
    if (ctx.mode === 'new') return 'the colors in the same roles from the rest of my site (the other details here); if there are none yet, keep these';
    return "my site's own colors in the same roles instead (for an accent: the color of my main buttons and links)";
  }

  const CONTENT = [
    [/^main headline/, 'what I offer, said in one line'],
    [/^supporting line/, 'who it is for and the main benefit'],
    [/^(sign-up call to action|main call to action)/, 'the main thing I want visitors to do (e.g. order, book, sign up), linking to that page'],
    [/^contact \/ demo/, 'how to reach me or book, linking to my contact or booking page'],
    [/^purchase/, 'buying: links to my shop or order page'],
    [/^sign-in/, 'only if my site has accounts; otherwise leave it out'],
    [/^secondary action/, 'a second, smaller option (e.g. see the menu, learn more)'],
    [/^page links?/, 'my real pages, most important first (keep the same look if I have more or fewer)'],
    [/^section title/, 'what this section is about'],
    [/^subheading/, 'what this part is about'],
    [/^small label above/, 'a short category word for the section'],
    [/^description under the title/, 'one or two sentences expanding on the title'],
    [/^card title/, 'one of my real services, products or features each (whichever fits this section)'],
    [/^card description/, 'one short line about each of them'],
    [/^price/, 'my real prices'],
    [/^footer column title/, 'groups of my links (e.g. Company, Help)'],
    [/^footer link/, 'links to my real pages'],
    [/^legal link/, 'my legal pages, if I have them'],
    [/^copyright/, 'my business name and the year'],
    [/^learn-more/, 'a link to the page with more detail on this'],
    [/^download/, 'my app or file, only if I have one'],
    [/^small tag/, 'a short tag (e.g. New, Popular)'],
    [/brand name/, 'my logo and name'],
    [/^paragraph/, 'my own text on this topic'],
  ];

  /** The purposes in an outline ("main headline, 5 words"), with how many there are. */
  function purposesIn(code) {
    const out = [];
    const stack = []; // [indent, multiplier]
    let images = false;
    let icons = false;
    for (const raw of String(code || '').split('\n')) {
      const m = /^(\s*)-\s+(.*)$/.exec(raw);
      if (!m) continue;
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
      let purpose = head.slice(c + 1).trim();
      const words = /,\s*(\d+)\s*words?( each)?\s*$/.exec(purpose);
      purpose = purpose.replace(/,\s*\d+\s*words?( each)?\s*$/, '').trim();
      if (!purpose || /^\d/.test(purpose)) continue;
      const count = times * outer;
      const hit = out.find((p) => p.purpose === purpose);
      if (hit) { hit.count += count; continue; }
      out.push({ purpose, count, words: words ? Number(words[1]) : null });
    }
    return { list: out, images, icons };
  }

  /** What information goes in each part of a format, and where it comes from. */
  function contentGuide(it, ctx) {
    const { list, images, icons } = purposesIn(it.code);
    const lines = [];
    const want = (it.content || '').trim();
    if (want) lines.push('Fill it with what <content_i_want> says, spread over the parts below in the way that fits.');
    const shown = list.filter((p) => CONTENT.some(([re]) => re.test(p.purpose)) || p.words).slice(0, 12);
    if (shown.length) {
      lines.push('What goes in it (the values set the layout; this is the content):');
      for (const p of shown) {
        const advice = CONTENT.find(([re]) => re.test(p.purpose))?.[1] || 'my own content for this';
        const size = p.words ? `, about ${p.words} word${p.words > 1 ? 's' : ''}${p.count > 1 ? ' each' : ''}` : '';
        lines.push(`  - ${p.count > 1 ? `${p.count}× ` : ''}${p.purpose}${size}: ${advice}`);
      }
    }
    if (icons) lines.push("Icons: simple icons that match what each part is about, in my site's icon style.");
    if (images) lines.push("Pictures: my own photos of the same kind of subject; where I don't have one, a clearly labeled placeholder saying what it should show.");
    if ((shown.length || images || icons) && !want) {
      lines.push(ctx.mode === 'new'
        ? `\u0001Write the content for ${(ctx.about || '').trim() || 'my site'}. Don't invent facts (prices, numbers, reviews, client logos): leave a clearly marked placeholder for those.`
        : "\u0001Take the content from my site: what is in that place now, or my other pages (About, Services, Menu…). Don't invent facts (prices, numbers, reviews, client logos): where my site doesn't have them, leave a clearly marked placeholder.");
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
      const colors = colorsIn(it.code);
      if (colors.length && it.keepColors) lines.push('Keep its colors exactly as given, even though they come from the original site.');
      else if (colors.length) lines.push(`Its colors are the original site's: ${colors.map((c) => `${c.hex} (${c.role})`).join(', ')}. Use ${colorSource(ctx, refs, self)}. Keep the movement and timing exact.`);
      if (noun && !whole && !/^all\b/i.test(where)) lines.push(`Give my other ${plural(noun)} of the same kind the same movement so they behave alike, unless <where_on_my_site> names just one.`);
      if (ctx.mode === 'change') lines.push('\u0001If that part of my site already moves at the same moment, replace that movement instead of adding a second one.');
    }

    if (it.type === 'font') {
      const parts = it.textParts || {};
      const family = (/font-family:\s*["']?([^"',;\n]+)/.exec(it.code || '') || [])[1]?.trim();
      if (noun) lines.push(where && !whole ? `Use it for every ${noun} in that place, not just one, so they match.` : `Use it for all my ${plural(noun)}.`);
      if (parts.font !== false && family) {
        const src = it.fontSource || '';
        if (/Google/.test(src)) lines.push(`${family} is a free Google Font: load it (only the weights used here) ${ctx.mode === 'change' ? 'the same way my site already loads its fonts' : 'once for the whole site'}.`);
        else if (/system/.test(src)) lines.push(`${family} is a system font: there is nothing to load.`);
        else if (src) lines.push(`On the original, ${family} is ${src.toLowerCase()}, so it may not be free to use: if I can't use it, pick the closest free font and tell me which.`);
        else lines.push(`If ${family} isn't freely available, use the closest free font and tell me which.`);
        const other = refs.font && refs.font !== self ? refs.font : null;
        if (ctx.mode === 'change') lines.push("Keep the rest of my text in my site's current fonts; tell me if this pairing looks off.");
        else if (/heading/.test(noun || '')) lines.push(other ? `Pair it with the font from detail ${other} for the other text.` : 'Pair it with a plain, readable body font.');
        else if (other) lines.push(`Pair it with the font from detail ${other}.`);
      }
      if (parts.size !== false) lines.push('The sizes are for desktop: on phones scale them down, keeping the same ratio to my body text.');
    }

    if (isFormat(it)) {
      lines.push(...contentGuide(it, ctx));
      if (/Color relationships/.test(it.code || '')) lines.push(`\u0001Keep the color relationships listed under "Color relationships" even where the colors become ${ctx.mode === 'change' ? "my site's" : 'different ones'}: a part that is darker than the page stays darker, cards keep their lighter or darker step, the accent stays the only strong color.`);
      const withColors = it.type === 'portion' && /color scheme/i.test(it.label || '');
      if (!withColors && !adapt && colorsIn(it.code).length) {
        lines.push(`The colors in it are the original site's: use ${colorSource(ctx, refs, self)}.`);
      }
      if (/Position on the page/.test(it.code || '')) {
        lines.push(`Keep its place relative to the rest of the page (see "Position on the page"): ${where && !whole ? 'in the place <where_on_my_site> says, ' : ''}next to my parts that match the ones listed above and below it (or the closest match), with the same full-width or centered-column width, and the same overlap or gap with the part above.`);
      }
      // A format is the layout only: fonts and colors come from elsewhere. ("The whole button /
      // area" copies everything on purpose, so it keeps its own fonts and colors.)
      if (!withColors && !hasScheme(it) && !/^(component|section)$/.test(it.type)) {
        const fontsFrom = refs.font && refs.font !== self ? `the font scheme in detail ${refs.font}` : null;
        const colorsFrom = refs.scheme && refs.scheme !== self ? `the color scheme in detail ${refs.scheme}` : null;
        const rest = ctx.mode === 'change' ? "my site's own" : 'the ones set by the other details (or simple, neutral ones if none are set)';
        lines.push(`It copies the layout only, not fonts or colors: use ${fontsFrom || `${rest} fonts`} and ${colorsFrom || `${rest} colors`}. The text sizes listed are kept as a hierarchy (which text is bigger), not as a font.`);
      }
      if (ctx.mode === 'change' && refs.formats < 2 && /^Spacing: /m.test(it.code || '')) lines.push('\u0001Line it up with the rest of my page: if my other sections use a different side padding or content width, use theirs, so the edges of every section match.');
      if (!withColors && !hasScheme(it) && /font-family|system-ui|serif|sans|\b\d+px, weight/i.test(it.code || '')) {
        lines.push(refs.font && refs.font !== self ? `Fonts: use the font from detail ${refs.font} where it applies, and my site's own fonts elsewhere; the sizes, weights and spacing here are the rule.` : ctx.mode === 'change' ? "Fonts: keep my site's own fonts; the sizes, weights and spacing here are the rule." : 'Fonts: use these unless another detail sets my fonts.');
      }
    }

    if (hasScheme(it)) {
      const code = it.code || '';
      lines.push(`Fonts: put each role on my matching text in that place (main heading, section titles, body text, labels, buttons, menu links), ${ctx.mode === 'change' ? "replacing what my site uses there now" : 'and use them for the same roles on the rest of my site'}.`);
      const famBlock = (/Families \(\d+\):\n([\s\S]*?)(\n\n|$)/.exec(code) || [])[1] || '';
      const fams = [...famBlock.matchAll(/^- ([^,\n:]+)(?:, ([^:\n]+))?: /gm)];
      for (const [, fam, src] of fams.slice(0, 4)) {
        if (/Google/.test(src || '')) lines.push(`${fam} is a free Google Font: load it (only the weights used here) ${ctx.mode === 'change' ? 'the same way my site already loads its fonts' : 'once for the whole site'}.`);
        else if (/system/.test(src || '')) lines.push(`${fam} is a system font: there is nothing to load.`);
        else lines.push(`If ${fam} isn't free to use${src ? ` (on the original it is ${src.toLowerCase()})` : ''}, use the closest free font and tell me which.`);
      }
      if (/How they relate/.test(code)) lines.push('\u0001Keep how the fonts relate (sizes against the body text, heavy vs light weights, tight vs relaxed lines): on phones scale every size down together so the ratios stay the same.');
      if (ctx.mode === 'change') lines.push('\u0001If this would leave my site with more than two font families, tell me before adding a third.');
      if (refs.fontSchemes > 1 && refs.font && refs.font !== self) lines.push(`\u0001Use one font scheme for the whole page: where details disagree on a family, follow detail ${refs.font}.`);
    }

    if (isScheme(it) && !isMotion(it)) {
      lines.push(ctx.mode === 'change'
        ? "\u0001Put the colors into my site's existing color settings (its theme variables or config), named by role, instead of hard-coding them, so the rest of my site can use them."
        : "\u0001Set the colors up as my site's named colors (by role), so every page can use them.");
      if (ctx.mode === 'change') lines.push('\u0001Check that my existing text and buttons stay readable on the new backgrounds; fix only what fails.');
      const band = !whole && it.type !== 'palette' && it.type !== 'design-system' && !/^(nav|header|footer)$/.test(it.meta?.kind || '');
      if (band) lines.push('\u0001Where a section meets the sections above and below, avoid hard seams: let the edges blend with them.');
    }

    if (!isMotion(it) && !isFormat(it) && !isScheme(it) && it.type !== 'font' && noun && !whole) {
      lines.push(`Use it on every ${noun} of this kind in that place, so they match.`);
    }
    return lines.filter(Boolean);
  }

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
    const picNote = (what) => (picLabel ? `${picLabel} (pasted with this message) ${what}.` : `The pasted picture ${what}.`);
    if (it.makePicture) {
      // "Make a new picture from this": the person's own words are the brief, the pick is the reference.
      lines.push(`<picture_i_want>${(it.request || '').trim() || 'a new picture like this one'}</picture_i_want>`);
      lines.push(`<fit_to_my_site>Make it fit the rest of my site: its colors and style${ctx.about ? `, and what it is about (${ctx.about.trim()})` : ''}.</fit_to_my_site>`);
      lines.push(`<note>${hasPicture ? picNote('is the original I picked, as a reference') : 'I will paste the original picture as a reference.'}</note>`);
      lines.push('</design_detail>');
      return lines.join('\n');
    }
    if (it.type === 'picture') {
      // The person's own words are the whole brief; the pasted picture is the reference.
      if (it.picturePrompt?.trim()) lines.push(`<picture_i_want>${it.picturePrompt.trim()}</picture_i_want>`);
      lines.push(`<note>${hasPicture ? 'The pasted picture is the original I picked, as a reference.' : 'I will paste the original picture as a reference.'}</note>`);
      lines.push('</design_detail>');
      return lines.join('\n');
    }
    const values = parts ? textValues(it.code, parts) : it.code;
    lines.push('<values>', values.trim(), '</values>');
    const fit = (opts.fit_ || fitLines(it, ctx, opts.refs || {}, n)).map((l) => l.replace(/^\u0001/, ''));
    if (fit.length) lines.push('<fit_to_my_site>', ...fit.map((l) => (/^\s+-/.test(l) ? l : `- ${l}`)), '</fit_to_my_site>');
    if (it.content?.trim()) lines.push(`<content_i_want>${it.content.trim()}</content_i_want>`);
    if (it.request?.trim()) lines.push(`<change_i_want>${it.request.trim()}</change_i_want>`);
    const notes = [];
    if (parts) {
      const skipped = ['font', 'size', 'color'].filter((k) => parts[k] === false);
      if (skipped.length) notes.push(`I only want the ${['font', 'size', 'color'].filter((k) => parts[k] !== false).join(' and ') || 'style'}; choose the ${skipped.join(' and ')} yourself, to suit my site.`);
    }
    if (it.adjustNote) notes.push(`These values include my tweaks (${it.adjustNote}).`);
    if ((it.fit || opts.fit) === 'adapt') notes.push("I want the effect, but in my site's own colors and fonts rather than these exact values.");
    if (it.type === 'media') notes.push("This is media (a drawing, video or animation file), not CSS, so it can't be copied directly.");
    if (hasPicture) notes.push(picNote(it.shotKind === 'film' ? 'is a filmstrip of the original animation, frames in order' : it.shotKind === 'beforeafter' ? 'shows it at rest, then in that state (before → after)' : it.shotKind === 'scrollfilm' ? 'shows the page at points while scrolling through it, in order' : 'shows the original'));
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
    const re = /^Spacing: (.+)$/gm;
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
    const sides = pick('sides');
    if (sides != null) lines.push(`Side padding: ${sides}px on every part (on phones, one smaller value for every part, e.g. ${Math.min(sides, 20)}px)`);
    const widths = list.map((x) => x.sp.get('content width')).filter((v) => v != null);
    if (widths.length) lines.push(`Content width: at most ${Math.max(...widths)}px, centered, for every part`);
    const rhythm = mostCommon(bands.flatMap((x) => [x.sp.get('top'), x.sp.get('bottom')]).filter((v) => v != null && v >= 24 && v <= 200));
    if (rhythm != null) lines.push(`Space at the top and bottom of each section: ${rhythm}px`);
    const pairs = new Map();
    for (const { sp } of list) for (const [k, v] of sp) if (k.includes('→')) { if (!pairs.has(k)) pairs.set(k, []); pairs.get(k).push(v); }
    if (pairs.size) lines.push(`Between text blocks, the same everywhere: ${[...pairs].map(([k, v]) => `${k} ${mostCommon(v)}px`).join(' · ')}`);
    const cards = pick('between cards');
    if (cards != null) lines.push(`Between cards or items side by side: ${cards}px`);
    if (!lines.length) return '';
    const tail = ctx.mode === 'change' ? '\nIf the rest of my page already uses one consistent spacing, use that instead, so the new parts line up with the old ones.' : '';
    return `<shared_spacing>\nSo the page reads as one, every part below uses one spacing system, even where a detail's own numbers differ:\n${lines.map((l) => `- ${l}`).join('\n')}${tail}\n</shared_spacing>`;
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
    const fam = /Families \(\d+\):\n([\s\S]*?)(\n\n|$)/.exec(c);
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
    const mine = ctx.mode === 'change';
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
        lines.push(mine
          ? `Fonts: the details use ${distinct.length} font families (${distinct.join(', ')}). Keep my site's own fonts (at most two families), and put each detail's sizes and weights on them.`
          : `Fonts: at most two families on the whole page: ${top.join(' and ')} (the ones used most here; the bolder or larger one for headings, the other for everything else). Where a detail uses ${rest.join(', ')}, use these instead, keeping its sizes and weights.`);
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
        lines.push(mine
          ? `Accent color: the details bring different accents (${groups.map((g) => g.hex).join(', ')}). Use my site's one main accent (the color of my main buttons and links) everywhere instead.`
          : `Accent color: one strong color for buttons, links and highlights on the whole page: ${main.hex}. Where a detail uses ${others.join(', ')} as its accent, use ${main.hex} instead (lighter or darker shades of it are fine for hover states and backgrounds).`);
      }
      // Corners.
      const radii = looks.flatMap((it) => radiiIn(it.code)).filter((r) => r !== 0);
      const nums = radii.filter((r) => r !== 'pill');
      const small = nums.filter((r) => r <= 12), large = nums.filter((r) => r > 12);
      const spread = (l) => (l.length ? Math.max(...l) - Math.min(...l) : 0);
      if (spread(small) > 2 || spread(large) > 4) {
        const parts = [];
        if (small.length) parts.push(`${mostCommon(small)}px for small things (buttons, inputs, tags)`);
        if (large.length) parts.push(`${mostCommon(large)}px for big things (cards, images, panels)`);
        if (radii.includes('pill')) parts.push('pill shapes stay pills');
        lines.push(`Corners: one set of corner sizes everywhere: ${parts.join('; ')}${mine ? " (or my site's own corner sizes, if it already has them)" : ''}.`);
      }
      // Shadows.
      const shadows = looks.map((it) => shadowsIn(it.code)[0]).filter(Boolean);
      if (new Set(shadows.map((x) => x.replace(/\s+/g, ''))).size > 1) lines.push(`Shadows: one shadow style for raised things (cards, menus, pop-ups): ${mine ? "my site's own, if it has one; otherwise " : ''}${mostCommon(shadows)}; use it wherever a detail has a different one.`);
      // Buttons.
      const withButtons = looks.filter((it) => /\bbutton/i.test(it.code || '') || /button/i.test(it.meta?.kind || '')).length;
      if (withButtons >= 2) lines.push('Buttons: every main button on the page looks the same (one color, corner size, height and font); secondary buttons share one second, quieter style.');
      // Movement.
      const motion = looks.filter((it) => isMotion(it));
      const eases = motion.map((it) => easingsIn(it.code)[0]).filter(Boolean);
      if (new Set(eases).size > 1) lines.push(`Movement: one easing for every animation here, ${mostCommon(eases)}, so everything moves with the same feel; keep each detail's own duration.`);
    }
    // Always: build on what is there instead of adding a parallel set of styles.
    if (ctx.app === 'builder' && !lines.length) return `<one_look>\n- Reuse the fonts, colors and corner sizes my site already has.\n</one_look>`;
    const reuse = mine
      ? "Reuse my site's existing fonts, colors, corner sizes, shadows and spacing (its variables, theme or config) wherever a detail doesn't set them on purpose, instead of adding new near-duplicates."
      : 'If earlier steps already set up my fonts, colors, corner sizes and spacing, reuse them wherever a detail doesn\'t set them on purpose, instead of adding new near-duplicates; set them up as shared variables so later parts can reuse them too.';
    return `<one_look>\nSo every part looks like the same site${many ? ', even where the details come from different places' : ''}:\n${[...lines, reuse].map((l) => `- ${l}`).join('\n')}\n</one_look>`;
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
      lines.push('Make every change for real, then list what changed for each detail (old → new).');
      return `<when_done>\n${lines.map((l) => `- ${l}`).join('\n')}\n</when_done>`;
    }
    lines.push("Make every change for real in the code. Never describe a change you didn't make.");
    if (layout) lines.push('Check each layout against its outline: the same parts in the same order, arranged the same way (in a row, grid or stacked), with the same widths and gaps. If my current layout differs, rebuild it to match; changing only sizes is not enough.');
    lines.push(`At the end, list every detail by number with what you changed, as old → new (e.g. "headline 40px → 64px", "cards stacked → 3 in a row"). If a detail needed no change because ${ctx.mode === 'new' ? 'it was already built that way' : 'my site already matched'}, say so and show the matching values.`);
    if (!APPS[app].seesCode) lines.push('Give me the complete updated file(s), not snippets, and say exactly which file each one replaces.');
    return `<when_done>\n${lines.map((l) => `- ${l}`).join('\n')}\n</when_done>`;
  }

  /** The opening, plus the general lines that apply to several details, plus shared spacing. */
  function opening(ctx, shared, spacing = '', look = '') {
    const general = shared.length ? `\nFor every detail below where it applies:\n${shared.map((l) => `- ${l}`).join('\n')}` : '';
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
  const forMode = (ctx) => (ctx && ctx.mode !== 'new' && ctx.about ? { ...ctx, about: '' } : ctx);

  function buildSupplemental(items, opts = {}) {
    if (opts.ctx) opts = { ...opts, ctx: forMode(opts.ctx) };
    const fitAll = opts.fit;
    const all = items.map((it) => ({ ...it, fit: it.fit || fitAll }));
    const { out, shared, spacing, look } = blocks(all, opts);
    return forApp(`${opening(opts.ctx, shared, spacing, look)}\n\n${out.join('\n\n')}\n\n${closing(all, opts.ctx || {})}\n`, opts.ctx);
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
    for (const e of entries) if (e.pictureBid) pictureLabels[e.pictureBid] = `Picture ${++n}`;
    const items = entries.flatMap((e) => e.basket.map((b) => ({ ...b, fit: b.fit || e.fit })));
    const { out, shared, spacing, look } = blocks(items, { ctx, pictureLabels });
    return forApp(`${opening(ctx, shared, spacing, look)}\n\n${out.join('\n\n')}\n\n${closing(items, ctx)}\n`, ctx);
  }

  globalThis.PromptLiftPrompts = { version: 10, sharedLook, familiesIn, APPS, CATEGORIES, guideBody, section, buildSupplemental, combine, animationCode, header, colorsIn, purposesIn };
})();
