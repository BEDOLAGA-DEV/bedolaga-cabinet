import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { themeColorsQueryOptions } from '../api/themeColors';
import {
  type ThemeColors,
  DEFAULT_THEME_COLORS,
  SHADE_LEVELS,
  type ColorPalette,
  type ShadeLevel,
} from '../types/theme';
import { hexToRgb, hexToHsl, hslToRgb } from '../utils/colorConversion';
import { writeThemeColorsHint } from '../utils/themeColorsHint';

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

const WHITE: Rgb = { r: 255, g: 255, b: 255 };
const INK: Rgb = { r: 15, g: 23, b: 42 };

function prefersWhiteText(bg: Rgb): boolean {
  const whiteRatio = contrastRatio(WHITE, bg);
  if (whiteRatio >= ON_COLOR_WHITE_MIN_RATIO) return true;
  return whiteRatio >= contrastRatio(INK, bg);
}

// Black-or-white text for a given button/badge background.
function onColorFor(bgTriplet: string): string {
  return prefersWhiteText(parseTriplet(bgTriplet)) ? '255, 255, 255' : '15, 23, 42';
}

/** Тот же выбор белый/тёмный для hex-заливки — для иконок, рисуемых вне CSS. */
export function readableTextOnHex(hex: string): string {
  return prefersWhiteText(hexToRgb(hex)) ? '#ffffff' : '#0f172a';
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

/**
 * CSS-переменные палитры для :root (RGB-триплеты — ради Tailwind-прозрачности).
 * Чистая функция: результат и ставится на документ, и уходит в подсказку первой
 * отрисовки, которую инлайн-скрипт index.html применит до загрузки приложения.
 */
export function computeThemeCssVars(themeColors: ThemeColors): Record<string, string> {
  // Частичный/битый ответ /branding/colors раньше ронял ВСЁ приложение в
  // ErrorBoundary (hexToRgb(undefined)). Недостающие поля добиваем дефолтами.
  const colors: ThemeColors = { ...DEFAULT_THEME_COLORS, ...themeColors };

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

  // Dark palette with actual user colors:
  // text colors (light shades): 50-100 = primary text, 200-300 = mixed, 400 = secondary text;
  // transition colors (500-700): between secondary text and surface;
  // surface/card colors (800-850); background colors (900-950).
  const darkVars = {
    '--color-dark-50': tripletOf(darkTextRgb),
    '--color-dark-100': tripletOf(darkTextRgb),
    '--color-dark-200': interpolateRgb(darkTextRgb, darkTextSecRgb, 0.33),
    '--color-dark-300': interpolateRgb(darkTextRgb, darkTextSecRgb, 0.66),
    '--color-dark-400': tripletOf(darkTextSecReadable),
    '--color-dark-500': tripletOf(darkHintReadable),
    '--color-dark-600': interpolateRgb(darkTextSecRgb, darkSurfaceRgb, 0.6),
    '--color-dark-700': interpolateRgb(darkTextSecRgb, darkSurfaceRgb, 0.8),
    '--color-dark-800': tripletOf(darkSurfaceRgb),
    '--color-dark-850': interpolateRgb(darkSurfaceRgb, darkBgRgb, 0.5),
    '--color-dark-900': interpolateRgb(darkSurfaceRgb, darkBgRgb, 0.7),
    '--color-dark-950': tripletOf(darkBgRgb),
  };

  const lightBgRgb = hexToRgb(colors.lightBackground);
  const lightSurfaceRgb = hexToRgb(colors.lightSurface);
  const lightTextRgb = hexToRgb(colors.lightText);
  const lightTextSecRgb = hexToRgb(colors.lightTextSecondary);

  // Same contrast floors as the dark palette: champagne-600 backs dark-400
  // (secondary text) in the light theme, champagne-500 backs dark-500 (hints).
  const lightHintReadable = ensureReadable(
    mixRgb(lightBgRgb, lightTextSecRgb, 0.6),
    lightTextRgb,
    lightSurfaceRgb,
    3.8,
  );
  const lightTextSecReadable = ensureReadable(lightTextSecRgb, lightTextRgb, lightSurfaceRgb, 5.0);

  // Champagne palette with actual user colors:
  // background colors (light shades): 50-100 = surface, 200-400 = background tones;
  // transition colors (500-600): between bg and text; text colors (700-950).
  const lightVars = {
    '--color-champagne-50': tripletOf(lightSurfaceRgb),
    '--color-champagne-100': interpolateRgb(lightSurfaceRgb, lightBgRgb, 0.3),
    '--color-champagne-200': tripletOf(lightBgRgb),
    '--color-champagne-300': interpolateRgb(lightBgRgb, lightTextSecRgb, 0.2),
    '--color-champagne-400': interpolateRgb(lightBgRgb, lightTextSecRgb, 0.4),
    '--color-champagne-500': tripletOf(lightHintReadable),
    '--color-champagne-600': tripletOf(lightTextSecReadable),
    '--color-champagne-700': interpolateRgb(lightTextSecRgb, lightTextRgb, 0.33),
    '--color-champagne-800': interpolateRgb(lightTextSecRgb, lightTextRgb, 0.66),
    '--color-champagne-900': tripletOf(lightTextRgb),
    '--color-champagne-950': tripletOf(lightTextRgb),
  };

  const darkSurfaces: ThemeSurfaces = { surface: darkSurfaceRgb, text: darkTextRgb };
  const lightSurfaces: ThemeSurfaces = { surface: lightSurfaceRgb, text: lightTextRgb };
  const accent = withReadableTextShades(accentPalette, darkSurfaces, lightSurfaces);
  const success = withReadableTextShades(successPalette, darkSurfaces, lightSurfaces);
  const warning = withReadableTextShades(warningPalette, darkSurfaces, lightSurfaces);
  const error = withReadableTextShades(errorPalette, darkSurfaces, lightSurfaces);

  const statusVars = Object.fromEntries(
    SHADE_LEVELS.flatMap((shade) => [
      [`--color-accent-${shade}`, accent[shade]],
      [`--color-success-${shade}`, success[shade]],
      [`--color-warning-${shade}`, warning[shade]],
      [`--color-error-${shade}`, error[shade]],
    ]),
  );

  // Readable text color on top of each status color (buttons, filled badges).
  // Hardcoded white breaks the moment an operator picks a light accent.
  const onColorVars = {
    '--color-on-accent': onColorFor(accent[500]),
    '--color-on-success': onColorFor(success[500]),
    '--color-on-warning': onColorFor(warning[500]),
    '--color-on-error': onColorFor(error[500]),
  };

  // Semantic colors (hex for direct use)
  const semanticVars = {
    '--color-dark-bg': colors.darkBackground,
    '--color-dark-surface': colors.darkSurface,
    '--color-dark-text': colors.darkText,
    '--color-dark-text-secondary': colors.darkTextSecondary,
    '--color-light-bg': colors.lightBackground,
    '--color-light-surface': colors.lightSurface,
    '--color-light-text': colors.lightText,
    '--color-light-text-secondary': colors.lightTextSecondary,
  };

  return { ...darkVars, ...lightVars, ...statusVars, ...onColorVars, ...semanticVars };
}

// Apply theme colors as CSS variables on :root and remember them for the next first paint.
export function applyThemeColors(themeColors: ThemeColors): void {
  const colors: ThemeColors = { ...DEFAULT_THEME_COLORS, ...themeColors };
  const vars = computeThemeCssVars(colors);
  const root = document.documentElement;
  for (const [name, value] of Object.entries(vars)) {
    root.style.setProperty(name, value);
  }
  // Следующая загрузка стартует с этой палитры, а не с дефолтной: инлайн-скрипт
  // index.html ставит переменные из подсказки до загрузки приложения.
  writeThemeColorsHint({ colors, vars });
}

export function useThemeColors() {
  const queryClient = useQueryClient();

  const { data: colors, isLoading, error } = useQuery(themeColorsQueryOptions());

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
