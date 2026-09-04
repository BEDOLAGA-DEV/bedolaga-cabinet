import { describe, expect, it } from 'vitest';
import { headerHeightCss } from './useHeaderHeight';

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
