"""
v1 API router — aggregates all endpoint routers under /api.
"""

from fastapi import APIRouter

from app.api.v1.endpoints import health, inference, models, pipeline

router = APIRouter()

router.include_router(health.router, prefix="", tags=["Health & Info"])
router.include_router(pipeline.router, prefix="/pipeline", tags=["Pipeline"])
router.include_router(models.router, prefix="/models", tags=["Model Management"])
router.include_router(inference.router, prefix="/infer", tags=["Legacy Inference"])
