import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import TechPipelineSvg from '../components/svg/TechPipelineSvg';
import AccessibilitySvg from '../components/svg/AccessibilitySvg';
import AnimatedCard from '../components/AnimatedCard';
import { useThemeColors } from '../contexts/ThemeContext';
import { spacing, radii, shadows } from '../theme';

const TECH_STACK = [
    { icon: 'cube-outline' as const, name: 'YOLO26', desc: 'Object Detection' },
    { icon: 'flash-outline' as const, name: 'PyTorch', desc: 'Training' },
    { icon: 'hardware-chip-outline' as const, name: 'ONNX Runtime', desc: 'Inference' },
    { icon: 'server-outline' as const, name: 'FastAPI', desc: 'Backend' },
    { icon: 'phone-portrait-outline' as const, name: 'React Native', desc: 'Mobile App' },
    { icon: 'cloud-outline' as const, name: 'AWS', desc: 'Infrastructure' },
];

export default function AboutScreen() {
    const { tc, isDark, typography: typ } = useThemeColors();

    const cardStyle = {
        backgroundColor: tc.surface,
        borderRadius: radii.lg,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: tc.border,
    };

    const renderCard = (icon: string, title: string, delay: number, children: React.ReactNode) => (
        <AnimatedCard delay={delay}>
            <View style={[cardStyle, shadows.card]}>
                <View style={styles.cardHeader}>
                    <Ionicons name={icon as any} size={20} color={tc.primary} />
                    <Text style={[typ.h3, { color: tc.textPrimary }]}>{title}</Text>
                </View>
                {children}
            </View>
        </AnimatedCard>
    );

    return (
        <ScrollView style={[styles.container, { backgroundColor: tc.background }]} contentContainerStyle={styles.scroll}>
            {/* Hero */}
            <LinearGradient
                colors={[...tc.heroGradient]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.hero}
            >
                <Text style={[typ.hero, { color: tc.textPrimary }]}>See My Cash</Text>
                <Text style={[typ.body, { color: tc.textSecondary, marginTop: spacing.xs }]}>
                    Accessible currency detection for everyone
                </Text>
                <View style={styles.heroSvg}>
                    <TechPipelineSvg width={300} height={160} />
                </View>
            </LinearGradient>

            {/* What it does */}
            {renderCard('cash-outline', 'What It Does', 0, (
                <>
                    <Text style={[typ.body, { color: tc.textSecondary }]}>
                        See My Cash (SMC) is an accessible currency identification app that detects and classifies
                        Canadian banknotes and coins in real-time using computer vision. Designed for everyone —
                        including those with visual impairments — simply point your camera at bills and hear the total.
                    </Text>
                    <Text style={[typ.body, { color: tc.textSecondary, marginTop: spacing.sm }]}>
                        The full pipeline runs: Detector → Bill Reader / Coin Classifier → Counting + TTS.
                    </Text>
                </>
            ))}

            {/* Tech Stack */}
            {renderCard('layers-outline', 'Tech Stack', 100, (
                <View style={styles.techGrid}>
                    {TECH_STACK.map((t) => (
                        <View key={t.name} style={[styles.techBadge, shadows.card, { backgroundColor: tc.surfaceElevated }]}>
                            <Ionicons name={t.icon} size={22} color={tc.primary} />
                            <Text style={[typ.bodyBold, { color: tc.textPrimary }]}>{t.name}</Text>
                            <Text style={[typ.caption, { color: tc.textMuted }]}>{t.desc}</Text>
                        </View>
                    ))}
                </View>
            ))}

            {/* API Endpoints */}
            {renderCard('link-outline', 'API Endpoints', 200, (
                <View style={styles.endpointList}>
                    {[
                        { method: 'GET', path: '/api/health', desc: 'Health check' },
                        { method: 'POST', path: '/api/pipeline/infer', desc: 'Full pipeline inference' },
                        { method: 'POST', path: '/api/models/refresh', desc: 'Sync models from S3' },
                        { method: 'GET', path: '/api/pipeline/status', desc: 'Pipeline status' },
                    ].map((ep) => (
                        <View key={ep.path} style={[styles.endpoint, { borderBottomColor: tc.border }]}>
                            <View style={[
                                styles.methodBadge,
                                { backgroundColor: ep.method === 'POST' ? tc.primary + '22' : tc.accent + '22' },
                            ]}>
                                <Text style={[typ.badge, { color: ep.method === 'POST' ? tc.primary : tc.accent }]}>
                                    {ep.method}
                                </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[typ.mono, { color: tc.textPrimary }]}>{ep.path}</Text>
                                <Text style={[typ.caption, { color: tc.textMuted }]}>{ep.desc}</Text>
                            </View>
                        </View>
                    ))}
                </View>
            ))}

            {/* Credits */}
            {renderCard('people-outline', 'Credits', 300, (
                <Text style={[typ.body, { color: tc.textSecondary }]}>
                    Built as part of the SMC capstone project. Datasets sourced from Roboflow Universe,
                    synthetic data generated with custom compositing pipeline.
                </Text>
            ))}

            {/* Accessibility */}
            {renderCard('accessibility-outline', 'Built for Accessibility', 400, (
                <>
                    <View style={styles.accessibilitySvgWrap}>
                        <AccessibilitySvg width={200} height={140} />
                    </View>
                    <Text style={[typ.body, { color: tc.textSecondary }]}>
                        See My Cash is designed with inclusivity at its core. Text-to-speech announces
                        detected denominations aloud, high-contrast mode improves visibility, and large
                        font options make the interface comfortable for all users.
                    </Text>
                </>
            ))}

            <View style={{ height: spacing.huge }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scroll: { padding: spacing.lg, gap: spacing.lg },
    hero: {
        borderRadius: radii.lg,
        padding: spacing.xxl,
        alignItems: 'center',
    },
    heroSvg: { marginTop: spacing.lg },
    cardHeader: {
        flexDirection: 'row', alignItems: 'center',
        gap: spacing.sm, marginBottom: spacing.md,
    },
    techGrid: {
        flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm,
    },
    techBadge: {
        flex: 1, minWidth: '28%',
        alignItems: 'center', padding: spacing.md,
        borderRadius: radii.md, gap: spacing.xs,
    },
    endpointList: { gap: spacing.xs },
    endpoint: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.md,
        paddingVertical: spacing.sm, borderBottomWidth: 0.5,
    },
    methodBadge: {
        paddingHorizontal: spacing.sm, paddingVertical: 2,
        borderRadius: radii.sm, width: 48, alignItems: 'center',
    },
    accessibilitySvgWrap: {
        alignItems: 'center', marginBottom: spacing.md,
    },
});
