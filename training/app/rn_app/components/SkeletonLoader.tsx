import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radii } from '../theme';

type Props = {
    width?: number | string;
    height?: number;
    borderRadius?: number;
    style?: StyleProp<ViewStyle>;
};

/**
 * Shimmer skeleton loading placeholder.
 * Shows an animated glowing bar that pulses to indicate loading.
 */
export default function SkeletonLoader({
    width = '100%',
    height = 16,
    borderRadius = radii.sm,
    style,
}: Props) {
    const pulseAnim = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 0.7,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0.3,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, []);

    return (
        <Animated.View
            style={[
                {
                    width: width as any,
                    height,
                    borderRadius,
                    backgroundColor: colors.surfaceElevated,
                    opacity: pulseAnim,
                },
                style,
            ]}
        />
    );
}

/**
 * Skeleton card: shows a card-shaped skeleton with multiple lines.
 */
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
    return (
        <View style={skStyles.card}>
            <SkeletonLoader width="40%" height={14} style={{ marginBottom: 12 }} />
            {Array.from({ length: lines }).map((_, i) => (
                <SkeletonLoader
                    key={i}
                    width={`${70 + Math.random() * 30}%`}
                    height={10}
                    style={{ marginBottom: 8 }}
                />
            ))}
        </View>
    );
}

const skStyles = StyleSheet.create({
    card: {
        backgroundColor: colors.surface,
        borderRadius: radii.lg,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
});
