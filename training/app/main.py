#!/usr/bin/env python3
import io
import time
import tarfile
import re
import logging
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import boto3
import numpy as np
import torch
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image
from pydantic import BaseModel
from torchvision import models, transforms

APP_DIR = Path(__file__).resolve().parent
STATIC_DIR = APP_DIR / "static"
RN_DIR = STATIC_DIR / "rn"
DEPLOY_ROOT = Path.cwd().parent
MODELS_DIR = Path(Path.cwd() / "models").resolve()
MODELS_DIR.mkdir(parents=True, exist_ok=True)

S3_REGION = "us-east-1"
ARTIFACTS_BUCKET = None
ARTIFACTS_PREFIX = "output"

DETECTOR_CONF_THRESHOLD = 0.02
DETECTOR_IOU_THRESHOLD = 0.45
DETECTOR_MAX_DET = 20

_loaded_model: Optional[Any] = None
_loaded_model_name: Optional[str] = None
_loaded_model_kind: Optional[str] = None
_classifier_meta: Optional[Dict[str, Any]] = None

# ── Server-side stats ──────────────────────────────────
_server_start_time: float = time.time()
_inference_count: int = 0
_inference_total_ms: float = 0.0
_inference_errors: int = 0
_last_inference_ms: Optional[float] = None

logger = logging.getLogger("smc")


@dataclass
class _Loaded:
    name: str
    kind: str
    model: Any
    meta: Optional[Dict[str, Any]] = None


_pipeline_detector: Optional[_Loaded] = None
_pipeline_bill_reader: Optional[_Loaded] = None
_pipeline_coin_classifier: Optional[_Loaded] = None


class SelectModelRequest(BaseModel):
    model_name: str


class RefreshRequest(BaseModel):
    artifacts_bucket: str
    artifacts_prefix: str = "output"
    max_models: int = 20
    region: str = "us-east-1"


def _build_classifier(backbone: str, num_classes: int):
    if backbone == "mobilenetv3_small":
        model = models.mobilenet_v3_small(weights=None)
        model.classifier[-1] = torch.nn.Linear(model.classifier[-1].in_features, num_classes)
        return model

    model = models.resnet18(weights=None)
    model.fc = torch.nn.Linear(model.fc.in_features, num_classes)
    return model


def _list_local_models() -> list[str]:
    items = []
    for suffix in ("*.pt", "*.pth"):
        items.extend(MODELS_DIR.glob(suffix))
    return sorted({p.name for p in items})


def _parse_run_tag(name: str) -> Optional[datetime]:
    m = re.search(r"(\d{8}-\d{6})", name)
    if not m:
        return None
    try:
        return datetime.strptime(m.group(1), "%Y%m%d-%H%M%S")
    except Exception:
        return None


def _pick_latest(candidates: list[str]) -> Optional[str]:
    if not candidates:
        return None

    def key(n: str):
        dt = _parse_run_tag(n)
        # Put known timestamps first, then fall back to name sort.
        return (dt is not None, dt or datetime.min, n)

    return max(candidates, key=key)


def _extract_model_tarball(tar_path: Path, target_name: str) -> Optional[Path]:
    out_dir = MODELS_DIR / target_name
    out_dir.mkdir(parents=True, exist_ok=True)

    with tarfile.open(tar_path, "r:gz") as tar:
        tar.extractall(out_dir)

    classifier = out_dir / "model.pt"
    yolo_candidates = [
        out_dir / "train" / "weights" / "best.pt",
        out_dir / "weights" / "best.pt",
        out_dir / "best.pt",
    ]

    for yolo_best in yolo_candidates:
        if yolo_best.exists():
            flat_path = MODELS_DIR / f"{target_name}__best.pt"
            flat_path.write_bytes(yolo_best.read_bytes())
            return flat_path

    if classifier.exists():
        flat_path = MODELS_DIR / f"{target_name}__model.pt"
        flat_path.write_bytes(classifier.read_bytes())
        return flat_path
    return None


def sync_models_from_s3(bucket: str, prefix: str, max_models: int, region: str) -> dict[str, Any]:
    s3 = boto3.client("s3", region_name=region)

    paginator = s3.get_paginator("list_objects_v2")
    found = []
    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        for obj in page.get("Contents", []):
            key = obj["Key"]
            if key.endswith("/output/model.tar.gz"):
                found.append((key, obj["LastModified"]))

    found.sort(key=lambda x: x[1], reverse=True)
    found = found[: max_models if max_models > 0 else 20]

    downloaded = []
    for key, _ in found:
        job_name = key.split("/")[1] if "/" in key else key.replace("/", "_")
        local_tar = MODELS_DIR / f"{job_name}.tar.gz"
        s3.download_file(bucket, key, str(local_tar))
        maybe = _extract_model_tarball(local_tar, job_name)
        if maybe is not None:
            downloaded.append(maybe.name)

    return {
        "downloaded": downloaded,
        "available": _list_local_models(),
    }


