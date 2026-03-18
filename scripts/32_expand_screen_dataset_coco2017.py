#!/usr/bin/env python3
"""Build an expanded single-class YOLO screen dataset from COCO 2017.

This script selects images containing any of these COCO categories:
  - tv
  - laptop
  - cell phone

It writes a YOLO dataset with one class ("screen") and optional negatives.
"""

from __future__ import annotations

import argparse
import json
import random
import shutil
import time
import urllib.request
import zipfile
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any, Dict, List, Tuple


COCO_ANN_URL = "http://images.cocodataset.org/annotations/annotations_trainval2017.zip"
COCO_SPLIT_BASE = {
    "train2017": "http://images.cocodataset.org/train2017/",
    "val2017": "http://images.cocodataset.org/val2017/",
}
SCREEN_CLASS_NAMES = {"tv", "laptop", "cell phone"}


def _download(url: str, out_path: Path, timeout_s: float = 30.0) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "smc-screen-builder/1.0"})
    with urllib.request.urlopen(req, timeout=timeout_s) as r:
        out_path.write_bytes(r.read())


def _download_with_retries(
    url: str,
    out_path: Path,
    retries: int = 3,
    timeout_s: float = 30.0,
) -> None:
    last_exc: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            _download(url, out_path, timeout_s=timeout_s)
            return
        except Exception as exc:  # pragma: no cover - network failures are nondeterministic
            last_exc = exc
            if attempt < retries:
                time.sleep(0.5 * attempt)
    assert last_exc is not None
    raise last_exc


def _ensure_annotations(workdir: Path, ann_url: str, timeout_s: float) -> Path:
    zip_path = workdir / "annotations_trainval2017.zip"
    ann_json = workdir / "annotations" / "instances_train2017.json"
    if not ann_json.exists():
        if not zip_path.exists():
            print(f"download_annotations={ann_url}")
            _download(ann_url, zip_path, timeout_s=timeout_s)
        with zipfile.ZipFile(zip_path, "r") as zf:
            zf.extractall(workdir)
    return workdir / "annotations"


def _load_json(path: Path) -> Dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _screen_category_ids(coco: Dict[str, Any]) -> set[int]:
    ids = set()
    for c in coco.get("categories", []):
        if str(c.get("name", "")).strip().lower() in SCREEN_CLASS_NAMES:
            try:
                ids.add(int(c["id"]))
            except Exception:
                continue
    return ids


