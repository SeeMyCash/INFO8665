# Cemil Caglar Yapici — Speaking Script

## SeeMyCash: My Technical Contributions

---

### Opening

Hi everyone, I'm Cemil. I'll walk through my contributions to SeeMyCash, covering data normalization, model training, the React Native accessibility layer, the spoof detection pipeline, the observability dashboards, MLflow experiment tracking, secret scanning, and our ML service contracts documentation.

---

### Sprint 0 — Data Normalization & Label Standardization

#### Normalizing Labels into the Canonical CAD Schema

One of the foundational challenges was that our training data came from multiple Roboflow Universe datasets, each using different label conventions. One dataset would call a five-dollar bill `"$5"`, another `"5 CAD"`, another `"cad5"`, another `"5dollar"`, another `"5-Dollar"`, and yet another `"5CanadaDollar"`. We had over 35 source label variants across all datasets.

I solved this by creating the canonical label schema in `configs/label_map.yaml`, which defines six canonical classes: `CAD_5`, `CAD_10`, `CAD_20`, `CAD_50`, `CAD_100`, and `COIN`. The label map explicitly maps every known variant to its canonical form — for coins, labels like `"penny"`, `"nickel"`, `"dime"`, `"quarter"`, `"loonie"`, and `"toonie"` all map to the generic `COIN` class at the detection level.

Then I wrote `scripts/02_merge_and_normalize_money.py`, which is the script that actually unifies all our datasets. The key functions are:

- `load_label_map()` which parses the YAML and returns the canonical class list plus the raw mapping dictionary
- `normalize_class_name()` which strips whitespace, lowercases, and removes underscores, hyphens, and spaces for fuzzy matching
- `build_remap()` which builds an integer-to-integer index remapping from source dataset class indices to canonical class indices
- `remap_label_file()` which rewrites YOLO label `.txt` files line by line, replacing each class index

The script handles multiple split naming conventions — `train`, `valid`, `val`, `test` — and different image directory layouts across datasets. Output files are renamed sequentially as `img_000000.jpg` to avoid filename collisions. The final unified dataset lands at `data/processed/money_merged/` with a single `data.yaml` that our training scripts consume.

---

### Sprint 1 — YOLO26 Detector Training

I trained the YOLO26 object detection model using `scripts/10_train_detector.py`, which wraps the Ultralytics YOLO library. The script starts with `yolo26n.pt` pretrained weights and fine-tunes on our merged currency dataset.

The training hyperparameters I configured: image size 640, 60 epochs, batch size 16, initial learning rate 0.01 with cosine annealing down to learning rate factor 0.01, momentum 0.937, weight decay 5×10⁻⁴, and warmup for the first 3 epochs. For augmentation through Ultralytics, I enabled mosaic at 1.0, mixup at 0.1, copy-paste at 0.1, 10 degrees rotation, 0.1 translation, 0.5 scale jitter, 2 degrees shear, slight perspective distortion at 0.0005, and horizontal flip at 0.5. The `close_mosaic` parameter disables mosaic augmentation for the last 10 epochs so the model fine-tunes on unaugmented images.

The script has proper device auto-detection via `resolve_device()` which checks for CUDA, then MPS, then falls back to CPU. Worker count is auto-resolved from `os.cpu_count()`, and the cache strategy adapts — RAM caching for GPU training, disabled for CPU.

Validation metrics tracked include `val_mAP50`, `val_mAP50_95`, `val_precision`, and `val_recall`, all logged to MLflow when tracking is enabled.

---

### Sprint 2 — React Native Accessibility

#### Accessibility Labels on All UI Elements

I went through every component and screen in the React Native app and added proper accessibility annotations. Here are the specifics:

The `GradientButton` component got `accessibilityRole="button"`, a dynamic `accessibilityLabel` set to the button's title text, `accessibilityState` tracking the disabled state, and an `accessibilityHint` prop for additional context.

The `OfflineBanner` component uses `accessibilityRole="alert"` and `accessibilityLiveRegion="polite"` so screen readers announce connectivity changes without interrupting the user. The `accessibilityLabel` changes dynamically — it says one thing when retrying and another when fully offline. The hint tells users they can tap to retry.

