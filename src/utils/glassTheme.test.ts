import { describe, expect, it } from 'vitest';
import { getGlassColors } from './glassTheme';

/**
 * Стеклянные карточки (дашборд, подписки) раньше красили текст зашитыми
 * белым/чёрным по isDark и не видели операторский цвет текста. Токены текста
 * обязаны идти через переменную темы.
 */
describe('getGlassColors', () => {
  it.each([true, false])('текстовые токены берут цвет текста темы (isDark=%s)', (isDark) => {
    const g = getGlassColors(isDark);
    for (const token of [g.text, g.textSecondary, g.textMuted, g.textFaint, g.textGhost]) {
      expect(token).toContain('var(--color-dark-50)');
    }
  });
});
