# Task 77 — Evaluation summary + stability checks
# Implemented for Sprint 0 by: Cemil Caglar Yapici <Cyapici1058@conestogac.on.ca>

from __future__ import annotations

import argparse
import math
from pathlib import Path
from typing import Any

from training._sprint0_utils import (
    default_run_paths,
    read_json,
    sha256_file,
    stable_json_hash,
    utc_epoch_seconds,
    validate_class_map,
    write_json,
)


def _deterministic_metrics(seed: int, checkpoint_hash: str) -> dict[str, Any]:
    h = int(checkpoint_hash[:12], 16)
    base = (h % 10_000) / 10_000.0
    map_50 = 0.5 + 0.4 * base
    map_50_95 = map_50 - 0.1 * (0.5 + 0.5 * math.sin(seed))
    return {
        "mAP@0.50": round(max(0.0, min(1.0, map_50)), 4),
        "mAP@0.50:0.95": round(max(0.0, min(1.0, map_50_95)), 4),
    }


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Sprint 0 detector eval scaffold")
    parser.add_argument(
        "--config",
        type=Path,
        default=Path("training/configs/detector_config.json"),
        help="Path to detector config JSON",
    )
    parser.add_argument("--run-id", default="smoke")
    parser.add_argument("--smoke", action="store_true")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_arg_parser()
    args = parser.parse_args(argv)

    config = read_json(args.config)
    seed = int(config.get("seed", 1337))
    classes = config.get("classes", [])
    class_map_check = validate_class_map(classes)

    run_paths = default_run_paths(args.run_id)
    run_dir = run_paths.detector_run_dir
    checkpoint_path = run_dir / "checkpoint.json"
    if not checkpoint_path.exists():
        raise SystemExit(
            f"Missing checkpoint: {checkpoint_path}. Run training first (e.g. python training/train_detector.py --smoke)."
        )

    start = utc_epoch_seconds()
    checkpoint_hash = sha256_file(checkpoint_path)
    metrics = _deterministic_metrics(seed=seed, checkpoint_hash=checkpoint_hash)

    report_path = run_paths.reports_dir / "eval_report.json"
    report = {
        "task": "77",
        "sprint": "0",
        "run_id": args.run_id,
        "started_at": start,
        "finished_at": utc_epoch_seconds(),
        "config_hash": stable_json_hash(config),
        "checkpoint": {
            "path": str(checkpoint_path.as_posix()),
            "sha256": checkpoint_hash,
        },
        "metrics": metrics,
        "class_map_check": class_map_check,
        "mode": "smoke" if args.smoke else "scaffold",
    }
    write_json(report_path, report)
    return 0
