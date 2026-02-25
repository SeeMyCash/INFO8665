# Task 76 — YOLO training environment reproducibility
# Task 73 — Train detector end-to-end
# Task 77 — Evaluation summary + stability checks
# Task 95 — Coin classifier module + inference wiring
# Implemented for Sprint 0 by: Oluwafemi Lawal

from __future__ import annotations

import hashlib
import json
import os
import random
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable


REPO_ROOT = Path(__file__).resolve().parents[1]


def ensure_dir(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def write_json(path: Path, data: Any) -> None:
    ensure_dir(path.parent)
    path.write_text(json.dumps(data, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def stable_json_hash(obj: Any) -> str:
    payload = json.dumps(obj, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return sha256_bytes(payload)


def utc_epoch_seconds() -> int:
    return int(time.time())


def deterministic_rng(seed: int) -> random.Random:
    return random.Random(seed)


def validate_class_map(classes: Iterable[str]) -> dict[str, Any]:
    classes_list = list(classes)
    seen = set()
    duplicates: list[str] = []
    for c in classes_list:
        if c in seen:
            duplicates.append(c)
        seen.add(c)

    return {
        "count": len(classes_list),
        "unique_count": len(seen),
        "duplicates": duplicates,
        "sorted": sorted(classes_list),
        "is_sorted": classes_list == sorted(classes_list),
        "has_duplicates": len(duplicates) > 0,
    }


@dataclass(frozen=True)
class RunPaths:
    run_id: str
    outputs_dir: Path
    manifests_dir: Path
    reports_dir: Path

    @property
    def detector_run_dir(self) -> Path:
        return self.outputs_dir / "detector" / self.run_id

    @property
    def coin_run_dir(self) -> Path:
        return self.outputs_dir / "coin_classifier" / self.run_id


def default_run_paths(run_id: str) -> RunPaths:
    training_dir = Path(__file__).resolve().parent
    return RunPaths(
        run_id=run_id,
        outputs_dir=training_dir / "outputs",
        manifests_dir=training_dir / "manifests",
        reports_dir=training_dir / "reports",
    )


def env_flag(name: str, default: bool = False) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "y", "on"}
