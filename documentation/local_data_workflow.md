# Local Data Workflow (Download → Clean → EDA → Train)

This document describes the **local-first** data engineering loop used in this repo.

## 0) Data layout

- Raw/interim downloads: `data/interim/`
  - `banknotes/`, `coins/`, `confusers/`, `backgrounds/`
- Processed datasets (training-ready): `data/processed/`
  - `banknotes_merged/` — canonical YOLO dataset for banknote detector training
  - `negatives/` — deduped negative pool (confusers + backgrounds)
  - `bill_cutouts/` — ImageFolder-style RGBA cutouts for bill classifier training
  - `coin_domains/` — coin crop domains for coin classifier training

## 1) Download from Roboflow Universe (automatic)

Links are maintained in `configs/universe_links.yaml`.

Run the downloader (requires `ROBOFLOW_API_KEY` in your environment):

- `python scripts/01_download_from_universe.py --links configs/universe_links.yaml --out data/interim --format yolov8`

## 2) Clean + normalize banknotes into a canonical detector dataset

Goal: merge multiple Roboflow datasets into **one** YOLO dataset with consistent class names.

- Canonical label set: `configs/label_map.yaml`
- Merge + remap script: `scripts/02_merge_and_normalize_banknotes.py`

Command:

- `python scripts/02_merge_and_normalize_banknotes.py --in-root data/interim/banknotes --label-map configs/label_map.yaml --out data/processed/banknotes_merged`

Output:

- `data/processed/banknotes_merged/data.yaml`
- `data/processed/banknotes_merged/images/{train,val,test}`
- `data/processed/banknotes_merged/labels/{train,val,test}`

### (Optional) Unified money detector dataset (banknotes + coins)

If you want the detector to fire on **both banknotes and coins**, build a combined detector dataset:

- Canonical label set: `configs/label_map_money.yaml` (adds `COIN`)
- Merge + remap script: `scripts/02_merge_and_normalize_money.py`

Command:

- `python scripts/02_merge_and_normalize_money.py --banknotes-root data/interim/banknotes --coins-root data/interim/coins --label-map configs/label_map_money.yaml --out data/processed/money_merged`

Output:

- `data/processed/money_merged/data.yaml`
- `data/processed/money_merged/images/{train,val,test}`
- `data/processed/money_merged/labels/{train,val,test}`

## 3) Build a negative pool (confusers + backgrounds)

Goal: collect “things the detector should not fire on” and deduplicate near-identical images.

- Script: `scripts/03_build_negatives_pool.py`

Command:

- `python scripts/03_build_negatives_pool.py --confusers-root data/interim/confusers --backgrounds-root data/interim/backgrounds --out data/processed/negatives`

Output:

- `data/processed/negatives/images/*.jpg|png|...`

## 4) Build bill cutouts (ImageFolder-style)

Goal: convert detection bboxes into cropped RGBA cutouts suitable for a classifier.

- Script: `scripts/04_make_bill_cutouts.py`

Command:

- `python scripts/04_make_bill_cutouts.py --dataset data/processed/banknotes_merged --out data/processed/bill_cutouts`

Output:

- `data/processed/bill_cutouts/{train,val,test}/<class>/*.png`

## 5) Coin crops (domain build + augmentation)

Goal: build coin classifier training folders from YOLO coin datasets.

- Build crop domains from YOLO labels: `scripts/20_build_coin_crops_domains.py`
- Apply camera realism augmentation: `scripts/21_camera_realism_augment.py`

Typical flow:

1. Extract crops into two domains (synthetic vs real):

- `python scripts/20_build_coin_crops_domains.py --synth-yolo-root <PATH_TO_SYNTH_COIN_YOLO> --real-yolo-root <PATH_TO_REAL_COIN_YOLO>`

2. (Optional) Augment either domain:

- `python scripts/21_camera_realism_augment.py --input-dir data/processed/coin_domains/A_synth --output-dir data/processed/coin_domains/A_synth_aug --copies 1`

## 6) EDA (local checks)

Keep EDA lightweight and repeatable. Minimum checks:

- Counts per split: verify `train/val/test` exist and are non-empty.
- Class balance: verify class distribution is plausible (no missing classes).
- Visual sanity: open a handful of images per class and confirm labels/crops look correct.
- Leakage check: ensure the same image isn’t duplicated across splits (if applicable).

Quick count snippet (runs from repo root):

- `python -c "from pathlib import Path; p=Path('data/processed/banknotes_merged/images');\
print({s: len(list((p/s).glob('*'))) for s in ['train','val','test']})"`

Dataset summary script (counts + class balance):

- `python scripts/06_eda_banknotes_summary.py --dataset data/processed/banknotes_merged --out-json outputs/reports/banknotes_eda_summary.json`

## 7) Training inputs (what downstream code expects)

- Detector training expects: `data/processed/banknotes_merged/data.yaml`
- Bill classifier expects: `data/processed/bill_cutouts/{train,val,test}/` (ImageFolder)
- Confusers pressure tests typically use: `data/processed/negatives/images/`

## 8) Export + quantized artifacts (saved locally)

- Detector ONNX export (optional INT8 calibrated): `scripts/11_export_detector_onnx.py`
- Classifier quantized TorchScript (dynamic INT8 Linear): `scripts/26_quantize_classifier_torchscript.py`
