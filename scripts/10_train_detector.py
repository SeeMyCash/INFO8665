#!/usr/bin/env python3
"""Train a YOLO detector locally (Ultralytics)."""

from __future__ import annotations

import argparse
import os
from pathlib import Path
from typing import Any

import torch
from ultralytics import YOLO

from _runtime import load_repo_env
from _tracking import build_tracker

load_repo_env()


def str2bool(value: str) -> bool:
    return str(value).strip().lower() in {"1", "true", "yes", "y", "on"}


def resolve_device(device: str) -> str:
    d = str(device).strip().lower()
    if d != "auto":
        return device
    if torch.cuda.is_available():
        return "0"
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return "mps"
    return "cpu"


def resolve_workers(workers: int) -> int:
    if int(workers) >= 0:
        return int(workers)
    cpu = os.cpu_count() or 2
    return max(0, min(8, cpu - 1))


def resolve_cache(cache: str, device: str) -> Any:
    mode = str(cache).strip().lower()
    if mode == "auto":
        return "ram" if device != "cpu" else False
    if mode == "none":
        return False
    if mode in {"ram", "disk"}:
        return mode
    raise ValueError(f"Unsupported cache mode: {cache}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Train YOLO detector")
    parser.add_argument("--data", required=True, help="Path to dataset.yaml")
    parser.add_argument("--weights", default="yolo26n.pt", help="Base weights path or model name")
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--epochs", type=int, default=60)
    parser.add_argument("--batch", type=int, default=16)
    parser.add_argument("--device", default="auto", help="auto, cpu, mps, 0, 0,1, ...")
    parser.add_argument("--workers", type=int, default=-1, help="-1 = auto")
    parser.add_argument("--cache", choices=["auto", "none", "ram", "disk"], default="auto")
    parser.add_argument("--patience", type=int, default=20)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--amp", type=str2bool, default="true")
    parser.add_argument("--cos-lr", type=str2bool, default="true")
    parser.add_argument("--optimizer", default="auto")
    parser.add_argument("--lr0", type=float, default=1e-2)
    parser.add_argument("--lrf", type=float, default=1e-2)
    parser.add_argument("--momentum", type=float, default=0.937)
    parser.add_argument("--weight-decay", type=float, default=5e-4)
    parser.add_argument("--warmup-epochs", type=float, default=3.0)
    parser.add_argument("--close-mosaic", type=int, default=10)
    parser.add_argument("--mosaic", type=float, default=1.0)
    parser.add_argument("--mixup", type=float, default=0.1)
    parser.add_argument("--copy-paste", type=float, default=0.1)
    parser.add_argument("--degrees", type=float, default=10.0)
    parser.add_argument("--translate", type=float, default=0.1)
    parser.add_argument("--scale", type=float, default=0.5)
    parser.add_argument("--shear", type=float, default=2.0)
    parser.add_argument("--perspective", type=float, default=0.0005)
    parser.add_argument("--fliplr", type=float, default=0.5)
    parser.add_argument("--flipud", type=float, default=0.0)
    parser.add_argument("--val-split", default="val", help="val or test")
    parser.add_argument("--project", default="outputs/models")
    parser.add_argument("--run-name", default="cad_yolo_local")
    parser.add_argument("--mlflow-experiment", default="", help="Override MLflow experiment name")
    parser.add_argument("--mlflow-run-name", default="", help="Override MLflow run name")
    parser.add_argument("--disable-mlflow", action="store_true", help="Disable MLflow logging for this run")
    args = parser.parse_args()

    device = resolve_device(args.device)
    workers = resolve_workers(args.workers)
    cache_mode = resolve_cache(args.cache, device=device)
    use_amp = bool(str2bool(str(args.amp)) and device not in {"cpu", "mps"})

    print(
        "training_config="
        f"device:{device} workers:{workers} cache:{cache_mode} amp:{use_amp} "
        f"epochs:{args.epochs} batch:{args.batch} patience:{args.patience}"
    )

    tracker = build_tracker(
        component="detector_train",
        experiment_name=args.mlflow_experiment,
        run_name=args.mlflow_run_name or args.run_name,
        enabled=not args.disable_mlflow,
        extra_tags={"framework": "ultralytics", "task": "train"},
    )

    with tracker:
        tracker.log_params(
            {
                **vars(args),
                "resolved_device": device,
                "resolved_workers": workers,
                "resolved_cache": cache_mode,
                "resolved_amp": use_amp,
            }
        )
        data_path = Path(args.data)
        if data_path.exists():
            tracker.log_artifact(data_path, artifact_path="inputs")

        model = YOLO(args.weights)
        model.train(
            data=args.data,
            imgsz=args.imgsz,
            epochs=args.epochs,
            batch=args.batch,
            device=device,
            workers=workers,
            cache=cache_mode,
            amp=use_amp,
            patience=int(args.patience),
            seed=int(args.seed),
            cos_lr=bool(str2bool(str(args.cos_lr))),
            optimizer=args.optimizer,
            lr0=float(args.lr0),
            lrf=float(args.lrf),
            momentum=float(args.momentum),
            weight_decay=float(args.weight_decay),
            warmup_epochs=float(args.warmup_epochs),
            close_mosaic=int(args.close_mosaic),
            mosaic=float(args.mosaic),
            mixup=float(args.mixup),
            copy_paste=float(args.copy_paste),
            degrees=float(args.degrees),
            translate=float(args.translate),
            scale=float(args.scale),
            shear=float(args.shear),
            perspective=float(args.perspective),
            fliplr=float(args.fliplr),
            flipud=float(args.flipud),
            project=args.project,
            name=args.run_name,
            exist_ok=True,
            plots=True,
        )
        metrics = model.val(data=args.data, split=args.val_split, imgsz=args.imgsz, device=device)

        final_metrics = {
            "val_mAP50": float(metrics.box.map50),
            "val_mAP50_95": float(metrics.box.map),
            "val_precision": float(metrics.box.mp),
            "val_recall": float(metrics.box.mr),
        }
        save_dir = Path(getattr(getattr(model, "trainer", None), "save_dir", Path(args.project) / args.run_name))
        tracker.log_metrics(final_metrics)
        tracker.log_dict(final_metrics, "metrics/final.json")
        tracker.log_artifacts(save_dir, artifact_path="training_output")

        print(f"mAP50={final_metrics['val_mAP50']}")
        print(f"mAP50-95={final_metrics['val_mAP50_95']}")
        print(f"precision={final_metrics['val_precision']}")
        print(f"recall={final_metrics['val_recall']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
