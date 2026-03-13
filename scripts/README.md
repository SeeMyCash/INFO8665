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
12. `40_download_sagemaker_champions.py` (optional AWS-only utility; requires `boto3`)

Local optimization knobs (new defaults are local-friendly):

- Detector (`10_train_detector.py`): `--device auto`, `--workers -1`, `--cache auto`, `--patience`, `--lr0`, `--lrf`, `--mixup`, `--copy-paste`, `--mosaic`.
- Classifiers (`22_train_coin_classifier.py`, `24_train_bill_classifier.py`): auto device/workers, AMP on CUDA, cosine scheduler, early stopping, imbalance options via `--weighted-sampler` and `--class-weighted-loss`.

Secrets:

- Roboflow API key must be provided via `ROBOFLOW_API_KEY` environment variable.

Notes:

- AWS/SageMaker scripts are optional. Local training does not require AWS credentials.
