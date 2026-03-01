# Task 95 — Coin classifier module + inference wiring
# Implemented for Sprint 0 by: Oluwafemi Lawal <Olawal7308@conestogac.on.ca>

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Any


def _bootstrap_repo_root() -> None:
    repo_root = Path(__file__).resolve().parents[2]
    repo_root_str = str(repo_root)
    if repo_root_str not in sys.path:
        sys.path.insert(0, repo_root_str)


_bootstrap_repo_root()


from training._sprint0_utils import (
    default_run_paths,
    read_json,
    stable_json_hash,
    utc_epoch_seconds,
    validate_class_map,
    write_json,
)

from training.coin_classifier._bytehist import Prediction, byte_histogram, l2_distance


def predict(model: dict[str, Any], path: Path) -> Prediction:
    feat = byte_histogram(path)
    best_label = None
    best_dist = None
    for label, centroid in model["centroids"].items():
        d = l2_distance(feat, centroid)
        if best_dist is None or d < best_dist:
            best_dist = d
            best_label = label
    score = 1.0 / (1.0 + float(best_dist or 0.0))
    return Prediction(label=str(best_label), score=score)


def main() -> int:
    parser = argparse.ArgumentParser(description="Sprint 0 coin classifier eval scaffold")
    parser.add_argument(
        "--config",
        type=Path,
        default=Path("training/configs/coin_classifier_config.json"),
    )
    parser.add_argument("--run-id", default="smoke")
    parser.add_argument("--val-dir", type=Path, default=Path("training/data/coin_val"))
    parser.add_argument("--smoke", action="store_true")
    args = parser.parse_args()

    config = read_json(args.config)
    classes = list(config.get("classes", []))
    class_map_check = validate_class_map(classes)

    run_paths = default_run_paths(args.run_id)
    model_path = run_paths.coin_run_dir / "model.json"
    if not model_path.exists():
        raise SystemExit(
            f"Missing model: {model_path}. Run training first (e.g. python training/coin_classifier/train_coin_classifier.py --smoke)."
        )
    model = read_json(model_path)

    val_dir = args.val_dir
    if args.smoke:
        # Reuse the smoke train set as val to keep the smoke path self-contained.
        val_dir = Path("training/outputs/_smoke_coin_train")

    start = utc_epoch_seconds()
    total = 0
    correct = 0
    per_class: dict[str, dict[str, int]] = {}
    for cls in sorted(classes):
        cls_dir = val_dir / cls
        per_class[cls] = {"total": 0, "correct": 0}
        if not cls_dir.exists():
            continue
        for p in [x for x in cls_dir.rglob("*") if x.is_file()]:
            pred = predict(model, p)
            total += 1
            per_class[cls]["total"] += 1
            if pred.label == cls:
                correct += 1
                per_class[cls]["correct"] += 1

    accuracy = (correct / total) if total else 0.0
    report = {
        "task": "95",
        "sprint": "0",
        "run_id": args.run_id,
        "started_at": start,
        "finished_at": utc_epoch_seconds(),
        "config_hash": stable_json_hash(config),
        "model_path": str(model_path.as_posix()),
        "accuracy": round(accuracy, 6),
        "total": total,
        "per_class": per_class,
        "class_map_check": class_map_check,
        "mode": "smoke" if args.smoke else "scaffold",
    }
    write_json(run_paths.reports_dir / "coin_classifier_report.json", report)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
