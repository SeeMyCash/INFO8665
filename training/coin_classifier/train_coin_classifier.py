# Task 95 — Coin classifier module + inference wiring
# Implemented for Sprint 0 by: Oluwafemi Lawal

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
    deterministic_rng,
    read_json,
    stable_json_hash,
    utc_epoch_seconds,
    validate_class_map,
    write_json,
)

from training.coin_classifier._bytehist import byte_histogram, mean_vector


def _write_smoke_dataset(root: Path, seed: int, classes: list[str], files_per_class: int = 3) -> None:
    rng = deterministic_rng(seed)
    for cls in classes:
        cls_dir = root / cls
        cls_dir.mkdir(parents=True, exist_ok=True)
        for i in range(files_per_class):
            payload = bytes(rng.randrange(0, 256) for _ in range(2048))
            (cls_dir / f"sample_{i:03d}.bin").write_bytes(payload)


def main() -> int:
    parser = argparse.ArgumentParser(description="Sprint 0 coin classifier training scaffold")
    parser.add_argument(
        "--config",
        type=Path,
        default=Path("training/configs/coin_classifier_config.json"),
    )
    parser.add_argument("--run-id", default="smoke")
    parser.add_argument("--train-dir", type=Path, default=Path("training/data/coin_train"))
    parser.add_argument("--smoke", action="store_true")
    args = parser.parse_args()

    config = read_json(args.config)
    seed = int(config.get("seed", 2026))
    classes = list(config.get("classes", []))
    class_map_check = validate_class_map(classes)
    if class_map_check["has_duplicates"]:
        raise SystemExit(f"Duplicate classes in config: {class_map_check['duplicates']}")

    train_dir = args.train_dir
    if args.smoke:
        train_dir = Path("training/outputs/_smoke_coin_train")
        _write_smoke_dataset(train_dir, seed=seed, classes=classes)

    if not train_dir.exists():
        raise SystemExit(f"Train dir not found: {train_dir}")

    run_paths = default_run_paths(args.run_id)
    run_dir = run_paths.coin_run_dir
    model_path = run_dir / "model.json"

    start = utc_epoch_seconds()

    centroids: dict[str, list[float]] = {}
    files_seen: dict[str, int] = {}
    for cls in sorted(classes):
        cls_dir = train_dir / cls
        if not cls_dir.exists():
            raise SystemExit(f"Missing class folder: {cls_dir}")
        samples = [p for p in cls_dir.rglob("*") if p.is_file()]
        files_seen[cls] = len(samples)
        centroids[cls] = mean_vector(byte_histogram(p) for p in samples)

    model = {
        "format": "sprint0-coin-centroid",
        "task": "95",
        "sprint": "0",
        "run_id": args.run_id,
        "seed": seed,
        "config_hash": stable_json_hash(config),
        "classes": sorted(classes),
        "centroids": centroids,
        "files_seen": files_seen,
    }
    write_json(model_path, model)

    end = utc_epoch_seconds()
    manifest = {
        "task": "95",
        "sprint": "0",
        "run_id": args.run_id,
        "started_at": start,
        "finished_at": end,
        "train_dir": str(train_dir.as_posix()),
        "config_path": str(args.config.as_posix()),
        "config_hash": stable_json_hash(config),
        "outputs": {"model": str(model_path.as_posix())},
        "mode": "smoke" if args.smoke else "scaffold",
    }
    write_json(run_paths.manifests_dir / f"coin_classifier_train_{args.run_id}.json", manifest)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
