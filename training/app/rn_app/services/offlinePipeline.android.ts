import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { SaveFormat, manipulateAsync } from 'expo-image-manipulator';
import { Platform } from 'react-native';
import { InferenceSession, Tensor } from 'onnxruntime-react-native';
import type {
  MobileDetectorModelManifest,
  MobileModelManifest,
  MobilePipelineDefaults,
  OfflineCandidate,
  OfflineClassification,
  OfflineClassificationResult,
  OfflineDetection,
  OfflineModelNameMap,
  OfflinePipelineResult,
  OfflinePipelineStatus,
  OfflineRunOptions,
  OfflineSpoofCheck,
  OfflineSpoofModelPrediction,
  OfflineTargetKind,
  PipelineResponse,
} from './offlineTypes';

const manifest = require('../assets/models/mobile-model-manifest.json') as MobileModelManifest;

const MODEL_ASSETS = {
  detector: require('../assets/models/detector-android.mobile.onnx'),
  bill_reader: require('../assets/models/bill-reader-android.mobile.onnx'),
  coin_classifier: require('../assets/models/coin-classifier-android.mobile.onnx'),
  spoof_guard: require('../assets/models/spoof-guard-android.mobile.onnx'),
} as const;

const COIN_CLASS_ALIASES: Record<string, string> = {
  '0': 'PENNY',
  '1': 'NICKEL',
  '2': 'DIME',
  '3': 'QUARTER',
  '4': 'LOONIE',
  '5': 'TOONIE',
};

const EXECUTION_PROVIDERS = ['xnnpack', 'cpu'] as const;

const SESSION_OPTIONS = {
  executionProviders: [{ name: 'xnnpack' }, { name: 'cpu' }],
  graphOptimizationLevel: 'all',
  enableCpuMemArena: true,
  enableMemPattern: true,
  intraOpNumThreads: 1,
} as const;

type ModelRole = keyof typeof MODEL_ASSETS;

type RuntimeSessions = Record<ModelRole, InferenceSession>;

type RuntimeState = {
  status: OfflinePipelineStatus;
  sessions: RuntimeSessions | null;
};

type NormalizedImage = {
  uri: string;
  width: number;
  height: number;
};

type RankedTarget = OfflineDetection & {
  _source_index: number;
  _target_kind: OfflineTargetKind;
};

let runtimePromise: Promise<RuntimeState> | null = null;

function pipelineModelNames(): OfflineModelNameMap {
  return {
    detector: manifest.models.detector.checkpoint,
    bill_reader: manifest.models.bill_reader.checkpoint,
    coin_classifier: manifest.models.coin_classifier.checkpoint,
    spoof_guard: manifest.models.spoof_guard.checkpoint,
  };
}

function defaultStatus(error: string | null, ready = false): OfflinePipelineStatus {
  return {
    supported: true,
    ready,
    mode: 'offline',
    platform: Platform.OS,
    pipeline: ready ? pipelineModelNames() : {
      detector: null,
      bill_reader: null,
      coin_classifier: null,
      spoof_guard: null,
    },
    availableModels: Object.values(manifest.models).map((model) => model.checkpoint),
    error,
    details: {
      executionProviders: [...EXECUTION_PROVIDERS],
      manifestGeneratedAt: manifest.generated_at,
    },
  };
}

async function loadModelUri(moduleId: number): Promise<string> {
  const asset = Asset.fromModule(moduleId);
  await asset.downloadAsync();
  const uri = asset.localUri || asset.uri;
  if (!uri) {
    throw new Error('Bundled model asset is unavailable on this device.');
  }
  return uri;
}

async function createSession(moduleId: number): Promise<InferenceSession> {
  const uri = await loadModelUri(moduleId);
  return InferenceSession.create(uri, SESSION_OPTIONS);
}

