#!/usr/bin/env python3
"""Train a coin denomination classifier locally (PyTorch)."""

from __future__ import annotations

import argparse
from pathlib import Path

import torch
import torch.nn as nn
from torch.utils.data import DataLoader, WeightedRandomSampler
from torchvision import datasets, models, transforms


def build_loaders(
    train_dir: Path,
    val_dir: Path | None,
    image_size: int,
    batch_size: int,
    num_workers: int,
    weighted_sampler: bool,
):
    train_tfms = transforms.Compose(
        [
            transforms.Resize((image_size, image_size)),
            transforms.RandomApply([transforms.GaussianBlur(kernel_size=3)], p=0.5),
            transforms.ColorJitter(brightness=0.15, contrast=0.15, saturation=0.15, hue=0.03),
            transforms.RandomHorizontalFlip(p=0.5),
            transforms.RandomAffine(degrees=12, translate=(0.05, 0.05), scale=(0.9, 1.1)),
            transforms.ToTensor(),
        ]
    )
    eval_tfms = transforms.Compose([transforms.Resize((image_size, image_size)), transforms.ToTensor()])

    train_ds = datasets.ImageFolder(str(train_dir), transform=train_tfms)
    val_ds = datasets.ImageFolder(str(val_dir if val_dir is not None else train_dir), transform=eval_tfms)

    train_sampler = None
    shuffle = True
    if weighted_sampler:
        targets = train_ds.targets
        class_counts = torch.bincount(torch.tensor(targets), minlength=len(train_ds.classes)).float()
        class_weights = 1.0 / torch.clamp(class_counts, min=1.0)
        sample_weights = class_weights[torch.tensor(targets)]
        train_sampler = WeightedRandomSampler(sample_weights, num_samples=len(sample_weights), replacement=True)
        shuffle = False

    train_loader = DataLoader(
        train_ds,
        batch_size=batch_size,
        shuffle=shuffle,
        sampler=train_sampler,
        num_workers=num_workers,
    )
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False, num_workers=num_workers)
    return train_loader, val_loader, train_ds.classes


def build_model(backbone: str, num_classes: int):
    if backbone == "mobilenetv3_small":
        model = models.mobilenet_v3_small(weights=models.MobileNet_V3_Small_Weights.DEFAULT)
        model.classifier[-1] = nn.Linear(model.classifier[-1].in_features, num_classes)
        return model
    if backbone == "resnet18":
        model = models.resnet18(weights=models.ResNet18_Weights.DEFAULT)
        model.fc = nn.Linear(model.fc.in_features, num_classes)
        return model
    raise ValueError(f"Unsupported backbone: {backbone}")


def str2bool(value: str) -> bool:
    return str(value).strip().lower() in {"1", "true", "yes", "y"}


def evaluate(model, loader, criterion, device):
    model.eval()
    total_loss = 0.0
    correct = 0
    total = 0
    with torch.no_grad():
        for images, labels in loader:
            images, labels = images.to(device), labels.to(device)
            logits = model(images)
            loss = criterion(logits, labels)
            total_loss += loss.item() * labels.size(0)
            pred = logits.argmax(dim=1)
            correct += (pred == labels).sum().item()
            total += labels.size(0)
    return total_loss / max(total, 1), correct / max(total, 1)


def main() -> int:
    parser = argparse.ArgumentParser(description="Train coin denomination classifier")
    parser.add_argument("--train-dir", required=True, help="ImageFolder train root")
    parser.add_argument("--val-dir", default="", help="ImageFolder val root (optional)")
    parser.add_argument("--output", default=str(Path("outputs") / "models" / "coin_classifier.pt"))
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument("--img-size", type=int, default=256)
    parser.add_argument("--backbone", choices=["mobilenetv3_small", "resnet18"], default="resnet18")
    parser.add_argument("--weighted-sampler", default="false")
    parser.add_argument("--num-workers", type=int, default=0)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    torch.manual_seed(args.seed)
    device = "cuda" if torch.cuda.is_available() else "cpu"

    train_dir = Path(args.train_dir)
    val_dir = Path(args.val_dir) if args.val_dir else None
    use_weighted_sampler = str2bool(args.weighted_sampler)

    train_loader, val_loader, classes = build_loaders(
        train_dir,
        val_dir,
        int(args.img_size),
        int(args.batch_size),
        int(args.num_workers),
        use_weighted_sampler,
    )

    model = build_model(args.backbone, len(classes)).to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=float(args.lr), weight_decay=1e-4)

    best_acc = 0.0
    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    for epoch in range(1, int(args.epochs) + 1):
        model.train()
        run_loss = 0.0
        total = 0
        for images, labels in train_loader:
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad(set_to_none=True)
            logits = model(images)
            loss = criterion(logits, labels)
            loss.backward()
            optimizer.step()
            run_loss += loss.item() * labels.size(0)
            total += labels.size(0)

        train_loss = run_loss / max(total, 1)
        val_loss, val_acc = evaluate(model, val_loader, criterion, device)
        print(f"epoch={epoch} train_loss={train_loss:.4f} val_loss={val_loss:.4f} val_acc={val_acc:.4f}")

        if val_acc >= best_acc:
            best_acc = val_acc
            torch.save(
                {
                    "model_state_dict": model.state_dict(),
                    "classes": classes,
                    "image_size": int(args.img_size),
                    "backbone": args.backbone,
                },
                out_path,
            )

    print(f"best_val_acc={best_acc:.4f}")
    print(f"saved={out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
