import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CrashIllustrationSvg from './svg/CrashIllustrationSvg';
import { colors, spacing, typography, radii, shadows } from '../theme';

type Props = {
    children: React.ReactNode;
};

type State = {
    hasError: boolean;
    error: Error | null;
};

/**
 * Graceful crash handler — catches render errors and shows a styled fallback
 * with a custom SVG illustration instead of a white screen.
 */
export default class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <View style={styles.container}>
                    <View style={[styles.card, shadows.card]}>
                        <View style={styles.svgWrap}>
                            <CrashIllustrationSvg width={180} height={140} />
                        </View>
                        <Text style={styles.title}>Something went wrong</Text>
                        <Text style={styles.message}>
                            The app encountered an unexpected error. This has been noted for debugging.
                        </Text>
                        {this.state.error && (
                            <View style={styles.errorBox}>
                                <Text style={styles.errorText} numberOfLines={5}>
                                    {this.state.error.message}
                                </Text>
                            </View>
                        )}
                        <Pressable
                            onPress={this.handleReset}
                            style={({ pressed }) => [styles.button, pressed && { opacity: 0.8 }]}
                        >
                            <Ionicons name="refresh" size={18} color="#FFF" />
                            <Text style={styles.buttonText}>Try Again</Text>
                        </Pressable>
                    </View>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xxl,
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: radii.xl,
        padding: spacing.xxxl,
        alignItems: 'center',
        maxWidth: 400,
        width: '100%',
        borderWidth: 1,
        borderColor: colors.error + '33',
    },
    svgWrap: {
        marginBottom: spacing.xl,
    },
    title: {
        ...typography.h2,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    message: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: spacing.lg,
    },
    errorBox: {
        backgroundColor: colors.background,
        borderRadius: radii.sm,
        padding: spacing.md,
        width: '100%',
        marginBottom: spacing.xl,
    },
    errorText: {
        ...typography.mono,
        color: colors.error,
        fontSize: 12,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xxl,
        borderRadius: radii.lg,
    },
    buttonText: {
        ...typography.bodyBold,
        color: '#FFF',
    },
});