In the `SettingsScreen`, every threshold button and segment control has `accessibilityRole="button"` with `accessibilityState` tracking the selected state. The "Clear All Data" button has the hint `"Erases all saved settings and scan history from this device"` so users understand the destructive action.

I created the `useAccessibleTheme` hook, which reads the `settings.highContrast` and `settings.largeFonts` preferences, merges high-contrast colors into the active color palette, and scales `typography.fontSize` by the `largeFontScale` factor. This drives the accessibility settings section in `SettingsScreen` — High Contrast toggle, Large Fonts toggle, and Haptic Feedback toggle, all rendered with themed switches under an "Accessibility" section with the `accessibility-outline` icon.

For text-to-speech, the `speakAnnouncement()` function in `InferenceScreen` uses `window.speechSynthesis` on web and `AccessibilityInfo.announceForAccessibility()` on native platforms, and it respects the user's configured TTS speed from settings.

---

### Sprint 4 — Spoof Detection Pipeline & RN Enhancements

#### Preparing the Screen-Detection YOLO Dataset

I wrote two dataset preparation scripts. The first, `scripts/30_prepare_screen_dataset_from_coco128.py`, downloads COCO128 and collapses three COCO classes — 62 (TV), 63 (laptop), and 67 (cell phone) — into a single `"screen"` class with index 0. The `_map_label_line()` function remaps each class ID, and the script creates an 80/20 train/val split with a proper YOLO `data.yaml`.

The second script, `scripts/32_expand_screen_dataset_coco2017.py`, scales this up with full COCO 2017. It defines `SCREEN_CLASS_NAMES = {"tv", "laptop", "cell phone"}`, uses `_screen_category_ids()` to find the matching COCO category IDs, then `_build_split_samples()` selects positive images containing screens plus a configurable ratio of negative images. The `_to_yolo_line()` function converts COCO's `[x, y, w, h]` bounding box format to YOLO's normalized `[center_x, center_y, width, height]` format. Images are downloaded in parallel using `ThreadPoolExecutor` with 3 retries and 30-second timeouts.

#### Training the Spoof Guard Binary Classifier

I trained the spoof guard using `scripts/28_train_spoof_guard.py`. The architecture supports ResNet18 and MobileNetV3 Small backbones, both ImageNet pretrained. I replace the final classification layer — `model.fc` for ResNet or `classifier[-1]` for MobileNet — with a 2-class output.

The data augmentation is: `GaussianBlur` with kernel size 3 at probability 0.35, `ColorJitter` with brightness and contrast 0.20, saturation 0.16, and hue 0.04, `RandomHorizontalFlip` at 0.5, and `RandomAffine` with 12 degrees rotation and slight translation and scaling. All images are normalized with ImageNet mean and standard deviation.

Training uses AdamW with learning rate 3×10⁻⁴, label smoothing 0.02, cosine scheduling, and early stopping with patience 6. For class imbalance, I implemented `WeightedRandomSampler` plus class-weighted `CrossEntropyLoss`. The model saves to `outputs/models/spoof-guard-local__model.pt`.

#### Spoof Guard Toggle in React Native

In `SettingsScreen.tsx`, I added a "Screen Spoof Protection" switch under a Security section with the `shield-checkmark-outline` icon. The switch is bound to `settings.screenSpoofGuardEnabled` and uses a warning-colored track to visually indicate it's a security feature. At inference time, this setting controls whether the backend runs the spoof guard before detection.

#### Classifier Display Names on Detection Overlays

I updated three React Native components to show human-readable denomination names instead of raw class labels:

In `DetectionOverlay.tsx`, the label logic is `const className = String(detection.display_name || detection.class_name || '?')` — so `display_name` from the classifier always takes priority. I defined a `CLASS_COLORS` map with distinct colors for each denomination: blue for `CAD_5`, purple for `CAD_10`, green for `CAD_20`, amber for `CAD_50`, red for `CAD_100`, and specific colors for coins — `LOONIE` in green, `TOONIE` in gold, `NICKEL` in blue, `DIME` in lavender, `QUARTER` in orange.

The `projectDetection()` function handles coordinate projection from source image space to screen space, accounting for `contain` and `cover` resize modes and optional mirroring for front-camera input. The label is rendered as a colored pill showing `"{displayName} {confidence}%"`.

