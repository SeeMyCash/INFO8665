"""Unit tests for classifier-driven display labels on detector boxes."""

from __future__ import annotations

from types import SimpleNamespace

from PIL import Image

import app.services.pipeline as pipeline


def test_pipeline_attaches_classifier_display_labels_to_detections(monkeypatch):
    monkeypatch.setattr(pipeline, "_pipeline_detector", SimpleNamespace(name="detector"))
    monkeypatch.setattr(pipeline, "_pipeline_bill_reader", SimpleNamespace(name="bill_reader"))
    monkeypatch.setattr(pipeline, "_pipeline_coin_classifier", SimpleNamespace(name="coin_classifier"))
    monkeypatch.setattr(pipeline, "_pipeline_spoof_guard", None)

    monkeypatch.setattr(
        pipeline,
        "run_spoof_guard",
        lambda image, loaded, enabled=None: {"blocked": False, "suspected": False},
    )
    monkeypatch.setattr(
        pipeline,
        "predict_yolo_instance",
        lambda loaded, image: {
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
        },
    )

    classifier_outputs = iter(
        [
            {"top_predictions": [{"class": "CAD_20", "confidence": 0.97}]},
            {"top_predictions": [{"class": "LOONIE", "confidence": 0.88}]},
        ]
    )
    monkeypatch.setattr(
        pipeline,
        "predict_classifier_instance",
        lambda loaded, crop: next(classifier_outputs),
    )

    out = pipeline.run_full_process(Image.new("RGB", (100, 100), color=(255, 255, 255)), top_k_targets=2)
    detections = out["detector"]["detections"]
    by_detector_class = {d["class_name"]: d for d in detections}

    assert by_detector_class["CAD_20"]["display_name"] == "CAD_20"
    assert by_detector_class["COIN"]["display_name"] == "LOONIE"
    assert abs(float(by_detector_class["COIN"]["display_confidence"]) - 0.88) < 1e-9
    assert by_detector_class["COIN"]["class_name"] == "COIN"

    assert "_source_index" not in out["target"]
    assert "_target_kind" not in out["target"]
    for candidate in out["candidates"]:
        assert "_source_index" not in candidate["target"]
        assert "_target_kind" not in candidate["target"]
