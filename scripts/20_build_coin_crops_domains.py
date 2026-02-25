#!/usr/bin/env python3
"""Extract coin crops from YOLO datasets into ImageFolder-style domains."""

from __future__ import annotations

import argparse
import random
from pathlib import Path

import cv2


def _find_image(images_dir: Path, stem: str) -> Path | None:
    for ext in (".jpg", ".jpeg", ".png", ".bmp", ".webp"):
        candidate = images_dir / f"{stem}{ext}"
        if candidate.exists():
            return candidate
    return None


def _clamp(value: int, lo: int, hi: int) -> int:
    return max(lo, min(hi, value))


def extract_yolo_crops(yolo_root: Path, out_root: Path, img_size: int, pad_ratio: float, limit: int | None = None) -> int:
    labels_dir_candidates = [
        yolo_root / "labels",
        yolo_root / "train" / "labels",
        yolo_root / "valid" / "labels",
        yolo_root / "val" / "labels",
        yolo_root / "test" / "labels",
    ]

    label_files: list[Path] = []
    for labels_dir in labels_dir_candidates:
        if labels_dir.exists():
            label_files.extend(sorted(labels_dir.glob("*.txt")))
    if not label_files:
        print(f"[WARN] No label files found in {yolo_root}")
        return 0

    extracted = 0
    for label_file in label_files:
        split_dir = label_file.parent.parent
        images_dir = split_dir / "images"
        if not images_dir.exists():
            images_dir = yolo_root / "images"
        image_path = _find_image(images_dir, label_file.stem)
        if image_path is None:
            continue

        image = cv2.imread(str(image_path))
        if image is None:
            continue
        h, w = image.shape[:2]

        for index, line in enumerate([ln for ln in label_file.read_text(encoding="utf-8").splitlines() if ln.strip()]):
            parts = line.split()
            if len(parts) < 5:
                continue
            class_id = parts[0]
            cx, cy, bw, bh = map(float, parts[1:5])
            x1 = int((cx - bw / 2) * w)
            y1 = int((cy - bh / 2) * h)
            x2 = int((cx + bw / 2) * w)
            y2 = int((cy + bh / 2) * h)

            pad_x = int((x2 - x1) * pad_ratio)
            pad_y = int((y2 - y1) * pad_ratio)
            x1 = _clamp(x1 - pad_x, 0, w - 1)
            y1 = _clamp(y1 - pad_y, 0, h - 1)
            x2 = _clamp(x2 + pad_x, 1, w)
            y2 = _clamp(y2 + pad_y, 1, h)
            if x2 <= x1 or y2 <= y1:
                continue

            crop = image[y1:y2, x1:x2]
            if crop.size == 0:
                continue

            crop = cv2.resize(crop, (img_size, img_size), interpolation=cv2.INTER_AREA)
            class_dir = out_root / class_id
            class_dir.mkdir(parents=True, exist_ok=True)
            out_file = class_dir / f"{image_path.stem}_{index:03d}.jpg"
            cv2.imwrite(str(out_file), crop, [cv2.IMWRITE_JPEG_QUALITY, 95])
            extracted += 1
            if limit is not None and extracted >= limit:
                return extracted

    return extracted


def main() -> int:
    parser = argparse.ArgumentParser(description="Build A_synth and B_real coin crop folders")
    parser.add_argument("--synth-yolo-root", required=True, help="YOLO root for synthetic coin set")
    parser.add_argument("--real-yolo-root", required=True, help="YOLO root for real coin set")
    parser.add_argument("--out-a-synth", default=str(Path("data") / "processed" / "coin_domains" / "A_synth"))
    parser.add_argument("--out-b-real", default=str(Path("data") / "processed" / "coin_domains" / "B_real"))
    parser.add_argument("--img-size", type=int, default=256)
    parser.add_argument("--pad-ratio", type=float, default=0.10)
    parser.add_argument("--limit-per-domain", type=int, default=0)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    random.seed(args.seed)
    out_a = Path(args.out_a_synth)
    out_b = Path(args.out_b_real)
    out_a.mkdir(parents=True, exist_ok=True)
    out_b.mkdir(parents=True, exist_ok=True)
    limit = None if args.limit_per_domain <= 0 else int(args.limit_per_domain)

    a_count = extract_yolo_crops(Path(args.synth_yolo_root), out_a, int(args.img_size), float(args.pad_ratio), limit)
    b_count = extract_yolo_crops(Path(args.real_yolo_root), out_b, int(args.img_size), float(args.pad_ratio), limit)
    print(f"A_synth crops: {a_count}")
    print(f"B_real crops:  {b_count}")
    return 0 if a_count and b_count else 1


if __name__ == "__main__":
    raise SystemExit(main())
