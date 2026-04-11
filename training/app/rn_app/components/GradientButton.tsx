import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors } from '../contexts/ThemeContext';
import { radii, spacing, shadows } from '../theme';

type Props = {
    title: string;
    onPress: () => void;
    disabled?: boolean;
    variant?: 'primary' | 'accent' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    icon?: React.ReactNode;
    style?: ViewStyle;
    accessibilityHint?: string;
    testID?: string;
};

export default function GradientButton({
    title,
    onPress,
    disabled = false,
    variant = 'primary',
    size = 'md',
    icon,
    style,
    accessibilityHint,
    testID,
}: Props) {
    const { tc, typography: typ } = useThemeColors();

    const gradient =
        variant === 'accent'
            ? [...tc.accentGradient]
            : variant === 'outline'
                ? [tc.surface, tc.surface]
                : [...tc.primaryGradient];

    const sizeStyles: Record<string, { wrap: ViewStyle; text: TextStyle }> = {
        sm: { wrap: { paddingVertical: 8, paddingHorizontal: 16 }, text: { fontSize: 13 } },
        md: { wrap: { paddingVertical: 12, paddingHorizontal: 24 }, text: { fontSize: 15 } },
        lg: { wrap: { paddingVertical: 16, paddingHorizontal: 32 }, text: { fontSize: 17 } },
    };

    const s = sizeStyles[size];

    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={title}
            accessibilityState={{ disabled }}
            accessibilityHint={accessibilityHint}
            testID={testID}
            style={({ pressed }) => [
                styles.pressable,
                pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                disabled && { opacity: 0.5 },
                style,
            ]}
        >
            <LinearGradient
                colors={gradient as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                    styles.gradient,
                    s.wrap,
                    variant === 'outline' && { borderWidth: 1.5, borderColor: tc.primary },
                    shadows.button,
                ]}
            >
                {icon}
                <Text
                    style={[
                        typ.bodyBold,
                        s.text,
                        { color: variant === 'outline' ? tc.primary : tc.textInverse === '#F8FAFC' ? '#FFF' : '#FFF' },
                    ]}
                >
                    {title}
                </Text>
            </LinearGradient>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    pressable: {
        borderRadius: radii.lg,
        overflow: 'hidden',
    },
    gradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radii.lg,
        gap: spacing.sm,
    },
});
