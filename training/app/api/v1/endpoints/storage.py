"""
Storage and server-side inference history endpoints.
"""

from typing import Optional

from fastapi import APIRouter, Query

from app.schemas.responses import ErrorResponse, StorageHistoryResponse, StorageStatusResponse
from app.services.storage import get_inference_history_service

router = APIRouter()


@router.get(
    "/status",
    response_model=StorageStatusResponse,
    responses={
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    tags=["Storage & Secrets"],
    summary="Storage backend status",
    description="Shows whether inference history is using local file storage or a database, without exposing secret values.",
)
def storage_status():
    service = get_inference_history_service()
    if not service.ready:
        service.initialize()
    return service.status()


@router.get(
    "/history",
    response_model=StorageHistoryResponse,
    responses={
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    tags=["Storage & Secrets"],
    summary="Recent inference history",
    description="Returns recent server-side pipeline inference records from the configured storage backend.",
)
def storage_history(
    limit: Optional[int] = Query(default=20, ge=1, le=100, description="Maximum number of history entries to return."),
):
    service = get_inference_history_service()
    entries = service.list_recent(limit=limit or 20)
    return {
        "backend": service.backend_name,
        "count": len(entries),
        "entries": entries,
    }
