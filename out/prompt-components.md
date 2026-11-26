# Component guide
Apply this style when designing or restyling my site: define it once as global tokens (CSS variables / theme config) and reusable component styles, then use it consistently. Keep my content and functionality as they are.

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
