<!-- Task 76 — implemented for Sprint 0 by Oluwafemi Lawal -->

# Training Smoke Test (Sprint 0)

These scripts support a lightweight smoke mode that does not require ML dependencies. It validates that the training/eval pipeline scaffolding runs end-to-end and writes expected manifests/reports.

From the repo root:

```bash
python training/train_detector.py --smoke
python training/eval_detector.py --smoke
python training/coin_classifier/train_coin_classifier.py --smoke
python training/coin_classifier/eval_coin_classifier.py --smoke
python training/coin_classifier/infer_coin_classifier.py --smoke
```

Expected outputs (created/updated):

- `training/outputs/` (checkpoints + metrics)
- `training/manifests/` (run manifests)
- `training/reports/` (evaluation reports)
