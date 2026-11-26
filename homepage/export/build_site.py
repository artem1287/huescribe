"""Build the publishable Huescribe website from the Version B design file.

Usage: python3 build_site.py <VersionB.dc.html> <output folder>

Produces a plain static site (no canvas runtime, no third-party requests):
  index.html, privacy.html, terms.html, robots.txt, README.md, _headers,
  assets/ (fonts, fonts.css, legal.css), images/ (photos, app screenshots, favicons, share image).
"""
import os
import re
import shutil
import sys

from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFilter, ImageFont

SRC, OUT = sys.argv[1], sys.argv[2]
HERE = os.path.dirname(os.path.abspath(__file__))
HOME = os.path.abspath(os.path.join(HERE, "..", ".."))  # the folder that holds homepage/, shots/ and huescribe/
FONTS = "/tmp/fs/node_modules"

# Design-canvas asset ids -> files in the site's images folder
BLOBS = {
    "73a529ddad7b2abea69173e4d7205e06": ("homepage/assets/rapeseed-sky.jpg", "images/hero-flowers.webp"),
    "3ebdee5b6df9c1f8efb5b38f2d8dd974": ("homepage/assets/flower-lavender.jpg", "images/flowers-lavender.webp"),
    "bed43d89031baa236a337d6280d4ea7d": ("homepage/assets/flower-whiteyellow.jpg", "images/flowers-daisies.webp"),
    "5e8aaabd596e55afc228002d927104cc": ("homepage/assets/flower-alpine.jpg", "images/flowers-alpine.webp"),
    "ad089e0a77baace4033d5906642d8977": ("homepage/assets/flower-cosmos.jpg", "images/flowers-cosmos.webp"),
    "b458ee4198ae746817ab597def6c952f": ("shots/out10/pick.webp", "images/app-pick.webp"),
    "234d74be6b56d5d32a678c922ca66b5a": ("shots/out10/choose.webp", "images/app-choose.webp"),
    "d09001fbd56b069fa30bd8b06abb5f65": ("shots/out10/copied.webp", "images/app-copied.webp"),
    "5706d7d19c5ddbd598ba368f1da48c09": ("shots/out10/list.webp", "images/app-list.webp"),
}


def need(s, old, count=1):
    """Fail loudly when the design file no longer contains what the export expects."""
    n = s.count(old)
    if n != count:
        raise SystemExit(f"build_site: expected {count} of {old[:80]!r}, found {n}")


def sub1(s, old, new, count=1):
    need(s, old, count)
    return s.replace(old, new)


if os.path.exists(OUT):
    shutil.rmtree(OUT)
for d in ("assets/fonts", "images"):
    os.makedirs(os.path.join(OUT, d), exist_ok=True)

src = open(SRC, encoding="utf-8").read()

# ---------- split the design file into head CSS and body markup ----------
head_meta = src[src.index("<head>") + 6:src.index("</head>")]
head_meta = head_meta.replace('<script src="./support.js"></script>', "")
helmet = src[src.index("<helmet>") + 8:src.index("</helmet>")]
style = re.search(r"<style>(.*?)</style>", helmet, re.S).group(1)
body = src[src.index("</helmet>") + 9:src.index("</x-dc>")]

for blob, (_, dest) in BLOBS.items():
    style = style.replace("/_blob/" + blob, dest)
    body = body.replace("/_blob/" + blob, dest)
if "/_blob/" in style + body:
    raise SystemExit("build_site: an image is not mapped: " + re.search(r"/_blob/\w+", style + body).group(0))

# ---------- links ----------
body = sub1(body, '<section aria-labelledby="pl-cta-title" class="pl-cta-row pl-cta-full"', '<section id="cta" aria-labelledby="pl-cta-title" class="pl-cta-row pl-cta-full"')
for bad in ("before launch", "[Company", "[Contact", "PromptLift", "data-guide"):
    if bad in body:
        raise SystemExit("build_site: a placeholder or old name is left in the page: " + bad)

