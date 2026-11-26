These are exact requirements taken from another website, not inspiration. Match each one exactly: same structure, order, sizes, colors and timing. Only change what a <change_i_want> or <note> says.

<design_detail from="127.0.0.1:8001">
<what>Page structure: Every section from top to bottom: what is in it and how it is laid out</what>
<values>
1. Navigation bar — 73px tall
   - header — in a row, spread to both ends, vertically centered; positions: left, middle, right; full width; sticky at the top (stays while scrolling); rgba(11,11,18,0.7); see-through with 12px blur behind; padding 0px 40px; border (bottom) 1px solid rgba(255,255,255,0.08)
     - logo: picture + brand name, 1 word — system-ui 18px, weight 700, #ffffff, with a 28×28 logo mark before the text
     - menu — in a row, gap 32px; 370px wide
       - menu link ×5: page links, 1 word each — system-ui 15px, weight 500, #d4d4d8
     - box — in a row, vertically centered, gap 12px; positions: left, right; 177px wide
       - menu link: sign-in, 2 words — system-ui 15px, weight 400, #ffffff
       - button: sign-up call to action, 2 words — filled #7c3aed; system-ui 15px, weight 600, #ffffff; padding 10px 18px, radius full (pill); 39px tall
2. Hero (first section) — 880px tall
   - section — stacked; text centered; full width; min-height 640px; linear-gradient(#0b0b12 0%, #1e1035 100%); padding 120px 40px
     - decoration 600×600 — radial-gradient(circle, #7c3aed 0%, transparent 70%), blur(60px)
     - heading (h1): main headline, 5 words — system-ui 64px, weight 700, gradient text linear-gradient(90deg, #ffffff, #c4b5fd), max-width 820px
     - text: supporting line under the headline, 12 words — system-ui 20px, weight 400, #a1a1aa, max-width 560px
     - button: sign-up call to action, 2 words — filled #7c3aed; system-ui 15px, weight 600, #ffffff; padding 10px 18px, radius full (pill); 39px tall
3. Section: cards section (3 cards) — 471px tall
   - section — stacked; full width; #0b0b12; padding 96px 40px
     - heading (h2): section title, 3 words — system-ui 40px, weight 700, #ffffff
     - box — grid, 3 equal columns, gap 24px; max-width 1120px, centered
       - card ×3 — stacked; 357px wide; rgba(255,255,255,0.04); padding 28px; radius 16px; border 1px solid rgba(255,255,255,0.08)
         - icon 32×32
         - heading (h3): card title, 1 word — system-ui 20px, weight 700, #ffffff
         - text: card description, 8 words — system-ui 16px, weight 400, #a1a1aa
4. Section: text section — 298px tall
   - section — stacked; full width; #f8fafc; padding 96px 40px
     - heading (h2): section title, 3 words — system-ui 40px, weight 700, #0f172a
     - text: description under the title, 7 words — system-ui 18px, weight 400, #475569
5. Section: call-to-action band — 228px tall
   - section — stacked; text centered; full width; linear-gradient(90deg, #7c3aed, #db2777); padding 72px 40px
     - heading (h2): section title, 3 words — system-ui 36px, weight 700, #ffffff
     - button: sign-up call to action, 2 words — filled #ffffff; system-ui 16px, weight 600, #7c3aed; padding 12px 20px, radius full (pill); 44px tall
6. Footer — 116px tall
   - footer — in a row, spread to both ends; positions: left, right; full width; #09090b; padding 48px 40px
     - text: copyright line, 2 words — system-ui 16px, weight 400, #71717a
     - text: footer text, 3 words — system-ui 16px, weight 400, #71717a
</values>
</design_detail>

<design_detail from="127.0.0.1:8001">
<what>Navigation bar: Where everything sits, its size, look and behavior</what>
<values>
Bar: 73px tall; full width; sticky at the top (stays while scrolling)
Background: rgba(11,11,18,0.7) + see-through with 12px blur behind; padding 0px 40px, border (bottom) 1px solid rgba(255,255,255,0.08)
Changes smoothly (background 0.3s), likely when you scroll
Logo: first, picture + brand name
Menu links: 5 page links, 1 word each; system-ui 15px, weight 500, #d4d4d8
Also a sign-in link (system-ui 15px, weight 400, #ffffff)
Buttons: sign-up call to action (2 words)
The 2nd menu link opens a dropdown
Small screens: a menu button replaces the links (hidden at this width)

Structure:
- header — in a row, spread to both ends, vertically centered; positions: left, middle, right; full width; sticky at the top (stays while scrolling); rgba(11,11,18,0.7); see-through with 12px blur behind; padding 0px 40px; border (bottom) 1px solid rgba(255,255,255,0.08)
  - logo: picture + brand name, 1 word — system-ui 18px, weight 700, #ffffff, with a 28×28 logo mark before the text
  - menu — in a row, gap 32px; 370px wide
    - menu link ×5: page links, 1 word each — system-ui 15px, weight 500, #d4d4d8
  - box — in a row, vertically centered, gap 12px; positions: left, right; 177px wide
    - menu link: sign-in, 2 words — system-ui 15px, weight 400, #ffffff
    - button: sign-up call to action, 2 words — filled #7c3aed; system-ui 15px, weight 600, #ffffff; padding 10px 18px, radius full (pill); 39px tall
</values>
</design_detail>
