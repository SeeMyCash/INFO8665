#!/usr/bin/env python3
"""Train a coin denomination classifier locally (PyTorch).

Local-optimized features:
- Auto device and dataloader workers
- Mixed precision on CUDA
- Optional weighted sampler + class-weighted loss for imbalance
- Cosine LR schedule and early stopping
"""

from __future__ import annotations

import argparse
import os
from contextlib import nullcontext
from pathlib import Path

import torch
import torch.nn as nn
from torch.utils.data import DataLoader, WeightedRandomSampler
from torchvision import datasets, models, transforms

from _runtime import load_repo_env
from _tracking import build_tracker

load_repo_env()

IMAGENET_MEAN = (0.485, 0.456, 0.406)
IMAGENET_STD = (0.229, 0.224, 0.225)


def str2bool(value: str) -> bool:
    return str(value).strip().lower() in {"1", "true", "yes", "y", "on"}


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


def build_loaders(
    train_dir: Path,
    val_dir: Path | None,
    image_size: int,
    batch_size: int,
    num_workers: int,
    weighted_sampler: bool,
    pin_memory: bool,
    persistent_workers: bool,
    prefetch_factor: int,
):
    train_tfms = transforms.Compose(
        [
            transforms.Resize((image_size, image_size)),
            transforms.RandomApply([transforms.GaussianBlur(kernel_size=3)], p=0.5),
            transforms.ColorJitter(brightness=0.18, contrast=0.18, saturation=0.18, hue=0.04),
            transforms.RandomHorizontalFlip(p=0.5),
            transforms.RandomAffine(degrees=14, translate=(0.07, 0.07), scale=(0.88, 1.12)),
            transforms.ToTensor(),
            transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
        ]
    )
    eval_tfms = transforms.Compose(
        [
            transforms.Resize((image_size, image_size)),
            transforms.ToTensor(),
            transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
        ]
    )

    train_ds = datasets.ImageFolder(str(train_dir), transform=train_tfms)
    val_ds = datasets.ImageFolder(str(val_dir if val_dir is not None else train_dir), transform=eval_tfms)

    train_sampler = None
    shuffle = True
    if weighted_sampler:
        targets_t = torch.tensor(train_ds.targets, dtype=torch.long)
        class_counts = torch.bincount(targets_t, minlength=len(train_ds.classes)).float()
        class_weights = 1.0 / torch.clamp(class_counts, min=1.0)
        sample_weights = class_weights[targets_t]
        train_sampler = WeightedRandomSampler(sample_weights, num_samples=len(sample_weights), replacement=True)
        shuffle = False

    loader_kwargs = {
        "batch_size": int(batch_size),
        "num_workers": int(num_workers),
        "pin_memory": bool(pin_memory),
    }
    if num_workers > 0:
        loader_kwargs["persistent_workers"] = bool(persistent_workers)
        loader_kwargs["prefetch_factor"] = int(prefetch_factor)

    train_loader = DataLoader(
        train_ds,
        shuffle=shuffle,
        sampler=train_sampler,
        **loader_kwargs,
    )
    val_loader = DataLoader(val_ds, shuffle=False, **loader_kwargs)

    class_counts = torch.bincount(torch.tensor(train_ds.targets, dtype=torch.long), minlength=len(train_ds.classes)).float()
    return train_loader, val_loader, train_ds.classes, class_counts


def build_model(backbone: str, num_classes: int, pretrained: bool):
    if backbone == "mobilenetv3_small":
        weights = models.MobileNet_V3_Small_Weights.DEFAULT if pretrained else None
        model = models.mobilenet_v3_small(weights=weights)
        model.classifier[-1] = nn.Linear(model.classifier[-1].in_features, num_classes)
        return model
    if backbone == "resnet18":
        weights = models.ResNet18_Weights.DEFAULT if pretrained else None
        model = models.resnet18(weights=weights)
        model.fc = nn.Linear(model.fc.in_features, num_classes)
        return model
    raise ValueError(f"Unsupported backbone: {backbone}")


