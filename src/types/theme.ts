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

// Extended theme settings for user preferences
export type BorderRadiusPreset = 'none' | 'small' | 'medium' | 'large' | 'pill';
export type SpacingPreset = 'compact' | 'comfortable' | 'spacious';
export type ThemeMode = 'dark' | 'light' | 'system';

export interface UserThemePreferences {
  /**
   * Theme mode preference
   * @default 'system'
   */
  theme: ThemeMode;

  /**
   * Border radius preset
   * @default 'large'
   */
  borderRadius: BorderRadiusPreset;

  /**
   * Whether animations are enabled
   * @default true
   */
  animationsEnabled: boolean;
}

export const DEFAULT_USER_PREFERENCES: UserThemePreferences = {
  theme: 'system',
  borderRadius: 'large',
  animationsEnabled: true,
};

// CSS variable values for each preset
export const BORDER_RADIUS_VALUES: Record<BorderRadiusPreset, string> = {
  none: '0px',
  small: '8px',
  medium: '16px',
  large: '24px',
  pill: '9999px',
};

export const SPACING_VALUES: Record<SpacingPreset, { padding: string; gap: string }> = {
  compact: { padding: '12px', gap: '12px' },
  comfortable: { padding: '16px', gap: '16px' },
  spacious: { padding: '24px', gap: '24px' },
};
