"""
Legacy single-model inference endpoint.
"""

import io

from fastapi import APIRouter, File, HTTPException, UploadFile
from PIL import Image

from app.schemas.responses import ErrorResponse, LegacyInferResponse
from app.services.inference import predict_classifier, predict_yolo
from app.services.model_manager import model_state

router = APIRouter()


@router.post(
    "/",
    response_model=LegacyInferResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid image or unsupported active model type"},
        409: {"model": ErrorResponse, "description": "No active model selected – call /api/models/select first"},
        415: {"model": ErrorResponse, "description": "Uploaded file is not a supported image format"},
        422: {"model": ErrorResponse, "description": "Validation error (e.g. missing file field)"},
        500: {"model": ErrorResponse, "description": "Unexpected inference error"},
    },
    tags=["Legacy Inference"],
    summary="Single-model inference",
    description=(
        "Run inference using the manually-selected active model. "
        "Use `/api/models/select` first to choose a model. "
        "For the automatic multi-model pipeline, use `/api/pipeline/infer` instead."
    ),
)
async def infer(file: UploadFile = File(..., description="JPEG or PNG image file")):
    if model_state.loaded_model is None:
        raise HTTPException(
            status_code=409,
            detail="No active model selected. POST to /api/models/select first.",
        )

    # ── Validate content type early ──────────────────────────
    if file.content_type and file.content_type not in (
        "image/jpeg", "image/png", "image/webp", "image/bmp",
        "application/octet-stream",
    ):
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported media type: {file.content_type}. Expected JPEG or PNG.",
        )

    payload = await file.read()
    if not payload:
        raise HTTPException(status_code=400, detail="Empty file payload")

    try:
        image = Image.open(io.BytesIO(payload)).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Cannot decode image: {exc}")

    try:
        if model_state.loaded_model_kind == "classifier":
            result = predict_classifier(image)
        elif model_state.loaded_model_kind == "detector":
            result = predict_yolo(image)
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Active model type '{model_state.loaded_model_kind}' is unsupported for inference",
            )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Inference failed: {exc}")

    return {
        "model": model_state.loaded_model_name,
        "kind": model_state.loaded_model_kind,
        "result": result,
    }
