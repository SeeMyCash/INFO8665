#!/usr/bin/env python3
"""SageMaker entry-point for YOLO screen detector fine-tuning."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


def _ensure_ultralytics() -> None:
    try:
        import ultralytics  # noqa: F401
        return
    except Exception:
        pass
    subprocess.check_call([sys.executable, "-m", "pip", "install", "ultralytics>=8.3.200"])


def _find_data_yaml(data_root: Path) -> Path:
    direct = data_root / "data.yaml"
    if direct.exists():
        return direct
    found = list(data_root.rglob("data.yaml"))
    if not found:
        raise FileNotFoundError(f"Could not find data.yaml under {data_root}")
    return found[0]


def _make_resolved_data_yaml(data_yaml: Path) -> Path:
    import yaml

    spec = yaml.safe_load(data_yaml.read_text(encoding="utf-8")) or {}
    if not isinstance(spec, dict):
        raise ValueError(f"Expected mapping in {data_yaml}, got {type(spec)}")

    dataset_root = data_yaml.parent
    base = spec.get("path", ".")
    base_path = Path(base)
    if not base_path.is_absolute():
        base_path = (dataset_root / base_path).resolve()

    spec["path"] = str(base_path)

    tmp_dir = Path(tempfile.mkdtemp(prefix="sm_screen_data_"))
    resolved_yaml = tmp_dir / "data.yaml"
    resolved_yaml.write_text(yaml.safe_dump(spec, sort_keys=False), encoding="utf-8")
    return resolved_yaml


def _resolve_device() -> str:
    try:
        import torch

        if torch.cuda.is_available():
            return "0"
        if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            return "mps"
        return "cpu"
    except Exception:
        return "cpu"


def main() -> int:
    parser = argparse.ArgumentParser(description="Fine-tune YOLO screen detector on SageMaker")
    parser.add_argument("--data-root", default="/opt/ml/input/data/train")
    parser.add_argument("--weights", default="yolo11n.pt")
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--batch", type=int, default=16)
    parser.add_argument("--workers", type=int, default=8)
    parser.add_argument("--project", default="/opt/ml/output/yolo_runs")
    parser.add_argument("--run-name", default="screen-yolo-sm")
    args = parser.parse_args()

    _ensure_ultralytics()
    from ultralytics import YOLO

    data_root = Path(args.data_root)
    data_yaml = _find_data_yaml(data_root)
    resolved_data_yaml = _make_resolved_data_yaml(data_yaml)
    device = _resolve_device()

    print(f"data_yaml={data_yaml}", flush=True)
    print(f"resolved_data_yaml={resolved_data_yaml}", flush=True)
    print(f"device={device}", flush=True)

    model = YOLO(args.weights)
    train_res = model.train(
        data=str(resolved_data_yaml),
        epochs=int(args.epochs),
        imgsz=int(args.imgsz),
        batch=int(args.batch),
        workers=int(args.workers),
        device=device,
        project=str(args.project),
        name=str(args.run_name),
        exist_ok=True,
        patience=10,
        cache=False,
        plots=True,
    )

    save_dir = Path(getattr(train_res, "save_dir", Path(args.project) / args.run_name))
    best = save_dir / "weights" / "best.pt"
    last = save_dir / "weights" / "last.pt"
    chosen = best if best.exists() else last
    if not chosen.exists():
        raise FileNotFoundError(f"No best.pt/last.pt found in {save_dir / 'weights'}")

    model_dir = Path("/opt/ml/model")
    model_dir.mkdir(parents=True, exist_ok=True)
    out_model = model_dir / "model.pt"
    shutil.copy2(chosen, out_model)

    summary = {
        "data_yaml": str(data_yaml),
        "resolved_data_yaml": str(resolved_data_yaml),
        "save_dir": str(save_dir),
        "selected_weights": str(chosen),
        "model_out": str(out_model),
        "device": device,
        "epochs": int(args.epochs),
        "imgsz": int(args.imgsz),
        "batch": int(args.batch),
    }
    (model_dir / "training_summary.json").write_text(
        json.dumps(summary, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(summary), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
