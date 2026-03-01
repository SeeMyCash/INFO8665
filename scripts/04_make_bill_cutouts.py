#!/usr/bin/env python3
"""Create bill cutouts (RGBA PNG) from the merged banknote dataset.

Outputs a split-preserving ImageFolder-like layout:

    data/processed/bill_cutouts/
        train/<class>/*.png
        val/<class>/*.png
        test/<class>/*.png
"""

from __future__ import annotations

import argparse
from pathlib import Path

import cv2
import numpy as np
import yaml


def load_dataset_info(dataset_root: Path) -> dict[int, str]:
    data_yaml = dataset_root / "data.yaml"
    if not data_yaml.exists():
        raise FileNotFoundError(f"No data.yaml in {dataset_root}")
    data = yaml.safe_load(data_yaml.read_text(encoding="utf-8"))
    names = data.get("names", {})
    if isinstance(names, list):
        names = {i: n for i, n in enumerate(names)}
    else:
        names = {int(k): v for k, v in names.items()}
    return names


def parse_yolo_label(label_path: Path, img_w: int, img_h: int) -> list[tuple[int, int, int, int, int]]:
    bboxes = []
    for line in label_path.read_text(encoding="utf-8").splitlines():
        parts = line.strip().split()
        if len(parts) < 5:
            continue
        cls_idx = int(parts[0])
        cx = float(parts[1]) * img_w
        cy = float(parts[2]) * img_h
        bw = float(parts[3]) * img_w
        bh = float(parts[4]) * img_h
        x1 = max(0, int(cx - bw / 2))
        y1 = max(0, int(cy - bh / 2))
        x2 = min(img_w, int(cx + bw / 2))
        y2 = min(img_h, int(cy + bh / 2))
        bboxes.append((cls_idx, x1, y1, x2, y2))
    return bboxes


def create_soft_edge_alpha(crop_h: int, crop_w: int, edge_pix: int = 5) -> np.ndarray:
    alpha = np.ones((crop_h, crop_w), dtype=np.float32) * 255.0
    for i in range(edge_pix):
        factor = (i + 1) / edge_pix
        alpha[i, :] *= factor
        alpha[crop_h - 1 - i, :] *= factor
        alpha[:, i] *= factor
        alpha[:, crop_w - 1 - i] *= factor
    return alpha.astype(np.uint8)


def try_grabcut(crop_bgr: np.ndarray) -> np.ndarray | None:
    h, w = crop_bgr.shape[:2]
    if h < 20 or w < 20:
        return None

    try:
        mask = np.zeros((h, w), np.uint8)
        bgd_model = np.zeros((1, 65), np.float64)
        fgd_model = np.zeros((1, 65), np.float64)
        margin = max(2, min(h, w) // 10)
        rect = (margin, margin, w - 2 * margin, h - 2 * margin)
        cv2.grabCut(crop_bgr, mask, rect, bgd_model, fgd_model, iterCount=3, mode=cv2.GC_INIT_WITH_RECT)
        mask2 = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
        fg_ratio = np.count_nonzero(mask2) / (h * w)
        if 0.2 < fg_ratio < 0.95:
            return cv2.GaussianBlur(mask2, (5, 5), 0)
    except Exception:
        return None
    return None


def variance_of_laplacian(gray: np.ndarray) -> float:
    return cv2.Laplacian(gray, cv2.CV_64F).var()


def process_image(
    img_path: Path,
    lbl_path: Path,
    names: dict[int, str],
    out_root: Path,
    split: str,
    min_size: int,
    counters: dict[str, int],
    use_grabcut: bool,
    blur_threshold: float,
    max_aspect_ratio: float,
) -> None:
    img = cv2.imread(str(img_path))
    if img is None:
        return

    h, w = img.shape[:2]
    bboxes = parse_yolo_label(lbl_path, w, h)
    for cls_idx, x1, y1, x2, y2 in bboxes:
        if cls_idx not in names:
            continue
        cls_name = names[cls_idx]
        crop_w = x2 - x1
        crop_h = y2 - y1
        if crop_w < min_size or crop_h < min_size:
            continue
        aspect = max(crop_w, crop_h) / max(min(crop_w, crop_h), 1)
        if aspect > max_aspect_ratio:
            continue

        crop_bgr = img[y1:y2, x1:x2].copy()
        gray = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2GRAY)
        if variance_of_laplacian(gray) < blur_threshold:
            continue

        alpha = try_grabcut(crop_bgr) if use_grabcut else None
        if alpha is None:
            alpha = create_soft_edge_alpha(crop_h, crop_w)

        rgba = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2BGRA)
        rgba[:, :, 3] = alpha

        cls_dir = out_root / split / cls_name
        cls_dir.mkdir(parents=True, exist_ok=True)
        key = f"{split}:{cls_name}"
        counter = int(counters.get(key, 0))
        counters[key] = counter + 1
        out_path = cls_dir / f"{cls_name}_{counter:06d}.png"
        cv2.imwrite(str(out_path), rgba)


def main() -> int:
    parser = argparse.ArgumentParser(description="Create RGBA bill cutouts from merged banknote dataset")
    parser.add_argument("--dataset", default=str(Path("data") / "processed" / "banknotes_merged"))
    parser.add_argument("--out", default=str(Path("data") / "processed" / "bill_cutouts"))
    parser.add_argument("--min-size", type=int, default=96)
    parser.add_argument("--no-grabcut", action="store_true")
    parser.add_argument("--blur-threshold", type=float, default=30.0)
    parser.add_argument("--max-aspect-ratio", type=float, default=5.0)
    args = parser.parse_args()

    dataset_root = Path(args.dataset)
    out_root = Path(args.out)
    out_root.mkdir(parents=True, exist_ok=True)

    names = load_dataset_info(dataset_root)
    counters: dict[str, int] = {}
    for split in ["train", "val", "test"]:
        img_dir = dataset_root / "images" / split
        lbl_dir = dataset_root / "labels" / split
        if not img_dir.exists() or not lbl_dir.exists():
            continue
        for img_file in sorted(img_dir.iterdir()):
            if img_file.suffix.lower() not in (".jpg", ".jpeg", ".png", ".bmp", ".webp"):
                continue
            lbl_file = lbl_dir / f"{img_file.stem}.txt"
            if lbl_file.exists():
                process_image(
                    img_file,
                    lbl_file,
                    names,
                    out_root,
                    split,
                    min_size=int(args.min_size),
                    counters=counters,
                    use_grabcut=not bool(args.no_grabcut),
                    blur_threshold=float(args.blur_threshold),
                    max_aspect_ratio=float(args.max_aspect_ratio),
                )

    total = sum(int(v) for v in counters.values())
    print(f"Done! Wrote {total} cutouts to {out_root} (split-preserving)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
