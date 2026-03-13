import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    AccessibilityInfo,
    ActivityIndicator,
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
import { Ionicons } from '@expo/vector-icons';
import GradientButton from '../components/GradientButton';
import DetectionCard from '../components/DetectionCard';
import DebugPanel from '../components/DebugPanel';
import WebLiveCamera, { WebLiveCameraRef } from '../components/WebLiveCamera';
import ImageWithOverlay from '../components/ImageWithOverlay';
import { useSettings } from '../contexts/SettingsContext';
import { useHistory } from '../contexts/HistoryContext';
import { useThemeColors } from '../contexts/ThemeContext';
import { spacing, radii, shadows } from '../theme';

type PipelineResponse = {
    kind?: string;
    result?: any;
    error?: string;
};

const DENOM_VALUES: Record<string, number> = {
    CAD_5: 5, CAD_10: 10, CAD_20: 20, CAD_50: 50, CAD_100: 100,
    CAD_5C: 0.05, CAD_10C: 0.10, CAD_25C: 0.25, CAD_0_05: 0.05, CAD_0_10: 0.10, CAD_0_25: 0.25,
    CAD_1: 1, CAD_2: 2, LOONIE: 1, TOONIE: 2, NICKEL: 0.05, DIME: 0.10, QUARTER: 0.25,
};
const GUARANTEED_CLASSIFIER_MIN_CONF = 0.70;

const LIVE_STABILITY_DEFAULT_WINDOW_MS = 3000;
const LIVE_STABILITY_DEFAULT_MIN_FRAMES = 3;
const LIVE_STABILITY_DEFAULT_IOU_THRESHOLD = 0.45;
const LIVE_STABILITY_HOLD_MS = 1200;
const LIVE_TOP_K_TARGETS = 5;
const STILL_TOP_K_TARGETS = 5;
const DISPLAY_MAX_DETECTIONS = 5;

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

