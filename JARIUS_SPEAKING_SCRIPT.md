# Jarius Bedward — Speaking Script

## SeeMyCash: My Technical Contributions

---

### Opening

Hi everyone, I'm Jarius. I'm going to walk through what I built on the SeeMyCash project, covering everything from data engineering and model training infrastructure to the full containerized deployment stack that serves our inference API.

---

### Sprint 0 — Data Engineering & Training Foundation

#### YOLO26 Training Environment Configuration

My first major contribution was setting up the reproducible training environment for our YOLO26 object detector. I created the configuration files that define the entire training pipeline. In `detector_config.json`, I set the seed to 1337 for reproducibility, defined our three detection classes — banknote, coin, and confuser — and tied the config to our sprint and project identifiers.

I also built the `universe_links.yaml` registry, which is the central manifest of all our Roboflow Universe dataset sources. It references five banknote datasets, two coin datasets, four confuser datasets covering receipts, business cards, lottery tickets, and credit cards, plus a background texture dataset. This registry is what our download scripts use to pull training data consistently.

For the coin classifier specifically, I configured a separate `coin_classifier_config.json` with seed 2026 and the coin denomination classes — penny and nickel as the starting point.

#### Coin Classification Submodule

I wrote `scripts/22_train_coin_classifier.py`, which is roughly 300 lines of PyTorch training code. The architecture supports two backbones — MobileNetV3 Small and ResNet18 — both pretrained on ImageNet. I chose MobileNetV3 Small as the lightweight option for potential on-device deployment, and ResNet18 as the more accurate cloud option.

The training pipeline uses AdamW optimizer with a learning rate of 3×10⁻⁴ and weight decay of 1×10⁻⁴. I implemented CosineAnnealingLR scheduling with a minimum learning rate of 10⁻⁶, and early stopping with patience of 8 epochs and a minimum delta of 10⁻⁴. For mixed-precision training on CUDA, I used `torch.cuda.amp.GradScaler`.

To handle class imbalance — since some denominations are rarer in our dataset — I implemented `WeightedRandomSampler` combined with class-weighted `CrossEntropyLoss` with label smoothing of 0.05. The data augmentation pipeline includes `GaussianBlur` with kernel size 3, `ColorJitter` tuned for realistic lighting variation, `RandomHorizontalFlip`, and `RandomAffine` with 14 degrees rotation and slight translation and scaling.

I also wrote the matching evaluation script, `23_eval_coin_classifier.py`, which includes the `build_label_remap()` function that handles mismatches between dataset and model class indices — this was a subtle but critical piece because without it, the confusion matrix would silently report wrong metrics.

#### Bill Cutouts and Quality Filtering

I authored `scripts/04_make_bill_cutouts.py`, which generates high-quality training crops from our detection dataset. This isn't a simple crop — it produces RGBA PNG outputs with intelligent alpha channels. The script first attempts GrabCut segmentation using OpenCV's `cv2.grabCut` with 3 iterations, and validates the result by checking that the foreground ratio falls between 20% and 95%. If GrabCut fails, it falls back to a 5-pixel feathered soft-edge alpha.

The quality filtering is important — I reject any crop smaller than 96 pixels, anything with a Laplacian variance below 30 (which catches blurry crops using `cv2.Laplacian` on the grayscale), and anything with an aspect ratio above 5:1 which would indicate a malformed bounding box. The output goes into `data/processed/bill_cutouts` organized by train/val/test splits and class subdirectories.

---

### Sprint 1 — Negatives Pool

I built the negatives, confusers, and background pool with `scripts/03_build_negatives_pool.py`. The key challenge here was deduplication — when you pull from multiple sources, you get near-duplicate images that would inflate the training set without adding real variety. I solved this using perceptual hashing via the `imagehash` library, computing `phash` with a hash size of 8 and rejecting any image within a Hamming distance of 5 from an existing image. This gives us a clean, diverse pool of non-currency images that the detector needs to learn to ignore.

---

### Sprint 4 — Containerization, Spoof Guard, and UI

This was my biggest sprint. I built the entire containerized deployment stack.

#### Inference API Dockerfile

The `training/Dockerfile` uses `python:3.11-slim` as the base. A key decision was installing CPU-only PyTorch from `https://download.pytorch.org/whl/cpu` — this avoids pulling about 2 GB of CUDA libraries that aren't needed in our inference container. I install the minimum system dependencies for OpenCV headless — `libgl1`, `libglib2.0-0`, and `curl` for health checks.

The layer ordering is deliberate — I copy `requirements.txt` first and install dependencies before copying application code, so code changes don't invalidate the expensive pip install layer. Then I copy in the app code, model weights, static assets, the Expo web build from `app/rn_app/dist/` into `app/static/rn/`, and the pipeline model pin files.

The health check uses `curl -f http://localhost:8080/api/health` with a 30-second start period to give the model time to load, then 10-second intervals with 3 retries. The container serves via uvicorn on port 8080.

#### Docker Compose Stack

The `docker-compose.yml` defines 7 services across 3 profiles. By default, you get the API, Postgres 16 Alpine, and MLflow. The monitoring profile adds Prometheus, Loki, Promtail, and Grafana. The test profile runs our E2E suite.

Every environment variable uses the `${VAR:-default}` templating pattern so nothing is hardcoded. The Postgres service has a proper health check using `pg_isready`, and both the API and test services depend on the database being healthy via `service_healthy` conditions. This ensures the startup order is correct — database first, then API, then tests.

I set up three named volumes — `postgres-data`, `grafana-data`, and `loki-data` — so data persists across container restarts.

