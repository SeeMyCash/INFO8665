import { useMemo } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { colors, highContrastColors, typography, largeFontScale } from '../theme';

/**
 * Returns the active color palette & font sizes respecting
 * the user's accessibility preferences (high contrast + large fonts).
 */
export function useAccessibleTheme() {
  const { settings } = useSettings();

  const activeColors = useMemo(() => {
    if (settings.highContrast) {
      return { ...colors, ...highContrastColors };
    }
    return colors;
  }, [settings.highContrast]);

  const fontScale = settings.largeFonts ? largeFontScale : 1;

  const activeTypography = useMemo(() => {
    if (!settings.largeFonts) return typography;

    const scaled: Record<string, any> = {};
    for (const [key, val] of Object.entries(typography)) {
      scaled[key] = {
        ...val,
        fontSize: Math.round(val.fontSize * fontScale),
      };
    }
    return scaled as typeof typography;
  }, [settings.largeFonts, fontScale]);

  return {
    colors: activeColors,
    typography: activeTypography,
    fontScale,
    isHighContrast: settings.highContrast,
    isLargeFonts: settings.largeFonts,
  };
}
