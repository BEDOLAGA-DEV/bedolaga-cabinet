import { describe, expect, it } from 'vitest';
import { getGlassColors } from './glassTheme';

/**
 * Стеклянные карточки (дашборд, подписки) раньше красили текст зашитыми
 * белым/чёрным по isDark и не видели операторский цвет текста. Токены текста
 * обязаны идти через переменные темы.
 *
 * Второе требование появилось 2026-09-08: вторичный текст нельзя красить долей
 * основного цвета. Доли 0.4 / 0.3 / 0.25 давали контраст 3.4 и ниже — подписи в
 * карточке подписки читались с трудом. Такой текст берёт клампованные по
 * контрасту токены dark-400 / dark-500.
 */
describe('getGlassColors', () => {
  it.each([true, false])('текстовые токены берут цвет из темы (isDark=%s)', (isDark) => {
    const g = getGlassColors(isDark);
    for (const token of [g.text, g.textSecondary, g.textMuted, g.textFaint, g.textGhost]) {
      expect(token).toMatch(/var\(--color-dark-\d+\)/);
    }
  });

  it.each([true, false])(
    'вторичный текст — сплошной токен, а не прозрачность (isDark=%s)',
    (isDark) => {
      const g = getGlassColors(isDark);
      expect(g.textSecondary).toBe('rgb(var(--color-dark-400))');
      expect(g.textMuted).toBe('rgb(var(--color-dark-500))');
      expect(g.textFaint).toBe('rgb(var(--color-dark-500))');
    },
  );

  it('декоративный призрачный слой остаётся прозрачным — это фон, а не текст', () => {
    expect(getGlassColors(true).textGhost).toContain('rgba(');
  });
});
