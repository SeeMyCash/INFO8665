"""
Catalog of ML lifecycle service contracts for each project use case.

These contracts make the course-required pipeline explicit in API form while
pointing back to the concrete scripts, endpoints, and app integrations that
implement each stage in this repo.
"""

from __future__ import annotations

from copy import deepcopy
from typing import Any, Dict, List


REQUIRED_STAGES = (
    "ingestion",
    "eda",
    "preprocessing",
    "training",
    "validation",
    "serving",
)


def _contract(
    use_case: str,
    stage: str,
    service_name: str,
    summary: str,
    implementation_type: str,
    implementation_refs: List[str],
    inputs: List[str],
    outputs: List[str],
) -> Dict[str, Any]:
    return {
        "contract_id": f"{use_case}:{stage}",
        "service_name": service_name,
        "lifecycle_stage": stage,
        "summary": summary,
        "api_contract_path": f"/api/mlops/use-cases/{use_case}/contracts/{stage}",
        "implementation_type": implementation_type,
        "implementation_refs": implementation_refs,
        "inputs": inputs,
        "outputs": outputs,
    }


USE_CASES: Dict[str, Dict[str, Any]] = {
    "money_detection": {
        "display_name": "Money Detection",
        "problem_type": "computer_vision_object_detection",
        "description": "Detects bills and coins in a frame before downstream denomination classification.",
        "contracts": [
            _contract(
                "money_detection",
                "ingestion",
                "Money Detector Ingestion Service",
                "Pulls raw banknote and coin datasets from Roboflow Universe into the local project workspace.",
                "script",
                ["scripts/01_download_from_universe.py", "documentation/local_data_workflow.md"],
                ["Roboflow links config", "ROBOFLOW_API_KEY"],
                ["Downloaded YOLO datasets in data/interim/"],
            ),
            _contract(
                "money_detection",
                "eda",
                "Money Detector EDA Service",
                "Profiles split counts, class balance, and basic labeling quality for the detector dataset.",
                "script",
                ["scripts/06_eda_banknotes_summary.py", "documentation/local_data_workflow.md"],
                ["Processed detector dataset path"],
                ["EDA summary JSON report", "Class distribution checks"],
            ),
            _contract(
                "money_detection",
                "preprocessing",
                "Money Detector Preprocessing Service",
                "Normalizes labels into a canonical detector dataset and optionally builds a negatives pool.",
                "script",
                [
                    "scripts/02_merge_and_normalize_money.py",
                    "scripts/03_build_negatives_pool.py",
                    "configs/label_map_money.yaml",
                ],
                ["Raw banknote datasets", "Raw coin datasets", "Optional confuser/background datasets"],
                ["data/processed/money_merged", "data/processed/negatives"],
            ),
            _contract(
                "money_detection",
                "training",
                "Money Detector Training Service",
                "Trains the YOLO detector and logs runs to MLflow when tracking is enabled.",
                "script",
                ["scripts/10_train_detector.py", "scripts/_tracking.py"],
                ["Processed money detector dataset", "Training hyperparameters"],
                ["Detector weights", "Training metrics", "MLflow run"],
            ),
            _contract(
                "money_detection",
                "validation",
                "Money Detector Validation Service",
                "Evaluates the detector on held-out data using objective detection metrics.",
                "script",
                ["training/eval_detector.py", "training/detector/eval.py"],
                ["Trained detector weights", "Validation/test split"],
                ["Precision/recall/mAP metrics", "Evaluation summary"],
            ),
            _contract(
                "money_detection",
                "serving",
                "Money Detector Serving Service",
                "Publishes the detector as part of the inference API used for online predictions.",
                "api",
                ["POST /api/pipeline/infer", "GET /api/pipeline/status", "GET /api/models/"],
                ["Uploaded image frame"],
                ["Detector predictions embedded in pipeline response"],
            ),
            _contract(
                "money_detection",
                "integration",
                "Money Detector Integration Service",
                "Connects detector predictions to the web and React Native app flows used by the product.",
                "application",
                [
                    "training/app/rn_app/screens/InferenceScreen.tsx",
                    "training/app/static/app.js",
                    "POST /api/pipeline/infer",
                ],
                ["Detector API response", "Application request context"],
                ["User-visible money localization workflow"],
            ),
            _contract(
                "money_detection",
                "monitoring",
                "Money Detector Monitoring Service",
                "Tracks inference history, operational metrics, and experiment lineage for retraining decisions.",
                "api",
                [
                    "GET /api/storage/history",
                    "GET /api/storage/status",
                    "GET /metrics",
                    "scripts/_tracking.py",
                    "scripts/41_import_sagemaker_runs_to_mlflow.py",
                ],
                ["Inference events", "Prediction metadata", "Experiment metrics"],
                ["Stored history", "Prometheus metrics", "MLflow runs"],
            ),
        ],
    },
    "bill_classification": {
        "display_name": "Bill Classification",
        "problem_type": "computer_vision_multiclass_classification",
        "description": "Classifies cropped banknotes into denominations after detection.",
        "contracts": [
            _contract(
                "bill_classification",
                "ingestion",
                "Bill Classifier Ingestion Service",
                "Pulls source banknote datasets that will later be turned into denomination cutouts.",
                "script",
                ["scripts/01_download_from_universe.py", "documentation/local_data_workflow.md"],
                ["Roboflow links config", "ROBOFLOW_API_KEY"],
                ["Downloaded banknote datasets"],
            ),
            _contract(
                "bill_classification",
                "eda",
                "Bill Classifier EDA Service",
                "Checks split coverage, class balance, and crop quality before bill classifier training.",
                "documentation",
                ["documentation/local_data_workflow.md", "scripts/06_eda_banknotes_summary.py"],
                ["Processed bill dataset or precursor detector dataset"],
                ["Counts, balance checks, visual sanity checklist"],
            ),
            _contract(
                "bill_classification",
                "preprocessing",
                "Bill Classifier Preprocessing Service",
                "Builds ImageFolder-style bill cutouts from annotated detector data.",
                "script",
                ["scripts/04_make_bill_cutouts.py"],
                ["Canonical banknote detector dataset"],
                ["data/processed/bill_cutouts"],
            ),
            _contract(
                "bill_classification",
                "training",
                "Bill Classifier Training Service",
                "Trains the denomination classifier and records run metadata for repeatability.",
                "script",
                ["scripts/24_train_bill_classifier.py", "scripts/_tracking.py"],
                ["Bill cutout dataset", "Training hyperparameters"],
                ["Bill classifier checkpoint", "Training curves", "MLflow run"],
            ),
            _contract(
                "bill_classification",
                "validation",
                "Bill Classifier Validation Service",
                "Evaluates denomination accuracy and class-level performance on held-out cutouts.",
                "script",
                ["scripts/25_eval_bill_classifier.py"],
                ["Bill classifier checkpoint", "Test split"],
                ["Accuracy metrics", "Evaluation report"],
            ),
            _contract(
                "bill_classification",
                "serving",
                "Bill Classifier Serving Service",
                "Serves denomination classification through the inference API after target routing.",
                "api",
                ["POST /api/pipeline/infer", "POST /api/infer/"],
                ["Image crop or full image"],
                ["Top denomination predictions"],
            ),
            _contract(
                "bill_classification",
                "integration",
                "Bill Classifier Integration Service",
                "Pushes denomination predictions into the end-user recognition experience and UI state.",
                "application",
                [
                    "training/app/rn_app/screens/InferenceScreen.tsx",
                    "training/app/rn_app/screens/HistoryScreen.tsx",
                    "training/app/static/app.js",
                ],
                ["Classifier response payload"],
                ["Displayed denomination result", "History entry in the app"],
            ),
            _contract(
                "bill_classification",
                "monitoring",
                "Bill Classifier Monitoring Service",
                "Captures prediction history, metrics, and tracked experiments to support maintenance and retraining.",
                "api",
                ["GET /api/storage/history", "GET /metrics", "scripts/_tracking.py"],
                ["Predictions", "Timing data", "Evaluation metrics"],
                ["Inference history", "Operational telemetry", "Tracked bill-classifier runs"],
            ),
        ],
    },
    "coin_classification": {
        "display_name": "Coin Classification",
        "problem_type": "computer_vision_multiclass_classification",
        "description": "Classifies cropped coin images into the supported denominations after detection.",
        "contracts": [
            _contract(
                "coin_classification",
                "ingestion",
                "Coin Classifier Ingestion Service",
                "Pulls raw coin datasets and supporting imagery used to build domain-specific crops.",
                "script",
                ["scripts/01_download_from_universe.py", "documentation/local_data_workflow.md"],
                ["Roboflow links config", "ROBOFLOW_API_KEY"],
                ["Downloaded coin datasets"],
            ),
            _contract(
                "coin_classification",
                "eda",
                "Coin Classifier EDA Service",
                "Profiles class coverage and domain balance for real versus synthetic coin crops.",
                "documentation",
                ["documentation/local_data_workflow.md", "scripts/20_build_coin_crops_domains.py"],
                ["Coin crop domains"],
                ["Domain/class balance checks", "Split sanity review"],
            ),
            _contract(
                "coin_classification",
                "preprocessing",
                "Coin Classifier Preprocessing Service",
                "Extracts coin crops and applies camera realism augmentation to build training-ready datasets.",
                "script",
                ["scripts/20_build_coin_crops_domains.py", "scripts/21_camera_realism_augment.py"],
                ["Raw coin YOLO datasets"],
                ["data/processed/coin_domains", "Augmented coin crops"],
            ),
            _contract(
                "coin_classification",
                "training",
                "Coin Classifier Training Service",
                "Trains the multiclass coin classifier and logs experiment metadata.",
                "script",
                ["scripts/22_train_coin_classifier.py", "scripts/_tracking.py"],
                ["Coin crop dataset", "Training hyperparameters"],
                ["Coin classifier checkpoint", "Training metrics", "MLflow run"],
            ),
            _contract(
                "coin_classification",
                "validation",
                "Coin Classifier Validation Service",
                "Measures held-out coin classification quality using evaluation metrics and saved reports.",
                "script",
                ["scripts/23_eval_coin_classifier.py"],
                ["Coin classifier checkpoint", "Test split"],
                ["Evaluation report", "Class-level metrics"],
            ),
            _contract(
                "coin_classification",
                "serving",
                "Coin Classifier Serving Service",
                "Serves coin denomination predictions through the online inference API.",
                "api",
                ["POST /api/pipeline/infer", "POST /api/infer/"],
                ["Image crop or full frame"],
                ["Top coin denomination predictions"],
            ),
            _contract(
                "coin_classification",
                "integration",
                "Coin Classifier Integration Service",
                "Connects coin predictions to the user-facing recognition workflow inside the app.",
                "application",
                [
                    "training/app/rn_app/screens/InferenceScreen.tsx",
                    "training/app/rn_app/screens/HistoryScreen.tsx",
                    "training/app/static/app.js",
                ],
                ["Coin classifier response payload"],
                ["Integrated app result and scan history"],
            ),
            _contract(
                "coin_classification",
                "monitoring",
                "Coin Classifier Monitoring Service",
                "Tracks deployed predictions, latency, and experiment lineage for retraining support.",
                "api",
                ["GET /api/storage/history", "GET /metrics", "scripts/_tracking.py"],
                ["Prediction logs", "Timing data", "Offline evaluation metrics"],
                ["Monitored service health", "MLflow experiment history"],
            ),
        ],
    },
    "screen_spoof_detection": {
        "display_name": "Screen Spoof Detection",
        "problem_type": "computer_vision_binary_classification",
        "description": "Detects whether the camera view looks like a screen or replay attack before money recognition proceeds.",
        "contracts": [
            _contract(
                "screen_spoof_detection",
                "ingestion",
                "Screen Spoof Ingestion Service",
                "Builds or expands the screen-vs-real dataset used for spoof-guard training.",
                "script",
                [
                    "scripts/30_prepare_screen_dataset_from_coco128.py",
                    "scripts/32_expand_screen_dataset_coco2017.py",
                ],
                ["Base image dataset inputs", "Optional COCO expansion inputs"],
                ["Prepared screen spoof dataset"],
            ),
            _contract(
                "screen_spoof_detection",
                "eda",
                "Screen Spoof EDA Service",
                "Reviews the balance and quality of real versus spoof examples before training.",
                "documentation",
                ["documentation/local_data_workflow.md", "training/README.md"],
                ["Prepared spoof dataset"],
                ["Split/count sanity review", "Real-vs-spoof coverage checks"],
            ),
            _contract(
                "screen_spoof_detection",
                "preprocessing",
                "Screen Spoof Preprocessing Service",
                "Transforms the source data into a binary classification dataset suitable for the spoof guard model.",
                "script",
                ["scripts/30_prepare_screen_dataset_from_coco128.py", "scripts/32_expand_screen_dataset_coco2017.py"],
                ["Source images and labels"],
                ["Train/val/test spoof guard dataset"],
            ),
            _contract(
                "screen_spoof_detection",
                "training",
                "Screen Spoof Training Service",
                "Trains the spoof guard classifier locally or submits the screen detector variant to SageMaker.",
                "script",
                ["scripts/28_train_spoof_guard.py", "scripts/31_submit_sagemaker_screen_yolo.py", "scripts/_tracking.py"],
                ["Prepared spoof dataset", "Training hyperparameters", "Optional SageMaker config"],
                ["Spoof guard checkpoint", "Training metrics", "MLflow run", "Optional SageMaker job"],
            ),
            _contract(
                "screen_spoof_detection",
                "validation",
                "Screen Spoof Validation Service",
                "Evaluates spoof detection quality using thresholded validation metrics and reports.",
                "script",
                ["scripts/29_eval_spoof_guard.py"],
                ["Spoof guard model checkpoint", "Test split", "Decision threshold"],
                ["Spoof detection evaluation report"],
            ),
            _contract(
                "screen_spoof_detection",
                "serving",
                "Screen Spoof Serving Service",
                "Runs the spoof guard inline within the deployed inference API before money recognition.",
                "api",
                ["POST /api/pipeline/infer", "GET /api/pipeline/status"],
                ["Input image frame"],
                ["Spoof decision embedded in pipeline response"],
            ),
            _contract(
                "screen_spoof_detection",
                "integration",
                "Screen Spoof Integration Service",
                "Exposes spoof guard behavior through application settings and end-user warnings.",
                "application",
                [
                    "training/app/rn_app/screens/SettingsScreen.tsx",
                    "training/app/rn_app/screens/InferenceScreen.tsx",
                    "training/app/services/spoof_guard.py",
                ],
                ["Spoof decision payload", "User settings"],
                ["Security warnings in the app", "Pipeline gating behavior"],
            ),
            _contract(
                "screen_spoof_detection",
                "monitoring",
                "Screen Spoof Monitoring Service",
                "Tracks spoof decisions, alerts, and experiment history to support maintenance and retraining.",
                "api",
                ["GET /api/storage/history", "GET /metrics", "scripts/_tracking.py", "scripts/41_import_sagemaker_runs_to_mlflow.py"],
                ["Spoof decisions", "Latency and experiment metrics"],
                ["Monitored spoof-guard behavior", "Retraining signals"],
            ),
        ],
    },
}


