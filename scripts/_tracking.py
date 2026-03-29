from __future__ import annotations

import json
import os
import re
import socket
import tempfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Mapping, Optional

from _runtime import env_default, load_repo_env

load_repo_env()
os.environ.setdefault("MLFLOW_SUPPRESS_PRINTING_URL_TO_STDOUT", "true")

try:
    import mlflow
except Exception:  # pragma: no cover - dependency is optional at runtime
    mlflow = None


def _default_tracking_uri() -> str:
    return env_default("MLFLOW_TRACKING_URI", "")


def _default_experiment_name(component: str) -> str:
    explicit = env_default("MLFLOW_EXPERIMENT_NAME", "")
    if explicit:
        return explicit
    prefix = env_default("MLFLOW_EXPERIMENT_PREFIX", "INFO8665").strip("/")
    return f"{prefix}/{component}".strip("/")


def _stringify(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, (str, int, float, bool)):
        return str(value)
    if isinstance(value, Path):
        return str(value)
    return json.dumps(value, sort_keys=True, default=str)


def _clean_mapping(values: Mapping[str, Any]) -> dict[str, str]:
    cleaned: dict[str, str] = {}
    for key, value in values.items():
        if value is None:
            continue
        cleaned[str(key)] = _stringify(value)
    return cleaned


def _sanitize_metric_name(name: str) -> str:
    sanitized = re.sub(r"[^A-Za-z0-9_.\- /:]", "_", str(name)).strip()
    return sanitized or "metric"


@dataclass
class ExperimentTracker:
    component: str
    experiment_name: str = ""
    run_name: Optional[str] = None
    enabled: bool = True
    extra_tags: Mapping[str, Any] = field(default_factory=dict)
    active: bool = False
    last_error: Optional[str] = None

    def start(self) -> "ExperimentTracker":
        if not self.enabled:
            return self
        if mlflow is None:
            self.enabled = False
            self.last_error = "mlflow is not installed"
            print(f"mlflow_tracking=disabled reason={self.last_error}", flush=True)
            return self

        tracking_uri = _default_tracking_uri()
        experiment_name = self.experiment_name or _default_experiment_name(self.component)

        try:
            if tracking_uri:
                mlflow.set_tracking_uri(tracking_uri)
            mlflow.set_experiment(experiment_name)
            mlflow.start_run(run_name=self.run_name)
            mlflow.set_tags(
                _clean_mapping(
                    {
                        "component": self.component,
                        "hostname": socket.gethostname(),
                        **dict(self.extra_tags),
                    }
                )
            )
            self.active = True
            print(
                f"mlflow_tracking=enabled experiment={experiment_name} "
                f"run_name={self.run_name or ''} uri={tracking_uri or 'default'}",
                flush=True,
            )
        except Exception as exc:
            self.enabled = False
            self.active = False
            self.last_error = str(exc)
            print(f"mlflow_tracking=disabled reason={self.last_error}", flush=True)
        return self

    def log_params(self, params: Mapping[str, Any]) -> None:
        if not (self.enabled and self.active and params):
            return
        try:
            mlflow.log_params(_clean_mapping(params))
        except Exception as exc:
            self.last_error = str(exc)
            print(f"mlflow_log_params_error={self.last_error}", flush=True)

    def log_metric(self, name: str, value: Any, step: Optional[int] = None) -> None:
        if not (self.enabled and self.active):
            return
        try:
            metric_value = float(value)
        except Exception:
            return
        metric_name = _sanitize_metric_name(name)
        try:
            if step is None:
                mlflow.log_metric(metric_name, metric_value)
            else:
                mlflow.log_metric(metric_name, metric_value, step=int(step))
        except Exception as exc:
            self.last_error = str(exc)
            print(f"mlflow_log_metric_error={self.last_error}", flush=True)

    def log_metrics(self, metrics: Mapping[str, Any], step: Optional[int] = None) -> None:
        for name, value in metrics.items():
            self.log_metric(str(name), value, step=step)

    def set_tag(self, name: str, value: Any) -> None:
        if not (self.enabled and self.active):
            return
        try:
            mlflow.set_tag(name, _stringify(value))
        except Exception as exc:
            self.last_error = str(exc)
            print(f"mlflow_set_tag_error={self.last_error}", flush=True)

    def log_artifact(self, path: str | Path, artifact_path: Optional[str] = None) -> None:
        if not (self.enabled and self.active):
            return
        artifact = Path(path)
        if not artifact.exists():
            return
        try:
            mlflow.log_artifact(str(artifact), artifact_path=artifact_path)
        except Exception as exc:
            self.last_error = str(exc)
            print(f"mlflow_log_artifact_error={self.last_error}", flush=True)

    def log_artifacts(self, path: str | Path, artifact_path: Optional[str] = None) -> None:
        if not (self.enabled and self.active):
            return
        artifact_dir = Path(path)
        if not artifact_dir.exists():
            return
        try:
            mlflow.log_artifacts(str(artifact_dir), artifact_path=artifact_path)
        except Exception as exc:
            self.last_error = str(exc)
            print(f"mlflow_log_artifacts_error={self.last_error}", flush=True)

    def log_dict(self, payload: Mapping[str, Any], artifact_file: str) -> None:
        if not (self.enabled and self.active):
            return
        try:
            if hasattr(mlflow, "log_dict"):
                mlflow.log_dict(dict(payload), artifact_file)
                return
        except Exception:
            pass

        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_path = Path(tmp_dir) / Path(artifact_file).name
            tmp_path.write_text(json.dumps(payload, indent=2, sort_keys=True, default=str), encoding="utf-8")
            self.log_artifact(tmp_path, artifact_path=str(Path(artifact_file).parent))

    def finish(self, status: str = "FINISHED") -> None:
        if not (self.enabled and self.active):
            return
        try:
            mlflow.end_run(status=status)
        finally:
            self.active = False

    def __enter__(self) -> "ExperimentTracker":
        return self.start()

    def __exit__(self, exc_type, exc, exc_tb) -> bool:
        self.finish("FAILED" if exc else "FINISHED")
        return False


def build_tracker(
    component: str,
    experiment_name: str = "",
    run_name: Optional[str] = None,
    enabled: bool = True,
    extra_tags: Optional[Mapping[str, Any]] = None,
) -> ExperimentTracker:
    return ExperimentTracker(
        component=component,
        experiment_name=experiment_name,
        run_name=run_name,
        enabled=enabled,
        extra_tags=extra_tags or {},
    )
