#!/usr/bin/env python3
"""Train a YOLO detector locally (Ultralytics).

This is intentionally local-first and does not embed any cloud or account config.
"""

from __future__ import annotations

import argparse
from ultralytics import YOLO


def main() -> int:
    parser = argparse.ArgumentParser(description="Train YOLO detector")
    parser.add_argument("--data", required=True, help="Path to dataset.yaml")
    parser.add_argument("--weights", default="yolo26n.pt", help="Base weights path or model name")
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--epochs", type=int, default=25)
    parser.add_argument("--batch", type=int, default=16)
    parser.add_argument("--project", default="outputs/models")
    parser.add_argument("--run-name", default="cad_yolo_local")
    args = parser.parse_args()

    model = YOLO(args.weights)
    model.train(
        data=args.data,
        imgsz=args.imgsz,
        epochs=args.epochs,
        batch=args.batch,
        project=args.project,
        name=args.run_name,
        exist_ok=True,
        plots=True,
    )
    metrics = model.val()
    print(f"mAP50={metrics.box.map50}")
    print(f"mAP50-95={metrics.box.map}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
