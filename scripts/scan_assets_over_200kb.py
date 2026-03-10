import os


def main() -> None:
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

    # 微信开发者工具“图片和音频资源”检查会覆盖较多格式，这里尽量涵盖常见后缀。
    exts = {
        ".png",
        ".jpg",
        ".jpeg",
        ".webp",
        ".gif",
        ".bmp",
        ".svg",
        ".ico",
        ".mp3",
        ".wav",
        ".aac",
        ".m4a",
        ".ogg",
        ".flac",
        ".mp4",
        ".webm",
        ".mov",
    }
    limit = 200 * 1024

    def scan(root: str) -> list[tuple[int, str]]:
        rows: list[tuple[int, str]] = []
        for dirpath, dirnames, filenames in os.walk(root):
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
        return rows

    targets = [
        ("repo", repo_root),
        ("miniprogram", os.path.join(repo_root, "miniprogram")),
        ("root-images", os.path.join(repo_root, "images")),
    ]

    all_rows: list[tuple[int, str]] = []
    for label, root in targets:
        if not os.path.exists(root):
            continue
        rows = scan(root)
        print(f"[{label}] >200KB assets: {len(rows)}")
        for sz, p in rows[:200]:
            kb = round(sz / 1024, 1)
            rel = os.path.relpath(p, repo_root)
            print(f"{kb:8.1f} KB  {rel}")
        all_rows.extend(rows)

    if not all_rows:
        return


if __name__ == "__main__":
    main()

