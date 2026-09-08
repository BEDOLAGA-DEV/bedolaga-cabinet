import { describe, expect, it } from 'vitest';
import { sheetInsets } from './sheetInsets';

/**
 * Нижний шит в Mini App залезал под статус-бар и кнопки Telegram: высота считалась от
 * полного экрана. Верхний зазор — отступ Telegram из SDK плюс воздух; без Telegram —
 * env(safe-area-inset-top) браузера. Снизу — больший из отступов браузера и SDK.
 */
describe('sheetInsets', () => {
  it('в fullscreen Telegram высота ограничена сверху отступом SDK', () => {
    expect(sheetInsets({ snap: 1, topSafeArea: 104, bottomSafeArea: 34 })).toEqual({
      maxHeight: 'calc(var(--tg-viewport-stable-height, 100dvh) * 1 - 112px)',
      paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 34px)',
    });
  });

  it('вне Telegram полагается на safe-area браузера', () => {
    expect(sheetInsets({ snap: 0.6, topSafeArea: 0, bottomSafeArea: 0 })).toEqual({
      maxHeight:
        'calc(var(--tg-viewport-stable-height, 100dvh) * 0.6 - max(8px, env(safe-area-inset-top, 0px)))',
      paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0px)',
    });
  });
});
