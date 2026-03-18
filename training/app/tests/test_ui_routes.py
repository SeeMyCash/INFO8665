"""Route-level tests for UI mounting and SPA fallbacks."""

from fastapi.testclient import TestClient
import pytest

import app.main as main_module


@pytest.fixture
def ui_client(tmp_path, monkeypatch):
    """Build an app with isolated static + RN HTML files."""
    static_dir = tmp_path / "static"
    rn_dir = tmp_path / "rn"
    static_dir.mkdir()
    rn_dir.mkdir()
    (static_dir / "index.html").write_text("<html><body>STATIC_UI</body></html>", encoding="utf-8")
    (rn_dir / "index.html").write_text("<html><body>RN_UI</body></html>", encoding="utf-8")

    monkeypatch.setattr(main_module.settings, "static_dir", static_dir)
    monkeypatch.setattr(main_module.settings, "rn_dir", rn_dir)
    monkeypatch.setattr(
        main_module,
        "ensure_pipeline_models",
        lambda allow_refresh_from_defaults=True: None,
    )

    app = main_module.create_app()
    return TestClient(app, raise_server_exceptions=False)


def test_root_serves_rn_spa(ui_client: TestClient):
    response = ui_client.get("/")
    assert response.status_code == 200
    assert "RN_UI" in response.text


def test_root_subroute_falls_back_to_rn_spa(ui_client: TestClient):
    response = ui_client.get("/history")
    assert response.status_code == 200
    assert "RN_UI" in response.text


def test_rn_route_serves_legacy_static_ui(ui_client: TestClient):
    response = ui_client.get("/rn")
    assert response.status_code == 200
    assert "STATIC_UI" in response.text


def test_rn_subroute_falls_back_to_legacy_static_ui(ui_client: TestClient):
    response = ui_client.get("/rn/settings")
    assert response.status_code == 200
    assert "STATIC_UI" in response.text


def test_reserved_api_path_not_swallowed_by_spa(ui_client: TestClient):
    response = ui_client.get("/api/definitely-not-a-real-endpoint")
    assert response.status_code == 404
    assert "detail" in response.json()


def test_docs_route_still_available(ui_client: TestClient):
    response = ui_client.get("/docs")
    assert response.status_code == 200
    assert "Swagger UI" in response.text


def test_root_returns_404_when_rn_build_is_missing(tmp_path, monkeypatch):
    static_dir = tmp_path / "static"
    rn_dir = tmp_path / "rn"
    static_dir.mkdir()
    rn_dir.mkdir()
    (static_dir / "index.html").write_text("<html><body>STATIC_UI</body></html>", encoding="utf-8")

    monkeypatch.setattr(main_module.settings, "static_dir", static_dir)
    monkeypatch.setattr(main_module.settings, "rn_dir", rn_dir)
    monkeypatch.setattr(
        main_module,
        "ensure_pipeline_models",
        lambda allow_refresh_from_defaults=True: None,
    )

    app = main_module.create_app()
    client = TestClient(app, raise_server_exceptions=False)
    response = client.get("/")

    assert response.status_code == 404
    assert response.json() == {"detail": "React Native web build not found"}
