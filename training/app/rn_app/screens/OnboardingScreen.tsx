import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Dimensions,
    NativeScrollEvent,
    NativeSyntheticEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import GradientButton from '../components/GradientButton';
import AnimatedCard from '../components/AnimatedCard';
import ScanBillsSvg from '../components/svg/ScanBillsSvg';
import ClassifyBillsSvg from '../components/svg/ClassifyBillsSvg';
import AnnounceTotalSvg from '../components/svg/AnnounceTotalSvg';
import { useThemeColors } from '../contexts/ThemeContext';
import { spacing } from '../theme';

type RootStackParamList = {
    Landing: undefined;
    Onboarding: undefined;
    MainTabs: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SLIDES_DARK = [
    { gradient: ['#312E81', '#1E1B4B'] as const },
    { gradient: ['#064E3B', '#0F3428'] as const },
    { gradient: ['#78350F', '#451A03'] as const },
];

const SLIDES_LIGHT = [
    { gradient: ['#EDE9FE', '#DDD6FE'] as const },
    { gradient: ['#D1FAE5', '#A7F3D0'] as const },
    { gradient: ['#FEF3C7', '#FDE68A'] as const },
];

const SLIDES_CONTENT = [
    {
        Svg: ScanBillsSvg,
        title: 'Point & Detect',
        body: 'Aim your camera at Canadian banknotes. See My Cash uses YOLO deep learning to instantly detect and locate every bill in frame.',
    },
    {
        Svg: ClassifyBillsSvg,
        title: 'Identify & Classify',
        body: 'Each detected bill is classified by denomination — $5, $10, $20, $50, or $100. Confidence scores tell you how sure the model is.',
    },
    {
        Svg: AnnounceTotalSvg,
        title: 'Hear the Total',
        body: 'See My Cash announces the counted total via text-to-speech. Designed with accessibility in mind so everyone can identify their cash.',
    },
];

export default function OnboardingScreen({ navigation }: Props) {
    const { tc, isDark, typography: typ } = useThemeColors();
    const [activeIndex, setActiveIndex] = useState(0);
    const scrollRef = useRef<ScrollView>(null);
    const slidePalette = isDark ? SLIDES_DARK : SLIDES_LIGHT;

    const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
        setActiveIndex(idx);
    };

    const goNext = () => {
        if (activeIndex < SLIDES_CONTENT.length - 1) {
            scrollRef.current?.scrollTo({ x: (activeIndex + 1) * SCREEN_WIDTH, animated: true });
            setActiveIndex(activeIndex + 1);
        } else {
            navigation.replace('MainTabs');
        }
    };

    const skip = () => navigation.replace('MainTabs');

    return (
        <View style={[styles.container, { backgroundColor: tc.background }]}>
            <ScrollView
                ref={scrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleScroll}
                scrollEventThrottle={16}
            >
                {SLIDES_CONTENT.map((slide, i) => (
                    <LinearGradient
                        key={i}
                        colors={[...slidePalette[i].gradient]}
                        style={styles.slide}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <AnimatedCard delay={200}>
                            <View style={styles.svgWrap}>
                                <slide.Svg width={240} height={180} />
                            </View>
                        </AnimatedCard>
                        <AnimatedCard delay={400}>
                            <Text style={[styles.slideTitle, typ.hero, { color: tc.textPrimary }]}>
                                {slide.title}
                            </Text>
                            <Text style={[styles.slideBody, typ.body, { color: tc.textSecondary }]}>
                                {slide.body}
                            </Text>
                        </AnimatedCard>
                    </LinearGradient>
                ))}
            </ScrollView>

            {/* Bottom controls */}
            <View style={styles.bottom}>
                <View style={styles.dots}>
                    {SLIDES_CONTENT.map((_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.dot,
                                i === activeIndex
                                    ? [styles.dotActive, { backgroundColor: tc.primary }]
                                    : [styles.dotInactive, { backgroundColor: tc.textMuted }],
                            ]}
                        />
                    ))}
                </View>

                <View style={styles.buttonsRow}>
                    <GradientButton title="Skip" onPress={skip} variant="outline" size="sm" />
                    <GradientButton
                        title={activeIndex === SLIDES_CONTENT.length - 1 ? 'Get Started' : 'Next'}
                        onPress={goNext}
                        size="sm"
                    />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    slide: {
        width: SCREEN_WIDTH, flex: 1,
        alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: spacing.xxxl,
    },
    svgWrap: { marginBottom: spacing.xxl, alignItems: 'center' },
    slideTitle: { textAlign: 'center', marginBottom: spacing.md },
    slideBody: { textAlign: 'center', lineHeight: 24, maxWidth: 340 },
    bottom: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingBottom: spacing.xxxl, paddingHorizontal: spacing.xxl,
        gap: spacing.lg, alignItems: 'center',
    },
    dots: { flexDirection: 'row', gap: spacing.sm },
    dot: { height: 8, borderRadius: 4 },
    dotActive: { width: 24 },
    dotInactive: { width: 8 },
    buttonsRow: { flexDirection: 'row', gap: spacing.md },
});
