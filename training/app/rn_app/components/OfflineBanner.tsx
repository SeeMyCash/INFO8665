import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii } from '../theme';
import { useSettings } from '../contexts/SettingsContext';

/**
 * Persistent offline banner — polls the backend and shows a banner when unreachable.
 * Auto-retries every 10 seconds. Tap to retry immediately.
 */
export default function OfflineBanner() {
    const { settings } = useSettings();
    const [offline, setOffline] = useState(false);
    const [retrying, setRetrying] = useState(false);
    const slideAnim = useRef(new Animated.Value(-50)).current;

    async function checkHealth() {
        try {
            const res = await fetch(settings.apiBaseUrl.replace(/\/$/, '') + '/api/health', {
                signal: AbortSignal.timeout(4000),
            });
            if (res.ok) {
                setOffline(false);
                return;
            }
        } catch { }
        setOffline(true);
    }

    async function retry() {
        setRetrying(true);
        await checkHealth();
        setRetrying(false);
    }

    useEffect(() => {
        checkHealth();
        const timer = setInterval(checkHealth, 10000);
        return () => clearInterval(timer);
    }, [settings.apiBaseUrl]);

    useEffect(() => {
        Animated.timing(slideAnim, {
            toValue: offline ? 0 : -50,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [offline]);

    if (!offline) return null;

    return (
        <Animated.View
            style={[styles.banner, { transform: [{ translateY: slideAnim }] }]}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            accessibilityLabel={retrying ? 'Retrying connection to backend' : 'Backend server is unreachable'}
        >
            <Pressable
                onPress={retry}
                style={styles.inner}
                accessibilityRole="button"
                accessibilityLabel="Retry backend connection"
                accessibilityHint="Tap to immediately retry connecting to the backend server"
            >
                <Ionicons
                    name={retrying ? 'sync' : 'cloud-offline-outline'}
                    size={16}
                    color={colors.warning}
                />
                <Text style={styles.text}>
                    {retrying ? 'Retrying…' : 'Backend unreachable'}
                </Text>
                <Text style={styles.tap}>Tap to retry</Text>
            </Pressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    banner: {
        backgroundColor: colors.warning + '20',
        borderBottomWidth: 1,
        borderBottomColor: colors.warning + '44',
    },
    inner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        gap: spacing.sm,
    },
    text: {
        ...typography.caption,
        color: colors.warning,
        fontWeight: '600',
    },
    tap: {
        ...typography.caption,
        color: colors.textMuted,
    },
});