async function ensureRuntime(): Promise<RuntimeState> {
  if (runtimePromise) {
    return runtimePromise;
  }

  runtimePromise = (async () => {
    const created: Partial<RuntimeSessions> = {};
    try {
      created.detector = await createSession(MODEL_ASSETS.detector);
      created.bill_reader = await createSession(MODEL_ASSETS.bill_reader);
      created.coin_classifier = await createSession(MODEL_ASSETS.coin_classifier);
      created.spoof_guard = await createSession(MODEL_ASSETS.spoof_guard);

      return {
        status: defaultStatus(null, true),
        sessions: created as RuntimeSessions,
      };
    } catch (error) {
      await Promise.all(
        Object.values(created).map(async (session) => {
          try {
            await session?.release();
          } catch {
            // Ignore best-effort release failures during init cleanup.
          }
        }),
      );

      return {
        status: defaultStatus(messageFromError(error), false),
        sessions: null,
      };
    }
  })();

  return runtimePromise;
}

function messageFromError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return String(error || 'Unknown offline inference error.');
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round4(value: number): number {
  return Math.round(Number(value) * 10000) / 10000;
}

function canonicalizePredictionClass(label: string): string {
  const text = String(label || '').trim();
  if (!text) {
    return text;
  }
  const alias = COIN_CLASS_ALIASES[text];
  return alias || text;
}

async function normalizeInputImage(uri: string): Promise<NormalizedImage> {
  const normalized = await manipulateAsync(
    uri,
    [],
    { compress: 0.92, format: SaveFormat.JPEG },
  );
  return {
    uri: normalized.uri,
    width: normalized.width,
    height: normalized.height,
  };
}

function decodeBase64(base64Value: string): Uint8Array {
  const cleaned = String(base64Value || '')
    .replace(/^data:.*;base64,/, '')
    .replace(/\s+/g, '');

  if (!cleaned) {
    return new Uint8Array(0);
  }

  const atobFn = (globalThis as { atob?: ((value: string) => string) | undefined }).atob;
  if (typeof atobFn === 'function') {
    const binary = atobFn(cleaned);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }

  const table = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const output: number[] = [];
  let buffer = 0;
  let bitsCollected = 0;

  for (const character of cleaned) {
    if (character === '=') {
      break;
    }
    const value = table.indexOf(character);
    if (value === -1) {
      continue;
    }
    buffer = (buffer << 6) | value;
    bitsCollected += 6;
    if (bitsCollected >= 8) {
      bitsCollected -= 8;
      output.push((buffer >> bitsCollected) & 0xff);
    }
  }

  return new Uint8Array(output);
}

async function readFileBytes(uri: string): Promise<Uint8Array> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return decodeBase64(base64);
}

function toNumericArray(values: unknown): number[] {
  if (!values || typeof values !== 'object') {
    return [];
  }

  const arrayLike = values as ArrayLike<number>;
  if (typeof arrayLike.length === 'number') {
    return Array.from({ length: arrayLike.length }, (_, index) => Number(arrayLike[index] ?? 0));
  }

  return [];
}

function tensorRows(tensor: Tensor, rowWidth = 6): number[][] {
  const flat = toNumericArray(tensor.data);
  const dims = tensor.dims.map((value) => Number(value));
  if (dims.length === 3 && dims[2] >= rowWidth) {
    const rowsPerBatch = dims[1];
    const stride = dims[2];
    return Array.from({ length: rowsPerBatch }, (_, rowIndex) => {
      const offset = rowIndex * stride;
      return flat.slice(offset, offset + stride);
    });
  }
  if (dims.length === 2 && dims[1] >= rowWidth) {
    const stride = dims[1];
    return Array.from({ length: dims[0] }, (_, rowIndex) => {
      const offset = rowIndex * stride;
      return flat.slice(offset, offset + stride);
    });
  }
  if (flat.length >= rowWidth) {
    const rows = Math.floor(flat.length / rowWidth);
    return Array.from({ length: rows }, (_, rowIndex) =>
      flat.slice(rowIndex * rowWidth, rowIndex * rowWidth + rowWidth),
    );
  }
  return [];
}

function tensorVector(tensor: Tensor): number[] {
  return toNumericArray(tensor.data);
}

