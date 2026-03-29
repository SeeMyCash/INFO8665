from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

try:
    from dotenv import load_dotenv
except Exception:  # pragma: no cover - dependency is optional at runtime
    load_dotenv = None


REPO_ROOT = Path(__file__).resolve().parents[1]


def load_repo_env() -> Optional[Path]:
    """Load the repo-root .env file when python-dotenv is available."""
    env_path = REPO_ROOT / ".env"
    if load_dotenv is not None and env_path.exists():
        load_dotenv(env_path, override=False)
    return env_path if env_path.exists() else None


def env_default(name: str, default: str = "") -> str:
    value = os.environ.get(name)
    if value is None:
        return default
    cleaned = str(value).strip()
    return cleaned if cleaned else default
