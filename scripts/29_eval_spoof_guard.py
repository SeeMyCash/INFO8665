#!/usr/bin/env python3
"""Evaluate spoof-guard classifier checkpoint on an ImageFolder test set."""

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


def _spoof_index(classes: list[str]) -> int:
    for idx, cls in enumerate(classes):
        name = str(cls).strip().lower()
        if (
            "spoof" in name
            or "screen" in name
            or "replay" in name
            or "attack" in name
            or "fake" in name
        ):
            return idx
    return 1 if len(classes) > 1 else 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Evaluate spoof guard classifier")
    parser.add_argument("--model", required=True)
    parser.add_argument(
        "--test-dir",
        default=str(Path("data") / "processed" / "spoof_guard" / "test"),
        help="ImageFolder test root",
    )
    parser.add_argument("--threshold", type=float, default=0.80, help="Spoof probability decision threshold")
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--num-workers", type=int, default=-1, help="-1 = auto")
    parser.add_argument("--device", default="auto")
    parser.add_argument("--report-out", default=str(Path("outputs") / "reports" / "spoof_guard_eval.json"))
    args = parser.parse_args()

    device = resolve_device(args.device)
    workers = resolve_workers(args.num_workers)

    ckpt = torch.load(args.model, map_location="cpu")
    classes = [str(c) for c in ckpt["classes"]]
    image_size = int(ckpt.get("image_size", 256))
    backbone = ckpt.get("backbone", "resnet18")
    normalize_imagenet = bool(ckpt.get("normalize_imagenet", False))

    model = build_model(backbone, len(classes))
    model.load_state_dict(ckpt["model_state_dict"])
    model.to(device)
    model.eval()

    tfm_steps = [
        transforms.Resize((image_size, image_size)),
        transforms.ToTensor(),
    ]
    if normalize_imagenet:
        tfm_steps.append(transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD))
    tfms = transforms.Compose(tfm_steps)

    ds = datasets.ImageFolder(str(Path(args.test_dir)), transform=tfms)
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

    spoof_idx = _spoof_index(model_classes)
    threshold = max(0.0, min(1.0, float(args.threshold)))
    tp = fp = tn = fn = 0

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

            spoof_probs = probs[:, spoof_idx]
            spoof_pred = spoof_probs >= threshold
            spoof_true = labels_model == spoof_idx

            tp += int((spoof_pred & spoof_true).sum().item())
            fp += int((spoof_pred & (~spoof_true)).sum().item())
            tn += int(((~spoof_pred) & (~spoof_true)).sum().item())
            fn += int(((~spoof_pred) & spoof_true).sum().item())

            for i in range(labels_model.size(0)):
                conf[int(labels_model_cpu[i].item()), int(pred[i])] += 1

    overall_acc = correct / max(total, 1)
    spoof_precision = tp / max(tp + fp, 1)
    spoof_recall = tp / max(tp + fn, 1)
    spoof_fpr = fp / max(fp + tn, 1)

    report = {
        "overall_accuracy": overall_acc,
        "classes": model_classes,
        "dataset_classes": dataset_classes,
        "dataset_to_model_index": {name: int(label_remap[idx]) for idx, name in enumerate(dataset_classes)},
        "spoof_index": spoof_idx,
        "threshold": threshold,
        "spoof_precision": spoof_precision,
        "spoof_recall": spoof_recall,
        "spoof_false_positive_rate": spoof_fpr,
        "confusion_matrix": conf.tolist(),
        "counts": {
            "tp": tp,
            "fp": fp,
            "tn": tn,
            "fn": fn,
        },
    }

    print(f"overall_acc={overall_acc:.4f}")
    print(f"spoof_precision={spoof_precision:.4f}")
    print(f"spoof_recall={spoof_recall:.4f}")
    print(f"spoof_fpr={spoof_fpr:.4f}")

    out_path = Path(args.report_out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"report_saved={out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
