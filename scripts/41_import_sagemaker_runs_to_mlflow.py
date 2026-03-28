#!/usr/bin/env python3
"""Import SageMaker training job metadata into MLflow experiments."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict, Iterable, Optional

import boto3

from _runtime import env_default, load_repo_env
from _tracking import build_tracker

load_repo_env()


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def _load_report(report_path: Path) -> dict[str, dict[str, Any]]:
    if not report_path.exists():
        return {}
    payload = json.loads(report_path.read_text(encoding="utf-8"))
    results: dict[str, dict[str, Any]] = {}
    for component, job_info in (payload.get("jobs") or {}).items():
        name = str(job_info.get("training_job") or "").strip()
        if not name:
            continue
        results[name] = {"component": component, "report": job_info}
    return results


def _metric_map(metric_items: Iterable[dict[str, Any]]) -> dict[str, float]:
    metrics: dict[str, float] = {}
    for item in metric_items:
        name = str(item.get("MetricName") or item.get("metric_name") or "").strip()
        if not name:
            continue
        try:
            metrics[name] = float(item.get("Value") if "Value" in item else item.get("value"))
        except Exception:
            continue
    return metrics


def _flatten_input_data(desc: dict[str, Any]) -> dict[str, str]:
    flattened: dict[str, str] = {}
    for idx, channel in enumerate(desc.get("InputDataConfig") or []):
        channel_name = str(channel.get("ChannelName") or f"channel_{idx}")
        s3_uri = (
            channel.get("DataSource", {})
            .get("S3DataSource", {})
            .get("S3Uri")
        )
        if s3_uri:
            flattened[f"input::{channel_name}"] = str(s3_uri)
    return flattened


def main() -> int:
    parser = argparse.ArgumentParser(description="Import SageMaker training jobs into MLflow")
    parser.add_argument("--region", default=env_default("S3_REGION", "us-east-1"))
    parser.add_argument(
        "--job",
        action="append",
        dest="jobs",
        default=[],
        help="Training job name (repeatable). If omitted, jobs are read from --from-report when available.",
    )
    parser.add_argument(
        "--from-report",
        default=str(_repo_root() / "outputs" / "reports" / "aws_deploy_info_20260313.json"),
        help="Optional repo-local JSON report containing known training jobs and metrics.",
    )
    parser.add_argument("--mlflow-experiment", default="", help="Override MLflow experiment name")
    parser.add_argument("--mlflow-run-prefix", default="import", help="Run name prefix inside MLflow")
    args = parser.parse_args()

    report_path = Path(args.from_report)
    report_jobs = _load_report(report_path)

    requested_jobs = [str(job).strip() for job in args.jobs if str(job).strip()]
    if not requested_jobs:
        requested_jobs = sorted(report_jobs.keys())
    if not requested_jobs:
        raise SystemExit("No jobs provided. Pass --job or point --from-report to a report with training jobs.")

    sm = boto3.client("sagemaker", region_name=args.region)

    for job_name in requested_jobs:
        desc = sm.describe_training_job(TrainingJobName=job_name)
        report_info = report_jobs.get(job_name, {})
        component = str(report_info.get("component") or "sagemaker")
        report_job = report_info.get("report") or {}

        metrics = _metric_map(desc.get("FinalMetricDataList") or [])
        metrics.update(_metric_map(report_job.get("final_metrics") or []))

        tracker = build_tracker(
            component=f"{component}_sagemaker_import",
            experiment_name=args.mlflow_experiment,
            run_name=f"{args.mlflow_run_prefix}::{job_name}",
            enabled=True,
            extra_tags={
                "source": "sagemaker_import",
                "training_job_name": job_name,
                "component": component,
                "training_job_status": desc.get("TrainingJobStatus"),
            },
        )

        with tracker:
            tracker.log_params(
                {
                    "training_job_name": desc.get("TrainingJobName"),
                    "training_job_status": desc.get("TrainingJobStatus"),
                    "training_image": desc.get("AlgorithmSpecification", {}).get("TrainingImage"),
                    "training_input_mode": desc.get("AlgorithmSpecification", {}).get("TrainingInputMode"),
                    "instance_type": desc.get("ResourceConfig", {}).get("InstanceType"),
                    "instance_count": desc.get("ResourceConfig", {}).get("InstanceCount"),
                    "volume_size_gb": desc.get("ResourceConfig", {}).get("VolumeSizeInGB"),
                    "output_path": desc.get("OutputDataConfig", {}).get("S3OutputPath"),
                    "model_artifacts": desc.get("ModelArtifacts", {}).get("S3ModelArtifacts"),
                    "role_arn": desc.get("RoleArn"),
                    "training_start_time": desc.get("TrainingStartTime"),
                    "training_end_time": desc.get("TrainingEndTime"),
                    "training_time_seconds": desc.get("TrainingTimeInSeconds"),
                    **(desc.get("HyperParameters") or {}),
                    **_flatten_input_data(desc),
                }
            )
            tracker.log_metrics(metrics)
            tracker.log_dict(desc, f"sagemaker/{job_name}.json")
            if report_job:
                tracker.log_dict(report_job, f"sagemaker/{job_name}.report.json")

            print(
                f"imported_job={job_name} component={component} "
                f"metric_count={len(metrics)} status={desc.get('TrainingJobStatus')}",
                flush=True,
            )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