def evaluate(model, loader, criterion, device, amp_enabled: bool):
    model.eval()
    total_loss = 0.0
    correct = 0
    total = 0
    with torch.no_grad():
        for images, labels in loader:
            images, labels = images.to(device), labels.to(device)
            with (torch.autocast(device_type="cuda", dtype=torch.float16) if amp_enabled else nullcontext()):
                logits = model(images)
                loss = criterion(logits, labels)
            total_loss += float(loss.item()) * labels.size(0)
            pred = logits.argmax(dim=1)
            correct += int((pred == labels).sum().item())
            total += int(labels.size(0))
    return total_loss / max(total, 1), correct / max(total, 1)


def main() -> int:
    parser = argparse.ArgumentParser(description="Train coin denomination classifier")
    parser.add_argument("--train-dir", required=True, help="ImageFolder train root")
    parser.add_argument("--val-dir", default="", help="ImageFolder val root (optional)")
    parser.add_argument("--output", default=str(Path("outputs") / "models" / "coin_classifier.pt"))
    parser.add_argument("--epochs", type=int, default=30)
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--lr", type=float, default=3e-4)
    parser.add_argument("--weight-decay", type=float, default=1e-4)
    parser.add_argument("--img-size", type=int, default=256)
    parser.add_argument("--backbone", choices=["mobilenetv3_small", "resnet18"], default="resnet18")
    parser.add_argument("--pretrained", type=str2bool, default="true")
    parser.add_argument("--weighted-sampler", type=str2bool, default="true")
    parser.add_argument("--class-weighted-loss", type=str2bool, default="true")
    parser.add_argument("--label-smoothing", type=float, default=0.05)
    parser.add_argument("--scheduler", choices=["none", "cosine"], default="cosine")
    parser.add_argument("--min-lr", type=float, default=1e-6)
    parser.add_argument("--patience", type=int, default=8)
    parser.add_argument("--min-delta", type=float, default=1e-4)
    parser.add_argument("--grad-clip", type=float, default=1.0)
    parser.add_argument("--num-workers", type=int, default=-1, help="-1 = auto")
    parser.add_argument("--prefetch-factor", type=int, default=2)
    parser.add_argument("--persistent-workers", type=str2bool, default="true")
    parser.add_argument("--pin-memory", type=str2bool, default="true")
    parser.add_argument("--amp", type=str2bool, default="true")
    parser.add_argument("--device", default="auto")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--mlflow-experiment", default="", help="Override MLflow experiment name")
    parser.add_argument("--mlflow-run-name", default="", help="Override MLflow run name")
    parser.add_argument("--disable-mlflow", action="store_true", help="Disable MLflow logging for this run")
    args = parser.parse_args()

    torch.manual_seed(int(args.seed))
    device = resolve_device(args.device)
    workers = resolve_workers(int(args.num_workers))
    pin_memory = bool(str2bool(str(args.pin_memory)) and device.type == "cuda")
    persistent_workers = bool(str2bool(str(args.persistent_workers)) and workers > 0)
    amp_enabled = bool(str2bool(str(args.amp)) and device.type == "cuda")

    train_dir = Path(args.train_dir)
    val_dir = Path(args.val_dir) if args.val_dir else None

    train_loader, val_loader, classes, class_counts = build_loaders(
        train_dir=train_dir,
        val_dir=val_dir,
        image_size=int(args.img_size),
        batch_size=int(args.batch_size),
        num_workers=workers,
        weighted_sampler=bool(str2bool(str(args.weighted_sampler))),
        pin_memory=pin_memory,
        persistent_workers=persistent_workers,
        prefetch_factor=int(args.prefetch_factor),
    )

    model = build_model(args.backbone, len(classes), pretrained=bool(str2bool(str(args.pretrained)))).to(device)

    if bool(str2bool(str(args.class_weighted_loss))):
        class_weights = class_counts.sum() / torch.clamp(class_counts, min=1.0)
        class_weights = class_weights / class_weights.mean()
        criterion = nn.CrossEntropyLoss(
            weight=class_weights.to(device),
            label_smoothing=float(args.label_smoothing),
        )
    else:
        criterion = nn.CrossEntropyLoss(label_smoothing=float(args.label_smoothing))

    optimizer = torch.optim.AdamW(model.parameters(), lr=float(args.lr), weight_decay=float(args.weight_decay))
    scheduler = None
    if args.scheduler == "cosine":
        scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
            optimizer,
            T_max=max(1, int(args.epochs)),
            eta_min=float(args.min_lr),
        )

    scaler = torch.cuda.amp.GradScaler(enabled=amp_enabled)

    best_acc = 0.0
    bad_epochs = 0
    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    print(
        "training_config="
        f"device:{device} workers:{workers} amp:{amp_enabled} "
        f"epochs:{args.epochs} batch:{args.batch_size} lr:{args.lr}"
    )

    tracker = build_tracker(
        component="coin_classifier_train",
        experiment_name=args.mlflow_experiment,
        run_name=args.mlflow_run_name or out_path.stem,
        enabled=not args.disable_mlflow,
        extra_tags={"framework": "pytorch", "task": "train"},
    )

    with tracker:
        tracker.log_params(
            {
                **vars(args),
                "resolved_device": str(device),
                "resolved_workers": workers,
                "resolved_pin_memory": pin_memory,
                "resolved_persistent_workers": persistent_workers,
                "resolved_amp": amp_enabled,
                "classes": classes,
            }
        )

        for epoch in range(1, int(args.epochs) + 1):
            model.train()
            run_loss = 0.0
            total = 0

            for images, labels in train_loader:
                images, labels = images.to(device), labels.to(device)
                optimizer.zero_grad(set_to_none=True)

                with (torch.autocast(device_type="cuda", dtype=torch.float16) if amp_enabled else nullcontext()):
                    logits = model(images)
                    loss = criterion(logits, labels)

                if amp_enabled:
                    scaler.scale(loss).backward()
                    if float(args.grad_clip) > 0:
                        scaler.unscale_(optimizer)
                        torch.nn.utils.clip_grad_norm_(model.parameters(), float(args.grad_clip))
                    scaler.step(optimizer)
                    scaler.update()
                else:
                    loss.backward()
                    if float(args.grad_clip) > 0:
                        torch.nn.utils.clip_grad_norm_(model.parameters(), float(args.grad_clip))
                    optimizer.step()

                run_loss += float(loss.item()) * labels.size(0)
                total += labels.size(0)

            if scheduler is not None:
                scheduler.step()

            train_loss = run_loss / max(total, 1)
            val_loss, val_acc = evaluate(model, val_loader, criterion, device, amp_enabled=amp_enabled)
            lr_now = optimizer.param_groups[0]["lr"]
            tracker.log_metrics(
                {
                    "train_loss": train_loss,
                    "val_loss": val_loss,
                    "val_accuracy": val_acc,
                    "learning_rate": lr_now,
                },
                step=epoch,
            )
            print(
                f"epoch={epoch} train_loss={train_loss:.4f} val_loss={val_loss:.4f} "
                f"val_acc={val_acc:.4f} lr={lr_now:.6f}"
            )

            improved = val_acc >= (best_acc + float(args.min_delta))
            if improved:
                best_acc = val_acc
                bad_epochs = 0
                torch.save(
                    {
                        "model_state_dict": model.state_dict(),
                        "classes": classes,
                        "image_size": int(args.img_size),
                        "backbone": args.backbone,
                        "best_val_acc": float(best_acc),
                    },
                    out_path,
                )
                tracker.log_artifact(out_path, artifact_path="checkpoints")
            else:
                bad_epochs += 1
                if bad_epochs >= int(args.patience):
                    print(f"early_stopping=1 patience={args.patience}")
                    tracker.set_tag("early_stopped", True)
                    break

        tracker.log_metrics({"best_val_accuracy": best_acc})

    print(f"best_val_acc={best_acc:.4f}")
    print(f"saved={out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
