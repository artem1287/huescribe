# Section design guide
Build or restyle a section of my site in this style (a screenshot may be attached; match it). Use my stack, tokens and content, not literal copies.

## Section layout
```html
<section class="section">
  <div>
    <h2>…</h2>
    <div>
      <div class="card">…</div>
      <!-- ×3 -->
    </div>
  </div>
</section>
```
- Section: padding:96px 24px
- Inner layout: display:grid; grid-template-columns:repeat(3, 1fr); gap:24px

## Typography
Fonts:
- Fraunces (Google Fonts): h2
- Satoshi (self-hosted, check license): h3, body
Scale (size / weight / line-height / letter-spacing):
- h2: 40px / 700 / 1.1 / -0.02em
- h3: 19.9px / 700 / 1.6
- body: 17px / 400 / 1.6
Feel: serif headings paired with a sans body, tight heading tracking, moderate scale.

## Color
- background #fbfaf7 · surface/cards #ffffff
- text #1c1917
- border #e7e5e4
Feel: light, warm base, mostly monochrome.

## Shape & depth
- Radius: cards 14px
- Shadow (card): rgba(0,0,0,.04) 0px 1px 2px 0px
- Borders: 1px solid #e7e5e4
- Spacing values (px): 24 28

## Components
- card: background:#ffffff; padding:28px; border:1px solid #e7e5e4; border-radius:14px; box-shadow:rgba(0,0,0,.04) 0px 1px 2px 0px; transition:.3s cubic-bezier(.16, 1, .3, 1)
  - hover: transform:translateY(-4px);box-shadow:rgba(0,0,0,.08) 0px 20px 40px

## Motion
- Easing: cubic-bezier(0.16, 1, 0.3, 1) (expo-out: fast start, long soft settle); durations 300ms
- Hover/focus states: as listed under Components.
- Scroll: smooth scrolling
