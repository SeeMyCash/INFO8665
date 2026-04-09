/**
 * Global settings context — persisted to AsyncStorage.
 * Provides API config, detection thresholds, accessibility, camera, and TTS settings.
 */
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@smc/settings';

export type Settings = {
    apiBaseUrl: string;
    confidenceThreshold: number;
    screenSpoofGuardEnabled: boolean;
    cameraResolution: 'low' | 'medium' | 'high';
    liveFps: number;
    liveStabilityWindowSec: number;
    liveStabilityMinFrames: number;
    liveStabilityIou: number;
    ttsEnabled: boolean;
    ttsSpeed: number;
    darkMode: boolean;
    highContrast: boolean;
    largeFonts: boolean;
    hapticFeedback: boolean;
    debugModeEnabled: boolean;
};

const DEFAULT_SETTINGS: Settings = {
    apiBaseUrl: (process.env.EXPO_PUBLIC_API_BASE_URL as string | undefined) || (typeof window !== 'undefined' ? window.location.origin : 'https://smc.femilawal.com'),
    confidenceThreshold: 0.25,
    screenSpoofGuardEnabled: false,
    cameraResolution: 'medium',
    liveFps: 1,
    liveStabilityWindowSec: 3,
    liveStabilityMinFrames: 3,
    liveStabilityIou: 0.45,
    ttsEnabled: true,
    ttsSpeed: 1.0,
    darkMode: false,
    highContrast: false,
    largeFonts: false,
    hapticFeedback: true,
    debugModeEnabled: false,
};

type SettingsContextType = {
    settings: Settings;
    update: (partial: Partial<Settings>) => void;
    reset: () => void;
    /** True while the initial load from storage is in progress. */
    loading: boolean;
    /** Clear all persisted settings from storage and reset to defaults. */
    clearStorage: () => Promise<void>;
};

const SettingsContext = createContext<SettingsContextType>({
    settings: DEFAULT_SETTINGS,
    update: () => { },
    reset: () => { },
    loading: true,
    clearStorage: async () => { },
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const isInitialized = useRef(false);

    // Load settings from AsyncStorage on mount
    useEffect(() => {
        (async () => {
            try {
                const stored = await AsyncStorage.getItem(STORAGE_KEY);
                if (stored) {
                    const parsed = JSON.parse(stored) as Partial<Settings> & { showDebugPanel?: boolean };
                    const migrated: Partial<Settings> = { ...parsed };
                    if (typeof migrated.debugModeEnabled !== 'boolean' && typeof parsed.showDebugPanel === 'boolean') {
                        migrated.debugModeEnabled = parsed.showDebugPanel;
                    }
                    delete (migrated as any).showDebugPanel;
                    // Merge with defaults to handle new keys added in updates
                    setSettings((prev) => ({ ...prev, ...migrated }));
                }
            } catch (e) {
                console.warn('[SettingsContext] Failed to load settings:', e);
            } finally {
                isInitialized.current = true;
                setLoading(false);
            }
        })();
    }, []);

    // Persist settings to AsyncStorage whenever they change (after initial load)
    useEffect(() => {
        if (!isInitialized.current) return;
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings)).catch((e) =>
            console.warn('[SettingsContext] Failed to save settings:', e)
        );
    }, [settings]);

    const update = useCallback((partial: Partial<Settings>) => {
        setSettings((prev) => ({ ...prev, ...partial }));
    }, []);

    const reset = useCallback(() => {
        setSettings(DEFAULT_SETTINGS);
    }, []);

    const clearStorage = useCallback(async () => {
        try {
            await AsyncStorage.removeItem(STORAGE_KEY);
            setSettings(DEFAULT_SETTINGS);
        } catch (e) {
            console.warn('[SettingsContext] Failed to clear storage:', e);
        }
    }, []);

    return (
        <SettingsContext.Provider value={{ settings, update, reset, loading, clearStorage }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    return useContext(SettingsContext);
}

export { DEFAULT_SETTINGS };