In `DetectionCard.tsx`, the same pattern applies with a gradient confidence bar, index badge, and bounding box coordinate display. In `ImageWithOverlay.tsx`, the web implementation draws HTML5 canvas overlays using `ctx.strokeRect()` for boxes and `ctx.fillText()` for labels.

#### Docker Ignore Files

I created both `.dockerignore` files to keep our images lean. The root `.dockerignore` excludes `.git/`, `.vscode/`, `__pycache__/`, `.venv/`, `.env` files (but keeps `.env.example`), `dev/secrets/`, `data/`, and `outputs/`. The training-specific `.dockerignore` additionally excludes `node_modules/` and `app/rn_app/node_modules/`.

---

### Sprint 5 — Live Camera Overlay & Grafana Dashboards

#### Enhanced InferenceScreen with Live Detection Overlay

This was a substantial piece of work. The `InferenceScreen.tsx` supports dual-mode camera input — `CameraView` from expo-camera for native and `WebLiveCamera` for web.

The core innovation is the live stability algorithm. I track a `StableTarget` object with `className` and bounding box coordinates, then use IoU-based matching via `_iou()` and `_isStableMatch()` to determine if the same object is being detected consistently across frames. The stability parameters are: a 3000ms window, minimum 3 matching frames, and an IoU threshold of 0.45. The `LiveStabilityStatus` tracks `idle`, `stabilizing`, and `stable` modes, with a 1200ms hold period after a stable detection to prevent flickering.

I implemented currency normalization through `_normalizeCurrencyClassName()` which handles aliases — `ONECENT` becomes `PENNY`, `5CENT` becomes `NICKEL`, `10CENT` becomes `DIME`, `25CENT` becomes `QUARTER`. The `COIN_NUMERIC_CLASS_ALIASES` map handles integer class indices: 0 → PENNY, 1 → NICKEL, 2 → DIME, 3 → QUARTER, 4 → LOONIE, 5 → TOONIE.

The value computation uses the `DENOM_VALUES` map (CAD_5 → 5.00, PENNY → 0.01, LOONIE → 1.00, etc.) with regex fallbacks for `CAD_NN` patterns. Total value is spoken aloud using `_toCadSpeech()` — for example, `"5 dollars and 25 cents"` — via `speakAnnouncement()`.

Gallery mode uses `ImagePicker.launchImageLibraryAsync()` for still images with `ImageWithOverlay` rendering. The guaranteed classifier summary uses a minimum confidence threshold of 0.70 to filter out low-confidence predictions.

#### Grafana Dashboards for API Observability

I built the complete Grafana observability layer — 4 dashboards with file-based provisioning.

The **SMC API Overview** dashboard has 6 panels: Request Rate using `sum(rate(http_requests_total{handler!="/metrics"}[5m]))`, Error Rate filtering for 4xx and 5xx status codes, P95 Latency using `histogram_quantile(0.95, ...)` with threshold coloring at 500ms (orange) and 1500ms (red), Average Latency, and API Uptime computed from `time() - process_start_time_seconds`.

The **Endpoint Breakdown** dashboard has 4 panels showing request rate, status mix, P95 latency, and average response size — all grouped by handler, so you can see exactly which endpoints are hot.

The **Pipeline Inference** dashboard focuses specifically on `/api/pipeline/infer` — throughput, error rate, and P95 latency with pipeline-specific thresholds at 700ms and 2000ms.

The **API Logs** dashboard has 2 Loki panels — a container logs panel with a `$service` template variable from `label_values(compose_service)`, and a filtered panel showing only API INFO-level logs.

I configured the Prometheus scrape in `prometheus.yml` — 15-second intervals, targeting the `api:8080` `/metrics` endpoint. The Grafana provisioning auto-configures both Prometheus and Loki datasources with Loki set to 1000 max lines.

---

### Sprint 6 — MLflow Tracking & Secret Scanning

#### MLflow Experiment Tracking Integration

I created the reusable tracking infrastructure in `scripts/_tracking.py`. The `ExperimentTracker` is a dataclass that works as a context manager — you enter the context, it calls `mlflow.set_tracking_uri()`, `mlflow.set_experiment()`, and `mlflow.start_run()`, setting tags for the component name and hostname.

