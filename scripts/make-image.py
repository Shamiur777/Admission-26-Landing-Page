"""Make the WebP files the page needs for a course banner or a book cover.

Usage:
  python scripts/make-image.py course <input.jpg> <course-id>
  python scripts/make-image.py book   <input.jpg> <book-id>
Needs:  pip install pillow

course  writes assets/img/courses/<id>-400.webp and -800.webp (square banner;
        images smaller than 800 px wide are upscaled to 800).
book    writes assets/img/books/<id>.webp at 260x372 (centre-cropped to fit).
"""
import re
import sys
from pathlib import Path

from PIL import Image, ImageOps

IMG_DIR = Path(__file__).resolve().parent.parent / "assets" / "img"
COURSE_SIZES = (400, 800)
BOOK_SIZE = (260, 372)


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


def main() -> int:
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
