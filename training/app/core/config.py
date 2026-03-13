"""
Centralised application configuration.

Uses Pydantic BaseSettings so every value can be overridden via environment
variables or a `.env` file placed next to the project root.
"""

from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings


def _default_models_dir() -> Path:
    return Path(Path.cwd() / "models").resolve()


class Settings(BaseSettings):
    """Application-wide settings."""

    # ── General ──────────────────────────────────────────────
    app_title: str = "See My Cash – Inference API"
    app_version: str = "0.3.1"

    # ── Paths ────────────────────────────────────────────────
    app_dir: Path = Path(__file__).resolve().parent.parent
    static_dir: Path = Path(__file__).resolve().parent.parent / "static"
    rn_dir: Path = Path(__file__).resolve().parent.parent / "static" / "rn"
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

# Ensure models directory exists at import time
settings.models_dir.mkdir(parents=True, exist_ok=True)
