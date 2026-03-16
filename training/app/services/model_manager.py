"""
Model loading, listing, and selection logic.

All mutable "active model" state is kept in the `ModelState` singleton so
that route handlers can inject it via FastAPI's `Depends()`.
"""

import re
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional

import torch
from fastapi import HTTPException
from torchvision import models

from app.core.config import settings


# ── Shared dataclass for loaded model instances ──────────────

@dataclass
class LoadedModel:
    """An in-memory model with its metadata."""

    name: str
    kind: str          # "classifier" | "detector"
    model: Any
    meta: Optional[Dict[str, Any]] = None


# ── Module-level "active legacy model" state ─────────────────

class ModelState:
    """Singleton holding the currently selected *legacy* single-model."""

    def __init__(self) -> None:
        self.loaded_model: Optional[Any] = None
        self.loaded_model_name: Optional[str] = None
        self.loaded_model_kind: Optional[str] = None
        self.classifier_meta: Optional[Dict[str, Any]] = None


model_state = ModelState()


# ── Helpers ──────────────────────────────────────────────────

def build_classifier(backbone: str, num_classes: int):
    if backbone == "mobilenetv3_small":
        model = models.mobilenet_v3_small(weights=None)
        model.classifier[-1] = torch.nn.Linear(
            model.classifier[-1].in_features, num_classes
        )
        return model

    model = models.resnet18(weights=None)
    model.fc = torch.nn.Linear(model.fc.in_features, num_classes)
    return model


def list_local_models() -> List[str]:
    items = []
    for suffix in ("*.pt", "*.pth"):
        items.extend(settings.models_dir.glob(suffix))
    return sorted({p.name for p in items})


def parse_run_tag(name: str) -> Optional[datetime]:
    # Supported name encodings:
    # 1) YYYYMMDD-HHMMSS (e.g. champ-detector-20260224-185203)
    # 2) YYMMDDHHMMSS   (e.g. p2amt-coin-260301215339)
    # 3) YYYYMMDD       (fallback date-only)
    m = re.search(r"(?<!\d)(\d{8}-\d{6})(?!\d)", name)
    if m:
        try:
            return datetime.strptime(m.group(1), "%Y%m%d-%H%M%S")
        except Exception:
            pass

    m = re.search(r"(?<!\d)(\d{12})(?!\d)", name)
    if m:
        try:
            return datetime.strptime(m.group(1), "%y%m%d%H%M%S")
        except Exception:
            pass

    m = re.search(r"(?<!\d)(\d{8})(?!\d)", name)
    if m:
        try:
            return datetime.strptime(m.group(1), "%Y%m%d")
        except Exception:
            pass

    return None


def pick_latest(candidates: List[str]) -> Optional[str]:
    if not candidates:
        return None

    def key(n: str):
        dt = parse_run_tag(n)
        return (dt is not None, dt or datetime.min, n)

    return max(candidates, key=key)


# ── Name-classification helpers ──────────────────────────────

def is_detector_name(model_name: str) -> bool:
    n = model_name.lower()
    if not n.endswith(".pt"):
        return False
    if "__best.pt" in n:
        return True
    if "__model.pt" not in n:
        return False
    return (
        "detector" in n
        or re.search(r"(^|[_-])det([_-]|$)", n) is not None
        or "champ-detector" in n
        or "money-det" in n
    )


def is_coin_classifier_name(model_name: str) -> bool:
    n = model_name.lower()
    if "__model.pt" not in n:
        return False
    return "coin" in n


def is_bill_reader_name(model_name: str) -> bool:
    n = model_name.lower()
    if "__model.pt" not in n:
        return False
    if is_coin_classifier_name(model_name):
        return False
    return (
        "bill-reader" in n
        or "bill_reader" in n
        or "billreader" in n
        or "champ-bill" in n
        or "banknote" in n
        or "bill" in n
    )


def is_spoof_guard_name(model_name: str) -> bool:
    n = model_name.lower()
    if not n.endswith(".pt"):
        return False
    return (
        "spoof" in n
        or "antispoof" in n
        or "anti_spoof" in n
        or "liveness" in n
        or "screen-guard" in n
    )


# ── Pipeline pin-file helpers ────────────────────────────────

def pipeline_pin_file_name(role: str) -> Optional[str]:
    mapping = {
        "detector": "pipeline_detector_model.txt",
        "bill_reader": "pipeline_bill_reader_model.txt",
        "coin_classifier": "pipeline_coin_classifier_model.txt",
        "spoof_guard": "pipeline_spoof_guard_model.txt",
    }
    return mapping.get(role)


