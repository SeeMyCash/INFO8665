#!/usr/bin/env python3
"""Export YOLO detector to ONNX and quantize to INT8 with ONNX Runtime.

This is a compatibility fallback for Ultralytics builds where `model.export(..., int8=True)`
is not supported for ONNX.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from onnxruntime.quantization import QuantType, quantize_dynamic
from ultralytics import YOLO


def main() -> int:
    parser = argparse.ArgumentParser(description="Detector ONNX + ORT dynamic INT8 quantization")
    parser.add_argument("--weights", required=True, help="Path to detector .pt weights")
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--onnx-out", default=str(Path("outputs") / "models" / "detector.onnx"))
    parser.add_argument("--int8-out", default=str(Path("outputs") / "models" / "detector_quantized_int8.onnx"))
    args = parser.parse_args()

    onnx_out = Path(args.onnx_out)
    onnx_out.parent.mkdir(parents=True, exist_ok=True)

    model = YOLO(args.weights)
    exported = Path(model.export(format="onnx", imgsz=int(args.imgsz), dynamic=False))
    if exported.resolve() != onnx_out.resolve():
        exported.replace(onnx_out)

    int8_out = Path(args.int8_out)
    int8_out.parent.mkdir(parents=True, exist_ok=True)

    quantize_dynamic(
        model_input=str(onnx_out),
        model_output=str(int8_out),
        weight_type=QuantType.QInt8,
    )

    print(f"exported_onnx={onnx_out}")
    print(f"quantized_int8={int8_out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
