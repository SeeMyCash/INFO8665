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
    app_version: str = "0.3.0"

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

    # ── Detector hyper-params ────────────────────────────────
    detector_conf_threshold: float = 0.02
    detector_iou_threshold: float = 0.45
    detector_max_det: int = 20

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()

# Ensure models directory exists at import time
settings.models_dir.mkdir(parents=True, exist_ok=True)
