/**
 * Global settings context — persisted to AsyncStorage.
 * Provides API config, detection thresholds, accessibility, camera, and TTS settings.
 */
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { InferenceMode } from '../services/offlineTypes';
import { HOSTED_API_BASE_URL, normalizeApiBaseUrl } from '../services/serverApi';

const STORAGE_KEY = '@smc/settings';
const DEFAULT_API_BASE_URL = HOSTED_API_BASE_URL;
const SETTINGS_SCHEMA_VERSION = 2;

export type Settings = {
    inferenceMode: InferenceMode;
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
    inferenceMode: Platform.OS === 'android' ? 'offline' : 'server',
    apiBaseUrl: DEFAULT_API_BASE_URL,
    confidenceThreshold: 0.25,
    screenSpoofGuardEnabled: false,
    cameraResolution: 'medium',
    liveFps: 1,
    liveStabilityWindowSec: 3,
    liveStabilityMinFrames: 3,
    liveStabilityIou: 0.45,
    ttsEnabled: true,
    ttsSpeed: 1.0,
    darkMode: true,
    highContrast: false,
    largeFonts: false,
    hapticFeedback: true,
    debugModeEnabled: false,
};

function sanitizeSettings(input: Partial<Settings>) {
    const merged: Settings = {
        ...DEFAULT_SETTINGS,
        ...input,
        apiBaseUrl: normalizeApiBaseUrl(input.apiBaseUrl ?? DEFAULT_SETTINGS.apiBaseUrl),
    };

    return merged;
}

type PersistedSettings = Partial<Settings> & {
    __schemaVersion?: number;
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
                    const parsed = JSON.parse(stored) as PersistedSettings;
                    const migrated = { ...parsed };
                    if ((parsed.__schemaVersion ?? 0) < SETTINGS_SCHEMA_VERSION) {
                        migrated.debugModeEnabled = false;
                    }
                    delete migrated.__schemaVersion;
                    setSettings(sanitizeSettings(migrated));
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
        AsyncStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ __schemaVersion: SETTINGS_SCHEMA_VERSION, ...settings }),
        ).catch((e) =>
            console.warn('[SettingsContext] Failed to save settings:', e)
        );
    }, [settings]);

    const update = useCallback((partial: Partial<Settings>) => {
        setSettings((prev) => sanitizeSettings({ ...prev, ...partial }));
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
