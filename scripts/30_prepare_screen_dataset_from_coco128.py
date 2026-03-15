#!/usr/bin/env python3
"""Build a screen-detection YOLO dataset from COCO128.

Source dataset:
  https://ultralytics.com/assets/coco128.zip

Output layout (YOLO):
  <out_root>/
    images/train/*.jpg
    images/val/*.jpg
    labels/train/*.txt
    labels/val/*.txt
    data.yaml

We collapse selected COCO classes to a single class: "screen".
"""

from __future__ import annotations

import argparse
import shutil
import urllib.request
import zipfile
from pathlib import Path
from typing import Iterable


COCO128_URL = "https://ultralytics.com/assets/coco128.zip"
COCO_SCREEN_CLASS_IDS = {62, 63, 67}  # tv, laptop, cell phone


def _download(url: str, out_path: Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(url) as r:
        data = r.read()
    out_path.write_bytes(data)


def _ensure_empty_dir(path: Path) -> None:
    if path.exists():
        shutil.rmtree(path)
    path.mkdir(parents=True, exist_ok=True)


def _iter_image_files(path: Path) -> Iterable[Path]:
    for ext in ("*.jpg", "*.jpeg", "*.png"):
        yield from path.glob(ext)


def _map_label_line(line: str) -> str | None:
    parts = line.strip().split()
    if len(parts) < 5:
        return None
    try:
        cls_id = int(float(parts[0]))
    except Exception:
        return None
    if cls_id not in COCO_SCREEN_CLASS_IDS:
        return None
    # Single-class dataset => class 0
    return "0 " + " ".join(parts[1:5])


def _process_split(src_root: Path, dst_root: Path, split: str) -> tuple[int, int]:
    src_img = src_root / "images" / split
    src_lbl = src_root / "labels" / split
    dst_img = dst_root / "images" / split
    dst_lbl = dst_root / "labels" / split
    dst_img.mkdir(parents=True, exist_ok=True)
    dst_lbl.mkdir(parents=True, exist_ok=True)

    total_images = 0
    positive_images = 0

    for img_path in sorted(_iter_image_files(src_img)):
        total_images += 1
        stem = img_path.stem
        src_label = src_lbl / f"{stem}.txt"
        dst_image = dst_img / img_path.name
        dst_label = dst_lbl / f"{stem}.txt"

        shutil.copy2(img_path, dst_image)

        mapped_lines: list[str] = []
        if src_label.exists():
            for raw_line in src_label.read_text(encoding="utf-8").splitlines():
                mapped = _map_label_line(raw_line)
                if mapped:
                    mapped_lines.append(mapped)
        if mapped_lines:
            positive_images += 1
        dst_label.write_text("\n".join(mapped_lines) + ("\n" if mapped_lines else ""), encoding="utf-8")

    return total_images, positive_images


def main() -> int:
    parser = argparse.ArgumentParser(description="Prepare screen dataset from COCO128")
    parser.add_argument(
        "--url",
        default=COCO128_URL,
        help="Source zip URL",
    )
    parser.add_argument(
        "--workdir",
        default=str(Path("outputs") / "tmp" / "coco128_screen_builder"),
        help="Temporary workspace",
    )
    parser.add_argument(
        "--out-root",
        default=str(Path("outputs") / "datasets" / "screen_coco128_v1"),
        help="Destination YOLO dataset root",
    )
    args = parser.parse_args()

    workdir = Path(args.workdir)
    out_root = Path(args.out_root)
    _ensure_empty_dir(workdir)
    _ensure_empty_dir(out_root)

    zip_path = workdir / "coco128.zip"
    print(f"download_url={args.url}")
    _download(args.url, zip_path)
    print(f"downloaded_zip={zip_path}")

    extract_root = workdir / "extract"
    extract_root.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(extract_root)

    # ulralytics zip has top dir `coco128/`
    src = extract_root / "coco128"
    if not src.exists():
        raise SystemExit(f"Unexpected archive layout, expected {src}")

    _process_split(src, out_root, "train2017")

    # Simple split: move last 20% of train set to val to create validation.
    train_images = sorted((out_root / "images" / "train2017").glob("*"))
    cutoff = int(round(len(train_images) * 0.8))
    keep_train = set(p.name for p in train_images[:cutoff])

    # Rename dirs to train/val
    tmp_train = out_root / "images" / "train2017"
    tmp_train_lbl = out_root / "labels" / "train2017"
    final_train = out_root / "images" / "train"
    final_train_lbl = out_root / "labels" / "train"
    final_val = out_root / "images" / "val"
    final_val_lbl = out_root / "labels" / "val"
    final_train.mkdir(parents=True, exist_ok=True)
    final_train_lbl.mkdir(parents=True, exist_ok=True)
    final_val.mkdir(parents=True, exist_ok=True)
    final_val_lbl.mkdir(parents=True, exist_ok=True)

    for img in sorted(tmp_train.glob("*")):
        lbl = tmp_train_lbl / f"{img.stem}.txt"
        if img.name in keep_train:
            shutil.move(str(img), str(final_train / img.name))
            shutil.move(str(lbl), str(final_train_lbl / lbl.name))
        else:
            shutil.move(str(img), str(final_val / img.name))
            shutil.move(str(lbl), str(final_val_lbl / lbl.name))

    shutil.rmtree(out_root / "images" / "train2017", ignore_errors=True)
    shutil.rmtree(out_root / "labels" / "train2017", ignore_errors=True)

    data_yaml = out_root / "data.yaml"
    data_yaml.write_text(
        "\n".join(
            [
                "path: .",
                "train: images/train",
                "val: images/val",
                "names:",
                "  0: screen",
                "",
            ]
        ),
        encoding="utf-8",
    )

    def _count_positive(split: str) -> tuple[int, int]:
        lbl_dir = out_root / "labels" / split
        total = 0
        pos = 0
        for p in sorted(lbl_dir.glob("*.txt")):
            total += 1
            if p.read_text(encoding="utf-8").strip():
                pos += 1
        return total, pos

    tr_total, tr_pos = _count_positive("train")
    va_total, va_pos = _count_positive("val")
    print(f"dataset_out={out_root.resolve()}")
    print(f"train_images={tr_total} train_positive={tr_pos}")
    print(f"val_images={va_total} val_positive={va_pos}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
