#!/usr/bin/env python3
"""
Generate Hunger Swipes app-icon package from the approved square logo.
Source: public/logo.png
Outputs to public/.
"""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
SOURCE = PUBLIC / "logo.png"
VERSION = "v2-20260914"

BG = (10, 10, 10)  # #0A0A0A Hunger dark background

def make_square_icon(src: Image.Image, size: int, padding_ratio=0.08, maskable=False):
    out = Image.new("RGBA", (size, size), BG + (255,))
    margin = int(size * 0.36) if maskable else int(size * padding_ratio)
    box = size - 2 * margin
    if box <= 0:
        box = size
        margin = 0
    src_ratio = src.width / src.height
    if src_ratio >= 1:
        new_w = box
        new_h = int(box / src_ratio)
    else:
        new_h = box
        new_w = int(box * src_ratio)
    thumb = src.resize((new_w, new_h), Image.Resampling.LANCZOS)
    x = (size - new_w) // 2
    y = (size - new_h) // 2
    out.paste(thumb, (x, y), thumb if thumb.mode == "RGBA" else None)
    return out

def main():
    if not SOURCE.exists():
        raise FileNotFoundError(f"Approved logo missing: {SOURCE}")
    src = Image.open(SOURCE).convert("RGBA")

    # Clean old versioned files
    for old in PUBLIC.glob("*hunger-swipes-icon-master-v2-*.png"):
        old.unlink()

    save_png(make_square_icon(src, 1024, 0.06), PUBLIC / f"hunger-swipes-icon-master-{VERSION}.png")
    save_png(make_square_icon(src, 180, 0.08), PUBLIC / "apple-touch-icon.png")
    save_png(make_square_icon(src, 192, 0.08), PUBLIC / "icon-192.png")
    save_png(make_square_icon(src, 512, 0.08), PUBLIC / "icon-512.png")
    save_png(make_square_icon(src, 512, 0.0, maskable=True), PUBLIC / "icon-maskable.png")
    save_png(make_square_icon(src, 32, 0.08), PUBLIC / "favicon-32x32.png")
    save_png(make_square_icon(src, 16, 0.08), PUBLIC / "favicon-16x16.png")

    # SVG fallback
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0A0A0A"/>
  <image href="/icon-512.png?v={VERSION}" width="512" height="512"/>
</svg>'''
    (PUBLIC / "icon.svg").write_text(svg)

    # Favicon ICO (high-res single -> pyramid)
    ico = make_square_icon(src, 256, 0.08)
    ico.save(PUBLIC / "favicon.ico", "ICO", optimize=True)

    # Update manifest
    manifest_path = PUBLIC / "manifest.webmanifest"
    manifest = json.loads(manifest_path.read_text())
    manifest.update({
        "name": "Hunger Swipes",
        "short_name": "HungerSwipes",
        "description": "Swipe to discover food near you.",
        "start_url": "/",
        "display": "standalone",
        "background_color": "#0A0A0A",
        "theme_color": "#FF6A00",
        "orientation": "portrait-primary",
        "scope": "/",
        "icons": [
            {"src": f"/icon-192.png?v={VERSION}", "sizes": "192x192", "type": "image/png", "purpose": "any"},
            {"src": f"/icon-512.png?v={VERSION}", "sizes": "512x512", "type": "image/png", "purpose": "any"},
            {"src": f"/icon-maskable.png?v={VERSION}", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
            {"src": f"/hunger-swipes-icon-master-{VERSION}.png", "sizes": "1024x1024", "type": "image/png", "purpose": "any"},
        ],
        "categories": ["food", "lifestyle", "social"],
        "prefer_related_applications": False,
    })
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")

    print("Hunger Swipes icon package generated.")
    for p in sorted([
        PUBLIC / "apple-touch-icon.png",
        PUBLIC / "icon-192.png",
        PUBLIC / "icon-512.png",
        PUBLIC / "icon-maskable.png",
        PUBLIC / "favicon-32x32.png",
        PUBLIC / "favicon-16x16.png",
        PUBLIC / "favicon.ico",
    ]):
        print(f"  {p.name}: {p.stat().st_size} bytes")

def save_png(img: Image.Image, path: Path):
    img.save(path, "PNG", optimize=True)

if __name__ == "__main__":
    main()
