#!/usr/bin/env python3
"""Download datasets from Roboflow Universe links (local-first).

Inputs:
  - configs/universe_links.yaml
  - ROBOFLOW_API_KEY (environment variable)

Outputs:
  - data/interim/<category>/<workspace>__<project>__v<version>/
"""

from __future__ import annotations

import argparse
import os
import time
from pathlib import Path
from urllib.parse import urlparse

import yaml


def require_env_api_key() -> str:
    api_key = os.environ.get("ROBOFLOW_API_KEY", "").strip()
    if not api_key:
        raise SystemExit("Missing ROBOFLOW_API_KEY. Set it in your environment before running.")
    return api_key


def parse_universe_url(url: str) -> tuple[str, str]:
    parts = urlparse(url).path.strip("/").split("/")
    if len(parts) >= 2:
        return parts[0], parts[1]
    raise ValueError(f"Cannot parse workspace/project from URL: {url}")


def download_with_sdk(workspace: str, project: str, api_key: str, fmt: str, out_dir: Path, retries: int = 3):
    from roboflow import Roboflow

    for attempt in range(1, retries + 1):
        try:
            print(f"  SDK attempt {attempt}/{retries}...", flush=True)
            rf = Roboflow(api_key=api_key)
            proj = rf.workspace(workspace).project(project)

            versions_info = getattr(proj, "versions", None)
            versions_list = versions_info() if versions_info and callable(versions_info) else None

            version_num: int | None = None
            if versions_list and isinstance(versions_list, list) and len(versions_list) > 0:
                last_v = versions_list[-1]
                if hasattr(last_v, "version"):
                    version_num = int(str(last_v.version).split("/")[-1])
                elif isinstance(last_v, dict) and "id" in last_v:
                    version_num = int(str(last_v["id"]).split("/")[-1])

            if version_num is None:
                version_num = 1

            print(f"  Using version: {version_num}", flush=True)
            out_dir.mkdir(parents=True, exist_ok=True)
            proj.version(version_num).download(fmt, location=str(out_dir))
            print(f"  Downloaded to {out_dir}", flush=True)
            return True, version_num

        except Exception as exc:
            print(f"  Error on attempt {attempt}: {exc}", flush=True)
            if attempt < retries:
                time.sleep(2**attempt)

    return False, None


def process_category(category: str, urls: list[str], api_key: str, out_root: Path, fmt: str) -> None:
    print(f"\n{'='*60}", flush=True)
    print(f"Category: {category} ({len(urls)} datasets)", flush=True)
    print(f"{'='*60}", flush=True)

    for url in urls:
        try:
            workspace, project = parse_universe_url(url)
        except ValueError as exc:
            print(f"  Skipping {url}: {exc}", flush=True)
            continue

        print(f"\n--- {workspace}/{project} ---", flush=True)
        cat_dir = out_root / category
        if cat_dir.exists():
            existing = [
                d
                for d in cat_dir.iterdir()
                if d.is_dir() and d.name.startswith(f"{workspace}__{project}__")
            ]
            if existing and any(any(d.iterdir()) for d in existing):
                print("  Already downloaded — skipping", flush=True)
                continue

        tmp_dir = out_root / category / f"{workspace}__{project}__v_tmp"
        success, ver = download_with_sdk(workspace, project, api_key, fmt, tmp_dir)
        if success and ver is not None:
            final_dir = out_root / category / f"{workspace}__{project}__v{ver}"
            if tmp_dir.exists() and tmp_dir != final_dir:
                if final_dir.exists():
                    import shutil

                    shutil.rmtree(final_dir)
                tmp_dir.rename(final_dir)
                print(f"  Renamed to {final_dir.name}", flush=True)
        elif not success:
            print(f"  *** FAILED: {workspace}/{project} ***", flush=True)


def main() -> int:
    parser = argparse.ArgumentParser(description="Download Roboflow Universe datasets")
    parser.add_argument("--links", default=str(Path("configs") / "universe_links.yaml"))
    parser.add_argument("--out", default=str(Path("data") / "interim"))
    parser.add_argument("--format", default="yolov8", help="Export format (default: yolov8)")
    args = parser.parse_args()

    api_key = require_env_api_key()
    links_path = Path(args.links)
    out_root = Path(args.out)
    out_root.mkdir(parents=True, exist_ok=True)

    links = yaml.safe_load(links_path.read_text(encoding="utf-8"))
    for category, urls in (links or {}).items():
        if urls:
            process_category(str(category), list(urls), api_key, out_root, args.format)

    print(f"\nDone! Downloaded datasets are in: {out_root}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
