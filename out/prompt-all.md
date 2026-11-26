# Design guide
Apply this style when designing or restyling my site: define it once as global tokens (CSS variables / theme config) and reusable component styles, then use it consistently. Keep my content and functionality as they are. Use free fonts only: if a font here is licensed, use the closest free match. Respect prefers-reduced-motion.

## Typography
Fonts:
- Fraunces (Google Fonts): h1, h2
- Satoshi (self-hosted, check license): h3, body, button, nav link, input
Scale (size / weight / line-height / letter-spacing):
- h1: 64px / 700 / 1.1 / -0.02em
- h2: 40px / 700 / 1.1 / -0.02em
- h3: 19.9px / 700 / 1.6
- body, input: 17px / 400 / 1.6
- button: 15px / 600 / 1.6
- nav link: 15px / 400 / 1.6
Feel: serif headings paired with a sans body, tight heading tracking, dramatic size contrast.

## Color
- background #fbfaf7 · surface/cards #ffffff · inverse sections #1c1917
- text #1c1917 · muted text #57534e
- primary #ea580c (text on it #ffffff)
- border #e7e5e4
- gradient (section): linear-gradient(135deg,#fed7aa,#fbcfe8)
- dark theme tokens: --background: #0c0a09; --foreground: #fafaf9; --primary: #fb923c
Feel: light, warm base with a single orange accent.

## Layout
- Content width: max 1120px, centered, 32px side padding
- Section spacing: 96px vertical padding
- Header: sticky, 65px tall, translucent, backdrop blur(12px), 1px #e7e5e4 bottom border
- Grid: 3 columns of cards, 24px gap (stack on mobile)
- Breakpoints: 768px, 1024px
- Typical page: header → hero (gradient bg) → 3-col cards → dark footer

## Shape & depth
- Radius: buttons pill · cards 14px · inputs 10px
- Shadow (card): rgba(0,0,0,.04) 0px 1px 2px 0px
- Borders: 1px solid #e7e5e4
- Spacing values (px): 12 22 24 28 32 96
- Effect (header): backdrop-filter: blur(12px)

## Components
- primary button: background:#ea580c; border-radius:999px; color:#ffffff; display:inline-flex; font:600 15px/1.6 Satoshi; height:48px; padding:12px 22px; transition:transform .25s cubic-bezier(.16, 1, .3, 1), box-shadow .25s cubic-bezier(.16, 1, .3, 1)
  - hover: transform:translateY(-2px) scale(1.02);box-shadow:rgba(234,88,12,.35) 0px 10px 30px
- secondary button: border:1px solid #d6d3d1; border-radius:999px; display:inline-flex; font:600 17px/1.6 Satoshi; height:53px; padding:12px 22px; transition:transform .25s cubic-bezier(.16, 1, .3, 1), box-shadow .25s cubic-bezier(.16, 1, .3, 1)
  - hover: same as primary button
- input: background:#ffffff; border:1px solid #d6d3d1; border-radius:10px; color:#000000; height:53px; padding:12px 14px
  - focus: outline:none;box-shadow:rgba(234,88,12,.25) 0px 0px 0px 3px;border-color:#ea580c
- card: background:#ffffff; border:1px solid #e7e5e4; border-radius:14px; box-shadow:rgba(0,0,0,.04) 0px 1px 2px 0px; padding:28px; transition:.3s cubic-bezier(.16, 1, .3, 1)
  - hover: transform:translateY(-4px);box-shadow:rgba(0,0,0,.08) 0px 20px 40px
- link: color:#fdba74
- nav link: color:#57534e; font:400 15px/1.6 Satoshi

## Motion
- Easing: cubic-bezier(0.16, 1, 0.3, 1) (expo-out: fast start, long soft settle); durations 250–300ms
- Hover/focus states: as listed under Components.
- Keyframes:
  - float (text, 4000ms ease-in-out infinite): 0%, 100%{transform:translateY(0px)} 50%{transform:translateY(-12px)}
- Scroll: smooth scrolling, sticky header
