import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { themeColorsApi } from '../api/themeColors';
import { ThemeColors, DEFAULT_THEME_COLORS, SHADE_LEVELS, ColorPalette } from '../types/theme';

// Convert hex to RGB values
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  // Handle shorthand hex
  if (hex.length === 4) {
    hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  }
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

// Convert hex to HSL
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const { r, g, b } = hexToRgb(hex);
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case rNorm:
        h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6;
        break;
      case gNorm:
        h = ((bNorm - rNorm) / d + 2) / 6;
        break;
      case bNorm:
        h = ((rNorm - gNorm) / d + 4) / 6;
        break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

// Convert HSL to RGB values
function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  s /= 100;
  l /= 100;

  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color);
  };

  return { r: f(0), g: f(8), b: f(4) };
}

// Convert RGB to string format for CSS variable
function rgbToString(r: number, g: number, b: number): string {
  return `${r}, ${g}, ${b}`;
}

// Generate color palette from base color (returns RGB strings)
function generatePalette(baseHex: string): ColorPalette {
  const { h, s } = hexToHsl(baseHex);

  // Lightness values for each shade level (from light to dark)
  const lightnessMap: Record<number, number> = {
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

  const palette: Partial<ColorPalette> = {};

  for (const shade of SHADE_LEVELS) {
    const lightness = lightnessMap[shade];
    // Adjust saturation slightly for very light/dark shades
    const adjustedS = shade <= 100 ? s * 0.7 : shade >= 900 ? s * 0.8 : s;
    const { r, g, b } = hslToRgb(h, adjustedS, lightness);
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

// Apply theme colors as CSS variables (RGB format for Tailwind opacity support)
export function applyThemeColors(colors: ThemeColors): void {
  const root = document.documentElement;

  // Generate palettes from status colors
  const accentPalette = generatePalette(colors.accent);
  const successPalette = generatePalette(colors.success);
  const warningPalette = generatePalette(colors.warning);
  const errorPalette = generatePalette(colors.error);

  // === DARK THEME PALETTE ===
  // Convert hex colors to RGB
  const darkBgRgb = hexToRgb(colors.darkBackground);
  const darkSurfaceRgb = hexToRgb(colors.darkSurface);
  const darkTextRgb = hexToRgb(colors.darkText);
  const darkTextSecRgb = hexToRgb(colors.darkTextSecondary);

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
    rgbToString(darkTextSecRgb.r, darkTextSecRgb.g, darkTextSecRgb.b),
  );

  // Transition colors (500-700): interpolate between secondary text and surface
  root.style.setProperty('--color-dark-500', interpolateRgb(darkTextSecRgb, darkSurfaceRgb, 0.4));
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

  // === LIGHT THEME PALETTE ===
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

  // Transition colors (500-600): between bg and text
  root.style.setProperty('--color-champagne-500', interpolateRgb(lightBgRgb, lightTextSecRgb, 0.6));
  root.style.setProperty(
    '--color-champagne-600',
    rgbToString(lightTextSecRgb.r, lightTextSecRgb.g, lightTextSecRgb.b),
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

  // === STATUS COLOR PALETTES ===
  for (const shade of SHADE_LEVELS) {
    root.style.setProperty(`--color-accent-${shade}`, accentPalette[shade]);
    root.style.setProperty(`--color-success-${shade}`, successPalette[shade]);
    root.style.setProperty(`--color-warning-${shade}`, warningPalette[shade]);
    root.style.setProperty(`--color-error-${shade}`, errorPalette[shade]);
  }

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
