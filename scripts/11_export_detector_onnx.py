#!/usr/bin/env python3
"""Export YOLO detector to ONNX (optionally INT8 calibrated).

Notes:
  - INT8 export requires a dataset for calibration (`--data`), and may take time.
  - This script saves exported models locally under outputs/models/ by default.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from ultralytics import YOLO


def main() -> int:
    parser = argparse.ArgumentParser(description="Export YOLO detector to ONNX")
    parser.add_argument("--weights", required=True, help="Path to .pt weights")
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--out", default=str(Path("outputs") / "models" / "detector.onnx"))
    parser.add_argument("--int8", action="store_true", help="Export INT8 calibrated ONNX")
    parser.add_argument("--data", default="", help="Dataset yaml path (required for --int8)")
    args = parser.parse_args()

    if args.int8 and not args.data:
        raise SystemExit("--int8 requires --data <data.yaml> for calibration")

    model = YOLO(args.weights)
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    export_kwargs = {"format": "onnx", "imgsz": int(args.imgsz), "dynamic": False}
    if args.int8:
        export_kwargs["int8"] = True
        export_kwargs["data"] = args.data

    exported_filename = model.export(**export_kwargs)
    exported_path = Path(exported_filename)
    if exported_path.resolve() != out_path.resolve():
        exported_path.replace(out_path)
    print(f"exported={out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
