import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import GradientButton from '../components/GradientButton';
import StatusBadge from '../components/StatusBadge';
import CurrencyHeroSvg from '../components/svg/CurrencyHeroSvg';
import AnimatedCard from '../components/AnimatedCard';
import { useThemeColors } from '../contexts/ThemeContext';
import { useSettings } from '../contexts/SettingsContext';
import { useHistory } from '../contexts/HistoryContext';
import { getOfflinePipelineStatus } from '../services/offlinePipeline';
import { resolveReachableApiBase } from '../services/serverApi';
import { spacing, radii } from '../theme';

type RootStackParamList = {
    Landing: undefined;
    About: undefined;
    MainTabs: undefined;
    Onboarding: undefined;
    Diagnostics: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'Landing'>;

export default function LandingScreen({ navigation }: Props) {
    const { tc, isDark, typography: typ } = useThemeColors();
    const { settings, update } = useSettings();
    const { entries } = useHistory();
    const isOfflineMode = settings.inferenceMode === 'offline';
    const [health, setHealth] = useState<'online' | 'offline' | 'busy'>('busy');
    const [healthDetail, setHealthDetail] = useState('Checking…');

    // Floating animation for the hero SVG
    const floatY = useRef(new Animated.Value(0)).current;
    const floatScale = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const floatLoop = Animated.loop(
            Animated.sequence([
                Animated.parallel([
                    Animated.timing(floatY, {
                        toValue: -10,
                        duration: 2000,
                        easing: Easing.inOut(Easing.sin),
                        useNativeDriver: true,
                    }),
                    Animated.timing(floatScale, {
                        toValue: 1.03,
                        duration: 2000,
                        easing: Easing.inOut(Easing.sin),
                        useNativeDriver: true,
                    }),
                ]),
                Animated.parallel([
                    Animated.timing(floatY, {
                        toValue: 0,
                        duration: 2000,
                        easing: Easing.inOut(Easing.sin),
                        useNativeDriver: true,
                    }),
                    Animated.timing(floatScale, {
                        toValue: 1,
                        duration: 2000,
                        easing: Easing.inOut(Easing.sin),
                        useNativeDriver: true,
                    }),
                ]),
            ])
        );
        floatLoop.start();
        return () => floatLoop.stop();
    }, []);

    useEffect(() => {
        checkHealth();
    }, [settings.apiBaseUrl, settings.inferenceMode]);

    async function checkHealth() {
        setHealth('busy');
        if (isOfflineMode) {
            setHealthDetail('Loading bundled models...');
            try {
                const status = await getOfflinePipelineStatus();
                if (status.ready) {
                    setHealth('online');
                    setHealthDetail('Bundled models ready');
                } else {
                    setHealth('offline');
                    setHealthDetail(status.error || 'On-device runtime unavailable');
                }
            } catch (error) {
                setHealth('offline');
                setHealthDetail(error instanceof Error ? error.message : 'On-device runtime unavailable');
            }
            return;
        }
        setHealthDetail('Pinging backend…');
        const probe = await resolveReachableApiBase(settings.apiBaseUrl, 5000);
        if (probe.ok) {
            if (probe.base !== settings.apiBaseUrl) {
                update({ apiBaseUrl: probe.base });
            }
            const pipeline = probe.data?.pipeline || {};
            const ready = pipeline.detector && pipeline.bill_reader && pipeline.coin_classifier;
            setHealth('online');
            setHealthDetail(ready ? 'Pipeline ready' : 'Connected (pipeline loading)');
        } else {
            setHealth('offline');
            setHealthDetail(probe.error || 'Cannot reach backend');
        }
    }

    return (
        <LinearGradient
            colors={[...tc.heroGradient]}
            style={styles.container}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
        >
            {/* Decorative elements */}
            <View style={[styles.decorCircle1, { backgroundColor: tc.primary + (isDark ? '14' : '10') }]} />
            <View style={[styles.decorCircle2, { backgroundColor: tc.info + (isDark ? '0C' : '08') }]} />

            {/* Top-right nav icons */}
            <View style={styles.topNav}>
                {settings.debugModeEnabled && (
                    <Pressable
                        onPress={() => navigation.navigate('Diagnostics')}
                        style={({ pressed }) => [
                            styles.navIcon,
                            { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
                            pressed && { opacity: 0.7 },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel="Open diagnostics"
                    >
                        <Ionicons name="analytics-outline" size={22} color={tc.textSecondary} />
                    </Pressable>
                )}
            </View>

            <View style={styles.content}>
                {/* Hero SVG illustration — floating animation */}
                <AnimatedCard delay={0} duration={600}>
                    <Animated.View style={[
                        styles.heroSvgWrap,
                        { transform: [{ translateY: floatY }, { scale: floatScale }] },
                    ]}>
                        <CurrencyHeroSvg width={280} height={200} />
                    </Animated.View>
                </AnimatedCard>

                {/* Title — "See My Cash" */}
                <AnimatedCard delay={150}>
                    <Text style={[styles.title, typ.hero, { color: tc.textPrimary }]}>See My Cash</Text>
                    <Text style={[styles.subtitle, typ.body, { color: tc.textSecondary }]}>
                        Real-time Canadian currency detection{'\n'}powered by YOLO & deep learning
                    </Text>
                </AnimatedCard>

                {/* Health badge */}
                <AnimatedCard delay={300}>
                    <View style={styles.healthWrap}>
                        <StatusBadge status={health} label={isOfflineMode ? 'On-device runtime' : 'Backend'} detail={healthDetail} />
                    </View>
                </AnimatedCard>

                {/* CTA buttons */}
                <AnimatedCard delay={450} style={styles.buttons}>
                    <GradientButton
                        title="Start Scanning"
                        onPress={() => navigation.navigate('MainTabs')}
                        size="lg"
                        icon={<Ionicons name="camera" size={20} color="#FFF" />}
                    />
                    <GradientButton
                        title="Quick Tour"
                        onPress={() => navigation.navigate('Onboarding')}
                        variant="accent"
                        icon={<Ionicons name="school-outline" size={18} color="#FFF" />}
                    />
                    <GradientButton
                        title="About This Project"
                        onPress={() => navigation.navigate('About')}
                        variant="outline"
                        icon={<Ionicons name="information-circle-outline" size={18} color={tc.primary} />}
                    />
                </AnimatedCard>

                {/* Version */}
                <AnimatedCard delay={600}>
                    <Text style={[styles.version, typ.caption, { color: tc.textMuted }]}>
                        v0.3.0 • See My Cash • Expo SDK 51
                    </Text>
                </AnimatedCard>
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    decorCircle1: {
        position: 'absolute', top: -80, right: -60,
        width: 240, height: 240, borderRadius: 120,
    },
    decorCircle2: {
        position: 'absolute', bottom: -40, left: -80,
        width: 200, height: 200, borderRadius: 100,
    },
    topNav: {
        position: 'absolute', top: 48, right: spacing.lg,
        flexDirection: 'row', gap: spacing.md, zIndex: 10,
    },
    navIcon: {
        width: 40, height: 40, borderRadius: 20,
        alignItems: 'center', justifyContent: 'center',
    },
    content: {
        flex: 1, alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: spacing.xxl, paddingBottom: spacing.huge,
    },
    heroSvgWrap: { marginBottom: spacing.lg, alignItems: 'center' },
    title: { textAlign: 'center', marginBottom: spacing.sm },
    subtitle: { textAlign: 'center', lineHeight: 22, marginBottom: spacing.xxl },
    healthWrap: { marginBottom: spacing.xxxl },
    buttons: { gap: spacing.md, width: '100%', maxWidth: 320, alignItems: 'stretch' },
    version: { marginTop: spacing.xxxl },
});