function iou(a: [number, number, number, number], b: [number, number, number, number]): number {
  const ax1 = Math.min(a[0], a[2]);
  const ay1 = Math.min(a[1], a[3]);
  const ax2 = Math.max(a[0], a[2]);
  const ay2 = Math.max(a[1], a[3]);
  const bx1 = Math.min(b[0], b[2]);
  const by1 = Math.min(b[1], b[3]);
  const bx2 = Math.max(b[0], b[2]);
  const by2 = Math.max(b[1], b[3]);

  const ix1 = Math.max(ax1, bx1);
  const iy1 = Math.max(ay1, by1);
  const ix2 = Math.min(ax2, bx2);
  const iy2 = Math.min(ay2, by2);
  const width = Math.max(0, ix2 - ix1);
  const height = Math.max(0, iy2 - iy1);
  const intersection = width * height;
  if (intersection <= 0) {
    return 0;
  }

  const areaA = Math.max(0, ax2 - ax1) * Math.max(0, ay2 - ay1);
  const areaB = Math.max(0, bx2 - bx1) * Math.max(0, by2 - by1);
  const union = areaA + areaB - intersection;
  return union > 0 ? intersection / union : 0;
}

function isCoinDetection(className: string): boolean {
  return String(className || '').trim().toLowerCase().includes('coin');
}

function passesDetectionFilters(
  detection: OfflineDetection,
  imageWidth: number,
  imageHeight: number,
  defaults: MobilePipelineDefaults,
  confidenceThreshold: number,
): boolean {
  const [x1, y1, x2, y2] = detection.xyxy;
  const width = Math.max(0, x2 - x1);
  const height = Math.max(0, y2 - y1);
  const isCoin = isCoinDetection(detection.class_name);
  const userThreshold = clamp(Number.isFinite(confidenceThreshold) ? confidenceThreshold : 0, 0, 1);
  const minConfidence = Math.max(
    isCoin ? defaults.detector_coin_min_conf : defaults.detector_bill_min_conf,
    userThreshold,
  );

  if (detection.confidence < minConfidence) {
    return false;
  }
  if (width <= defaults.detector_min_box_side_px || height <= defaults.detector_min_box_side_px) {
    return false;
  }

  const areaRatio = (width * height) / Math.max(1, imageWidth * imageHeight);
  if (areaRatio < defaults.detector_min_box_area_ratio || areaRatio > defaults.detector_max_box_area_ratio) {
    return false;
  }

  if (isCoin) {
    const aspect = width / Math.max(height, 1e-6);
    if (aspect < defaults.detector_coin_min_aspect || aspect > defaults.detector_coin_max_aspect) {
      return false;
    }
  }

  return width > 1 && height > 1;
}

function dedupeDetections(
  detections: OfflineDetection[],
  defaults: MobilePipelineDefaults,
): OfflineDetection[] {
  const kept: OfflineDetection[] = [];
  const ranked = [...detections].sort((a, b) => b.confidence - a.confidence);

  for (const detection of ranked) {
    const duplicate = kept.some((existing) => {
      const overlap = iou(detection.xyxy, existing.xyxy);
      if (detection.class_name === existing.class_name && overlap >= defaults.detector_duplicate_iou) {
        return true;
      }
      return overlap >= defaults.detector_duplicate_cross_class_iou;
    });

    if (!duplicate) {
      kept.push(detection);
    }
  }

  return kept.slice(0, Math.max(1, defaults.detector_max_det));
}

