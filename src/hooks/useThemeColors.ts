import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { themeColorsApi } from '../api/themeColors';
import {
  type ThemeColors,
  DEFAULT_THEME_COLORS,
  SHADE_LEVELS,
  type ColorPalette,
  type ShadeLevel,
} from '../types/theme';
import { hexToRgb, hexToHsl, hslToRgb } from '../utils/colorConversion';

// Convert RGB to string format for CSS variable
function rgbToString(r: number, g: number, b: number): string {
  return `${r}, ${g}, ${b}`;
}

// Опорная светлота шейдов для базового цвета с L = 50 %. Для реального базового
// цвета лестница масштабируется: 500 — ровно выбранный цвет, светлые шейды
// растягиваются от него к 97 (шейд 50), тёмные — к 10 (шейд 950).
const LIGHTNESS_LADDER: Record<ShadeLevel, number> = {
  50: 97,
  100: 94,
  200: 86,
  300: 76,
  400: 64,
  500: 50,
  600: 42,
  700: 34,
  800: 26,
  900: 18,
  950: 10,
};
const LADDER_TOP = LIGHTNESS_LADDER[50];
const LADDER_MID = LIGHTNESS_LADDER[500];
const LADDER_BOTTOM = LIGHTNESS_LADDER[950];

function shadeLightness(shade: ShadeLevel, baseLightness: number): number {
  const target = LIGHTNESS_LADDER[shade];
  if (target > LADDER_MID) {
    const share = (target - LADDER_MID) / (LADDER_TOP - LADDER_MID);
    return Math.max(baseLightness, baseLightness + share * (LADDER_TOP - baseLightness));
  }
  const share = (LADDER_MID - target) / (LADDER_MID - LADDER_BOTTOM);
  return Math.min(baseLightness, baseLightness - share * (baseLightness - LADDER_BOTTOM));
}

// Generate color palette from base color (returns RGB strings).
// Шейд 500 — сам выбранный цвет. Раньше он принудительно получал L = 50 %:
// оператор выбирал один цвет, а кнопки красились другим (пастель становилась
// насыщенной, дефолтный #3b82f6 уезжал в 11,100,244 против статики globals.css).
function generatePalette(baseHex: string): ColorPalette {
  const base = hexToRgb(baseHex);
  const { h, s, l } = hexToHsl(baseHex);
  const palette: Partial<ColorPalette> = {};

  for (const shade of SHADE_LEVELS) {
    if (shade === 500) {
      palette[shade] = rgbToString(base.r, base.g, base.b);
      continue;
    }
    // Adjust saturation slightly for very light/dark shades
    const adjustedS = shade <= 100 ? s * 0.7 : shade >= 900 ? s * 0.8 : s;
    const { r, g, b } = hslToRgb(h, adjustedS, shadeLightness(shade, l));
    palette[shade] = rgbToString(r, g, b);
  }

  return palette as ColorPalette;
}

// Interpolate between two RGB colors
function interpolateRgb(
  rgb1: { r: number; g: number; b: number },
  rgb2: { r: number; g: number; b: number },
  factor: number,
): string {
  return rgbToString(
    Math.round(rgb1.r + (rgb2.r - rgb1.r) * factor),
    Math.round(rgb1.g + (rgb2.g - rgb1.g) * factor),
    Math.round(rgb1.b + (rgb2.b - rgb1.b) * factor),
  );
}

type Rgb = { r: number; g: number; b: number };

function mixRgb(rgb1: Rgb, rgb2: Rgb, factor: number): Rgb {
  return {
    r: Math.round(rgb1.r + (rgb2.r - rgb1.r) * factor),
    g: Math.round(rgb1.g + (rgb2.g - rgb1.g) * factor),
    b: Math.round(rgb1.b + (rgb2.b - rgb1.b) * factor),
  };
}

// WCAG relative luminance
function relativeLuminance({ r, g, b }: Rgb): number {
  const srgb = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
}

