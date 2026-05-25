# Scripts

These are the standalone **local-first** pipeline scripts for the INFO8665 repo.

Typical order:

1. `01_download_from_universe.py`
2. `02_merge_and_normalize_banknotes.py`
3. `06_eda_banknotes_summary.py`
4. `03_build_negatives_pool.py`
5. `04_make_bill_cutouts.py`
6. `10_train_detector.py`
7. `11_export_detector_onnx.py` (optional ONNX / INT8)
8. `20_build_coin_crops_domains.py` + `21_camera_realism_augment.py`
9. `22_train_coin_classifier.py` + `23_eval_coin_classifier.py`
10. `24_train_bill_classifier.py` + `25_eval_bill_classifier.py`
11. `26_quantize_classifier_torchscript.py` (optional quantized artifact)
12. `28_train_spoof_guard.py` + `29_eval_spoof_guard.py` (optional pre-detector spoof safety model)
13. `30_prepare_screen_dataset_from_coco128.py` (builds a single-class `screen` YOLO dataset)
14. `31_submit_sagemaker_screen_yolo.py` (uploads dataset + submits SageMaker YOLO fine-tune)
15. `32_expand_screen_dataset_coco2017.py` (expands screen dataset using COCO 2017 positives + sampled negatives)
16. `40_download_sagemaker_champions.py` (optional AWS-only utility; requires `boto3`)
17. `41_import_sagemaker_runs_to_mlflow.py` (imports historical SageMaker jobs into MLflow)

Local optimization knobs (new defaults are local-friendly):

- Detector (`10_train_detector.py`): `--device auto`, `--workers -1`, `--cache auto`, `--patience`, `--lr0`, `--lrf`, `--mixup`, `--copy-paste`, `--mosaic`.
- Classifiers (`22_train_coin_classifier.py`, `24_train_bill_classifier.py`): auto device/workers, AMP on CUDA, cosine scheduler, early stopping, imbalance options via `--weighted-sampler` and `--class-weighted-loss`.
- Spoof guard (`28_train_spoof_guard.py`): binary classifier (`real` vs `spoof`) with transfer learning, optional ImageNet normalization metadata, and weighted sampling for skewed datasets.
- Screen detector (AWS path): use `30_prepare_screen_dataset_from_coco128.py` then `31_submit_sagemaker_screen_yolo.py`.

Secrets:

- Copy `.env.example` to `.env` and keep secrets there or in your shell environment.
- Roboflow API key is read from `ROBOFLOW_API_KEY`.
- SageMaker submission defaults are read from `SAGEMAKER_ROLE_ARN`, `SAGEMAKER_BUCKET`, and related `SAGEMAKER_*` variables.

Notes:

- AWS/SageMaker scripts are optional. Local training does not require AWS credentials.
- Train/eval scripts support `--mlflow-experiment`, `--mlflow-run-name`, and `--disable-mlflow`.
