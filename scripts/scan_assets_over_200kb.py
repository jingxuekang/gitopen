import os


def main() -> None:
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    exts = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".mp3", ".wav", ".aac", ".m4a"}
    limit = 200 * 1024

    rows: list[tuple[int, str]] = []
    for dirpath, dirnames, filenames in os.walk(root):
        # skip common heavy dirs
        for skip in ("node_modules", ".git", "dist", "build"):
            if skip in dirnames:
                dirnames.remove(skip)
        for fn in filenames:
            ext = os.path.splitext(fn)[1].lower()
            if ext not in exts:
                continue
            p = os.path.join(dirpath, fn)
            try:
                sz = os.path.getsize(p)
            except OSError:
                continue
            if sz > limit:
                rows.append((sz, p))

    rows.sort(reverse=True)
    print(f">200KB assets: {len(rows)}")
    for sz, p in rows:
        kb = round(sz / 1024, 1)
        rel = os.path.relpath(p, root)
        print(f"{kb:8.1f} KB  {rel}")


if __name__ == "__main__":
    main()

