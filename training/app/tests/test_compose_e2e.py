import os

import httpx
import pytest


TEST_BASE_URL = os.getenv("TEST_BASE_URL")
EXPECTED_STORAGE_BACKEND = os.getenv("EXPECTED_STORAGE_BACKEND")

pytestmark = pytest.mark.skipif(not TEST_BASE_URL, reason="TEST_BASE_URL not set")


def test_compose_stack_health_and_storage():
    with httpx.Client(base_url=TEST_BASE_URL, timeout=30.0) as client:
        health = client.get("/api/health")
        assert health.status_code == 200
        health_data = health.json()
        assert health_data["ok"] is True
        assert "storage" in health_data

        storage = client.get("/api/storage/status")
        assert storage.status_code == 200
        storage_data = storage.json()
        assert storage_data["ready"] is True
        if EXPECTED_STORAGE_BACKEND:
            assert storage_data["backend"] == EXPECTED_STORAGE_BACKEND
        if storage_data["backend"] == "database":
            assert storage_data["database"]["url_configured"] is True
            assert storage_data["database"]["password_configured"] is True

        history = client.get("/api/storage/history?limit=5")
        assert history.status_code == 200
        assert isinstance(history.json()["entries"], list)


def test_compose_pipeline_rejects_invalid_media_type():
    with httpx.Client(base_url=TEST_BASE_URL, timeout=30.0) as client:
        response = client.post(
            "/api/pipeline/infer",
            files={"file": ("bad.pdf", b"fake-pdf", "application/pdf")},
        )

    assert response.status_code == 415
    assert "detail" in response.json()
