"""
Pydantic response schemas used for API serialization and OpenAPI docs.
"""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class ErrorResponse(BaseModel):
    """Standard error envelope returned for all non-2xx responses."""

    detail: str = Field(..., description="Human-readable error message.")


class DatabaseStatusResponse(BaseModel):
    driver: Optional[str] = None
    hostname: Optional[str] = None
    port: Optional[int] = None
    name: Optional[str] = None
    sslmode: Optional[str] = None
    url_configured: bool = False
    url_source: Optional[str] = None
    username_configured: bool = False
    username_source: Optional[str] = None
    password_configured: bool = False
    password_source: Optional[str] = None


class StorageStatusResponse(BaseModel):
    backend: str
    ready: bool
    local_path: str
    max_entries: int
    last_error: Optional[str] = None
    database: Optional[DatabaseStatusResponse] = None


class HealthResponse(BaseModel):
    ok: bool
    active_model: Optional[str] = None
    active_kind: Optional[str] = None
    available_models: List[str]
    pipeline: Dict[str, Optional[str]]
    pipeline_error: Optional[str] = None
    storage: StorageStatusResponse


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


class AwsModelSync(BaseModel):
    enabled: bool = True
    reason: Optional[str] = None


class ConfigResponse(BaseModel):
    defaults: ConfigDefaults
    aws_model_sync: Optional[AwsModelSync] = None
    storage: StorageStatusResponse


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
    reason: Optional[str] = None
    available_models: List[str]
    pipeline: Dict[str, Optional[str]]


class PipelineInferResponse(BaseModel):
    kind: str
    result: Dict[str, Any]
    server_timing_ms: float


class HistorySummaryResponse(BaseModel):
    blocked: bool = False
    warning: Optional[str] = None
    detections_count: int = 0
    top_prediction_label: Optional[str] = None
    top_prediction_confidence: Optional[float] = None


class StorageHistoryEntryResponse(BaseModel):
    request_id: str
    created_at: str
    inference_kind: str
    source_filename: Optional[str] = None
    content_type: Optional[str] = None
    payload_size_bytes: int
    server_timing_ms: float
    requested_top_k_targets: int = 1
    spoof_guard_enabled: Optional[bool] = None
    summary: HistorySummaryResponse
    pipeline_models: Dict[str, Optional[str]] = Field(default_factory=dict)
    result: Dict[str, Any] = Field(default_factory=dict)


class StorageHistoryResponse(BaseModel):
    backend: str
    count: int
    entries: List[StorageHistoryEntryResponse]


class MlLifecycleContractResponse(BaseModel):
    contract_id: str
    service_name: str
    lifecycle_stage: str
    summary: str
    api_contract_path: str
    implementation_type: str
    implementation_refs: List[str]
    inputs: List[str]
    outputs: List[str]


class MlUseCaseSummaryResponse(BaseModel):
    use_case: str
    display_name: str
    problem_type: str
    description: str
    stage_count: int
    required_stages: List[str]
    required_stages_present: List[str]
    minimum_contract_requirement_met: bool


class MlUseCaseDetailResponse(MlUseCaseSummaryResponse):
    contracts: List[MlLifecycleContractResponse]


class MlUseCaseListResponse(BaseModel):
    use_cases: List[MlUseCaseSummaryResponse]


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


class LegacyInferResponse(BaseModel):
    model: Optional[str] = None
    kind: Optional[str] = None
    result: Dict[str, Any]
