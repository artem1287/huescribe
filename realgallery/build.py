"""Gallery of the real-site test: for each site and pick, the PromptLift panel (and the page with
PromptLift's outline, where that was saved). The newest run of each site wins."""
import json, os, html, shutil
from PIL import Image

RUNS = ["/tmp/pl-pos/real", "/tmp/pl-rerun3/real", "/tmp/pl-rerun2/real", "/tmp/pl-rerun/real", "/tmp/promptlift-out/real"]
OUT = os.path.dirname(os.path.abspath(__file__))
IMG = os.path.join(OUT, "img")
shutil.rmtree(IMG, ignore_errors=True)
os.makedirs(IMG)
KINDS = [("heading", "Heading"), ("button", "Main button"), ("header", "Header"), ("card", "Card"), ("picture", "Picture"), ("sections", "Screen portions")]
ORDER = ["stripe.com", "linear.app", "apple.com", "vercel.com", "github.com", "notion.com", "framer.com", "webflow.com", "figma.com", "tailwindcss.com",
         "shopify.com", "dropbox.com", "raycast.com", "anthropic.com", "airbnb.com", "wikipedia.org", "duolingo.com", "mailchimp.com", "squarespace.com", "nytimes.com"]

latest = {}
for run in RUNS:
    rp = os.path.join(run, "report.json")
    if not os.path.exists(rp):
        continue
    for r in json.load(open(rp)):
        latest.setdefault(r["site"], (r, run))


def panel_img(src, out):
    """The panel at 75%, cut at 1100px so long screens stay readable in a grid."""
    im = Image.open(src).convert("RGB")
    im = im.resize((300, round(im.height * 300 / im.width)))
    im.crop((0, 0, 300, min(im.height, 1100))).save(out, quality=80)


def page_img(src, out):
    im = Image.open(src).convert("RGB")
    im.resize((960, round(im.height * 960 / im.width))).save(out, quality=78)


sections = []
for name in ORDER:
    if name not in latest:
        continue
    r, run = latest[name]
    figs = []
    pages = []
    for kind, label in KINDS:
        panel = os.path.join(run, f"{name}-{kind}.png")
        if kind == "sections":
            sec = r.get("sections") or {}
            info = " · ".join(sec.get("rows", [])) or ""
        else:
            pk = next((p for p in r.get("picks", []) if p["kind"] == kind), None)
            if not pk:
                continue
            groups = ", ".join(f"{g['g']} {g['n']}" for g in pk.get("groups", []))
            info = (pk.get("result", "") + (f" · {pk['seconds']}s" if pk.get("seconds") else "") + (f" · {groups}" if groups else ""))
        if os.path.exists(panel):
            fn = f"{name}-{kind}.jpg"
            panel_img(panel, os.path.join(IMG, fn))
            figs.append(f'<figure class="panel"><figcaption><b>{label}</b><span>{html.escape(info)}</span></figcaption><img loading="lazy" src="img/{fn}" alt="PromptLift panel after picking the {label.lower()} on {name}"></figure>')
        for suffix, cap in [("-page", f"{label}: the page with PromptLift's outline"), ("-top-page", "Sections, top of the page")]:
            pg = os.path.join(run, f"{name}-{kind}{suffix}.png")
            if not os.path.exists(pg):
                pg = os.path.join("/tmp/promptlift-out/real", f"{name}-{kind}{suffix}.png")
            if os.path.exists(pg):
                fn = f"{name}-{kind}{suffix}.jpg"
                page_img(pg, os.path.join(IMG, fn))
                pages.append(f'<figure class="page"><figcaption><b>{html.escape(cap)}</b></figcaption><img loading="lazy" src="img/{fn}" alt="{html.escape(cap)} on {name}"></figure>')
    if r.get("blocked"):
        status = '<span class="muted">Blocked by a bot check: not testable from an automated browser</span>'
    elif r.get("problems"):
        status = '<span class="bad">' + html.escape("; ".join(p.split("\n")[0] for p in r["problems"])) + "</span>"
    else:
        status = '<span class="ok">No problems</span>'
    body = (f'<div class="pages">{"".join(pages)}</div>' if pages else "") + (f'<div class="grid">{"".join(figs)}</div>' if figs else "")
    sections.append(f'<section id="{name}"><h2>{name} {status}</h2>{body}</section>')

ok = sum(1 for n in ORDER if n in latest and not latest[n][0].get("problems") and not latest[n][0].get("blocked"))
tested = sum(1 for n in ORDER if n in latest and not latest[n][0].get("blocked"))
nav = " ".join(f'<a href="#{n}">{n}</a>' for n in ORDER if n in latest)
doc = f"""<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>PromptLift on real websites</title><style>
:root {{ --bg:#fff; --fg:#0a0a0a; --muted:#71717a; --border:#e4e4e7; --ok:#16a34a; --bad:#dc2626; --accent:#7c3aed; }}
@media (prefers-color-scheme: dark) {{ :root {{ --bg:#0a0a0a; --fg:#fafafa; --muted:#a1a1aa; --border:#27272a; --ok:#4ade80; --bad:#f87171; }} }}
* {{ box-sizing:border-box; }} body {{ margin:0; font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif; background:var(--bg); color:var(--fg); }}
main {{ max-width:1280px; margin:0 auto; padding:1.5rem 1rem 4rem; }}
h1 {{ font-size:1.75rem; margin:0 0 .25rem; }} .lede {{ color:var(--muted); margin:0 0 1rem; max-width:70ch; }}
nav {{ display:flex; flex-wrap:wrap; gap:.375rem; margin-bottom:1.5rem; }}
nav a {{ min-height:44px; display:inline-flex; align-items:center; padding:0 .875rem; border:1px solid var(--border); border-radius:999px; color:inherit; text-decoration:none; font-size:.8125rem; }}
nav a:hover, nav a:focus-visible {{ border-color:var(--accent); outline:none; }}
section {{ border-top:1px solid var(--border); padding-top:1.25rem; margin-top:2rem; }}
h2 {{ font-size:1.375rem; margin:0 0 1rem; display:flex; flex-wrap:wrap; gap:.25rem .75rem; align-items:baseline; }}
h2 span {{ font-size:.8125rem; font-weight:500; }} .ok {{ color:var(--ok); }} .bad {{ color:var(--bad); }} .muted {{ color:var(--muted); }}
.grid {{ display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:1rem; align-items:start; }}
.pages {{ display:grid; grid-template-columns:repeat(auto-fill,minmax(min(100%,440px),1fr)); gap:1rem; margin-bottom:1rem; }}
figure {{ margin:0; }} figcaption {{ font-size:.8125rem; margin-bottom:.375rem; display:flex; flex-direction:column; }}
figcaption span {{ color:var(--muted); font-size:.75rem; }}
figure img {{ width:100%; height:auto; display:block; border:1px solid var(--border); border-radius:8px; }}
</style></head><body><main>
<h1>PromptLift on real websites</h1>
<p class="lede">{ok} of {tested} testable sites without problems. For every site the test picked a heading, the main button, the header, a card and a picture, then chose sections, all the way to a copied prompt. Shown: the PromptLift panel after each pick (cut at the first screens), and for Stripe and Linear also the page with PromptLift's outline. Headless Chrome, 1280×900.</p>
<nav aria-label="Sites">{nav}</nav>
{"".join(sections)}
</main></body></html>"""
open(os.path.join(OUT, "index.html"), "w").write(doc)
print("sites", len(sections), "ok", ok, "of", tested, "images", len(os.listdir(IMG)))
