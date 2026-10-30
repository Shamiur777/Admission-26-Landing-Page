"""Make the WebP files the page needs for a course banner or a book cover.

Usage:
  python scripts/make-image.py course <input.jpg> <course-id>
  python scripts/make-image.py book   <input.jpg> <book-id>
  python scripts/make-image.py og
Needs:  pip install pillow

course  writes assets/img/courses/<id>-400.webp and -800.webp (square banner;
        images smaller than 800 px wide are upscaled to 800).
book    writes assets/img/books/<id>.webp at 260x372 (centre-cropped to fit).
og      redraws assets/img/og-cover.jpg (1200x630) from the coupon code and
        percents in assets/js/config.js. English text only (PIL cannot shape Bangla).
        Needs Impact/Arial Bold (Windows), Arial Black/Arial (macOS) or DejaVu Sans (Linux);
        edit OG_FONTS below to use others.
"""
import re
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

IMG_DIR = Path(__file__).resolve().parent.parent / "assets" / "img"
COURSE_SIZES = (400, 800)
BOOK_SIZE = (260, 372)
CONFIG_JS = Path(__file__).resolve().parent.parent / "assets" / "js" / "config.js"
# Candidate font files per role, tried in order: Windows, macOS, Linux (DejaVu).
OG_FONTS = {
    "display": ["C:/Windows/Fonts/impact.ttf", "/System/Library/Fonts/Supplemental/Impact.ttf",
                "/Library/Fonts/Arial Black.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf"],
    "bold": ["C:/Windows/Fonts/arialbd.ttf", "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
             "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf"],
    "regular": ["C:/Windows/Fonts/arial.ttf", "/System/Library/Fonts/Supplemental/Arial.ttf",
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/dejavu/DejaVuSans.ttf"],
}
GREEN, INK, CREAM, WHITE, GREY = "#01AD01", "#111110", "#F6F1E7", "#FFFFFF", "#4A4741"


def save_course(img: Image.Image, item_id: str) -> None:
    out_dir = IMG_DIR / "courses"
    out_dir.mkdir(parents=True, exist_ok=True)
    for width in COURSE_SIZES:
        height = round(img.height * width / img.width)
        path = out_dir / f"{item_id}-{width}.webp"
        img.resize((width, height), Image.LANCZOS).save(path, "WEBP", quality=80, method=6)
        print(f"{path.name}  {width}x{height}  {path.stat().st_size // 1024} KB")


def save_book(img: Image.Image, item_id: str) -> None:
    out_dir = IMG_DIR / "books"
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f"{item_id}.webp"
    ImageOps.fit(img, BOOK_SIZE, Image.LANCZOS).save(path, "WEBP", quality=82, method=6)
    print(f"{path.name}  {BOOK_SIZE[0]}x{BOOK_SIZE[1]}  {path.stat().st_size // 1024} KB")


def read_offer() -> dict:
    """Pull couponCode and the two percents out of the OFFER object in config.js."""
    text = CONFIG_JS.read_text(encoding="utf-8")
    block = re.search(r"export const OFFER\s*=\s*\{(.*?)\n\};", text, re.S)
    if not block:
        raise SystemExit(f"Could not find 'export const OFFER = {{ ... }};' in {CONFIG_JS}")
    body = block.group(1)
    patterns = {
        "code": r"couponCode:\s*'([^']+)'",
        "courses": r"courses:\s*\{\s*percent:\s*(\d+)",
        "books": r"books:\s*\{\s*percent:\s*(\d+)",
        "up_to": r"books:\s*\{[^}]*upTo:\s*(true|false)",
    }
    found = {}
    for key, pattern in patterns.items():
        m = re.search(pattern, body)
        if not m:
            raise SystemExit(f"Could not read '{key}' from OFFER in {CONFIG_JS}; update read_offer() in this script.")
        found[key] = m.group(1)
    return {
        "code": found["code"],
        "courses": int(found["courses"]),
        "books": int(found["books"]),
        "up_to": found["up_to"] == "true",
    }


def save_og() -> None:
    offer = read_offer()
    paths = {}
    for role, candidates in OG_FONTS.items():
        paths[role] = next((c for c in candidates if Path(c).is_file()), None)
        if paths[role] is None:
            tried = "\n  ".join(candidates)
            sys.exit(f"og: no {role} font found. Tried:\n  {tried}\nInstall one or add a path to OG_FONTS in this script.")
    font = lambda name, size: ImageFont.truetype(paths[name], size)
    img = Image.new("RGB", (1200, 630), INK)
    d = ImageDraw.Draw(img)

    # Brand pill
    d.rounded_rectangle((60, 50, 860, 113), radius=32, fill=WHITE)
    x = 90
    for text, color, name in (("Edge Course", INK, "bold"), (" x ", GREY, "regular"), ("Hulkenstein", INK, "bold"),
                              (" x ", GREY, "regular"), ("QNA Publication", INK, "bold")):
        d.text((x, 81), text, font=font(name, 34), fill=color, anchor="lm")
        x += d.textlength(text, font=font(name, 34))

    d.text((58, 282), "Admission 2026", font=font("display", 130), fill=CREAM, anchor="ls")

    # Coupon ticket with a perforated divider and two notches
    d.rounded_rectangle((60, 360, 1140, 570), radius=28, fill=GREEN)
    d.text((100, 402), "COUPON CODE", font=font("bold", 26), fill=INK, anchor="lm")
    d.text((100, 530), offer["code"], font=font("display", 96), fill=INK, anchor="ls")
    for y in range(378, 552, 14):
        d.line((700, y, 700, y + 8), fill=INK, width=3)
    d.ellipse((680, 340, 720, 380), fill=INK)
    d.ellipse((680, 550, 720, 590), fill=INK)
    d.text((750, 458), f"{offer['courses']}% OFF", font=font("display", 70), fill=INK, anchor="ls")
    d.text((752, 490), "courses", font=font("bold", 28), fill=INK, anchor="lm")
    books = f"{'up to ' if offer['up_to'] else ''}{offer['books']}% off books"
    d.text((752, 523), books, font=font("bold", 28), fill=INK, anchor="lm")

    path = IMG_DIR / "og-cover.jpg"
    img.save(path, "JPEG", quality=88, optimize=True)
    print(f"{path.name}  1200x630  {path.stat().st_size // 1024} KB  ({offer['code']}, {offer['courses']}%, {offer['books']}%)")


def main() -> int:
    if len(sys.argv) == 2 and sys.argv[1] == "og":
        save_og()
        return 0
    if len(sys.argv) != 4 or sys.argv[1] not in ("course", "book"):
        print(__doc__)
        return 1
    kind, src, item_id = sys.argv[1], Path(sys.argv[2]), sys.argv[3]
    if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", item_id):
        print("id must be lowercase letters, digits and hyphens, e.g. du-a-unit-written")
        return 1
    if not src.is_file():
        print(f"Input not found: {src}")
        return 1
    img = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
    (save_course if kind == "course" else save_book)(img, item_id)
    return 0


if __name__ == "__main__":
    sys.exit(main())
