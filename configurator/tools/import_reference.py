#!/usr/bin/env python3
"""把参考工程的模型编号与缩略图导入当前配置台。

只做两件事：
1. 读取参考工程 assets/models.json，用 originalPath 与当前 manifest 的 STL 路径对齐，
   生成 configurator/data/vault-3d.js（path -> 参考工程模型编号）；
   同时输出未匹配清单与导入报告。
2. 把 assets/previews/*.webp 复制到 configurator/assets/previews/。

不复制 vmesh / 网格 JS / 手册分页图。

用法：
- python tools/import_reference.py           常规重扫，新增 STL 无缩略图时仅告警
- python tools/import_reference.py --strict  覆盖率低于 99% 时以非零退出码失败

输出文件：
- configurator/data/vault-3d.js                 映射
- configurator/data/vault-3d.missing.txt        未匹配路径（一行一个，已排序；无未匹配时删除旧文件）
- configurator/data/vault-3d.report.txt         统计摘要 + 缺失缩略图清单
"""

from __future__ import annotations

import json
import re
import shutil
import sys
from pathlib import Path

HERE = Path(__file__).resolve()
ROOT = HERE.parents[2]
REF = (
    ROOT
    / "VAULT模块化收纳指南（带三维图配色功能）"
    / "VAULT模块化收纳指南（带三维图配色功能）"
    / "system"
)
MANIFEST = ROOT / "configurator" / "data" / "vault-manifest.js"
OUT = ROOT / "configurator" / "data" / "vault-3d.js"
MISSING_OUT = ROOT / "configurator" / "data" / "vault-3d.missing.txt"
REPORT_OUT = ROOT / "configurator" / "data" / "vault-3d.report.txt"
PREVIEW_SRC = REF / "assets" / "previews"
PREVIEW_DST = ROOT / "configurator" / "assets" / "previews"

MIN_COVERAGE = 99.0


def read_manifest_files() -> list[dict]:
    text = MANIFEST.read_text(encoding="utf-8")
    match = re.search(r"window\.VAULT_DATA\s*=\s*(\{.*\});?\s*$", text, re.S)
    if not match:
        raise SystemExit("无法解析 vault-manifest.js：找不到 window.VAULT_DATA")
    return json.loads(match.group(1)).get("files", [])


def norm(path: str) -> str:
    return path.replace("\\", "/").strip().lower()


def norm_name(name: str) -> str:
    """把文件名归一化成可比较的键，兼容改名与单复数差异。

    例如：
    - x3 Runner Guides.stl   -> x3 runner guide
    - x3 Runner Guide.stl    -> x3 runner guide
    - XL3 Runner Guides.stl  -> xl3 runner guide
    - x3 Runner Guide XL.stl -> xl3 runner guide
    """
    stem = Path(name).stem.lower()
    stem = re.sub(r"\s*\((?:turn on supports?)\)\s*", " ", stem)
    stem = re.sub(r"[^0-9a-z\u00b2]+", " ", stem)
    tokens = [{"guides": "guide", "slides": "slide"}.get(t, t) for t in stem.split()]

    variant = ""
    numbers: list[str] = []
    rest: list[str] = []
    for token in tokens:
        m = re.fullmatch(r"xl(\d)", token)
        if m:
            variant = "xl"
            numbers.append(m.group(1))
            continue
        m = re.fullmatch(r"x(\d)", token)
        if m:
            numbers.append(m.group(1))
            continue
        rest.append(token)
    if "xl" in rest:
        variant = "xl"
        rest.remove("xl")

    prefix = f"xl{numbers[0]}" if variant and numbers else f"x{numbers[0]}" if numbers else ""
    return " ".join(part for part in [prefix, *rest] if part)


def write_text_if_changed(path: Path, text: str) -> None:
    """内容一致时不重写，保持脚本可重复运行且不产生无谓改动。"""
    if path.exists() and path.read_text(encoding="utf-8") == text:
        return
    path.write_text(text, encoding="utf-8")


