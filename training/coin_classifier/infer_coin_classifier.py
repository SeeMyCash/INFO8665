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


from training._sprint0_utils import default_run_paths, read_json, write_json
from training.coin_classifier.eval_coin_classifier import predict


def _write_smoke_input(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(b"SMOKE" * 512)


def main() -> int:
    parser = argparse.ArgumentParser(description="Sprint 0 coin classifier inference scaffold")
    parser.add_argument("--run-id", default="smoke")
    parser.add_argument("--input", type=Path, default=Path("training/outputs/_smoke_infer/input.bin"))
    parser.add_argument("--out", type=Path, default=Path("training/outputs/_smoke_infer/prediction.json"))
    parser.add_argument("--smoke", action="store_true")
    args = parser.parse_args()

    if args.smoke:
        _write_smoke_input(args.input)

    run_paths = default_run_paths(args.run_id)
    model_path = run_paths.coin_run_dir / "model.json"
    if not model_path.exists():
        raise SystemExit(
            f"Missing model: {model_path}. Train first (python training/coin_classifier/train_coin_classifier.py --smoke)."
        )
    model: dict[str, Any] = read_json(model_path)

    pred = predict(model, args.input)
    payload = {"label": pred.label, "confidence": round(float(pred.score), 6)}
    write_json(args.out, payload)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
