# INFO8665 â€” See My Cash: Data Engineering, Training & Inference

End-to-end currency recognition project covering data engineering, model training, and a production-ready inference API with a React Native web front-end.

### What it does

1. Download source datasets automatically from Roboflow Universe.
2. Load + clean + normalize datasets into consistent local layouts.
3. Run basic EDA checks (counts, class balance, sanity visuals).
4. Train locally (YOLO detector + coin classifier + bill classifier + optional spoof guard).
5. (Optional) Run cloud training via SageMaker using discovered best hyperparameters.
6. Serve a **FastAPI inference API** with a multi-model pipeline (spoof guard -> detector -> bill reader / coin classifier).
7. Provide a **React Native (Expo) web UI** for live camera inference, history, and settings.

No hard-coded secrets belong in this repo. Copy `.env.example` to `.env` and keep real credentials there or in your shell environment.

## Quick start (Docker Compose)

> **Prerequisites:** Docker and Docker Compose v2+

From the repo root (`INFO8665/`):

```bash
# Create a local env file
cp .env.example .env

# Build and start the inference API + MLflow
docker compose up --build -d

# Verify the server is healthy
curl http://localhost:8080/api/health
```

### Accessing the application

| URL                                        | Description                                                                |
| ------------------------------------------ | -------------------------------------------------------------------------- |
| <http://localhost:8080>                    | **React Native (Expo) web app** â€” live camera inference, history, settings |
| <http://localhost:8080/rn>                 | Main web UI (static HTML dashboard)                                        |
| <http://localhost:8080/docs>               | Interactive Swagger / OpenAPI docs                                         |
| <http://localhost:8080/redoc>              | ReDoc API documentation                                                    |
| <http://localhost:8080/api/health>         | Health check (JSON)                                                        |
| <http://localhost:8080/api/pipeline/infer> | Pipeline inference endpoint (POST an image)                                |
| <http://localhost:5000>                    | MLflow tracking UI                                                         |

### Optional monitoring stack

```bash
docker compose --profile monitoring up -d
```

This starts Prometheus, Loki, Promtail, and Grafana using credentials sourced from `.env`.

### Running E2E tests

```bash
docker compose run --rm tests
```

This spins up a test container that waits for the API to be healthy, then runs the full pytest suite (17 tests covering health, models, pipeline, inference, and error handling).

### Secret scanning

```bash
gitleaks detect --source . --no-git --config .gitleaks.toml
```

### Stopping the service

```bash
docker compose down
```

## Where to start

- Data sources + download: `data-collection/README.md`
- Local processing + EDA steps: `documentation/local_data_workflow.md`
- Training (local + optional cloud): `training/README.md`
- Branching/promotion conventions: `documentation/workflow.md`

## Repo layout

| Directory              | Purpose                                                            |
| ---------------------- | ------------------------------------------------------------------ |
| `configs/`             | Label maps, universe links, and training configs                   |
| `scripts/`             | Numbered pipeline scripts (download â†’ train â†’ evaluate â†’ quantize) |
| `training/app/`        | **FastAPI inference API** (main.py, services, endpoints, schemas)  |
| `training/app/rn_app/` | **React Native (Expo) front-end** source + web build               |
| `training/models/`     | Trained model weights (detector, bill classifier, coin classifier, optional spoof guard) |
| `data-collection/`     | Dataset sources and download instructions                          |
| `documentation/`       | Workflow docs (local data workflow + branching)                    |
| `dev/`                 | Scratch entrypoints for local experiments                          |

### Key files

- `docker-compose.yml` â€” Compose config for the API + test runner
- `training/Dockerfile` â€” Inference API container (Python 3.11, CPU-only PyTorch)
- `training/app/main.py` â€” FastAPI application entry-point
- `training/app/requirements.txt` â€” Python dependencies for the API
- `training/app/tests/test_api.py` â€” E2E API test suite

## Docker (legacy data-pipeline image)

The root `Dockerfile` builds a data-pipeline image for dataset processing and smoke tests:

```bash
docker build -t info8665-local .
```

Run Sprint 0 smoke checks (no datasets required):

```bash
docker run --rm info8665-local python training/train_detector.py --smoke
docker run --rm info8665-local python training/eval_detector.py --smoke
docker run --rm info8665-local python training/coin_classifier/train_coin_classifier.py --smoke
```

Roboflow download (requires `ROBOFLOW_API_KEY` passed at runtime; never commit it):

```bash
docker run --rm -e ROBOFLOW_API_KEY="<your_key>" info8665-local python scripts/01_download_from_universe.py
```

## Storage and secrets

The inference API now supports two persistence modes for server-side inference history:

- `APP_STORAGE_BACKEND=local` writes JSONL history to `APP_LOCAL_STORAGE_PATH`
- `APP_STORAGE_BACKEND=database` writes history to Postgres using `DB_HOSTNAME`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, and `DB_PASSWORD`

Docker Compose now starts Postgres alongside the API and MLflow by default. The app still keeps a mounted local storage path at `outputs/app-data/` so you can switch back to local persistence without changing the container layout.

Secret resolution is centralized in the app and supports:

- Direct environment variables such as `DB_PASSWORD`
- File-based overrides such as `DB_PASSWORD_FILE`
- Mounted secret directories such as `/run/secrets/db_password`

Use `GET /api/storage/status` to confirm which backend is active and whether database credentials were supplied from env or file sources without exposing the secret values themselves.