def main() -> None:
    models_path = REF / "assets" / "models.json"
    if not models_path.exists():
        raise SystemExit(f"找不到参考模型清单：{models_path}")

    models = json.loads(models_path.read_text(encoding="utf-8"))

    by_original: dict[str, str] = {}
    duplicate_paths: list[str] = []
    for m in models:
        if not isinstance(m, dict) or not m.get("originalPath") or not m.get("id"):
            continue
        key = norm(m["originalPath"])
        if key in by_original:
            # 保留先出现的条目，重复路径显式告警，避免静默覆盖。
            duplicate_paths.append(key)
            continue
        by_original[key] = m["id"]

    by_name: dict[str, list[str]] = {}
    by_norm: dict[str, list[str]] = {}
    for m in models:
        if not isinstance(m, dict) or not m.get("id"):
            continue
        name = Path(str(m.get("originalPath") or m.get("original") or "")).name
        if name:
            by_name.setdefault(name.lower(), []).append(m["id"])
            by_norm.setdefault(norm_name(name), []).append(m["id"])

    files = read_manifest_files()
    mapping: dict[str, str] = {}
    missing: list[str] = []
    missing_kind: dict[str, str] = {}
    exact = 0
    fallback = 0

    for index, entry in enumerate(files):
        path = str(entry.get("p") or "")
        if not path:
            missing.append(f"<manifest 条目缺少路径> #{index}")
            missing_kind[f"<manifest 条目缺少路径> #{index}"] = "new"
            continue
        ref_id = by_original.get(norm(path))
        if ref_id:
            exact += 1
        else:
            same_name = by_name.get(Path(path).name.lower()) or []
            if len(same_name) == 1:
                ref_id = same_name[0]
                fallback += 1
            elif len(same_name) > 1:
                missing_kind[path] = "ambiguous"
            else:
                same_norm = by_norm.get(norm_name(Path(path).name)) or []
                if len(same_norm) == 1:
                    ref_id = same_norm[0]
                    fallback += 1
                elif len(same_norm) > 1:
                    missing_kind[path] = "ambiguous"
                else:
                    missing_kind[path] = "new"
        if ref_id:
            mapping[path] = ref_id
        else:
            missing.append(path)

    total_entries = len(files)
    matched = exact + fallback
    unmatched = len(missing)
    unmatched_new = sum(1 for path in missing if missing_kind.get(path) == "new")
    unmatched_ambiguous = unmatched - unmatched_new
    exact_coverage = exact / total_entries * 100 if total_entries else 0.0
    total_coverage = matched / total_entries * 100 if total_entries else 0.0

    # 先落地映射与未匹配清单，覆盖率不达标时也便于排查。
    write_text_if_changed(
        OUT,
        "window.VAULT_3D = "
        + json.dumps(mapping, ensure_ascii=False, separators=(",", ":"))
        + ";\n",
    )

    if missing:
        write_text_if_changed(MISSING_OUT, "\n".join(sorted(missing)) + "\n")
        missing_note = f"{MISSING_OUT}（{unmatched} 条）"
    else:
        if MISSING_OUT.exists():
            MISSING_OUT.unlink()
        missing_note = "无未匹配（已删除旧清单文件）"

    copied = 0
    preview_missing: list[str] = []
    if PREVIEW_SRC.exists():
        PREVIEW_DST.mkdir(parents=True, exist_ok=True)
        for source in PREVIEW_SRC.glob("*.webp"):
            target = PREVIEW_DST / source.name
            if not target.exists() or target.stat().st_mtime < source.stat().st_mtime:
                shutil.copy2(source, target)
                copied += 1
        for ref_id in sorted(set(mapping.values())):
            if not (PREVIEW_DST / f"{ref_id}.webp").exists():
                preview_missing.append(ref_id)
    else:
        print(f"缺少预览目录：{PREVIEW_SRC}")
        preview_missing = sorted(set(mapping.values()))

    preview_missing.sort()

    report_lines = [
        "VAULT 参考资产导入报告",
        "",
        f"manifest entries : {total_entries}",
        f"exact            : {exact}",
        f"fallback         : {fallback}",
        f"unmatched        : {unmatched}",
        f"  new STL        : {unmatched_new}（无对应参考模型，前端回退占位缩略图）",
        f"  ambiguous      : {unmatched_ambiguous}（存在多个同名候选，需人工核对）",
        f"coverage exact   : {exact_coverage:.2f}%",
        f"coverage total   : {total_coverage:.2f}%",
        f"webp copied      : {copied}",
        f"preview missing  : {len(preview_missing)}",
        f"mapping written  : {OUT}",
        f"missing written  : {missing_note}",
        "",
        "[preview missing]",
    ]
    report_lines.extend(preview_missing if preview_missing else ["(none)"])
    write_text_if_changed(REPORT_OUT, "\n".join(report_lines) + "\n")

    print(f"manifest entries = {total_entries}")
    print(f"exact            = {exact}")
    print(f"fallback         = {fallback}")
    print(f"unmatched        = {unmatched}")
    print(f"  new STL        = {unmatched_new}")
    print(f"  ambiguous      = {unmatched_ambiguous}")
    print(f"coverage exact   = {exact_coverage:.2f}%")
    print(f"coverage total   = {total_coverage:.2f}%")
    if duplicate_paths:
        print(f"警告：models.json 存在 {len(duplicate_paths)} 条重复 originalPath，已保留先出现的条目：")
        for dup in duplicate_paths:
            print("  -", dup)
    if missing:
        print("未匹配示例：")
        for path in sorted(missing)[:20]:
            print("  -", path)
    print(f"webp copied      = {copied} -> {PREVIEW_DST}")
    print(f"preview missing  = {len(preview_missing)}")
    if preview_missing:
        print("缺失缩略图示例（id）：")
        for ref_id in preview_missing[:20]:
            print("  -", ref_id)
    print(f"missing written  = {missing_note}")
    print(f"mapping written  = {OUT}")
    print(f"report written   = {REPORT_OUT}")

    if total_coverage < MIN_COVERAGE:
        message = (
            f"警告：映射总覆盖率 {total_coverage:.2f}% 低于 {MIN_COVERAGE:.2f}%，"
            f"其中 {unmatched_new} 个新增 STL 无参考缩略图，{unmatched_ambiguous} 个同名候选需人工核对。"
            f"详见 {MISSING_OUT}"
        )
        if "--strict" in sys.argv[1:]:
            print(message)
            raise SystemExit(1)
        print(message)
        print("常规重扫继续完成；如需强制校验请追加 --strict。")


if __name__ == "__main__":
    main()
