# ML Service Contracts

This repo models each selected ML use case as a lifecycle-aligned pipeline with explicit service contracts for:

1. Data Collection / Ingestion
2. EDA / Data Profiling
3. Preprocessing / Feature Engineering
4. Training
5. Validation / Evaluation
6. Model Serving / Deployment
7. Integration
8. Monitoring / Maintenance / Retraining

The contract catalog is exposed through the API:

- `GET /api/mlops/use-cases`
- `GET /api/mlops/use-cases/{use_case_id}`
- `GET /api/mlops/use-cases/{use_case_id}/contracts/{stage}`

## Modeled ML use cases

### Money Detection

- Ingestion: `scripts/01_download_from_universe.py`
- EDA: `scripts/06_eda_banknotes_summary.py`
- Preprocessing: `scripts/02_merge_and_normalize_money.py`, `scripts/03_build_negatives_pool.py`
- Training: `scripts/10_train_detector.py`
- Validation: `training/eval_detector.py`
- Serving: `POST /api/pipeline/infer`
- Integration: web + React Native inference flows
- Monitoring: `/api/storage/history`, `/metrics`, MLflow tracking

### Bill Classification

- Ingestion: `scripts/01_download_from_universe.py`
- EDA: workflow checks documented in `documentation/local_data_workflow.md`
- Preprocessing: `scripts/04_make_bill_cutouts.py`
- Training: `scripts/24_train_bill_classifier.py`
- Validation: `scripts/25_eval_bill_classifier.py`
- Serving: `POST /api/pipeline/infer`, `POST /api/infer/`
- Integration: app inference and history screens
- Monitoring: storage history, Prometheus metrics, MLflow runs

### Coin Classification

- Ingestion: `scripts/01_download_from_universe.py`
- EDA: workflow checks plus domain balance review
- Preprocessing: `scripts/20_build_coin_crops_domains.py`, `scripts/21_camera_realism_augment.py`
- Training: `scripts/22_train_coin_classifier.py`
- Validation: `scripts/23_eval_coin_classifier.py`
- Serving: `POST /api/pipeline/infer`, `POST /api/infer/`
- Integration: app inference and history screens
- Monitoring: storage history, Prometheus metrics, MLflow runs

### Screen Spoof Detection

- Ingestion: `scripts/30_prepare_screen_dataset_from_coco128.py`, `scripts/32_expand_screen_dataset_coco2017.py`
- EDA: dataset balance and quality review documented in the workflow/training docs
- Preprocessing: screen dataset preparation scripts
- Training: `scripts/28_train_spoof_guard.py`, optional SageMaker submission via `scripts/31_submit_sagemaker_screen_yolo.py`
- Validation: `scripts/29_eval_spoof_guard.py`
- Serving: `POST /api/pipeline/infer`
- Integration: app settings and spoof warning flow
- Monitoring: storage history, Prometheus metrics, MLflow and SageMaker lineage

## Submission interpretation

Each use case satisfies the minimum requirement because it includes at least:

- ingestion
- eda
- preprocessing
- training
- validation
- serving

The project also includes the stronger MLOps interpretation by modeling:

- integration
- monitoring / maintenance / retraining