def _load_model(model_name: str):
    global _loaded_model
    global _loaded_model_name
    global _loaded_model_kind
    global _classifier_meta

    model_path = MODELS_DIR / model_name
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

        model = _build_classifier(backbone, len(classes))
        model.load_state_dict(ckpt["model_state_dict"])
        model.eval()

        _loaded_model = model
        _loaded_model_name = model_name
        _loaded_model_kind = "classifier"
        _classifier_meta = {
            "classes": classes,
            "image_size": image_size,
            "backbone": backbone,
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
            _loaded_model = YOLO(str(model_path))
            _loaded_model_name = model_name
            _loaded_model_kind = "detector"
            _classifier_meta = None
            return
        except Exception as exc:
            if detector_like_name:
                raise HTTPException(status_code=400, detail=f"Detector activation failed: {exc}")

    raise HTTPException(status_code=400, detail="Unsupported checkpoint format")


def _load_model_instance(model_name: str) -> _Loaded:
    model_path = MODELS_DIR / model_name
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

        model = _build_classifier(backbone, len(classes))
        model.load_state_dict(ckpt["model_state_dict"])
        model.eval()
        return _Loaded(
            name=model_name,
            kind="classifier",
            model=model,
            meta={
                "classes": classes,
                "image_size": image_size,
                "backbone": backbone,
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
            return _Loaded(name=model_name, kind="detector", model=model, meta=None)
        except Exception as exc:
            if detector_like_name:
                raise HTTPException(status_code=400, detail=f"Detector activation failed: {exc}")

    raise HTTPException(status_code=400, detail="Unsupported checkpoint format")


def _predict_classifier(image: Image.Image) -> dict[str, Any]:
    if _classifier_meta is None:
        raise HTTPException(status_code=500, detail="Classifier metadata unavailable")

    tfm = transforms.Compose([
        transforms.Resize((_classifier_meta["image_size"], _classifier_meta["image_size"])),
        transforms.ToTensor(),
    ])

    x = tfm(image).unsqueeze(0)
    with torch.no_grad():
        logits = _loaded_model(x)
        probs = torch.softmax(logits, dim=1).squeeze(0)

    topk = min(5, probs.numel())
    values, indices = torch.topk(probs, k=topk)
    preds = []
    for score, idx in zip(values.tolist(), indices.tolist()):
        preds.append({
            "class": _classifier_meta["classes"][idx],
            "confidence": float(score),
        })

    return {
        "type": "classifier",
        "top_predictions": preds,
    }


def _predict_classifier_instance(loaded: _Loaded, image: Image.Image) -> dict[str, Any]:
    if loaded.meta is None:
        raise HTTPException(status_code=500, detail="Classifier metadata unavailable")

    tfm = transforms.Compose(
        [
            transforms.Resize((loaded.meta["image_size"], loaded.meta["image_size"])),
            transforms.ToTensor(),
        ]
    )

    x = tfm(image).unsqueeze(0)
    with torch.no_grad():
        logits = loaded.model(x)
        probs = torch.softmax(logits, dim=1).squeeze(0)

    topk = min(5, probs.numel())
    values, indices = torch.topk(probs, k=topk)
    preds = []
    for score, idx in zip(values.tolist(), indices.tolist()):
        preds.append(
            {
                "class": loaded.meta["classes"][idx],
                "confidence": float(score),
            }
        )

    return {
        "type": "classifier",
        "top_predictions": preds,
    }


def _predict_yolo(image: Image.Image) -> dict[str, Any]:
    arr = np.array(image.convert("RGB"))
    result = _loaded_model.predict(
        source=arr,
        verbose=False,
        conf=DETECTOR_CONF_THRESHOLD,
        iou=DETECTOR_IOU_THRESHOLD,
        max_det=DETECTOR_MAX_DET,
    )[0]

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

    return {
        "type": "detector",
        "detections": boxes,
    }


def _predict_yolo_instance(loaded: _Loaded, image: Image.Image) -> dict[str, Any]:
    arr = np.array(image.convert("RGB"))
    result = loaded.model.predict(
        source=arr,
        verbose=False,
        conf=DETECTOR_CONF_THRESHOLD,
        iou=DETECTOR_IOU_THRESHOLD,
        max_det=DETECTOR_MAX_DET,
    )[0]

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

    return {
        "type": "detector",
        "detections": boxes,
    }


def _passes_detection_filters(det: dict[str, Any], img_w: int, img_h: int) -> bool:
    try:
        x1, y1, x2, y2 = [float(v) for v in det.get("xyxy", [0, 0, 0, 0])]
    except Exception:
        return False

    box_w = max(0.0, x2 - x1)
    box_h = max(0.0, y2 - y1)
    if box_w <= 1.0 or box_h <= 1.0:
        return False

    return True


def _select_pipeline_models() -> dict[str, Any]:
    """Select and load one detector + bill reader + coin classifier from local models."""

    global _pipeline_detector, _pipeline_bill_reader, _pipeline_coin_classifier

    all_models = _list_local_models()
    detectors = [m for m in all_models if _is_detector_name(m)]

    # Both readers/classifiers are torch checkpoints flattened as *__model.pt
    bill_readers = [m for m in all_models if _is_bill_reader_name(m)]
    coin_classifiers = [m for m in all_models if _is_coin_classifier_name(m)]

    det_name = _pick_latest(detectors)
    bill_name = _pick_latest(bill_readers)
    coin_name = _pick_latest(coin_classifiers)

    if det_name is None:
        raise HTTPException(status_code=400, detail="No detector model found locally. Refresh from S3 first.")
    if bill_name is None:
        raise HTTPException(status_code=400, detail="No bill reader model found locally. Refresh from S3 first.")
    if coin_name is None:
        raise HTTPException(status_code=400, detail="No coin classifier model found locally. Refresh from S3 first.")

    _pipeline_detector = _load_model_instance(det_name)
    _pipeline_bill_reader = _load_model_instance(bill_name)
    _pipeline_coin_classifier = _load_model_instance(coin_name)

    return {
        "detector": _pipeline_detector.name,
        "bill_reader": _pipeline_bill_reader.name,
        "coin_classifier": _pipeline_coin_classifier.name,
    }


def _pipeline_status() -> dict[str, Any]:
    return {
        "detector": _pipeline_detector.name if _pipeline_detector else None,
        "bill_reader": _pipeline_bill_reader.name if _pipeline_bill_reader else None,
        "coin_classifier": _pipeline_coin_classifier.name if _pipeline_coin_classifier else None,
    }


def _is_detector_name(model_name: str) -> bool:
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


def _is_coin_classifier_name(model_name: str) -> bool:
    n = model_name.lower()
    if "__model.pt" not in n:
        return False
    return "coin" in n


def _is_bill_reader_name(model_name: str) -> bool:
    n = model_name.lower()
    if "__model.pt" not in n:
        return False
    if _is_coin_classifier_name(model_name):
        return False
    return (
        "bill-reader" in n
        or "bill_reader" in n
        or "billreader" in n
        or "champ-bill" in n
        or "banknote" in n
        or "bill" in n
    )


def _read_deploy_text(name: str) -> Optional[str]:
    try:
        p = (DEPLOY_ROOT / name).resolve()
        if not p.exists():
            return None
        return p.read_text(encoding="utf-8").strip() or None
    except Exception:
        return None


def _refresh_from_deploy_defaults(max_models: int = 30, region: str = S3_REGION) -> bool:
    bucket = _read_deploy_text("models_bucket.txt")
    if not bucket:
        return False
    prefix = _read_deploy_text("models_prefix.txt") or ARTIFACTS_PREFIX
    try:
        result = sync_models_from_s3(
            bucket=bucket,
            prefix=prefix,
            max_models=max_models,
            region=region,
        )
    except Exception:
        return False
    downloaded = result.get("downloaded", []) or []
    available = result.get("available", []) or []
    return bool(downloaded or available)


def _ensure_pipeline_models(allow_refresh_from_defaults: bool = True) -> dict[str, Any]:
    state = _pipeline_status()
    if state["detector"] and state["bill_reader"] and state["coin_classifier"]:
        return state

    try:
        return _select_pipeline_models()
    except HTTPException:
        if not allow_refresh_from_defaults:
            raise
        if not _refresh_from_deploy_defaults():
            raise
        return _select_pipeline_models()


def _choose_target(detections: list[dict[str, Any]]) -> Optional[dict[str, Any]]:
    if not detections:
        return None

    def score(d: dict[str, Any]) -> float:
        try:
            return float(d.get("confidence", 0.0))
        except Exception:
            return 0.0

    by_conf = sorted(detections, key=score, reverse=True)

    def is_coin(d: dict[str, Any]) -> bool:
        name = str(d.get("class_name", "")).strip().lower()
        if not name:
            return False
        return name == "coin" or "coin" in name

    def is_giant(d: dict[str, Any]) -> bool:
        try:
            return float(d.get("box_area_ratio", 0.0)) >= 0.65
        except Exception:
            return False

    # Unified "money detector" uses COIN + banknote denomination classes like CAD_5.
    # For pipeline routing, treat COIN as coin; treat everything else as a bill.
    # De-prioritize giant coin detections because they are often whole-image false positives.
    coin_candidates = [d for d in by_conf if is_coin(d) and not is_giant(d)]
    bill_candidates = [d for d in by_conf if not is_coin(d)]

    if bill_candidates:
        bill_candidates[0]["_target_kind"] = "bill"
        return bill_candidates[0]

    if coin_candidates:
        coin_candidates[0]["_target_kind"] = "coin"
        return coin_candidates[0]

    # If only giant coin detections exist, still return best available target as fallback.
    giant_coin_candidates = [d for d in by_conf if is_coin(d)]
    if giant_coin_candidates:
        giant_coin_candidates[0]["_target_kind"] = "coin"
        return giant_coin_candidates[0]

    top = by_conf[0]
    top["_target_kind"] = "unknown"
    return top


def _crop_xyxy(image: Image.Image, xyxy: list[float]) -> Image.Image:
    x1, y1, x2, y2 = xyxy
    w, h = image.size
    left = max(0, min(w, int(round(x1))))
    top = max(0, min(h, int(round(y1))))
    right = max(0, min(w, int(round(x2))))
    bottom = max(0, min(h, int(round(y2))))
    if right <= left or bottom <= top:
        return image
    return image.crop((left, top, right, bottom))


def run_full_process(image: Image.Image) -> dict[str, Any]:
    if _pipeline_detector is None or _pipeline_bill_reader is None or _pipeline_coin_classifier is None:
        _ensure_pipeline_models(allow_refresh_from_defaults=True)

    det = _predict_yolo_instance(_pipeline_detector, image)
    detections = det.get("detections", [])
    target = _choose_target(detections)

    out: dict[str, Any] = {
        "pipeline_models": _pipeline_status(),
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
            "result": _predict_classifier_instance(_pipeline_bill_reader, crop),
        }
    else:
        out["classification"] = {
            "kind": "coin_classifier",
            "result": _predict_classifier_instance(_pipeline_coin_classifier, crop),
        }
    return out


# ═══════════════════════════════════════════════════════════════
# ██  FastAPI App
# ═══════════════════════════════════════════════════════════════

APP_VERSION = "0.3.0"

app = FastAPI(title="SMC Model Inference App", version=APP_VERSION)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# ── React Native (Expo web) app — served at /rn ──
# The Expo web export references /_expo/… and /assets/… with root-relative paths
# inside the bundled JS, so we mount those directories at the root level.
if RN_DIR.is_dir():
    _rn_expo = RN_DIR / "_expo"
    _rn_assets = RN_DIR / "assets"
    if _rn_expo.is_dir():
        app.mount("/_expo", StaticFiles(directory=_rn_expo), name="rn_expo")
    if _rn_assets.is_dir():
        app.mount("/assets", StaticFiles(directory=_rn_assets), name="rn_assets")


@app.on_event("startup")
def _startup_event():
    """Auto-load pipeline models on server start so first inference is fast."""
    global _server_start_time
    _server_start_time = time.time()
    try:
        _ensure_pipeline_models(allow_refresh_from_defaults=True)
        logger.info("Pipeline models loaded on startup.")
    except Exception as exc:
        logger.warning(f"Could not auto-load pipeline on startup: {exc}")


# ── Static / index ──

@app.get("/")
def root_index():
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/rn")
@app.get("/rn/{rest_of_path:path}")
def rn_index(rest_of_path: str = ""):
    """Serve the React Native (Expo web) SPA — all client routes return index.html."""
    rn_html = RN_DIR / "index.html"
    if not rn_html.is_file():
        raise HTTPException(status_code=404, detail="React Native web build not found")
    return FileResponse(rn_html)


# ── Health ──

@app.get("/api/health")
def health():
    pipeline_error = None
    try:
        pipeline = _ensure_pipeline_models(allow_refresh_from_defaults=True)
    except Exception as exc:
        pipeline = _pipeline_status()
        pipeline_error = str(getattr(exc, "detail", exc))

    return {
        "ok": True,
        "active_model": _loaded_model_name,
        "active_kind": _loaded_model_kind,
        "available_models": _list_local_models(),
        "pipeline": pipeline,
        "pipeline_error": pipeline_error,
    }


# ── Version ──

@app.get("/api/version")
def get_version():
    """Server version, uptime, device info, and model count."""
    uptime_s = time.time() - _server_start_time
    cuda = torch.cuda.is_available() if torch else False
    return {
        "version": APP_VERSION,
        "uptime_seconds": round(uptime_s, 1),
        "torch_available": True,
        "cuda_available": cuda,
        "device": str(torch.device("cuda" if cuda else "cpu")),
        "models_dir": str(MODELS_DIR),
        "models_count": len(_list_local_models()),
    }


# ── Config ──

@app.get("/api/config")
def get_config():
    return {
        "defaults": {
            "artifacts_bucket": _read_deploy_text("models_bucket.txt"),
            "artifacts_prefix": _read_deploy_text("models_prefix.txt"),
        }
    }


# ── Pipeline endpoints ──

@app.get("/api/pipeline/status")
def pipeline_status():
    pipeline_error = None
    try:
        pipeline = _ensure_pipeline_models(allow_refresh_from_defaults=True)
    except Exception as exc:
        pipeline = _pipeline_status()
        pipeline_error = str(getattr(exc, "detail", exc))

    return {
        "pipeline": pipeline,
        "pipeline_error": pipeline_error,
    }


@app.get("/api/pipeline/stats")
def pipeline_stats():
    """Server-side inference statistics."""
    avg = round(_inference_total_ms / _inference_count, 1) if _inference_count > 0 else None
    return {
        "inference_count": _inference_count,
        "inference_errors": _inference_errors,
        "avg_latency_ms": avg,
        "last_latency_ms": round(_last_inference_ms, 1) if _last_inference_ms else None,
        "uptime_seconds": round(time.time() - _server_start_time, 1),
    }


@app.post("/api/pipeline/auto_select")
def pipeline_auto_select():
    return {
        "pipeline": _ensure_pipeline_models(allow_refresh_from_defaults=True),
    }


@app.post("/api/pipeline/refresh")
def pipeline_refresh_defaults():
    """Refresh models from S3 using deploy defaults — no body required."""
    result = _refresh_from_deploy_defaults()
    return {
        "refreshed": result,
        "available_models": _list_local_models(),
        "pipeline": _pipeline_status(),
    }


@app.post("/api/pipeline/infer")
async def pipeline_infer(file: UploadFile = File(...)):
    global _inference_count, _inference_total_ms, _inference_errors, _last_inference_ms
    payload = await file.read()
    try:
        image = Image.open(io.BytesIO(payload)).convert("RGB")
    except Exception as exc:
        _inference_errors += 1
        raise HTTPException(status_code=400, detail=f"Invalid image payload: {exc}")

    t0 = time.time()
    try:
        result = run_full_process(image)
    except Exception as exc:
        _inference_errors += 1
        raise HTTPException(status_code=500, detail=f"Pipeline error: {exc}")
    elapsed_ms = (time.time() - t0) * 1000
    _inference_count += 1
    _inference_total_ms += elapsed_ms
    _last_inference_ms = elapsed_ms

    return {
        "kind": "pipeline",
        "result": result,
        "server_timing_ms": round(elapsed_ms, 1),
    }


# ── Model management ──

@app.post("/api/models/refresh")
def refresh_models(req: RefreshRequest):
    result = sync_models_from_s3(
        bucket=req.artifacts_bucket,
        prefix=req.artifacts_prefix,
        max_models=req.max_models,
        region=req.region,
    )
    return result


@app.get("/api/models")
def list_models():
    return {
        "active_model": _loaded_model_name,
        "active_kind": _loaded_model_kind,
        "models": _list_local_models(),
    }


@app.post("/api/models/select")
def select_model(req: SelectModelRequest):
    _load_model(req.model_name)
    return {
        "selected": _loaded_model_name,
        "kind": _loaded_model_kind,
    }


# ── Legacy single-model inference ──

@app.post("/api/infer")
async def infer(file: UploadFile = File(...)):
    if _loaded_model is None:
        raise HTTPException(status_code=400, detail="No active model selected")

    payload = await file.read()
    try:
        image = Image.open(io.BytesIO(payload)).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid image payload: {exc}")

    if _loaded_model_kind == "classifier":
        result = _predict_classifier(image)
    elif _loaded_model_kind == "detector":
        result = _predict_yolo(image)
    else:
        raise HTTPException(status_code=400, detail="Active model type is unsupported")

    return {
        "model": _loaded_model_name,
        "kind": _loaded_model_kind,
        "result": result,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=False)
