export type BackgroundType =
  | 'aurora'
  | 'sparkles'
  | 'vortex'
  | 'shooting-stars'
  | 'background-beams'
  | 'background-beams-collision'
  | 'gradient-animation'
  | 'wavy'
  | 'background-lines'
  | 'boxes'
  | 'meteors'
  | 'grid'
  | 'dots'
  | 'spotlight'
  | 'ripple'
  | 'none';

export interface AnimationConfig {
  enabled: boolean;
  type: BackgroundType;
  settings: Record<string, unknown>;
  opacity: number;
  blur: number;
  reducedOnMobile: boolean;
}

export const DEFAULT_ANIMATION_CONFIG: AnimationConfig = {
  enabled: true,
  type: 'aurora',
  settings: {},
  opacity: 1.0,
  blur: 0,
  reducedOnMobile: true,
};

/** Sanitize color values to prevent CSS injection. Allows hex, rgb/rgba, hsl/hsla, and named colors. */
export function sanitizeColor(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  // Allow hex colors
  if (/^#[0-9a-fA-F]{3,8}$/.test(trimmed)) return trimmed;
  // Allow rgb/rgba/hsl/hsla with numbers, commas, spaces, dots, %
  if (/^(rgb|hsl)a?\([0-9,.\s/%]+\)$/.test(trimmed)) return trimmed;
  // Allow CSS named colors (alphanumeric only, exclude CSS-wide keywords)
  if (/^[a-zA-Z]{3,30}$/.test(trimmed) && !CSS_WIDE_KEYWORDS.has(trimmed.toLowerCase()))
    return trimmed;
  return fallback;
}

/** Clamp a numeric value within bounds */
export function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Math.max(min, Math.min(max, n));
}

/** Safely extract a boolean setting with fallback */
export function safeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

/** Safely extract a string setting from an allowed set of values */
export function safeSelect(value: unknown, allowed: readonly string[], fallback: string): string {
  return typeof value === 'string' && allowed.includes(value) ? value : fallback;
}

const CSS_WIDE_KEYWORDS = new Set(['inherit', 'initial', 'unset', 'revert', 'revert-layer']);

export interface SettingDefinition {
  key: string;
  label: string;
  type: 'number' | 'color' | 'boolean' | 'select';
  min?: number;
  max?: number;
  step?: number;
  default: unknown;
  options?: { label: string; value: string }[];
}

export interface BackgroundDefinition {
  type: BackgroundType;
  labelKey: string;
  descriptionKey: string;
  category: 'css' | 'canvas' | 'svg';
  settings: SettingDefinition[];
}
