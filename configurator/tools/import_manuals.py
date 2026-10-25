#!/usr/bin/env python3
"""把参考工程的手册分页图导入当前配置台。

只复制配置台「指南」页实际用到的页面，不做全量拷贝：
1. 按 PAGES 清单，在源目录 <doc>/ 下优先查找 page-{n}.jpg，再查找 page-{n:02d}.jpg；
2. 统一复制为目标目录 <doc>/page-{n:02d}.jpg（两位数字补零）；
3. 源文件缺失时显式打印，不静默跳过；
4. 目标已存在且 mtime 不早于源文件时跳过，保证可重复运行。

用法：
- python tools/import_manuals.py
"""

from __future__ import annotations

import shutil
from pathlib import Path

HERE = Path(__file__).resolve()
ROOT = HERE.parents[2]
REF = (
    ROOT
    / "VAULT模块化收纳指南（带三维图配色功能）"
    / "VAULT模块化收纳指南（带三维图配色功能）"
    / "system"
)
MANUAL_SRC = REF / "assets" / "manuals"
MANUAL_DST = ROOT / "configurator" / "assets" / "manuals"

PAGES: dict[str, list[int]] = {
    "01": [17, 18],
    "02": [1, 2, 3, 4, 5, 6, 7, 8],
    "03": [1, 2, 3, 4, 5, 6, 7],
    "04": [3, 6, 13, 14, 17],
    "05": [3, 6, 11],
}


def find_source(doc_dir: Path, page: int) -> Path | None:
    """按命名差异依次尝试 page-{n}.jpg 与 page-{n:02d}.jpg。"""
    for name in (f"page-{page}.jpg", f"page-{page:02d}.jpg"):
        candidate = doc_dir / name
        if candidate.is_file():
            return candidate
    return None


def main() -> None:
    if not MANUAL_SRC.exists():
        raise SystemExit(f"找不到手册源目录：{MANUAL_SRC}")

    copied = 0
    skipped = 0
    missing: list[str] = []

    for doc, pages in PAGES.items():
        src_dir = MANUAL_SRC / doc
        dst_dir = MANUAL_DST / doc
        dst_dir.mkdir(parents=True, exist_ok=True)

        for page in pages:
            source = find_source(src_dir, page)
            if source is None:
                missing.append(f"{doc}/page-{page}.jpg 或 {doc}/page-{page:02d}.jpg")
                print(f"缺失源文件：{src_dir / f'page-{page}.jpg'}（也尝试了 page-{page:02d}.jpg）")
                continue

            target = dst_dir / f"page-{page:02d}.jpg"
            if target.exists() and target.stat().st_mtime >= source.stat().st_mtime:
                skipped += 1
                continue

            shutil.copy2(source, target)
            copied += 1

    print(f"copied  = {copied}")
    print(f"skipped = {skipped}")
    print(f"missing = {len(missing)}")
    if missing:
        print("缺失项：")
        for item in missing:
            print("  -", item)
    print(f"destination = {MANUAL_DST}")

    if missing:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
