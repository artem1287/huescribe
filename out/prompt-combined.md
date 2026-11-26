I'm adding 2 design details that I liked on another website to my existing site. Make only the changes described below and keep everything else on my site (other sections, animations, colors and content) exactly as it is: this is a targeted addition, not a redesign.

<changes>
<change id="1">
<where>All buttons</where>
<what>Button hover effect: When you hover over it, it smoothly lifts up slightly, grows a little and gets a different shadow (250ms)</what>
<reference>
```css
/* resting */
transition: transform .25s cubic-bezier(.16, 1, .3, 1), box-shadow .25s cubic-bezier(.16, 1, .3, 1);
/* :hover */
transform:translateY(-2px) scale(1.02);
box-shadow:rgba(234,88,12,.35) 0px 10px 30px;
```
</reference>
</change>
<change id="2">
<where>All headings</where>
<what>Main heading font: Fraunces, very large and bold, with tight letter spacing (64px, weight 700, line height 1.1, letter spacing -0.02em)</what>
<reference>
```css
font-family: "Fraunces";
font-size: 74px;
font-weight: 700;
line-height: 1.1;
letter-spacing: -0.02em;
/* source on the original: Google Fonts */
```
</reference>
<adjustments>I changed this from the original: size 64px → 74px. The <reference> above already includes these changes.</adjustments>
</change>
</changes>

<fit>Keep the effect itself (shape, direction, timing, structure) but use my site's existing colors, fonts and spacing tokens instead of the literal values in <reference>, so it blends in with the rest of my site.</fit>

<instructions>
1. Before editing, find the code for each <where> location (the component and the styles that control it). If a <where> is ambiguous or matches several places, ask me which one I mean before changing anything.
2. Implement it with my site's existing styling approach (for example Tailwind, CSS modules or plain CSS) and reuse my existing design tokens where they fit.
3. Give keyboard users the same effect on :focus-visible, and keep the transition so the effect animates instead of snapping.
4. Load fonts from a free source (Google Fonts, Fontshare, or an open-license self-hosted file) with font-display: swap. If a font is commercial, use the closest free alternative and tell me which one you picked.
5. Keep the diff minimal: leave everything outside the <where> targets untouched (no refactors, renames or restyling).
6. Check that it renders correctly (run the dev server or a build if the project has one), then tell me which files you changed and where to look to see the result.
</instructions>
