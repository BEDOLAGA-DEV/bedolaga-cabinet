// Theme color settings interface
export interface ThemeColors {
  // Main accent color
  accent: string;

  // Dark theme
  darkBackground: string;
  darkSurface: string;
  darkText: string;
  darkTextSecondary: string;

  // Light theme
  lightBackground: string;
  lightSurface: string;
  lightText: string;
  lightTextSecondary: string;

  // Status colors
  success: string;
  warning: string;
  error: string;
}

export interface ThemeSettings extends ThemeColors {
  id?: number;
  updated_at?: string;
}

// Enabled themes settings
export interface EnabledThemes {
  dark: boolean;
  light: boolean;
}

export const DEFAULT_ENABLED_THEMES: EnabledThemes = {
  dark: true,
  light: true,
};

// Default theme colors
export const DEFAULT_THEME_COLORS: ThemeColors = {
  accent: '#3b82f6',

  darkBackground: '#0a0f1a',
  darkSurface: '#0f172a',
  darkText: '#f1f5f9',
  darkTextSecondary: '#94a3b8',

  lightBackground: '#F7E7CE',
  lightSurface: '#FEF9F0',
  lightText: '#1F1A12',
  lightTextSecondary: '#7D6B48',

  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
};

// Color shade levels for palette generation
export const SHADE_LEVELS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

// Extended shade levels including 850 for dark palette
export const EXTENDED_SHADE_LEVELS = [
  50, 100, 200, 300, 400, 500, 600, 700, 800, 850, 900, 950,
] as const;

export type ShadeLevel = (typeof SHADE_LEVELS)[number];
export type ExtendedShadeLevel = (typeof EXTENDED_SHADE_LEVELS)[number];

export type ColorPalette = Record<ShadeLevel | 850, string>;
