import { describe, expect, it } from 'vitest';
import { headerHeightCss, telegramSafeAreas } from './useHeaderHeight';

/**
 * В standalone-режиме iOS («На экран Домой») страница начинается под
 * статус-баром, и фиксированная шапка без отступа срезалась. Вне fullscreen
 * Telegram высота шапки включает env(safe-area-inset-top); в fullscreen
 * Telegram отступ уже посчитан из SDK и дублировать его нельзя.
 */
describe('headerHeightCss', () => {
  it('добавляет safe-area сверху вне fullscreen Telegram', () => {
    expect(headerHeightCss(64, false)).toBe('calc(64px + env(safe-area-inset-top, 0px))');
  });

  it('в fullscreen Telegram оставляет высоту из SDK как есть', () => {
    expect(headerHeightCss(157, true)).toBe('157px');
  });
});

/**
 * Отступы Telegram: в fullscreen Mini App поверх страницы лежат статус-бар и кнопки
 * «Назад / ⌄ …», снизу — полоска Home. Всё, что прижато к краю экрана (шапка, шиты),
 * считает их одной формулой; вне fullscreen webview начинается ниже шапки Telegram — нули.
 */
describe('telegramSafeAreas', () => {
  const insets = (top: number, bottom: number) => ({ top, bottom, left: 0, right: 0 });

  it('fullscreen iOS: больший из отступов SDK плюс высота кнопок Telegram', () => {
    expect(
      telegramSafeAreas({
        isMobileFullscreen: true,
        platform: 'ios',
        safeAreaInset: insets(59, 34),
        contentSafeAreaInset: insets(46, 0),
      }),
    ).toEqual({ top: 59 + 45, bottom: 34 });
  });

  it('fullscreen Android: своя высота кнопок', () => {
    expect(
      telegramSafeAreas({
        isMobileFullscreen: true,
        platform: 'android',
        safeAreaInset: insets(24, 0),
        contentSafeAreaInset: insets(0, 16),
      }),
    ).toEqual({ top: 24 + 48, bottom: 16 });
  });

  it('вне fullscreen отступов нет', () => {
    expect(
      telegramSafeAreas({
        isMobileFullscreen: false,
        platform: 'ios',
        safeAreaInset: insets(59, 34),
        contentSafeAreaInset: insets(46, 0),
      }),
    ).toEqual({ top: 0, bottom: 0 });
  });
});
