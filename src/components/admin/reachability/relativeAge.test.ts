import { describe, expect, it } from 'vitest';
import { relativeAge } from './relativeAge';

const NOW = new Date('2026-09-05T12:00:00Z').getTime();

describe('relativeAge', () => {
  it.each([
    ['2026-09-05T11:59:40Z', 'ru', 'только что'],
    ['2026-09-05T11:55:00Z', 'ru', '5 мин. назад'],
    ['2026-09-05T09:00:00Z', 'ru', '3 ч назад'],
    ['2026-09-03T12:00:00Z', 'ru', '2 дн. назад'],
    ['2026-09-05T11:55:00Z', 'en', '5 min. ago'],
  ])('%s (%s) → %s', (iso, lang, expected) => {
    expect(relativeAge(iso, lang, NOW)).toBe(expected);
  });

  it('мусор в дате — прочерк', () => {
    expect(relativeAge('not-a-date', 'ru', NOW)).toBe('—');
    expect(relativeAge(null, 'ru', NOW)).toBe('—');
  });
});
