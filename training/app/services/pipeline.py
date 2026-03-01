"""
Multi-model pipeline: detector ➜ target selection ➜ bill reader / coin classifier.

Keeps pipeline model instances in module-level state and exposes
`run_full_process()` as the main entry-point for the pipeline inference flow.
"""

import logging
import time
from typing import Any, Dict, List, Optional

from fastapi import HTTPException
from PIL import Image

from app.services.inference import predict_classifier_instance, predict_yolo_instance
from app.services.model_manager import (
    LoadedModel,
    is_bill_reader_name,
    is_coin_classifier_name,
    is_detector_name,
    list_local_models,
    load_model_instance,
    pick_latest,
)
from app.services.s3_sync import refresh_from_deploy_defaults

logger = logging.getLogger("smc.pipeline")


# ── Pipeline model state ─────────────────────────────────────

_pipeline_detector: Optional[LoadedModel] = None
_pipeline_bill_reader: Optional[LoadedModel] = None
_pipeline_coin_classifier: Optional[LoadedModel] = None


# ── Server-side stats ────────────────────────────────────────

server_start_time: float = time.time()
inference_count: int = 0
inference_total_ms: float = 0.0
inference_errors: int = 0
last_inference_ms: Optional[float] = None


# ── Pipeline helpers ─────────────────────────────────────────

def pipeline_status() -> Dict[str, Optional[str]]:
    return {
        "detector": _pipeline_detector.name if _pipeline_detector else None,
        "bill_reader": _pipeline_bill_reader.name if _pipeline_bill_reader else None,
        "coin_classifier": _pipeline_coin_classifier.name if _pipeline_coin_classifier else None,
    }


def _select_pipeline_models() -> Dict[str, Any]:
    """Select and load one detector + bill reader + coin classifier from local models."""
    global _pipeline_detector, _pipeline_bill_reader, _pipeline_coin_classifier

    all_models = list_local_models()
    detectors = [m for m in all_models if is_detector_name(m)]
    bill_readers = [m for m in all_models if is_bill_reader_name(m)]
    coin_classifiers = [m for m in all_models if is_coin_classifier_name(m)]

    det_name = pick_latest(detectors)
    bill_name = pick_latest(bill_readers)
    coin_name = pick_latest(coin_classifiers)

    if det_name is None:
        raise HTTPException(status_code=503, detail="No detector model found locally. Refresh from S3 first.")
    if bill_name is None:
        raise HTTPException(status_code=503, detail="No bill reader model found locally. Refresh from S3 first.")
    if coin_name is None:
        raise HTTPException(status_code=503, detail="No coin classifier model found locally. Refresh from S3 first.")

    _pipeline_detector = load_model_instance(det_name)
    _pipeline_bill_reader = load_model_instance(bill_name)
    _pipeline_coin_classifier = load_model_instance(coin_name)

    return {
        "detector": _pipeline_detector.name,
        "bill_reader": _pipeline_bill_reader.name,
        "coin_classifier": _pipeline_coin_classifier.name,
    }


def ensure_pipeline_models(allow_refresh_from_defaults: bool = True) -> Dict[str, Any]:
    state = pipeline_status()
    if state["detector"] and state["bill_reader"] and state["coin_classifier"]:
        return state

    try:
        return _select_pipeline_models()
    except HTTPException:
        if not allow_refresh_from_defaults:
            raise
        if not refresh_from_deploy_defaults():
            raise
        return _select_pipeline_models()


# ── Target selection ─────────────────────────────────────────

def _choose_target(detections: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not detections:
        return None

    def score(d: Dict[str, Any]) -> float:
        try:
            return float(d.get("confidence", 0.0))
        except Exception:
            return 0.0

    by_conf = sorted(detections, key=score, reverse=True)

    def is_coin(d: Dict[str, Any]) -> bool:
        name = str(d.get("class_name", "")).strip().lower()
        return bool(name) and ("coin" in name)

    def is_giant(d: Dict[str, Any]) -> bool:
        try:
            return float(d.get("box_area_ratio", 0.0)) >= 0.65
        except Exception:
            return False

    coin_candidates = [d for d in by_conf if is_coin(d) and not is_giant(d)]
    bill_candidates = [d for d in by_conf if not is_coin(d)]

    if bill_candidates:
        bill_candidates[0]["_target_kind"] = "bill"
        return bill_candidates[0]

    if coin_candidates:
        coin_candidates[0]["_target_kind"] = "coin"
        return coin_candidates[0]

    giant_coin_candidates = [d for d in by_conf if is_coin(d)]
    if giant_coin_candidates:
        giant_coin_candidates[0]["_target_kind"] = "coin"
        return giant_coin_candidates[0]

    top = by_conf[0]
    top["_target_kind"] = "unknown"
    return top


def _crop_xyxy(image: Image.Image, xyxy: List[float]) -> Image.Image:
    x1, y1, x2, y2 = xyxy
    w, h = image.size
    left = max(0, min(w, int(round(x1))))
    top = max(0, min(h, int(round(y1))))
    right = max(0, min(w, int(round(x2))))
    bottom = max(0, min(h, int(round(y2))))
    if right <= left or bottom <= top:
        return image
    return image.crop((left, top, right, bottom))


# ── Full pipeline process ────────────────────────────────────

def run_full_process(image: Image.Image) -> Dict[str, Any]:
    if _pipeline_detector is None or _pipeline_bill_reader is None or _pipeline_coin_classifier is None:
        ensure_pipeline_models(allow_refresh_from_defaults=True)

    det = predict_yolo_instance(_pipeline_detector, image)  # type: ignore[arg-type]
    detections = det.get("detections", [])
    target = _choose_target(detections)

    out: Dict[str, Any] = {
        "pipeline_models": pipeline_status(),
        "detector": det,
        "target": None,
        "classification": None,
    }

    if target is None:
        return out

    out["target"] = {k: v for k, v in target.items() if k != "_target_kind"}
    kind = target.get("_target_kind")
    if kind not in {"bill", "coin"}:
        return out

    crop = _crop_xyxy(image, target.get("xyxy", [0, 0, image.size[0], image.size[1]]))
    if kind == "bill":
        out["classification"] = {
            "kind": "bill_reader",
            "result": predict_classifier_instance(_pipeline_bill_reader, crop),  # type: ignore[arg-type]
        }
    else:
        out["classification"] = {
            "kind": "coin_classifier",
            "result": predict_classifier_instance(_pipeline_coin_classifier, crop),  # type: ignore[arg-type]
        }
    return out
