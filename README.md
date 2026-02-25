# INFO8665 — Local Data Engineering + Training

This folder documents a local-first data engineering workflow:

1. Download source datasets automatically from Roboflow Universe.
2. Load + clean + normalize datasets into consistent local layouts.
3. Run basic EDA checks (counts, class balance, sanity visuals).
4. Train locally (detector + coin classifier).
5. (Optional) Run cloud training using the discovered best hyperparameters.

No hard-coded secrets belong in this repo. For Roboflow downloads, set `ROBOFLOW_API_KEY` in your environment.

## Where to start

- Data sources + download: `data-collection/README.md`
- Local processing + EDA steps: `documentation/local_data_workflow.md`
- Training (local + optional cloud): `training/README.md`
- Branching/promotion conventions: `documentation/workflow.md`

For the standalone INFO8665 repo structure:

- Configs: `configs/`
- Scripts: `scripts/`
- Local data (ignored by git): `data/`
- Local outputs (ignored by git): `outputs/`

## Repo layout (within INFO8665)

- `data-collection/` — dataset sources and how they are downloaded locally
- `documentation/` — workflow docs (local data workflow + branching)
- `training/` — training/eval instructions (local-first) + optional cloud path
- `dev/` — scratch entrypoints for local experiments
- `orchestrator.ipynb` — legacy notebook (branching workflow automation)

## Docker

Build (from inside this repo folder):

- `docker build -t info8665-local .`

Run the Sprint0 smoke checks (no datasets required):

- `docker run --rm info8665-local python training/train_detector.py --smoke`
- `docker run --rm info8665-local python training/eval_detector.py --smoke`
- `docker run --rm info8665-local python training/coin_classifier/train_coin_classifier.py --smoke`

Roboflow download (requires `ROBOFLOW_API_KEY` passed at runtime; never commit it):

- `docker run --rm -e ROBOFLOW_API_KEY="<your_key>" info8665-local python scripts/01_download_from_universe.py`
