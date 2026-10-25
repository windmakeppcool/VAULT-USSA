#!/usr/bin/env python3
"""扫描工程内 STL，生成前端使用的清单数据（可直接 file:// 打开）。"""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "configurator" / "data" / "vault-manifest.js"


def detect_family(rel: str) -> str | None:
    for token, code in (
        ("XL² Families", "XL2"),
        ("L² Families", "L2"),
        ("XL Families", "XL"),
        ("L Families", "L"),
        ("M Families", "M"),
        ("S Families", "S"),
    ):
        if token in rel:
            return code
    for token, code in (
        ("/XL Depth Dividers/", "XL"),
        ("/L Depth Dividers/", "L"),
        ("/L Seal Dividers/", "L"),
        ("/L Width Dividers/", "L"),
        ("/S Dividers/", "S"),
        ("/M Dividers/", "M"),
    ):
        if token in rel:
            return code
    m = re.search(r"(?:^|[/\\])(XL|L|M|S)²?(?=\d)", rel)
    if m:
        code = m.group(1)
        return "L2" if code == "L" and "²" in m.group(0) else code
    return None


def detect_size(rel: str) -> str | None:
    m = re.search(r"(?:^|[/\\])(?:XL|L|M|S)\s*([3-7])(²?)(?=[/\\\s])", rel)
    if m:
        return m.group(1)
    m = re.search(r"(?:^|[/\\])(?:XL|L|M|S)([3-7])(?:²)?(?=[ _.-])", rel)
    return m.group(1) if m else None


def detect_height(stem: str) -> str | None:
    if re.search(r"2-4F", stem, re.I):
        return "2-4F"
    m = re.search(r"(?<![0-9])([124])F(?![A-Za-z])", stem, re.I)
    return f"{m.group(1)}F" if m else None


def clean_variant(stem: str) -> str:
    v = re.sub(r"^(?:XL²|L²|XL|L|M|S)\s*\d²?\s+", "", stem, flags=re.I)
    v = re.sub(r"\s*\((?:turn on supports?)\)\s*$", "", v, flags=re.I)
    v = re.sub(r"^[\s-]+", "", v)
    v = re.sub(r"\s+", " ", v)
    return v.strip() or stem


def classify(rel: str) -> tuple[str, str]:
    """返回 (category, variant)。"""
    name = rel.rsplit("/", 1)[-1]
    stem = name[:-4] if name.lower().endswith(".stl") else name
    p = rel.lower()

    if rel.startswith("01. DRAWERS/"):
        if "/facades/" in p or "facade" in p:
            return "facade", "Facade"
        if "/boxes/" in p:
            return ("backpanel" if "back panel" in p else "box"), clean_variant(stem)
        if "/modules/" in p or ("families/" in p and "module" in p):
            return "module", clean_variant(stem)
        if "/roofs/" in p:
            return "roof", clean_variant(stem)
        if "/gridfinity baseplate/" in p:
            return "baseplate", clean_variant(stem)
        if "/geared rails/" in p:
            return "rail", clean_variant(stem)
        if "/grid dividers/" in p:
            return "divider", stem
        if "/runners/" in p:
            return ("runner" if "stopper" not in p else "runner"), clean_variant(stem)
        if "/l² accessories/" in p:
            return "accessory", clean_variant(stem)
        if "/manual supports/" in p:
            return "support", clean_variant(stem)
        return "hardware", clean_variant(stem)

    if rel.startswith("02. SUSTAINERS/"):
        if "/facades/" in p or "facade" in p:
            return "facade", "Facade"
        if "/modules/" in p:
            return "module", clean_variant(stem)
        if "/roofs/" in p or "/roof/" in p:
            return "roof", clean_variant(stem)
        if "/baseplates/" in p:
            return "baseplate", clean_variant(stem)
        if "/dividers/" in p:
            return "divider", clean_variant(stem)
        if "/hinges/" in p:
            return "hinge", clean_variant(stem)
        if "/locks/" in p:
            return "lock", clean_variant(stem)
        if "/rods/" in p:
            return "rod", clean_variant(stem)
        return "hardware", clean_variant(stem)

    if rel.startswith("03. MODIFICATIONS/"):
        if "/backbone/" in p:
            return "backbone", clean_variant(stem)
        if "/base/" in p:
            return "base", clean_variant(stem)
        if "/feet/" in p:
            return "feet", clean_variant(stem)
        if "/wall mounts/" in p:
            return "wallmount", clean_variant(stem)
        if "/wheels/" in p:
            return "wheel", clean_variant(stem)
        if "/stationary handle/" in p or "/pull-out handle/" in p:
            return "handle", clean_variant(stem)
        if "/pegboard attachment/" in p:
            return "pegboard", f"{Path(rel).parent.name} {stem}"

    return "other", clean_variant(stem)


def main() -> None:
    entries = []
    for path in sorted(ROOT.rglob("*.stl")):
        rel = path.relative_to(ROOT).as_posix()
        if rel.startswith("configurator/"):
            continue
        name = path.name
        stem = name[:-4]
        group = rel.split("/", 1)[0].split(". ", 1)[-1].lower() or "other"
        group = {
            "drawers": "drawers",
            "sustainers": "sustainers",
            "modifications": "mods",
        }.get(group, "other")

        cat, variant = classify(rel)
        support = "turn on supports" in stem.lower()
        split = None
        m = re.search(r"\bpart\s*([12])\b", stem, re.I)
        if m:
            split = int(m.group(1))

        qty = 1
        m = re.search(r"\bx([3-7])\b", stem, re.I)
        if m:
            qty = int(m.group(1))

        family = detect_family(rel)
        if family is None and "universal" in rel.lower():
            family = "U"

        entries.append(
            {
                "p": rel,
                "n": stem,
                "s": path.stat().st_size,
                "g": group,
                "f": family,
                "z": detect_size(rel),
                "h": detect_height(stem),
                "c": cat,
                "v": variant,
                "k": split,
                "q": qty,
                "u": support,
            }
        )

    payload = {
        "generated": "2026-10-22",
        "root": "d:/Projects/261020_VAULT_USSA",
        "files": entries,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        "window.VAULT_DATA = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )

    from collections import Counter

    print(f"entries={len(entries)} -> {OUT}")
    print("groups:", dict(Counter(e["g"] for e in entries)))
    print("categories:", dict(Counter(e["c"] for e in entries)))
    for g in ("drawers", "sustainers", "mods"):
        print(f"unclassified {g}:", [e["p"] for e in entries if e["g"] == g and e["c"] == "other"])


if __name__ == "__main__":
    main()
