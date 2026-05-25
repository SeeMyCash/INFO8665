"""
API endpoints exposing ML lifecycle service contracts per project use case.
"""

from fastapi import APIRouter, HTTPException

from app.schemas.responses import (
    ErrorResponse,
    MlLifecycleContractResponse,
    MlUseCaseDetailResponse,
    MlUseCaseListResponse,
)
from app.services.mlops_catalog import get_contract, get_use_case, list_use_cases

router = APIRouter()


@router.get(
    "/use-cases",
    response_model=MlUseCaseListResponse,
    responses={
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    tags=["ML Service Contracts"],
    summary="List ML use cases",
    description=(
        "Returns the modeled ML use cases in this project and confirms whether each one covers "
        "the minimum lifecycle stages required for submission."
    ),
)
def use_cases():
    return {"use_cases": list_use_cases()}


@router.get(
    "/use-cases/{use_case_id}",
    response_model=MlUseCaseDetailResponse,
    responses={
        404: {"model": ErrorResponse, "description": "Unknown ML use case"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    tags=["ML Service Contracts"],
    summary="Get one ML use case contract",
    description="Returns the full lifecycle contract catalog for a specific ML use case.",
)
def use_case_detail(use_case_id: str):
    try:
        return get_use_case(use_case_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"Unknown ML use case: {use_case_id}") from exc


@router.get(
    "/use-cases/{use_case_id}/contracts/{stage}",
    response_model=MlLifecycleContractResponse,
    responses={
        404: {"model": ErrorResponse, "description": "Unknown ML use case or lifecycle stage"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    tags=["ML Service Contracts"],
    summary="Get one lifecycle contract",
    description="Returns the concrete service contract for one stage of one ML use case.",
)
def contract_detail(use_case_id: str, stage: str):
    try:
        return get_contract(use_case_id, stage)
    except KeyError as exc:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown ML lifecycle contract: {use_case_id}/{stage}",
        ) from exc