function parseDetections(
  tensor: Tensor,
  model: MobileDetectorModelManifest,
  image: NormalizedImage,
  defaults: MobilePipelineDefaults,
  confidenceThreshold: number,
): OfflineDetection[] {
  const detections: OfflineDetection[] = [];

  for (const row of tensorRows(tensor, 6)) {
    const [x1, y1, x2, y2, confidence, classIdValue] = row;
    if ([x1, y1, x2, y2, confidence, classIdValue].some((value) => !Number.isFinite(value))) {
      continue;
    }

    const classId = Math.max(0, Math.round(classIdValue));
    const className = model.class_names[classId] || String(classId);
    const width = Math.max(0, x2 - x1);
    const height = Math.max(0, y2 - y1);
    const areaRatio = (width * height) / Math.max(1, image.width * image.height);

    const detection: OfflineDetection = {
      class_id: classId,
      class_name: className,
      confidence: round4(confidence),
      xyxy: [x1, y1, x2, y2],
      box_area_ratio: round4(areaRatio),
    };

    if (passesDetectionFilters(detection, image.width, image.height, defaults, confidenceThreshold)) {
      detections.push(detection);
    }
  }

  return dedupeDetections(detections, defaults);
}

function rankTargets(
  detections: OfflineDetection[],
  defaults: MobilePipelineDefaults,
): RankedTarget[] {
  if (!detections.length) {
    return [];
  }

  const ranked = detections
    .map((detection, index) => ({ ...detection, _source_index: index, _target_kind: 'unknown' as OfflineTargetKind }))
    .sort((a, b) => b.confidence - a.confidence);

  const billCandidates = ranked.filter((detection) => !isCoinDetection(detection.class_name));
  const coinCandidates = ranked.filter((detection) =>
    isCoinDetection(detection.class_name)
    && detection.box_area_ratio < defaults.pipeline_giant_coin_area_ratio
    && detection.confidence >= defaults.pipeline_coin_route_min_conf,
  );
  const giantCoinCandidates = ranked.filter((detection) =>
    isCoinDetection(detection.class_name)
    && detection.box_area_ratio >= defaults.pipeline_giant_coin_area_ratio
    && detection.confidence >= defaults.pipeline_coin_route_min_conf,
  );

  const ordered: RankedTarget[] = [];
  for (const candidate of billCandidates) {
    ordered.push({ ...candidate, _target_kind: 'bill' });
  }
  for (const candidate of coinCandidates) {
    ordered.push({ ...candidate, _target_kind: 'coin' });
  }
  for (const candidate of giantCoinCandidates) {
    ordered.push({ ...candidate, _target_kind: 'coin' });
  }

  if (ordered.length) {
    return ordered;
  }

  return [{ ...ranked[0], _target_kind: 'unknown' }];
}

function publicTarget(target: RankedTarget): OfflineDetection {
  const { class_id, class_name, display_confidence, display_name, confidence, xyxy, box_area_ratio } = target;
  return {
    class_id,
    class_name,
    display_confidence,
    display_name,
    confidence,
    xyxy,
    box_area_ratio,
  };
}

async function runByteInputModel(
  session: InferenceSession,
  imageUri: string,
  inputName: string,
  outputName: string,
): Promise<Tensor> {
  const bytes = await readFileBytes(imageUri);
  const input = new Tensor('uint8', bytes, [bytes.length]);
  const outputs = await session.run({ [inputName]: input });
  const outputTensor = outputs[outputName] as Tensor | undefined;
  if (!outputTensor) {
    throw new Error(`Offline runtime did not return expected output "${outputName}".`);
  }
  return outputTensor;
}

function topPredictionsFromTensor(
  tensor: Tensor,
  classes: string[],
  limit = 5,
): OfflineClassificationResult {
  const probabilities = tensorVector(tensor);
  const predictions = probabilities
    .map((value, index) => ({
      class: canonicalizePredictionClass(classes[index] || String(index)),
      confidence: round4(value),
    }))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit);

  return {
    type: 'classifier',
    top_predictions: predictions,
  };
}

async function cropForClassifier(
  image: NormalizedImage,
  xyxy: [number, number, number, number],
  targetSize: number,
): Promise<string> {
  const left = clamp(Math.floor(Math.min(xyxy[0], xyxy[2])), 0, Math.max(0, image.width - 1));
  const top = clamp(Math.floor(Math.min(xyxy[1], xyxy[3])), 0, Math.max(0, image.height - 1));
  const right = clamp(Math.ceil(Math.max(xyxy[0], xyxy[2])), left + 1, image.width);
  const bottom = clamp(Math.ceil(Math.max(xyxy[1], xyxy[3])), top + 1, image.height);

  const cropped = await manipulateAsync(
    image.uri,
    [
      {
        crop: {
          originX: left,
          originY: top,
          width: Math.max(1, right - left),
          height: Math.max(1, bottom - top),
        },
      },
      { resize: { width: targetSize, height: targetSize } },
    ],
    { compress: 1, format: SaveFormat.JPEG },
  );

  return cropped.uri;
}

