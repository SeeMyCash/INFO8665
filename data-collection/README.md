# Data Collection (Local)

This project pulls its raw datasets from **Roboflow Universe** and stores them locally under `data/interim/`.

Source of truth:

- Roboflow Universe links: `configs/universe_links.yaml`
- Downloader script: `scripts/01_download_from_universe.py`

## Datasets

These are the Roboflow Universe datasets currently used.

Roboflow Universe datasets (from `configs/universe_links.yaml`, downloaded via `scripts/01_download_from_universe.py`):

- banknotes:
  - https://universe.roboflow.com/object-detection-ykbxg/testamp
  - https://universe.roboflow.com/indian-currency-detection/cad1
  - https://universe.roboflow.com/cvproject-mun/money-and-coins
  - https://universe.roboflow.com/canada-currency/canada-currency
  - https://universe.roboflow.com/jefferson-workplace/canada-10
- coins:
  - https://universe.roboflow.com/ryan-hu-j7q6o/canadian-coins
  - https://universe.roboflow.com/nixart-dgty6/candian-coins-detector
- confusers:
  - https://universe.roboflow.com/roboflow-100/receipts-dy2wq
  - https://universe.roboflow.com/first-9kwz3/business-card-sg7cv
  - https://universe.roboflow.com/christmas-lottery-jzx46/lottery-ticket-number-finder
  - https://universe.roboflow.com/ccscanner/credit_card_detection-pdthb
- backgrounds:
  - https://universe.roboflow.com/texture-dataset/textures_w_masks

## Download

Prereq: set your Roboflow API key via environment variable (do not commit it to the repo):

- PowerShell:
  - `$env:ROBOFLOW_API_KEY = "<your_key>"`
- bash:
  - `export ROBOFLOW_API_KEY="<your_key>"`

Then from the repo root:

- `python scripts/01_download_from_universe.py --links configs/universe_links.yaml --out data/interim --format yolov8`

Outputs:

- `data/interim/<category>/<workspace>__<project>__v<version>/...`

Notes:

- The downloader skips a dataset if it detects an existing downloaded folder for that workspace/project.
- Treat `data/interim/` as raw-ish inputs (not curated/normalized yet). Normalization happens in the processing step.