# ---------- fonts: served from the site (no Google Fonts request) ----------
# Each family is split into character sets (Latin, Latin Extended, Cyrillic, Vietnamese) with unicode-range, so a
# page downloads only the sets its text uses: English stays Latin-only; Turkish, Russian, Vietnamese get theirs.
# Newsreader has no Cyrillic: Russian headings use Inter (see the language CSS in i18n_build.py).
def subset_ranges(css_file):
    css = open(css_file, encoding="utf-8").read()
    out = {}
    for block in re.findall(r"@font-face\s*{[^}]*}", css):
        f = re.search(r"files/[\w-]+?-(latin-ext|latin|cyrillic-ext|cyrillic|vietnamese|greek-ext|greek)-", block)
        r = re.search(r"unicode-range:\s*([^;]+);", block)
        if f and r: out[f.group(1)] = r.group(1).strip()
    return out


SUBSETS = ("latin", "latin-ext", "cyrillic", "vietnamese")
fonts_css = ["/* Newsreader, Inter and JetBrains Mono (SIL Open Font License), served from this site, split by character set */"]
font_files = {}
nr = subset_ranges(os.path.join(FONTS, "@fontsource-variable/newsreader/opsz.css"))
for sub in ("latin", "latin-ext", "vietnamese"):
    name = "newsreader-opsz.woff2" if sub == "latin" else f"newsreader-{sub}-opsz.woff2"
    font_files[name] = f"@fontsource-variable/newsreader/files/newsreader-{sub}-opsz-normal.woff2"
    fonts_css.append(f"@font-face{{font-family:Newsreader;font-style:normal;font-weight:200 800;font-display:swap;src:url(fonts/{name}) format('woff2');unicode-range:{nr[sub]}}}")
for w in (400, 500, 600, 700):
    ir = subset_ranges(os.path.join(FONTS, f"@fontsource/inter/{w}.css"))
    for sub in SUBSETS:
        name = f"inter-{w}.woff2" if sub == "latin" else f"inter-{sub}-{w}.woff2"
        font_files[name] = f"@fontsource/inter/files/inter-{sub}-{w}-normal.woff2"
        fonts_css.append(f"@font-face{{font-family:Inter;font-style:normal;font-weight:{w};font-display:swap;src:url(fonts/{name}) format('woff2');unicode-range:{ir[sub]}}}")
for w in (400, 500):
    font_files[f"jetbrains-mono-{w}.woff2"] = f"@fontsource/jetbrains-mono/files/jetbrains-mono-latin-{w}-normal.woff2"
    fonts_css.append(f"@font-face{{font-family:'JetBrains Mono';font-style:normal;font-weight:{w};font-display:swap;src:url(fonts/jetbrains-mono-{w}.woff2) format('woff2')}}")
for name, rel in font_files.items():
    shutil.copy(os.path.join(FONTS, rel), os.path.join(OUT, "assets/fonts", name))
open(os.path.join(OUT, "assets/fonts.css"), "w").write("\n".join(fonts_css) + "\n")
for f in ("legal.css",):
    shutil.copy(os.path.join(HERE, f), os.path.join(OUT, "assets", f))

# ---------- images ----------
# Web optimization: photos become WebP, no wider than they are ever shown (the hero 2400px for sharp large screens,
# the block photos 1400px); the app screenshots are already WebP and are copied as they are.
for _, (srcf, dest) in BLOBS.items():
    if srcf.endswith(".jpg"):
        im = Image.open(os.path.join(HOME, srcf)).convert("RGB")
        max_w = 2400 if "hero" in dest else (900 if "cosmos" in dest else 1200)
        quality = 48 if "cosmos" in dest else 72  # the cosmos photo is very busy, so it compresses poorly (shown at most ~760px wide)
        if im.width > max_w:
            im = im.resize((max_w, round(im.height * max_w / im.width)), Image.LANCZOS)
        im.save(os.path.join(OUT, dest), "WEBP", quality=quality, method=6)
    else:
        shutil.copy(os.path.join(HOME, srcf), os.path.join(OUT, dest))
# Every <img> gets its real width and height, so the page doesn't jump while images load
def sized(m):
    tag, src = m.group(0), m.group(1)
    w, h = Image.open(os.path.join(OUT, src)).size
    return tag.replace("<img ", f'<img width="{w}" height="{h}" ', 1)