// WCAG contrast ratio between two colors
function contrastRatio(a: Rgb, b: Rgb): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/**
 * Guarantee a minimum contrast for a TEXT color against its background.
 *
 * Operators pick arbitrary palette colors in the theme editor, and several
 * tokens are additionally blended toward the surface (dark-500 = secondary
 * text mixed 40% into the card color). Without a floor, hint/meta text
 * regularly lands at a 1.5-2.5 contrast ratio and becomes unreadable.
 * When the color already passes, it is returned untouched, so well-tuned
 * palettes render byte-for-byte the same as before.
 */
function ensureReadable(fg: Rgb, towards: Rgb, bg: Rgb, minRatio: number): Rgb {
  if (contrastRatio(fg, bg) >= minRatio) return fg;
  for (let t = 0.1; t <= 1; t += 0.1) {
    const mixed = mixRgb(fg, towards, t);
    if (contrastRatio(mixed, bg) >= minRatio) return mixed;
  }
  return towards;
}

function parseTriplet(triplet: string): Rgb {
  const [r, g, b] = triplet.split(',').map((x) => Number(x.trim()));
  return { r, g, b };
}

function tripletOf({ r, g, b }: Rgb): string {
  return rgbToString(r, g, b);
}

// Белый текст на заливке остаётся, пока даёт AA для UI-элементов (3:1) —
// так на средних по светлоте цветах (синий #3b82f6: белый 3.7, тёмный 4.8)
// сохраняется привычный белый на кнопках. Ниже порога берётся сторона с
// лучшим контрастом: на пастельном акценте это тёмный текст.
const ON_COLOR_WHITE_MIN_RATIO = 3;

// Black-or-white text for a given button/badge background.
function onColorFor(bgTriplet: string): string {
  const bg = parseTriplet(bgTriplet);
  const white = { r: 255, g: 255, b: 255 };
  const ink = { r: 15, g: 23, b: 42 };
  const whiteRatio = contrastRatio(white, bg);
  if (whiteRatio >= ON_COLOR_WHITE_MIN_RATIO) return '255, 255, 255';
  return whiteRatio >= contrastRatio(ink, bg) ? '255, 255, 255' : '15, 23, 42';
}

type ThemeSurfaces = { surface: Rgb; text: Rgb };
const TEXT_SHADE_MIN_RATIO = 4.5;

// Текстовые шейды статусных палитр: 300/400 — текст в тёмной теме (ссылки,
// суммы, бейджи), 700 — их замена в светлой (.light ремапит *-300/400 -> *-700).
// Лестница привязана к базовому цвету, поэтому у тёмного акцента светлые шейды
// сжимаются, у светлого — тёмные; здесь им гарантируется AA на поверхности
// своей темы. Палитры, которые и так читаются, остаются нетронутыми.
function withReadableTextShades(
  palette: ColorPalette,
  dark: ThemeSurfaces,
  light: ThemeSurfaces,
): ColorPalette {
  const readable = (shade: ShadeLevel, towards: Rgb, bg: Rgb) =>
    tripletOf(ensureReadable(parseTriplet(palette[shade]), towards, bg, TEXT_SHADE_MIN_RATIO));
  return {
    ...palette,
    300: readable(300, dark.text, dark.surface),
    400: readable(400, dark.text, dark.surface),
    700: readable(700, light.text, light.surface),
  };
}

