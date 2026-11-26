# Motion guide
Apply this style when designing or restyling my site: define it once as global tokens (CSS variables / theme config) and reusable component styles, then use it consistently. Keep my content and functionality as they are. Respect prefers-reduced-motion.

## Motion
- Easing: cubic-bezier(0.16, 1, 0.3, 1) (expo-out: fast start, long soft settle); durations 250–300ms
- Interactions:
  - button hover: transform:translateY(-2px) scale(1.02);box-shadow:rgba(234,88,12,.35) 0px 10px 30px
  - input focus: outline:none;box-shadow:rgba(234,88,12,.25) 0px 0px 0px 3px;border-color:#ea580c
  - card hover: transform:translateY(-4px);box-shadow:rgba(0,0,0,.08) 0px 20px 40px
- Keyframes:
  - float (text, 4000ms ease-in-out infinite): 0%, 100%{transform:translateY(0px)} 50%{transform:translateY(-12px)}
- Scroll: smooth scrolling, sticky header
