import os
from pathlib import Path

try:
    from PIL import Image
except Exception as e:
    print(f"PIL_IMPORT_FAILED: {e}")
    raise


ROOT = Path(__file__).resolve().parents[1]
TARGET_DIR = ROOT / "images"
MAX_SIZE = 200 * 1024
MAX_WIDTH = 640


def compress_png(path: Path):
    before = path.stat().st_size
    if before <= MAX_SIZE:
        return None

    img = Image.open(path).convert("RGBA")
    w, h = img.size
    if w > MAX_WIDTH:
        nh = int(h * MAX_WIDTH / w)
        img = img.resize((MAX_WIDTH, nh), Image.LANCZOS)

    # First pass: palette reduce
    pal = img.convert("P", palette=Image.ADAPTIVE, colors=128)
    pal.save(path, format="PNG", optimize=True)
    after = path.stat().st_size

    if after > MAX_SIZE:
        # Second pass: stronger color reduction
        pal2 = img.convert("P", palette=Image.ADAPTIVE, colors=64)
        pal2.save(path, format="PNG", optimize=True)
        after = path.stat().st_size

    return before, after


def main():
    results = []
    for p in TARGET_DIR.rglob("*.png"):
        out = compress_png(p)
        if out:
            results.append((p, out[0], out[1]))

    print(f"compressed_files: {len(results)}")
    for p, b, a in results:
        print(f"{p.as_posix()}\t{b}\t{a}")


if __name__ == "__main__":
    main()
