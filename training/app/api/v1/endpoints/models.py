"""
Model management endpoints – list, select, refresh from S3.
"""

import logging

from fastapi import APIRouter, HTTPException

from app.schemas.requests import RefreshRequest, SelectModelRequest
from app.schemas.responses import (
    ErrorResponse,
    ModelSelectResponse,
    ModelsListResponse,
    ModelsRefreshResponse,
)
from app.services.model_manager import list_local_models, load_active_model, model_state
from app.services.s3_sync import aws_model_sync_reason, sync_models_from_s3

logger = logging.getLogger("smc.models")

router = APIRouter()


@router.get(
    "/",
    response_model=ModelsListResponse,
    responses={
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    tags=["Model Management"],
    summary="List available models",
    description="Returns all locally available model files and which model is currently active.",
)
def list_models():
    return {
        "active_model": model_state.loaded_model_name,
        "active_kind": model_state.loaded_model_kind,
        "models": list_local_models(),
    }


@router.post(
    "/select",
    response_model=ModelSelectResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Unsupported model format or runtime unavailable"},
        404: {"model": ErrorResponse, "description": "Requested model file does not exist locally"},
        422: {"model": ErrorResponse, "description": "Validation error (e.g. missing model_name)"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    tags=["Model Management"],
    summary="Select active model",
    description="Load a specific model by name for use with the legacy single-model `/api/infer` endpoint.",
)
def select_model(req: SelectModelRequest):
    load_active_model(req.model_name)
    return {
        "selected": model_state.loaded_model_name,
        "kind": model_state.loaded_model_kind,
    }


@router.post(
    "/refresh",
    response_model=ModelsRefreshResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid S3 bucket or prefix parameters"},
        422: {"model": ErrorResponse, "description": "Validation error (missing required fields)"},
        502: {"model": ErrorResponse, "description": "S3 download or network error"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    tags=["Model Management"],
    summary="Sync models from S3",
    description="Download model tarballs from the specified S3 bucket/prefix and extract them locally.",
)
def refresh_models(req: RefreshRequest):
    reason = aws_model_sync_reason()
    if reason is not None:
        raise HTTPException(status_code=400, detail=reason)
    if not req.artifacts_bucket or not req.artifacts_bucket.strip():
        raise HTTPException(status_code=400, detail="artifacts_bucket must not be empty")
    try:
        return sync_models_from_s3(
            bucket=req.artifacts_bucket,
            prefix=req.artifacts_prefix,
            max_models=req.max_models,
            region=req.region,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("S3 model refresh failed")
        raise HTTPException(
            status_code=502,
            detail=f"Failed to sync models from S3: {exc}",
        ) from exc
