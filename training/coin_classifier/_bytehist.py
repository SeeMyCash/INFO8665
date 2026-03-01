# Task 95 — Coin classifier module + inference wiring
# Implemented for Sprint 0 by: Oluwafemi Lawal

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


def byte_histogram(path: Path) -> list[float]:
    data = path.read_bytes()
    counts = [0] * 256
    for b in data:
        counts[b] += 1
    total = max(1, len(data))
    return [c / total for c in counts]


def mean_vector(vectors: Iterable[list[float]]) -> list[float]:
    vectors_list = list(vectors)
    if not vectors_list:
        return [0.0] * 256
    out = [0.0] * 256
    for v in vectors_list:
        for i, x in enumerate(v):
            out[i] += float(x)
    n = float(len(vectors_list))
    return [x / n for x in out]


def l2_distance(a: list[float], b: list[float]) -> float:
    return sum((x - y) * (x - y) for x, y in zip(a, b))


@dataclass(frozen=True)
class Prediction:
    label: str
    score: float
