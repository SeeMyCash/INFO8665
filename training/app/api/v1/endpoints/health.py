"""
Health, version, and configuration endpoints.
"""

import logging
import torch
from fastapi import APIRouter

from app.core.config import settings
from app.schemas.responses import (
    ConfigResponse,
    ErrorResponse,
    HealthResponse,
    VersionResponse,
)
from app.services.model_manager import list_local_models, model_state
from app.services.pipeline import ensure_pipeline_models, pipeline_status, server_start_time
from app.services.s3_sync import aws_model_sync_reason, resolve_artifact_defaults
from app.services.storage import get_inference_history_service

import time

router = APIRouter()
logger = logging.getLogger("smc.health")


@router.get(
    "/health",
    response_model=HealthResponse,
    responses={
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    tags=["Health & Info"],
    summary="Health check",
    description="Returns server health, currently loaded model, available models, and pipeline status.",
)
def health():
    logger.info("Health endpoint invoked.")
    pipeline_error = None
    try:
        pipeline = ensure_pipeline_models(allow_refresh_from_defaults=True)
    except Exception as exc:
        pipeline = pipeline_status()
        pipeline_error = str(getattr(exc, "detail", exc))
    storage = get_inference_history_service()
    if not storage.ready:
        storage.initialize()

    return {
        "ok": True,
        "active_model": model_state.loaded_model_name,
        "active_kind": model_state.loaded_model_kind,
        "available_models": list_local_models(),
        "pipeline": pipeline,
        "pipeline_error": pipeline_error,
        "storage": storage.status(),
    }


@router.get(
    "/version",
    response_model=VersionResponse,
    responses={
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    tags=["Health & Info"],
    summary="Server version & runtime info",
    description="Returns app version, uptime, PyTorch/CUDA availability, and local model count.",
)
def get_version():
    """Server version, uptime, device info, and model count."""
    uptime_s = time.time() - server_start_time
    cuda = torch.cuda.is_available() if torch else False
    return {
        "version": settings.app_version,
        "uptime_seconds": round(uptime_s, 1),
        "torch_available": True,
        "cuda_available": cuda,
        "device": str(torch.device("cuda" if cuda else "cpu")),
        "models_dir": str(settings.models_dir),
        "models_count": len(list_local_models()),
    }


@router.get(
    "/config",
    response_model=ConfigResponse,
    responses={
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    tags=["Health & Info"],
    summary="Deployment configuration",
    description="Returns default S3 bucket/prefix read from deploy text files.",
)
def get_config():
    reason = aws_model_sync_reason()
    defaults = resolve_artifact_defaults()
    storage = get_inference_history_service()
    if not storage.ready:
        storage.initialize()
    return {
        "defaults": defaults,
        "aws_model_sync": {
            "enabled": reason is None,
            "reason": reason,
        },
        "storage": storage.status(),
    }
