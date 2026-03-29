# Training (Local-first, Optional Cloud)

This repo supports training locally for iteration speed, with an optional cloud path when you want scale + reproducible, auditable runs.

## Experiment tracking

All primary train/eval scripts now support MLflow out of the box.

- Start the local tracking server with `docker compose up -d mlflow`
- Point local scripts at it with `MLFLOW_TRACKING_URI=http://localhost:5000` in `.env`
- Override per run with `--mlflow-experiment`, `--mlflow-run-name`, or skip logging with `--disable-mlflow`

## Local training

### Detector (YOLO)

- Script: `scripts/10_train_detector.py`
  - Export (ONNX / optional INT8): `scripts/11_export_detector_onnx.py`

Example:

- `python scripts/10_train_detector.py --data data/processed/banknotes_merged/data.yaml --imgsz 640 --epochs 25 --batch 16 --run-name cad_yolo_local`

Outputs (Ultralytics default under the configured project/name):

- `outputs/models/<run-name>/...`

### Coin classifier

- Train: `scripts/22_train_coin_classifier.py`
- Evaluate: `scripts/23_eval_coin_classifier.py`

Optional quantized artifact (CPU-friendly TorchScript):

- `python scripts/26_quantize_classifier_torchscript.py --checkpoint outputs/models/coin_classifier_local.pt --out outputs/models/coin_classifier_quantized.ts.pt --meta-out outputs/models/coin_classifier_quantized.meta.json`

### Bill classifier

- Train: `scripts/24_train_bill_classifier.py`
- Evaluate: `scripts/25_eval_bill_classifier.py`

Example:

- `python scripts/24_train_bill_classifier.py --train-dir data/processed/bill_cutouts/train --val-dir data/processed/bill_cutouts/val --output outputs/models/bill_classifier_local.pt`
- `python scripts/25_eval_bill_classifier.py --model outputs/models/bill_classifier_local.pt --test-dir data/processed/bill_cutouts/test --report-out outputs/reports/bill_classifier_eval_local.json`

Optional quantized artifact:

- `python scripts/26_quantize_classifier_torchscript.py --checkpoint outputs/models/bill_classifier_local.pt --out outputs/models/bill_classifier_quantized.ts.pt --meta-out outputs/models/bill_classifier_quantized.meta.json`

### Spoof guard classifier (pre-detector screen attack defense)

Train a binary classifier with classes like `real` and `spoof`:

- `python scripts/28_train_spoof_guard.py --train-dir data/processed/spoof_guard/train --val-dir data/processed/spoof_guard/val --output outputs/models/spoof-guard-20260315__model.pt`

Evaluate with a deployment threshold:

- `python scripts/29_eval_spoof_guard.py --model outputs/models/spoof-guard-20260315__model.pt --test-dir data/processed/spoof_guard/test --threshold 0.80 --report-out outputs/reports/spoof_guard_eval_local.json`

Deploy by copying/renaming into `training/models/` with a classifier-style name (for auto-discovery):

- `spoof-guard-<run-tag>__model.pt`

Optional pin file (for explicit pipeline selection):

- `pipeline_spoof_guard_model.txt`

## Detector evaluation (bills + coins)

Run objective detector validation on the unified money dataset:

- `python -c "from ultralytics import YOLO; m=YOLO('outputs/models/champ-detector-20260224-185203__model.pt'); r=m.val(data='..\\ml\\data\\processed\\money_merged\\data.yaml', split='test', imgsz=640, verbose=False); print(r.box.map50, r.box.map, r.box.mp, r.box.mr)"`

Latest saved report:

- `outputs/reports/money_detector_eval_1771966411.json`

## Quantized model artifacts in INFO8665

INFO8665 now contains all three quantized pipeline artifacts:

- Detector (INT8 ONNX): `outputs/models/detector_quantized_int8.onnx`
- Coin classifier (dynamic INT8 TorchScript): `outputs/models/coin_classifier_quantized.ts.pt`
- Bill classifier (dynamic INT8 TorchScript): `outputs/models/bill_classifier_quantized.ts.pt`

