Recreate this UI element from "Acme — Ship faster" (http://127.0.0.1:8001/) in my website (the project in this repo), matching its look and behavior as closely as possible.
It was picked at viewport 1280×900; rendered size 357×201px.

## Element
- selector: `div.card`
- DOM path: `main > section#f > div.container > div.features > div.card`
- fonts used: Satoshi
- text: "Safe Every change is reviewed automatically."

## Markup skeleton
```html
<div class="card">
  <h3>Safe</h3>
  <p>Every change is reviewed automatically.</p>
</div>
```

## Computed styles (element first, then descendants; default values omitted)
- **div.card**: display: block; width: 299.328px; height: 142.938px; padding: 28px; font-family: Satoshi, system-ui, sans-serif; font-size: 17px; font-weight: 400; line-height: 27.2px; color: #1c1917; background-color: #ffffff; border: 1px solid #e7e5e4; border-radius: 14px; box-shadow: rgba(0, 0, 0, 0.04) 0px 1px 2px 0px; transition: 0.3s cubic-bezier(0.16, 1, 0.3, 1)
  - `.card:hover` { transform: translateY(-4px); box-shadow: rgba(0, 0, 0, 0.08) 0px 20px 40px; }
- **h3**: display: block; width: 299.328px; height: 31.8125px; margin: 19.89px 0px; font-family: Satoshi, system-ui, sans-serif; font-size: 19.89px; font-weight: 700; line-height: 31.824px; color: #1c1917
- **p**: display: block; width: 299.328px; height: 54.375px; margin: 17px 0px; font-family: Satoshi, system-ui, sans-serif; font-size: 17px; font-weight: 400; line-height: 27.2px; color: #1c1917

## How to build it
1. Look at my project's stack and conventions first, then build this as a proper component in my codebase (my framework, my styling approach, my tokens where they're close) — not a pasted blob of inline styles.
2. Match sizes, spacing, typography, colors, radii, shadows, and every hover/focus/active state and animation listed above.
3. Use my real content or clear placeholders; don't copy the reference's copy, logos or images.
4. Make it responsive down to ~320px wide and accessible (semantic HTML, focus-visible, reduced motion).
5. Tell me where you put it and how to use it.
