"""The "Picked" wordmark (logo option C), drawn with Pillow for raster images (store tiles, share image).

"Hue" sits inside the picker's outline: a light green fill, a green outline and two square handles (top left,
bottom right). All letters are evenly spaced. The web version is plain HTML/CSS (see homepage patch round_nov19c).
"""
from PIL import Image, ImageDraw

ACCENT = (185, 217, 106)      # #B9D96A
ACCENT_DEEP = (91, 111, 42)   # #5B6F2A


def draw_picked(img, xy, font, fill, on_dark=False, tracking=0.05):
    """Draw "Huescribe" at xy (top-left of the text box) with "Hue" picked. Returns the full text width.

    Every letter gets the same tracking (em), so "e" to "s" is spaced like the rest. The outline is drawn on its own
    layer around the ink of "Hue", halfway between "e" and "s" (and the same distance on the other sides), so it never
    pushes "scribe" away. The bottom-right handle hangs below the box, where "s" has no ink.
    img must be RGBA or RGB; the translucent fill is composited, so it works on photos too.
    """
    x, y = xy
    text = "Huescribe"
    size = font.size
    track = size * tracking
    probe = ImageDraw.Draw(img)
    # Pen position of each letter: Pillow's own advance (with kerning) plus the same tracking after every letter.
    pens = [x + font.getlength(text[:i]) + i * track for i in range(len(text))]
    ink = [probe.textbbox((pens[i], y), ch, font=font) for i, ch in enumerate(text)]
    line = max(1, round(size * 0.035))
    gap = ink[3][0] - ink[2][2]                     # space between the ink of "e" and "s"
    c = max(0.5, (gap - line) / 2)                  # clearance on each side of the outline
    top = min(b[1] for b in ink[:3])
    bottom = max(b[3] for b in ink[:3])
    box = (round(ink[0][0] - c - line), round(top - c - line), round(ink[2][2] + c + line), round(bottom + c + line))
    handle = max(7, round(size * 0.17))  # corner squares: clearly visible

    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    radius = max(1, round(size * 0.03))
    d.rounded_rectangle(box, radius=radius, fill=ACCENT + (70 if on_dark else 60,))
    d.rounded_rectangle(box, radius=radius, outline=ACCENT + (255,) if on_dark else ACCENT_DEEP + (255,), width=line)
    h = handle // 2
    hw = max(2, line)
    d.rectangle((box[0] - h, box[1] - h, box[0] + h, box[1] + h), fill=(255, 255, 255, 255), outline=ACCENT_DEEP + (255,), width=hw)
    d.rectangle((box[2] - h, box[3] - line, box[2] + h, box[3] - line + handle), fill=(255, 255, 255, 255), outline=ACCENT_DEEP + (255,), width=hw)
    base = img.convert("RGBA")
    base.alpha_composite(layer)
    d2 = ImageDraw.Draw(base)
    for i, ch in enumerate(text):
        d2.text((pens[i], y), ch, font=font, fill=fill)
    if img.mode == "RGB":
        img.paste(base.convert("RGB"))
    else:
        img.paste(base)
    return font.getlength(text) + (len(text) - 1) * track
