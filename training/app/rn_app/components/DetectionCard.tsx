import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radii, spacing, typography, shadows } from '../theme';

type Detection = {
    class_id?: number;
    class_name?: string;
    confidence?: number;
    xyxy?: number[];
    box_area_ratio?: number;
};

type Props = {
    detection: Detection;
    index: number;
};

const CLASS_COLORS: Record<string, string> = {
    CAD_5: '#3B82F6',
    CAD_10: '#8B5CF6',
    CAD_20: '#10B981',
    CAD_50: '#F59E0B',
    CAD_100: '#EF4444',
    COIN: '#94A3B8',
};

export default function DetectionCard({ detection, index }: Props) {
    const confidence = detection.confidence ?? 0;
    const className = detection.class_name ?? `Class ${detection.class_id ?? '?'}`;
    const barColor = CLASS_COLORS[className] || colors.primary;
    const pct = Math.round(confidence * 100);

    return (
        <View style={[styles.card, shadows.card]}>
            <View style={styles.header}>
                <View style={[styles.indexBadge, { backgroundColor: barColor }]}>
                    <Text style={styles.indexText}>#{index + 1}</Text>
                </View>
                <Text style={styles.className}>{className}</Text>
                <Text style={[styles.confidence, { color: barColor }]}>{pct}%</Text>
            </View>

            {/* Confidence bar */}
            <View style={styles.barTrack}>
                <LinearGradient
                    colors={[barColor, barColor + 'AA']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.barFill, { width: `${pct}%` as any }]}
                />
            </View>

            {/* Details row */}
            {detection.xyxy && (
                <View style={styles.details}>
                    <Text style={styles.detailText}>
                        bbox: [{detection.xyxy.map((v) => Math.round(v)).join(', ')}]
                    </Text>
                    {detection.box_area_ratio != null && (
                        <Text style={styles.detailText}>
                            area: {(detection.box_area_ratio * 100).toFixed(1)}%
                        </Text>
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.surface,
        borderRadius: radii.md,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderLeftWidth: 3,
        borderLeftColor: colors.primary,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    indexBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    indexText: {
        ...typography.badge,
        color: '#FFF',
    },
    className: {
        ...typography.bodyBold,
        color: colors.textPrimary,
        flex: 1,
    },
    confidence: {
        ...typography.h3,
        fontWeight: '700',
    },
    barTrack: {
        height: 6,
        backgroundColor: colors.surfaceElevated,
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: spacing.sm,
    },
    barFill: {
        height: 6,
        borderRadius: 3,
    },
    details: {
        flexDirection: 'row',
        gap: spacing.lg,
    },
    detailText: {
        ...typography.mono,
        color: colors.textMuted,
    },
});
