export type PipelineResponse = {
  kind?: string;
  result?: OfflinePipelineResult;
  error?: string;
};

export type InferenceMode = 'server' | 'offline';

export type OfflineRunOptions = {
  topKTargets: number;
  spoofGuardEnabled: boolean;
  confidenceThreshold: number;
};

export type OfflineModelNameMap = {
  detector: string | null;
  bill_reader: string | null;
  coin_classifier: string | null;
  spoof_guard: string | null;
};

export type MobilePipelineDefaults = {
  detector_conf_threshold: number;
  detector_iou_threshold: number;
  detector_max_det: number;
  detector_bill_min_conf: number;
  detector_coin_min_conf: number;
  detector_min_box_side_px: number;
  detector_min_box_area_ratio: number;
  detector_max_box_area_ratio: number;
  detector_coin_min_aspect: number;
  detector_coin_max_aspect: number;
  detector_duplicate_iou: number;
  detector_duplicate_cross_class_iou: number;
  pipeline_coin_route_min_conf: number;
  pipeline_giant_coin_area_ratio: number;
  pipeline_max_topk_targets: number;
  spoof_guard_threshold: number;
  spoof_guard_block_on_detect: boolean;
};

export type MobileDetectorModelManifest = {
  file: string;
  checkpoint: string;
  class_names: string[];
  input_name: string;
  output_name: string;
  image_size: number;
  quantized: boolean;
  size_bytes: number;
};

export type MobileClassifierModelManifest = {
  file: string;
  checkpoint: string;
  classes: string[];
  image_size: number;
  backbone: string;
  normalize_imagenet: boolean;
  input_name: string;
  output_name: string;
  quantized: boolean;
  size_bytes: number;
};

export type MobileModelManifest = {
  generated_at: string;
  assets_dir: string;
  pipeline_defaults: MobilePipelineDefaults;
  models: {
    detector: MobileDetectorModelManifest;
    bill_reader: MobileClassifierModelManifest;
    coin_classifier: MobileClassifierModelManifest;
    spoof_guard: MobileDetectorModelManifest;
  };
};

export type OfflineDetection = {
  class_id: number;
  class_name: string;
  display_name?: string;
  display_confidence?: number;
  confidence: number;
  xyxy: [number, number, number, number];
  box_area_ratio: number;
};

export type OfflineTopPrediction = {
  class: string;
  confidence: number;
};

export type OfflineClassificationResult = {
  type: 'classifier';
  top_predictions: OfflineTopPrediction[];
};

export type OfflineClassification = {
  kind: 'bill_reader' | 'coin_classifier';
  result: OfflineClassificationResult;
};

export type OfflineTargetKind = 'bill' | 'coin' | 'unknown';

export type OfflineCandidate = {
  rank: number;
  kind: OfflineTargetKind;
  target: OfflineDetection;
  classification: OfflineClassification | null;
};

export type OfflineSpoofModelPrediction = {
  class: string;
  confidence: number;
  box_area_ratio?: number;
  score?: number;
};

export type OfflineSpoofCheck = {
  enabled: boolean;
  blocked: boolean;
  suspected: boolean;
  decision: 'disabled' | 'allow' | 'warn' | 'block';
  score: number;
  threshold: number;
  source: string;
  model: string | null;
  model_result: {
    spoof_probability: number;
    live_probability: number;
    top_predictions: OfflineSpoofModelPrediction[];
    reasons: string[];
  } | null;
  heuristics: null;
  reasons: string[];
};

export type OfflinePipelineResult = {
  pipeline_models: OfflineModelNameMap;
  spoof_check: OfflineSpoofCheck;
  detector: {
    type: 'detector';
    detections: OfflineDetection[];
  };
  requested_top_k_targets: number;
  target: OfflineDetection | null;
  classification: OfflineClassification | null;
  candidates: OfflineCandidate[];
  warning?: string;
};

export type OfflinePipelineStatus = {
  supported: boolean;
  ready: boolean;
  mode: 'offline';
  platform: string;
  pipeline: OfflineModelNameMap;
  availableModels: string[];
  error: string | null;
  details?: {
    executionProviders: string[];
    manifestGeneratedAt?: string | null;
  };
};
