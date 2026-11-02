/**
 * Design tokens — Tracklyst.
 * Neutral slate scale + a single emerald accent (already the de-facto
 * dominant color across the app before this file existed). Kept intentionally
 * small: everything else in the app should reference these instead of
 * inlining hex literals.
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    bg: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceAlt: '#F1F5F9',
    border: '#E2E8F0',
    text: '#0F172A',
    textMuted: '#64748B',
    textSubtle: '#94A3B8',
    tint: '#10B981',
    tintMuted: '#D1FAE5',
    danger: '#EF4444',
    dangerMuted: '#FEE2E2',
    warning: '#F59E0B',
    icon: '#64748B',
    tabIconDefault: '#94A3B8',
    tabIconSelected: '#10B981',
    // Legacy aliases kept for the few remaining boilerplate consumers.
    background: '#F8FAFC',
  },
  dark: {
    bg: '#020617',
    surface: '#0B1220',
    surfaceAlt: '#1E293B',
    border: '#1E293B',
    text: '#F8FAFC',
    textMuted: '#94A3B8',
    textSubtle: '#64748B',
    tint: '#34D399',
    tintMuted: '#064E3B',
    danger: '#F87171',
    dangerMuted: '#450A0A',
    warning: '#FBBF24',
    icon: '#94A3B8',
    tabIconDefault: '#64748B',
    tabIconSelected: '#34D399',
    background: '#020617',
  },
};

export const Radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  pill: 999,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
};

// Neutral, low-opacity shadows — no colored glow except where a screen
// deliberately wants one (e.g. a primary FAB), which stays local to that spot.
export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
};

export const Typography = {
  display: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.5 },
  title: { fontSize: 20, fontWeight: '800' as const, letterSpacing: -0.3 },
  subtitle: { fontSize: 15, fontWeight: '700' as const },
  body: { fontSize: 14, fontWeight: '500' as const },
  caption: { fontSize: 12, fontWeight: '500' as const },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
