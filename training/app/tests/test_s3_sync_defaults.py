"""Tests for S3 default resolution and tarball extraction hardening."""

from __future__ import annotations

import io
import tarfile

import pytest

from app.services import s3_sync


def test_resolve_artifact_defaults_prefers_deploy_files(monkeypatch):
    monkeypatch.setattr(s3_sync.settings, "artifacts_bucket", "env-bucket")
    monkeypatch.setattr(s3_sync.settings, "artifacts_prefix", "env-prefix")
    s3_sync.infer_artifacts_bucket_from_aws_identity.cache_clear()

    def fake_read(name: str):
        return {
            "models_bucket.txt": "deploy-bucket",
            "models_prefix.txt": "deploy-prefix",
        }.get(name)

    monkeypatch.setattr(s3_sync, "read_deploy_text", fake_read)

    assert s3_sync.resolve_artifact_defaults() == {
        "artifacts_bucket": "deploy-bucket",
        "artifacts_prefix": "deploy-prefix",
    }


def test_resolve_artifact_defaults_falls_back_to_settings(monkeypatch):
    monkeypatch.setattr(s3_sync.settings, "artifacts_bucket", "env-bucket")
    monkeypatch.setattr(s3_sync.settings, "artifacts_prefix", "env-prefix")
    monkeypatch.setattr(s3_sync, "read_deploy_text", lambda name: None)
    s3_sync.infer_artifacts_bucket_from_aws_identity.cache_clear()

    assert s3_sync.resolve_artifact_defaults() == {
        "artifacts_bucket": "env-bucket",
        "artifacts_prefix": "env-prefix",
    }


def test_resolve_artifact_defaults_falls_back_to_aws_identity(monkeypatch):
    class _FakeStsClient:
        def get_caller_identity(self):
            return {"Account": "123456789012"}

    class _FakeBoto3:
        @staticmethod
        def client(name: str, region_name: str | None = None):
            assert name == "sts"
            return _FakeStsClient()

    monkeypatch.setattr(s3_sync.settings, "artifacts_bucket", None)
    monkeypatch.setattr(s3_sync.settings, "artifacts_prefix", "env-prefix")
    monkeypatch.setattr(s3_sync.settings, "enable_aws_model_sync", True)
    monkeypatch.setattr(s3_sync, "read_deploy_text", lambda name: None)
    monkeypatch.setattr(s3_sync, "boto3", _FakeBoto3())
    s3_sync.infer_artifacts_bucket_from_aws_identity.cache_clear()

    assert s3_sync.resolve_artifact_defaults() == {
        "artifacts_bucket": "smc-phase2-artifacts-123456789012",
        "artifacts_prefix": "env-prefix",
    }


def test_safe_extract_tarball_rejects_path_traversal(tmp_path):
    tar_path = tmp_path / "bad.tar.gz"
    with tarfile.open(tar_path, "w:gz") as tar:
        payload = io.BytesIO(b"oops")
        info = tarfile.TarInfo(name="../escape.txt")
        info.size = len(payload.getvalue())
        tar.addfile(info, payload)

    with pytest.raises(RuntimeError, match="Unsafe tar member path"):
        s3_sync._safe_extract_tarball(tar_path, tmp_path / "extract")
