"""
Multi-model pipeline: spoof guard -> detector -> target selection -> bill reader / coin classifier.

Keeps pipeline model instances in module-level state and exposes
`run_full_process()` as the main entry-point for the pipeline inference flow.
"""

import logging
import time
from typing import Any, Dict, List, Optional

from fastapi import HTTPException
from PIL import Image

from app.core.config import settings
from app.services.inference import predict_classifier_instance, predict_yolo_instance
from app.services.model_manager import (
    LoadedModel,
    is_bill_reader_name,
    is_coin_classifier_name,
    is_detector_name,
    is_spoof_guard_name,
    list_local_models,
    load_model_instance,
    pick_pipeline_preferred_or_latest,
)
from app.services.spoof_guard import run_spoof_guard
from app.services.s3_sync import read_deploy_text, refresh_from_deploy_defaults

logger = logging.getLogger("smc.pipeline")


# ── Pipeline model state ─────────────────────────────────────

_pipeline_detector: Optional[LoadedModel] = None
_pipeline_bill_reader: Optional[LoadedModel] = None
_pipeline_coin_classifier: Optional[LoadedModel] = None
_pipeline_spoof_guard: Optional[LoadedModel] = None


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
        "spoof_guard": _pipeline_spoof_guard.name if _pipeline_spoof_guard else None,
    }