async function classifyCandidate(
  image: NormalizedImage,
  candidate: RankedTarget,
  sessions: RuntimeSessions,
): Promise<OfflineClassification | null> {
  if (candidate._target_kind !== 'bill' && candidate._target_kind !== 'coin') {
    return null;
  }

  const model = candidate._target_kind === 'bill'
    ? manifest.models.bill_reader
    : manifest.models.coin_classifier;
  const session = candidate._target_kind === 'bill'
    ? sessions.bill_reader
    : sessions.coin_classifier;
  const kind = candidate._target_kind === 'bill' ? 'bill_reader' : 'coin_classifier';

  const cropUri = await cropForClassifier(image, candidate.xyxy, model.image_size);
  const outputTensor = await runByteInputModel(session, cropUri, model.input_name, model.output_name);

  return {
    kind,
    result: topPredictionsFromTensor(outputTensor, model.classes, 5),
  };
}

function annotateDisplayLabel(
  detections: OfflineDetection[],
  sourceIndex: number,
  classification: OfflineClassification | null,
): void {
  const topPrediction = classification?.result?.top_predictions?.[0];
  if (!topPrediction || !detections[sourceIndex]) {
    return;
  }

  detections[sourceIndex] = {
    ...detections[sourceIndex],
    display_name: topPrediction.class,
    display_confidence: topPrediction.confidence,
  };
}

async function runSpoofGuard(
  image: NormalizedImage,
  sessions: RuntimeSessions,
  enabled: boolean,
): Promise<OfflineSpoofCheck> {
  const modelName = manifest.models.spoof_guard.checkpoint;

  if (!enabled) {
    return {
      enabled: false,
      blocked: false,
      suspected: false,
      decision: 'disabled',
      score: 0,
      threshold: manifest.pipeline_defaults.spoof_guard_threshold,
      source: 'disabled',
      model: modelName,
      model_result: null,
      heuristics: null,
      reasons: [],
    };
  }

  const tensor = await runByteInputModel(
    sessions.spoof_guard,
    image.uri,
    manifest.models.spoof_guard.input_name,
    manifest.models.spoof_guard.output_name,
  );

  const candidates: OfflineSpoofModelPrediction[] = tensorRows(tensor, 6)
    .map((row) => {
      const [x1, y1, x2, y2, confidence] = row;
      const width = Math.max(0, x2 - x1);
      const height = Math.max(0, y2 - y1);
      const areaRatio = (width * height) / Math.max(1, image.width * image.height);
      const sizeFactor = 0.6 + (0.4 * Math.min(1, areaRatio / 0.35));
      const score = clamp(confidence * sizeFactor, 0, 1);
      return {
        class: 'screen',
        confidence: round4(confidence),
        box_area_ratio: round4(areaRatio),
        score: round4(score),
      };
    })
    .filter((prediction) => prediction.confidence > 0.05)
    .sort((a, b) => (b.score || 0) - (a.score || 0));

  const spoofProbability = round4(candidates[0]?.score || 0);
  const liveProbability = round4(1 - spoofProbability);
  const threshold = manifest.pipeline_defaults.spoof_guard_threshold;
  const suspected = spoofProbability >= threshold;
  const blocked = Boolean(suspected && manifest.pipeline_defaults.spoof_guard_block_on_detect);

  const reasons: string[] = [];
  if (suspected) {
    reasons.push(`Screen-like content detected with ${Math.round(spoofProbability * 100)}% risk.`);
  } else if (candidates.length) {
    reasons.push('Screen-like content detected below the blocking threshold.');
  } else {
    reasons.push('No obvious screen-like content detected.');
  }

  return {
    enabled: true,
    blocked,
    suspected,
    decision: blocked ? 'block' : suspected ? 'warn' : 'allow',
    score: spoofProbability,
    threshold,
    source: 'model_only',
    model: modelName,
    model_result: {
      spoof_probability: spoofProbability,
      live_probability: liveProbability,
      top_predictions: candidates.slice(0, 3),
      reasons,
    },
    heuristics: null,
    reasons,
  };
}

