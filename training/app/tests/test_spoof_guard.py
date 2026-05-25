"""Unit tests for spoof guard pre-check behavior."""

from __future__ import annotations

from contextlib import contextmanager

from PIL import Image

from app.core.config import settings
from app.services.spoof_guard import run_spoof_guard


@contextmanager
def _override_setting(name: str, value):
    old = getattr(settings, name)
    setattr(settings, name, value)
    try:
        yield
    finally:
        setattr(settings, name, old)


def test_spoof_guard_disabled_returns_disabled_decision():
    with _override_setting("spoof_guard_enabled", False):
        res = run_spoof_guard(Image.new("RGB", (320, 240), color=(0, 0, 0)), None)
    assert res["enabled"] is False
    assert res["decision"] == "disabled"
    assert res["blocked"] is False
    assert res["suspected"] is False


def test_spoof_guard_heuristic_only_response_shape():
    with _override_setting("spoof_guard_enabled", True):
        res = run_spoof_guard(Image.new("RGB", (320, 240), color=(128, 128, 128)), None)
    assert res["enabled"] is True
    assert res["source"] in {"heuristic_only", "model+heuristic"}
    assert "score" in res
    assert "threshold" in res
    assert isinstance(res.get("reasons"), list)
    assert "heuristics" in res


def test_spoof_guard_request_override_disables_when_default_enabled():
    with _override_setting("spoof_guard_enabled", True):
        res = run_spoof_guard(
            Image.new("RGB", (320, 240), color=(128, 128, 128)),
            None,
            enabled=False,
        )
    assert res["enabled"] is False
    assert res["decision"] == "disabled"


def test_spoof_guard_request_override_enables_when_default_disabled():
    with _override_setting("spoof_guard_enabled", False):
        res = run_spoof_guard(
            Image.new("RGB", (320, 240), color=(128, 128, 128)),
            None,
            enabled=True,
        )
    assert res["enabled"] is True
    assert res["decision"] in {"allow", "warn", "block"}
