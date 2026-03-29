from __future__ import annotations

import sys
from pathlib import Path

import mlflow
import pytest


REPO_ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_DIR = REPO_ROOT / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

import _tracking  # noqa: E402


pytestmark = pytest.mark.filterwarnings(
    "ignore:The filesystem tracking backend.*:FutureWarning"
)


def test_tracker_logs_to_file_store(tmp_path, monkeypatch):
    tracking_root = tmp_path / "mlflow"
    tracking_uri = tracking_root.resolve().as_uri()
    monkeypatch.setenv("MLFLOW_TRACKING_URI", tracking_uri)
    monkeypatch.setenv("MLFLOW_EXPERIMENT_PREFIX", "INFO8665_TEST")

    artifact = tmp_path / "artifact.txt"
    artifact.write_text("artifact payload", encoding="utf-8")

    tracker = _tracking.build_tracker(component="unit", run_name="tracking-smoke")
    with tracker:
        tracker.log_params({"alpha": 1, "mode": "smoke"})
        tracker.log_metrics({"score": 0.75}, step=1)
        tracker.log_artifact(artifact, artifact_path="artifacts")

    mlflow.set_tracking_uri(tracking_uri)
    experiment = mlflow.get_experiment_by_name("INFO8665_TEST/unit")
    assert experiment is not None

    runs = mlflow.search_runs([experiment.experiment_id])
    assert len(runs.index) == 1
    run = runs.iloc[0]
    assert run["params.alpha"] == "1"
    assert run["params.mode"] == "smoke"
    assert run["metrics.score"] == 0.75