def _select_pipeline_models() -> Dict[str, Any]:
    """Select and load one detector + bill reader + coin classifier from local models."""
    global _pipeline_detector, _pipeline_bill_reader, _pipeline_coin_classifier, _pipeline_spoof_guard

    all_models = list_local_models()
    # Keep spoof-guard detector artifacts out of the primary detector pool.
    detectors = [
        m for m in all_models
        if is_detector_name(m) and not is_spoof_guard_name(m)
    ]
    bill_readers = [m for m in all_models if is_bill_reader_name(m)]
    coin_classifiers = [m for m in all_models if is_coin_classifier_name(m)]
    spoof_guards = [m for m in all_models if is_spoof_guard_name(m)]

    det_name = pick_pipeline_preferred_or_latest("detector", detectors, read_deploy_text)
    bill_name = pick_pipeline_preferred_or_latest("bill_reader", bill_readers, read_deploy_text)
    coin_name = pick_pipeline_preferred_or_latest("coin_classifier", coin_classifiers, read_deploy_text)
    spoof_name = pick_pipeline_preferred_or_latest("spoof_guard", spoof_guards, read_deploy_text)

    if det_name is None:
        raise HTTPException(status_code=503, detail="No detector model found locally. Refresh from S3 first.")
    if bill_name is None:
        raise HTTPException(status_code=503, detail="No bill reader model found locally. Refresh from S3 first.")
    if coin_name is None:
        raise HTTPException(status_code=503, detail="No coin classifier model found locally. Refresh from S3 first.")

    _pipeline_detector = load_model_instance(det_name)
    _pipeline_bill_reader = load_model_instance(bill_name)
    _pipeline_coin_classifier = load_model_instance(coin_name)
    _pipeline_spoof_guard = None
    if spoof_name:
        try:
            _pipeline_spoof_guard = load_model_instance(spoof_name)
        except Exception as exc:
            logger.warning("Spoof guard model '%s' could not be loaded; continuing without it: %s", spoof_name, exc)

    return {
        "detector": _pipeline_detector.name,
        "bill_reader": _pipeline_bill_reader.name,
        "coin_classifier": _pipeline_coin_classifier.name,
        "spoof_guard": _pipeline_spoof_guard.name if _pipeline_spoof_guard else None,
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


# ── Detection scoring helpers ────────────────────────────────

def _detection_score(d: Dict[str, Any]) -> float:
    try:
        return float(d.get("confidence", 0.0))
    except Exception:
        return 0.0


def _is_coin_detection(d: Dict[str, Any]) -> bool:
    name = str(d.get("class_name", "")).strip().lower()
    return bool(name) and ("coin" in name)


def _is_giant_detection(d: Dict[str, Any]) -> bool:
    try:
        return float(d.get("box_area_ratio", 0.0)) >= settings.pipeline_giant_coin_area_ratio
    except Exception:
        return False


# ── Multi-target ranking ─────────────────────────────────────

def _rank_pipeline_targets(
    detections: List[Dict[str, Any]],
    detector_conf_threshold: Optional[float] = None,
) -> List[Dict[str, Any]]:
    if not detections:
        return []

    coin_route_min_conf = settings.pipeline_coin_route_min_conf
    if detector_conf_threshold is not None:
        try:
            coin_route_min_conf = max(0.01, min(0.99, float(detector_conf_threshold)))
        except Exception:
            coin_route_min_conf = settings.pipeline_coin_route_min_conf

    by_conf = sorted(
        ({**dict(d), "_source_index": idx} for idx, d in enumerate(detections)),
        key=_detection_score,
        reverse=True,
    )

    bill_candidates = [d for d in by_conf if not _is_coin_detection(d)]
    coin_candidates = [
        d
        for d in by_conf
        if _is_coin_detection(d)
        and not _is_giant_detection(d)
        and _detection_score(d) >= coin_route_min_conf
    ]
    giant_coin_candidates = [
        d
        for d in by_conf
        if _is_coin_detection(d)
        and _is_giant_detection(d)
        and _detection_score(d) >= coin_route_min_conf
    ]

    ranked: List[Dict[str, Any]] = []
    for cand in bill_candidates:
        cand["_target_kind"] = "bill"
        ranked.append(cand)
    for cand in coin_candidates:
        cand["_target_kind"] = "coin"
        ranked.append(cand)
    for cand in giant_coin_candidates:
        cand["_target_kind"] = "coin"
        ranked.append(cand)

    if ranked:
        return ranked

    top = by_conf[0]
    top["_target_kind"] = "unknown"
    return [top]


def _choose_target(
    detections: List[Dict[str, Any]],
    detector_conf_threshold: Optional[float] = None,
) -> Optional[Dict[str, Any]]:
    ranked = _rank_pipeline_targets(detections, detector_conf_threshold=detector_conf_threshold)
    if not ranked:
        return None
    return ranked[0]


def _choose_targets(
    detections: List[Dict[str, Any]],
    top_k_targets: int = 1,
    detector_conf_threshold: Optional[float] = None,
) -> List[Dict[str, Any]]:
    ranked = _rank_pipeline_targets(detections, detector_conf_threshold=detector_conf_threshold)
    if not ranked:
        return []
    try:
        k = int(top_k_targets)
    except Exception:
        k = 1
    k = max(1, min(k, settings.pipeline_max_topk_targets))
    return ranked[:k]


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


def _public_target_fields(target: Dict[str, Any]) -> Dict[str, Any]:
    return {
        k: v for k, v in target.items() if k not in {"_target_kind", "_source_index"}
    }


def _top_prediction_label(classification: Optional[Dict[str, Any]]) -> Optional[str]:
    if not isinstance(classification, dict):
        return None
    result = classification.get("result")
    if not isinstance(result, dict):
        return None
    preds = result.get("top_predictions")
    if not isinstance(preds, list) or not preds:
        return None
    first = preds[0] if isinstance(preds[0], dict) else {}
    label = str(first.get("class", "")).strip()
    return label or None


def _top_prediction_confidence(classification: Optional[Dict[str, Any]]) -> Optional[float]:
    if not isinstance(classification, dict):
        return None
    result = classification.get("result")
    if not isinstance(result, dict):
        return None
    preds = result.get("top_predictions")
    if not isinstance(preds, list) or not preds:
        return None
    first = preds[0] if isinstance(preds[0], dict) else {}
    try:
        return float(first.get("confidence"))
    except Exception:
        return None


def _meets_classifier_threshold(
    classification: Optional[Dict[str, Any]],
    classifier_conf_threshold: Optional[float],
) -> bool:
    if classifier_conf_threshold is None:
        return True
    conf = _top_prediction_confidence(classification)
    if conf is None:
        return False
    try:
        threshold = max(0.01, min(0.99, float(classifier_conf_threshold)))
    except Exception:
        return True
    return conf >= threshold


# ── Full pipeline process ────────────────────────────────────

def run_full_process(
    image: Image.Image,
    top_k_targets: int = 1,
    spoof_guard_enabled: Optional[bool] = None,
    detector_conf_threshold: Optional[float] = None,
    classifier_conf_threshold: Optional[float] = None,
) -> Dict[str, Any]:
    if _pipeline_detector is None or _pipeline_bill_reader is None or _pipeline_coin_classifier is None:
        ensure_pipeline_models(allow_refresh_from_defaults=True)

    try:
        requested_top_k = int(top_k_targets)
    except Exception:
        requested_top_k = 1
    requested_top_k = max(1, min(requested_top_k, settings.pipeline_max_topk_targets))

    spoof_check = run_spoof_guard(
        image,
        _pipeline_spoof_guard,
        enabled=spoof_guard_enabled,
    )
    out: Dict[str, Any] = {
        "pipeline_models": pipeline_status(),
        "spoof_check": spoof_check,
        "detector": {"type": "detector", "detections": []},
        "requested_top_k_targets": requested_top_k,
        "requested_detector_conf_threshold": detector_conf_threshold,
        "requested_classifier_conf_threshold": classifier_conf_threshold,
        "target": None,
        "classification": None,
        "candidates": [],
    }

    if spoof_check.get("blocked"):
        out["detector"] = {"type": "detector", "detections": []}
        out["warning"] = (
            "Potential screen spoofing attack detected. "
            "Show physical currency directly to the camera and try again."
        )
        return out

    det = predict_yolo_instance(
        _pipeline_detector,  # type: ignore[arg-type]
        image,
        conf_threshold=detector_conf_threshold,
    )
    detections = det.get("detections", [])
    targets = _choose_targets(
        detections,
        requested_top_k,
        detector_conf_threshold=detector_conf_threshold,
    )
    target = targets[0] if targets else None
    out["detector"] = det

    if target is None:
        return out

    out["target"] = _public_target_fields(target)

    for rank, candidate in enumerate(targets, start=1):
        kind = candidate.get("_target_kind")
        entry: Dict[str, Any] = {
            "rank": rank,
            "kind": kind,
            "target": _public_target_fields(candidate),
            "classification": None,
        }
        if kind in {"bill", "coin"}:
            crop = _crop_xyxy(image, candidate.get("xyxy", [0, 0, image.size[0], image.size[1]]))
            if kind == "bill":
                entry["classification"] = {
                    "kind": "bill_reader",
                    "result": predict_classifier_instance(_pipeline_bill_reader, crop),  # type: ignore[arg-type]
                }
            else:
                entry["classification"] = {
                    "kind": "coin_classifier",
                    "result": predict_classifier_instance(_pipeline_coin_classifier, crop),  # type: ignore[arg-type]
                }

            label = _top_prediction_label(entry["classification"])
            source_index = candidate.get("_source_index")
            if (
                label
                and _meets_classifier_threshold(entry["classification"], classifier_conf_threshold)
                and isinstance(source_index, int)
                and 0 <= source_index < len(detections)
            ):
                detections[source_index]["display_name"] = label
                conf = _top_prediction_confidence(entry["classification"])
                if conf is not None:
                    detections[source_index]["display_confidence"] = conf

            if rank == 1:
                out["classification"] = entry["classification"]
        out["candidates"].append(entry)

    return out
