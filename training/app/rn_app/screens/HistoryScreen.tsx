import React from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useHistory, HistoryEntry } from '../contexts/HistoryContext';
import { useThemeColors } from '../contexts/ThemeContext';
import GradientButton from '../components/GradientButton';
import AnimatedCard from '../components/AnimatedCard';
import EmptyHistorySvg from '../components/svg/EmptyHistorySvg';
import { useAnimatedCounter } from '../hooks/useAnimatedCounter';
import { useToast } from '../components/Toast';
import { spacing, radii, shadows } from '../theme';

function formatTime(ts: number) {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function CounterStat({ value, label, color, prefix, tc, typ }: {
    value: number; label: string; color?: string; prefix?: string; tc: any; typ: any;
}) {
    const animated = useAnimatedCounter(value, 600);
    return (
        <View style={{ alignItems: 'center' }}>
            <Text style={[typ.h1, { color: color || tc.textPrimary }]}>
                {prefix || ''}{animated}
            </Text>
            <Text style={[typ.caption, { color: tc.textMuted, marginTop: 2 }]}>{label}</Text>
        </View>
    );
}

function EntryCard({ entry, tc, typ }: { entry: HistoryEntry; tc: any; typ: any }) {
    const detCount = entry.detections?.length || 0;
    const total = Number(entry.totalValue ?? 0);
    const hasError = !!entry.error;

    return (
        <View style={[styles.entryCard, shadows.card, {
            backgroundColor: tc.surface, borderColor: hasError ? tc.error + '44' : tc.border,
        }]}>
            <View style={styles.entryHeader}>
                <Text style={[typ.caption, { color: tc.textMuted }]}>{formatTime(entry.timestamp)}</Text>
                {entry.timing != null && (
                    <View style={[styles.timingBadge, { backgroundColor: tc.surfaceElevated }]}>
                        <Text style={[typ.badge, { color: tc.accent }]}>{entry.timing}ms</Text>
                    </View>
                )}
            </View>
            {hasError ? (
                <View style={styles.errorRow}>
                    <Ionicons name="alert-circle" size={14} color={tc.error} />
                    <Text style={[typ.caption, { color: tc.error, flex: 1 }]} numberOfLines={2}>{entry.error}</Text>
                </View>
            ) : (
                <View style={styles.entryBody}>
                    <View style={{ alignItems: 'center' }}>
                        <Text style={[typ.h1, { color: tc.textPrimary }]}>{detCount}</Text>
                        <Text style={[typ.caption, { color: tc.textMuted }]}>Dets</Text>
                    </View>
                    <View style={{ alignItems: 'center' }}>
                        <Text style={[typ.h1, { color: tc.accent }]}>${total.toFixed(2)}</Text>
                        <Text style={[typ.caption, { color: tc.textMuted }]}>Guaranteed</Text>
                    </View>
                    <View style={styles.classesWrap}>
                        {entry.detections?.slice(0, 4).map((d: any, i: number) => (
                            <View key={i} style={[styles.classBadge, { backgroundColor: tc.primary + '22' }]}>
                                <Text style={[typ.badge, { color: tc.primary }]}>{d.class_name || '?'} {Math.round((d.confidence || 0) * 100)}%</Text>
                            </View>
                        ))}
                        {detCount > 4 && <Text style={[typ.caption, { color: tc.textMuted }]}>+{detCount - 4}</Text>}
                    </View>
                </View>
            )}
        </View>
    );
}

export default function HistoryScreen() {
    const { entries, clear } = useHistory();
    const { tc, typography: typ } = useThemeColors();
    const { show } = useToast();
    const [refreshing, setRefreshing] = React.useState(false);

    const sessionTotal = entries.reduce((sum, e) => {
        if (e.error) return sum;
        return sum + Number(e.totalValue ?? 0);
    }, 0);
    const successCount = entries.filter((e) => !e.error).length;

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 500);
    }, []);

    const handleClear = () => {
        clear();
        show('History cleared', 'success');
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
            <AnimatedCard delay={0}>
                <View style={styles.summaryRow}>
                    {[
                        { val: entries.length, label: 'Total Scans', color: undefined, prefix: undefined },
                        { val: successCount, label: 'Successful', color: tc.accent, prefix: undefined },
                        { val: sessionTotal, label: 'Session Total', color: tc.warning, prefix: '$' },
                    ].map((s, i) => (
                        <View key={i} style={[styles.summaryCard, shadows.card, { backgroundColor: tc.surface, borderColor: tc.border }]}>
                            <CounterStat value={s.val} label={s.label} color={s.color} prefix={s.prefix} tc={tc} typ={typ} />
                        </View>
                    ))}
                </View>
            </AnimatedCard>

            {entries.length > 0 && (
                <AnimatedCard delay={100}>
                    <View style={styles.clearWrap}>
                        <GradientButton title="Clear History" onPress={handleClear} variant="outline" size="sm"
                            icon={<Ionicons name="trash-outline" size={14} color={tc.primary} />} />
                    </View>
                </AnimatedCard>
            )}

            {entries.length === 0 ? (
                <AnimatedCard delay={200}>
                    <View style={styles.emptyState}>
                        <EmptyHistorySvg width={200} height={160} />
                        <Text style={[typ.h3, { color: tc.textSecondary }]}>No scan history yet</Text>
                        <Text style={[typ.body, { color: tc.textMuted, textAlign: 'center' }]}>
                            Results from the inference page will appear here
                        </Text>
                    </View>
                </AnimatedCard>
            ) : (
                entries.map((entry, i) => (
                    <AnimatedCard key={entry.id} delay={100 + i * 60}>
                        <EntryCard entry={entry} tc={tc} typ={typ} />
                    </AnimatedCard>
                ))
            )}

            <View style={{ height: spacing.huge }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scroll: { padding: spacing.lg, gap: spacing.md },
    summaryRow: { flexDirection: 'row', gap: spacing.sm },
    summaryCard: {
        flex: 1, borderRadius: radii.md, padding: spacing.md,
        alignItems: 'center', borderWidth: 1,
    },
    clearWrap: { alignItems: 'flex-end' },
    entryCard: { borderRadius: radii.md, padding: spacing.md, borderWidth: 1 },
    entryHeader: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: spacing.sm,
    },
    timingBadge: {
        paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radii.full,
    },
    errorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    entryBody: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
    classesWrap: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    classBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radii.sm },
    emptyState: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.md },
});
