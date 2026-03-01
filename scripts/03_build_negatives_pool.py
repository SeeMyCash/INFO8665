#!/usr/bin/env python3
"""Build a negative image pool from confusers + backgrounds (dedup via pHash)."""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path

import imagehash
from PIL import Image
from tqdm import tqdm


IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tiff", ".tif"}


def collect_images(root: Path) -> list[Path]:
    if not root.exists():
        return []
    return [p for p in root.rglob("*") if p.is_file() and p.suffix.lower() in IMAGE_EXTS]


def deduplicate_images(image_paths: list[Path], hash_size: int = 8, threshold: int = 5) -> list[Path]:
    seen_hashes = []
    unique: list[Path] = []

    for p in tqdm(image_paths, desc="Deduplicating"):
        try:
            img = Image.open(p)
            h = imagehash.phash(img, hash_size=hash_size)
            if any((h - seen_h) <= threshold for seen_h in seen_hashes):
                continue
            seen_hashes.append(h)
            unique.append(p)
        except Exception as exc:
            print(f"  Warning: could not process {p}: {exc}")

    return unique


def main() -> int:
    parser = argparse.ArgumentParser(description="Build negatives pool from confusers and backgrounds")
    parser.add_argument("--confusers-root", default=str(Path("data") / "interim" / "confusers"))
    parser.add_argument("--backgrounds-root", default=str(Path("data") / "interim" / "backgrounds"))
    parser.add_argument("--out", default=str(Path("data") / "processed" / "negatives"))
    parser.add_argument("--hash-size", type=int, default=8)
    parser.add_argument("--threshold", type=int, default=5, help="pHash hamming distance threshold for dedup")
    args = parser.parse_args()

    confusers_root = Path(args.confusers_root)
    backgrounds_root = Path(args.backgrounds_root)
    out_dir = Path(args.out) / "images"
    out_dir.mkdir(parents=True, exist_ok=True)

    confuser_imgs = collect_images(confusers_root)
    bg_imgs = collect_images(backgrounds_root)
    all_imgs = confuser_imgs + bg_imgs
    print(f"Confusers: {len(confuser_imgs)} images")
    print(f"Backgrounds: {len(bg_imgs)} images")
    print(f"Total before dedup: {len(all_imgs)}")

    unique_imgs = deduplicate_images(all_imgs, args.hash_size, args.threshold)
    print(f"Unique after dedup: {len(unique_imgs)}")

    for i, src in enumerate(tqdm(unique_imgs, desc="Copying")):
        dst = out_dir / f"neg_{i:06d}{src.suffix.lower()}"
        shutil.copy2(src, dst)

    print(f"Done! {len(unique_imgs)} images saved to {out_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
