#!/usr/bin/env python3
"""Evaluate a trained bill classifier checkpoint on an ImageFolder test set."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

import numpy as np
import torch
from torch.utils.data import DataLoader
from torchvision import datasets, models, transforms

IMAGENET_MEAN = (0.485, 0.456, 0.406)
IMAGENET_STD = (0.229, 0.224, 0.225)


def resolve_device(device: str) -> torch.device:
    d = str(device).strip().lower()
    if d != "auto":
        return torch.device(device)
    if torch.cuda.is_available():
        return torch.device("cuda")
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


def resolve_workers(num_workers: int) -> int:
    if int(num_workers) >= 0:
        return int(num_workers)
    cpu = os.cpu_count() or 2
    return max(0, min(8, cpu - 1))


def build_model(backbone: str, num_classes: int):
    if backbone == "mobilenetv3_small":
        model = models.mobilenet_v3_small(weights=None)
        model.classifier[-1] = torch.nn.Linear(model.classifier[-1].in_features, num_classes)
        return model
    model = models.resnet18(weights=None)
    model.fc = torch.nn.Linear(model.fc.in_features, num_classes)
    return model


def main() -> int:
    parser = argparse.ArgumentParser(description="Evaluate bill classifier")
    parser.add_argument("--model", required=True)
    parser.add_argument(
        "--test-dir",
        default=str(Path("data") / "processed" / "bill_cutouts" / "test"),
        help="ImageFolder test root",
    )
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--num-workers", type=int, default=-1, help="-1 = auto")
    parser.add_argument("--device", default="auto")
    parser.add_argument("--report-out", default=str(Path("outputs") / "reports" / "bill_classifier_eval.json"))
    args = parser.parse_args()

    device = resolve_device(args.device)
    workers = resolve_workers(args.num_workers)

    ckpt = torch.load(args.model, map_location="cpu")
    classes = ckpt["classes"]
    image_size = int(ckpt.get("image_size", 256))
    backbone = ckpt.get("backbone", "resnet18")

    model = build_model(backbone, len(classes))
    model.load_state_dict(ckpt["model_state_dict"])
    model.to(device)
    model.eval()

    tfms = transforms.Compose(
        [
            transforms.Resize((image_size, image_size)),
            transforms.ToTensor(),
            transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
        ]
    )
    ds = datasets.ImageFolder(str(Path(args.test_dir)), transform=tfms)
    dl = DataLoader(
        ds,
        batch_size=int(args.batch_size),
        shuffle=False,
        num_workers=workers,
        pin_memory=(device.type == "cuda"),
    )

    n_classes = len(classes)
    conf = np.zeros((n_classes, n_classes), dtype=np.int64)
    correct = 0
    total = 0
    with torch.no_grad():
        for images, labels in dl:
            images = images.to(device)
            labels = labels.to(device)
            logits = model(images)
            pred = torch.softmax(logits, dim=1).argmax(dim=1)
            correct += (pred == labels).sum().item()
            total += labels.size(0)
            for i in range(labels.size(0)):
                conf[int(labels[i]), int(pred[i])] += 1

    overall = correct / max(total, 1)
    report = {
        "overall_accuracy": overall,
        "classes": classes,
        "confusion_matrix": conf.tolist(),
    }
    print(f"overall_acc={overall:.4f}")

    out_path = Path(args.report_out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"report_saved={out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
