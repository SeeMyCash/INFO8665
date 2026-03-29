"""
S3 artifact synchronisation – download model tarballs and extract them.
"""

import tarfile
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    import boto3  # type: ignore
except Exception:
    boto3 = None

from app.core.config import settings
from app.services.model_manager import list_local_models


def aws_model_sync_reason() -> Optional[str]:
    """Return a human-readable reason if AWS model sync is unavailable, else None."""
    if not settings.enable_aws_model_sync:
        return "AWS model sync disabled via ENABLE_AWS_MODEL_SYNC=0."
    if boto3 is None:
        return "boto3 is not installed; install boto3 to enable AWS model sync."
    return None


def _safe_extract_tarball(tar_path: Path, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    with tarfile.open(tar_path, "r:gz") as tar:
        for member in tar.getmembers():
            target = (out_dir / member.name).resolve()
            if not str(target).startswith(str(out_dir.resolve())):
                raise RuntimeError(f"Unsafe tar member path: {member.name}")
        tar.extractall(out_dir)


def _extract_model_tarball(tar_path: Path, target_name: str) -> Optional[Path]:
    out_dir = settings.models_dir / target_name
    _safe_extract_tarball(tar_path, out_dir)

    classifier = out_dir / "model.pt"
    yolo_candidates = [
        out_dir / "train" / "weights" / "best.pt",
        out_dir / "weights" / "best.pt",
        out_dir / "best.pt",
    ]

    for yolo_best in yolo_candidates:
        if yolo_best.exists():
            flat_path = settings.models_dir / f"{target_name}__best.pt"
            flat_path.write_bytes(yolo_best.read_bytes())
            return flat_path

    if classifier.exists():
        flat_path = settings.models_dir / f"{target_name}__model.pt"
        flat_path.write_bytes(classifier.read_bytes())
        return flat_path

    return None


def sync_models_from_s3(
    bucket: str,
    prefix: str,
    max_models: int,
    region: str,
) -> Dict[str, Any]:
    """Download and extract model tarballs from S3."""
    reason = aws_model_sync_reason()
    if reason is not None:
        raise RuntimeError(reason)
    s3 = boto3.client("s3", region_name=region)

    paginator = s3.get_paginator("list_objects_v2")
    found: List[tuple] = []
    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        for obj in page.get("Contents", []):
            key = obj["Key"]
            if key.endswith("/output/model.tar.gz"):
                found.append((key, obj["LastModified"]))

    found.sort(key=lambda x: x[1], reverse=True)
    found = found[: max_models if max_models > 0 else 20]

    downloaded: List[str] = []
    for key, _ in found:
        job_name = key.split("/")[1] if "/" in key else key.replace("/", "_")
        local_tar = settings.models_dir / f"{job_name}.tar.gz"
        s3.download_file(bucket, key, str(local_tar))
        maybe = _extract_model_tarball(local_tar, job_name)
        if maybe is not None:
            downloaded.append(maybe.name)

    return {
        "downloaded": downloaded,
        "available": list_local_models(),
    }


def read_deploy_text(name: str) -> Optional[str]:
    """Read a single-line deploy text file from known deploy roots.

    Search order:
    1. `settings.deploy_root` (legacy behavior)
    2. current working directory
    3. parent of `models_dir` (works for Docker at /training)
    """
    candidates = [
        (settings.deploy_root / name).resolve(),
        (Path.cwd() / name).resolve(),
        (settings.models_dir.parent / name).resolve(),
    ]
    seen = set()
    for p in candidates:
        key = str(p)
        if key in seen:
            continue
        seen.add(key)
        try:
            if not p.exists():
                continue
            return p.read_text(encoding="utf-8").strip() or None
        except Exception:
            continue
    return None


def resolve_artifact_defaults() -> Dict[str, Optional[str]]:
    """Resolve default S3 bucket/prefix from deploy files first, then env-backed settings."""
    bucket = read_deploy_text("models_bucket.txt") or settings.artifacts_bucket
    prefix = read_deploy_text("models_prefix.txt") or settings.artifacts_prefix
    bucket = str(bucket).strip() if bucket is not None else None
    prefix = str(prefix).strip() if prefix is not None else settings.artifacts_prefix
    return {
        "artifacts_bucket": bucket or None,
        "artifacts_prefix": prefix or settings.artifacts_prefix,
    }


def refresh_from_deploy_defaults(
    max_models: int = 250,
    region: Optional[str] = None,
) -> bool:
    """Attempt to sync models from S3 using deploy-time defaults."""
    if aws_model_sync_reason() is not None:
        return False
    defaults = resolve_artifact_defaults()
    bucket = defaults["artifacts_bucket"]
    if not bucket:
        return False
    try:
        result = sync_models_from_s3(
            bucket=bucket,
            prefix=defaults["artifacts_prefix"] or settings.artifacts_prefix,
            max_models=max_models,
            region=region or settings.s3_region,
        )
    except Exception:
        return False
    downloaded = result.get("downloaded", []) or []
    available = result.get("available", []) or []
    return bool(downloaded or available)
