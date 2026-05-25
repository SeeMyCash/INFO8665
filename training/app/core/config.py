"""
Centralised application configuration.

Uses Pydantic BaseSettings so every value can be overridden via environment
variables or a repo-root `.env` file.
"""

from __future__ import annotations

from pathlib import Path
from typing import Optional
from urllib.parse import quote_plus

from dotenv import load_dotenv
from pydantic import AliasChoices, Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.core.secrets import resolve_secret


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _training_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _repo_env_file() -> Path:
    return _repo_root() / ".env"


def _default_models_dir() -> Path:
    return (_training_root() / "models").resolve()


def _default_storage_path() -> Path:
    return (_training_root() / "outputs" / "app-data" / "inference-history.jsonl").resolve()


def _default_rn_dir() -> Path:
    app_dir = Path(__file__).resolve().parent.parent
    static_rn = app_dir / "static" / "rn"
    if static_rn.is_dir():
        return static_rn
    return app_dir / "rn_app" / "dist"


load_dotenv(_repo_env_file(), override=False)


class Settings(BaseSettings):
    """Application-wide settings."""

    model_config = SettingsConfigDict(
        env_file=str(_repo_env_file()),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_title: str = "See My Cash - Inference API"
    app_version: str = "0.3.1"

    app_dir: Path = Path(__file__).resolve().parent.parent
    static_dir: Path = Path(__file__).resolve().parent.parent / "static"
    rn_dir: Path = _default_rn_dir()
    deploy_root: Path = _training_root()
    models_dir: Path = _default_models_dir()
    app_storage_backend: str = Field(
        default="local",
        validation_alias=AliasChoices("APP_STORAGE_BACKEND", "STORAGE_BACKEND"),
    )
    app_local_storage_path: Path = Field(
        default=_default_storage_path(),
        validation_alias=AliasChoices("APP_LOCAL_STORAGE_PATH"),
    )
    app_storage_max_history: int = Field(
        default=250,
        validation_alias=AliasChoices("APP_STORAGE_MAX_HISTORY"),
    )
    app_secrets_dir: Optional[Path] = Field(
        default=Path("/run/secrets"),
        validation_alias=AliasChoices("APP_SECRETS_DIR"),
    )
    database_url: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("DATABASE_URL", "APP_DATABASE_URL"),
    )
    db_driver: str = Field(
        default="postgresql+psycopg",
        validation_alias=AliasChoices("DB_DRIVER"),
    )
    db_hostname: str = Field(
        default="db",
        validation_alias=AliasChoices("DB_HOSTNAME", "DB_HOST"),
    )
    db_port: int = Field(
        default=5432,
        validation_alias=AliasChoices("DB_PORT"),
    )
    db_name: str = Field(
        default="smc_app",
        validation_alias=AliasChoices("DB_NAME", "POSTGRES_DB"),
    )
    db_username: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("DB_USERNAME", "POSTGRES_USER"),
    )
    db_password: Optional[SecretStr] = Field(
        default=None,
        validation_alias=AliasChoices("DB_PASSWORD", "POSTGRES_PASSWORD"),
    )
    db_sslmode: str = Field(
        default="disable",
        validation_alias=AliasChoices("DB_SSLMODE"),
    )
    db_username_source: str = "unset"
    db_password_source: str = "unset"
    database_url_source: str = "unset"

    s3_region: str = Field(
        default="us-east-1",
        validation_alias=AliasChoices("S3_REGION", "AWS_REGION", "AWS_DEFAULT_REGION"),
    )
    artifacts_bucket: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("ARTIFACTS_BUCKET", "MODELS_BUCKET"),
    )
    artifacts_prefix: str = Field(
        default="output",
        validation_alias=AliasChoices("ARTIFACTS_PREFIX", "MODELS_PREFIX"),
    )
    enable_aws_model_sync: bool = Field(
        default=True,
        validation_alias=AliasChoices("ENABLE_AWS_MODEL_SYNC"),
    )

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

    pipeline_coin_route_min_conf: float = 0.35
    pipeline_giant_coin_area_ratio: float = 0.65
    pipeline_max_topk_targets: int = 5

    spoof_guard_enabled: bool = False
    spoof_guard_block_on_detect: bool = True
    spoof_guard_threshold: float = 0.80
    spoof_guard_heuristic_only_threshold: float = 0.92
    spoof_guard_model_weight: float = 0.85
    spoof_guard_heuristic_weight: float = 0.15
    spoof_guard_border_ratio: float = 0.08

    @property
    def db_password_value(self) -> Optional[str]:
        if self.db_password is None:
            return None
        return self.db_password.get_secret_value()

    @property
    def resolved_database_url(self) -> Optional[str]:
        if self.database_url:
            return self.database_url
        password = self.db_password_value
        if not self.db_hostname or not self.db_name or not self.db_username or not password:
            return None
        driver = (self.db_driver or "postgresql+psycopg").strip() or "postgresql+psycopg"
        username = quote_plus(self.db_username)
        password_q = quote_plus(password)
        url = f"{driver}://{username}:{password_q}@{self.db_hostname}:{self.db_port}/{self.db_name}"
        sslmode = (self.db_sslmode or "").strip()
        if sslmode:
            joiner = "&" if "?" in url else "?"
            url = f"{url}{joiner}sslmode={quote_plus(sslmode)}"
        return url


settings = Settings()

settings.app_storage_backend = (settings.app_storage_backend or "local").strip().lower() or "local"
if settings.app_storage_backend not in {"local", "database"}:
    settings.app_storage_backend = "local"
settings.app_storage_max_history = max(1, int(settings.app_storage_max_history))

if settings.app_secrets_dir is not None and not str(settings.app_secrets_dir).strip():
    settings.app_secrets_dir = None
secrets_dir = str(settings.app_secrets_dir) if settings.app_secrets_dir is not None else None

db_username_secret = resolve_secret("DB_USERNAME", default=settings.db_username, secrets_dir=secrets_dir)
settings.db_username = db_username_secret.value
settings.db_username_source = db_username_secret.source

db_password_default = settings.db_password_value
db_password_secret = resolve_secret("DB_PASSWORD", default=db_password_default, secrets_dir=secrets_dir)
settings.db_password = SecretStr(db_password_secret.value) if db_password_secret.value else None
settings.db_password_source = db_password_secret.source

database_url_secret = resolve_secret("DATABASE_URL", default=settings.database_url, secrets_dir=secrets_dir)
settings.database_url = database_url_secret.value
settings.database_url_source = database_url_secret.source

if settings.artifacts_bucket is not None and not str(settings.artifacts_bucket).strip():
    settings.artifacts_bucket = None
settings.artifacts_prefix = (settings.artifacts_prefix or "output").strip() or "output"

if settings.detector_bill_min_conf < settings.detector_conf_threshold:
    settings.detector_bill_min_conf = settings.detector_conf_threshold
if settings.detector_coin_min_conf < settings.detector_conf_threshold:
    settings.detector_coin_min_conf = settings.detector_conf_threshold
if settings.pipeline_coin_route_min_conf < settings.detector_coin_min_conf:
    settings.pipeline_coin_route_min_conf = settings.detector_coin_min_conf

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

settings.models_dir.mkdir(parents=True, exist_ok=True)
settings.app_local_storage_path.parent.mkdir(parents=True, exist_ok=True)
