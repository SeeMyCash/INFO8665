#!/usr/bin/env python3
"""Download SageMaker champion model artifacts locally.

Given one or more SageMaker *TrainingJob* names, this script:

1) Calls `DescribeTrainingJob` to find `ModelArtifacts.S3ModelArtifacts`
2) Downloads `model.tar.gz` from S3
3) Extracts it into a per-job folder
4) Optionally flattens common files into a single outputs/models folder

No credentials or account details are embedded. AWS auth is via your environment
(AWS CLI config, env vars, or IAM role).
"""

from __future__ import annotations

import argparse
import tarfile
from dataclasses import dataclass
from pathlib import Path

try:
    import boto3  # type: ignore
except Exception:
    boto3 = None


def _repo_root() -> Path:
    # INFO8665 repo root = parent of scripts/
    return Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class S3Uri:
    bucket: str
    key: str


def parse_s3_uri(uri: str) -> S3Uri:
    uri = (uri or "").strip()
    if not uri.startswith("s3://"):
        raise ValueError(f"Not an s3:// uri: {uri}")
    rest = uri[len("s3://") :]
    if "/" not in rest:
        return S3Uri(bucket=rest, key="")
    bucket, key = rest.split("/", 1)
    return S3Uri(bucket=bucket, key=key)


def safe_extract_tar_gz(tar_path: Path, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    with tarfile.open(tar_path, "r:gz") as tar:
        members = tar.getmembers()
        for m in members:
            # Prevent path traversal
            target = (out_dir / m.name).resolve()
            if not str(target).startswith(str(out_dir.resolve())):
                raise RuntimeError(f"Unsafe tar member path: {m.name}")
        tar.extractall(out_dir)


def maybe_flatten(extracted_dir: Path, job_name: str, flat_dir: Path) -> list[Path]:
    flat_dir.mkdir(parents=True, exist_ok=True)
    written: list[Path] = []

    candidates = [
        extracted_dir / "model.pt",
        extracted_dir / "train" / "weights" / "best.pt",
        extracted_dir / "weights" / "best.pt",
        extracted_dir / "best.pt",
    ]

    for c in candidates:
        if not c.exists():
            continue
        suffix = c.name
        out = flat_dir / f"{job_name}__{suffix}"
        out.write_bytes(c.read_bytes())
        written.append(out)

    return written


def main() -> int:
    parser = argparse.ArgumentParser(description="Download SageMaker TrainingJob model artifacts")
    parser.add_argument("--region", default="us-east-1")
    parser.add_argument(
        "--job",
        action="append",
        dest="jobs",
        required=True,
        help="TrainingJob name (repeatable)",
    )
    parser.add_argument(
        "--out-root",
        default=str(_repo_root() / "outputs" / "models" / "aws_champions"),
        help="Where to store downloads/extractions",
    )
    parser.add_argument(
        "--flat-out",
        default=str(_repo_root() / "outputs" / "models"),
        help="Where to write flattened files (job__best.pt / job__model.pt)",
    )
    parser.add_argument("--no-extract", action="store_true")
    parser.add_argument("--no-flatten", action="store_true")
    args = parser.parse_args()

    if boto3 is None:
        raise SystemExit(
            "boto3 is required for this optional AWS script. Install it with: pip install boto3"
        )

    out_root = Path(args.out_root)
    flat_out = Path(args.flat_out)
    out_root.mkdir(parents=True, exist_ok=True)

    sm = boto3.client("sagemaker", region_name=args.region)
    s3 = boto3.client("s3", region_name=args.region)

    for job_name in args.jobs:
        job_name = str(job_name).strip()
        print(f"job={job_name}", flush=True)
        desc = sm.describe_training_job(TrainingJobName=job_name)
        s3_uri = desc.get("ModelArtifacts", {}).get("S3ModelArtifacts")
        if not s3_uri:
            raise SystemExit(f"No ModelArtifacts.S3ModelArtifacts for {job_name}")

        parsed = parse_s3_uri(s3_uri)
        job_dir = out_root / job_name
        job_dir.mkdir(parents=True, exist_ok=True)
        tar_path = job_dir / "model.tar.gz"

        print(f"download=s3://{parsed.bucket}/{parsed.key}")
        s3.download_file(parsed.bucket, parsed.key, str(tar_path))
        print(f"saved_tar={tar_path}")

        extracted_dir = job_dir / "extracted"
        if not args.no_extract:
            safe_extract_tar_gz(tar_path, extracted_dir)
            print(f"extracted_dir={extracted_dir}")

        if not args.no_flatten and not args.no_extract:
            written = maybe_flatten(extracted_dir, job_name=job_name, flat_dir=flat_out)
            for p in written:
                print(f"flattened={p}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
