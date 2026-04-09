import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    AccessibilityInfo,
    ActivityIndicator,
    AppState,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SaveFormat, manipulateAsync } from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import GradientButton from '../components/GradientButton';
import DetectionCard from '../components/DetectionCard';
import DetectionOverlay from '../components/DetectionOverlay';
import DebugPanel from '../components/DebugPanel';
import WebLiveCamera, { WebLiveCameraRef } from '../components/WebLiveCamera';
import ImageWithOverlay from '../components/ImageWithOverlay';
import { useSettings } from '../contexts/SettingsContext';
import { useHistory } from '../contexts/HistoryContext';
import { useThemeColors } from '../contexts/ThemeContext';
import { appendCameraDiagnosticsEntry, getCameraDiagnosticsLogUri } from '../services/cameraDiagnostics';
import { runOfflineInference } from '../services/offlinePipeline';
import { buildApiUrl, HOSTED_API_BASE_URL, resolveReachableApiBase } from '../services/serverApi';
import { spacing, radii, shadows } from '../theme';

type PipelineResponse = {
    kind?: string;
    result?: any;
    error?: string;
};

const DENOM_VALUES: Record<string, number> = {
    CAD_5: 5, CAD_10: 10, CAD_20: 20, CAD_50: 50, CAD_100: 100,
    CAD_1C: 0.01, CAD_5C: 0.05, CAD_10C: 0.10, CAD_25C: 0.25, CAD_0_01: 0.01, CAD_0_05: 0.05, CAD_0_10: 0.10, CAD_0_25: 0.25,
    CAD_1: 1, CAD_2: 2, PENNY: 0.01, LOONIE: 1, TOONIE: 2, NICKEL: 0.05, DIME: 0.10, QUARTER: 0.25,
};
const COIN_NUMERIC_CLASS_ALIASES: Record<string, string> = {
    // Current pinned coin classifier uses numeric class labels (0..5).
    '0': 'PENNY',
    '1': 'NICKEL',
    '2': 'DIME',
    '3': 'QUARTER',
    '4': 'LOONIE',
    '5': 'TOONIE',
};
const DENOM_ALIASES: Record<string, string> = {
    ONECENT: 'PENNY',
    ONE_CENT: 'PENNY',
    '1CENT': 'PENNY',
    '1_CENT': 'PENNY',
    FIVECENT: 'NICKEL',
    FIVE_CENT: 'NICKEL',
    '5CENT': 'NICKEL',
    '5_CENT': 'NICKEL',
    TENCENT: 'DIME',
    TEN_CENT: 'DIME',
    '10CENT': 'DIME',
    '10_CENT': 'DIME',
    TWENTYFIVECENT: 'QUARTER',
    TWENTY_FIVE_CENT: 'QUARTER',
    '25CENT': 'QUARTER',
    '25_CENT': 'QUARTER',
    CAD_01: 'CAD_0_01',
    CAD_05: 'CAD_0_05',
};
const GUARANTEED_CLASSIFIER_MIN_CONF = 0.70;

const LIVE_STABILITY_DEFAULT_WINDOW_MS = 3000;
const LIVE_STABILITY_DEFAULT_MIN_FRAMES = 3;
const LIVE_STABILITY_DEFAULT_IOU_THRESHOLD = 0.45;
const LIVE_STABILITY_HOLD_MS = 1200;
const LIVE_TOP_K_TARGETS = 5;
const STILL_TOP_K_TARGETS = 5;
const DISPLAY_MAX_DETECTIONS = 5;
const CAMERA_READY_TIMEOUT_MS = 2500;
const CAMERA_READY_MAX_RETRIES = 3;
const CAMERA_EVENT_DEDUP_WINDOW_MS = 800;
const CAMERA_NOISY_EVENTS = new Set([
    'camera_view_layout',
    'camera_preview_layout',
]);

type StableTarget = {
    className: string;
    xyxy: [number, number, number, number];
};

type LiveStabilityStatus = {
    mode: 'idle' | 'stabilizing' | 'stable';
    className: string | null;
    seenFrames: number;
    elapsedMs: number;
    remainingMs: number;
};

type LiveStabilityRefState = {
    candidate: StableTarget | null;
    candidateStartedAt: number;
    candidateFrames: number;
    lastStableAt: number;
    lastStableResult: PipelineResponse | null;
};

type ServerUploadAsset = {
    uri: string;
    name: string;
    type: string;
};

type CameraDebugEvent = {
    ts: string;
    event: string;
    details?: string;
};

const LIVE_STABILITY_IDLE: LiveStabilityStatus = {
    mode: 'idle',
    className: null,
    seenFrames: 0,
    elapsedMs: 0,
    remainingMs: LIVE_STABILITY_DEFAULT_WINDOW_MS,
};

function _extractDetections(res: PipelineResponse | null): any[] {
    const dets = res?.result?.detector?.detections || res?.result?.detections || [];
    if (!Array.isArray(dets)) return [];
    return dets;
}

function _extractStableTarget(res: PipelineResponse | null): StableTarget | null {
    const target = res?.result?.target;
    if (target?.class_name && Array.isArray(target?.xyxy) && target.xyxy.length >= 4) {
        return {
            className: String(target.class_name),
            xyxy: [
                Number(target.xyxy[0] || 0),
                Number(target.xyxy[1] || 0),
                Number(target.xyxy[2] || 0),
                Number(target.xyxy[3] || 0),
            ],
        };
    }

    const dets = _extractDetections(res);
    if (!Array.isArray(dets) || dets.length === 0) return null;
    const best = [...dets].sort((a: any, b: any) => (Number(b?.confidence || 0) - Number(a?.confidence || 0)))[0];
    if (!best?.class_name || !Array.isArray(best?.xyxy) || best.xyxy.length < 4) return null;
    return {
        className: String(best.class_name),
        xyxy: [
            Number(best.xyxy[0] || 0),
            Number(best.xyxy[1] || 0),
            Number(best.xyxy[2] || 0),
            Number(best.xyxy[3] || 0),
        ],
    };
}

function _iou(a: [number, number, number, number], b: [number, number, number, number]): number {
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
    const iw = Math.max(0, ix2 - ix1);
    const ih = Math.max(0, iy2 - iy1);
    const inter = iw * ih;
    if (inter <= 0) return 0;
    const aArea = Math.max(0, ax2 - ax1) * Math.max(0, ay2 - ay1);
    const bArea = Math.max(0, bx2 - bx1) * Math.max(0, by2 - by1);
    const union = aArea + bArea - inter;
    return union > 0 ? inter / union : 0;
}

function _isStableMatch(a: StableTarget, b: StableTarget, iouThreshold: number): boolean {
    if (a.className !== b.className) return false;
    return _iou(a.xyxy, b.xyxy) >= iouThreshold;
}

function _normalizeCurrencyClassName(classNameRaw: unknown): string {
    const className = String(classNameRaw || '').trim().toUpperCase();
    if (!className) return '';

    const compact = className.replace(/\s+/g, '').replace(/-/g, '_');
    if (DENOM_ALIASES[compact] !== undefined) return String(DENOM_ALIASES[compact]);
    if (COIN_NUMERIC_CLASS_ALIASES[compact] !== undefined) return String(COIN_NUMERIC_CLASS_ALIASES[compact]);

    const coinIdx = compact.match(/^(?:COIN|CLASS|IDX|LABEL)_?([0-9]{1,2})$/);
    if (coinIdx) {
        const mapped = COIN_NUMERIC_CLASS_ALIASES[coinIdx[1]];
        if (mapped) return mapped;
    }

    return compact;
}

function _classToCadValue(classNameRaw: unknown): number {
    const compact = _normalizeCurrencyClassName(classNameRaw);
    if (!compact) return 0;
    if (DENOM_VALUES[compact] !== undefined) return Number(DENOM_VALUES[compact]);

    const wholeCad = compact.match(/^CAD_?(\d{1,3})$/);
    if (wholeCad) return Number(wholeCad[1]);

    const centsCad = compact.match(/^CAD_?(\d{1,3})(C|CENT|CENTS)$/);
    if (centsCad) return Number(centsCad[1]) / 100;

    const decimalCad = compact.match(/^CAD_?(\d+)[_.](\d+)$/);
    if (decimalCad) return Number(`${decimalCad[1]}.${decimalCad[2]}`);

    return 0;
}

