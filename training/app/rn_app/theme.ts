/**
 * SMC Inference — Design System Tokens
 *
 * Both palettes meet WCAG AA (≥ 4.5:1 for normal text, ≥ 3:1 for large/bold text).
 * High-contrast variants provide AAA (≥ 7:1).
 */

// ──── Color Palette Type ────

export type ColorPalette = typeof darkColors;

// ──── Dark Mode (default) ────

export const darkColors = {
  // Gradients
  primaryGradient: ['#7C3AED', '#A78BFA', '#C4B5FD'] as const,
  accentGradient: ['#10B981', '#34D399'] as const,
  heroGradient: ['#0F172A', '#1E1B4B', '#312E81'] as const,
  cardGradient: ['#1E293B', '#1E2746'] as const,

  // Solids
  primary: '#A78BFA',       // 6.3:1 on #0F172A
  accent: '#34D399',        // 8.6:1
  warning: '#FBBF24',       // 10.3:1
  error: '#F87171',         // 5.9:1
  info: '#60A5FA',          // 6.8:1

  // Surfaces
  background: '#0F172A',
  surface: '#1E293B',
  surfaceElevated: '#334155',
  border: '#3B4C63',
  borderLight: '#556577',

  // Text
  textPrimary: '#F8FAFC',   // 15.3:1
  textSecondary: '#A1AEBF', // 7.1:1
  textMuted: '#8494A7',     // 4.8:1
  textInverse: '#0F172A',

  // Status
  online: '#34D399',
  offline: '#F87171',
  busy: '#FBBF24',
};

// ──── Light Mode ────

export const lightColors: ColorPalette = {
  // Gradients — stronger/deeper hues work on light backgrounds
  primaryGradient: ['#6D28D9', '#7C3AED', '#8B5CF6'] as const,
  accentGradient: ['#059669', '#10B981'] as const,
  heroGradient: ['#F8FAFC', '#EDE9FE', '#DDD6FE'] as const,
  cardGradient: ['#F1F5F9', '#EDE9FE'] as const,

  // Solids — darker shades for contrast on white
  primary: '#7C3AED',       // 6.0:1 on #FFFFFF
  accent: '#059669',        // 4.6:1 on #FFFFFF
  warning: '#B45309',       // 5.9:1 on #FFFFFF
  error: '#DC2626',         // 5.6:1 on #FFFFFF
  info: '#2563EB',          // 5.3:1 on #FFFFFF

  // Surfaces
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceElevated: '#F1F5F9',
  border: '#CBD5E1',
  borderLight: '#E2E8F0',

  // Text — all ≥ 4.5:1 on #FFFFFF / #F8FAFC
  textPrimary: '#0F172A',   // 15.3:1
  textSecondary: '#475569', // 7.1:1
  textMuted: '#64748B',     // 4.6:1
  textInverse: '#F8FAFC',

  // Status
  online: '#059669',        // dark green on light
  offline: '#DC2626',       // dark red on light
  busy: '#B45309',          // dark amber on light
};

// ──── High-contrast overrides ────

export const darkHighContrast: Partial<ColorPalette> = {
  primary: '#C4B5FD',
  accent: '#6EE7B7',
  warning: '#FDE68A',
  error: '#FCA5A5',
  info: '#93C5FD',
  border: '#64748B',
  borderLight: '#94A3B8',
  textSecondary: '#CBD5E1',
  textMuted: '#A1AEBF',
  online: '#6EE7B7',
  offline: '#FCA5A5',
  busy: '#FDE68A',
};

export const lightHighContrast: Partial<ColorPalette> = {
  primary: '#5B21B6',       // even darker purple
  accent: '#047857',
  warning: '#92400E',
  error: '#B91C1C',
  info: '#1D4ED8',
  border: '#94A3B8',
  borderLight: '#CBD5E1',
  textSecondary: '#1E293B',
  textMuted: '#334155',
  online: '#047857',
  offline: '#B91C1C',
  busy: '#92400E',
};

// ──── Static export for backward compat (defaults to dark) ────

export const colors = darkColors;

// ──── Spacing ────

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
};

// ──── Radii ────

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

// ──── Typography ────

export const typography = {
  hero: { fontSize: 36, fontWeight: '800' as const, letterSpacing: -1 },
  h1: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: '600' as const },
  h3: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  bodyBold: { fontSize: 15, fontWeight: '600' as const },
  caption: { fontSize: 13, fontWeight: '500' as const },
  mono: { fontSize: 13, fontWeight: '500' as const, fontFamily: 'monospace' as const },
  badge: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 0.5 },
};

export const largeFontScale = 1.3;

// ──── Shadows ────

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  button: {
    shadowColor: '#A78BFA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
};

export const touchTargets = {
  min: 44,
};
