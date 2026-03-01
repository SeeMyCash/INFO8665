# Task 76 — YOLO training environment reproducibility
# Task 73 — Train detector end-to-end
# Implemented for Sprint 0 by: Jarius Bedward

from __future__ import annotations

import sys
from pathlib import Path


def _bootstrap_repo_root() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    repo_root_str = str(repo_root)
    if repo_root_str not in sys.path:
        sys.path.insert(0, repo_root_str)


def main() -> int:
    _bootstrap_repo_root()
    from training.detector.train import main as detector_train_main

    return detector_train_main()


if __name__ == "__main__":
    raise SystemExit(main())