#### SageMaker Screen-Detector Training

I wrote `scripts/31_submit_sagemaker_screen_yolo.py` to submit YOLO training jobs to AWS SageMaker. The script uses the `sagemaker.pytorch.PyTorch` estimator with PyTorch 2.2, Python 3.10, targeting `ml.m5.xlarge` instances. It uploads the training dataset to S3 using `_upload_dir_to_s3()`, configures hyperparameters — 20 epochs, image size 640, batch size 16 with `yolo11n.pt` base weights — and submits the job with MLflow tracking so we have a complete audit trail of cloud training runs.

#### Spoof Guard Model Registry

I integrated spoof guard model support into the `model_manager.py` service. The `is_spoof_guard_name()` function identifies guard models by looking for keywords like "spoof", "antispoof", "liveness", or "screen-guard" in the filename. I added the `pipeline_spoof_guard_model.txt` pin file mechanism so the pipeline auto-discovers and loads the correct guard model on startup, using the same `pick_pipeline_preferred_or_latest()` pattern as our other model types.

#### UI Route Architecture

I restructured the FastAPI routing so the React Native Expo SPA is served at the root `/` path, while the legacy HTML interface moved to `/rn`. The catch-all route `/{rest_of_path:path}` serves the SPA's `index.html` for all paths except reserved prefixes — `api`, `metrics`, `docs`, `redoc`, `openapi.json`, `static`, `_expo`, `assets`, and `rn`. This lets React Router handle client-side navigation while API routes pass through cleanly.

I also implemented `_default_rn_dir()` in the config module, which auto-detects the RN build directory — preferring `app/static/rn/` in Docker (where the Dockerfile copies the build) and falling back to `app/rn_app/dist/` for local development.

---

### Sprint 5 — Model Refresh & Observability Stack

#### Champion Model Replacement

I replaced the model weights with our Phase 2 AMT (Automated Model Training) outputs. The pipeline pin files now reference:
- Detector: `phase2-amt-det-20260301-130911-008-900e563f__best.pt`
- Coin classifier: `p2amt-coin-260301215339-001-819c769d__model.pt`
- Bill classifier: `p2amt-bill-260301130911-003-7404d154__model.pt`
- Spoof guard: `screen-guard-detector-20260316-064336__model.pt`

The `pick_pipeline_preferred_or_latest()` function reads these pin files on startup and selects the matching model from the available candidates, with date-based parsing supporting three formats — `YYYYMMDD-HHMMSS`, `YYMMDDHHMMSS`, and `YYYYMMDD`.

#### Prometheus, Loki, and Grafana Stack

I added the full monitoring stack behind the `monitoring` Docker Compose profile. Prometheus scrapes the API's `/metrics` endpoint every 15 seconds. Loki collects container logs via Promtail, which mounts `/var/lib/docker/containers` read-only. Grafana comes pre-provisioned with both Prometheus and Loki datasources and the custom dashboards Cemil created.

The key decisions were using Loki 2.9.8 specifically for stability, keeping monitoring behind a profile so `docker compose up` doesn't start 4 extra containers by default, and pre-provisioning everything so there's zero manual setup after `docker compose --profile monitoring up -d`.

---

### Sprint 6 — MLflow & Hardening

#### MLflow Tracking Server

I created `monitoring/mlflow/Dockerfile` with Python 3.11-slim and MLflow 3.10.1. The Compose service runs `mlflow server` with a SQLite backend store and file-based artifact root, both persisted to `./outputs/mlflow` via volume mount. It's accessible at port 5000 by default but configurable via `${MLFLOW_PORT:-5000}`.

#### Docker Compose Hardening

I hardened the entire Compose configuration with consistent `${VAR:-default}` templating, added the Postgres 16 Alpine service with health checks, reorganized services behind profiles, and established proper dependency chains with `service_healthy` conditions. I also created `.env.example` documenting all configurable variables.

---

### Sprint 7 — MLOps Service Contract Catalog

#### Contract Catalog

I built `mlops_catalog.py` — a 463-line service module that models each ML use case as a lifecycle-aligned pipeline. The catalog defines four use cases — money detection, bill classification, coin classification, and screen spoof detection — each with contracts for up to 8 lifecycle stages. Every contract includes a service name, summary, implementation type (script, endpoint, or app), and concrete `implementation_refs` pointing to actual files in the repo.

The `_contract()` factory function generates the standardized structure, and `_use_case_payload()` computes the `minimum_contract_requirement_met` flag by checking that at least 6 required stages — ingestion, EDA, preprocessing, training, validation, and serving — are present.

#### Pydantic Schemas & API Endpoints

I added four response models — `MlLifecycleContractResponse`, `MlUseCaseSummaryResponse`, `MlUseCaseDetailResponse` (which inherits from the summary), and `MlUseCaseListResponse`. Then I created 3 GET endpoints in `mlops.py`: `/use-cases` for the list, `/use-cases/{use_case_id}` for detail, and `/use-cases/{use_case_id}/contracts/{stage}` for individual contracts. All endpoints use typed response models for OpenAPI docs and return 404 with `ErrorResponse` for unknown resources.

Finally, I wired the router into `router.py` with prefix `/mlops` and the `ML Service Contracts` tag, so the full path resolves as `/api/mlops/use-cases`.

---

### Closing

Across all sprints, my work spans the full stack — from data engineering scripts that prepare training data, to model training infrastructure, to the complete Docker deployment stack with health checks, monitoring, and MLflow tracking, to the API endpoints and schemas that expose our ML lifecycle contracts. Thank you.
