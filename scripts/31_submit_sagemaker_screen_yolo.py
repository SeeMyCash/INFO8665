#!/usr/bin/env python3
"""Upload screen dataset and submit a SageMaker YOLO fine-tune job."""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
import time
from pathlib import Path

import boto3


def _ensure_sagemaker_sdk() -> None:
    try:
        import sagemaker  # type: ignore
        ver = getattr(sagemaker, "__version__", "0")
        if ver and str(ver).split(".", 1)[0].isdigit() and int(str(ver).split(".", 1)[0]) < 3:
            return
    except Exception:
        pass
    subprocess.check_call([sys.executable, "-m", "pip", "install", "sagemaker>=2.240.0,<3.0.0"])


def _upload_dir_to_s3(local_root: Path, bucket: str, prefix: str, region: str) -> str:
    s3 = boto3.client("s3", region_name=region)
    local_root = local_root.resolve()
    uploaded = 0
    for p in sorted(local_root.rglob("*")):
        if not p.is_file():
            continue
        rel = p.relative_to(local_root).as_posix()
        key = f"{prefix.rstrip('/')}/{rel}"
        s3.upload_file(str(p), bucket, key)
        uploaded += 1
    if uploaded == 0:
        raise RuntimeError(f"No files uploaded from {local_root}")
    return f"s3://{bucket}/{prefix.rstrip('/')}"


def main() -> int:
    parser = argparse.ArgumentParser(description="Submit SageMaker YOLO fine-tune for screen detection")
    parser.add_argument("--region", default="us-east-1")
    parser.add_argument("--role-arn", default="arn:aws:iam::268112029918:role/smc-phase2-sagemaker-role")
    parser.add_argument("--bucket", default="smc-phase2-artifacts-268112029918")
    parser.add_argument("--dataset-prefix", default="screen-detection/datasets/screen_coco128_v1")
    parser.add_argument("--output-prefix", default="screen-detection/models")
    parser.add_argument(
        "--dataset-dir",
        default=str(Path("outputs") / "datasets" / "screen_coco128_v1"),
        help="Local dataset root containing data.yaml + images/ + labels/",
    )
    parser.add_argument(
        "--dataset-s3-uri",
        default=None,
        help="Optional pre-uploaded dataset S3 URI (if set, local dataset upload is skipped).",
    )
    parser.add_argument("--instance-type", default="ml.m5.xlarge")
    parser.add_argument("--instance-count", type=int, default=1)
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--batch", type=int, default=16)
    parser.add_argument("--weights", default="yolo11n.pt")
    parser.add_argument("--wait", action="store_true", help="Block until the training job completes")
    parser.add_argument(
        "--stream-logs",
        action="store_true",
        help="When used with --wait, stream CloudWatch logs to console (may fail on non-UTF8 terminals).",
    )
    args = parser.parse_args()

    dataset_s3 = str(args.dataset_s3_uri).strip() if args.dataset_s3_uri else ""
    if dataset_s3:
        if not dataset_s3.startswith("s3://"):
            raise SystemExit("--dataset-s3-uri must start with s3://")
    else:
        dataset_dir = Path(args.dataset_dir)
        if not (dataset_dir / "data.yaml").exists():
            raise SystemExit(
                f"Dataset not found at {dataset_dir}. "
                f"Run scripts/30_prepare_screen_dataset_from_coco128.py or scripts/32_expand_screen_dataset_coco2017.py first."
            )
        dataset_s3 = _upload_dir_to_s3(
            local_root=dataset_dir,
            bucket=args.bucket,
            prefix=args.dataset_prefix,
            region=args.region,
        )
    print(f"dataset_s3={dataset_s3}")

    _ensure_sagemaker_sdk()
    import sagemaker
    from sagemaker.inputs import TrainingInput
    from sagemaker.pytorch import PyTorch

    boto_session = boto3.Session(region_name=args.region)
    sm_session = sagemaker.Session(boto_session=boto_session)

    output_path = f"s3://{args.bucket}/{args.output_prefix.rstrip('/')}"
    job_tag = time.strftime("%Y%m%d-%H%M%S")
    base_job_name = f"screen-yolo-ft-{job_tag}"

    estimator = PyTorch(
        entry_point="sm_train_yolo_screen.py",
        source_dir=str(Path("scripts").resolve()),
        role=args.role_arn,
        framework_version="2.2",
        py_version="py310",
        instance_count=int(args.instance_count),
        instance_type=args.instance_type,
        output_path=output_path,
        base_job_name=base_job_name,
        disable_profiler=True,
        hyperparameters={
            "data-root": "/opt/ml/input/data/train",
            "weights": args.weights,
            "epochs": int(args.epochs),
            "imgsz": int(args.imgsz),
            "batch": int(args.batch),
        },
        sagemaker_session=sm_session,
    )

    inputs = {
        "train": TrainingInput(s3_data=dataset_s3, input_mode="File"),
    }
    estimator.fit(inputs=inputs, wait=bool(args.wait), logs=bool(args.stream_logs))

    job_name = estimator.latest_training_job.name
    print(f"training_job_name={job_name}")
    print(f"describe_cmd=aws sagemaker describe-training-job --training-job-name {job_name} --region {args.region}")
    print(f"output_path={output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
