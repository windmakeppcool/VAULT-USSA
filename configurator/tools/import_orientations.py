#!/usr/bin/env python3
"""把参考工程的真实姿态导入当前配置台。

读取：
- configurator/data/vault-3d.js        path -> 参考模型编号（由 import_reference.py 生成）
- 参考工程 assets/orientations.json    模型编号 -> {matrix, size, kind}

只导出同时存在于两份数据中、且矩阵完整的条目，生成：
- configurator/data/vault-orientations.js
  window.VAULT_ORIENTATIONS = {"path":[m00,m01,m02,m10,m11,m12,m20,m21,m22], ...};

矩阵按参考 JSON 的 row-major 顺序展平，数字最多保留 6 位小数并去掉 -0。
不引入第三方依赖；内容未变化时不重写文件。

用法：
- python tools/import_orientations.py
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
MAPPING = ROOT / "configurator" / "data" / "vault-3d.js"
ORIENTATIONS = REF / "assets" / "orientations.json"
OUT = ROOT / "configurator" / "data" / "vault-orientations.js"


def read_mapping() -> dict[str, str]:
    text = MAPPING.read_text(encoding="utf-8")
    match = re.search(r"window\.VAULT_3D\s*=\s*(\{.*\});?\s*$", text, re.S)
    if not match:
        raise SystemExit("无法解析 vault-3d.js：找不到 window.VAULT_3D")
    return json.loads(match.group(1))


def flatten_matrix(matrix: object) -> list[float] | None:
    """按 row-major 展平 3x3 矩阵；结构不完整时返回 None。"""
    if not isinstance(matrix, list) or len(matrix) != 3:
        return None
    values: list[float] = []
    for row in matrix:
        if not isinstance(row, list) or len(row) != 3:
            return None
        for value in row:
            if not isinstance(value, (int, float)) or isinstance(value, bool):
                return None
            values.append(clean_number(value))
    return values


def clean_number(value: float) -> float | int:
    """最多 6 位小数，去掉 -0，整数还原为 int 以保持输出紧凑。"""
    rounded = round(float(value), 6)
    if rounded == 0:
        return 0
    if rounded == int(rounded):
        return int(rounded)
    return rounded


def write_text_if_changed(path: Path, text: str) -> None:
    """内容一致时不重写，保持脚本可重复运行且不产生无谓改动。"""
    if path.exists() and path.read_text(encoding="utf-8") == text:
        return
    path.write_text(text, encoding="utf-8")


def main() -> None:
    if not MAPPING.exists():
        raise SystemExit(f"找不到映射文件：{MAPPING}")
    if not ORIENTATIONS.exists():
        raise SystemExit(f"找不到姿态文件：{ORIENTATIONS}")

    mapping = read_mapping()
    orientations = json.loads(ORIENTATIONS.read_text(encoding="utf-8"))
    if not isinstance(orientations, dict):
        raise SystemExit("orientations.json 顶层结构不是对象")

    missing_matrix: list[str] = []
    exported: dict[str, list[float]] = {}
    unmapped: list[str] = []

    for path, ref_id in mapping.items():
        entry = orientations.get(ref_id)
        if not isinstance(entry, dict):
            unmapped.append(path)
            continue
        matrix = flatten_matrix(entry.get("matrix"))
        if matrix is None:
            missing_matrix.append(ref_id)
            continue
        exported[path] = matrix

    text = (
        "window.VAULT_ORIENTATIONS = "
        + json.dumps(exported, ensure_ascii=False, separators=(",", ":"))
        + ";\n"
    )
    write_text_if_changed(OUT, text)

    print(f"mapping entries = {len(mapping)}")
    print(f"orientations    = {len(orientations)}")
    print(f"exported        = {len(exported)}")
    print(f"missing matrix  = {len(set(missing_matrix))}")
    print(f"unmapped paths  = {len(unmapped)}")
    print(f"output          = {OUT}")
    if exported:
        sample_path = next(iter(exported))
        print("sample          = " + json.dumps(sample_path, ensure_ascii=False))
        print("                  " + json.dumps(exported[sample_path]))
    if missing_matrix:
        print("缺失 matrix 的 id 示例：")
        for ref_id in sorted(set(missing_matrix))[:20]:
            print("  -", ref_id)
    if unmapped:
        print("未映射 path 示例：")
        for path in sorted(unmapped)[:20]:
            print("  -", path)


if __name__ == "__main__":
    main()