def pick_pipeline_preferred_or_latest(
    role: str,
    candidates: List[str],
    read_deploy_text_fn: Any = None,
) -> Optional[str]:
    """Pick pinned model if available, otherwise fall back to latest."""
    if not candidates:
        return None
    pin_name = pipeline_pin_file_name(role)
    if pin_name and read_deploy_text_fn is not None:
        preferred = read_deploy_text_fn(pin_name)
        if preferred and preferred in candidates:
            return preferred
    return pick_latest(candidates)


# ── Load model (returns instance) ───────────────────────────

def load_model_instance(model_name: str) -> LoadedModel:
    model_path = settings.models_dir / model_name
    if not model_path.exists():
        raise HTTPException(status_code=404, detail=f"Model not found: {model_name}")

    ckpt = None
    try:
        ckpt = torch.load(model_path, map_location="cpu")
    except Exception:
        ckpt = None

    if isinstance(ckpt, dict) and "model_state_dict" in ckpt and "classes" in ckpt:
        classes = ckpt["classes"]
        backbone = ckpt.get("backbone", "resnet18")
        image_size = int(ckpt.get("image_size", 256))

        model = build_classifier(backbone, len(classes))
        model.load_state_dict(ckpt["model_state_dict"])
        model.eval()
        return LoadedModel(
            name=model_name,
            kind="classifier",
            model=model,
            meta={
                "classes": classes,
                "image_size": image_size,
                "backbone": backbone,
                "normalize_imagenet": bool(ckpt.get("normalize_imagenet", False)),
            },
        )

    detector_like_name = (
        model_name.startswith("detector-")
        or "__best.pt" in model_name
        or model_name.endswith("best.pt")
        or "det-" in model_name
        or "detector" in model_name
    )

    if detector_like_name or model_path.suffix == ".pt":
        try:
            from ultralytics import YOLO
        except Exception as exc:
            raise HTTPException(
                status_code=400,
                detail=f"Detector runtime unavailable: {exc}",
            )

        try:
            model = YOLO(str(model_path))
            return LoadedModel(name=model_name, kind="detector", model=model, meta=None)
        except Exception as exc:
            if detector_like_name:
                raise HTTPException(
                    status_code=400,
                    detail=f"Detector activation failed: {exc}",
                )

    raise HTTPException(status_code=400, detail="Unsupported checkpoint format")


# ── Legacy: set global active model ─────────────────────────

def load_active_model(model_name: str) -> None:
    """Load a model and set it as the active legacy single-model."""
    model_path = settings.models_dir / model_name
    if not model_path.exists():
        raise HTTPException(status_code=404, detail=f"Model not found: {model_name}")

    ckpt = None
    try:
        ckpt = torch.load(model_path, map_location="cpu")
    except Exception:
        ckpt = None

    if isinstance(ckpt, dict) and "model_state_dict" in ckpt and "classes" in ckpt:
        classes = ckpt["classes"]
        backbone = ckpt.get("backbone", "resnet18")
        image_size = int(ckpt.get("image_size", 256))

        model = build_classifier(backbone, len(classes))
        model.load_state_dict(ckpt["model_state_dict"])
        model.eval()

        model_state.loaded_model = model
        model_state.loaded_model_name = model_name
        model_state.loaded_model_kind = "classifier"
        model_state.classifier_meta = {
            "classes": classes,
            "image_size": image_size,
            "backbone": backbone,
            "normalize_imagenet": bool(ckpt.get("normalize_imagenet", False)),
        }
        return

    detector_like_name = (
        model_name.startswith("detector-")
        or "__best.pt" in model_name
        or model_name.endswith("best.pt")
    )

    if detector_like_name or model_path.suffix == ".pt":
        try:
            from ultralytics import YOLO
        except Exception as exc:
            raise HTTPException(
                status_code=400,
                detail=f"Detector runtime unavailable: {exc}",
            )

        try:
            model_state.loaded_model = YOLO(str(model_path))
            model_state.loaded_model_name = model_name
            model_state.loaded_model_kind = "detector"
            model_state.classifier_meta = None
            return
        except Exception as exc:
            if detector_like_name:
                raise HTTPException(
                    status_code=400,
                    detail=f"Detector activation failed: {exc}",
                )

    raise HTTPException(status_code=400, detail="Unsupported checkpoint format")
