"""Build the Huescribe demo video from the recorded frames, the title cards and the voice lines.

python3 assemble.py stills   -> a few full-size frames to check (stills/*.jpg)
python3 assemble.py          -> huescribe-demo.mp4 (1920x1080, 30 fps, voice + burnt-in captions)
"""
import bisect
import json
import os
import subprocess
import sys

import numpy as np
import soundfile as sf
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = "/home/claude/demo-video"
W, H, FPS = 1920, 1080, 30
INTER = "/home/claude/demo-site/fonts/inter-500.woff2"
FONT_DIR = "/tmp/fs/node_modules"
marks = json.load(open(f"{HERE}/marks.json"))
dur = json.load(open(f"{HERE}/durations.json"))
lines = dict((k, v) for k, v in json.load(open(f"{HERE}/lines.json")))
os.makedirs(f"{HERE}/build", exist_ok=True)
os.makedirs(f"{HERE}/stills", exist_ok=True)


def font(weight, size):
    # Pillow can't read woff2: use the TTFs converted for the store images when present.
    for path in (f"/tmp/inter{weight}.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"):
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def frames(name):
    fs = sorted(os.listdir(f"{HERE}/frames/{name}"))
    return [float(f[:-4]) for f in fs], [f"{HERE}/frames/{name}/{f}" for f in fs]


SITE_T, SITE_F = frames("site")
PANEL_T, PANEL_F = frames("panel")
_cache = {}


def frame_at(ts, fs, t, size):
    i = max(0, bisect.bisect_right(ts, t) - 1)
    key = (fs[i], size)
    if key not in _cache:
        if len(_cache) > 40: _cache.clear()
        _cache[key] = Image.open(fs[i]).convert("RGB").resize(size, Image.LANCZOS)
    return _cache[key]


# ---------- the stage: background, browser window, caption ----------
S = 1.05
SITE_SZ = (round(1280 * S), round(860 * S))
PANEL_SZ = (round(380 * S), round(860 * S))
BAR = 46
WIN_W = SITE_SZ[0] + 2 + PANEL_SZ[0]
WIN_H = BAR + SITE_SZ[1]
WX, WY = (W - WIN_W) // 2, 36


def background():
    g = np.linspace(0, 1, H)[:, None]
    top, bot = np.array([246, 244, 238]), np.array([228, 238, 206])
    arr = (top[None, None, :] * (1 - g[:, :, None]) + bot[None, None, :] * g[:, :, None]).repeat(W, axis=1)
    bg = Image.fromarray(arr.astype(np.uint8))
    # soft shadow under the window
    sh = Image.new("L", (W, H), 0)
    ImageDraw.Draw(sh).rounded_rectangle((WX + 10, WY + 24, WX + WIN_W - 10, WY + WIN_H + 18), 18, fill=110)
    sh = sh.filter(ImageFilter.GaussianBlur(26))
    bg.paste(Image.new("RGB", (W, H), (40, 44, 30)), (0, 0), sh)
    # window chrome
    d = ImageDraw.Draw(bg)
    d.rounded_rectangle((WX, WY, WX + WIN_W, WY + WIN_H), 14, fill=(255, 255, 255))
    d.rounded_rectangle((WX, WY, WX + WIN_W, WY + BAR + 14), 14, fill=(236, 234, 228))
    d.rectangle((WX, WY + BAR, WX + WIN_W, WY + BAR + 14), fill=(255, 255, 255))
    for i, c in enumerate([(237, 106, 94), (245, 191, 79), (98, 197, 84)]):
        d.ellipse((WX + 18 + i * 22, WY + 17, WX + 30 + i * 22, WY + 29), fill=c)
    d.rounded_rectangle((WX + 420, WY + 9, WX + 420 + 520, WY + 37), 14, fill=(255, 255, 255))
    d.text((WX + 440, WY + 13), "fieldnote.app", font=font(500, 17), fill=(90, 88, 82))
    return bg