Key methods are `log_params()` which cleans parameter values via `_clean_mapping()`, `log_metric()` which sanitizes metric names by stripping characters outside `[A-Za-z0-9_.\- /:]`, `log_metrics()` for batch logging, `log_artifact()` and `log_artifacts()` for files, and `log_dict()` which uses `mlflow.log_dict()` with a temp-file fallback.

The `build_tracker()` factory function accepts a `component` name, optional experiment name and run name, and `extra_tags`. Experiment names default to `{MLFLOW_EXPERIMENT_PREFIX}/{component}` where the prefix defaults to `"INFO8665"`. The tracker gracefully degrades — if `mlflow` isn't installed, it sets `enabled=False` and prints a warning, so scripts still run without MLflow.

The companion `scripts/_runtime.py` module provides `load_repo_env()` which loads the `.env` file via `python-dotenv` for consistent environment configuration across all scripts.

I integrated tracking into the detector training script (`component="detector_train"`) and the spoof guard training script (`component="spoof_guard_train"`), with tags for framework and task type. All training scripts now accept `--mlflow-experiment`, `--mlflow-run-name`, and `--disable-mlflow` CLI arguments.

#### Gitleaks Secret Scanning

I set up automated secret scanning with `.gitleaks.toml` and a GitHub Actions workflow. The configuration extends the default Gitleaks rules and adds 9 custom rules specific to our project:

- `hardcoded-db-username`, `hardcoded-db-password`, `hardcoded-db-hostname`, and `hardcoded-db-port` rules catch database credentials in code
- `grafana-admin-password` catches `GF_SECURITY_ADMIN_PASSWORD` patterns
- `grafana-cloud-api-key` matches the `glc_` prefix pattern for Grafana Cloud API keys
- Rules for `hardcoded-eda-feature-names`, `hardcoded-learning-rate`, `hardcoded-batch-size`, and `hardcoded-momentum` have allowlists for `.py` and `.yaml` files where these values are expected

Each rule has proper `tags` and `keywords` for categorization, and path-based allowlists to prevent false positives on example configs and test data.

The `.github/workflows/gitleaks.yml` workflow triggers on pull requests and pushes to `main`/`master`. It uses `actions/checkout@v4` with `fetch-depth: 0` for full git history scanning, then runs `gacts/gitleaks@v1` with our config file.

---

### Sprint 7 — ML Service Contracts Documentation

#### Service Contracts Documentation

I authored `documentation/ml_service_contracts.md`, which documents the lifecycle-aligned contract approach for all four ML use cases. Each use case maps 8 lifecycle stages to concrete implementations:

1. **Money Detection** — ingestion via `scripts/01_download_from_universe.py`, EDA via `scripts/06_eda_banknotes_summary.py`, preprocessing via `scripts/02_merge_and_normalize_money.py` and `scripts/03_build_negatives_pool.py`, training via `scripts/10_train_detector.py`, validation via `training/eval_detector.py`, serving via `POST /api/pipeline/infer`, integration through web and React Native flows, and monitoring via `/api/storage/history`, `/metrics`, and MLflow.

2. **Bill Classification**, **Coin Classification**, and **Screen Spoof Detection** each follow the same 8-stage pattern with their respective scripts and endpoints.

The document lists the three MLOps API endpoints — `GET /api/mlops/use-cases`, `GET /api/mlops/use-cases/{use_case_id}`, and `GET /api/mlops/use-cases/{use_case_id}/contracts/{stage}` — and includes a submission interpretation section explaining that each use case satisfies the minimum 6-stage requirement plus the stronger 8-stage MLOps interpretation.

#### Training README Update

I updated `training/README.md` with an experiment tracking section covering MLflow setup — `docker compose up -d mlflow`, configuring `MLFLOW_TRACKING_URI=http://localhost:5000`, and per-run overrides. I added the lifecycle service contracts section linking to the full documentation and listing the API routes. I also documented training commands for all five model types and the quantized artifact formats — INT8 ONNX for the detector, dynamic INT8 TorchScript for the classifiers.

---

### Closing

My contributions span data normalization, model training, mobile accessibility, the spoof detection pipeline, real-time camera inference with stability algorithms, Grafana observability dashboards, MLflow experiment tracking, security scanning, and the ML service contract documentation. Each piece connects to the larger goal of building a reliable, accessible, and well-monitored currency recognition system. Thank you.
