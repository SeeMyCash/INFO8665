"""
Pre-detector spoof/liveness guard.

Runs before detector inference so the API can warn or block when an input
looks like a replay/screen spoof attack.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import torch
from PIL import Image
from torchvision import transforms

from app.core.config import settings
from app.services.model_manager import LoadedModel

_SPOOF_HINTS = (
    "spoof",
    "replay",
    "screen",
    "display",
    "monitor",
    "attack",
    "fake",
    "photo",
    "print",
)
_LIVE_HINTS = (
    "live",
    "real",
    "auth",
    "genuine",
    "camera",
    "trusted",
)
_IMAGENET_MEAN = (0.485, 0.456, 0.406)
_IMAGENET_STD = (0.229, 0.224, 0.225)


def run_spoof_guard(
    image: Image.Image,
    spoof_model: Optional[LoadedModel],
    enabled: Optional[bool] = None,
) -> Dict[str, Any]:
    """Return spoof decision payload used by the pipeline response."""
    guard_enabled = settings.spoof_guard_enabled if enabled is None else bool(enabled)
    if not guard_enabled:
        return {
            "enabled": False,
            "blocked": False,
            "suspected": False,
            "decision": "disabled",
            "score": 0.0,
            "threshold": settings.spoof_guard_threshold,
            "source": "disabled",
            "model": spoof_model.name if spoof_model else None,
            "model_result": None,
            "heuristics": None,
            "reasons": [],
        }

    heur = _compute_heuristic_features(image)
    heur_score = float(heur.get("score", 0.0))

    model_eval, model_error = _compute_model_score(spoof_model, image)
    if model_eval is None:
        combined_score = heur_score
        threshold = float(settings.spoof_guard_heuristic_only_threshold)
        source = "heuristic_only"
    else:
        w_model = float(settings.spoof_guard_model_weight)
        w_heur = float(settings.spoof_guard_heuristic_weight)
        denom = max(1e-6, w_model + w_heur)
        combined_score = (
            (w_model * float(model_eval["spoof_probability"])) + (w_heur * heur_score)
        ) / denom
        threshold = float(settings.spoof_guard_threshold)
        source = "model+heuristic"

    suspected = combined_score >= threshold
    blocked = bool(suspected and settings.spoof_guard_block_on_detect)
    decision = "block" if blocked else ("warn" if suspected else "allow")

    reasons: List[str] = []
    if model_eval is None:
        reasons.append("No spoof model loaded; heuristic spoof guard is active.")
        if model_error:
            reasons.append(model_error)
    else:
        reasons.extend(model_eval.get("reasons", []))
    reasons.extend(heur.get("reasons", []))
    if suspected and not reasons:
        reasons.append("Combined spoof score exceeded threshold.")

    return {
        "enabled": True,
        "blocked": blocked,
        "suspected": suspected,
        "decision": decision,
        "score": round(float(combined_score), 4),
        "threshold": round(float(threshold), 4),
        "source": source,
        "model": spoof_model.name if spoof_model else None,
        "model_result": model_eval,
        "heuristics": {
            "score": round(float(heur_score), 4),
            "metrics": heur.get("metrics", {}),
        },
        "reasons": reasons[:6],
    }


def _compute_model_score(
    spoof_model: Optional[LoadedModel], image: Image.Image
) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    if spoof_model is None:
        return None, None
    if spoof_model.kind == "detector":
        return _compute_detector_model_score(spoof_model, image)
    if spoof_model.kind != "classifier":
        return None, (
            f"Spoof model '{spoof_model.name}' has unsupported kind '{spoof_model.kind}'."
        )
    if spoof_model.meta is None:
        return None, f"Spoof model '{spoof_model.name}' has no classifier metadata."

    classes = spoof_model.meta.get("classes")
    if not isinstance(classes, list) or not classes:
        return None, f"Spoof model '{spoof_model.name}' classes are unavailable."

    image_size = int(spoof_model.meta.get("image_size", 256))
    normalize_imagenet = bool(spoof_model.meta.get("normalize_imagenet", False))
    tfm_steps: List[Any] = [
        transforms.Resize((image_size, image_size)),
        transforms.ToTensor(),
    ]
    if normalize_imagenet:
        tfm_steps.append(transforms.Normalize(_IMAGENET_MEAN, _IMAGENET_STD))
    tfm = transforms.Compose(tfm_steps)
    x = tfm(image).unsqueeze(0)

    with torch.no_grad():
        logits = spoof_model.model(x)
        if logits.ndim == 1:
            logits = logits.unsqueeze(0)
        probs_t = torch.softmax(logits, dim=1).squeeze(0).cpu()

    probs = probs_t.tolist()
    if len(probs) != len(classes):
        return None, (
            f"Spoof model '{spoof_model.name}' output/classes mismatch "
            f"({len(probs)} vs {len(classes)})."
        )

    class_probs = {
        str(classes[i]): float(probs[i])
        for i in range(len(classes))
    }
    top = sorted(class_probs.items(), key=lambda kv: kv[1], reverse=True)
    top_preds = [
        {"class": name, "confidence": float(score)}
        for name, score in top[: min(3, len(top))]
    ]

    spoof_sum = 0.0
    live_sum = 0.0
    for cls_name, prob in class_probs.items():
        norm = _normalize_label(cls_name)
        if any(h in norm for h in _SPOOF_HINTS):
            spoof_sum += float(prob)
        if any(h in norm for h in _LIVE_HINTS):
            live_sum += float(prob)

    if spoof_sum > 0.0 or live_sum > 0.0:
        denom = max(1e-6, spoof_sum + live_sum)
        spoof_prob = spoof_sum / denom
    else:
        top_name, top_conf = top[0]
        top_norm = _normalize_label(top_name)
        if any(h in top_norm for h in _SPOOF_HINTS):
            spoof_prob = float(top_conf)
        elif any(h in top_norm for h in _LIVE_HINTS):
            spoof_prob = float(1.0 - top_conf)
        else:
            return None, (
                f"Spoof model '{spoof_model.name}' classes do not include spoof/live labels."
            )

    spoof_prob = max(0.0, min(1.0, float(spoof_prob)))
    live_prob = 1.0 - spoof_prob

    reasons: List[str] = []
    if spoof_prob >= 0.75:
        reasons.append(
            f"Spoof model predicts spoof risk at {spoof_prob * 100:.1f}%."
        )
    elif live_prob >= 0.75:
        reasons.append(
            f"Spoof model predicts live capture at {live_prob * 100:.1f}%."
        )

    return {
        "spoof_probability": round(spoof_prob, 4),
        "live_probability": round(live_prob, 4),
        "top_predictions": top_preds,
        "reasons": reasons,
    }, None


def _compute_detector_model_score(
    spoof_model: LoadedModel, image: Image.Image
) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    arr = np.array(image.convert("RGB"))
    img_h, img_w = arr.shape[:2]

    try:
        result = spoof_model.model.predict(
            source=arr,
            verbose=False,
            conf=0.05,
            iou=settings.detector_iou_threshold,
            max_det=max(1, settings.detector_max_det),
        )[0]
    except Exception as exc:
        return None, f"Spoof detector '{spoof_model.name}' inference failed: {exc}"

    names = result.names if isinstance(result.names, dict) else {}
    screen_like = ("screen", "display", "monitor", "tv", "laptop", "phone")
    candidates: List[Dict[str, Any]] = []

    for b in getattr(result, "boxes", []):
        cls_id = int(b.cls.item())
        class_name = str(names.get(cls_id, cls_id))
        conf = float(b.conf.item())
        xyxy = [float(v) for v in b.xyxy[0].tolist()]
        box_w = max(0.0, xyxy[2] - xyxy[0])
        box_h = max(0.0, xyxy[3] - xyxy[1])
        area_ratio = (box_w * box_h) / max(1.0, float(img_w * img_h))

        class_norm = _normalize_label(class_name)
        is_screen = (
            len(names) <= 1
            or any(token in class_norm for token in screen_like)
        )
        if not is_screen:
            continue

        # Favor confident large screen detections, but still count small confident screens.
        size_factor = 0.6 + (0.4 * min(1.0, area_ratio / 0.35))
        spoof_score = max(0.0, min(1.0, conf * size_factor))
        candidates.append(
            {
                "class": class_name,
                "confidence": round(conf, 4),
                "box_area_ratio": round(area_ratio, 4),
                "score": round(spoof_score, 4),
            }
        )

    if not candidates:
        spoof_prob = 0.0
        top_preds: List[Dict[str, Any]] = []
    else:
        ranked = sorted(candidates, key=lambda d: float(d.get("score", 0.0)), reverse=True)
        spoof_prob = float(ranked[0]["score"])
        top_preds = ranked[:3]

    spoof_prob = max(0.0, min(1.0, spoof_prob))
    live_prob = 1.0 - spoof_prob

    reasons: List[str] = []
    if spoof_prob >= 0.75:
        reasons.append(
            f"Spoof detector found screen-like content with {spoof_prob * 100:.1f}% risk."
        )
    elif candidates:
        reasons.append("Spoof detector found screen-like content below blocking threshold.")
    else:
        reasons.append("Spoof detector found no screen-like content.")

    return {
        "spoof_probability": round(spoof_prob, 4),
        "live_probability": round(live_prob, 4),
        "top_predictions": top_preds,
        "reasons": reasons,
    }, None


def _compute_heuristic_features(image: Image.Image) -> Dict[str, Any]:
    rgb = _to_small_rgb(image, max_side=640)
    gray = _rgb_to_gray(rgb)
    h, w = gray.shape
    if h < 16 or w < 16:
        return {
            "score": 0.0,
            "metrics": {},
            "reasons": ["Image is too small for spoof heuristics."],
        }

    border_px = max(2, int(round(min(h, w) * float(settings.spoof_guard_border_ratio))))
    if (border_px * 2) >= min(h, w):
        border_px = max(1, min(h, w) // 4)

    border_mask = np.zeros((h, w), dtype=bool)
    border_mask[:border_px, :] = True
    border_mask[-border_px:, :] = True
    border_mask[:, :border_px] = True
    border_mask[:, -border_px:] = True

    center = gray[border_px : h - border_px, border_px : w - border_px]
    if center.size == 0:
        center = gray
    border_vals = gray[border_mask]

    center_mean = float(center.mean()) if center.size else float(gray.mean())
    border_mean = float(border_vals.mean()) if border_vals.size else center_mean
    border_luma_drop = max(0.0, (center_mean - border_mean) / 255.0)

    edges = _edge_map(gray)
    edge_total = float(edges.sum())
    edge_border = float((edges & border_mask).sum())
    border_edge_ratio = edge_border / max(1.0, edge_total)

    highlight_ratio = float((gray >= 245).sum() / gray.size)
    high_freq_ratio = _high_freq_energy_ratio(gray)

    s_border_drop = _scale(border_luma_drop, 0.08, 0.28)
    s_border_edges = _scale(border_edge_ratio, 0.24, 0.65)
    s_high_freq = _scale(high_freq_ratio, 0.58, 0.88)
    s_highlights = _scale(highlight_ratio, 0.02, 0.14)

    score = (
        (0.35 * s_border_drop)
        + (0.25 * s_border_edges)
        + (0.25 * s_high_freq)
        + (0.15 * s_highlights)
    )
    score = max(0.0, min(1.0, float(score)))

    reasons: List[str] = []
    if border_luma_drop >= 0.16:
        reasons.append("Detected strong dark border pattern similar to a display frame.")
    if border_edge_ratio >= 0.50:
        reasons.append("Edge concentration near frame boundary looks display-like.")
    if high_freq_ratio >= 0.75:
        reasons.append("High-frequency texture suggests display pixel/moire artifacts.")
    if highlight_ratio >= 0.08:
        reasons.append("Large bright clipped area may indicate screen glare.")

    metrics = {
        "border_luma_drop": round(border_luma_drop, 4),
        "border_edge_ratio": round(border_edge_ratio, 4),
        "high_freq_ratio": round(high_freq_ratio, 4),
        "highlight_ratio": round(highlight_ratio, 4),
    }
    return {"score": score, "metrics": metrics, "reasons": reasons}


def _to_small_rgb(image: Image.Image, max_side: int = 640) -> np.ndarray:
    rgb = image.convert("RGB")
    w, h = rgb.size
    largest = max(w, h)
    if largest > max_side:
        scale = float(max_side) / float(largest)
        rgb = rgb.resize((max(1, int(round(w * scale))), max(1, int(round(h * scale)))))
    arr = np.asarray(rgb, dtype=np.uint8)
    if arr.ndim != 3 or arr.shape[2] != 3:
        raise ValueError("Expected RGB image array.")
    return arr


def _rgb_to_gray(rgb: np.ndarray) -> np.ndarray:
    gray = (
        0.299 * rgb[:, :, 0].astype(np.float32)
        + 0.587 * rgb[:, :, 1].astype(np.float32)
        + 0.114 * rgb[:, :, 2].astype(np.float32)
    )
    return np.clip(gray, 0.0, 255.0).astype(np.uint8)


def _edge_map(gray: np.ndarray) -> np.ndarray:
    try:
        import cv2  # type: ignore

        edges = cv2.Canny(gray, threshold1=80, threshold2=160)
        return edges > 0
    except Exception:
        g = gray.astype(np.float32)
        gx = np.diff(g, axis=1, prepend=g[:, :1])
        gy = np.diff(g, axis=0, prepend=g[:1, :])
        mag = np.sqrt((gx * gx) + (gy * gy))
        thresh = np.percentile(mag, 85)
        return mag >= thresh


def _high_freq_energy_ratio(gray: np.ndarray) -> float:
    f = np.fft.fftshift(np.fft.fft2(gray.astype(np.float32) / 255.0))
    mag = np.abs(f)
    h, w = gray.shape
    yy, xx = np.ogrid[:h, :w]
    cy = (h - 1) / 2.0
    cx = (w - 1) / 2.0
    dist = np.sqrt((yy - cy) ** 2 + (xx - cx) ** 2)
    max_dist = float(dist.max()) if dist.size else 1.0
    norm_dist = dist / max(1e-6, max_dist)
    high_mask = norm_dist >= 0.45
    high_energy = float(mag[high_mask].sum())
    total_energy = float(mag.sum())
    if total_energy <= 1e-8:
        return 0.0
    return high_energy / total_energy


def _scale(value: float, lo: float, hi: float) -> float:
    if hi <= lo:
        return 0.0
    return max(0.0, min(1.0, (float(value) - float(lo)) / (float(hi) - float(lo))))


def _normalize_label(label: Any) -> str:
    txt = str(label).strip().lower()
    return txt.replace("-", "_").replace(" ", "_")
