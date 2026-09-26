#!/usr/bin/env python3
"""Generate Hunger Swipes app-icon asset set from public/logo-full.png.

Usage:
    cd ~/Documents/hunger-swipes
    python3 scripts/generate-icons.py
"""

from __future__ import annotations

import io
import shutil
import struct
from pathlib import Path
from typing import Tuple

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public" / "logo-full.png"
OUT_DIR = ROOT / "public"

# Match the PWA manifest background/theme color.
BG = (10, 10, 10, 255)

# How much of the target square the logo content should occupy.
# Normal icons: aggressive fill so the logo dominates the tile (~94%).
# Maskable icon: leave extra safe-zone margin for Android adaptive masking (~76%).
FILL_NORMAL = 0.94
FILL_MASKABLE = 0.76

SIZES = {
    "icon-192": 192,
    "icon-512": 512,
    "icon-1024": 1024,
}


def content_bbox(img: Image.Image, alpha_threshold: int = 10) -> Tuple[int, int, int, int] | None:
    """Return bounding box of non-transparent pixels."""
    alpha = img.split()[-1]
    return alpha.getbbox()


def render_icon(
    src: Image.Image,
    size: int,
    fill_ratio: float,
    bg: Tuple[int, int, int, int],
) -> Image.Image:
    """Render the source logo centered on a square icon at the given size."""
    target = Image.new("RGBA", (size, size), bg)

    bbox = content_bbox(src)
    content = src.crop(bbox) if bbox else src

    cw, ch = content.size
    # Scale so the larger content dimension fills `fill_ratio` of the target.
    scale = (size * fill_ratio) / max(cw, ch)
    new_w = max(1, int(round(cw * scale)))
    new_h = max(1, int(round(ch * scale)))

    resized = content.resize((new_w, new_h), Image.Resampling.LANCZOS)
    x = (size - new_w) // 2
    y = (size - new_h) // 2
    target.paste(resized, (x, y), resized)
    return target


def save_png(img: Image.Image, path: Path) -> None:
    img.save(path, "PNG", optimize=True)


def save_ico(path: Path, images: list[Image.Image]) -> None:
    """Save a multi-resolution ICO file manually.

    PIL's built-in ICO append_images path does not reliably emit multiple
    icon directory entries on every version, so we construct the container
    ourselves: directory entries point to independent PNG blobs.
    """
    png_blobs: list[bytes] = []
    for img in images:
        bio = io.BytesIO()
        img.convert("RGBA").save(bio, "PNG")
        png_blobs.append(bio.getvalue())

    count = len(images)
    header = struct.pack("<HHH", 0, 1, count)
    directory = bytearray()
    offset = 6 + 16 * count
    for img, blob in zip(images, png_blobs):
        size = img.width
        # ICO uses 0 to mean 256; our sizes are all <= 48 here.
        w_byte = size if size < 256 else 0
        h_byte = size if size < 256 else 0
        directory += struct.pack(
            "<BBBBHHII",
            w_byte,  # Width
            h_byte,  # Height
            0,       # Colors (0 = >256)
            0,       # Reserved
            1,       # Color planes
            32,      # Bits per pixel
            len(blob),
            offset,
        )
        offset += len(blob)

    with open(path, "wb") as f:
        f.write(header)
        f.write(directory)
        for blob in png_blobs:
            f.write(blob)


def main() -> None:
    if not SRC.exists():
        raise FileNotFoundError(f"Source artwork not found: {SRC}")

    src = Image.open(SRC).convert("RGBA")

    # Generate normal icon PNGs.
    for name, size in SIZES.items():
        out_path = OUT_DIR / f"{name}.png"
        icon = render_icon(src, size, FILL_NORMAL, BG)
        save_png(icon, out_path)
        print(f"generated {out_path} ({size}x{size})")

    # Apple touch icon is a normal icon at 180x180.
    apple = render_icon(src, 180, FILL_NORMAL, BG)
    apple_path = OUT_DIR / "apple-touch-icon.png"
    save_png(apple, apple_path)
    print(f"generated {apple_path} (180x180)")

    # Maskable icon at 512x512 with safe-zone padding.
    maskable = render_icon(src, 512, FILL_MASKABLE, BG)
    maskable_path = OUT_DIR / "icon-maskable.png"
    save_png(maskable, maskable_path)
    print(f"generated {maskable_path} (512x512 maskable)")

    # Small favicon PNGs referenced in layout metadata.
    favicon16 = render_icon(src, 16, FILL_NORMAL, BG)
    favicon32 = render_icon(src, 32, FILL_NORMAL, BG)
    save_png(favicon16, OUT_DIR / "favicon-16x16.png")
    save_png(favicon32, OUT_DIR / "favicon-32x32.png")
    print("generated favicon-16x16.png and favicon-32x32.png")

    # Multi-resolution favicon.ico (16, 32, 48).
    favicon_sizes = [16, 32, 48]
    favicon_images = [render_icon(src, s, FILL_NORMAL, BG) for s in favicon_sizes]
    ico_path = OUT_DIR / "favicon.ico"
    save_ico(ico_path, favicon_images)
    print(f"generated {ico_path} ({', '.join(f'{s}x{s}' for s in favicon_sizes)})")

    # Also refresh the legacy /shortcut favicon.png so it is not a huge old file.
    shortcut = render_icon(src, 512, FILL_NORMAL, BG)
    save_png(shortcut, OUT_DIR / "favicon.png")
    print(f"generated {OUT_DIR / 'favicon.png'} (512x512)")


if __name__ == "__main__":
    main()
