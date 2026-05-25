"""
Optional persistence for inference history.

Supports:
- ``local``: JSONL history file on disk
- ``database``: SQLAlchemy-backed relational store
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime, timezone
import json
import logging
from pathlib import Path
import threading
from typing import Any, Dict, List, Optional
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, Float, Integer, JSON, String, Text, create_engine, desc, select
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

from app.core.config import settings

logger = logging.getLogger("smc.storage")


class Base(DeclarativeBase):
    """Base SQLAlchemy model class."""


class InferenceHistoryRow(Base):
    __tablename__ = "inference_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    request_id: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    inference_kind: Mapped[str] = mapped_column(String(32))
    source_filename: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    content_type: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    payload_size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    server_timing_ms: Mapped[float] = mapped_column(Float)
    requested_top_k_targets: Mapped[int] = mapped_column(Integer, default=1)
    spoof_guard_enabled: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    blocked: Mapped[bool] = mapped_column(Boolean, default=False)
    warning: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    detections_count: Mapped[int] = mapped_column(Integer, default=0)
    top_prediction_label: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    top_prediction_confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    pipeline_models: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    result_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)

    def to_payload(self) -> Dict[str, Any]:
        return {
            "request_id": self.request_id,
            "created_at": self.created_at.astimezone(timezone.utc).isoformat(),
            "inference_kind": self.inference_kind,
            "source_filename": self.source_filename,
            "content_type": self.content_type,
            "payload_size_bytes": self.payload_size_bytes,
            "server_timing_ms": self.server_timing_ms,
            "requested_top_k_targets": self.requested_top_k_targets,
            "spoof_guard_enabled": self.spoof_guard_enabled,
            "summary": {
                "blocked": self.blocked,
                "warning": self.warning,
                "detections_count": self.detections_count,
                "top_prediction_label": self.top_prediction_label,
                "top_prediction_confidence": self.top_prediction_confidence,
            },
            "pipeline_models": self.pipeline_models or {},
            "result": self.result_json or {},
        }


def _coerce_bool(value: Any) -> Optional[bool]:
    if isinstance(value, bool):
        return value
    if value is None:
        return None
    text = str(value).strip().lower()
    if text in {"1", "true", "t", "yes", "y", "on"}:
        return True
    if text in {"0", "false", "f", "no", "n", "off"}:
        return False
    return None


def _first_prediction(result: Dict[str, Any]) -> tuple[Optional[str], Optional[float]]:
    classification = result.get("classification")
    if not isinstance(classification, dict):
        return None, None
    cls_result = classification.get("result")
    if not isinstance(cls_result, dict):
        return None, None
    predictions = cls_result.get("top_predictions")
    if not isinstance(predictions, list) or not predictions:
        return None, None
    top = predictions[0] if isinstance(predictions[0], dict) else {}
    label = str(top.get("class", "")).strip() or None
    try:
        confidence = float(top.get("confidence"))
    except Exception:
        confidence = None
    return label, confidence


def _build_history_entry(
    *,
    source_filename: Optional[str],
    content_type: Optional[str],
    payload_size_bytes: int,
    server_timing_ms: float,
    requested_top_k_targets: int,
    spoof_guard_enabled: Optional[bool],
    result: Dict[str, Any],
) -> Dict[str, Any]:
    detector = result.get("detector")
    detections = detector.get("detections", []) if isinstance(detector, dict) else []
    spoof = result.get("spoof_check")
    spoof_details = spoof if isinstance(spoof, dict) else {}
    actual_spoof_enabled = spoof_guard_enabled
    if spoof_details:
        actual_spoof_enabled = _coerce_bool(spoof_details.get("enabled", spoof_guard_enabled))

    top_prediction_label, top_prediction_confidence = _first_prediction(result)

    return {
        "request_id": str(uuid4()),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "inference_kind": "pipeline",
        "source_filename": source_filename,
        "content_type": content_type,
        "payload_size_bytes": max(0, int(payload_size_bytes)),
        "server_timing_ms": float(server_timing_ms),
        "requested_top_k_targets": max(1, int(requested_top_k_targets or 1)),
        "spoof_guard_enabled": actual_spoof_enabled,
        "summary": {
            "blocked": bool(spoof_details.get("blocked", False)),
            "warning": result.get("warning"),
            "detections_count": len(detections) if isinstance(detections, list) else 0,
            "top_prediction_label": top_prediction_label,
            "top_prediction_confidence": top_prediction_confidence,
        },
        "pipeline_models": result.get("pipeline_models", {}) if isinstance(result.get("pipeline_models"), dict) else {},
        "result": result,
    }


class HistoryBackend(ABC):
    @abstractmethod
    def initialize(self) -> None:
        raise NotImplementedError

    @abstractmethod
    def record(self, entry: Dict[str, Any]) -> None:
        raise NotImplementedError

    @abstractmethod
    def list_recent(self, limit: int) -> List[Dict[str, Any]]:
        raise NotImplementedError


class LocalHistoryBackend(HistoryBackend):
    def __init__(self, path: Path, max_entries: int) -> None:
        self.path = path
        self.max_entries = max(1, int(max_entries))
        self._lock = threading.Lock()

    def initialize(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        if not self.path.exists():
            self.path.write_text("", encoding="utf-8")

    def record(self, entry: Dict[str, Any]) -> None:
        serialized = json.dumps(entry, ensure_ascii=True, default=str)
        with self._lock:
            with self.path.open("a", encoding="utf-8") as handle:
                handle.write(serialized + "\n")
            self._trim_locked()

    def list_recent(self, limit: int) -> List[Dict[str, Any]]:
        with self._lock:
            if not self.path.exists():
                return []
            lines = [
                line.strip()
                for line in self.path.read_text(encoding="utf-8").splitlines()
                if line.strip()
            ]
        recent = lines[-max(1, int(limit)):]
        return [json.loads(line) for line in reversed(recent)]

    def _trim_locked(self) -> None:
        lines = [
            line.strip()
            for line in self.path.read_text(encoding="utf-8").splitlines()
            if line.strip()
        ]
        if len(lines) <= self.max_entries:
            return
        kept = lines[-self.max_entries :]
        self.path.write_text("\n".join(kept) + "\n", encoding="utf-8")


class DatabaseHistoryBackend(HistoryBackend):
    def __init__(self, database_url: Optional[str]) -> None:
        self.database_url = database_url
        self._engine = None
        self._session_factory = None

    def initialize(self) -> None:
        if not self.database_url:
            raise RuntimeError(
                "Database storage selected but DATABASE_URL or DB_* settings are incomplete."
            )
        if self._engine is None:
            connect_args: Dict[str, Any] = {}
            if self.database_url.startswith("sqlite"):
                connect_args["check_same_thread"] = False
            self._engine = create_engine(
                self.database_url,
                future=True,
                pool_pre_ping=True,
                connect_args=connect_args,
            )
            self._session_factory = sessionmaker(self._engine, expire_on_commit=False)
        Base.metadata.create_all(self._engine)

    def record(self, entry: Dict[str, Any]) -> None:
        if self._session_factory is None:
            self.initialize()
        assert self._session_factory is not None
        created_at = datetime.fromisoformat(entry["created_at"])
        summary = entry.get("summary", {}) if isinstance(entry.get("summary"), dict) else {}
        row = InferenceHistoryRow(
            request_id=entry["request_id"],
            created_at=created_at,
            inference_kind=entry.get("inference_kind", "pipeline"),
            source_filename=entry.get("source_filename"),
            content_type=entry.get("content_type"),
            payload_size_bytes=int(entry.get("payload_size_bytes", 0)),
            server_timing_ms=float(entry.get("server_timing_ms", 0.0)),
            requested_top_k_targets=int(entry.get("requested_top_k_targets", 1)),
            spoof_guard_enabled=_coerce_bool(entry.get("spoof_guard_enabled")),
            blocked=bool(summary.get("blocked", False)),
            warning=summary.get("warning"),
            detections_count=int(summary.get("detections_count", 0)),
            top_prediction_label=summary.get("top_prediction_label"),
            top_prediction_confidence=summary.get("top_prediction_confidence"),
            pipeline_models=entry.get("pipeline_models", {}),
            result_json=entry.get("result", {}),
        )
        with self._session_factory() as session:
            session.add(row)
            session.commit()

    def list_recent(self, limit: int) -> List[Dict[str, Any]]:
        if self._session_factory is None:
            self.initialize()
        assert self._session_factory is not None
        stmt = (
            select(InferenceHistoryRow)
            .order_by(desc(InferenceHistoryRow.created_at), desc(InferenceHistoryRow.id))
            .limit(max(1, int(limit)))
        )
        with self._session_factory() as session:
            rows = session.execute(stmt).scalars().all()
        return [row.to_payload() for row in rows]


class InferenceHistoryService:
    def __init__(self) -> None:
        self.backend_name = settings.app_storage_backend
        self.local_path = settings.app_local_storage_path
        self.max_entries = settings.app_storage_max_history
        self._backend: HistoryBackend
        if self.backend_name == "database":
            self._backend = DatabaseHistoryBackend(settings.resolved_database_url)
        else:
            self._backend = LocalHistoryBackend(settings.app_local_storage_path, settings.app_storage_max_history)
        self.ready = False
        self.last_error: Optional[str] = None

    def initialize(self) -> Dict[str, Any]:
        try:
            self._backend.initialize()
            self.ready = True
            self.last_error = None
        except Exception as exc:
            self.ready = False
            self.last_error = str(exc)
            logger.warning("Storage backend '%s' could not be initialized: %s", self.backend_name, exc)
        return self.status()

    def status(self) -> Dict[str, Any]:
        database_status: Optional[Dict[str, Any]] = None
        if self.backend_name == "database":
            database_status = {
                "driver": settings.db_driver,
                "hostname": settings.db_hostname,
                "port": settings.db_port,
                "name": settings.db_name,
                "sslmode": settings.db_sslmode,
                "url_configured": bool(settings.resolved_database_url),
                "url_source": settings.database_url_source,
                "username_configured": bool(settings.db_username),
                "username_source": settings.db_username_source,
                "password_configured": bool(settings.db_password_value),
                "password_source": settings.db_password_source,
            }
        return {
            "backend": self.backend_name,
            "ready": self.ready,
            "local_path": str(self.local_path),
            "max_entries": self.max_entries,
            "last_error": self.last_error,
            "database": database_status,
        }

    def record_pipeline_inference(
        self,
        *,
        source_filename: Optional[str],
        content_type: Optional[str],
        payload_size_bytes: int,
        server_timing_ms: float,
        requested_top_k_targets: int,
        spoof_guard_enabled: Optional[bool],
        result: Dict[str, Any],
    ) -> bool:
        if not self.ready:
            self.initialize()
        if not self.ready:
            return False
        entry = _build_history_entry(
            source_filename=source_filename,
            content_type=content_type,
            payload_size_bytes=payload_size_bytes,
            server_timing_ms=server_timing_ms,
            requested_top_k_targets=requested_top_k_targets,
            spoof_guard_enabled=spoof_guard_enabled,
            result=result,
        )
        try:
            self._backend.record(entry)
            return True
        except Exception as exc:
            self.ready = False
            self.last_error = str(exc)
            logger.warning("Could not persist inference history entry: %s", exc)
            return False

    def list_recent(self, limit: int = 20) -> List[Dict[str, Any]]:
        if not self.ready:
            self.initialize()
        if not self.ready:
            return []
        try:
            return self._backend.list_recent(limit)
        except Exception as exc:
            self.ready = False
            self.last_error = str(exc)
            logger.warning("Could not read inference history entries: %s", exc)
            return []


_history_service: Optional[InferenceHistoryService] = None
_history_lock = threading.Lock()


def get_inference_history_service() -> InferenceHistoryService:
    global _history_service
    with _history_lock:
        if _history_service is None:
            _history_service = InferenceHistoryService()
        return _history_service


def initialize_inference_history_service() -> Dict[str, Any]:
    return get_inference_history_service().initialize()


def reset_inference_history_service() -> None:
    global _history_service
    with _history_lock:
        _history_service = None
