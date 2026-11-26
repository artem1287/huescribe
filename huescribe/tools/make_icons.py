"""Draw the Huescribe icon (logo 03 "four petals"): a black four-petal mark with a smiling
center on a rounded tile in the brand green #B9D96A (readable on light and dark toolbars).
Writes icons/icon{16,32,48,128}.png and store/icon-store-128.png via rsvg-convert."""
import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parent.parent

# The mark is drawn on a 64x64 grid (same geometry as logo/mono/mark-3-black.svg).
MARK = (
    '<defs><mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">'
    '<rect width="64" height="64" fill="#fff"/><circle cx="32" cy="32" r="10.5" fill="#000"/></mask></defs>'
    '<g fill="#151515" mask="url(#m)"><circle cx="42.61" cy="21.39" r="11"/><circle cx="42.61" cy="42.61" r="11"/>'
    '<circle cx="21.39" cy="42.61" r="11"/><circle cx="21.39" cy="21.39" r="11"/></g>'
    '<path d="M27 31q5 6 10 0" fill="none" stroke="#151515" stroke-width="3" stroke-linecap="round"/>'
)


def tile_svg(pad=0.0):
    """Tile filling the canvas minus `pad` (fraction of 64) on each side; the mark sits inside."""
    p = 64 * pad
    s = 64 - 2 * p
    # Mark bounding box is ~10..54 on the 64 grid; scale it to ~80% of the tile.
    k = s * 0.8 / 44
    off = p + (s - 44 * k) / 2 - 10 * k
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'
        f'<rect x="{p}" y="{p}" width="{s}" height="{s}" rx="{s * .22}" fill="#b9d96a"/>'
        f'<g transform="translate({off} {off}) scale({k})">{MARK}</g></svg>'
    )


def render(svg, size, out):
    out = pathlib.Path(out)
    out.parent.mkdir(parents=True, exist_ok=True)
    src = out.with_suffix('.svg')
    src.write_text(svg)
    subprocess.run(['rsvg-convert', '-w', str(size), '-h', str(size), str(src), '-o', str(out)], check=True)
    src.unlink()


if __name__ == '__main__':
    for n in (16, 32, 48, 128):
        render(tile_svg(0.0 if n < 48 else 0.03), n, ROOT / 'icons' / f'icon{n}.png')
    # Chrome Web Store: 128x128 with the artwork in the central 96x96 (16px clear padding).
    render(tile_svg(0.125), 128, ROOT.parent / 'store' / 'icon-store-128.png')
    (ROOT / 'icons' / 'icon.svg').write_text(tile_svg(0.0))