function _formatCad(amount: number): string {
    const safe = Number.isFinite(amount) ? amount : 0;
    return `CAD $${safe.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function _isCoinClassName(classNameRaw: unknown): boolean {
    const className = String(classNameRaw || '').trim().toLowerCase();
    if (!className) return false;
    return className === 'coin' || className.includes('coin');
}

function _toCadSpeech(amount: number): string {
    const safe = Number.isFinite(amount) ? Math.max(0, amount) : 0;
    const dollars = Math.floor(safe + 1e-9);
    const cents = Math.round((safe - dollars) * 100);
    if (cents === 0) {
        return `${dollars} dollar${dollars === 1 ? '' : 's'}`;
    }
    if (dollars === 0) {
        return `${cents} cent${cents === 1 ? '' : 's'}`;
    }
    return `${dollars} dollar${dollars === 1 ? '' : 's'} and ${cents} cent${cents === 1 ? '' : 's'}`;
}

function _computeGuaranteedClassifierSummary(res: PipelineResponse | null): {
    total: number;
    items: Array<{ rank: number; className: string; value: number; confidence: number }>;
    thresholdPct: number;
} {
    const candidates = Array.isArray(res?.result?.candidates) ? res.result.candidates : [];
    const fallback = res?.result?.classification
        ? [{ rank: 1, classification: res.result.classification }]
        : [];
    const source = candidates.length > 0 ? candidates : fallback;

    const items = source
        .map((cand: any, idx: number) => {
            const top1 = cand?.classification?.result?.top_predictions?.[0];
            if (!top1) return null;
            const confidence = Number(top1?.confidence || 0);
            if (confidence < GUARANTEED_CLASSIFIER_MIN_CONF) return null;
            const classNameRaw = String(top1?.class || '').trim();
            const className = _normalizeCurrencyClassName(classNameRaw) || classNameRaw;
            const value = _classToCadValue(className);
            if (!(value > 0)) return null;
            return {
                rank: Number(cand?.rank || idx + 1),
                className,
                value,
                confidence,
            };
        })
        .filter((v: any) => Boolean(v));

    const total = items.reduce((sum: number, item: any) => sum + Number(item.value || 0), 0);
    return {
        total,
        items,
        thresholdPct: Math.round(GUARANTEED_CLASSIFIER_MIN_CONF * 100),
    };
}

function _toDebugString(value: unknown): string {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (value instanceof Error) {
        return `${value.name}: ${value.message}${value.stack ? `\n${value.stack}` : ''}`;
    }
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}

function _buildCameraErrorMessage(fallback: string, error: unknown): string {
    const record = (error && typeof error === 'object') ? (error as Record<string, unknown>) : null;
    const message = record && typeof record.message === 'string' ? record.message : '';
    const code = record && (typeof record.code === 'string' || typeof record.code === 'number')
        ? String(record.code)
        : '';
    const name = record && typeof record.name === 'string' ? record.name : '';
    const reason = record && typeof record.reason === 'string' ? record.reason : '';

    const summary = [message, code, name, reason]
        .map((value) => String(value || '').trim())
        .filter((value, index, array) => Boolean(value) && array.indexOf(value) === index)
        .join(' | ');

    return summary ? `${fallback}: ${summary}` : fallback;
}

function _truncateLine(value: string, max = 220): string {
    if (value.length <= max) return value;
    return `${value.slice(0, max - 3)}...`;
}

/* ── Main screen ───────────────────────────── */
export default function InferenceScreen() {
    const { settings, update } = useSettings();
    const { add: addHistory } = useHistory();
    const { tc, typography: typ } = useThemeColors();
    const isAndroid = Platform.OS === 'android';
    const liveStabilityWindowMs = Math.max(
        1000,
        Math.round((Number(settings.liveStabilityWindowSec) || (LIVE_STABILITY_DEFAULT_WINDOW_MS / 1000)) * 1000),
    );
    const liveStabilityMinFrames = Math.max(
        1,
        Math.round(Number(settings.liveStabilityMinFrames) || LIVE_STABILITY_DEFAULT_MIN_FRAMES),
    );
    const liveStabilityIouThreshold = Math.min(
        0.95,
        Math.max(0.10, Number(settings.liveStabilityIou) || LIVE_STABILITY_DEFAULT_IOU_THRESHOLD),
    );

    const [imageUri, setImageUri] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<PipelineResponse | null>(null);
    const [livePreviewResult, setLivePreviewResult] = useState<PipelineResponse | null>(null);
    const [cameraActive, setCameraActive] = useState(false);
    const [liveRunning, setLiveRunning] = useState(false);
    const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('back');
    const [cameraSessionKey, setCameraSessionKey] = useState(0);
    const [cameraReady, setCameraReady] = useState(false);
    const [cameraReadyRetryCount, setCameraReadyRetryCount] = useState(0);
    const [cameraPreviewSize, setCameraPreviewSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
    const [cameraCaptureSize, setCameraCaptureSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
    const [cameraDebugEvents, setCameraDebugEvents] = useState<CameraDebugEvent[]>([]);
    const [permission, requestPermission] = useCameraPermissions();
    const [timing, setTiming] = useState<number | null>(null);
    const [liveStability, setLiveStability] = useState<LiveStabilityStatus>({
        ...LIVE_STABILITY_IDLE,
        remainingMs: liveStabilityWindowMs,
    });

    const cameraRef = useRef<CameraView | null>(null);
    const webCamRef = useRef<WebLiveCameraRef>(null);
    const liveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const cameraReadyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const cameraReadySettleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const cameraReadySessionRef = useRef<string>('');
    const cameraReadyRetryCountRef = useRef(0);
    const cameraLogDedupRef = useRef<Record<string, { details: string; at: number }>>({});
    const captureInFlightRef = useRef(false);
    const liveRunningRef = useRef(false);
    const lastAnnouncementKeyRef = useRef<string>('');
    const lastAnnouncementAtRef = useRef<number>(0);
    const liveStabilityRef = useRef<LiveStabilityRefState>({
        candidate: null,
        candidateStartedAt: 0,
        candidateFrames: 0,
        lastStableAt: 0,
        lastStableResult: null,
    });

    const inferUrl = useMemo(
        () => settings.inferenceMode === 'offline'
            ? 'on-device://bundled-pipeline'
            : buildApiUrl(settings.apiBaseUrl, '/api/pipeline/infer'),
        [settings.apiBaseUrl, settings.inferenceMode]
    );
    const isOfflineMode = settings.inferenceMode === 'offline';
    const cameraLogFileUri = useMemo(() => getCameraDiagnosticsLogUri(), []);

    const logCameraEvent = useCallback((event: string, details?: unknown) => {
        const detailsText = _toDebugString(details);
        const detailsKey = detailsText || '';
        const dedupeKey = `${event}::${detailsKey}`;
        const now = Date.now();
        const prev = cameraLogDedupRef.current[dedupeKey];
        if (prev && (now - prev.at) < CAMERA_EVENT_DEDUP_WINDOW_MS) {
            return;
        }
        cameraLogDedupRef.current[dedupeKey] = {
            details: detailsKey,
            at: now,
        };
        const entry: CameraDebugEvent = {
            ts: new Date().toISOString(),
            event,
            details: detailsText || undefined,
        };
        if (!CAMERA_NOISY_EVENTS.has(event)) {
            setCameraDebugEvents((prev) => [entry, ...prev].slice(0, 40));
            appendCameraDiagnosticsEntry(entry);
        }
        if (settings.debugModeEnabled) {
            if (detailsText) {
                console.log(`[camera] ${event}: ${detailsText}`);
            } else {
                console.log(`[camera] ${event}`);
            }
        }
    }, [settings.debugModeEnabled]);

    const effectiveResult = useMemo(
        () => (liveRunning ? (livePreviewResult || result) : result),
        [liveRunning, livePreviewResult, result],
    );

    const allDetections = useMemo(() => _extractDetections(effectiveResult), [effectiveResult]);
    const detections = useMemo(
        () =>
            [...allDetections]
                .sort((a: any, b: any) => Number(b?.confidence || 0) - Number(a?.confidence || 0))
                .slice(0, DISPLAY_MAX_DETECTIONS),
        [allDetections],
    );

    const pipelineModels = useMemo(() => effectiveResult?.result?.pipeline_models || null, [effectiveResult]);
    const spoofCheck = useMemo(() => effectiveResult?.result?.spoof_check || null, [effectiveResult]);
    const topCandidates = useMemo(
        () => (Array.isArray(result?.result?.candidates) ? result?.result?.candidates : []),
        [result],
    );
    const guaranteedClassifierSummary = useMemo(() => _computeGuaranteedClassifierSummary(result), [result]);
    const cameraDebugData = useMemo(() => ({
        active: cameraActive,
        ready: cameraReady,
        readyRetries: cameraReadyRetryCount,
        facing: cameraFacing,
        previewSize: cameraPreviewSize,
        captureSize: cameraCaptureSize,
        logFileUri: cameraLogFileUri,
        permission: permission
            ? permission.granted ? 'granted' : permission.canAskAgain ? 'prompt' : 'denied'
            : 'unknown',
        events: cameraDebugEvents,
    }), [cameraActive, cameraCaptureSize, cameraDebugEvents, cameraFacing, cameraPreviewSize, cameraReady, cameraReadyRetryCount, cameraLogFileUri, permission]);
    const latestCameraEvent = useMemo(() => cameraDebugEvents[0] || null, [cameraDebugEvents]);

    const clearCameraReadyTimer = useCallback(() => {
        if (cameraReadyTimerRef.current) {
            clearTimeout(cameraReadyTimerRef.current);
            cameraReadyTimerRef.current = null;
        }
    }, []);
    const clearCameraReadySettleTimer = useCallback(() => {
        if (cameraReadySettleTimerRef.current) {
            clearTimeout(cameraReadySettleTimerRef.current);
            cameraReadySettleTimerRef.current = null;
        }
    }, []);

    useEffect(() => {
        logCameraEvent('camera_log_session_started', {
            platform: Platform.OS,
            inferenceMode: settings.inferenceMode,
            logFileUri: cameraLogFileUri || 'unavailable',
        });
    }, [cameraLogFileUri, logCameraEvent, settings.inferenceMode]);

    const speakAnnouncement = useCallback((text: string) => {
        const msg = String(text || '').trim();
        if (!msg) return;

        if (Platform.OS === 'web') {
            const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
            if (synth) {
                try {
                    synth.cancel();
                    const utterance = new SpeechSynthesisUtterance(msg);
                    utterance.rate = Math.max(0.5, Math.min(2.0, Number(settings.ttsSpeed || 1)));
                    synth.speak(utterance);
                    return;
                } catch {
                    // Fall through to accessibility announce.
                }
            }
        }

        AccessibilityInfo.announceForAccessibility(msg);
    }, [settings.ttsSpeed]);

    const recordHistory = useCallback(
        (res: PipelineResponse | null, ms: number | null, uri: string | null) => {
            const dets = res?.result?.detector?.detections || res?.result?.detections || [];
            const guaranteedTotal = _computeGuaranteedClassifierSummary(res).total;
            addHistory({
                imageUri: uri,
                detections: dets,
                classification: res?.result?.classification || null,
                totalValue: res?.error ? null : guaranteedTotal,
                timing: ms,
                error: res?.error || null,
            });
        },
        [addHistory]
    );

    const prepareImageForServerUpload = useCallback(async (uri: string): Promise<ServerUploadAsset> => {
        if (Platform.OS !== 'android') {
            return {
                uri,
                name: 'image.jpg',
                type: 'image/jpeg',
            };
        }

        try {
            const normalized = await manipulateAsync(
                uri,
                [],
                { compress: 0.92, format: SaveFormat.JPEG },
            );
            return {
                uri: normalized.uri,
                name: 'image.jpg',
                type: 'image/jpeg',
            };
        } catch {
            return {
                uri,
                name: 'image.jpg',
                type: 'image/jpeg',
            };
        }
    }, []);

    const resetLiveStability = useCallback(() => {
        liveStabilityRef.current = {
            candidate: null,
            candidateStartedAt: 0,
            candidateFrames: 0,
            lastStableAt: 0,
            lastStableResult: null,
        };
        setLiveStability({
            ...LIVE_STABILITY_IDLE,
            remainingMs: liveStabilityWindowMs,
        });
    }, [liveStabilityWindowMs]);

    const applyLiveStability = useCallback((res: PipelineResponse) => {
        const now = Date.now();
        const state = liveStabilityRef.current;
        const target = _extractStableTarget(res);

        if (!target) {
            // Keep the last stable result briefly so the overlay does not flicker hard.
            if (state.lastStableResult && (now - state.lastStableAt) <= LIVE_STABILITY_HOLD_MS) {
                setLiveStability({
                    mode: 'stable',
                    className: _extractStableTarget(state.lastStableResult)?.className || null,
                    seenFrames: state.candidateFrames,
                    elapsedMs: Math.max(0, now - state.candidateStartedAt),
                    remainingMs: 0,
                });
                return { accepted: true, stableResult: state.lastStableResult };
            }
            state.candidate = null;
            state.candidateFrames = 0;
            state.candidateStartedAt = now;
            setLiveStability({
                mode: 'stabilizing',
                className: null,
                seenFrames: 0,
                elapsedMs: 0,
                remainingMs: liveStabilityWindowMs,
            });
            return { accepted: false as const, stableResult: null };
        }

        if (!state.candidate || !_isStableMatch(state.candidate, target, liveStabilityIouThreshold)) {
            state.candidate = target;
            state.candidateStartedAt = now;
            state.candidateFrames = 1;
        } else {
            state.candidateFrames += 1;
        }

        const elapsedMs = Math.max(0, now - state.candidateStartedAt);
        const isStableByTime = elapsedMs >= liveStabilityWindowMs;
        const isStableByFrames = state.candidateFrames >= liveStabilityMinFrames;
        const accepted = isStableByTime && isStableByFrames;
        const remainingMs = Math.max(0, liveStabilityWindowMs - elapsedMs);

        if (accepted) {
            state.lastStableAt = now;
            state.lastStableResult = res;
            setLiveStability({
                mode: 'stable',
                className: target.className,
                seenFrames: state.candidateFrames,
                elapsedMs,
                remainingMs: 0,
            });
            return { accepted: true as const, stableResult: res };
        }

        setLiveStability({
            mode: 'stabilizing',
            className: target.className,
            seenFrames: state.candidateFrames,
            elapsedMs,
            remainingMs,
        });
        return { accepted: false as const, stableResult: state.lastStableResult };
    }, [liveStabilityIouThreshold, liveStabilityMinFrames, liveStabilityWindowMs]);

    async function pickImage() {
        setResult(null);
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) { setResult({ error: 'Media library permission denied' }); return; }
        const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1 });
        if (picked.canceled || !picked.assets?.length) return;
        setImageUri(picked.assets[0].uri);
    }

    async function runInferWithFormData(
        fd: FormData,
        uri: string | null,
        opts?: { skipHistory?: boolean; isLive?: boolean },
    ) {
        fd.append('spoof_guard_enabled', settings.screenSpoofGuardEnabled ? 'true' : 'false');
        const skipHistory = Boolean(opts?.skipHistory);
        const isLive = Boolean(opts?.isLive);
        setBusy(true);
        const t0 = Date.now();
        let res: PipelineResponse | null = null;
        let ms: number | null = null;
        try {
            let targetInferUrl = inferUrl;
            if (!settings.debugModeEnabled) {
                const probe = await resolveReachableApiBase(settings.apiBaseUrl, 4000);
                if (!probe.ok) {
                    throw new Error(probe.error || 'Backend unreachable');
                }
                if (probe.base !== settings.apiBaseUrl) {
                    update({ apiBaseUrl: probe.base });
                }
                targetInferUrl = buildApiUrl(probe.base, '/api/pipeline/infer');
            }

            const response = await fetch(targetInferUrl, { method: 'POST', body: fd });
            const contentType = (response.headers.get('content-type') || '').toLowerCase();
            const body = contentType.includes('application/json') ? await response.json() : await response.text();
            if (!response.ok) {
                const detail = (body && (body.detail || body.error)) || JSON.stringify(body);
                throw new Error(detail);
            }
            res = body as PipelineResponse;
            ms = Date.now() - t0;
            if (isLive) {
                setLivePreviewResult(res);
                const stable = applyLiveStability(res);
                if (stable.stableResult) {
                    setResult(stable.stableResult);
                }
                if (stable.accepted) {
                    setTiming(ms);
                }
            } else {
                setLivePreviewResult(null);
                setResult(res);
                setTiming(ms);
                setLiveStability({
                    ...LIVE_STABILITY_IDLE,
                    remainingMs: liveStabilityWindowMs,
                });
            }
        } catch (e: any) {
            ms = Date.now() - t0;
            res = { error: e?.message || String(e) };
            setResult(res);
            setTiming(ms);
            if (isLive) {
                setLivePreviewResult(null);
                resetLiveStability();
            }
        } finally {
            setBusy(false);
            if (!skipHistory) recordHistory(res, ms, uri);
        }
    }

    async function runInferOffline(
        uri: string,
        opts?: { skipHistory?: boolean; isLive?: boolean },
    ) {
        const skipHistory = Boolean(opts?.skipHistory);
        const isLive = Boolean(opts?.isLive);
        setBusy(true);
        const t0 = Date.now();
        let res: PipelineResponse | null = null;
        let ms: number | null = null;
        try {
            res = await runOfflineInference(uri, {
                topKTargets: isLive ? LIVE_TOP_K_TARGETS : STILL_TOP_K_TARGETS,
                spoofGuardEnabled: settings.screenSpoofGuardEnabled,
                confidenceThreshold: settings.confidenceThreshold,
            });
            ms = Date.now() - t0;

            if (res?.error) {
                throw new Error(res.error);
            }

            if (isLive) {
                setLivePreviewResult(res);
                const stable = applyLiveStability(res);
                if (stable.stableResult) {
                    setResult(stable.stableResult);
                }
                if (stable.accepted) {
                    setTiming(ms);
                }
            } else {
                setLivePreviewResult(null);
                setResult(res);
                setTiming(ms);
                setLiveStability({
                    ...LIVE_STABILITY_IDLE,
                    remainingMs: liveStabilityWindowMs,
                });
            }
        } catch (e: any) {
            ms = Date.now() - t0;
            res = { error: e?.message || String(e) };
            setResult(res);
            setTiming(ms);
            if (isLive) {
                setLivePreviewResult(null);
                resetLiveStability();
            }
        } finally {
            setBusy(false);
            if (!skipHistory) recordHistory(res, ms, uri);
        }
    }

    async function runInferFromUri(uri: string, isLive = false) {
        if (isOfflineMode) {
            await runInferOffline(uri, { skipHistory: isLive, isLive });
            return;
        }
        const fd = new FormData();
        if (Platform.OS === 'web') {
            const blob = await (await fetch(uri)).blob();
            fd.append('file', blob, 'image.jpg');
        } else {
            const uploadAsset = await prepareImageForServerUpload(uri);
            fd.append('file', uploadAsset as any);
        }
        fd.append('top_k_targets', isLive ? String(LIVE_TOP_K_TARGETS) : String(STILL_TOP_K_TARGETS));
        await runInferWithFormData(fd, uri, { skipHistory: isLive, isLive });
    }

    async function runInfer() {
        if (!imageUri) { setResult({ error: 'Pick an image first' }); return; }
        setLivePreviewResult(null);
        setResult(null);
        setTiming(null);
        await runInferFromUri(imageUri, false);
    }

    const stopCamera = useCallback((reason = 'manual') => {
        logCameraEvent('camera_stop', {
            reason,
            wasActive: cameraActive,
            wasLive: liveRunningRef.current,
        });
        clearCameraReadyTimer();
        clearCameraReadySettleTimer();
        setCameraActive(false);
        setCameraReady(false);
        setCameraReadyRetryCount(0);
        cameraReadyRetryCountRef.current = 0;
        cameraReadySessionRef.current = '';
        captureInFlightRef.current = false;
        setLiveRunning(false);
        setCameraPreviewSize({ width: 0, height: 0 });
        setCameraCaptureSize({ width: 0, height: 0 });
        liveRunningRef.current = false;
        if (liveTimerRef.current) { clearTimeout(liveTimerRef.current); liveTimerRef.current = null; }
        setLivePreviewResult(null);
        resetLiveStability();
    }, [cameraActive, clearCameraReadySettleTimer, clearCameraReadyTimer, logCameraEvent, resetLiveStability]);

    async function startCamera() {
        logCameraEvent('camera_start_requested', {
            platform: Platform.OS,
            permissionKnown: Boolean(permission),
            permissionGranted: permission?.granted ?? null,
            canAskAgain: permission?.canAskAgain ?? null,
        });
        if (Platform.OS !== 'web' && !permission?.granted) {
            const p = await requestPermission();
            logCameraEvent('camera_permission_result', { granted: p.granted, canAskAgain: p.canAskAgain });
            if (!p.granted) { setResult({ error: 'Camera permission denied' }); return; }
        }
        setResult(null);
        setLivePreviewResult(null);
        resetLiveStability();
        clearCameraReadyTimer();
        clearCameraReadySettleTimer();
        setCameraReady(false);
        setCameraReadyRetryCount(0);
        cameraReadyRetryCountRef.current = 0;
        cameraReadySessionRef.current = '';
        captureInFlightRef.current = false;
        setCameraPreviewSize({ width: 0, height: 0 });
        setCameraCaptureSize({ width: 0, height: 0 });
        setCameraSessionKey((prev) => prev + 1);
        setCameraActive(true);
        logCameraEvent('camera_active_true');
    }

    async function captureStillWithSystemCamera(opts?: { restartPreviewOnCancel?: boolean }) {
        const restartPreviewOnCancel = Boolean(opts?.restartPreviewOnCancel);
        logCameraEvent('system_camera_open_requested', { facing: cameraFacing });
        const cameraPerm = await ImagePicker.requestCameraPermissionsAsync();
        logCameraEvent('system_camera_permission_result', {
            granted: cameraPerm.granted,
            canAskAgain: cameraPerm.canAskAgain,
        });
        if (!cameraPerm.granted) {
            setResult({ error: 'Camera permission denied' });
            return;
        }

        stopCamera('switch_to_system_camera');
        await new Promise((resolve) => setTimeout(resolve, 150));

        let captured: ImagePicker.ImagePickerResult;
        try {
            captured = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 1,
                allowsEditing: false,
                base64: false,
                exif: false,
                cameraType: cameraFacing === 'front' ? ImagePicker.CameraType.front : ImagePicker.CameraType.back,
            });
        } catch (error: any) {
            const message = _buildCameraErrorMessage('Failed to capture image', error);
            logCameraEvent('system_camera_open_failed', {
                message,
                name: error?.name,
                code: error?.code,
                stack: error?.stack,
                raw: error,
            });
            setResult({ error: message });
            return;
        }

        if (captured.canceled || !captured.assets?.length) {
            logCameraEvent('system_camera_canceled');
            setResult(null);
            if (restartPreviewOnCancel) {
                await startCamera();
            }
            return;
        }

        const asset = captured.assets[0];
        if (!asset.uri) {
            logCameraEvent('system_camera_no_uri', { asset });
            setResult({
                error: _buildCameraErrorMessage(
                    'Camera capture returned no image',
                    { assetWidth: asset.width, assetHeight: asset.height, fileName: asset.fileName },
                ),
            });
            return;
        }

        logCameraEvent('system_camera_captured', {
            uri: asset.uri,
            width: asset.width,
            height: asset.height,
            fileSize: asset.fileSize,
        });
        if (Number(asset.width) > 0 && Number(asset.height) > 0) {
            setCameraCaptureSize({ width: Number(asset.width), height: Number(asset.height) });
        }
        setImageUri(asset.uri);
        await runInferFromUri(asset.uri, false);
    }

    async function captureAndInferOnce() {
        /* ── Web path: capture frame from live video stream ── */
        if (Platform.OS === 'web') {
            if (!webCamRef.current) { setResult({ error: 'Camera not ready' }); return; }
            const isLive = liveRunningRef.current;
            if (!isLive) { setResult(null); setTiming(null); }
            try {
                const blob = await webCamRef.current.captureFrameBlob();
                if (!blob) { if (!isLive) setResult({ error: 'Frame capture failed' }); return; }
                const fd = new FormData();
                fd.append('file', blob, 'frame.jpg');
                fd.append('top_k_targets', String(isLive ? LIVE_TOP_K_TARGETS : STILL_TOP_K_TARGETS));
                let uri: string | null = null;
                if (!isLive) {
                    uri = URL.createObjectURL(blob);
                    setImageUri(uri);
                }
                await runInferWithFormData(fd, uri, { skipHistory: isLive, isLive });
            } catch (e: any) {
                setResult({ error: e?.message || String(e) });
            }
            return;
        }

        /* ── Native path: takePictureAsync ── */
        if (!cameraReady) {
            logCameraEvent('camera_capture_blocked_not_ready', {
                cameraActive,
                previewSize: cameraPreviewSize,
                retries: cameraReadyRetryCountRef.current,
            });
            setResult({
                error: `Camera is still initializing (preview=${cameraPreviewSize.width}x${cameraPreviewSize.height}). Please wait a moment and try again.`,
            });
            return;
        }

        if (!cameraRef.current) {
            logCameraEvent('camera_capture_without_ref', {
                cameraActive,
                previewSize: cameraPreviewSize,
                captureSize: cameraCaptureSize,
            });
            setResult({
                error: `Camera not ready yet (active=${cameraActive ? 'yes' : 'no'}, preview=${cameraPreviewSize.width}x${cameraPreviewSize.height})`,
            });
            return;
        }
        if (captureInFlightRef.current) {
            logCameraEvent('camera_capture_blocked_inflight');
            return;
        }

        captureInFlightRef.current = true;
        try {
            const isLive = liveRunningRef.current;
            logCameraEvent('camera_capture_requested', {
                isLive,
                facing: cameraFacing,
                previewSize: cameraPreviewSize,
                captureSize: cameraCaptureSize,
            });
            if (!isLive) {
                setResult(null);
                setTiming(null);
            }
            let shot: any = null;
            try {
                if (Platform.OS === 'android') {
                    await new Promise((resolve) => setTimeout(resolve, 120));
                }
                shot = await cameraRef.current.takePictureAsync({
                    quality: 0.92,
                    skipProcessing: false,
                    exif: false,
                } as any);
            } catch (e: any) {
                const message = _buildCameraErrorMessage('Camera capture failed', e);
                logCameraEvent('camera_capture_failed', {
                    message,
                    name: e?.name,
                    code: e?.code,
                    stack: e?.stack,
                    raw: e,
                });

                const shouldRetrySafeCapture = Platform.OS === 'android'
                    && String(e?.code || '').toUpperCase().includes('ERR_IMAGE_CAPTURE_FAILED');
                if (shouldRetrySafeCapture && cameraRef.current) {
                    try {
                        logCameraEvent('camera_capture_retry_safe_mode');
                        try {
                            await cameraRef.current.resumePreview();
                        } catch {
                            // Best effort only; continue with retry.
                        }
                        await new Promise((resolve) => setTimeout(resolve, 450));
                        shot = await cameraRef.current.takePictureAsync({
                            quality: 0.85,
                            skipProcessing: false,
                            exif: false,
                        } as any);
                        logCameraEvent('camera_capture_retry_succeeded', {
                            width: shot?.width,
                            height: shot?.height,
                            uri: shot?.uri,
                        });
                    } catch (retryError: any) {
                        const retryMessage = _buildCameraErrorMessage('Camera capture failed after retry', retryError);
                        logCameraEvent('camera_capture_retry_failed', {
                            message: retryMessage,
                            name: retryError?.name,
                            code: retryError?.code,
                            stack: retryError?.stack,
                            raw: retryError,
                        });
                        setCameraReady(false);
                        cameraReadySessionRef.current = '';
                        setCameraSessionKey((prev) => prev + 1);
                        if (!isLive) {
                            setResult({ error: `${retryMessage}. Opening system camera fallback.` });
                            await captureStillWithSystemCamera({ restartPreviewOnCancel: true });
                            return;
                        }
                        setResult({ error: retryMessage });
                        return;
                    }
                } else {
                    setResult({ error: message });
                    return;
                }
            }

            if (!shot?.uri) {
                logCameraEvent('camera_capture_empty_result', { shot });
                setResult({
                    error: _buildCameraErrorMessage(
                        'Failed to capture frame',
                        {
                            width: (shot as any)?.width,
                            height: (shot as any)?.height,
                            hasBase64: Boolean((shot as any)?.base64),
                        },
                    ),
                });
                return;
            }
            logCameraEvent('camera_capture_succeeded', {
                uri: shot.uri,
                width: shot.width,
                height: shot.height,
                base64: Boolean((shot as any).base64),
            });
            if (Number(shot.width) > 0 && Number(shot.height) > 0) {
                setCameraCaptureSize({ width: Number(shot.width), height: Number(shot.height) });
            }
            setImageUri(shot.uri);
            await runInferFromUri(shot.uri, isLive);
        } finally {
            captureInFlightRef.current = false;
        }
    }

    /** Schedule the next live capture after the current one finishes. */
    function _scheduleLiveCapture() {
        if (!liveRunningRef.current) return;
        const intervalMs = Math.max(200, Math.round(1000 / settings.liveFps));
        liveTimerRef.current = setTimeout(async () => {
            if (!liveRunningRef.current) return;
            await captureAndInferOnce();
            _scheduleLiveCapture();
        }, intervalMs);
    }

    function startLive() {
        if (Platform.OS !== 'web' && !cameraReady) {
            logCameraEvent('camera_live_blocked_not_ready', {
                previewSize: cameraPreviewSize,
                retries: cameraReadyRetryCountRef.current,
            });
            setResult({ error: 'Camera is still initializing. Wait for preview readiness before starting live mode.' });
            return;
        }
        logCameraEvent('camera_live_start', { fps: settings.liveFps });
        if (liveTimerRef.current) { clearTimeout(liveTimerRef.current); liveTimerRef.current = null; }
        setLiveRunning(true);
        liveRunningRef.current = true;
        resetLiveStability();
        _scheduleLiveCapture();
    }

    function stopLive() {
        logCameraEvent('camera_live_stop');
        setLiveRunning(false);
        liveRunningRef.current = false;
        if (liveTimerRef.current) { clearTimeout(liveTimerRef.current); liveTimerRef.current = null; }
        setLivePreviewResult(null);
        resetLiveStability();
    }

    useEffect(() => {
        return () => {
            clearCameraReadyTimer();
            clearCameraReadySettleTimer();
            liveRunningRef.current = false;
            if (liveTimerRef.current) { clearTimeout(liveTimerRef.current); }
        };
    }, [clearCameraReadySettleTimer, clearCameraReadyTimer]);

    useEffect(() => {
        if (Platform.OS === 'web') return;
        clearCameraReadyTimer();
        if (!cameraActive || cameraReady) return;

        cameraReadyTimerRef.current = setTimeout(() => {
            const nextRetry = cameraReadyRetryCountRef.current + 1;
            if (nextRetry <= CAMERA_READY_MAX_RETRIES) {
                cameraReadyRetryCountRef.current = nextRetry;
                setCameraReadyRetryCount(nextRetry);
                logCameraEvent('camera_ready_timeout', {
                    retry: nextRetry,
                    maxRetries: CAMERA_READY_MAX_RETRIES,
                    facing: cameraFacing,
                    previewSize: cameraPreviewSize,
                });
                setCameraSessionKey((prev) => prev + 1);
                return;
            }

            logCameraEvent('camera_ready_timeout_exceeded', {
                retries: cameraReadyRetryCountRef.current,
                facing: cameraFacing,
                previewSize: cameraPreviewSize,
            });
            stopCamera('camera_ready_timeout');
            setResult({
                error: `Camera preview failed to initialize after ${CAMERA_READY_MAX_RETRIES} retries. Please retry Start Camera or use System Camera.`,
            });
        }, CAMERA_READY_TIMEOUT_MS);

        return clearCameraReadyTimer;
    }, [
        cameraActive,
        cameraFacing,
        cameraPreviewSize,
        cameraReady,
        cameraSessionKey,
        clearCameraReadyTimer,
        logCameraEvent,
        stopCamera,
    ]);

    useEffect(() => {
        if (Platform.OS === 'web' || !cameraActive) return;
        const subscription = AppState.addEventListener('change', (nextState) => {
            logCameraEvent('app_state_change', { nextState });
            if (nextState === 'background') {
                stopCamera('app_background');
            }
        });
        return () => {
            subscription.remove();
        };
    }, [cameraActive, logCameraEvent, stopCamera]);

    useEffect(() => {
        if (liveRunningRef.current) {
            resetLiveStability();
            return;
        }
        setLiveStability((prev) => {
            if (prev.mode !== 'idle') return prev;
            return { ...prev, remainingMs: liveStabilityWindowMs };
        });
    }, [liveStabilityWindowMs, liveStabilityMinFrames, liveStabilityIouThreshold, resetLiveStability]);

    useEffect(() => {
        if (!settings.ttsEnabled) {
            if (Platform.OS === 'web' && typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
            return;
        }
        if (!result || result.error) return;

        const dets = _extractDetections(result);
        const coinCount = dets.filter((d: any) => _isCoinClassName(d?.class_name)).length;
        const billCount = Math.max(0, dets.length - coinCount);
        const guaranteedTotal = Number(guaranteedClassifierSummary.total || 0);

        const key = `${billCount}|${coinCount}|${Math.round(guaranteedTotal * 100)}`;
        if (key === lastAnnouncementKeyRef.current) return;

        const now = Date.now();
        if (now - lastAnnouncementAtRef.current < 1200) return;

        lastAnnouncementKeyRef.current = key;
        lastAnnouncementAtRef.current = now;

        const countLine = (billCount === 0 && coinCount === 0)
            ? 'No bills or coins detected.'
            : `Detected ${billCount} bill${billCount === 1 ? '' : 's'} and ${coinCount} coin${coinCount === 1 ? '' : 's'}.`;
        const totalLine = `Guaranteed total amount is ${_toCadSpeech(guaranteedTotal)}.`;
        speakAnnouncement(`${countLine} ${totalLine}`);
    }, [result, guaranteedClassifierSummary.total, settings.ttsEnabled, speakAnnouncement]);

    useEffect(() => {
        return () => {
            if (Platform.OS === 'web' && typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    /* ── Section wrapper ── */
    const SectionCard = ({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) => (
        <View style={[styles.card, shadows.card, { backgroundColor: tc.surface, borderColor: tc.border }]}>
            <View style={styles.cardHeader}>
                <Ionicons name={icon as any} size={18} color={tc.primary} />
                <Text style={[typ.h3, { color: tc.textPrimary }]}>{title}</Text>
            </View>
            {children}
        </View>
    );

    return (
        <ScrollView style={[styles.container, { backgroundColor: tc.background }]} contentContainerStyle={styles.scroll}>
            {/* ── API Config ── */}
            {settings.debugModeEnabled && (
                <SectionCard title={isOfflineMode ? 'Inference Runtime' : 'API Configuration'} icon="settings-outline">
                    {isOfflineMode ? (
                        <>
                            <View style={[styles.sectionHint, { backgroundColor: tc.accent + '12', borderColor: tc.accent + '35', marginBottom: 0 }]}>
                                <Ionicons name="phone-portrait-outline" size={14} color={tc.accent} />
                                <Text style={[typ.caption, { color: tc.textSecondary, flex: 1 }]}>
                                    Offline mode runs entirely on this device using bundled ONNX models.
                                </Text>
                            </View>
                            <Text style={[typ.caption, { color: tc.textMuted, marginTop: spacing.sm }]}>
                                Runtime: {inferUrl}
                            </Text>
                        </>
                    ) : (
                        <>
                            <View style={styles.inputRow}>
                                <TextInput
                                    value={settings.apiBaseUrl}
                                    onChangeText={(v) => update({ apiBaseUrl: v })}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    placeholder={HOSTED_API_BASE_URL}
                                    placeholderTextColor={tc.textMuted}
                                    style={[styles.textInput, typ.mono, {
                                        backgroundColor: tc.surfaceElevated,
                                        color: tc.textPrimary,
                                        borderColor: tc.border,
                                    }]}
                                />
                            </View>
                            <Text style={[typ.caption, { color: tc.textMuted, marginTop: spacing.xs }]}>
                                Endpoint: {inferUrl}
                            </Text>
                        </>
                    )}
                </SectionCard>
            )}

            {/* ── Upload ── */}
            <SectionCard title="Upload Image" icon="image-outline">
                <View style={styles.buttonRow}>
                    <GradientButton title="Pick Image" onPress={pickImage} variant="outline" size="sm"
                        icon={<Ionicons name="folder-open-outline" size={16} color={tc.primary} />} />
                    <GradientButton
                        title={busy ? 'Running…' : 'Run Inference'}
                        onPress={runInfer}
                        disabled={busy || !imageUri}
                        size="sm"
                        icon={busy ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="play" size={16} color="#FFF" />}
                    />
                </View>
            </SectionCard>

            {/* ── Camera ── */}
            <SectionCard title={Platform.OS === 'web' ? 'Live Camera' : 'Camera'} icon="videocam-outline">
                {!cameraActive ? (
                    <View style={styles.cameraBlock}>
                        <GradientButton title="Start Camera" onPress={startCamera} variant="accent" size="sm"
                            icon={<Ionicons name="camera-outline" size={16} color="#FFF" />} />
                        {isAndroid && (
                            <>
                                <View style={[styles.sectionHint, { backgroundColor: tc.accent + '12', borderColor: tc.accent + '35' }]}>
                                    <Ionicons name="phone-portrait-outline" size={14} color={tc.accent} />
                                    <Text style={[typ.caption, { color: tc.textSecondary, flex: 1 }]}>
                                        Use the in-app preview for scanning. If Android camera capture misbehaves, the system camera is available as a fallback.
                                    </Text>
                                </View>
                                <GradientButton
                                    title="Use System Camera"
                                    onPress={() => captureStillWithSystemCamera({ restartPreviewOnCancel: false })}
                                    disabled={busy}
                                    variant="outline"
                                    size="sm"
                                    icon={<Ionicons name="scan-outline" size={16} color={tc.primary} />}
                                />
                            </>
                        )}
                    </View>
                ) : (
                    <View style={styles.cameraBlock}>
                        {Platform.OS === 'web' ? (
                            <WebLiveCamera
                                ref={webCamRef}
                                facing={cameraFacing}
                                detections={detections}
                                active={cameraActive}
                                height={300}
                                onError={(msg) => {
                                    logCameraEvent('web_camera_error', msg);
                                    setResult({ error: msg });
                                }}
                            />
                        ) : (
                                <View
                                    style={styles.cameraPreviewFrame}
                                    onLayout={(event) => {
                                        const { width, height } = event.nativeEvent.layout;
                                        setCameraPreviewSize((prev) => {
                                            if (prev.width === width && prev.height === height) return prev;
                                            logCameraEvent('camera_preview_layout', { width, height });
                                            return { width, height };
                                        });
                                    }}
                                >
                                    <CameraView
                                        key={`${cameraFacing}-${cameraSessionKey}`}
                                        ref={cameraRef}
                                        style={styles.cameraPreview}
                                        active={cameraActive}
                                        facing={cameraFacing}
                                        ratio={isAndroid ? '4:3' : undefined}
                                        onCameraReady={() => {
                                            clearCameraReadyTimer();
                                            clearCameraReadySettleTimer();
                                            const stabilizeMs = Platform.OS === 'android' ? 500 : 0;
                                            const readySession = `${cameraFacing}-${cameraSessionKey}`;
                                            cameraReadySettleTimerRef.current = setTimeout(() => {
                                                if (cameraReadySessionRef.current === readySession) return;
                                                cameraReadySessionRef.current = readySession;
                                                setCameraReady(true);
                                                logCameraEvent('camera_ready', {
                                                    facing: cameraFacing,
                                                    retryCount: cameraReadyRetryCountRef.current,
                                                    previewSize: cameraPreviewSize,
                                                    stabilizeMs,
                                                });
                                            }, stabilizeMs);
                                        }}
                                        onMountError={(event: any) => {
                                            clearCameraReadyTimer();
                                            clearCameraReadySettleTimer();
                                            setCameraReady(false);
                                            cameraReadySessionRef.current = '';
                                            const payload = event?.nativeEvent || event || null;
                                            logCameraEvent('camera_mount_error', payload);
                                            const message = _buildCameraErrorMessage('Camera failed to start', payload);
                                            setResult({ error: message });
                                        }}
                                    />
                                    <DetectionOverlay
                                        detections={detections}
                                        width={cameraPreviewSize.width}
                                        height={cameraPreviewSize.height}
                                        sourceWidth={cameraCaptureSize.width}
                                        sourceHeight={cameraCaptureSize.height}
                                        resizeMode="cover"
                                        mirrored={cameraFacing === 'front'}
                                    />
                                </View>
                            )}
                            <View style={styles.cameraControls}>
                                <GradientButton
                                    title="Snap"
                                    onPress={captureAndInferOnce}
                                    disabled={busy || (Platform.OS !== 'web' && !cameraReady)}
                                    size="sm"
                                    icon={<Ionicons name="scan-outline" size={14} color="#FFF" />} />
                                {isAndroid && (
                                    <GradientButton
                                        title="System Camera"
                                        onPress={() => captureStillWithSystemCamera({ restartPreviewOnCancel: true })}
                                        variant="outline"
                                        size="sm"
                                        disabled={busy}
                                        icon={<Ionicons name="camera-outline" size={14} color={tc.primary} />}
                                    />
                                )}
                                <GradientButton
                                    title={liveRunning ? 'Stop Live' : `Go Live (${settings.liveFps} fps)`}
                                    onPress={liveRunning ? stopLive : startLive}
                                    variant={liveRunning ? 'outline' : 'accent'}
                                    size="sm"
                                    disabled={busy || (!liveRunning && Platform.OS !== 'web' && !cameraReady)}
                                    icon={<Ionicons name={liveRunning ? 'pause' : 'play'} size={14} color={liveRunning ? tc.primary : '#FFF'} />}
                                />
                                <GradientButton
                                    title={cameraFacing === 'back' ? 'Front' : 'Back'}
                                    onPress={() => {
                                        clearCameraReadySettleTimer();
                                        setCameraReady(false);
                                        setCameraReadyRetryCount(0);
                                        cameraReadyRetryCountRef.current = 0;
                                        cameraReadySessionRef.current = '';
                                        setCameraCaptureSize({ width: 0, height: 0 });
                                        logCameraEvent('camera_facing_toggle', { from: cameraFacing });
                                        setCameraSessionKey((prev) => prev + 1);
                                        setCameraFacing((f) => (f === 'back' ? 'front' : 'back'));
                                    }}
                                    variant="outline" size="sm"
                                    icon={<Ionicons name="camera-reverse-outline" size={14} color={tc.primary} />}
                                />
                            </View>
                            {Platform.OS !== 'web' && !cameraReady && (
                                <View style={[styles.sectionHint, { backgroundColor: tc.warning + '12', borderColor: tc.warning + '35' }]}>
                                    <Ionicons name="time-outline" size={14} color={tc.warning} />
                                    <Text style={[typ.caption, { color: tc.textSecondary, flex: 1 }]}>
                                        {`Starting camera (attempt ${Math.min(cameraReadyRetryCount + 1, CAMERA_READY_MAX_RETRIES + 1)} of ${CAMERA_READY_MAX_RETRIES + 1})...`}
                                    </Text>
                                </View>
                            )}
                            {settings.debugModeEnabled && latestCameraEvent && (
                                <View style={[styles.sectionHint, { backgroundColor: tc.info + '12', borderColor: tc.info + '35' }]}>
                                    <Ionicons name="bug-outline" size={14} color={tc.info} />
                                    <Text style={[typ.caption, { color: tc.textSecondary, flex: 1 }]}>
                                        {`${latestCameraEvent.event}: ${_truncateLine(latestCameraEvent.details || 'no details')}`}
                                    </Text>
                                </View>
                            )}
                            {liveRunning && (
                                <View style={[styles.liveStatus, { backgroundColor: tc.surfaceElevated, borderColor: tc.border }]}>
                                    <Ionicons
                                        name={liveStability.mode === 'stable' ? 'checkmark-circle' : 'time-outline'}
                                        size={14}
                                        color={liveStability.mode === 'stable' ? tc.accent : tc.textMuted}
                                    />
                                    <Text style={[typ.caption, { color: tc.textSecondary, flex: 1 }]}>
                                        {liveStability.mode === 'stable'
                                            ? `Stable ${liveStability.className || ''} (${liveStability.seenFrames} frames)`
                                            : `Stabilizing ${liveStability.className || ''} (${Math.ceil(liveStability.remainingMs / 1000)}s)`}
                                    </Text>
                                </View>
                            )}
                            <GradientButton title="Stop Camera" onPress={stopCamera} variant="outline" size="sm"
                                icon={<Ionicons name="close" size={14} color={tc.primary} />}
                                style={{ marginTop: spacing.sm }} />
                    </View>
                )}
            </SectionCard>

            {/* ── Image preview with bbox overlay ── */}
            {imageUri && (
                <View style={[styles.previewCard, shadows.card, { backgroundColor: tc.surface, borderColor: tc.border }]}>
                    <ImageWithOverlay
                        uri={imageUri}
                        detections={detections}
                        style={[styles.previewImage, { backgroundColor: tc.surfaceElevated }]}
                        resizeMode="contain"
                    />
                </View>
            )}

            {/* ── Processing ── */}
            {busy && (
                <View style={[styles.banner, { backgroundColor: tc.primary + '15', borderColor: tc.primary + '33' }]}>
                    <ActivityIndicator size="small" color={tc.primary} />
                    <Text style={[typ.body, { color: tc.primary }]}>Processing…</Text>
                </View>
            )}

            {/* ── Error ── */}
            {spoofCheck?.suspected && (
                <View
                    style={[
                        styles.banner,
                        shadows.card,
                        {
                            backgroundColor: tc.warning + '15',
                            borderColor: tc.warning + '33',
                        },
                    ]}
                >
                    <Ionicons
                        name={spoofCheck?.blocked ? 'shield-outline' : 'warning-outline'}
                        size={18}
                        color={tc.warning}
                    />
                    <Text style={[typ.body, { color: tc.warning, flex: 1 }]}>
                        {spoofCheck?.blocked
                            ? 'Possible screen spoofing attack detected. Detector was blocked for safety.'
                            : 'Possible spoofing risk detected. Please point camera at real currency.'}
                    </Text>
                </View>
            )}

            {result?.error && (
                <View style={[styles.banner, shadows.card, { backgroundColor: tc.error + '15', borderColor: tc.error + '33' }]}>
                    <Ionicons name="alert-circle" size={18} color={tc.error} />
                    <Text style={[typ.body, { color: tc.error, flex: 1 }]}>{result.error}</Text>
                </View>
            )}

            {/* ── Detections ── */}
            {detections.length > 0 && (
                <SectionCard
                    title={`Detections (${detections.length}${allDetections.length > detections.length ? ` of ${allDetections.length}` : ''})`}
                    icon="locate-outline"
                >
                    <View style={[styles.sectionHint, { backgroundColor: tc.primary + '12', borderColor: tc.primary + '35' }]}>
                        <Ionicons name="scan-outline" size={14} color={tc.primary} />
                        <Text style={[typ.caption, { color: tc.textSecondary, flex: 1 }]}>
                            Labels below are from the detector stage (bounding-box model).
                        </Text>
                    </View>
                    {detections.map((det: any, i: number) => (
                        <DetectionCard key={i} detection={det} index={i} />
                    ))}
                </SectionCard>
            )}

            {topCandidates.length > 0 && (
                <SectionCard title={`Top Candidates (${topCandidates.length})`} icon="layers-outline">
                    <View style={[styles.sectionHint, { backgroundColor: tc.accent + '12', borderColor: tc.accent + '35' }]}>
                        <Ionicons name="information-circle-outline" size={14} color={tc.accent} />
                        <Text style={[typ.caption, { color: tc.textSecondary, flex: 1 }]}>
                            Top row = detector class. Bottom row = classifier class for the cropped candidate.
                        </Text>
                    </View>
                    {topCandidates.map((cand: any, i: number) => {
                        const target = cand?.target || {};
                        const conf = Number(target?.confidence || 0);
                        const top1 = cand?.classification?.result?.top_predictions?.[0] || null;
                        const detectorClass = String(target?.class_name || '?');
                        const classifierClassRaw = top1 ? String(top1.class) : '';
                        const classifierClass = top1
                            ? (_normalizeCurrencyClassName(classifierClassRaw) || classifierClassRaw)
                            : 'No classifier route';
                        const classifierConf = top1 ? `${(Number(top1.confidence || 0) * 100).toFixed(1)}%` : 'Skipped';
                        return (
                            <View key={i} style={[styles.candidateCard, { backgroundColor: tc.surfaceElevated, borderColor: tc.border }]}>
                                <View style={styles.candidateHeaderRow}>
                                    <View style={[styles.candidateChip, { borderColor: tc.primary + '55', backgroundColor: tc.primary + '1A' }]}>
                                        <Text style={[styles.candidateChipText, { color: tc.primary }]}>DETECTOR</Text>
                                    </View>
                                    <Text style={[typ.bodyBold, { color: tc.textPrimary }]}>{`#${cand?.rank || i + 1}`}</Text>
                                </View>
                                <Text style={[styles.candidateClassText, { color: tc.textPrimary }]}>{detectorClass}</Text>
                                <Text style={[typ.caption, { color: tc.textSecondary }]}>
                                    {`Confidence ${(conf * 100).toFixed(1)}%`}
                                </Text>

                                <View style={[styles.candidateDivider, { backgroundColor: tc.border }]} />

                                <View style={styles.candidateHeaderRow}>
                                    <View style={[styles.candidateChip, { borderColor: tc.accent + '55', backgroundColor: tc.accent + '1A' }]}>
                                        <Text style={[styles.candidateChipText, { color: tc.accent }]}>CLASSIFIER</Text>
                                    </View>
                                    <Text style={[typ.caption, { color: top1 ? tc.accent : tc.textMuted }]}>{`Top-1 ${classifierConf}`}</Text>
                                </View>
                                <Text style={[styles.candidateClassText, { color: top1 ? tc.accent : tc.textMuted }]}>{classifierClass}</Text>
                            </View>
                        );
                    })}
                </SectionCard>
            )}

            {(result?.result?.classification || topCandidates.length > 0) && (
                <SectionCard title="Guaranteed Amount" icon="cash-outline">
                    <View style={[styles.guaranteedCard, { backgroundColor: tc.surfaceElevated, borderColor: tc.border }]}>
                        <View style={styles.guaranteedHeaderRow}>
                            <Text style={[typ.caption, { color: tc.textSecondary }]}>Classifier-backed minimum</Text>
                            <Text style={[typ.caption, { color: tc.textMuted }]}>
                                {`>= ${guaranteedClassifierSummary.thresholdPct}% top-1`}
                            </Text>
                        </View>
                        <Text style={[styles.guaranteedAmount, { color: tc.accent }]}>
                            {_formatCad(guaranteedClassifierSummary.total)}
                        </Text>
                        <Text style={[typ.caption, { color: tc.textMuted }]}>
                            {guaranteedClassifierSummary.items.length > 0
                                ? `${guaranteedClassifierSummary.items.length} confident item${guaranteedClassifierSummary.items.length > 1 ? 's' : ''}`
                                : 'No confident denomination predictions yet'}
                        </Text>
                        {guaranteedClassifierSummary.items.length > 0 && (
                            <View style={styles.guaranteedChipRow}>
                                {guaranteedClassifierSummary.items.map((item: any, i: number) => (
                                    <View key={`${item.rank}-${item.className}-${i}`} style={[styles.guaranteedChip, { borderColor: tc.borderLight }]}>
                                        <Text style={[typ.mono, { color: tc.textPrimary }]}>
                                            #{item.rank} {item.className}
                                        </Text>
                                        <Text style={[typ.mono, { color: tc.accent }]}>
                                            {_formatCad(Number(item.value || 0))}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                </SectionCard>
            )}

            {settings.debugModeEnabled && (
                <DebugPanel
                    jsonData={result}
                    timing={timing}
                    apiUrl={inferUrl}
                    pipelineModels={pipelineModels}
                    cameraDebug={cameraDebugData}
                />
            )}

            <View style={{ height: spacing.huge }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scroll: { padding: spacing.lg, gap: spacing.lg },
    card: { borderRadius: radii.lg, padding: spacing.lg, borderWidth: 1 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
    inputRow: { flexDirection: 'row' },
    textInput: { flex: 1, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1 },
    buttonRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
    cameraBlock: { gap: spacing.sm },
    cameraPreviewFrame: { width: '100%', height: 280, borderRadius: radii.md, overflow: 'hidden', position: 'relative', backgroundColor: '#000000' },
    cameraPreview: { width: '100%', height: '100%' },
    cameraControls: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
    liveStatus: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderWidth: 1, borderRadius: radii.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
    previewCard: { borderRadius: radii.lg, overflow: 'hidden', borderWidth: 1 },
    previewImage: { width: '100%', height: 260 },
    banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radii.md, borderWidth: 1 },
    sectionHint: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        borderWidth: 1,
        borderRadius: radii.sm,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        marginBottom: spacing.sm,
    },
    guaranteedCard: { borderRadius: radii.md, borderWidth: 1, padding: spacing.md, gap: spacing.sm },
    guaranteedHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    guaranteedAmount: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
    guaranteedChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    guaranteedChip: {
        borderWidth: 1,
        borderRadius: radii.full,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    candidateCard: { borderRadius: radii.sm, borderWidth: 1, padding: spacing.sm, gap: spacing.xs, marginBottom: spacing.sm },
    candidateHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    candidateChip: {
        borderWidth: 1,
        borderRadius: radii.full,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
    },
    candidateChipText: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    candidateClassText: {
        fontSize: 16,
        fontWeight: '700',
    },
    candidateDivider: {
        height: 1,
        marginVertical: spacing.xs,
    },
});
