"""
Pydantic response schemas – used for serialising & documenting API responses.
"""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ── Shared error model ───────────────────────────────────────

class ErrorResponse(BaseModel):
    """Standard error envelope returned for all non-2xx responses."""
    detail: str = Field(..., description="Human-readable error message.")


# ── Health & Info ────────────────────────────────────────────

class HealthResponse(BaseModel):
    ok: bool
    active_model: Optional[str] = None
    active_kind: Optional[str] = None
    available_models: List[str]
    pipeline: Dict[str, Optional[str]]
    pipeline_error: Optional[str] = None


class VersionResponse(BaseModel):
    version: str
    uptime_seconds: float
    torch_available: bool
    cuda_available: bool
    device: str
    models_dir: str
    models_count: int


class ConfigDefaults(BaseModel):
    artifacts_bucket: Optional[str] = None
    artifacts_prefix: Optional[str] = None


class ConfigResponse(BaseModel):
    defaults: ConfigDefaults


# ── Pipeline ─────────────────────────────────────────────────

class PipelineStatusResponse(BaseModel):
    pipeline: Dict[str, Optional[str]]
    pipeline_error: Optional[str] = None


class PipelineStatsResponse(BaseModel):
    inference_count: int
    inference_errors: int
    avg_latency_ms: Optional[float] = None
    last_latency_ms: Optional[float] = None
    uptime_seconds: float


class PipelineAutoSelectResponse(BaseModel):
    pipeline: Dict[str, Optional[str]]


class PipelineRefreshResponse(BaseModel):
    refreshed: bool
    available_models: List[str]
    pipeline: Dict[str, Optional[str]]


class PipelineInferResponse(BaseModel):
    kind: str
    result: Dict[str, Any]
    server_timing_ms: float


# ── Model management ─────────────────────────────────────────

class ModelsListResponse(BaseModel):
    active_model: Optional[str] = None
    active_kind: Optional[str] = None
    models: List[str]


class ModelSelectResponse(BaseModel):
    selected: Optional[str] = None
    kind: Optional[str] = None


class ModelsRefreshResponse(BaseModel):
    downloaded: List[str]
    available: List[str]


# ── Legacy inference ─────────────────────────────────────────

class LegacyInferResponse(BaseModel):
    model: Optional[str] = None
    kind: Optional[str] = None
    result: Dict[str, Any]
