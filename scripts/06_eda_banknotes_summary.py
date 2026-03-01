#!/usr/bin/env python3
"""Lightweight EDA summary for the merged banknotes YOLO dataset.

Reports:
  - image/label counts per split
  - class histogram per split and overall

No plotting; safe to run headless.
"""

from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path

import yaml


def load_names(dataset_root: Path) -> dict[int, str]:
    data_yaml = dataset_root / "data.yaml"
    data = yaml.safe_load(data_yaml.read_text(encoding="utf-8"))
    names = data.get("names", {})
    if isinstance(names, list):
        return {i: str(n) for i, n in enumerate(names)}
    return {int(k): str(v) for k, v in (names or {}).items()}


def iter_label_class_ids(label_path: Path) -> list[int]:
    ids: list[int] = []
    for line in label_path.read_text(encoding="utf-8").splitlines():
        parts = line.strip().split()
        if not parts:
            continue
        try:
            ids.append(int(parts[0]))
        except ValueError:
            continue
    return ids


def main() -> int:
    parser = argparse.ArgumentParser(description="EDA summary for merged banknotes YOLO dataset")
    parser.add_argument("--dataset", default=str(Path("data") / "processed" / "banknotes_merged"))
    parser.add_argument("--out-json", default="", help="Optional output JSON path")
    args = parser.parse_args()

    dataset_root = Path(args.dataset)
    if not (dataset_root / "data.yaml").exists():
        raise SystemExit(f"Missing data.yaml under: {dataset_root}")

    names = load_names(dataset_root)
    splits = ["train", "val", "test"]

    report: dict[str, object] = {
        "dataset_root": str(dataset_root.as_posix()),
        "classes": names,
        "splits": {},
    }

    overall = Counter()
    for split in splits:
        img_dir = dataset_root / "images" / split
        lbl_dir = dataset_root / "labels" / split
        images = [p for p in img_dir.iterdir()] if img_dir.exists() else []
        labels = [p for p in lbl_dir.glob("*.txt")] if lbl_dir.exists() else []

        hist = Counter()
        for lp in labels:
            for cid in iter_label_class_ids(lp):
                hist[cid] += 1
        overall.update(hist)

        report["splits"][split] = {
            "images": len(images),
            "label_files": len(labels),
            "class_hist": {names.get(int(k), str(k)): int(v) for k, v in sorted(hist.items())},
        }

    report["overall"] = {
        "class_hist": {names.get(int(k), str(k)): int(v) for k, v in sorted(overall.items())}
    }

    print(json.dumps(report, indent=2), flush=True)
    if args.out_json:
        out_path = Path(args.out_json)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
        print(f"saved={out_path}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
