import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii } from '../theme';
import { useSettings } from '../contexts/SettingsContext';
import { resolveReachableApiBase } from '../services/serverApi';

/**
 * Persistent offline banner — polls the backend and shows a banner when unreachable.
 * Auto-retries every 10 seconds. Tap to retry immediately.
 */
export default function OfflineBanner() {
    const { settings, update } = useSettings();
    const [offline, setOffline] = useState(false);
    const [retrying, setRetrying] = useState(false);
    const [detail, setDetail] = useState('Tap to retry');
    const slideAnim = useRef(new Animated.Value(-50)).current;

    async function checkHealth() {
        const probe = await resolveReachableApiBase(settings.apiBaseUrl, 4000);
        if (probe.ok) {
            if (probe.base !== settings.apiBaseUrl) {
                update({ apiBaseUrl: probe.base });
            }
            setDetail('Connected');
            setOffline(false);
            return;
        }

        setDetail(probe.error || 'Tap to retry');
        setOffline(true);
    }

    async function retry() {
        setRetrying(true);
        await checkHealth();
        setRetrying(false);
    }

    useEffect(() => {
        if (settings.inferenceMode === 'offline') {
            setOffline(false);
            return;
        }
        checkHealth();
        const timer = setInterval(checkHealth, 10000);
        return () => clearInterval(timer);
    }, [settings.apiBaseUrl, settings.inferenceMode]);

    useEffect(() => {
        Animated.timing(slideAnim, {
            toValue: offline ? 0 : -50,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [offline]);

    if (settings.inferenceMode === 'offline' || !offline) return null;

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
                <Text style={styles.tap}>{retrying ? 'Checking connection…' : detail}</Text>
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
