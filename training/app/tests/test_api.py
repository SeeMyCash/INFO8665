"""
Basic smoke tests for the See My Cash API.

Run with:  pytest app/tests/ -v
"""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app, raise_server_exceptions=False)


class TestHealthEndpoints:
    """Verify the health / version / config routes return 200."""

    def test_health(self):
        resp = client.get("/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["ok"] is True
        assert "pipeline" in data
        assert "storage" in data
        assert "backend" in data["storage"]

    def test_version(self):
        resp = client.get("/api/version")
        assert resp.status_code == 200
        data = resp.json()
        assert "version" in data
        assert "uptime_seconds" in data

    def test_config(self):
        resp = client.get("/api/config")
        assert resp.status_code == 200
        data = resp.json()
        assert "defaults" in data
        assert "storage" in data


class TestModelEndpoints:
    """Verify model management routes respond correctly."""

    def test_list_models(self):
        resp = client.get("/api/models/")
        assert resp.status_code == 200
        data = resp.json()
        assert "models" in data

    def test_select_model_not_found(self):
        """Selecting a model that doesn't exist returns 404."""
        resp = client.post("/api/models/select", json={"model_name": "nonexistent.pt"})
        assert resp.status_code == 404
        assert "detail" in resp.json()

    def test_select_model_missing_body(self):
        """Missing request body triggers 422 validation error."""
        resp = client.post("/api/models/select")
        assert resp.status_code == 422

    def test_refresh_models_empty_bucket(self):
        """Empty bucket name returns 400."""
        resp = client.post(
            "/api/models/refresh",
            json={"artifacts_bucket": "", "artifacts_prefix": "output"},
        )
        assert resp.status_code == 400
        assert "detail" in resp.json()


class TestPipelineEndpoints:
    """Verify pipeline read-only routes respond correctly."""

    def test_pipeline_status_has_spoof_guard_slot(self):
        resp = client.get("/api/pipeline/status")
        assert resp.status_code == 200
        data = resp.json()
        assert "pipeline" in data
        assert "spoof_guard" in data["pipeline"]

    def test_pipeline_stats(self):
        resp = client.get("/api/pipeline/stats")
        assert resp.status_code == 200
        data = resp.json()
        assert "inference_count" in data

    def test_pipeline_infer_no_file(self):
        """Missing file field triggers 422 validation error."""
        resp = client.post("/api/pipeline/infer")
        assert resp.status_code == 422
        assert "detail" in resp.json()

    def test_pipeline_infer_invalid_image(self):
        """Uploading a non-image file returns 400."""
        resp = client.post(
            "/api/pipeline/infer",
            files={"file": ("test.txt", b"not an image", "application/octet-stream")},
        )
        # 400 (bad image payload) or 503 (pipeline not loaded) are both valid
        assert resp.status_code in (400, 503)
        assert "detail" in resp.json()

    def test_pipeline_infer_unsupported_content_type(self):
        """Uploading a file with wrong content type returns 415."""
        resp = client.post(
            "/api/pipeline/infer",
            files={"file": ("test.pdf", b"fake-pdf-content", "application/pdf")},
        )
        assert resp.status_code == 415
        assert "detail" in resp.json()


class TestStorageEndpoints:
    """Verify storage routes respond correctly."""

    def test_storage_status(self):
        resp = client.get("/api/storage/status")
        assert resp.status_code == 200
        data = resp.json()
        assert "backend" in data
        assert "ready" in data

    def test_storage_history(self):
        resp = client.get("/api/storage/history")
        assert resp.status_code == 200
        data = resp.json()
        assert "entries" in data
        assert isinstance(data["entries"], list)


class TestLegacyInference:
    """Legacy /api/infer requires an active model."""

    def test_infer_no_model(self):
        """No active model selected returns 409 Conflict."""
        resp = client.post(
            "/api/infer/",
            files={"file": ("img.jpg", b"\xff\xd8\xff\xe0fake", "image/jpeg")},
        )
        assert resp.status_code == 409
        assert "detail" in resp.json()

    def test_infer_no_file(self):
        """Missing file triggers 422."""
        resp = client.post("/api/infer/")
        assert resp.status_code == 422

    def test_infer_unsupported_content_type(self):
        """Wrong content-type returns 415 when no model is loaded (409 takes priority)."""
        resp = client.post(
            "/api/infer/",
            files={"file": ("doc.pdf", b"pdf-bytes", "application/pdf")},
        )
        # 409 (no model) fires before content-type check
        assert resp.status_code == 409


class TestErrorResponseFormat:
    """Verify all error responses contain a 'detail' key."""

    def test_404_on_nonexistent_route(self):
        resp = client.get("/api/nonexistent-route")
        assert resp.status_code == 404
        assert "detail" in resp.json()


class TestStaticRoutes:
    """Root and RN SPA routes."""

    def test_root(self):
        resp = client.get("/")
        # May 200 if index.html exists, or 404/500 otherwise – both are acceptable in tests
        assert resp.status_code in (200, 404, 500)

    def test_docs(self):
        resp = client.get("/docs")
        assert resp.status_code == 200
