"""
Inference logic – classifier + YOLO predictions.

Stateless functions that accept a model / loaded-instance and an image.
"""

from typing import Any, Dict, List

import numpy as np
import torch
from fastapi import HTTPException
from PIL import Image
from torchvision import transforms

from app.core.config import settings
from app.services.model_manager import LoadedModel, model_state

IMAGENET_MEAN = (0.485, 0.456, 0.406)
IMAGENET_STD = (0.229, 0.224, 0.225)


# ── Classifier (legacy active-model) ────────────────────────

def predict_classifier(image: Image.Image) -> Dict[str, Any]:
    """Run classifier inference using the globally-selected model."""
    meta = model_state.classifier_meta
    if meta is None:
        raise HTTPException(status_code=500, detail="Classifier metadata unavailable")

    tfm_steps = [
        transforms.Resize((meta["image_size"], meta["image_size"])),
        transforms.ToTensor(),
    ]
    if bool(meta.get("normalize_imagenet", False)):
        tfm_steps.append(transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD))
    tfm = transforms.Compose(tfm_steps)

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

    tfm_steps = [
        transforms.Resize((loaded.meta["image_size"], loaded.meta["image_size"])),
        transforms.ToTensor(),
    ]
    if bool(loaded.meta.get("normalize_imagenet", False)):
        tfm_steps.append(transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD))
    tfm = transforms.Compose(tfm_steps)

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
        if _passes_detection_filters(det, img_w=img_w, img_h=img_h):
            boxes.append(det)

    boxes = _dedupe_detections(boxes)
    return {"type": "detector", "detections": boxes}


def _passes_detection_filters(
    det: Dict[str, Any], img_w: int = 1, img_h: int = 1
) -> bool:
    try:
        x1, y1, x2, y2 = [float(v) for v in det.get("xyxy", [0, 0, 0, 0])]
    except Exception:
        return False

    try:
        conf = float(det.get("confidence", 0.0))
    except Exception:
        conf = 0.0

    class_name = str(det.get("class_name", "")).strip().lower()
    is_coin = "coin" in class_name
    min_conf = settings.detector_coin_min_conf if is_coin else settings.detector_bill_min_conf
    if conf < min_conf:
        return False

    box_w = max(0.0, x2 - x1)
    box_h = max(0.0, y2 - y1)
    if box_w <= settings.detector_min_box_side_px or box_h <= settings.detector_min_box_side_px:
        return False

    area_ratio = (box_w * box_h) / max(1.0, float(img_w * img_h))
    if area_ratio < settings.detector_min_box_area_ratio or area_ratio > settings.detector_max_box_area_ratio:
        return False

    if is_coin:
        aspect = box_w / max(box_h, 1e-6)
        if aspect < settings.detector_coin_min_aspect or aspect > settings.detector_coin_max_aspect:
            return False

    if box_w <= 1.0 or box_h <= 1.0:
        return False

    return True


def _xyxy_iou(a: List[float], b: List[float]) -> float:
    if len(a) < 4 or len(b) < 4:
        return 0.0
    ax1, ay1, ax2, ay2 = [float(v) for v in a[:4]]
    bx1, by1, bx2, by2 = [float(v) for v in b[:4]]

    ax1, ax2 = min(ax1, ax2), max(ax1, ax2)
    ay1, ay2 = min(ay1, ay2), max(ay1, ay2)
    bx1, bx2 = min(bx1, bx2), max(bx1, bx2)
    by1, by2 = min(by1, by2), max(by1, by2)

    ix1 = max(ax1, bx1)
    iy1 = max(ay1, by1)
    ix2 = min(ax2, bx2)
    iy2 = min(ay2, by2)
    iw = max(0.0, ix2 - ix1)
    ih = max(0.0, iy2 - iy1)
    inter = iw * ih
    if inter <= 0.0:
        return 0.0

    a_area = max(0.0, ax2 - ax1) * max(0.0, ay2 - ay1)
    b_area = max(0.0, bx2 - bx1) * max(0.0, by2 - by1)
    union = a_area + b_area - inter
    if union <= 0.0:
        return 0.0
    return inter / union


def _dedupe_detections(detections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    if not detections:
        return []

    ranked = sorted(
        detections, key=lambda d: float(d.get("confidence", 0.0)), reverse=True
    )
    kept: List[Dict[str, Any]] = []
    for det in ranked:
        det_cls = str(det.get("class_name", "")).strip().lower()
        det_xyxy = det.get("xyxy", [])
        duplicate = False
        for existing in kept:
            existing_cls = str(existing.get("class_name", "")).strip().lower()
            existing_xyxy = existing.get("xyxy", [])
            iou = _xyxy_iou(det_xyxy, existing_xyxy)
            if det_cls == existing_cls and iou >= settings.detector_duplicate_iou:
                duplicate = True
                break
            if iou >= settings.detector_duplicate_cross_class_iou:
                duplicate = True
                break
        if not duplicate:
            kept.append(det)
    return kept[: max(1, settings.detector_max_det)]
