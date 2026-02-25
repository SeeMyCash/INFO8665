#!/usr/bin/env python3
"""Camera realism augmentation (local utility)."""

from __future__ import annotations

import argparse
import random
from pathlib import Path

import cv2
import numpy as np


def add_motion_blur(image: np.ndarray, k: int = 5) -> np.ndarray:
    kernel = np.zeros((k, k), dtype=np.float32)
    kernel[k // 2, :] = 1.0
    kernel /= kernel.sum()
    return cv2.filter2D(image, -1, kernel)


def add_specular_overlay(image: np.ndarray, alpha_max: float = 0.22) -> np.ndarray:
    h, w = image.shape[:2]
    overlay = np.zeros((h, w, 3), dtype=np.uint8)
    center = (random.randint(0, w - 1), random.randint(0, h - 1))
    axes = (
        random.randint(max(8, w // 12), max(10, w // 3)),
        random.randint(max(6, h // 16), max(8, h // 4)),
    )
    angle = random.uniform(0, 180)
    cv2.ellipse(overlay, center, axes, angle, 0, 360, (255, 255, 255), -1)
    overlay = cv2.GaussianBlur(overlay, (random.choice([11, 15, 21]),) * 2, 0)
    alpha = random.uniform(0.06, alpha_max)
    return cv2.addWeighted(image, 1.0, overlay, alpha, 0)


def apply_white_balance_shift(image: np.ndarray) -> np.ndarray:
    out = image.astype(np.float32)
    out[:, :, 0] *= random.uniform(0.90, 1.12)
    out[:, :, 1] *= random.uniform(0.94, 1.08)
    out[:, :, 2] *= random.uniform(0.90, 1.12)
    return np.clip(out, 0, 255).astype(np.uint8)


def apply_random_crop_scale(image: np.ndarray) -> np.ndarray:
    h, w = image.shape[:2]
    crop_ratio = random.uniform(0.86, 1.0)
    ch = max(16, int(h * crop_ratio))
    cw = max(16, int(w * crop_ratio))
    y1 = random.randint(0, max(0, h - ch))
    x1 = random.randint(0, max(0, w - cw))
    crop = image[y1 : y1 + ch, x1 : x1 + cw]
    return cv2.resize(crop, (w, h), interpolation=cv2.INTER_LINEAR)


def apply_camera_realism(image: np.ndarray) -> np.ndarray:
    out = image.copy()
    if random.random() < 0.55:
        out = apply_random_crop_scale(out)
    if random.random() < 0.80:
        out = cv2.GaussianBlur(out, (0, 0), sigmaX=random.uniform(0.3, 1.5), sigmaY=random.uniform(0.3, 1.5))
    if random.random() < 0.35:
        out = add_motion_blur(out, k=random.choice([3, 5, 7]))
    if random.random() < 0.85:
        out = np.clip(out.astype(np.float32) * random.uniform(0.90, 1.10), 0, 255).astype(np.uint8)
    if random.random() < 0.70:
        out = apply_white_balance_shift(out)
    if random.random() < 0.70:
        noise = np.random.normal(0, random.uniform(2.0, 10.0), out.shape).astype(np.float32)
        out = np.clip(out.astype(np.float32) + noise, 0, 255).astype(np.uint8)
    if random.random() < 0.45:
        out = add_specular_overlay(out)

    ok, enc = cv2.imencode(".jpg", out, [cv2.IMWRITE_JPEG_QUALITY, random.randint(35, 80)])
    if ok:
        out = cv2.imdecode(enc, cv2.IMREAD_COLOR)
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description="Camera realism augmentation")
    parser.add_argument("--input-dir", required=True, help="ImageFolder-style source (class subfolders)")
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--copies", type=int, default=1)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    random.seed(args.seed)
    np.random.seed(args.seed)

    in_root = Path(args.input_dir)
    out_root = Path(args.output_dir)
    out_root.mkdir(parents=True, exist_ok=True)

    image_files = list(in_root.glob("*/*.jpg")) + list(in_root.glob("*/*.jpeg")) + list(in_root.glob("*/*.png"))
    if not image_files:
        print(f"[ERROR] No images found under {in_root}")
        return 1

    written = 0
    for img_path in image_files:
        cls = img_path.parent.name
        cls_out = out_root / cls
        cls_out.mkdir(parents=True, exist_ok=True)
        image = cv2.imread(str(img_path))
        if image is None:
            continue
        for i in range(int(args.copies)):
            aug = apply_camera_realism(image)
            out_file = cls_out / f"{img_path.stem}_aug{i:02d}.jpg"
            cv2.imwrite(str(out_file), aug, [cv2.IMWRITE_JPEG_QUALITY, 92])
            written += 1

    print(f"Wrote {written} augmented images to {out_root}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