body = re.sub(r'<img [^>]*src="(images/[^"]+)"[^>]*>', sized, body)
icons = os.path.join(HOME, "huescribe/icons")
shutil.copy(os.path.join(icons, "icon32.png"), os.path.join(OUT, "images/favicon-32.png"))
Image.open(os.path.join(icons, "icon128.png")).convert("RGBA").resize((180, 180), Image.LANCZOS).save(os.path.join(OUT, "images/icon-180.png"))


def ttf(woff2, out):
    f = TTFont(woff2)
    f.flavor = None
    f.save(out)
    return out


# Share image (link previews on social media and in chats), 1200x630: the hero photo with the headline
serif = ttf(os.path.join(FONTS, font_files["newsreader-opsz.woff2"]), "/tmp/newsreader.ttf")
sans = ttf(os.path.join(FONTS, font_files["inter-500.woff2"]), "/tmp/inter500.ttf")
hero = Image.open(os.path.join(HOME, "homepage/assets/rapeseed-sky.jpg")).convert("RGB")
W, H = 1200, 630
scale = max(W / hero.width, H / hero.height)
hero = hero.resize((round(hero.width * scale), round(hero.height * scale)), Image.LANCZOS)
x0 = (hero.width - W) // 2
img = hero.crop((x0, hero.height - H, x0 + W, hero.height))
shade = Image.new("L", (W, H))
ImageDraw.Draw(shade).rectangle((0, 0, W, H), fill=0)
for y in range(H):  # darker at the top so white text reads well on the sky
    ImageDraw.Draw(shade).line((0, y, W, y), fill=int(170 - 110 * y / H))
img = Image.composite(Image.new("RGB", (W, H), (20, 40, 60)), img, shade)
draw = ImageDraw.Draw(img)
f_big = ImageFont.truetype(serif, 76)
f_small = ImageFont.truetype(sans, 28)
sys.path.insert(0, os.path.join(HOME, "huescribe/tools"))
from wordmark import draw_picked  # noqa: E402  (the "Picked" wordmark, shared with the store images)
semibold = ttf(os.path.join(FONTS, font_files["inter-600.woff2"]), "/tmp/inter600.ttf")
draw_picked(img, (76, 62), ImageFont.truetype(semibold, 30), "#ffffff", on_dark=True)
draw = ImageDraw.Draw(img)
draw.multiline_text((72, 120), "See a design you love?\nBring it to your own site.", font=f_big, fill="#ffffff", spacing=6)
draw.text((72, 318), "A Chrome extension that turns any website’s design\ninto a prompt for your AI app.", font=f_small, fill="#eef3f7", spacing=8)
img.save(os.path.join(OUT, "images/share.jpg"), "JPEG", quality=84, optimize=True, progressive=True)

# ---------- index.html ----------
head_meta = sub1(head_meta, '<meta name="twitter:card" content="summary_large_image">',
                 '<meta name="twitter:card" content="summary_large_image">\n'
                 '<meta property="og:image" content="images/share.jpg">\n'
                 '<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n'
                 '<meta property="og:image:alt" content="Huescribe: see a design you love? Bring it to your own site.">\n'
                 '<meta name="twitter:image" content="images/share.jpg">\n'
                 '<link rel="icon" type="image/png" sizes="32x32" href="images/favicon-32.png">\n'
                 '<link rel="apple-touch-icon" href="images/icon-180.png">')
# Minify: CSS comments and extra whitespace out, HTML comments out (the JSON-LD and scripts are untouched)
style = re.sub(r"/\*.*?\*/", "", style, flags=re.S)
style = re.sub(r"\s*\n\s*", "\n", style).strip()
body = re.sub(r"<!--.*?-->", "", body, flags=re.S)
body = re.sub(r">\s*\n\s*<", ">\n<", body)
index = ("<!doctype html>\n<html lang=\"en\">\n<head>" + head_meta.rstrip() + "\n"
         '<link rel="preload" href="assets/fonts/newsreader-opsz.woff2" as="font" type="font/woff2" crossorigin>\n'
         '<link rel="preload" href="assets/fonts/inter-400.woff2" as="font" type="font/woff2" crossorigin>\n'
         '<link rel="stylesheet" href="assets/fonts.css">\n'
         "<style>\n" + style + "\n</style>\n</head>\n<body>\n"
         + body.strip() + "\n</body>\n</html>\n")
