import React, { useEffect, useRef } from 'react';
import { Platform, StatusBar } from 'react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { HistoryProvider } from './contexts/HistoryContext';
import { ThemeProvider, useThemeColors } from './contexts/ThemeContext';
import { ToastProvider } from './components/Toast';
import { CameraCommandProvider, useCameraCommand, type CameraCommand } from './contexts/CameraCommandContext';
import ErrorBoundary from './components/ErrorBoundary';
import OfflineBanner from './components/OfflineBanner';
import LandingScreen from './screens/LandingScreen';
import AboutScreen from './screens/AboutScreen';
import InferenceScreen from './screens/InferenceScreen';
import SettingsScreen from './screens/SettingsScreen';
import HistoryScreen from './screens/HistoryScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import DiagnosticsScreen from './screens/DiagnosticsScreen';
import { typography, spacing } from './theme';

export type RootStackParamList = {
    Landing: undefined;
    About: undefined;
    Onboarding: undefined;
    MainTabs: undefined;
    Diagnostics: undefined;
};

export type TabParamList = {
    Inference: undefined;
    History: undefined;
    Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function MainTabs() {
    const { tc } = useThemeColors();
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerStyle: { backgroundColor: tc.background },
                headerTintColor: tc.textPrimary,
                headerTitleStyle: { ...typography.bodyBold },
                headerShadowVisible: false,
                tabBarStyle: {
                    backgroundColor: tc.surface,
                    borderTopColor: tc.border,
                    borderTopWidth: 1,
                    height: 64,
                    paddingBottom: spacing.sm,
                    paddingTop: spacing.xs,
                },
                tabBarActiveTintColor: tc.primary,
                tabBarInactiveTintColor: tc.textMuted,
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '600' as const,
                },
                tabBarIcon: ({ focused, color }) => {
                    const icons: Record<string, any> = {
                        Inference: focused ? 'scan' : 'scan-outline',
                        History: focused ? 'time' : 'time-outline',
                        Settings: focused ? 'settings' : 'settings-outline',
                    };
                    return <Ionicons name={icons[route.name]} size={22} color={color} />;
                },
            })}
        >
            <Tab.Screen name="Inference" component={InferenceScreen} options={{ title: 'Scan', tabBarButtonTestID: 'tab-scan' }} />
            <Tab.Screen name="History" component={HistoryScreen} options={{ title: 'History', tabBarButtonTestID: 'tab-history' }} />
            <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings', tabBarButtonTestID: 'tab-settings' }} />
        </Tab.Navigator>
    );
}

function AppNavigator() {
    const { tc, isDark } = useThemeColors();

    const stackScreenOptions = {
        headerStyle: { backgroundColor: tc.background },
        headerTintColor: tc.textPrimary,
        headerTitleStyle: { ...typography.bodyBold },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: tc.background },
    };

    return (
        <>
            <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor={tc.background}
            />
            <OfflineBanner />
            <Stack.Navigator initialRouteName="Landing" screenOptions={stackScreenOptions}>
                <Stack.Screen name="Landing" component={LandingScreen} options={{ headerShown: false }} />
                <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
                <Stack.Screen name="About" component={AboutScreen} options={{ title: 'About' }} />
                <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
                <Stack.Screen name="Diagnostics" component={DiagnosticsScreen} options={{ title: 'Diagnostics' }} />
            </Stack.Navigator>
        </>
    );
}

/* ── Eager permission requests ───────────────────────────────────────────────
 * Ask for camera and microphone on app load so the browser/OS shows its
 * permission dialogs before the user reaches the Scan tab.
 * Streams are released immediately — we only need the grant.               */

function useEagerPermissions() {
    // Native camera permission (expo-camera)
    const [, requestCameraPermission] = useCameraPermissions();

    useEffect(() => {
        if (Platform.OS !== 'web') {
            // Request native camera permission eagerly
            requestCameraPermission();
            return;
        }

        // Web: request camera + mic together so the browser shows one combined prompt
        if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;

        let stream: MediaStream | null = null;
        navigator.mediaDevices
            .getUserMedia({ audio: true, video: true })
            .then((s) => {
                stream = s;
                s.getTracks().forEach((t) => t.stop());
            })
            .catch(() => { /* denied — the app handles this gracefully per-feature */ });

        return () => { stream?.getTracks().forEach((t) => t.stop()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
}

/* ── Global voice command engine ─────────────────────────────────────────────
 * Single SpeechRecognition instance for the entire app.
 * Dispatches typed commands to CameraCommandContext and navigates to the
 * Scan tab for commands that require the camera to be open.
 * Running this at App level avoids the dual-instance browser limitation.   */

function useGlobalVoiceCommands(
    navigationRef: React.RefObject<NavigationContainerRef<RootStackParamList>>,
) {
    const { settings } = useSettings();
    const { dispatch } = useCameraCommand();

    useEffect(() => {
        if (Platform.OS !== 'web') return;
        if (!settings.voiceCommandsEnabled) return;

        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SR) return;

        const recognition: SpeechRecognition = new SR();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        const goToScan = (cmd: CameraCommand) => {
            // Navigate to MainTabs → Inference tab, then dispatch the command.
            // navigate() is safe to call even if we're already there.
            (navigationRef.current as any)?.navigate('MainTabs', { screen: 'Inference' });
            dispatch(cmd);
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            const t = event.results[event.results.length - 1][0].transcript
                .trim()
                .toLowerCase();

            if (t.includes('go live') || t.includes('start live')) {
                goToScan('go-live');
            } else if (t.includes('stop live') || t.includes('stop scanning')) {
                dispatch('stop-live');
            } else if (t.includes('scan again') || t.includes('rescan')) {
                dispatch('rescan');
            } else if (t.includes('stop camera')) {
                dispatch('stop');
            } else if (t.includes('flip')) {
                dispatch('flip');
            } else if (t.includes('scan') || t.includes('snap') || t.includes('capture')) {
                goToScan('snap');
            }
        };

        // Auto-restart on end so listening stays continuous
        recognition.onend = () => {
            try { recognition.start(); } catch { /* already starting */ }
        };
        recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
            // 'no-speech' and 'aborted' are expected; re-start for others
            if (e.error !== 'no-speech' && e.error !== 'aborted') {
                try { recognition.start(); } catch { /* ignore */ }
            }
        };

        try { recognition.start(); } catch { /* already running */ }

        return () => {
            recognition.onend = null;
            try { recognition.stop(); } catch { /* ignore */ }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [settings.voiceCommandsEnabled]);
}

/* ── Inner app shell (has access to all contexts) ───────────────────────── */

function AppShell({
    navigationRef,
}: {
    navigationRef: React.RefObject<NavigationContainerRef<RootStackParamList>>;
}) {
    useEagerPermissions();
    useGlobalVoiceCommands(navigationRef);

    return (
        <NavigationContainer ref={navigationRef as any}>
            <AppNavigator />
        </NavigationContainer>
    );
}

export default function App() {
    const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

    return (
        <ErrorBoundary>
            <SettingsProvider>
                <CameraCommandProvider>
                    <HistoryProvider>
                        <ThemeProvider>
                            <ToastProvider>
                                <AppShell navigationRef={navigationRef} />
                            </ToastProvider>
                        </ThemeProvider>
                    </HistoryProvider>
                </CameraCommandProvider>
            </SettingsProvider>
        </ErrorBoundary>
    );
}