// Apply theme colors as CSS variables (RGB format for Tailwind opacity support)
export function applyThemeColors(themeColors: ThemeColors): void {
  // Частичный/битый ответ /branding/colors раньше ронял ВСЁ приложение в
  // ErrorBoundary (hexToRgb(undefined)). Недостающие поля добиваем дефолтами.
  const colors: ThemeColors = { ...DEFAULT_THEME_COLORS, ...themeColors };
  const root = document.documentElement;

  // Generate palettes from status colors
  const accentPalette = generatePalette(colors.accent);
  const successPalette = generatePalette(colors.success);
  const warningPalette = generatePalette(colors.warning);
  const errorPalette = generatePalette(colors.error);

  // Convert hex colors to RGB
  const darkBgRgb = hexToRgb(colors.darkBackground);
  const darkSurfaceRgb = hexToRgb(colors.darkSurface);
  const darkTextRgb = hexToRgb(colors.darkText);
  const darkTextSecRgb = hexToRgb(colors.darkTextSecondary);

  // Contrast floors: secondary text must stay readable on the card surface
  // regardless of the operator-chosen palette (AA 4.5 for dark-400, a softer
  // 3.5 floor for the blended hint token dark-500).
  const darkTextSecReadable = ensureReadable(darkTextSecRgb, darkTextRgb, darkSurfaceRgb, 5.0);
  const darkHintReadable = ensureReadable(
    mixRgb(darkTextSecRgb, darkSurfaceRgb, 0.4),
    darkTextRgb,
    darkSurfaceRgb,
    3.8,
  );

  // Apply dark palette with actual user colors:
  // Text colors (light shades): 50-100 = primary text, 200-300 = mixed, 400 = secondary text
  root.style.setProperty(
    '--color-dark-50',
    rgbToString(darkTextRgb.r, darkTextRgb.g, darkTextRgb.b),
  );
  root.style.setProperty(
    '--color-dark-100',
    rgbToString(darkTextRgb.r, darkTextRgb.g, darkTextRgb.b),
  );
  root.style.setProperty('--color-dark-200', interpolateRgb(darkTextRgb, darkTextSecRgb, 0.33));
  root.style.setProperty('--color-dark-300', interpolateRgb(darkTextRgb, darkTextSecRgb, 0.66));
  root.style.setProperty(
    '--color-dark-400',
    rgbToString(darkTextSecReadable.r, darkTextSecReadable.g, darkTextSecReadable.b),
  );

  // Transition colors (500-700): interpolate between secondary text and surface
  root.style.setProperty(
    '--color-dark-500',
    rgbToString(darkHintReadable.r, darkHintReadable.g, darkHintReadable.b),
  );
  root.style.setProperty('--color-dark-600', interpolateRgb(darkTextSecRgb, darkSurfaceRgb, 0.6));
  root.style.setProperty('--color-dark-700', interpolateRgb(darkTextSecRgb, darkSurfaceRgb, 0.8));

  // Surface/card colors (800-850): surface color
  root.style.setProperty(
    '--color-dark-800',
    rgbToString(darkSurfaceRgb.r, darkSurfaceRgb.g, darkSurfaceRgb.b),
  );
  root.style.setProperty('--color-dark-850', interpolateRgb(darkSurfaceRgb, darkBgRgb, 0.5));

  // Background colors (900-950): background color
  root.style.setProperty('--color-dark-900', interpolateRgb(darkSurfaceRgb, darkBgRgb, 0.7));
  root.style.setProperty('--color-dark-950', rgbToString(darkBgRgb.r, darkBgRgb.g, darkBgRgb.b));

  const lightBgRgb = hexToRgb(colors.lightBackground);
  const lightSurfaceRgb = hexToRgb(colors.lightSurface);
  const lightTextRgb = hexToRgb(colors.lightText);
  const lightTextSecRgb = hexToRgb(colors.lightTextSecondary);

  // Apply champagne palette with actual user colors:
  // Background colors (light shades): 50-100 = surface, 200-400 = background tones
  root.style.setProperty(
    '--color-champagne-50',
    rgbToString(lightSurfaceRgb.r, lightSurfaceRgb.g, lightSurfaceRgb.b),
  );
  root.style.setProperty('--color-champagne-100', interpolateRgb(lightSurfaceRgb, lightBgRgb, 0.3));
  root.style.setProperty(
    '--color-champagne-200',
    rgbToString(lightBgRgb.r, lightBgRgb.g, lightBgRgb.b),
  );
  root.style.setProperty('--color-champagne-300', interpolateRgb(lightBgRgb, lightTextSecRgb, 0.2));
  root.style.setProperty('--color-champagne-400', interpolateRgb(lightBgRgb, lightTextSecRgb, 0.4));

  // Transition colors (500-600): between bg and text.
  // Same contrast floors as the dark palette: champagne-600 backs dark-400
  // (secondary text) in the light theme, champagne-500 backs dark-500 (hints).
  const lightHintReadable = ensureReadable(
    mixRgb(lightBgRgb, lightTextSecRgb, 0.6),
    lightTextRgb,
    lightSurfaceRgb,
    3.8,
  );
  const lightTextSecReadable = ensureReadable(lightTextSecRgb, lightTextRgb, lightSurfaceRgb, 5.0);
  root.style.setProperty(
    '--color-champagne-500',
    rgbToString(lightHintReadable.r, lightHintReadable.g, lightHintReadable.b),
  );
  root.style.setProperty(
    '--color-champagne-600',
    rgbToString(lightTextSecReadable.r, lightTextSecReadable.g, lightTextSecReadable.b),
  );

  // Text colors (700-950): secondary to primary text
  root.style.setProperty(
    '--color-champagne-700',
    interpolateRgb(lightTextSecRgb, lightTextRgb, 0.33),
  );
  root.style.setProperty(
    '--color-champagne-800',
    interpolateRgb(lightTextSecRgb, lightTextRgb, 0.66),
  );
  root.style.setProperty(
    '--color-champagne-900',
    rgbToString(lightTextRgb.r, lightTextRgb.g, lightTextRgb.b),
  );
  root.style.setProperty(
    '--color-champagne-950',
    rgbToString(lightTextRgb.r, lightTextRgb.g, lightTextRgb.b),
  );

  const darkSurfaces: ThemeSurfaces = { surface: darkSurfaceRgb, text: darkTextRgb };
  const lightSurfaces: ThemeSurfaces = { surface: lightSurfaceRgb, text: lightTextRgb };
  const accent = withReadableTextShades(accentPalette, darkSurfaces, lightSurfaces);
  const success = withReadableTextShades(successPalette, darkSurfaces, lightSurfaces);
  const warning = withReadableTextShades(warningPalette, darkSurfaces, lightSurfaces);
  const error = withReadableTextShades(errorPalette, darkSurfaces, lightSurfaces);

  for (const shade of SHADE_LEVELS) {
    root.style.setProperty(`--color-accent-${shade}`, accent[shade]);
    root.style.setProperty(`--color-success-${shade}`, success[shade]);
    root.style.setProperty(`--color-warning-${shade}`, warning[shade]);
    root.style.setProperty(`--color-error-${shade}`, error[shade]);
  }

  // Readable text color on top of each status color (buttons, filled badges).
  // Hardcoded white breaks the moment an operator picks a light accent.
  root.style.setProperty('--color-on-accent', onColorFor(accent[500]));
  root.style.setProperty('--color-on-success', onColorFor(success[500]));
  root.style.setProperty('--color-on-warning', onColorFor(warning[500]));
  root.style.setProperty('--color-on-error', onColorFor(error[500]));

  // Apply semantic colors (hex for direct use)
  root.style.setProperty('--color-dark-bg', colors.darkBackground);
  root.style.setProperty('--color-dark-surface', colors.darkSurface);
  root.style.setProperty('--color-dark-text', colors.darkText);
  root.style.setProperty('--color-dark-text-secondary', colors.darkTextSecondary);

  root.style.setProperty('--color-light-bg', colors.lightBackground);
  root.style.setProperty('--color-light-surface', colors.lightSurface);
  root.style.setProperty('--color-light-text', colors.lightText);
  root.style.setProperty('--color-light-text-secondary', colors.lightTextSecondary);
}

export function useThemeColors() {
  const queryClient = useQueryClient();

  const {
    data: colors,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['theme-colors'],
    queryFn: themeColorsApi.getColors,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Apply colors when loaded or changed
  useEffect(() => {
    const colorsToApply = colors || DEFAULT_THEME_COLORS;
    applyThemeColors(colorsToApply);
  }, [colors]);

  const invalidateColors = () => {
    queryClient.invalidateQueries({ queryKey: ['theme-colors'] });
  };

  return {
    colors: colors || DEFAULT_THEME_COLORS,
    isLoading,
    error,
    invalidateColors,
  };
}