for bad in ("fonts.googleapis", "fonts.gstatic", "support.js", "x-dc", "_blob"):
    if bad in index:
        raise SystemExit("build_site: left in index.html: " + bad)
open(os.path.join(OUT, "index.html"), "w", encoding="utf-8").write(index)

# ---------- the rest ----------
for f in ("privacy.html", "terms.html", "README.md"):
    shutil.copy(os.path.join(HERE, f), os.path.join(OUT, f))
# Caching for hosts that read a _headers file (Netlify, Cloudflare Pages): fonts and images a year, pages always fresh
open(os.path.join(OUT, "_headers"), "w").write(
    "/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n"
    "/images/*\n  Cache-Control: public, max-age=2592000\n"
    "/*.html\n  Cache-Control: public, max-age=0, must-revalidate\n"
    "/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n")
# No sitemap: a sitemap needs the full web address, and the site works on any domain as it is
# Search engines and AI assistants are all welcome: the AI search crawlers are named so a host's default rules
# can't block them by accident (blocking them means those assistants can't cite the site).
AI_BOTS = ["Googlebot", "Bingbot", "Google-Extended", "GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot",
           "Claude-User", "PerplexityBot", "Perplexity-User", "Applebot", "Applebot-Extended", "DuckAssistBot", "Meta-ExternalAgent"]
open(os.path.join(OUT, "robots.txt"), "w").write("".join(f"User-agent: {b}\nAllow: /\n\n" for b in AI_BOTS) + "User-agent: *\nAllow: /\n")

# ---------- language versions: /<lang>/index.html from i18n/site/<lang>.json (English stays at the root) ----------
sys.path.insert(0, HERE)
from i18n_build import build as build_languages  # noqa: E402
langs_built = build_languages(OUT, os.path.join(os.path.dirname(HERE), "i18n", "site"))
print("languages:", " ".join(["en"] + langs_built))

# ---------- security headers (hosts that read _headers: Netlify, Cloudflare Pages) ----------
# A strict Content-Security-Policy: everything from this site only; the one inline script (the demo pointer) is allowed
# by its hash, recomputed on every build, so editing it can never silently break or widen the policy.
import base64, glob, hashlib  # noqa: E402
inline = set()
for f in glob.glob(os.path.join(OUT, "**", "*.html"), recursive=True):
    for attrs, body in re.findall(r"<script([^>]*)>(.*?)</script>", open(f, encoding="utf-8").read(), re.S):
        if "src=" in attrs or "ld+json" in attrs:
            continue
        inline.add("'sha256-" + base64.b64encode(hashlib.sha256(body.encode("utf-8")).digest()).decode() + "'")
CSP = ("default-src 'none'; script-src 'self' " + " ".join(sorted(inline)) + "; style-src 'self' 'unsafe-inline'; "
       "img-src 'self' data:; font-src 'self'; connect-src 'self'; media-src 'self'; manifest-src 'self'; "
       "base-uri 'self'; form-action 'none'; frame-ancestors 'none'; object-src 'none'; upgrade-insecure-requests")
open(os.path.join(OUT, "_headers"), "a").write(
    f"  Content-Security-Policy: {CSP}\n"
    "  Strict-Transport-Security: max-age=63072000; includeSubDomains\n"
    "  X-Frame-Options: DENY\n"
    "  Cross-Origin-Opener-Policy: same-origin\n"
    "  Cross-Origin-Resource-Policy: same-origin\n"
    "  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=(), interest-cohort=()\n"
    "/\n  Cache-Control: public, max-age=0, must-revalidate\n"
    "/*/\n  Cache-Control: public, max-age=0, must-revalidate\n")
print("security headers:", len(inline), "inline script hash(es)")

# llms.txt (hand-written overview) and llms-full.txt (this page as plain markdown, rebuilt every time so it never drifts)
shutil.copy(os.path.join(HERE, "llms.txt"), os.path.join(OUT, "llms.txt"))
sys.path.insert(0, HERE)
from llms_full import page_to_markdown  # noqa: E402
open(os.path.join(OUT, "llms-full.txt"), "w", encoding="utf-8").write(page_to_markdown(open(os.path.join(OUT, "index.html"), encoding="utf-8").read()))
print("built", OUT)
