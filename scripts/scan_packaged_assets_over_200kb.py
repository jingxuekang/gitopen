import json
import os
import re
from dataclasses import dataclass


ASSET_EXTS = {
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".gif",
    ".bmp",
    ".svg",
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


@dataclass(frozen=True)
class IgnoreRule:
    type: str  # "file" | "folder" | "suffix"
    value: str


def norm(p: str) -> str:
    return p.replace("\\", "/").strip("/")


def load_project_config(repo_root: str) -> tuple[list[IgnoreRule], list[IgnoreRule]]:
    cfg_path = os.path.join(repo_root, "project.config.json")
    with open(cfg_path, "r", encoding="utf-8") as f:
        cfg = json.load(f)
    ignores = cfg.get("packOptions", {}).get("ignore", []) or []
    includes = cfg.get("packOptions", {}).get("include", []) or []

    def to_rules(arr) -> list[IgnoreRule]:
        rules: list[IgnoreRule] = []
        for item in arr:
            if not isinstance(item, dict):
                continue
            t = str(item.get("type") or "").strip()
            v = str(item.get("value") or "").strip()
            if not t or not v:
                continue
            rules.append(IgnoreRule(type=t, value=v))
        return rules

    return to_rules(ignores), to_rules(includes)


def should_ignore(rel_path: str, rules: list[IgnoreRule]) -> bool:
    rel = norm(rel_path)
    for r in rules:
        if r.type == "suffix":
            if rel.lower().endswith(r.value.lower()):
                return True
        elif r.type == "file":
            if rel.lower() == norm(r.value).lower():
                return True
        elif r.type == "folder":
            folder = norm(r.value).lower()
            if rel.lower() == folder or rel.lower().startswith(folder + "/"):
                return True
    return False


def is_included(rel_path: str, include_rules: list[IgnoreRule]) -> bool:
    # include 规则格式和 ignore 类似；这里做最简单匹配：命中则强制包含
    return should_ignore(rel_path, include_rules)


def main() -> None:
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    ignore_rules, include_rules = load_project_config(repo_root)

    limit = 200 * 1024
    rows: list[tuple[int, str]] = []

    skip_dirs = {".git", "node_modules", "dist", "build"}
    for dirpath, dirnames, filenames in os.walk(repo_root):
        dirnames[:] = [d for d in dirnames if d not in skip_dirs]
        for fn in filenames:
            abs_path = os.path.join(dirpath, fn)
            rel_path = os.path.relpath(abs_path, repo_root)
            rel_norm = norm(rel_path)

            # packOptions.ignore 生效，packOptions.include 可反选回来
            if should_ignore(rel_norm, ignore_rules) and not is_included(rel_norm, include_rules):
                continue

            ext = os.path.splitext(fn)[1].lower()
            if ext not in ASSET_EXTS:
                continue

            try:
                sz = os.path.getsize(abs_path)
            except OSError:
                continue
            if sz > limit:
                rows.append((sz, rel_norm))

    rows.sort(reverse=True)
    print(f"packaged assets >200KB: {len(rows)}")
    for sz, rel in rows[:200]:
        print(f"{sz/1024:8.1f} KB  {rel}")


if __name__ == "__main__":
    main()

