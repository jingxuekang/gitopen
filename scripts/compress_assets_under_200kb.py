import os
from dataclasses import dataclass

from PIL import Image


@dataclass(frozen=True)
class Target:
    rel_path: str
    max_kb: int = 200


TARGETS = [
    Target(r"images\\logo-brand.png.png", 200),
    Target(r"miniprogram\\images\\icons\\image-error.png", 200),
    Target(r"miniprogram\\images\\error-icon.png", 200),
    Target(r"miniprogram\\images\\empty\\product.png", 200),
]


def file_kb(path: str) -> float:
    return os.path.getsize(path) / 1024.0


def quantize_image(img: Image.Image, colors: int) -> Image.Image:
    rgba = img.convert("RGBA")
    # FASTOCTREE supports RGBA reasonably well for UI assets.
    return rgba.quantize(colors=colors, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)


def optimize_png(path: str, max_kb: int) -> None:
    before = file_kb(path)
    with Image.open(path) as img:
        img.load()
        # Try a few progressively more aggressive strategies.
        candidates: list[tuple[str, Image.Image]] = []

        # Lossless-ish optimize (may not help much on already-optimized PNGs).
        candidates.append(("as-is", img))

        # Quantize to reduce size; common for icons / placeholders.
        candidates.append(("q256", quantize_image(img, 256)))
        candidates.append(("q128", quantize_image(img, 128)))
        candidates.append(("q64", quantize_image(img, 64)))

        best_bytes = None
        best_variant = None

        for tag, cand in candidates:
            tmp = path + f".__tmp_{tag}.png"
            try:
                cand.save(tmp, format="PNG", optimize=True, compress_level=9)
                size = os.path.getsize(tmp)
                if best_bytes is None or size < best_bytes:
                    best_bytes = size
                    best_variant = tmp
                # early exit if already under limit
                if size <= max_kb * 1024:
                    break
            finally:
                # keep tmp for now; we'll delete non-best after selection
                pass

        if best_variant is None:
            return

        # Replace original only if smaller.
        after = os.path.getsize(best_variant) / 1024.0
        if after < before:
            os.replace(best_variant, path)
        else:
            os.remove(best_variant)

        # Cleanup remaining tmps
        for tag, _ in candidates:
            tmp = path + f".__tmp_{tag}.png"
            if os.path.exists(tmp):
                try:
                    os.remove(tmp)
                except OSError:
                    pass

    final = file_kb(path)
    status = "OK" if final <= max_kb else "TOO_LARGE"
    print(f"{status:9} {before:8.1f}KB -> {final:8.1f}KB  {path}")


def main() -> None:
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    for t in TARGETS:
        p = os.path.join(repo_root, t.rel_path)
        if not os.path.exists(p):
            print(f"SKIP      missing  {t.rel_path}")
            continue
        optimize_png(p, t.max_kb)


if __name__ == "__main__":
    main()

