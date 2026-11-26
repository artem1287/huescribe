"""Chrome Web Store images for Huescribe, built from real captures (run tests/screenshots.py first).
Writes /home/claude/store/: screenshot-1..4.png (1280x800), promo-small-440x280.png, promo-marquee-1400x560.png."""
import os
from PIL import Image, ImageDraw, ImageFont

from wordmark import draw_picked  # the "Picked" wordmark: "Hue" in the picker's outline

SHOTS = "/home/claude/shots"
OUT = "/home/claude/store"
HERO = "/home/claude/homepage/assets/rapeseed-sky.jpg"
ICON = "/home/claude/huescribe/icons/icon128.png"
SERIF, SANS = "/tmp/newsreader.ttf", "/tmp/inter500.ttf"  # written by homepage/export/build_site.py
WORDMARK = "/tmp/inter600.ttf"  # the logo wordmark is Inter Semibold (made from site/assets/fonts/inter-600.woff2 below)
PAPER, INK, MUTED, ACCENT = (247, 246, 242), (21, 21, 21), (95, 95, 89), (185, 217, 106)


def font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except OSError as err:
        raise SystemExit(f"make_store_assets: font missing ({path}); run homepage/export/build_site.py first") from err


def cover(im, w, h, anchor_y=0.5):
    """Scale and crop an image to fill w x h."""
    k = max(w / im.width, h / im.height)
    im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    x = (im.width - w) // 2
    y = round((im.height - h) * anchor_y)
    return im.crop((x, y, x + w, y + h))


def card(im, radius=14):
    """Rounded corners plus a soft edge so a capture reads as a window."""
    mask = Image.new("L", im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, im.width - 1, im.height - 1), radius, fill=255)
    out = Image.new("RGBA", im.size)
    out.paste(im.convert("RGBA"), (0, 0), mask)
    return out


def shadowed(base, im, xy):
    sh = Image.new("RGBA", (im.width + 40, im.height + 40), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((20, 26, im.width + 20, im.height + 20), 16, fill=(0, 0, 0, 40))
    from PIL import ImageFilter
    sh = sh.filter(ImageFilter.GaussianBlur(12))
    base.alpha_composite(sh, (xy[0] - 20, xy[1] - 20))
    base.alpha_composite(im, xy)


def screenshot(n, caption, panel_file):
    W, H = 1280, 800
    base = Image.new("RGBA", (W, H), PAPER + (255,))
    d = ImageDraw.Draw(base)
    d.text((56, 40), caption, font=font(SERIF, 44), fill=INK)
    site = Image.open(f"{SHOTS}/1-pick.png").convert("RGB")
    site = site.resize((site.width // 2, site.height // 2), Image.LANCZOS).crop((0, 0, 780, 610))
    shadowed(base, card(site), (56, 140))
    panel = Image.open(f"{SHOTS}/{panel_file}").convert("RGB")
    panel = panel.resize((380, 720), Image.LANCZOS).crop((0, 0, 380, 610))
    shadowed(base, card(panel), (W - 56 - 380, 140))
    base.convert("RGB").save(f"{OUT}/screenshot-{n}.png")


def promo_small():
    W, H = 440, 280
    base = Image.new("RGBA", (W, H), PAPER + (255,))
    icon = Image.open(ICON).convert("RGBA").resize((72, 72), Image.LANCZOS)
    base.alpha_composite(icon, (36, 40))
    d = ImageDraw.Draw(base)
    draw_picked(base, (128, 58), font(WORDMARK, 38), INK)
    d = ImageDraw.Draw(base)
    d.multiline_text((36, 142), "See a design you love?\nBring it to your own site.", font=font(SANS, 22), fill=INK, spacing=6)
    d.rounded_rectangle((36, 222, 36 + 150, 222 + 6), 3, fill=ACCENT)
    base.convert("RGB").save(f"{OUT}/promo-small-440x280.png")


def promo_marquee():
    W, H = 1400, 560
    bg = cover(Image.open(HERO).convert("RGB"), W, H, 0.85)
    shade = Image.new("RGBA", (W, H))
    sd = ImageDraw.Draw(shade)
    for x in range(W):  # darker on the left, under the text
        sd.line((x, 0, x, H), fill=(18, 36, 54, int(170 * max(0, 1 - x / 900))))
    base = bg.convert("RGBA")
    base.alpha_composite(shade)
    d = ImageDraw.Draw(base)
    icon = Image.open(ICON).convert("RGBA").resize((56, 56), Image.LANCZOS)
    base.alpha_composite(icon, (72, 72))
    draw_picked(base, (146, 80), font(WORDMARK, 30), "white", on_dark=True)
    d = ImageDraw.Draw(base)
    d.multiline_text((72, 170), "See a design you love?\nBring it to your own site.", font=font(SERIF, 60), fill="white", spacing=4)
    d.multiline_text((72, 340), "Click the parts you like on any website. Huescribe\nwrites them up as one prompt for your AI app.", font=font(SANS, 24), fill=(238, 243, 247), spacing=8)
    panel = Image.open(f"{SHOTS}/4-copied.png").convert("RGB").resize((380, 720), Image.LANCZOS).crop((0, 0, 380, 470))
    shadowed(base, card(panel), (W - 72 - 380, 50))
    base.convert("RGB").save(f"{OUT}/promo-marquee-1400x560.png")


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    if not os.path.exists(WORDMARK):
        from fontTools.ttLib import TTFont
        f = TTFont("/home/claude/site/assets/fonts/inter-600.woff2")
        f.flavor = None
        f.save(WORDMARK)
    screenshot(1, "Click anything you like on a website", "3-list.png")
    screenshot(2, "Choose what you want from it", "2-choose.png")
    screenshot(3, "One prompt for your AI app, on your clipboard", "4-copied.png")
    promo_small()
    promo_marquee()
    print("written to", OUT)
