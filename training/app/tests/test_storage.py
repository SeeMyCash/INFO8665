import io
from types import SimpleNamespace

from fastapi.testclient import TestClient
from PIL import Image

import app.api.v1.endpoints.pipeline as pipeline_endpoint
import app.main as main_module
import app.services.pipeline as pipeline_service
from app.core.config import settings
from app.core.secrets import resolve_secret
from app.services.storage import get_inference_history_service, reset_inference_history_service


def _sample_result() -> dict:
    return {
        "pipeline_models": {
            "detector": "detector.pt",
            "bill_reader": "bill.pt",
            "coin_classifier": "coin.pt",
            "spoof_guard": None,
        },
        "spoof_check": {"enabled": True, "blocked": False},
        "detector": {"type": "detector", "detections": [{"class_name": "bill", "confidence": 0.98}]},
        "requested_top_k_targets": 1,
        "target": {"class_name": "bill", "confidence": 0.98},
        "classification": {
            "kind": "bill_reader",
            "result": {"top_predictions": [{"class": "five_dollars", "confidence": 0.97}]},
        },
        "candidates": [],
    }


def _png_bytes() -> bytes:
    image = Image.new("RGB", (24, 24), color=(255, 255, 255))
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def test_resolve_secret_prefers_file(tmp_path, monkeypatch):
    secret_file = tmp_path / "db_password.txt"
    secret_file.write_text("from-file\n", encoding="utf-8")
    monkeypatch.setenv("DB_PASSWORD", "from-env")
    monkeypatch.setenv("DB_PASSWORD_FILE", str(secret_file))

    resolved = resolve_secret("DB_PASSWORD")

    assert resolved.value == "from-file"
    assert resolved.source == "file:DB_PASSWORD_FILE"


def test_resolve_secret_uses_secrets_dir(tmp_path):
    secrets_dir = tmp_path / "secrets"
    secrets_dir.mkdir()
    (secrets_dir / "db_username").write_text("runner\n", encoding="utf-8")

    resolved = resolve_secret("DB_USERNAME", secrets_dir=str(secrets_dir))

    assert resolved.value == "runner"
    assert resolved.source == "dir:db_username"


def test_local_storage_records_history(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "app_storage_backend", "local")
    monkeypatch.setattr(settings, "app_local_storage_path", tmp_path / "history.jsonl")
    monkeypatch.setattr(settings, "app_storage_max_history", 5)
    reset_inference_history_service()

    service = get_inference_history_service()
    status = service.initialize()

    assert status["ready"] is True
    assert service.record_pipeline_inference(
        source_filename="sample.png",
        content_type="image/png",
        payload_size_bytes=128,
        server_timing_ms=12.4,
        requested_top_k_targets=1,
        spoof_guard_enabled=True,
        result=_sample_result(),
    )

    entries = service.list_recent(limit=5)
    assert len(entries) == 1
    assert entries[0]["summary"]["top_prediction_label"] == "five_dollars"
    assert entries[0]["source_filename"] == "sample.png"

    reset_inference_history_service()


def test_database_storage_records_history_with_sqlite(tmp_path, monkeypatch):
    db_path = tmp_path / "history.sqlite3"
    monkeypatch.setattr(settings, "app_storage_backend", "database")
    monkeypatch.setattr(settings, "database_url", f"sqlite+pysqlite:///{db_path.as_posix()}")
    monkeypatch.setattr(settings, "database_url_source", "settings")
    monkeypatch.setattr(settings, "db_driver", "sqlite+pysqlite")
    monkeypatch.setattr(settings, "db_hostname", "localhost")
    monkeypatch.setattr(settings, "db_port", 0)
    monkeypatch.setattr(settings, "db_name", str(db_path))
    monkeypatch.setattr(settings, "db_username", None)
    monkeypatch.setattr(settings, "db_password", None)
    monkeypatch.setattr(settings, "db_username_source", "unset")
    monkeypatch.setattr(settings, "db_password_source", "unset")
    monkeypatch.setattr(settings, "app_local_storage_path", tmp_path / "unused.jsonl")
    monkeypatch.setattr(settings, "app_storage_max_history", 5)
    reset_inference_history_service()

    service = get_inference_history_service()
    status = service.initialize()

    assert status["ready"] is True
    assert status["database"]["url_configured"] is True
    assert service.record_pipeline_inference(
        source_filename="db-sample.png",
        content_type="image/png",
        payload_size_bytes=64,
        server_timing_ms=8.1,
        requested_top_k_targets=1,
        spoof_guard_enabled=False,
        result=_sample_result(),
    )

    entries = service.list_recent(limit=5)
    assert len(entries) == 1
    assert entries[0]["source_filename"] == "db-sample.png"
    assert entries[0]["summary"]["detections_count"] == 1

    reset_inference_history_service()


def test_pipeline_infer_persists_history(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "app_storage_backend", "local")
    monkeypatch.setattr(settings, "app_local_storage_path", tmp_path / "history.jsonl")
    monkeypatch.setattr(settings, "app_storage_max_history", 10)
    reset_inference_history_service()

    monkeypatch.setattr(main_module, "ensure_pipeline_models", lambda allow_refresh_from_defaults=True: None)
    monkeypatch.setattr(pipeline_endpoint, "run_full_process", lambda image, top_k_targets=1, spoof_guard_enabled=None: _sample_result())
    monkeypatch.setattr(pipeline_service, "_pipeline_detector", SimpleNamespace(name="detector"))
    monkeypatch.setattr(pipeline_service, "_pipeline_bill_reader", SimpleNamespace(name="bill_reader"))
    monkeypatch.setattr(pipeline_service, "_pipeline_coin_classifier", SimpleNamespace(name="coin_classifier"))

    app = main_module.create_app()
    with TestClient(app, raise_server_exceptions=False) as client:
        response = client.post(
            "/api/pipeline/infer",
            files={"file": ("sample.png", _png_bytes(), "image/png")},
        )

        assert response.status_code == 200

        history = client.get("/api/storage/history?limit=5")
        assert history.status_code == 200
        data = history.json()
        assert data["count"] >= 1
        assert data["entries"][0]["source_filename"] == "sample.png"

    reset_inference_history_service()
