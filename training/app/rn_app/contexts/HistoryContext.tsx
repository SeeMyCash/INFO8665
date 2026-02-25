/**
 * History context — persists inference results to AsyncStorage.
 */
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@smc/history';
const MAX_ENTRIES = 100;

export type HistoryEntry = {
    id: string;
    timestamp: number;
    imageUri: string | null;
    detections: any[];
    classification: any | null;
    totalValue: number | null;
    timing: number | null;
    error: string | null;
};

type HistoryContextType = {
    entries: HistoryEntry[];
    add: (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => void;
    clear: () => void;
    /** True while initial load from storage is in progress. */
    loading: boolean;
    /** Clear all persisted history from storage. */
    clearStorage: () => Promise<void>;
    /** Number of entries currently stored. */
    count: number;
};

const HistoryContext = createContext<HistoryContextType>({
    entries: [],
    add: () => { },
    clear: () => { },
    loading: true,
    clearStorage: async () => { },
    count: 0,
});

let _idCounter = 0;

export function HistoryProvider({ children }: { children: React.ReactNode }) {
    const [entries, setEntries] = useState<HistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const isInitialized = useRef(false);

    // Load history from AsyncStorage on mount
    useEffect(() => {
        (async () => {
            try {
                const stored = await AsyncStorage.getItem(STORAGE_KEY);
                if (stored) {
                    const parsed = JSON.parse(stored) as HistoryEntry[];
                    if (Array.isArray(parsed)) {
                        setEntries(parsed.slice(0, MAX_ENTRIES));
                        // Set the id counter past any existing IDs
                        _idCounter = parsed.length;
                    }
                }
            } catch (e) {
                console.warn('[HistoryContext] Failed to load history:', e);
            } finally {
                isInitialized.current = true;
                setLoading(false);
            }
        })();
    }, []);

    // Persist history to AsyncStorage whenever entries change (after initial load)
    useEffect(() => {
        if (!isInitialized.current) return;
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries)).catch((e) =>
            console.warn('[HistoryContext] Failed to save history:', e)
        );
    }, [entries]);

    const add = useCallback((entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => {
        const newEntry: HistoryEntry = {
            ...entry,
            id: `hist_${++_idCounter}_${Date.now()}`,
            timestamp: Date.now(),
        };
        setEntries((prev) => [newEntry, ...prev].slice(0, MAX_ENTRIES));
    }, []);

    const clear = useCallback(() => {
        setEntries([]);
    }, []);

    const clearStorage = useCallback(async () => {
        try {
            await AsyncStorage.removeItem(STORAGE_KEY);
            setEntries([]);
        } catch (e) {
            console.warn('[HistoryContext] Failed to clear storage:', e);
        }
    }, []);

    return (
        <HistoryContext.Provider value={{ entries, add, clear, loading, clearStorage, count: entries.length }}>
            {children}
        </HistoryContext.Provider>
    );
}

export function useHistory() {
    return useContext(HistoryContext);
}
