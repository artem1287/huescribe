I'm building a new website: a landing page for my bakery.
Use the design details below, taken from other websites, as its spec, each in the place <where_on_my_site> says. Details for the whole site set the overall look; the others are parts of pages, in the order I want them from top to bottom.
Each detail is an exact requirement taken from another website, not inspiration: match it exactly (same structure, order, sizes, colors and timing). Only change what a <change_i_want> or <note> says.
Where text is described by its purpose (for example "main headline, 5 words"), write my own content for it.

<design_detail from="127.0.0.1:8001">
<where_on_my_site>top of my homepage</where_on_my_site>
<what>Gradient: Light orange to pale pink, diagonal (linear, 135°)</what>
<values>
background-image: linear-gradient(315deg, #fed7aa, #fbcfe8);
</values>
<change_i_want>fade to white at the bottom</change_i_want>
<note>These values include my tweaks (angle 135° → 315°).</note>
<note>Picture 1 (pasted with this message) shows the original.</note>
</design_detail>

<design_detail from="127.0.0.1:8001">
<where_on_my_site>All headings</where_on_my_site>
<what>Letters rise in one by one (on the main heading): Each letter rises up and fades in, one by one. Smooth, about 1 second.</what>
<values>
Keyframes: 0% { opacity: 0; transform: translate(0px, 40px) } → 100% { opacity: 1; transform: translate(0px, 0px) }
Each letter (18 in total): 600ms, easing cubic-bezier(0.16, 1, 0.3, 1), starts 40ms after the previous one
Plays once, when the page loads
Measured from a JavaScript animation, so the easing is approximate
</values>
<note>Picture 2 (pasted with this message) is a filmstrip of the original animation, frames in order.</note>
</design_detail>
