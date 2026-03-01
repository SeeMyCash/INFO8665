#!/usr/bin/env python3
"""Evaluate a trained coin classifier checkpoint on an ImageFolder test set."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import torch
from torch.utils.data import DataLoader
from torchvision import datasets, models, transforms


def build_model(backbone: str, num_classes: int):
    if backbone == "mobilenetv3_small":
        model = models.mobilenet_v3_small(weights=None)
        model.classifier[-1] = torch.nn.Linear(model.classifier[-1].in_features, num_classes)
        return model
    model = models.resnet18(weights=None)
    model.fc = torch.nn.Linear(model.fc.in_features, num_classes)
    return model


def main() -> int:
    parser = argparse.ArgumentParser(description="Evaluate coin classifier")
    parser.add_argument("--model", required=True)
    parser.add_argument("--real-test-dir", required=True, help="ImageFolder test root")
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--num-workers", type=int, default=0)
    parser.add_argument("--report-out", default="")
    args = parser.parse_args()

    ckpt = torch.load(args.model, map_location="cpu")
    classes = ckpt["classes"]
    image_size = int(ckpt.get("image_size", 256))
    backbone = ckpt.get("backbone", "resnet18")

    model = build_model(backbone, len(classes))
    model.load_state_dict(ckpt["model_state_dict"]) 
    model.eval()

    tfms = transforms.Compose([transforms.Resize((image_size, image_size)), transforms.ToTensor()])
    ds = datasets.ImageFolder(args.real_test_dir, transform=tfms)
    dl = DataLoader(ds, batch_size=int(args.batch_size), shuffle=False, num_workers=int(args.num_workers))

    n_classes = len(classes)
    conf = np.zeros((n_classes, n_classes), dtype=np.int64)
    correct = 0
    total = 0
    wrong_predictions = []
    sample_index = 0

    with torch.no_grad():
        for images, labels in dl:
            logits = model(images)
            probs = torch.softmax(logits, dim=1)
            pred = probs.argmax(dim=1)
            correct += (pred == labels).sum().item()
            total += labels.size(0)
            for i in range(labels.size(0)):
                true_idx = int(labels[i])
                pred_idx = int(pred[i])
                conf[true_idx, pred_idx] += 1
                if pred_idx != true_idx:
                    file_path = ds.samples[sample_index][0] if sample_index < len(ds.samples) else ""
                    wrong_predictions.append(
                        {
                            "file": file_path,
                            "true_class": classes[true_idx],
                            "pred_class": classes[pred_idx],
                            "confidence": float(probs[i, pred_idx].item()),
                        }
                    )
                sample_index += 1

    overall = correct / max(total, 1)
    wrong_predictions.sort(key=lambda x: x["confidence"], reverse=True)
    report = {
        "overall_accuracy": overall,
        "classes": classes,
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
