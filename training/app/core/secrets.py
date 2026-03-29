"""
Helpers for resolving sensitive settings without hard-coding secrets.

Resolution order:
1. ``<NAME>_FILE`` environment variable pointing at a mounted secret file
2. ``APP_SECRETS_DIR/<name-lowercase>`` file
3. Direct ``<NAME>`` environment variable
4. Provided default value
"""

from __future__ import annotations

from dataclasses import dataclass
import os
from pathlib import Path
from typing import Optional


@dataclass(frozen=True)
class ResolvedSecret:
    value: Optional[str]
    source: str


def _clean(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _read_secret_file(path: Path) -> Optional[str]:
    if not path.is_file():
        return None
    return _clean(path.read_text(encoding="utf-8"))


def resolve_secret(
    env_name: str,
    *,
    default: Optional[str] = None,
    secrets_dir: Optional[str] = None,
) -> ResolvedSecret:
    file_var = f"{env_name}_FILE"
    secret_file = _clean(os.getenv(file_var))
    if secret_file:
        value = _read_secret_file(Path(secret_file))
        if value is not None:
            return ResolvedSecret(value=value, source=f"file:{file_var}")
        return ResolvedSecret(value=_clean(default), source=f"missing:{file_var}")

    secret_root = _clean(secrets_dir or os.getenv("APP_SECRETS_DIR"))
    if secret_root:
        default_secret_path = Path(secret_root) / env_name.lower()
        value = _read_secret_file(default_secret_path)
        if value is not None:
            return ResolvedSecret(value=value, source=f"dir:{default_secret_path.name}")

    env_value = _clean(os.getenv(env_name))
    if env_value is not None:
        return ResolvedSecret(value=env_value, source=f"env:{env_name}")

    default_value = _clean(default)
    if default_value is not None:
        return ResolvedSecret(value=default_value, source="settings")

    return ResolvedSecret(value=None, source="unset")
