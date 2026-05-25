import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../contexts/SettingsContext';
import { useHistory } from '../contexts/HistoryContext';
import { useThemeColors } from '../contexts/ThemeContext';
import AnimatedCard from '../components/AnimatedCard';
import GradientButton from '../components/GradientButton';
import { SkeletonCard } from '../components/SkeletonLoader';
import { useToast } from '../components/Toast';
import { spacing, radii, shadows } from '../theme';

type HealthData = {
    ok: boolean;
    pipeline: Record<string, string | null>;
    pipeline_error: string | null;
    available_models: string[];
    active_model: string | null;
    active_kind: string | null;
};

type VersionData = {
    version: string;
    uptime_seconds: number;
    torch_available: boolean;
    cuda_available: boolean;
    device: string;
    models_dir: string;
    models_count: number;
};

type StatsData = {
    inference_count: number;
    inference_errors: number;
    avg_latency_ms: number | null;
    last_latency_ms: number | null;
    uptime_seconds: number;
};

export default function DiagnosticsScreen() {
    const { settings } = useSettings();
    const { entries } = useHistory();
    const { tc, typography: typ } = useThemeColors();
    const { show } = useToast();

    const [health, setHealth] = useState<HealthData | null>(null);
    const [version, setVersion] = useState<VersionData | null>(null);
    const [stats, setStats] = useState<StatsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [syncing, setSyncing] = useState(false);

    const base = settings.apiBaseUrl.replace(/\/$/, '');

    async function fetchAll() {
        setLoading(true);
        setError(null);
        try {
            const [healthRes, versionRes, statsRes] = await Promise.allSettled([
                fetch(`${base}/api/health`, { signal: AbortSignal.timeout(5000) }),
                fetch(`${base}/api/version`, { signal: AbortSignal.timeout(5000) }),
                fetch(`${base}/api/pipeline/stats`, { signal: AbortSignal.timeout(5000) }),
            ]);

            if (healthRes.status === 'fulfilled' && healthRes.value.ok) {
                setHealth(await healthRes.value.json());
            } else {
                throw new Error('Backend unreachable');
            }

            if (versionRes.status === 'fulfilled' && versionRes.value.ok) {
                setVersion(await versionRes.value.json());
            }

            if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
                setStats(await statsRes.value.json());
            }
        } catch (e: any) {
            setError(e?.message || 'Cannot reach backend');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { fetchAll(); }, [settings.apiBaseUrl]);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await fetchAll();
        setRefreshing(false);
    }, [settings.apiBaseUrl]);

    const handleSyncModels = async () => {
        setSyncing(true);
        try {
            const res = await fetch(`${base}/api/pipeline/refresh`, { method: 'POST' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            show(`Models refreshed: ${data.available_models?.length || 0} available`, 'success');
            await fetchAll();
        } catch (e: any) {
            show(e?.message || 'Sync failed', 'error');
        } finally {
            setSyncing(false);
        }
    };

    // Client-side session stats
    const successfulEntries = entries.filter((e) => !e.error);
    const avgLatency = successfulEntries.length > 0
        ? Math.round(successfulEntries.reduce((s, e) => s + (e.timing || 0), 0) / successfulEntries.length)
        : 0;

    const classCounts: Record<string, number> = {};
    successfulEntries.forEach((e) =>
        e.detections?.forEach((d: any) => {
            const name = d.class_name || 'unknown';
            classCounts[name] = (classCounts[name] || 0) + 1;
        })
    );
    const sortedClasses = Object.entries(classCounts).sort((a, b) => b[1] - a[1]);
    const maxClassCount = sortedClasses[0]?.[1] || 1;

    const cardStyle = {
        backgroundColor: tc.surface, borderRadius: radii.lg,
        padding: spacing.lg, borderWidth: 1, borderColor: tc.border,
    };

    const section = (title: string, icon: string, delay: number, children: React.ReactNode) => (
        <AnimatedCard delay={delay}>
            <View style={[cardStyle, shadows.card]}>
                <View style={styles.cardHeader}>
                    <Ionicons name={icon as any} size={18} color={tc.primary} />
                    <Text style={[typ.h3, { color: tc.textPrimary }]}>{title}</Text>
                </View>
                {children}
            </View>
        </AnimatedCard>
    );

    const metric = (label: string, value: string, color?: string) => (
        <View style={{ alignItems: 'center', minWidth: 70 }}>
            <Text style={[typ.h2, { color: color || tc.textPrimary }]}>{value}</Text>
            <Text style={[typ.caption, { color: tc.textMuted, marginTop: 2 }]}>{label}</Text>
        </View>
    );

    const infoRow = (label: string, value: string) => (
        <View style={[styles.infoRow, { borderBottomColor: tc.border }]}>
            <Text style={[typ.bodyBold, { color: tc.textSecondary }]}>{label}</Text>
            <Text style={[typ.mono, { color: tc.textPrimary }]} numberOfLines={1}>{value}</Text>
        </View>
    );

    const formatUptime = (s: number) => {
        if (s < 60) return `${Math.round(s)}s`;
        if (s < 3600) return `${Math.round(s / 60)}m`;
        return `${(s / 3600).toFixed(1)}h`;
    };

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: tc.background }]}
            contentContainerStyle={styles.scroll}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
                    tintColor={tc.primary} colors={[tc.primary]} />
            }
        >
            {/* ── Server Info ── */}
            {section('Server', 'server-outline', 0,
                loading ? <SkeletonCard lines={3} /> : error ? (
                    <View style={[styles.errorBox, { backgroundColor: tc.error + '15' }]}>
                        <Ionicons name="alert-circle" size={16} color={tc.error} />
                        <Text style={[typ.caption, { color: tc.error, flex: 1 }]}>{error}</Text>
                    </View>
                ) : (
                    <>
                        <View style={styles.metricsRow}>
                            {metric('Status', health?.ok ? 'Online' : 'Offline', health?.ok ? tc.accent : tc.error)}
                            {metric('Version', version?.version || '—')}
                            {metric('Uptime', version ? formatUptime(version.uptime_seconds) : '—')}
                            {metric('Device', version?.device || 'cpu')}
                        </View>
                        {version && (
                            <View style={{ marginTop: spacing.md }}>
                                {infoRow('Models on disk', String(version.models_count))}
                                {infoRow('CUDA', version.cuda_available ? 'Available' : 'Not available')}
                            </View>
                        )}
                    </>
                )
            )}

            {/* ── Pipeline Models ── */}
            {section('Pipeline Models', 'layers-outline', 100,
                loading ? <SkeletonCard lines={3} /> : health?.pipeline ? (
                    <>
                        {(['detector', 'bill_reader', 'coin_classifier'] as const).map((role) => (
                            <View key={role} style={[styles.modelRow, { borderBottomColor: tc.border }]}>
                                <Text style={[typ.bodyBold, { color: tc.textSecondary }]}>{role.replace('_', ' ')}</Text>
                                <View style={styles.modelRight}>
                                    <View style={[styles.statusDot, { backgroundColor: health.pipeline[role] ? tc.online : tc.offline }]} />
                                    <Text style={[typ.mono, { color: tc.textPrimary, maxWidth: 200 }]} numberOfLines={1}>
                                        {health.pipeline[role] || 'Not loaded'}
                                    </Text>
                                </View>
                            </View>
                        ))}
                        {health.pipeline_error && (
                            <View style={[styles.errorBox, { backgroundColor: tc.warning + '15', marginTop: spacing.sm }]}>
                                <Ionicons name="warning" size={14} color={tc.warning} />
                                <Text style={[typ.caption, { color: tc.warning, flex: 1 }]}>{health.pipeline_error}</Text>
                            </View>
                        )}
                        <View style={{ marginTop: spacing.md }}>
                            <GradientButton
                                title={syncing ? 'Syncing…' : 'Sync Models from S3'}
                                onPress={handleSyncModels}
                                disabled={syncing}
                                variant="outline"
                                size="sm"
                                icon={<Ionicons name="cloud-download-outline" size={16} color={tc.primary} />}
                            />
                        </View>
                    </>
                ) : <Text style={[typ.body, { color: tc.textMuted }]}>No pipeline data</Text>
            )}

            {/* ── Server-Side Stats ── */}
            {section('Server Statistics', 'analytics-outline', 200,
                loading ? <SkeletonCard lines={2} /> : stats ? (
                    <View style={styles.metricsRow}>
                        {metric('Inferences', String(stats.inference_count), tc.primary)}
                        {metric('Errors', String(stats.inference_errors), stats.inference_errors > 0 ? tc.error : tc.textMuted)}
                        {metric('Avg', stats.avg_latency_ms != null ? `${stats.avg_latency_ms}ms` : '—', tc.accent)}
                        {metric('Last', stats.last_latency_ms != null ? `${stats.last_latency_ms}ms` : '—')}
                    </View>
                ) : (
                    <Text style={[typ.body, { color: tc.textMuted }]}>No server stats yet</Text>
                )
            )}

            {/* ── Client Session Latency ── */}
            {section('Client Session', 'phone-portrait-outline', 300,
                <View style={styles.metricsRow}>
                    {metric('Scans', String(entries.length))}
                    {metric('Successful', String(successfulEntries.length), tc.accent)}
                    {metric('Avg Latency', successfulEntries.length > 0 ? `${avgLatency}ms` : '—', tc.primary)}
                </View>
            )}

            {/* ── Detection Distribution ── */}
            {section('Detection Distribution', 'bar-chart-outline', 400,
                sortedClasses.length === 0
                    ? <Text style={[typ.body, { color: tc.textMuted }]}>No detections yet</Text>
                    : sortedClasses.map(([name, count]) => (
                        <View key={name} style={styles.barRow}>
                            <Text style={[typ.mono, { color: tc.textPrimary, width: 80 }]}>{name}</Text>
                            <View style={[styles.barTrack, { backgroundColor: tc.surfaceElevated }]}>
                                <View style={[styles.barFill, { width: `${(count / maxClassCount) * 100}%`, backgroundColor: tc.primary }]} />
                            </View>
                            <Text style={[typ.bodyBold, { color: tc.textSecondary, width: 36, textAlign: 'right' }]}>{count}</Text>
                        </View>
                    ))
            )}

            {/* ── Available Models List ── */}
            {section('Available Models', 'folder-open-outline', 500,
                loading ? <SkeletonCard lines={2} /> : (health?.available_models?.length || 0) === 0 ? (
                    <Text style={[typ.body, { color: tc.textMuted }]}>No models on disk</Text>
                ) : (
                    <>
                        {health!.available_models.map((m) => (
                            <View key={m} style={[styles.modelRow, { borderBottomColor: tc.border }]}>
                                <Ionicons name="cube-outline" size={14} color={tc.textMuted} />
                                <Text style={[typ.mono, { color: tc.textPrimary, flex: 1 }]} numberOfLines={1}>{m}</Text>
                            </View>
                        ))}
                    </>
                )
            )}

            {/* ── Active Configuration ── */}
            {section('Active Configuration', 'settings-outline', 600,
                <View style={[styles.configBox, { backgroundColor: tc.background }]}>
                    <Text selectable style={[typ.mono, { color: tc.textSecondary, lineHeight: 18 }]}>
                        {JSON.stringify(settings, null, 2)}
                    </Text>
                </View>
            )}

            <View style={{ height: spacing.huge }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scroll: { padding: spacing.lg, gap: spacing.lg },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
    metricsRow: { flexDirection: 'row', gap: spacing.lg, flexWrap: 'wrap' },
    modelRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: spacing.sm, borderBottomWidth: 0.5, gap: spacing.sm,
    },
    modelRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1, justifyContent: 'flex-end' },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    infoRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: spacing.xs, borderBottomWidth: 0.5,
    },
    errorBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radii.sm },
    barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
    barTrack: { flex: 1, height: 10, borderRadius: 5, overflow: 'hidden' },
    barFill: { height: 10, borderRadius: 5 },
    configBox: { borderRadius: radii.sm, padding: spacing.md },
});
