import React, { createContext, useContext, useRef, useState, useCallback } from 'react';
import { Animated, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../contexts/ThemeContext';
import { spacing, radii } from '../theme';

type ToastType = 'success' | 'error' | 'info';

type ToastContextType = {
    show: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextType>({ show: () => { } });

export function useToast() {
    return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [message, setMessage] = useState('');
    const [type, setType] = useState<ToastType>('info');
    const [visible, setVisible] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const show = useCallback((msg: string, t: ToastType = 'info') => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setMessage(msg);
        setType(t);
        setVisible(true);
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
        timerRef.current = setTimeout(() => {
            Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
                setVisible(false);
            });
        }, 2500);
    }, [fadeAnim]);

    return (
        <ToastContext.Provider value={{ show }}>
            {children}
            {visible && <ToastBanner message={message} type={type} fadeAnim={fadeAnim} />}
        </ToastContext.Provider>
    );
}

function ToastBanner({ message, type, fadeAnim }: { message: string; type: ToastType; fadeAnim: Animated.Value }) {
    const { tc, typography: typ } = useThemeColors();

    const iconMap: Record<ToastType, { name: any; color: string }> = {
        success: { name: 'checkmark-circle', color: tc.accent },
        error: { name: 'alert-circle', color: tc.error },
        info: { name: 'information-circle', color: tc.info },
    };
    const icon = iconMap[type];

    return (
        <Animated.View
            style={[
                styles.toast,
                {
                    backgroundColor: tc.surface,
                    borderColor: icon.color + '66',
                    opacity: fadeAnim,
                    transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
                },
            ]}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
        >
            <Ionicons name={icon.name} size={18} color={icon.color} />
            <Text style={[typ.bodyBold, { color: tc.textPrimary, flex: 1 }]}>{message}</Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    toast: {
        position: 'absolute',
        top: 50,
        left: spacing.lg,
        right: spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.md,
        borderRadius: radii.md,
        borderWidth: 1,
        zIndex: 9999,
        elevation: 20,
    },
});
