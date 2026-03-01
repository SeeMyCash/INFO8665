import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { SettingsProvider } from './contexts/SettingsContext';
import { HistoryProvider } from './contexts/HistoryContext';
import { ThemeProvider, useThemeColors } from './contexts/ThemeContext';
import { ToastProvider } from './components/Toast';
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
            <Tab.Screen name="Inference" component={InferenceScreen} options={{ title: 'Scan' }} />
            <Tab.Screen name="History" component={HistoryScreen} options={{ title: 'History' }} />
            <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
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

export default function App() {
    return (
        <ErrorBoundary>
            <SettingsProvider>
                <HistoryProvider>
                    <ThemeProvider>
                        <ToastProvider>
                            <NavigationContainer>
                                <AppNavigator />
                            </NavigationContainer>
                        </ToastProvider>
                    </ThemeProvider>
                </HistoryProvider>
            </SettingsProvider>
        </ErrorBoundary>
    );
}