def _use_case_payload(use_case_id: str, include_contracts: bool = True) -> Dict[str, Any]:
    if use_case_id not in USE_CASES:
        raise KeyError(use_case_id)
    raw = USE_CASES[use_case_id]
    contracts = deepcopy(raw["contracts"])
    stage_names = [contract["lifecycle_stage"] for contract in contracts]
    payload: Dict[str, Any] = {
        "use_case": use_case_id,
        "display_name": raw["display_name"],
        "problem_type": raw["problem_type"],
        "description": raw["description"],
        "stage_count": len(stage_names),
        "required_stages": list(REQUIRED_STAGES),
        "required_stages_present": [stage for stage in REQUIRED_STAGES if stage in stage_names],
        "minimum_contract_requirement_met": len(stage_names) >= 6 and all(stage in stage_names for stage in REQUIRED_STAGES),
    }
    if include_contracts:
        payload["contracts"] = contracts
    return payload


def list_use_cases() -> List[Dict[str, Any]]:
    return [_use_case_payload(use_case_id, include_contracts=False) for use_case_id in USE_CASES]


def get_use_case(use_case_id: str) -> Dict[str, Any]:
    return _use_case_payload(use_case_id, include_contracts=True)


def get_contract(use_case_id: str, stage: str) -> Dict[str, Any]:
    use_case = get_use_case(use_case_id)
    for contract in use_case["contracts"]:
        if contract["lifecycle_stage"] == stage:
            return contract
    raise KeyError(f"{use_case_id}:{stage}")