function normalizeRequestedTopK(topKTargets: number): number {
  const requested = Number.isFinite(topKTargets) ? Math.round(topKTargets) : 1;
  return clamp(requested, 1, manifest.pipeline_defaults.pipeline_max_topk_targets);
}

function emptyResult(
  requestedTopK: number,
  spoofCheck: OfflineSpoofCheck,
): OfflinePipelineResult {
  return {
    pipeline_models: pipelineModelNames(),
    spoof_check: spoofCheck,
    detector: {
      type: 'detector',
      detections: [],
    },
    requested_top_k_targets: requestedTopK,
    target: null,
    classification: null,
    candidates: [],
  };
}

export async function getOfflinePipelineStatus(): Promise<OfflinePipelineStatus> {
  const state = await ensureRuntime();
  return state.status;
}

export async function runOfflineInference(
  uri: string,
  options: OfflineRunOptions,
): Promise<PipelineResponse> {
  try {
    const state = await ensureRuntime();
    if (!state.status.ready || !state.sessions) {
      return {
        error: state.status.error || 'Offline runtime is not ready on this device.',
      };
    }

    const normalizedImage = await normalizeInputImage(uri);
    const requestedTopK = normalizeRequestedTopK(options.topKTargets);
    const spoofCheck = await runSpoofGuard(
      normalizedImage,
      state.sessions,
      options.spoofGuardEnabled,
    );
    const result = emptyResult(requestedTopK, spoofCheck);

    if (spoofCheck.blocked) {
      result.warning =
        'Potential screen spoofing attack detected. Show physical currency directly to the camera and try again.';
      return {
        kind: 'offline_pipeline',
        result,
      };
    }

    const detectorTensor = await runByteInputModel(
      state.sessions.detector,
      normalizedImage.uri,
      manifest.models.detector.input_name,
      manifest.models.detector.output_name,
    );
    const detections = parseDetections(
      detectorTensor,
      manifest.models.detector,
      normalizedImage,
      manifest.pipeline_defaults,
      options.confidenceThreshold,
    );
    result.detector = { type: 'detector', detections };

    const rankedTargets = rankTargets(detections, manifest.pipeline_defaults).slice(0, requestedTopK);
    if (!rankedTargets.length) {
      return {
        kind: 'offline_pipeline',
        result,
      };
    }

    result.target = publicTarget(rankedTargets[0]);

    for (let index = 0; index < rankedTargets.length; index += 1) {
      const candidate = rankedTargets[index];
      const classification = await classifyCandidate(normalizedImage, candidate, state.sessions);
      annotateDisplayLabel(detections, candidate._source_index, classification);

      const entry: OfflineCandidate = {
        rank: index + 1,
        kind: candidate._target_kind,
        target: publicTarget(candidate),
        classification,
      };

      if (index === 0) {
        result.classification = classification;
        result.target = publicTarget(candidate);
      }

      result.candidates.push(entry);
    }

    result.detector = { type: 'detector', detections };

    return {
      kind: 'offline_pipeline',
      result,
    };
  } catch (error) {
    return {
      error: messageFromError(error),
    };
  }
}

export async function releaseOfflinePipeline(): Promise<void> {
  if (!runtimePromise) {
    return;
  }

  const state = await runtimePromise;
  if (state.sessions) {
    await Promise.all(
      Object.values(state.sessions).map(async (session) => {
        try {
          await session.release();
        } catch {
          // Ignore cleanup failures during teardown.
        }
      }),
    );
  }

  runtimePromise = null;
}
