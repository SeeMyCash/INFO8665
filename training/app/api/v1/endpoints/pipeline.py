"""
Pipeline endpoints – status, stats, auto-select, refresh, and inference.
"""

import io
import logging
import time
from typing import Any, Dict, Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from PIL import Image

from app.schemas.responses import (
    ErrorResponse,
    PipelineAutoSelectResponse,
    PipelineInferResponse,
    PipelineRefreshResponse,
    PipelineStatsResponse,
    PipelineStatusResponse,
)
from app.services.model_manager import list_local_models
from app.services.pipeline import (
    ensure_pipeline_models,
    inference_count,
    inference_errors,
    inference_total_ms,
    last_inference_ms,
    pipeline_status,
    run_full_process,
    server_start_time,
)
from app.services.s3_sync import aws_model_sync_reason, refresh_from_deploy_defaults
import app.services.pipeline as _pl

logger = logging.getLogger("smc.pipeline")

router = APIRouter()


@router.get(
    "/status",
    response_model=PipelineStatusResponse,
    responses={
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    tags=["Pipeline"],
    summary="Pipeline model status",
    description="Shows which detector, bill reader, and coin classifier are currently loaded in the pipeline.",
)
def status():
    pipeline_error = None
    try:
        pipeline = ensure_pipeline_models(allow_refresh_from_defaults=True)
    except Exception as exc:
        pipeline = pipeline_status()
        pipeline_error = str(getattr(exc, "detail", exc))

    return {"pipeline": pipeline, "pipeline_error": pipeline_error}


@router.get(
    "/stats",
    response_model=PipelineStatsResponse,
    responses={
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    tags=["Pipeline"],
    summary="Inference statistics",
    description="Aggregate inference count, error count, average latency, and server uptime.",
)
def stats():
    """Server-side inference statistics."""
    avg = round(_pl.inference_total_ms / _pl.inference_count, 1) if _pl.inference_count > 0 else None
    return {
        "inference_count": _pl.inference_count,
        "inference_errors": _pl.inference_errors,
        "avg_latency_ms": avg,
        "last_latency_ms": round(_pl.last_inference_ms, 1) if _pl.last_inference_ms else None,
        "uptime_seconds": round(time.time() - _pl.server_start_time, 1),
    }


@router.post(
    "/auto_select",
    response_model=PipelineAutoSelectResponse,
    responses={
        503: {"model": ErrorResponse, "description": "Required model artifacts are not available locally or via S3"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    tags=["Pipeline"],
    summary="Auto-select pipeline models",
    description=(
        "Automatically picks the latest detector, bill reader, and coin classifier "
        "from local models. Falls back to S3 refresh if models are missing."
    ),
)
def auto_select():
    try:
        return {"pipeline": ensure_pipeline_models(allow_refresh_from_defaults=True)}
    except HTTPException as exc:
        # Promote "model not found" to 503 Service Unavailable
        if exc.status_code == 400:
            raise HTTPException(status_code=503, detail=exc.detail) from exc
        raise


@router.post(
    "/refresh",
    response_model=PipelineRefreshResponse,
    responses={
        502: {"model": ErrorResponse, "description": "S3 download or network error"},
        503: {"model": ErrorResponse, "description": "S3 deploy defaults not configured"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    tags=["Pipeline"],
    summary="Refresh models from S3",
    description="Downloads the latest model artifacts from S3 using deploy-time defaults, then returns updated model list.",
)
def refresh_defaults():
    """Refresh models from S3 using deploy defaults — no body required."""
    reason = aws_model_sync_reason()
    if reason is not None:
        return {
            "refreshed": False,
            "reason": reason,
            "available_models": list_local_models(),
            "pipeline": pipeline_status(),
        }

    try:
        result = refresh_from_deploy_defaults()
    except Exception as exc:
        logger.exception("S3 refresh failed")
        raise HTTPException(
            status_code=502,
            detail=f"Failed to download models from S3: {exc}",
        ) from exc

    if not result:
        raise HTTPException(
            status_code=503,
            detail="S3 deploy defaults are not configured (models_bucket.txt missing or empty).",
        )

    return {
        "refreshed": result,
        "available_models": list_local_models(),
        "pipeline": pipeline_status(),
    }


@router.post(
    "/infer",
    response_model=PipelineInferResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid or unreadable image payload"},
        415: {"model": ErrorResponse, "description": "Uploaded file is not a supported image format"},
        422: {"model": ErrorResponse, "description": "Validation error (e.g. missing file field)"},
        500: {"model": ErrorResponse, "description": "Unexpected pipeline processing error"},
        503: {"model": ErrorResponse, "description": "Pipeline models are not loaded"},
    },
    tags=["Pipeline"],
    summary="Run full pipeline inference",
    description=(
        "Upload a JPEG/PNG image. The pipeline runs:\n\n"
        "1. **Detector** — locates money objects in the image\n"
        "2. **Target selection** — picks the highest-confidence detection\n"
        "3. **Classifier** — crops the target and classifies it as a bill denomination or coin type\n\n"
        "Returns detector results, the chosen target, and the classification result."
    ),
)
async def infer(
    file: UploadFile = File(..., description="JPEG or PNG image file"),
    top_k_targets: Optional[str] = Form(None, description="Number of top detection targets to classify (1–5)"),
):
    # ── Validate content type early ──────────────────────────
    if file.content_type and file.content_type not in (
        "image/jpeg", "image/png", "image/webp", "image/bmp",
        "application/octet-stream",
    ):
        _pl.inference_errors += 1
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported media type: {file.content_type}. Expected JPEG or PNG.",
        )

    payload = await file.read()
    if not payload:
        _pl.inference_errors += 1
        raise HTTPException(status_code=400, detail="Empty file payload")

    try:
        image = Image.open(io.BytesIO(payload)).convert("RGB")
    except Exception as exc:
        _pl.inference_errors += 1
        raise HTTPException(status_code=400, detail=f"Cannot decode image: {exc}")

    # ── Ensure pipeline is ready ─────────────────────────────
    if _pl._pipeline_detector is None or _pl._pipeline_bill_reader is None or _pl._pipeline_coin_classifier is None:
        try:
            ensure_pipeline_models(allow_refresh_from_defaults=True)
        except HTTPException:
            _pl.inference_errors += 1
            raise HTTPException(
                status_code=503,
                detail="Pipeline models are not loaded. Call /api/pipeline/auto_select or /api/pipeline/refresh first.",
            )

    requested_top_k = 1
    if top_k_targets is not None and str(top_k_targets).strip() != "":
        try:
            requested_top_k = int(str(top_k_targets).strip())
        except Exception:
            requested_top_k = 1
    requested_top_k = max(1, min(requested_top_k, 5))

    t0 = time.time()
    try:
        result = run_full_process(image, top_k_targets=requested_top_k)
    except HTTPException:
        _pl.inference_errors += 1
        raise
    except Exception as exc:
        _pl.inference_errors += 1
        raise HTTPException(status_code=500, detail=f"Pipeline processing error: {exc}")
    elapsed_ms = (time.time() - t0) * 1000
    _pl.inference_count += 1
    _pl.inference_total_ms += elapsed_ms
    _pl.last_inference_ms = elapsed_ms

    return {
        "kind": "pipeline",
        "result": result,
        "server_timing_ms": round(elapsed_ms, 1),
    }
