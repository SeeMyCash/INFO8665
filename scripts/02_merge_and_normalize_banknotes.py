#!/usr/bin/env python3
"""Merge and normalize banknote datasets into one canonical label set.

Input:  data/interim/banknotes/**/data.yaml
Config: configs/label_map.yaml
Output: data/processed/banknotes_merged/
"""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path

import yaml


def load_label_map(path: Path) -> tuple[list[str], dict[str, str]]:
    cfg = yaml.safe_load(path.read_text(encoding="utf-8"))
    canonical = list(cfg["canonical_classes"])
    raw_map = dict(cfg["map"])
    return canonical, raw_map


def find_data_yamls(root: Path) -> list[Path]:
    return sorted(root.rglob("data.yaml"))


def read_yolo_data_yaml(path: Path) -> tuple[dict, dict[int, str]]:
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    names = data.get("names", {})
    if isinstance(names, list):
        names = {i: n for i, n in enumerate(names)}
    elif isinstance(names, dict):
        names = {int(k): v for k, v in names.items()}
    return data, names


def normalize_class_name(name: str) -> str:
    return name.strip().lower().replace("_", "").replace("-", "").replace(" ", "")


def build_remap(src_names: dict[int, str], raw_map: dict[str, str], canonical: list[str]) -> dict[int, int]:
    canonical_lower = {normalize_class_name(c): i for i, c in enumerate(canonical)}
    norm_raw_map = {normalize_class_name(k): v for k, v in raw_map.items()}

    remap: dict[int, int] = {}
    for src_idx, src_name in src_names.items():
        norm = normalize_class_name(src_name)
        if norm in canonical_lower:
            remap[src_idx] = canonical_lower[norm]
            continue
        if norm in norm_raw_map:
            canon_name = norm_raw_map[norm]
            canon_norm = normalize_class_name(canon_name)
            if canon_norm in canonical_lower:
                remap[src_idx] = canonical_lower[canon_norm]
                continue
        if src_name in raw_map:
            canon_name = raw_map[src_name]
            canon_norm = normalize_class_name(canon_name)
            if canon_norm in canonical_lower:
                remap[src_idx] = canonical_lower[canon_norm]
                continue
    return remap


def remap_label_file(src_path: Path, dst_path: Path, remap: dict[int, int]) -> bool:
    dst_path.parent.mkdir(parents=True, exist_ok=True)
    lines_out: list[str] = []
    for line in src_path.read_text(encoding="utf-8").splitlines():
        parts = line.strip().split()
        if len(parts) < 5:
            continue
        cls_idx = int(parts[0])
        if cls_idx in remap:
            parts[0] = str(remap[cls_idx])
            lines_out.append(" ".join(parts))

    if not lines_out:
        return False
    dst_path.write_text("\n".join(lines_out) + "\n", encoding="utf-8")
    return True


def process_dataset(data_yaml_path: Path, canonical: list[str], raw_map: dict[str, str], out_root: Path, file_counter: dict[str, int]) -> None:
    ds_root = data_yaml_path.parent
    _, src_names = read_yolo_data_yaml(data_yaml_path)
    if not src_names:
        print(f"  No class names found in {data_yaml_path}, skipping")
        return

    remap = build_remap(src_names, raw_map, canonical)
    if not remap:
        print(f"  No mappable classes in {data_yaml_path}")
        return

    for split in ["train", "valid", "val", "test"]:
        for img_subdir in [f"{split}/images", f"images/{split}", split]:
            img_dir = ds_root / img_subdir
            if not img_dir.exists():
                continue

            lbl_dir: Path | None = None
            for lbl_subdir in [f"{split}/labels", f"labels/{split}", split]:
                candidate = ds_root / lbl_subdir
                if candidate.exists() and candidate != img_dir:
                    lbl_dir = candidate
                    break
            if lbl_dir is None:
                lbl_dir = img_dir.parent / "labels"
                if not lbl_dir.exists():
                    lbl_dir = img_dir

            out_split = "val" if split == "valid" else split
            out_img_dir = out_root / "images" / out_split
            out_lbl_dir = out_root / "labels" / out_split
            out_img_dir.mkdir(parents=True, exist_ok=True)
            out_lbl_dir.mkdir(parents=True, exist_ok=True)

            for img_file in img_dir.iterdir():
                if img_file.suffix.lower() not in (".jpg", ".jpeg", ".png", ".bmp", ".webp"):
                    continue
                lbl_file = lbl_dir / f"{img_file.stem}.txt"
                if not lbl_file.exists():
                    continue

                counter = int(file_counter.get(out_split, 0))
                file_counter[out_split] = counter + 1
                new_name = f"img_{counter:06d}"
                dst_lbl = out_lbl_dir / f"{new_name}.txt"
                if remap_label_file(lbl_file, dst_lbl, remap):
                    dst_img = out_img_dir / f"{new_name}{img_file.suffix.lower()}"
                    shutil.copy2(img_file, dst_img)
            return


def main() -> int:
    parser = argparse.ArgumentParser(description="Merge and normalize banknote datasets")
    parser.add_argument("--in-root", default=str(Path("data") / "interim" / "banknotes"))
    parser.add_argument("--label-map", default=str(Path("configs") / "label_map.yaml"))
    parser.add_argument("--out", default=str(Path("data") / "processed" / "banknotes_merged"))
    args = parser.parse_args()

    canonical, raw_map = load_label_map(Path(args.label_map))
    in_root = Path(args.in_root)
    out_root = Path(args.out)

    out_root.mkdir(parents=True, exist_ok=True)
    print(f"Canonical classes: {canonical}")
    print(f"Input root: {in_root}")
    print(f"Output: {out_root}")

    data_yamls = find_data_yamls(in_root)
    print(f"Found {len(data_yamls)} data.yaml files")

    file_counter: dict[str, int] = {}
    for dy in data_yamls:
        print(f"Processing: {dy}")
        process_dataset(dy, canonical, raw_map, out_root, file_counter)

    out_data_yaml = out_root / "data.yaml"
    content = {
        "names": {i: name for i, name in enumerate(canonical)},
        "nc": len(canonical),
        "train": "images/train",
        "val": "images/val",
        "test": "images/test",
    }
    out_data_yaml.write_text(yaml.dump(content, default_flow_style=False), encoding="utf-8")

    for split in ["train", "val", "test"]:
        img_dir = out_root / "images" / split
        count = len(list(img_dir.iterdir())) if img_dir.exists() else 0
        print(f"{split}: {count} images")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
