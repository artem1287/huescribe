# Component guide: card
Create this as a reusable component in my stack (my framework, styling approach and tokens where they're close), with my own content. Match the styles and states below; a screenshot may be attached.

Structure:
```html
<div class="card">
  <h3>…</h3>
  <p>…</p>
</div>
```

Styles:
```css
.card{background:#ffffff;color:#1c1917;font:400 17px/1.6 Satoshi;padding:28px;border:1px solid #e7e5e4;border-radius:14px;box-shadow:rgba(0,0,0,.04) 0px 1px 2px 0px;transition:.3s cubic-bezier(.16, 1, .3, 1);max-width:357px}
.card:hover{transform:translateY(-4px);box-shadow:rgba(0,0,0,.08) 0px 20px 40px}
.card h3{font:700 19.9px/1.6 Satoshi}
```

Fonts: Satoshi (if licensed, use the closest free match).
