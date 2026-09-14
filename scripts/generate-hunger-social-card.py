#!/usr/bin/env python3
"""
Generate Hunger Swipes social preview card (1200x630) using approved square logo.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
SOURCE = PUBLIC / "logo.png"
OUT = PUBLIC / "og-image.png"

BG = (10, 10, 10)
ACCENT = (255, 106, 0)  # #FF6A00 Hunger orange

def get_font(size):
    candidates = [
        "/System/Library/Fonts/SFProDisplay-Bold.otf",
        "/System/Library/Fonts/HelveticaNeue.ttc",
        "/Library/Fonts/Arial.ttf",
    ]
    for c in candidates:
        try:
            return ImageFont.truetype(c, size)
        except Exception:
            pass
    return ImageFont.load_default()

def main():
    src = Image.open(SOURCE).convert("RGBA")
    canvas = Image.new("RGBA", (1200, 630), BG + (255,))

    # Place approved icon on left
    icon_size = 340
    icon = src.resize((icon_size, icon_size), Image.Resampling.LANCZOS)
    icon_x = 130
    icon_y = (630 - icon_size) // 2
    canvas.paste(icon, (icon_x, icon_y), icon if icon.mode == "RGBA" else None)

    # Text
    title_font = get_font(68)
    tag_font = get_font(28)
    url_font = get_font(22)

    text_x = icon_x + icon_size + 80
    text_y = 630 // 2 - 80

    draw = ImageDraw.Draw(canvas)
    draw.text((text_x, text_y), "Hunger Swipes", font=title_font, fill=(255, 255, 255, 255))
    draw.text((text_x, text_y + 95), "Swipe Food. Find Your Next Meal.", font=tag_font, fill=(200, 200, 200, 255))

    # URL
    bbox = draw.textbbox((0, 0), "hunger-swipes-theta.vercel.app", font=url_font)
    url_w = bbox[2] - bbox[0]
    draw.text(((1200 - url_w) // 2, 565), "hunger-swipes-theta.vercel.app", font=url_font, fill=ACCENT + (255,))

    canvas.save(OUT, "PNG", optimize=True)
    print(f"Social card saved: {OUT} ({OUT.stat().st_size} bytes)")

if __name__ == "__main__":
    main()
