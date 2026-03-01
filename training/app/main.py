#!/usr/bin/env python3
import io
import tarfile
from pathlib import Path
from typing import Any, Dict, Optional

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
MODELS_DIR = Path(Path.cwd() / "models").resolve()
MODELS_DIR.mkdir(parents=True, exist_ok=True)

S3_REGION = "us-east-1"
ARTIFACTS_BUCKET = None
ARTIFACTS_PREFIX = "output"

_loaded_model: Optional[Any] = None
_loaded_model_name: Optional[str] = None
_loaded_model_kind: Optional[str] = None
_classifier_meta: Optional[Dict[str, Any]] = None


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


def _extract_model_tarball(tar_path: Path, target_name: str) -> Optional[Path]:
    out_dir = MODELS_DIR / target_name
    out_dir.mkdir(parents=True, exist_ok=True)

    with tarfile.open(tar_path, "r:gz") as tar:
        tar.extractall(out_dir)

    classifier = out_dir / "model.pt"
    yolo_best = out_dir / "weights" / "best.pt"
    yolo_root = out_dir / "best.pt"

    if classifier.exists():
        flat_path = MODELS_DIR / f"{target_name}__model.pt"
        flat_path.write_bytes(classifier.read_bytes())
        return flat_path
    if yolo_best.exists():
        flat_path = MODELS_DIR / f"{target_name}__best.pt"
        flat_path.write_bytes(yolo_best.read_bytes())
        return flat_path
    if yolo_root.exists():
        flat_path = MODELS_DIR / f"{target_name}__best.pt"
        flat_path.write_bytes(yolo_root.read_bytes())
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


def _predict_yolo(image: Image.Image) -> dict[str, Any]:
    arr = np.array(image.convert("RGB"))
    result = _loaded_model.predict(source=arr, verbose=False)[0]

    boxes = []
    names = result.names
    for b in result.boxes:
        cls_id = int(b.cls.item())
        conf = float(b.conf.item())
        xyxy = [float(v) for v in b.xyxy[0].tolist()]
        boxes.append(
            {
                "class_id": cls_id,
                "class_name": names.get(cls_id, str(cls_id)),
                "confidence": conf,
                "xyxy": xyxy,
            }
        )

    return {
        "type": "detector",
        "detections": boxes,
    }


app = FastAPI(title="SMC Model Inference App", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
def root_index():
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/api/health")
def health():
    return {
        "ok": True,
        "active_model": _loaded_model_name,
        "active_kind": _loaded_model_kind,
        "available_models": _list_local_models(),
    }


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