BG = background()
MASK = Image.new("L", (WIN_W, WIN_H - BAR), 0)
ImageDraw.Draw(MASK).rounded_rectangle((0, -20, WIN_W, WIN_H - BAR), 14, fill=255)
CAP_FONT = font(500, 30)


def caption(img, text):
    if not text: return
    d = ImageDraw.Draw(img)
    tw = d.textlength(text, font=CAP_FONT)
    y = WY + WIN_H + (H - WY - WIN_H) // 2 - 20
    d.text(((W - tw) / 2, y), text, font=CAP_FONT, fill=(29, 28, 25))


def stage(t, text):
    img = BG.copy()
    content = Image.new("RGB", (WIN_W, WIN_H - BAR), (214, 211, 203))
    content.paste(frame_at(SITE_T, SITE_F, t, SITE_SZ), (0, 0))
    content.paste(frame_at(PANEL_T, PANEL_F, t, PANEL_SZ), (SITE_SZ[0] + 2, 0))
    img.paste(content, (WX, WY + BAR), MASK)
    caption(img, text)
    return img


# ---------- title cards ----------
def card(lines_, sub=None):
    img = Image.new("RGB", (W, H), (247, 245, 239))
    d = ImageDraw.Draw(img)
    # logo tile, drawn from the mark's geometry (viewBox 10..54)
    size = 220; x0, y0 = (W - size) // 2, 250
    tile = Image.new("RGBA", (size * 4, size * 4), (0, 0, 0, 0))
    td = ImageDraw.Draw(tile)
    td.rounded_rectangle((0, 0, size * 4 - 1, size * 4 - 1), int(size * 4 * .22), fill=(185, 217, 106, 255))
    k = size * 4 * 0.74 / 44; ox = size * 4 * 0.13 - 10 * k

    def P(x, y): return (ox + x * k, ox + y * k)
    for cx, cy in ((42.61, 21.39), (42.61, 42.61), (21.39, 42.61), (21.39, 21.39)):
        a, b = P(cx - 11, cy - 11), P(cx + 11, cy + 11); td.ellipse((*a, *b), fill=(21, 21, 21, 255))
    a, b = P(32 - 10.5, 32 - 10.5), P(32 + 10.5, 32 + 10.5); td.ellipse((*a, *b), fill=(185, 217, 106, 255))
    pts = [P((1 - u) ** 2 * 27 + 2 * (1 - u) * u * 32 + u * u * 37, (1 - u) ** 2 * 31 + 2 * (1 - u) * u * 37 + u * u * 31) for u in (i / 20 for i in range(21))]  # M27 31 q5 6 10 0
    td.line(pts, fill=(21, 21, 21, 255), width=int(3 * k), joint="curve")
    tile = tile.resize((size, size), Image.LANCZOS)
    img.paste(tile, (x0, y0), tile)
    sys.path.insert(0, "/home/claude/huescribe/tools")
    from wordmark import draw_picked
    wf = font(600, 96)
    probe = ImageDraw.Draw(img)
    tw = probe.textlength("Huescribe", font=wf) + 8 * 96 * 0.05
    draw_picked(img, ((W - tw) / 2, y0 + size + 50), wf, (21, 21, 21))
    if sub:
        sf_ = font(500, 36); sw = d.textlength(sub, font=sf_)
        d.text(((W - sw) / 2, y0 + size + 200), sub, font=sf_, fill=(85, 85, 79))
    return img


# ---------- timeline ----------
scenes = marks["scenes"]
END = marks["end"] - 0.3
INTRO_LEN = dur["intro"] + 1.2
OUTRO_LEN = dur["outro"] + 2.0
segments = []  # (kind, rec_start, length, caption, voice list [(name, offset)])
for i, (name, start) in enumerate(scenes):
    stop = scenes[i + 1][1] if i + 1 < len(scenes) else END
    voices = [(name, 0.25)]
    if name == "button": voices.append(("button2", 4.2))
    segments.append((name, start, stop - start, voices))


