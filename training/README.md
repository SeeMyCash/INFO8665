# Training (Local-first, Optional Cloud)

This repo supports training locally for iteration speed, with an optional cloud path when you want scale + reproducible, auditable runs.

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

This INFO8665 repo copy is intended to be shareable and local-first, so SageMaker orchestration is not duplicated here.

If you add a cloud training path later, keep it configuration-driven (runtime files + env vars) and never embed credentials or account identifiers in code.

## Download trained champions (AWS)

If you already trained “champion” models in SageMaker, you can download the `model.tar.gz` artifacts by _TrainingJob name_ and save them under `outputs/models/`.

Run from the INFO8665 repo root:

- `python scripts/40_download_sagemaker_champions.py --region us-east-1 --job <TRAINING_JOB_NAME>`

This writes:

- `outputs/models/aws_champions/<TRAINING_JOB_NAME>/model.tar.gz`
- `outputs/models/<TRAINING_JOB_NAME>__best.pt` (if present)
- `outputs/models/<TRAINING_JOB_NAME>__model.pt` (if present)

## Promotion / “minimum proof” comparisons

To compare an old vs new champion on frozen packs (objective metrics + confusers + latency/size proxies):

Promotion comparisons are project-specific and are not duplicated into this standalone repo copy.
