# Generates PromptLift toolbar icons: violet rounded square with a white "lift" arrow + prompt caret.
from PIL import Image, ImageDraw
import sys
out = sys.argv[1]
S = 512
img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
d.rounded_rectangle([0, 0, S - 1, S - 1], radius=112, fill=(124, 58, 237, 255))
w = 40
# prompt caret ">"
d.line([(120, 170), (210, 256), (120, 342)], fill="white", width=w, joint="curve")
# underscore cursor
d.line([(250, 342), (392, 342)], fill="white", width=w)
# up arrow (lift)
d.line([(321, 280), (321, 140)], fill="white", width=w)
d.line([(262, 196), (321, 137), (380, 196)], fill="white", width=w, joint="curve")
for size in (16, 32, 48, 128):
    img.resize((size, size), Image.LANCZOS).save(f"{out}/icon{size}.png")