Detector quantization command (fallback path):

- `python scripts/27_quantize_detector_onnx_int8.py --weights outputs/models/champ-detector-20260224-185203__model.pt --onnx-out outputs/models/detector.onnx --int8-out outputs/models/detector_quantized_int8.onnx`

## Optional cloud training (SageMaker)

Screen detector fine-tune path now included:

- Build dataset: `python scripts/30_prepare_screen_dataset_from_coco128.py`
- Submit training: `python scripts/31_submit_sagemaker_screen_yolo.py --instance-type ml.m5.xlarge`

The submission script now reads `SAGEMAKER_ROLE_ARN`, `SAGEMAKER_BUCKET`, and the screen dataset/output prefixes from `.env` by default.

Latest evaluated screen-guard detector:

- Model: `training/models/screen-guard-detector-20260316-064336__model.pt`
- SageMaker job: `screen-yolo-ft-20260316-064336-2026-03-16-10-43-36-582`
- Metrics (validation):
  - `precision`: `0.768`
  - `recall`: `0.493`
  - `mAP@0.50`: `0.591`
  - `mAP@0.50:0.95`: `0.429`
- Report: `training/reports/screen_guard_detector_report.json`

Notes:

- `31_submit_sagemaker_screen_yolo.py` uploads the dataset and submits a PyTorch Script Mode job.
- The SageMaker role needs `s3:ListBucket/GetObject` on dataset prefix and `s3:PutObject` on output prefix.

## Download trained champions (AWS)

If you already trained “champion” models in SageMaker, you can download the `model.tar.gz` artifacts by _TrainingJob name_ and save them under `outputs/models/`.

Run from the INFO8665 repo root:

- `python scripts/40_download_sagemaker_champions.py --region us-east-1 --job <TRAINING_JOB_NAME>`

This writes:

- `outputs/models/aws_champions/<TRAINING_JOB_NAME>/model.tar.gz`
- `outputs/models/<TRAINING_JOB_NAME>__best.pt` (if present)
- `outputs/models/<TRAINING_JOB_NAME>__model.pt` (if present)

To import historical SageMaker training jobs into MLflow:

- `python scripts/41_import_sagemaker_runs_to_mlflow.py`

## Promotion / “minimum proof” comparisons

To compare an old vs new champion on frozen packs (objective metrics + confusers + latency/size proxies):

Promotion comparisons are project-specific and are not duplicated into this standalone repo copy.

## Local inference app defaults

`training/app/main.py` now runs local-first by default.

- It prioritizes local model files in `training/models`.
- It tries AWS/S3 refresh when AWS is available/configured.
- If AWS is unavailable, it falls back to local models automatically.
- You can force-disable AWS attempts with `ENABLE_AWS_MODEL_SYNC=0`.
- AWS refresh needs `boto3` (`pip install boto3`).
- Pre-detector spoof checks are disabled by default (`SPOOF_GUARD_ENABLED=0`).
- RN app users can manually enable it in Settings -> Security -> Screen Spoof Protection.
- You can tune behavior with `SPOOF_GUARD_THRESHOLD`, `SPOOF_GUARD_HEURISTIC_ONLY_THRESHOLD`, and `SPOOF_GUARD_BLOCK_ON_DETECT`.

## Inference storage backends

The FastAPI app now keeps optional server-side inference history and can run in either of these modes:

- `APP_STORAGE_BACKEND=local`: append history to `APP_LOCAL_STORAGE_PATH`
- `APP_STORAGE_BACKEND=database`: persist history to the configured relational database

For the database mode, the main settings are:

- `DB_HOSTNAME`
- `DB_PORT`
- `DB_NAME`
- `DB_USERNAME`
- `DB_PASSWORD`
- `DB_SSLMODE`

Secrets can come from direct env vars, `*_FILE` overrides such as `DB_PASSWORD_FILE`, or mounted secret directories like `/run/secrets/db_password`. The API exposes sanitized diagnostics at `/api/storage/status` and recent records at `/api/storage/history`.
