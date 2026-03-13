"""
Pydantic request schemas – used for validating incoming request bodies.
"""

from pydantic import BaseModel


class SelectModelRequest(BaseModel):
    """Request body to select an active model for legacy single-model inference."""

    model_name: str


class RefreshRequest(BaseModel):
    """Request body to download model artifacts from an S3 bucket."""

    artifacts_bucket: str
    artifacts_prefix: str = "output"
    max_models: int = 20
    region: str = "us-east-1"
