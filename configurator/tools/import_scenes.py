#!/usr/bin/env python3
"""把参考工程的 13 组场景模板导入当前配置台。

读取：
- 参考工程 system/assets/scene-combinations.json（groups[].files 保留场景内数量）
- configurator/data/vault-manifest.js（window.VAULT_DATA.files 的 p）

用 manifest 的 STL 路径校验 groups[].files[].originalPath，只保留能对上的条目，
生成 configurator/data/scene-templates.js。color 保留参考工程的 1/2/3 数字，
不在这里转换成 hex；size / bytes / allocations 等大字段不导出。

不引入第三方依赖；内容未变化时不重写文件。

用法：
- python tools/import_scenes.py
"""

from __future__ import annotations

import json
import re
from pathlib import Path

HERE = Path(__file__).resolve()
ROOT = HERE.parents[2]
REF = (
    ROOT
    / "VAULT模块化收纳指南（带三维图配色功能）"
    / "VAULT模块化收纳指南（带三维图配色功能）"
    / "system"
)
SCENES = REF / "assets" / "scene-combinations.json"
MANIFEST = ROOT / "configurator" / "data" / "vault-manifest.js"
OUT = ROOT / "configurator" / "data" / "scene-templates.js"


def read_manifest_paths() -> set[str]:
    text = MANIFEST.read_text(encoding="utf-8")
    match = re.search(r"window\.VAULT_DATA\s*=\s*(\{.*\});?\s*$", text, re.S)
    if not match:
        raise SystemExit("无法解析 vault-manifest.js：找不到 window.VAULT_DATA")
    files = json.loads(match.group(1)).get("files", [])
    return {str(f["p"]) for f in files if isinstance(f, dict) and f.get("p")}


def build_payload(scene: dict, manifest_paths: set[str]) -> tuple[dict, list[dict]]:
    groups: list[dict] = []
    unmatched: list[dict] = []

    for group in scene.get("groups", []):
        items: list[dict] = []
        for entry in group.get("files", []):
            original_path = str(entry.get("originalPath") or "")
            if not original_path or original_path not in manifest_paths:
                unmatched.append(
                    {
                        "group": group.get("id"),
                        "ref": entry.get("id"),
                        "p": original_path,
                    }
                )
                continue
            items.append(
                {
                    "p": original_path,
                    "q": entry.get("qty", 1),
                    "part": entry.get("part"),
                    "partName": entry.get("partName"),
                    "color": entry.get("color"),
                    "support": bool(entry.get("support", False)),
                    "ref": entry.get("id"),
                }
            )

        groups.append(
            {
                "id": group.get("id"),
                "name": group.get("name"),
                "why": group.get("why"),
                "depth": group.get("depth"),
                "width": group.get("width"),
                "roof": group.get("roof"),
                "counts": {
                    "drawers": group.get("drawerCount", 0),
                    "modules": group.get("moduleCount", 0),
                    "cases": group.get("caseCount", 0),
                },
                "items": items,
            }
        )

    payload = {
        "version": scene.get("version"),
        "title": scene.get("title"),
        "notice": scene.get("notice"),
        "assumptions": scene.get("assumptions", []),
        "groups": groups,
    }
    return payload, unmatched


def write_text_if_changed(path: Path, text: str) -> bool:
    """内容一致时不重写，保持脚本可重复运行且不产生无谓改动。"""
    if path.exists() and path.read_text(encoding="utf-8") == text:
        return False
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(text)
    return True


def main() -> None:
    if not SCENES.exists():
        raise SystemExit(f"找不到参考场景数据：{SCENES}")

    scene = json.loads(SCENES.read_text(encoding="utf-8"))
    manifest_paths = read_manifest_paths()
    payload, unmatched = build_payload(scene, manifest_paths)

    text = (
        "window.VAULT_SCENE_TEMPLATES = "
        + json.dumps(payload, ensure_ascii=False, indent=2)
        + ";\n"
    )
    changed = write_text_if_changed(OUT, text)

    total_items = sum(len(group["items"]) for group in payload["groups"])
    total_qty = sum(item["q"] for group in payload["groups"] for item in group["items"])

    print(f"groups          = {len(payload['groups'])}")
    print(f"items           = {total_items}")
    print(f"qty             = {total_qty}")
    print(f"unmatched       = {len(unmatched)}")
    if unmatched:
        print("未匹配条目（最多显示 20 条）：")
        for miss in unmatched[:20]:
            print(f"  - [{miss['group']}] {miss['ref']} {miss['p']}")
    for group in payload["groups"]:
        group_qty = sum(item["q"] for item in group["items"])
        print(f"  {group['id']}: items={len(group['items'])} qty={group_qty}")
    print(f"output          = {OUT}")
    print(f"written         = {'yes' if changed else 'no (内容未变化)'}")


if __name__ == "__main__":
    main()