def _build_split_samples(
    coco: Dict[str, Any],
    split: str,
    pos_target: int,
    neg_ratio: float,
    seed: int,
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    rng = random.Random(seed)
    images_by_id: Dict[int, Dict[str, Any]] = {}
    for img in coco.get("images", []):
        try:
            images_by_id[int(img["id"])] = img
        except Exception:
            continue

    screen_cat_ids = _screen_category_ids(coco)
    anns_by_img: Dict[int, List[Dict[str, Any]]] = defaultdict(list)
    for ann in coco.get("annotations", []):
        try:
            img_id = int(ann["image_id"])
            cat_id = int(ann["category_id"])
        except Exception:
            continue
        if cat_id not in screen_cat_ids:
            continue
        if int(ann.get("iscrowd", 0)) != 0:
            continue
        anns_by_img[img_id].append(ann)

    pos_ids = [img_id for img_id in anns_by_img.keys() if img_id in images_by_id]
    neg_ids = [img_id for img_id in images_by_id.keys() if img_id not in anns_by_img]
    rng.shuffle(pos_ids)
    rng.shuffle(neg_ids)

    selected_pos_ids = pos_ids[: max(0, min(pos_target, len(pos_ids)))]
    neg_target = int(round(len(selected_pos_ids) * max(0.0, neg_ratio)))
    selected_neg_ids = neg_ids[: max(0, min(neg_target, len(neg_ids)))]

    samples: List[Dict[str, Any]] = []
    for img_id in selected_pos_ids:
        img = images_by_id[img_id]
        samples.append(
            {
                "split": split,
                "img": img,
                "anns": anns_by_img.get(img_id, []),
                "is_positive": True,
            }
        )
    for img_id in selected_neg_ids:
        img = images_by_id[img_id]
        samples.append(
            {
                "split": split,
                "img": img,
                "anns": [],
                "is_positive": False,
            }
        )

    stats = {
        "split": split,
        "available_positive": len(pos_ids),
        "available_negative": len(neg_ids),
        "selected_positive": len(selected_pos_ids),
        "selected_negative": len(selected_neg_ids),
        "selected_total": len(samples),
    }
    return samples, stats


def _image_url(img: Dict[str, Any], split: str) -> str:
    coco_url = str(img.get("coco_url", "")).strip()
    if coco_url:
        return coco_url
    base = COCO_SPLIT_BASE[split]
    file_name = str(img.get("file_name", "")).strip()
    if not file_name:
        raise ValueError("Image file_name missing from COCO metadata")
    return f"{base}{file_name}"


def _to_yolo_line(ann: Dict[str, Any], img_w: int, img_h: int) -> str | None:
    bbox = ann.get("bbox", [])
    if not isinstance(bbox, list) or len(bbox) < 4:
        return None
    try:
        x, y, w, h = [float(v) for v in bbox[:4]]
    except Exception:
        return None
    if w <= 1.0 or h <= 1.0 or img_w <= 1 or img_h <= 1:
        return None

    cx = (x + (w / 2.0)) / float(img_w)
    cy = (y + (h / 2.0)) / float(img_h)
    nw = w / float(img_w)
    nh = h / float(img_h)

    cx = max(0.0, min(1.0, cx))
    cy = max(0.0, min(1.0, cy))
    nw = max(0.0, min(1.0, nw))
    nh = max(0.0, min(1.0, nh))
    if nw <= 0.0 or nh <= 0.0:
        return None
    return f"0 {cx:.6f} {cy:.6f} {nw:.6f} {nh:.6f}"


def _write_label(path: Path, anns: List[Dict[str, Any]], img_w: int, img_h: int) -> int:
    lines: List[str] = []
    for ann in anns:
        line = _to_yolo_line(ann, img_w=img_w, img_h=img_h)
        if line:
            lines.append(line)
    path.write_text("\n".join(lines) + ("\n" if lines else ""), encoding="utf-8")
    return len(lines)


def _prepare_out_root(path: Path) -> None:
    if path.exists():
        shutil.rmtree(path)
    (path / "images" / "train").mkdir(parents=True, exist_ok=True)
    (path / "images" / "val").mkdir(parents=True, exist_ok=True)
    (path / "labels" / "train").mkdir(parents=True, exist_ok=True)
    (path / "labels" / "val").mkdir(parents=True, exist_ok=True)


def _process_one_sample(
    sample: Dict[str, Any],
    out_root: Path,
    retries: int,
    timeout_s: float,
) -> Dict[str, Any]:
    split_name = "train" if sample["split"] == "train2017" else "val"
    img = sample["img"]
    anns = sample["anns"]
    file_name = str(img.get("file_name", "")).strip()
    stem = Path(file_name).stem
    img_path = out_root / "images" / split_name / file_name
    lbl_path = out_root / "labels" / split_name / f"{stem}.txt"

    if not file_name:
        return {"ok": False, "split": split_name, "reason": "missing_file_name"}

    try:
        url = _image_url(img, sample["split"])
        _download_with_retries(url, img_path, retries=retries, timeout_s=timeout_s)
        boxes = _write_label(
            lbl_path,
            anns=anns,
            img_w=int(img.get("width", 0)),
            img_h=int(img.get("height", 0)),
        )
        return {
            "ok": True,
            "split": split_name,
            "is_positive": bool(sample.get("is_positive", False)),
            "boxes": int(boxes),
        }
    except Exception as exc:  # pragma: no cover - network failures are nondeterministic
        return {"ok": False, "split": split_name, "reason": str(exc)}


def _write_data_yaml(out_root: Path) -> None:
    (out_root / "data.yaml").write_text(
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


def main() -> int:
    parser = argparse.ArgumentParser(description="Expand screen YOLO dataset using COCO 2017")
    parser.add_argument(
        "--workdir",
        default=str(Path("outputs") / "tmp" / "coco2017_screen_builder"),
        help="Temporary workspace for annotation files",
    )
    parser.add_argument(
        "--out-root",
        default=str(Path("outputs") / "datasets" / "screen_coco2017_expanded_v1"),
        help="Destination YOLO dataset root",
    )
    parser.add_argument("--train-pos-target", type=int, default=1200)
    parser.add_argument("--val-pos-target", type=int, default=300)
    parser.add_argument("--train-neg-ratio", type=float, default=1.5)
    parser.add_argument("--val-neg-ratio", type=float, default=1.0)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--max-workers", type=int, default=16)
    parser.add_argument("--retries", type=int, default=3)
    parser.add_argument("--timeout-seconds", type=float, default=30.0)
    parser.add_argument("--annotations-url", default=COCO_ANN_URL)
    args = parser.parse_args()

    workdir = Path(args.workdir)
    out_root = Path(args.out_root)
    workdir.mkdir(parents=True, exist_ok=True)
    _prepare_out_root(out_root)

    ann_dir = _ensure_annotations(
        workdir=workdir, ann_url=args.annotations_url, timeout_s=float(args.timeout_seconds)
    )
    train_json = ann_dir / "instances_train2017.json"
    val_json = ann_dir / "instances_val2017.json"
    if not train_json.exists() or not val_json.exists():
        raise SystemExit(f"Missing COCO annotation JSON files under: {ann_dir}")

    train_coco = _load_json(train_json)
    val_coco = _load_json(val_json)

    train_samples, train_plan = _build_split_samples(
        train_coco,
        split="train2017",
        pos_target=int(args.train_pos_target),
        neg_ratio=float(args.train_neg_ratio),
        seed=int(args.seed),
    )
    val_samples, val_plan = _build_split_samples(
        val_coco,
        split="val2017",
        pos_target=int(args.val_pos_target),
        neg_ratio=float(args.val_neg_ratio),
        seed=int(args.seed) + 1,
    )

    print(
        "train_plan "
        f"available_pos={train_plan['available_positive']} "
        f"selected_pos={train_plan['selected_positive']} "
        f"selected_neg={train_plan['selected_negative']} "
        f"selected_total={train_plan['selected_total']}"
    )
    print(
        "val_plan "
        f"available_pos={val_plan['available_positive']} "
        f"selected_pos={val_plan['selected_positive']} "
        f"selected_neg={val_plan['selected_negative']} "
        f"selected_total={val_plan['selected_total']}"
    )

    all_samples = train_samples + val_samples
    if not all_samples:
        raise SystemExit("No samples selected. Increase targets or verify category mapping.")

    stats = {
        "train": {"images_ok": 0, "images_fail": 0, "positive_images": 0, "positive_boxes": 0},
        "val": {"images_ok": 0, "images_fail": 0, "positive_images": 0, "positive_boxes": 0},
    }

    with ThreadPoolExecutor(max_workers=max(1, int(args.max_workers))) as ex:
        futures = [
            ex.submit(
                _process_one_sample,
                sample=s,
                out_root=out_root,
                retries=max(1, int(args.retries)),
                timeout_s=float(args.timeout_seconds),
            )
            for s in all_samples
        ]
        for fut in as_completed(futures):
            res = fut.result()
            split = str(res.get("split", "train"))
            if split not in stats:
                continue
            if bool(res.get("ok")):
                stats[split]["images_ok"] += 1
                if bool(res.get("is_positive")):
                    stats[split]["positive_images"] += 1
                    stats[split]["positive_boxes"] += int(res.get("boxes", 0))
            else:
                stats[split]["images_fail"] += 1

    _write_data_yaml(out_root)

    print(f"dataset_out={out_root.resolve()}")
    print(
        "train_stats "
        f"images_ok={stats['train']['images_ok']} "
        f"images_fail={stats['train']['images_fail']} "
        f"positive_images={stats['train']['positive_images']} "
        f"positive_boxes={stats['train']['positive_boxes']}"
    )
    print(
        "val_stats "
        f"images_ok={stats['val']['images_ok']} "
        f"images_fail={stats['val']['images_fail']} "
        f"positive_images={stats['val']['positive_images']} "
        f"positive_boxes={stats['val']['positive_boxes']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
