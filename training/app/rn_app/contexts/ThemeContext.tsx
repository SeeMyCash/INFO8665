/**
 * ThemeProvider — resolves the active ColorPalette based on darkMode + highContrast settings.
 * Use `useThemeColors()` in any component to get the resolved palette.
 */
import React, { createContext, useContext, useMemo } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import {
    darkColors,
    lightColors,
    darkHighContrast,
    lightHighContrast,
    ColorPalette,
    typography,
    largeFontScale,
} from '../theme';

type ThemeContextType = {
    tc: ColorPalette;
    isDark: boolean;
    typography: typeof typography;
    fontScale: number;
};

const ThemeContext = createContext<ThemeContextType>({
    tc: darkColors,
    isDark: true,
    typography,
    fontScale: 1,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const { settings } = useSettings();

    const value = useMemo(() => {
        const base = settings.darkMode ? darkColors : lightColors;
        const hc = settings.darkMode ? darkHighContrast : lightHighContrast;
        const palette = settings.highContrast ? { ...base, ...hc } : base;

        const scale = settings.largeFonts ? largeFontScale : 1;
        const scaledTypography = settings.largeFonts
            ? (Object.fromEntries(
                Object.entries(typography).map(([key, val]) => [
                    key,
                    { ...val, fontSize: Math.round(val.fontSize * scale) },
                ])
            ) as typeof typography)
            : typography;

        return {
            tc: palette,
            isDark: settings.darkMode,
            typography: scaledTypography,
            fontScale: scale,
        };
    }, [settings.darkMode, settings.highContrast, settings.largeFonts]);

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

/** Returns the resolved color palette + typography based on user settings. */
export function useThemeColors() {
    return useContext(ThemeContext);
}
