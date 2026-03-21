#!/usr/bin/env python3
"""Evaluate a trained coin classifier checkpoint on an ImageFolder test set."""

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


def build_label_remap(dataset_classes: list[str], model_classes: list[str]) -> tuple[torch.Tensor, list[str], list[str]]:
    ds_classes = [str(c) for c in dataset_classes]
    mdl_classes = [str(c) for c in model_classes]
    model_to_idx = {name: i for i, name in enumerate(mdl_classes)}

    missing_from_model = [name for name in ds_classes if name not in model_to_idx]
    if missing_from_model:
        raise SystemExit(
            "Dataset classes missing from checkpoint classes: "
            f"{missing_from_model}. "
            f"dataset_classes={ds_classes} checkpoint_classes={mdl_classes}"
        )

    remap = torch.tensor([model_to_idx[name] for name in ds_classes], dtype=torch.long)
    return remap, ds_classes, mdl_classes


def main() -> int:
    parser = argparse.ArgumentParser(description="Evaluate coin classifier")
    parser.add_argument("--model", required=True)
    parser.add_argument("--real-test-dir", required=True, help="ImageFolder test root")
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--num-workers", type=int, default=-1, help="-1 = auto")
    parser.add_argument("--device", default="auto")
    parser.add_argument("--report-out", default="")
    args = parser.parse_args()

    device = resolve_device(args.device)
    workers = resolve_workers(args.num_workers)

    ckpt = torch.load(args.model, map_location="cpu")
    classes = [str(c) for c in ckpt["classes"]]
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
    ds = datasets.ImageFolder(args.real_test_dir, transform=tfms)
    label_remap, dataset_classes, model_classes = build_label_remap(ds.classes, classes)
    dl = DataLoader(
        ds,
        batch_size=int(args.batch_size),
        shuffle=False,
        num_workers=workers,
        pin_memory=(device.type == "cuda"),
    )

    n_classes = len(model_classes)
    conf = np.zeros((n_classes, n_classes), dtype=np.int64)
    correct = 0
    total = 0
    wrong_predictions = []
    sample_index = 0

    with torch.no_grad():
        for images, labels in dl:
            images = images.to(device)
            labels_model_cpu = label_remap[labels.cpu()]
            labels_model = labels_model_cpu.to(device)
            logits = model(images)
            probs = torch.softmax(logits, dim=1)
            pred = probs.argmax(dim=1)
            correct += int((pred == labels_model).sum().item())
            total += int(labels_model.size(0))
            for i in range(labels_model.size(0)):
                true_idx = int(labels_model_cpu[i].item())
                pred_idx = int(pred[i])
                conf[true_idx, pred_idx] += 1
                if pred_idx != true_idx:
                    file_path = ds.samples[sample_index][0] if sample_index < len(ds.samples) else ""
                    wrong_predictions.append(
                        {
                            "file": file_path,
                            "true_class": model_classes[true_idx],
                            "pred_class": model_classes[pred_idx],
                            "confidence": float(probs[i, pred_idx].item()),
                        }
                    )
                sample_index += 1

    overall = correct / max(total, 1)
    wrong_predictions.sort(key=lambda x: x["confidence"], reverse=True)
    report = {
        "overall_accuracy": overall,
        "classes": model_classes,
        "dataset_classes": dataset_classes,
        "dataset_to_model_index": {name: int(label_remap[idx]) for idx, name in enumerate(dataset_classes)},
        "confusion_matrix": conf.tolist(),
        "top_50_confident_wrong": wrong_predictions[:50],
    }

    print(f"overall_acc={overall:.4f}")
    if args.report_out:
        report_path = Path(args.report_out)
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(f"report_saved={report_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
