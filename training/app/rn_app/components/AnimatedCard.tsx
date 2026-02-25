import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle, StyleProp } from 'react-native';

type Props = {
    children: React.ReactNode;
    delay?: number;
    duration?: number;
    style?: StyleProp<ViewStyle>;
};

/**
 * Wrap any card/section in this to get a fade-up entrance animation.
 * Staggers via optional `delay` prop.
 */
export default function AnimatedCard({ children, delay = 0, duration = 400, style }: Props) {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(18)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 1,
                duration,
                delay,
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: 0,
                duration,
                delay,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    return (
        <Animated.View
            style={[
                { opacity, transform: [{ translateY }] },
                style,
            ]}
        >
            {children}
        </Animated.View>
    );
}
