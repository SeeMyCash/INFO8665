import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radii, spacing, typography } from '../theme';

type Props = {
    status: 'online' | 'offline' | 'busy' | 'unknown';
    label: string;
    detail?: string;
};

export default function StatusBadge({ status, label, detail }: Props) {
    const dotColor =
        status === 'online'
            ? colors.online
            : status === 'offline'
                ? colors.offline
                : status === 'busy'
                    ? colors.busy
                    : colors.textMuted;

    const statusLabel =
        status === 'online' ? 'connected'
            : status === 'offline' ? 'disconnected'
                : status === 'busy' ? 'checking'
                    : 'unknown';

    return (
        <View
            style={styles.container}
            accessibilityRole="summary"
            accessibilityLabel={`${label} status: ${statusLabel}${detail ? `. ${detail}` : ''}`}
        >
            <View style={[styles.dot, { backgroundColor: dotColor }]}>
                {status === 'online' && <View style={[styles.pulse, { borderColor: dotColor }]} />}
            </View>
            <View>
                <Text style={styles.label}>{label}</Text>
                {detail ? <Text style={styles.detail}>{detail}</Text> : null}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: radii.full,
        alignSelf: 'flex-start',
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    pulse: {
        width: 10,
        height: 10,
        borderRadius: 5,
        borderWidth: 2,
        position: 'absolute',
    },
    label: {
        ...typography.caption,
        color: colors.textPrimary,
    },
    detail: {
        ...typography.caption,
        color: colors.textSecondary,
        fontSize: 11,
    },
});
