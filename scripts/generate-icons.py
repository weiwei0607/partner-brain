#!/usr/bin/env python3
"""Generate PNG app icons from the public/icon.svg design using Pillow."""

import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "public")

# Rose gradient colors from icon.svg
COLOR_START = (0xF4, 0x3F, 0x5E)  # #F43F5E
COLOR_END = (0xE1, 0x1D, 0x48)    # #E11D48

# Try to load an emoji font; fall back to a plain text label if unavailable.
EMOJI_FONT_PATH = "/System/Library/Fonts/Apple Color Emoji.ttc"
TEXT_LABEL = "PB"
TEXT_FONT_PATHS = [
    "/System/Library/Fonts/Helvetica.ttc",
    "/System/Library/Fonts/HelveticaNeue.ttc",
    "/Library/Fonts/Arial.ttf",
]


def rounded_rect_mask(size, radius):
    """Return an alpha mask with rounded corners."""
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size[0], size[1]), radius=radius, fill=255)
    return mask


def make_gradient(size, start, end):
    """Create a top-left to bottom-right linear gradient image."""
    width, height = size
    gradient = Image.new("RGB", size)
    for y in range(height):
        for x in range(width):
            ratio = (x + y) / (width + height)
            r = int(start[0] * (1 - ratio) + end[0] * ratio)
            g = int(start[1] * (1 - ratio) + end[1] * ratio)
            b = int(start[2] * (1 - ratio) + end[2] * ratio)
            gradient.putpixel((x, y), (r, g, b))
    return gradient


def load_emoji_font(size):
    if not os.path.exists(EMOJI_FONT_PATH):
        return None
    # Apple Color Emoji only accepts certain pixel sizes; try the target and
    # a few nearby sizes before giving up.
    for attempt in (size, size - 1, size - 2, int(size * 0.9), int(size * 0.8),
                    int(size * 0.7), int(size * 0.6)):
        if attempt < 8:
            continue
        try:
            return ImageFont.truetype(EMOJI_FONT_PATH, attempt)
        except Exception:
            continue
    return None


def load_text_font(size):
    for path in TEXT_FONT_PATHS:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()


def generate_icon(size):
    radius = int(96 * (size / 512))  # scale corner radius like SVG

    # Gradient background
    img = make_gradient((size, size), COLOR_START, COLOR_END)

    # Apply rounded corners
    mask = rounded_rect_mask((size, size), radius)
    rgba = Image.new("RGBA", (size, size))
    rgba.paste(img, (0, 0))
    rgba.putalpha(mask)

    draw = ImageDraw.Draw(rgba)

    # Try emoji first, then fall back to "PB" text
    emoji_size = int(size * 0.55)
    font = load_emoji_font(emoji_size)
    label = "🧠"
    if font is None:
        font = load_text_font(int(size * 0.45))
        label = TEXT_LABEL

    # Center the symbol
    draw.text((size // 2, size // 2), label, font=font, anchor="mm", fill="white")
    return rgba


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for dim in (192, 512):
        icon = generate_icon(dim)
        out_path = os.path.join(OUT_DIR, f"icon-{dim}.png")
        icon.save(out_path, "PNG")
        print(f"Generated {out_path}")


if __name__ == "__main__":
    main()
