import io
from types import SimpleNamespace

from fastapi.testclient import TestClient
from PIL import Image

import app.main as main_module
import app.api.v1.endpoints.pipeline as pipeline_endpoint
import app.services.pipeline as pipeline_service
from app.core.config import settings
from app.services.storage import reset_inference_history_service


def _png_bytes() -> bytes:
    image = Image.new("RGB", (24, 24), color=(255, 255, 255))
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def test_pipeline_infer_passes_threshold_overrides(tmp_path, monkeypatch):
    captured: dict[str, object] = {}

    monkeypatch.setattr(settings, "app_storage_backend", "local")
    monkeypatch.setattr(settings, "app_local_storage_path", tmp_path / "history.jsonl")
    monkeypatch.setattr(settings, "app_storage_max_history", 5)
    reset_inference_history_service()

    monkeypatch.setattr(main_module, "ensure_pipeline_models", lambda allow_refresh_from_defaults=True: None)
    monkeypatch.setattr(pipeline_service, "_pipeline_detector", SimpleNamespace(name="detector"))
    monkeypatch.setattr(pipeline_service, "_pipeline_bill_reader", SimpleNamespace(name="bill_reader"))
    monkeypatch.setattr(pipeline_service, "_pipeline_coin_classifier", SimpleNamespace(name="coin_classifier"))

    def _fake_run(image, top_k_targets=1, spoof_guard_enabled=None, detector_conf_threshold=None, classifier_conf_threshold=None):
        captured["top_k_targets"] = top_k_targets
        captured["spoof_guard_enabled"] = spoof_guard_enabled
        captured["detector_conf_threshold"] = detector_conf_threshold
        captured["classifier_conf_threshold"] = classifier_conf_threshold
        return {
            "pipeline_models": {"detector": "detector.pt", "bill_reader": "bill.pt", "coin_classifier": "coin.pt", "spoof_guard": None},
            "spoof_check": {"enabled": True, "blocked": False},
            "detector": {"type": "detector", "detections": [], "image_width": 24, "image_height": 24},
            "requested_top_k_targets": top_k_targets,
            "target": None,
            "classification": None,
            "candidates": [],
        }

    monkeypatch.setattr(pipeline_endpoint, "run_full_process", _fake_run)

    app = main_module.create_app()
    with TestClient(app, raise_server_exceptions=False) as client:
        response = client.post(
            "/api/pipeline/infer",
            data={
                "top_k_targets": "3",
                "spoof_guard_enabled": "true",
                "detector_conf_threshold": "0.75",
                "classifier_conf_threshold": "0.90",
            },
            files={"file": ("sample.png", _png_bytes(), "image/png")},
        )

    assert response.status_code == 200
    assert captured["top_k_targets"] == 3
    assert captured["spoof_guard_enabled"] is True
    assert abs(float(captured["detector_conf_threshold"]) - 0.75) < 1e-9
    assert abs(float(captured["classifier_conf_threshold"]) - 0.90) < 1e-9

    reset_inference_history_service()


def test_pipeline_classifier_threshold_controls_display_labels(monkeypatch):
    monkeypatch.setattr(pipeline_service, "_pipeline_detector", SimpleNamespace(name="detector"))
    monkeypatch.setattr(pipeline_service, "_pipeline_bill_reader", SimpleNamespace(name="bill_reader"))
    monkeypatch.setattr(pipeline_service, "_pipeline_coin_classifier", SimpleNamespace(name="coin_classifier"))
    monkeypatch.setattr(pipeline_service, "_pipeline_spoof_guard", None)

    monkeypatch.setattr(
        pipeline_service,
        "run_spoof_guard",
        lambda image, loaded, enabled=None: {"blocked": False, "suspected": False},
    )
    monkeypatch.setattr(
        pipeline_service,
        "predict_yolo_instance",
        lambda loaded, image, conf_threshold=None: {
            "type": "detector",
            "detections": [
                {
                    "class_name": "COIN",
                    "confidence": 0.96,
                    "xyxy": [5, 5, 45, 45],
                    "box_area_ratio": 0.16,
                },
                {
                    "class_name": "CAD_20",
                    "confidence": 0.81,
                    "xyxy": [55, 10, 95, 55],
                    "box_area_ratio": 0.18,
                },
            ],
            "image_width": 100,
            "image_height": 100,
        },
    )

    classifier_outputs = iter(
        [
            {"top_predictions": [{"class": "CAD_20", "confidence": 0.97}]},
            {"top_predictions": [{"class": "LOONIE", "confidence": 0.88}]},
        ]
    )
    monkeypatch.setattr(
        pipeline_service,
        "predict_classifier_instance",
        lambda loaded, crop: next(classifier_outputs),
    )

    out = pipeline_service.run_full_process(
        Image.new("RGB", (100, 100), color=(255, 255, 255)),
        top_k_targets=2,
        classifier_conf_threshold=0.90,
    )
    detections = out["detector"]["detections"]
    by_detector_class = {d["class_name"]: d for d in detections}

    assert by_detector_class["CAD_20"]["display_name"] == "CAD_20"
    assert "display_name" not in by_detector_class["COIN"]
