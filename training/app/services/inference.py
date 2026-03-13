"""
Inference logic – classifier + YOLO predictions.

Stateless functions that accept a model / loaded-instance and an image.
"""

from typing import Any, Dict

import numpy as np
import torch
from fastapi import HTTPException
from PIL import Image
from torchvision import transforms

from app.core.config import settings
from app.services.model_manager import LoadedModel, model_state


# ── Classifier (legacy active-model) ────────────────────────

def predict_classifier(image: Image.Image) -> Dict[str, Any]:
    """Run classifier inference using the globally-selected model."""
    meta = model_state.classifier_meta
    if meta is None:
        raise HTTPException(status_code=500, detail="Classifier metadata unavailable")

    tfm = transforms.Compose([
        transforms.Resize((meta["image_size"], meta["image_size"])),
        transforms.ToTensor(),
    ])

    x = tfm(image).unsqueeze(0)
    with torch.no_grad():
        logits = model_state.loaded_model(x)
        probs = torch.softmax(logits, dim=1).squeeze(0)

    topk = min(5, probs.numel())
    values, indices = torch.topk(probs, k=topk)
    preds = [
        {"class": meta["classes"][idx], "confidence": float(score)}
        for score, idx in zip(values.tolist(), indices.tolist())
    ]

    return {"type": "classifier", "top_predictions": preds}


# ── Classifier (instance-based) ─────────────────────────────

def predict_classifier_instance(loaded: LoadedModel, image: Image.Image) -> Dict[str, Any]:
    if loaded.meta is None:
        raise HTTPException(status_code=500, detail="Classifier metadata unavailable")

    tfm = transforms.Compose([
        transforms.Resize((loaded.meta["image_size"], loaded.meta["image_size"])),
        transforms.ToTensor(),
    ])

    x = tfm(image).unsqueeze(0)
    with torch.no_grad():
        logits = loaded.model(x)
        probs = torch.softmax(logits, dim=1).squeeze(0)

    topk = min(5, probs.numel())
    values, indices = torch.topk(probs, k=topk)
    preds = [
        {"class": loaded.meta["classes"][idx], "confidence": float(score)}
        for score, idx in zip(values.tolist(), indices.tolist())
    ]

    return {"type": "classifier", "top_predictions": preds}


# ── YOLO detector (legacy active-model) ─────────────────────

def predict_yolo(image: Image.Image) -> Dict[str, Any]:
    arr = np.array(image.convert("RGB"))
    result = model_state.loaded_model.predict(
        source=arr,
        verbose=False,
        conf=settings.detector_conf_threshold,
        iou=settings.detector_iou_threshold,
        max_det=settings.detector_max_det,
    )[0]

    return _parse_yolo_result(result, arr)


# ── YOLO detector (instance-based) ──────────────────────────

def predict_yolo_instance(loaded: LoadedModel, image: Image.Image) -> Dict[str, Any]:
    arr = np.array(image.convert("RGB"))
    result = loaded.model.predict(
        source=arr,
        verbose=False,
        conf=settings.detector_conf_threshold,
        iou=settings.detector_iou_threshold,
        max_det=settings.detector_max_det,
    )[0]

    return _parse_yolo_result(result, arr)


# ── Shared helpers ───────────────────────────────────────────

def _parse_yolo_result(result: Any, arr: np.ndarray) -> Dict[str, Any]:
    boxes = []
    names = result.names if isinstance(result.names, dict) else {}
    img_h, img_w = arr.shape[:2]
    for b in result.boxes:
        cls_id = int(b.cls.item())
        conf = float(b.conf.item())
        xyxy = [float(v) for v in b.xyxy[0].tolist()]
        class_name = names.get(cls_id, str(cls_id))
        box_w = max(0.0, xyxy[2] - xyxy[0])
        box_h = max(0.0, xyxy[3] - xyxy[1])
        area_ratio = (box_w * box_h) / max(1.0, float(img_w * img_h))

        det = {
            "class_id": cls_id,
            "class_name": class_name,
            "confidence": conf,
            "xyxy": xyxy,
            "box_area_ratio": area_ratio,
        }
        if _passes_detection_filters(det):
            boxes.append(det)

    return {"type": "detector", "detections": boxes}


def _passes_detection_filters(det: Dict[str, Any]) -> bool:
    try:
        x1, y1, x2, y2 = [float(v) for v in det.get("xyxy", [0, 0, 0, 0])]
    except Exception:
        return False

    box_w = max(0.0, x2 - x1)
    box_h = max(0.0, y2 - y1)
    if box_w <= 1.0 or box_h <= 1.0:
        return False

    return True
