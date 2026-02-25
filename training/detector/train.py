# Task 76 — YOLO training environment reproducibility
# Task 73 — Train detector end-to-end
# Implemented for Sprint 0 by: Jarius Bedward

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

from training._sprint0_utils import (
    default_run_paths,
    deterministic_rng,
    read_json,
    stable_json_hash,
    utc_epoch_seconds,
    validate_class_map,
    write_json,
)


def _fake_train(seed: int, steps: int) -> dict[str, Any]:
    rng = deterministic_rng(seed)
    weights = [round(rng.random(), 8) for _ in range(32)]
    loss_curve = [round(1.0 / (1 + i) + rng.random() * 0.01, 6) for i in range(steps)]
    return {
        "weights": weights,
        "loss_curve": loss_curve,
        "final_loss": loss_curve[-1] if loss_curve else None,
    }


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Sprint 0 detector training scaffold")
    parser.add_argument(
        "--config",
        type=Path,
        default=Path("training/configs/detector_config.json"),
        help="Path to detector config JSON",
    )
    parser.add_argument(
        "--run-id",
        default="smoke",
        help="Run identifier (used for output folder names)",
    )
    parser.add_argument(
        "--smoke",
        action="store_true",
        help="Run a deterministic lightweight training (no ML dependencies)",
    )
    parser.add_argument("--steps", type=int, default=10)
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_arg_parser()
    args = parser.parse_args(argv)

    config = read_json(args.config)
    seed = int(config.get("seed", 1337))
    classes = config.get("classes", [])
    class_map_check = validate_class_map(classes)
    if class_map_check["has_duplicates"]:
        raise SystemExit(f"Duplicate classes in config: {class_map_check['duplicates']}")

    run_paths = default_run_paths(args.run_id)
    run_dir = run_paths.detector_run_dir
    checkpoint_path = run_dir / "checkpoint.json"
    metrics_path = run_dir / "metrics.json"

    start = utc_epoch_seconds()

    model = _fake_train(seed=seed, steps=int(args.steps))
    checkpoint = {
        "format": "sprint0-checkpoint",
        "seed": seed,
        "config_hash": stable_json_hash(config),
        "model": model,
    }
    write_json(checkpoint_path, checkpoint)

    metrics = {
        "run_id": args.run_id,
        "seed": seed,
        "steps": int(args.steps),
        "final_loss": model["final_loss"],
        "class_map_check": class_map_check,
    }
    write_json(metrics_path, metrics)

    end = utc_epoch_seconds()
    manifest = {
        "task": "73",
        "sprint": "0",
        "run_id": args.run_id,
        "started_at": start,
        "finished_at": end,
        "config_path": str(args.config.as_posix()),
        "config_hash": stable_json_hash(config),
        "outputs": {
            "checkpoint": str(checkpoint_path.as_posix()),
            "metrics": str(metrics_path.as_posix()),
        },
        "mode": "smoke" if args.smoke else "scaffold",
    }
    write_json(run_paths.manifests_dir / f"detector_run_{args.run_id}.json", manifest)
    return 0
