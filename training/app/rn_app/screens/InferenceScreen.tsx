import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
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
};

/* ── Main screen ───────────────────────────── */
export default function InferenceScreen() {
    const { settings, update } = useSettings();
    const { add: addHistory } = useHistory();
    const { tc, typography: typ } = useThemeColors();

    const [imageUri, setImageUri] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<PipelineResponse | null>(null);
    const [cameraActive, setCameraActive] = useState(false);
    const [liveRunning, setLiveRunning] = useState(false);
    const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('back');
    const [permission, requestPermission] = useCameraPermissions();
    const [timing, setTiming] = useState<number | null>(null);

    const cameraRef = useRef<CameraView | null>(null);
    const liveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const inferUrl = useMemo(
        () => settings.apiBaseUrl.replace(/\/$/, '') + '/api/pipeline/infer',
        [settings.apiBaseUrl]
    );

    const detections = useMemo(() => {
        if (!result?.result) return [];
        return result.result?.detector?.detections || result.result?.detections || [];
    }, [result]);

    const pipelineModels = useMemo(() => result?.result?.pipeline_models || null, [result]);

    const recordHistory = useCallback(
        (res: PipelineResponse | null, ms: number | null, uri: string | null) => {
            const dets = res?.result?.detector?.detections || res?.result?.detections || [];
            const total = dets.reduce((s: number, d: any) => s + (DENOM_VALUES[d.class_name] || 0), 0);
            addHistory({
                imageUri: uri,
                detections: dets,
                classification: res?.result?.classification || null,
                totalValue: total || null,
                timing: ms,
                error: res?.error || null,
            });
        },
        [addHistory]
    );

    async function pickImage() {
        setResult(null);
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) { setResult({ error: 'Media library permission denied' }); return; }
        const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1 });
        if (picked.canceled || !picked.assets?.length) return;
        setImageUri(picked.assets[0].uri);
    }

    async function runInferWithFormData(fd: FormData, uri: string | null) {
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
            setResult(res);
            setTiming(ms);
        } catch (e: any) {
            ms = Date.now() - t0;
            res = { error: e?.message || String(e) };
            setResult(res);
            setTiming(ms);
        } finally {
            setBusy(false);
            recordHistory(res, ms, uri);
        }
    }

    async function runInferFromUri(uri: string) {
        const fd = new FormData();
        if (Platform.OS === 'web') {
            const blob = await (await fetch(uri)).blob();
            fd.append('file', blob, 'image.jpg');
        } else {
            fd.append('file', { uri, name: 'image.jpg', type: 'image/jpeg' } as any);
        }
        await runInferWithFormData(fd, uri);
    }

    async function runInfer() {
        if (!imageUri) { setResult({ error: 'Pick an image first' }); return; }
        setResult(null);
        setTiming(null);
        await runInferFromUri(imageUri);
    }

    async function startCamera() {
        if (!permission?.granted) {
            const p = await requestPermission();
            if (!p.granted) { setResult({ error: 'Camera permission denied' }); return; }
        }
        setCameraActive(true);
    }

    function stopCamera() {
        setCameraActive(false);
        setLiveRunning(false);
        if (liveTimerRef.current) { clearInterval(liveTimerRef.current); liveTimerRef.current = null; }
    }

    async function captureAndInferOnce() {
        if (!cameraRef.current) { setResult({ error: 'Camera not ready yet' }); return; }
        setResult(null);
        setTiming(null);
        try {
            const shot = await cameraRef.current.takePictureAsync({ quality: 0.8, skipProcessing: true });
            if (!shot?.uri) { setResult({ error: 'Failed to capture frame' }); return; }
            setImageUri(shot.uri);
            await runInferFromUri(shot.uri);
        } catch (e: any) {
            setResult({ error: e?.message || String(e) });
        }
    }

    function startLive() {
        if (liveTimerRef.current) { clearInterval(liveTimerRef.current); liveTimerRef.current = null; }
        setLiveRunning(true);
        const intervalMs = Math.max(200, Math.round(1000 / settings.liveFps));
        liveTimerRef.current = setInterval(() => { if (!busy) void captureAndInferOnce(); }, intervalMs);
    }

    function stopLive() {
        setLiveRunning(false);
        if (liveTimerRef.current) { clearInterval(liveTimerRef.current); liveTimerRef.current = null; }
    }

    useEffect(() => {
        return () => { if (liveTimerRef.current) { clearInterval(liveTimerRef.current); } };
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
                        <CameraView ref={cameraRef} style={styles.cameraPreview} facing={cameraFacing} />
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
                        <GradientButton title="Stop Camera" onPress={stopCamera} variant="outline" size="sm"
                            icon={<Ionicons name="close" size={14} color={tc.primary} />}
                            style={{ marginTop: spacing.sm }} />
                    </View>
                )}
            </SectionCard>

            {/* ── Image preview ── */}
            {imageUri && (
                <View style={[styles.previewCard, shadows.card, { backgroundColor: tc.surface, borderColor: tc.border }]}>
                    <Image source={{ uri: imageUri }} style={[styles.previewImage, { backgroundColor: tc.surfaceElevated }]} resizeMode="contain" />
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
                <SectionCard title={`Detections (${detections.length})`} icon="locate-outline">
                    {detections.map((det: any, i: number) => (
                        <DetectionCard key={i} detection={det} index={i} />
                    ))}
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
    previewCard: { borderRadius: radii.lg, overflow: 'hidden', borderWidth: 1 },
    previewImage: { width: '100%', height: 260 },
    banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radii.md, borderWidth: 1 },
    classificationCard: { gap: spacing.sm },
    barTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
    barFill: { height: 6, borderRadius: 3 },
});
