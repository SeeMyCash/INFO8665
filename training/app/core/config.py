"""
Centralised application configuration.

Uses Pydantic BaseSettings so every value can be overridden via environment
variables or a `.env` file placed next to the project root.
"""

from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings


def _default_models_dir() -> Path:
    # Prefer the canonical training/models directory regardless of launcher CWD.
    app_dir = Path(__file__).resolve().parent.parent  # .../training/app
    return (app_dir.parent / "models").resolve()


def _default_rn_dir() -> Path:
    app_dir = Path(__file__).resolve().parent.parent
    static_rn = app_dir / "static" / "rn"
    if static_rn.is_dir():
        return static_rn
    return app_dir / "rn_app" / "dist"


class Settings(BaseSettings):
    """Application-wide settings."""

    # ── General ──────────────────────────────────────────────
    app_title: str = "See My Cash – Inference API"
    app_version: str = "0.3.1"

    # ── Paths ────────────────────────────────────────────────
    app_dir: Path = Path(__file__).resolve().parent.parent
    static_dir: Path = Path(__file__).resolve().parent.parent / "static"
    rn_dir: Path = _default_rn_dir()
    deploy_root: Path = Path.cwd().parent
    models_dir: Path = _default_models_dir()

    # ── S3 defaults ──────────────────────────────────────────
    s3_region: str = "us-east-1"
    artifacts_bucket: Optional[str] = None
    artifacts_prefix: str = "output"
    enable_aws_model_sync: bool = True

    # ── Detector hyper-params ────────────────────────────────
    detector_conf_threshold: float = 0.20
    detector_iou_threshold: float = 0.45
    detector_max_det: int = 20
    detector_bill_min_conf: float = 0.20
    detector_coin_min_conf: float = 0.35
    detector_min_box_side_px: float = 6.0
    detector_min_box_area_ratio: float = 0.0015
    detector_max_box_area_ratio: float = 0.92
    detector_coin_min_aspect: float = 0.35
    detector_coin_max_aspect: float = 2.85
    detector_duplicate_iou: float = 0.88
    detector_duplicate_cross_class_iou: float = 0.96

    # ── Pipeline routing ─────────────────────────────────────
    pipeline_coin_route_min_conf: float = 0.35
    pipeline_giant_coin_area_ratio: float = 0.65
    pipeline_max_topk_targets: int = 5

    # -- Spoof guard (pre-detector safety check) --
    spoof_guard_enabled: bool = False
    spoof_guard_block_on_detect: bool = True
    spoof_guard_threshold: float = 0.80
    spoof_guard_heuristic_only_threshold: float = 0.92
    spoof_guard_model_weight: float = 0.85
    spoof_guard_heuristic_weight: float = 0.15
    spoof_guard_border_ratio: float = 0.08

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()

# Ensure bill/coin min conf are at least the global conf threshold
if settings.detector_bill_min_conf < settings.detector_conf_threshold:
    settings.detector_bill_min_conf = settings.detector_conf_threshold
if settings.detector_coin_min_conf < settings.detector_conf_threshold:
    settings.detector_coin_min_conf = settings.detector_conf_threshold
if settings.pipeline_coin_route_min_conf < settings.detector_coin_min_conf:
    settings.pipeline_coin_route_min_conf = settings.detector_coin_min_conf

# Clamp spoof-guard weights and thresholds to sane ranges.
settings.spoof_guard_threshold = max(0.0, min(1.0, settings.spoof_guard_threshold))
settings.spoof_guard_heuristic_only_threshold = max(
    settings.spoof_guard_threshold,
    min(1.0, settings.spoof_guard_heuristic_only_threshold),
)
settings.spoof_guard_model_weight = max(0.0, settings.spoof_guard_model_weight)
settings.spoof_guard_heuristic_weight = max(0.0, settings.spoof_guard_heuristic_weight)
if (settings.spoof_guard_model_weight + settings.spoof_guard_heuristic_weight) <= 0:
    settings.spoof_guard_model_weight = 0.85
    settings.spoof_guard_heuristic_weight = 0.15
settings.spoof_guard_border_ratio = max(0.02, min(0.2, settings.spoof_guard_border_ratio))

# Ensure models directory exists at import time
settings.models_dir.mkdir(parents=True, exist_ok=True)
