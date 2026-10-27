"""Generate launcher icons (SA-flag colors: navy, gold, green) into res/mipmap-*.

Usage: python make_icon.py
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
RES = HERE / "res"

NAVY = (13, 27, 42, 255)
GOLD = (255, 199, 44, 255)
GREEN = (22, 130, 74, 255)
WHITE = (255, 255, 255, 255)

SIZES = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}


def load_font(size):
    for name in ("arialbd.ttf", "segoeuib.ttf", "tahoma.ttf"):
        try:
            return ImageFont.truetype(f"C:/Windows/Fonts/{name}", size)
        except OSError:
            continue
    return ImageFont.load_default()


def make(size):
    ss = 4  # supersample then downscale for smooth edges
    S = size * ss
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, S - 1, S - 1], radius=S // 5, fill=NAVY)
    # flag-inspired green ribbon across the lower third
    d.polygon([(0, int(S * 0.72)), (S, int(S * 0.60)), (S, int(S * 0.72)), (0, int(S * 0.84))], fill=GREEN)
    # big gold A
    f = load_font(int(S * 0.62))
    bbox = d.textbbox((0, 0), "A", font=f)
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text(((S - w) / 2 - bbox[0], (S - h) / 2 - bbox[1] - S * 0.04), "A", font=f, fill=GOLD)
    return img.resize((size, size), Image.LANCZOS)


for dpi, size in SIZES.items():
    out = RES / f"mipmap-{dpi}"
    out.mkdir(parents=True, exist_ok=True)
    make(size).save(out / "ic_launcher.png")
    print(f"res/mipmap-{dpi}/ic_launcher.png ({size}x{size})")
