Add this design detail from another website to my site. Change only what's described below and leave everything else as it is.

<change>
<where>All headings</where>
<what>Letters rise in one by one (on the main heading): Each letter rises up and fades in, one by one. Smooth, about 1 second. Plays: on load. Exact timing: moves 40px, 600ms each, 40ms apart, strong ease-out.</what>
<reference>
```css
@keyframes copied-animation {
  0% { opacity: 0; transform: translate(0px, 40px); }
  100% { opacity: 1; transform: translate(0px, 0px); }
}

/* apply to each letter */
animation: copied-animation 600ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
animation-delay: calc(var(--i) * 40ms); /* --i = the letter's index, starting at 0 */
/* measured from a JavaScript-driven animation on the original; easing is approximated */
```
</reference>
</change>

If I pasted a picture, it is a filmstrip of the original animation (frames in order), before my tweaks; follow <reference> where they differ.
If the <where> is unclear, ask me before changing anything.
