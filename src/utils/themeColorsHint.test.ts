// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import htmlSource from '../../index.html?raw';
import { STORAGE_KEYS } from '@/config/constants';
import { DEFAULT_THEME_COLORS } from '@/types/theme';
import { readThemeColorsHint, writeThemeColorsHint } from './themeColorsHint';

/**
 * Палитра оператора приходит с бэкенда уже после первой отрисовки, и каждая
 * загрузка сначала показывала цвета по умолчанию (синий акцент, синеватый фон),
 * а потом прыгала в операторские. Подсказка в localStorage хранит последнюю
 * применённую палитру, а инлайн-скрипт index.html ставит её на :root до того,
 * как загрузится приложение.
 */

const VARS = {
  '--color-accent-500': '20, 184, 166',
  '--color-dark-950': '10, 20, 16',
  '--color-champagne-200': '247, 231, 206',
  '--color-on-accent': '255, 255, 255',
  '--color-dark-bg': '#0a1410',
};

function inlineHintScript(): string {
  const match = htmlSource.match(/<script data-hint="theme-colors">([\s\S]*?)<\/script>/);
  if (!match) throw new Error('index.html: нет инлайн-скрипта data-hint="theme-colors"');
  return match[1];
}

function runInlineScript(): void {
  new Function(inlineHintScript())();
}

function rootVar(name: string): string {
  return document.documentElement.style.getPropertyValue(name).trim();
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('style');
  document.head.innerHTML = '';
});

afterEach(() => {
  document.documentElement.removeAttribute('style');
  document.head.innerHTML = '';
});

describe('themeColorsHint: запись и чтение', () => {
  it('читает ровно то, что записал', () => {
    writeThemeColorsHint({ colors: DEFAULT_THEME_COLORS, vars: VARS });
    expect(readThemeColorsHint()).toEqual({ colors: DEFAULT_THEME_COLORS, vars: VARS });
  });

  it('без подсказки и на битом JSON возвращает null', () => {
    expect(readThemeColorsHint()).toBeNull();
    localStorage.setItem(STORAGE_KEYS.THEME_COLORS_HINT, '{not json');
    expect(readThemeColorsHint()).toBeNull();
  });

  it('отбрасывает подсказку с неполными или не-hex цветами', () => {
    localStorage.setItem(
      STORAGE_KEYS.THEME_COLORS_HINT,
      JSON.stringify({ colors: { ...DEFAULT_THEME_COLORS, accent: 'red' }, vars: VARS }),
    );
    expect(readThemeColorsHint()).toBeNull();
    const { accent: _dropped, ...withoutAccent } = DEFAULT_THEME_COLORS;
    localStorage.setItem(
      STORAGE_KEYS.THEME_COLORS_HINT,
      JSON.stringify({ colors: withoutAccent, vars: VARS }),
    );
    expect(readThemeColorsHint()).toBeNull();
  });

  it('отбрасывает переменные с чужими именами или значениями', () => {
    localStorage.setItem(
      STORAGE_KEYS.THEME_COLORS_HINT,
      JSON.stringify({
        colors: DEFAULT_THEME_COLORS,
        vars: { ...VARS, '--font-sans': 'serif', '--color-x': 'url(evil)' },
      }),
    );
    expect(readThemeColorsHint()?.vars).toEqual(VARS);
  });
});

describe('themeColorsHint: инлайн-скрипт index.html', () => {
  it('ключ хранилища в скрипте совпадает с STORAGE_KEYS', () => {
    expect(inlineHintScript()).toContain(`'${STORAGE_KEYS.THEME_COLORS_HINT}'`);
  });

  it('ставит переменные палитры на :root и фон страницы до загрузки приложения', () => {
    writeThemeColorsHint({ colors: DEFAULT_THEME_COLORS, vars: VARS });
    runInlineScript();
    expect(rootVar('--color-accent-500')).toBe('20, 184, 166');
    expect(rootVar('--color-dark-950')).toBe('10, 20, 16');
    expect(rootVar('--color-dark-bg')).toBe('#0a1410');
    const style = document.head.querySelector('style');
    expect(style?.textContent).toContain('body');
    expect(style?.textContent).toContain('rgb(10, 20, 16)');
    expect(style?.textContent).toContain('rgb(247, 231, 206)');
  });

  it('без подсказки ничего не трогает', () => {
    runInlineScript();
    expect(document.documentElement.getAttribute('style')).toBeNull();
    expect(document.head.querySelector('style')).toBeNull();
  });

  it('пропускает чужие имена и значения и не падает на мусоре', () => {
    localStorage.setItem(
      STORAGE_KEYS.THEME_COLORS_HINT,
      JSON.stringify({
        colors: DEFAULT_THEME_COLORS,
        vars: { '--color-accent-500': '1, 2, 3', '--font-sans': 'serif', '--color-x': 'url(evil)' },
      }),
    );
    expect(() => runInlineScript()).not.toThrow();
    expect(rootVar('--color-accent-500')).toBe('1, 2, 3');
    expect(rootVar('--font-sans')).toBe('');
    expect(rootVar('--color-x')).toBe('');

    localStorage.setItem(STORAGE_KEYS.THEME_COLORS_HINT, '{not json');
    expect(() => runInlineScript()).not.toThrow();
  });
});
