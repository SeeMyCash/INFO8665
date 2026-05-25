#!/usr/bin/env python3
"""Quantize a torchvision classifier checkpoint and save TorchScript locally.

This uses dynamic quantization on Linear layers (CPU-friendly) and exports TorchScript.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import torch
import torch.nn as nn
from torchvision import models


def build_model(backbone: str, num_classes: int):
    if backbone == "mobilenetv3_small":
        model = models.mobilenet_v3_small(weights=None)
        model.classifier[-1] = nn.Linear(model.classifier[-1].in_features, num_classes)
        return model
    model = models.resnet18(weights=None)
    model.fc = nn.Linear(model.fc.in_features, num_classes)
    return model


def main() -> int:
    parser = argparse.ArgumentParser(description="Quantize classifier checkpoint -> TorchScript")
    parser.add_argument("--checkpoint", required=True, help="Path to .pt checkpoint from training scripts")
    parser.add_argument("--out", default=str(Path("outputs") / "models" / "classifier_quantized.ts.pt"))
    parser.add_argument("--meta-out", default=str(Path("outputs") / "models" / "classifier_quantized.meta.json"))
    args = parser.parse_args()

    ckpt_path = Path(args.checkpoint)
    ckpt = torch.load(ckpt_path, map_location="cpu")
    classes = ckpt["classes"]
    image_size = int(ckpt.get("image_size", 256))
    backbone = ckpt.get("backbone", "resnet18")

    model = build_model(backbone, len(classes))
    model.load_state_dict(ckpt["model_state_dict"])
    model.eval()

    quantized = torch.ao.quantization.quantize_dynamic(model, {nn.Linear}, dtype=torch.qint8)
    example = torch.zeros(1, 3, image_size, image_size)
    traced = torch.jit.trace(quantized, example)

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    traced.save(str(out_path))

    meta = {
        "source_checkpoint": str(ckpt_path.as_posix()),
        "classes": classes,
        "image_size": image_size,
        "backbone": backbone,
        "quantization": "dynamic_int8_linear",
        "torchscript": str(out_path.as_posix()),
    }
    meta_path = Path(args.meta_out)
    meta_path.parent.mkdir(parents=True, exist_ok=True)
    meta_path.write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")
    print(f"saved_torchscript={out_path}")
    print(f"saved_meta={meta_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