function _classToCadValue(classNameRaw: unknown): number {
    const className = String(classNameRaw || '').trim().toUpperCase();
    if (!className) return 0;

    const compact = className.replace(/\s+/g, '').replace(/-/g, '_');
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
            const className = String(top1?.class || '').trim();
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

/* ── Main screen ───────────────────────────── */
export default function InferenceScreen() {
    const { settings, update } = useSettings();
    const { add: addHistory } = useHistory();
    const { tc, typography: typ } = useThemeColors();
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
    const [permission, requestPermission] = useCameraPermissions();
    const [timing, setTiming] = useState<number | null>(null);
    const [liveStability, setLiveStability] = useState<LiveStabilityStatus>({
        ...LIVE_STABILITY_IDLE,
        remainingMs: liveStabilityWindowMs,
    });

    const cameraRef = useRef<CameraView | null>(null);
    const webCamRef = useRef<WebLiveCameraRef>(null);
    const liveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
        () => settings.apiBaseUrl.replace(/\/$/, '') + '/api/pipeline/infer',
        [settings.apiBaseUrl]
    );

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
    const topCandidates = useMemo(
        () => (Array.isArray(result?.result?.candidates) ? result?.result?.candidates : []),
        [result],
    );
    const guaranteedClassifierSummary = useMemo(() => _computeGuaranteedClassifierSummary(result), [result]);

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
        const skipHistory = Boolean(opts?.skipHistory);
        const isLive = Boolean(opts?.isLive);
        setBusy(true);
        const t0 = Date.now();
        let res: PipelineResponse | null = null;
        let ms: number | null = null;
        try {
            const response = await fetch(inferUrl, { method: 'POST', body: fd });
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

    async function runInferFromUri(uri: string, isLive = false) {
        const fd = new FormData();
        if (Platform.OS === 'web') {
            const blob = await (await fetch(uri)).blob();
            fd.append('file', blob, 'image.jpg');
        } else {
            fd.append('file', { uri, name: 'image.jpg', type: 'image/jpeg' } as any);
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

    async function startCamera() {
        if (!permission?.granted) {
            const p = await requestPermission();
            if (!p.granted) { setResult({ error: 'Camera permission denied' }); return; }
        }
        setLivePreviewResult(null);
        resetLiveStability();
        setCameraActive(true);
    }

    function stopCamera() {
        setCameraActive(false);
        setLiveRunning(false);
        liveRunningRef.current = false;
        if (liveTimerRef.current) { clearTimeout(liveTimerRef.current); liveTimerRef.current = null; }
        setLivePreviewResult(null);
        resetLiveStability();
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
        if (!cameraRef.current) { setResult({ error: 'Camera not ready yet' }); return; }
        const isLive = liveRunningRef.current;
        if (!isLive) {
            setResult(null);
            setTiming(null);
        }
        try {
            const shot = await cameraRef.current.takePictureAsync({ quality: 0.8, skipProcessing: true });
            if (!shot?.uri) { setResult({ error: 'Failed to capture frame' }); return; }
            setImageUri(shot.uri);
            await runInferFromUri(shot.uri, isLive);
        } catch (e: any) {
            setResult({ error: e?.message || String(e) });
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
        if (liveTimerRef.current) { clearTimeout(liveTimerRef.current); liveTimerRef.current = null; }
        setLiveRunning(true);
        liveRunningRef.current = true;
        resetLiveStability();
        _scheduleLiveCapture();
    }

    function stopLive() {
        setLiveRunning(false);
        liveRunningRef.current = false;
        if (liveTimerRef.current) { clearTimeout(liveTimerRef.current); liveTimerRef.current = null; }
        setLivePreviewResult(null);
        resetLiveStability();
    }

    useEffect(() => {
        return () => {
            liveRunningRef.current = false;
            if (liveTimerRef.current) { clearTimeout(liveTimerRef.current); }
        };
    }, []);

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
            <SectionCard title="API Configuration" icon="settings-outline">
                <View style={styles.inputRow}>
                    <TextInput
                        value={settings.apiBaseUrl}
                        onChangeText={(v) => update({ apiBaseUrl: v })}
                        autoCapitalize="none"
                        autoCorrect={false}
                        placeholder="http://localhost:8080"
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
            </SectionCard>

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
            <SectionCard title="Live Camera" icon="videocam-outline">
                {!cameraActive ? (
                    <GradientButton title="Start Camera" onPress={startCamera} variant="accent" size="sm"
                        icon={<Ionicons name="camera-outline" size={16} color="#FFF" />} />
                ) : (
                    <View style={styles.cameraBlock}>
                        {Platform.OS === 'web' ? (
                            <WebLiveCamera
                                ref={webCamRef}
                                facing={cameraFacing}
                                detections={detections}
                                active={cameraActive}
                                height={300}
                                onError={(msg) => setResult({ error: msg })}
                            />
                        ) : (
                            <CameraView key={cameraFacing} ref={cameraRef} style={styles.cameraPreview} facing={cameraFacing} />
                        )}
                        <View style={styles.cameraControls}>
                            <GradientButton title="Snap" onPress={captureAndInferOnce} disabled={busy} size="sm"
                                icon={<Ionicons name="scan-outline" size={14} color="#FFF" />} />
                            <GradientButton
                                title={liveRunning ? 'Stop Live' : `Go Live (${settings.liveFps} fps)`}
                                onPress={liveRunning ? stopLive : startLive}
                                variant={liveRunning ? 'outline' : 'accent'}
                                size="sm"
                                icon={<Ionicons name={liveRunning ? 'pause' : 'play'} size={14} color={liveRunning ? tc.primary : '#FFF'} />}
                            />
                            <GradientButton
                                title={cameraFacing === 'back' ? 'Front' : 'Back'}
                                onPress={() => setCameraFacing((f) => (f === 'back' ? 'front' : 'back'))}
                                variant="outline" size="sm"
                                icon={<Ionicons name="camera-reverse-outline" size={14} color={tc.primary} />}
                            />
                        </View>
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
                    {detections.map((det: any, i: number) => (
                        <DetectionCard key={i} detection={det} index={i} />
                    ))}
                </SectionCard>
            )}

            {topCandidates.length > 1 && (
                <SectionCard title={`Top Candidates (${topCandidates.length})`} icon="layers-outline">
                    {topCandidates.map((cand: any, i: number) => {
                        const target = cand?.target || {};
                        const conf = Number(target?.confidence || 0);
                        const top1 = cand?.classification?.result?.top_predictions?.[0] || null;
                        return (
                            <View key={i} style={[styles.candidateCard, { backgroundColor: tc.surfaceElevated, borderColor: tc.border }]}>
                                <Text style={[typ.bodyBold, { color: tc.textPrimary }]}>
                                    {`#${cand?.rank || i + 1} ${String(target?.class_name || '?')} ${(conf * 100).toFixed(1)}%`}
                                </Text>
                                <Text style={[typ.caption, { color: tc.textSecondary }]}>
                                    {top1
                                        ? `${String(top1.class)} ${(Number(top1.confidence || 0) * 100).toFixed(1)}%`
                                        : 'No classifier route'}
                                </Text>
                            </View>
                        );
                    })}
                </SectionCard>
            )}

            {/* ── Classification ── */}
            {result?.result?.classification && (
                <SectionCard title="Classification" icon="pricetag-outline">
                    <View style={styles.classificationCard}>
                        <Text style={[typ.bodyBold, { color: tc.textPrimary, marginBottom: spacing.xs }]}>
                            {result.result.classification.kind === 'bill_reader' ? '💵 Bill Reader' : '🪙 Coin Classifier'}
                        </Text>
                        {result.result.classification.result?.top_predictions?.map((p: any, i: number) => (
                            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                                <Text style={[typ.mono, { color: tc.textPrimary, width: 100 }]}>{p.class}</Text>
                                <View style={[styles.barTrack, { backgroundColor: tc.surfaceElevated }]}>
                                    <View style={[styles.barFill, { width: `${Math.round(p.confidence * 100)}%`, backgroundColor: tc.accent }]} />
                                </View>
                                <Text style={[typ.mono, { color: tc.accent, width: 55, textAlign: 'right' }]}>
                                    {(p.confidence * 100).toFixed(1)}%
                                </Text>
                            </View>
                        ))}
                    </View>
                </SectionCard>
            )}

            {/* ── Debug panel ── */}
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

            {settings.showDebugPanel && (
                <DebugPanel jsonData={result} timing={timing} apiUrl={inferUrl} pipelineModels={pipelineModels} />
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
    cameraPreview: { width: '100%', height: 280, borderRadius: radii.md, overflow: 'hidden' },
    cameraControls: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
    liveStatus: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderWidth: 1, borderRadius: radii.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
    previewCard: { borderRadius: radii.lg, overflow: 'hidden', borderWidth: 1 },
    previewImage: { width: '100%', height: 260 },
    banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radii.md, borderWidth: 1 },
    classificationCard: { gap: spacing.sm },
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
    barTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
    barFill: { height: 6, borderRadius: 3 },
});
