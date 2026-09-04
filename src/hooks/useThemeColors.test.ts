// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { applyThemeColors } from './useThemeColors';
import { DEFAULT_THEME_COLORS, SHADE_LEVELS } from '../types/theme';

/**
 * Палитра статусных цветов строится из одного выбранного оператором цвета.
 * Контракт: шейд 500 — ровно выбранный цвет (его видят кнопки и активные
 * состояния), остальные шейды монотонно светлее/темнее его, а текстовые
 * шейды читаемы на поверхностях темы, каким бы светлым или тёмным ни был
 * базовый цвет.
 */

type Rgb = { r: number; g: number; b: number };

function readVar(name: string): string {
  return document.documentElement.style.getPropertyValue(name).trim();
}

function parseTriplet(triplet: string): Rgb {
  const [r, g, b] = triplet.split(',').map((part) => Number(part.trim()));
  return { r, g, b };
}

function hexToTriplet(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

function luminance({ r, g, b }: Rgb): number {
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const PASTEL_ACCENT = '#a5b4fc'; // светлая лаванда, L≈82
const NAVY_ACCENT = '#1e3a8a'; // тёмный синий, L≈33

afterEach(() => {
  document.documentElement.removeAttribute('style');
});

describe('applyThemeColors: статусные палитры', () => {
  it('шейд 500 — ровно выбранный оператором цвет', () => {
    applyThemeColors({
      ...DEFAULT_THEME_COLORS,
      accent: PASTEL_ACCENT,
      success: NAVY_ACCENT,
      warning: '#f97316',
      error: '#dc2626',
    });

    expect(readVar('--color-accent-500')).toBe(hexToTriplet(PASTEL_ACCENT));
    expect(readVar('--color-success-500')).toBe(hexToTriplet(NAVY_ACCENT));
    expect(readVar('--color-warning-500')).toBe(hexToTriplet('#f97316'));
    expect(readVar('--color-error-500')).toBe(hexToTriplet('#dc2626'));
  });

  it('дефолтная палитра в рантайме совпадает со статикой globals.css', () => {
    // Иначе после загрузки JS цвета «уезжают» относительно первой отрисовки.
    applyThemeColors(DEFAULT_THEME_COLORS);

    expect(readVar('--color-accent-500')).toBe('59, 130, 246');
    expect(readVar('--color-success-500')).toBe('34, 197, 94');
    expect(readVar('--color-warning-500')).toBe('245, 158, 11');
    expect(readVar('--color-error-500')).toBe('239, 68, 68');
  });

  it.each([
    ['пастельный', PASTEL_ACCENT],
    ['тёмный', NAVY_ACCENT],
    ['дефолтный', DEFAULT_THEME_COLORS.accent],
  ])('лестница шейдов монотонна от светлого к тёмному: %s акцент', (_label, accent) => {
    applyThemeColors({ ...DEFAULT_THEME_COLORS, accent });

    const ladder = SHADE_LEVELS.map((shade) =>
      luminance(parseTriplet(readVar(`--color-accent-${shade}`))),
    );
    for (let i = 1; i < ladder.length; i += 1) {
      expect(ladder[i]).toBeLessThanOrEqual(ladder[i - 1]);
    }
  });

  it('текстовые шейды читаемы на поверхностях темы при крайних базовых цветах', () => {
    const darkSurface = parseTriplet(hexToTriplet(DEFAULT_THEME_COLORS.darkSurface));
    const lightSurface = parseTriplet(hexToTriplet(DEFAULT_THEME_COLORS.lightSurface));

    // Тёмный акцент: в тёмной теме текстом идут 300/400.
    applyThemeColors({ ...DEFAULT_THEME_COLORS, accent: NAVY_ACCENT });
    expect(
      contrast(parseTriplet(readVar('--color-accent-400')), darkSurface),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(parseTriplet(readVar('--color-accent-300')), darkSurface),
    ).toBeGreaterThanOrEqual(4.5);

    // Светлый акцент: .light подменяет 300/400 на 700.
    applyThemeColors({ ...DEFAULT_THEME_COLORS, accent: PASTEL_ACCENT });
    expect(
      contrast(parseTriplet(readVar('--color-accent-700')), lightSurface),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it('текст поверх светлого акцента — тёмный, поверх тёмного и дефолтного — белый', () => {
    applyThemeColors({ ...DEFAULT_THEME_COLORS, accent: PASTEL_ACCENT });
    expect(readVar('--color-on-accent')).toBe('15, 23, 42');

    applyThemeColors({ ...DEFAULT_THEME_COLORS, accent: NAVY_ACCENT });
    expect(readVar('--color-on-accent')).toBe('255, 255, 255');

    // На дефолтном синем белый даёт 3.7:1 — привычный белый текст кнопок
    // остаётся, хотя формально тёмный контрастнее (4.8:1).
    applyThemeColors(DEFAULT_THEME_COLORS);
    expect(readVar('--color-on-accent')).toBe('255, 255, 255');
    expect(readVar('--color-on-error')).toBe('255, 255, 255');
    expect(readVar('--color-on-success')).toBe('15, 23, 42');
    expect(readVar('--color-on-warning')).toBe('15, 23, 42');
  });
});
