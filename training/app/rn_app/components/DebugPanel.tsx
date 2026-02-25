import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, typography, shadows } from '../theme';

type Props = {
    jsonData: any;
    timing?: number | null;
    apiUrl?: string;
    pipelineModels?: Record<string, string | null> | null;
};

export default function DebugPanel({ jsonData, timing, apiUrl, pipelineModels }: Props) {
    const [expanded, setExpanded] = useState(false);

    return (
        <View style={[styles.container, shadows.card]}>
            <Pressable
                onPress={() => setExpanded(!expanded)}
                style={({ pressed }) => [styles.header, pressed && { opacity: 0.8 }]}
            >
                <Ionicons name="code-slash" size={18} color={colors.primary} />
                <Text style={styles.title}>Debug Panel</Text>
                <View style={styles.headerRight}>
                    {timing != null && (
                        <View style={styles.timingBadge}>
                            <Text style={styles.timingText}>{timing}ms</Text>
                        </View>
                    )}
                    <Ionicons
                        name={expanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={colors.textSecondary}
                    />
                </View>
            </Pressable>

            {expanded && (
                <View style={styles.body}>
                    {apiUrl && (
                        <View style={styles.row}>
                            <Text style={styles.label}>API Endpoint</Text>
                            <Text style={styles.valueSmall} numberOfLines={1}>{apiUrl}</Text>
                        </View>
                    )}

                    {pipelineModels && (
                        <View style={styles.section}>
                            <Text style={styles.label}>Pipeline Models</Text>
                            {Object.entries(pipelineModels).map(([role, name]) => (
                                <View key={role} style={styles.modelRow}>
                                    <Text style={styles.modelRole}>{role}</Text>
                                    <Text style={styles.modelName} numberOfLines={1}>
                                        {name || '—'}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}

                    <View style={styles.section}>
                        <Text style={styles.label}>Raw JSON</Text>
                        <View style={styles.jsonBox}>
                            <Text
                                selectable
                                style={styles.jsonText}
                            >
                                {jsonData ? JSON.stringify(jsonData, null, 2) : '— no result yet —'}
                            </Text>
                        </View>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.surface,
        borderRadius: radii.md,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        gap: spacing.sm,
    },
    title: {
        ...typography.bodyBold,
        color: colors.textPrimary,
        flex: 1,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    timingBadge: {
        backgroundColor: colors.surfaceElevated,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: radii.full,
    },
    timingText: {
        ...typography.badge,
        color: colors.accent,
    },
    body: {
        padding: spacing.md,
        paddingTop: 0,
        gap: spacing.md,
    },
    row: {
        gap: spacing.xs,
    },
    section: {
        gap: spacing.xs,
    },
    label: {
        ...typography.caption,
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    valueSmall: {
        ...typography.mono,
        color: colors.textSecondary,
    },
    modelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 2,
    },
    modelRole: {
        ...typography.caption,
        color: colors.textSecondary,
        textTransform: 'capitalize',
    },
    modelName: {
        ...typography.mono,
        color: colors.textPrimary,
        flex: 1,
        textAlign: 'right',
        marginLeft: spacing.md,
    },
    jsonBox: {
        backgroundColor: colors.background,
        borderRadius: radii.sm,
        padding: spacing.md,
        maxHeight: 300,
    },
    jsonText: {
        ...typography.mono,
        color: colors.textSecondary,
        lineHeight: 18,
    },
});