def encode(path, gen, n):
    tmp = path[:-4] + ".tmp.mp4"
    p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                          "-c:v", "libx264", "-crf", "18", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-r", str(FPS), tmp], stdin=subprocess.PIPE)
    for i in range(n):
        p.stdin.write(gen(i).tobytes())
    p.stdin.close()
    if p.wait() == 0:
        os.replace(tmp, path)
    else:
        raise SystemExit("ffmpeg failed: " + path)


def caption_for(seg_name, local_t):
    if seg_name == "button" and local_t >= 4.2: return lines["button2"]
    return lines[seg_name]


if len(sys.argv) > 1 and sys.argv[1] == "stills":
    card(["Huescribe"], "Borrow the good parts.").save(f"{HERE}/stills/intro.jpg", quality=90)
    for name, start, length, _ in segments:
        for frac in (0.35, 0.9):
            stage(start + length * frac, caption_for(name, length * frac)).save(f"{HERE}/stills/{name}-{int(frac*100)}.jpg", quality=90)
    print("stills written")
    sys.exit()

intro_img = card(["Huescribe"], "Website design you love, as an AI prompt.")
outro_img = card(["Huescribe"], "Borrow the good parts.")
first_t = segments[0][1]


def fade(a, b, x):
    return Image.blend(a, b, max(0.0, min(1.0, x)))


files = []
# intro: still, then a 0.5 s crossfade into the first recorded frame
n = int(INTRO_LEN * FPS)
first = stage(first_t, lines[segments[0][0]])
encode(f"{HERE}/build/00-intro.mp4", lambda i: fade(intro_img, first, (i - (n - 15)) / 15) if i >= n - 15 else (intro_img if i >= 10 else fade(Image.new("RGB", (W, H), (247, 245, 239)), intro_img, i / 10)), n)
files.append("00-intro.mp4")
for k, (name, start, length, _) in enumerate(segments):
    n = int(round(length * FPS))
    last = k == len(segments) - 1
    def gen(i, name=name, start=start, n=n, last=last):
        lt = i / FPS
        img = stage(start + lt, caption_for(name, lt))
        if last and i >= n - 15: img = fade(img, outro_img, (i - (n - 15)) / 15)
        return img
    encode(f"{HERE}/build/{k+1:02d}-{name}.mp4", gen, n)
    files.append(f"{k+1:02d}-{name}.mp4")
    print("scene", name, round(length, 2))
n = int(OUTRO_LEN * FPS)
encode(f"{HERE}/build/99-outro.mp4", lambda i: outro_img if i < n - 12 else fade(outro_img, Image.new("RGB", (W, H), (247, 245, 239)), (i - (n - 12)) / 12), n)
files.append("99-outro.mp4")

with open(f"{HERE}/build/list.txt", "w") as f:
    for name in files: f.write(f"file '{name}'\n")
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", f"{HERE}/build/list.txt", "-c", "copy", f"{HERE}/build/video.mp4"], check=True)

# ---------- voice track ----------
SR = 24000
total = INTRO_LEN + sum(s[2] for s in segments) + OUTRO_LEN
track = np.zeros(int((total + 1) * SR), dtype=np.float32)


def place(name, at):
    a, sr = sf.read(f"{HERE}/vo-{name}.wav", dtype="float32")
    i = int(at * SR); track[i:i + len(a)] += a[:len(track) - i]


place("intro", 0.6)
t = INTRO_LEN
for name, start, length, voices in segments:
    for v, off in voices: place(v, t + off)
    t += length
place("outro", t + 0.4)
peak = np.abs(track).max() or 1
track = track / peak * 0.89
sf.write(f"{HERE}/build/voice.wav", track, SR)
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", f"{HERE}/build/video.mp4", "-i", f"{HERE}/build/voice.wav", "-map", "0:v", "-map", "1:a",
                "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-shortest", f"{HERE}/huescribe-demo.tmp.mp4"], check=True)
os.replace(f"{HERE}/huescribe-demo.tmp.mp4", f"{HERE}/huescribe-demo.mp4")
print("done", round(total, 1), "s")
