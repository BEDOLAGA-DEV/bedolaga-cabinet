import { describe, expect, it } from 'vitest';
import { formatLiteDate } from './liteDate';

/**
 * Даты в тестах относительные к переданному «сейчас»: абсолютные протухают
 * вместе со сменой года и падают первого января, а не тогда, когда что-то
 * действительно сломалось.
 */

const now = new Date('2026-09-22T12:00:00Z');

describe('formatLiteDate', () => {
  it('в текущем году обходится без года', () => {
    const text = formatLiteDate('2026-10-15T00:00:00Z', now);
    expect(text).toContain('15');
    expect(text).not.toContain('2026');
  });

  it('в другом году год называет — иначе две даты не отличить', () => {
    expect(formatLiteDate('2027-10-15T00:00:00Z', now)).toContain('2027');
    expect(formatLiteDate('2025-01-03T00:00:00Z', now)).toContain('2025');
  });

  it('месяц словом, а не числом', () => {
    // Числовой формат («15.10.2026») читается как строка из выписки; фраза на
    // экране должна звучать по-человечески.
    expect(formatLiteDate('2026-10-15T00:00:00Z', now)).not.toMatch(/\d{2}\.\d{2}/);
  });

  it('пустое и битое значение не превращает в «Invalid Date»', () => {
    expect(formatLiteDate(null, now)).toBe('');
    expect(formatLiteDate(undefined, now)).toBe('');
    expect(formatLiteDate('', now)).toBe('');
    expect(formatLiteDate('не дата', now)).toBe('');
  });
});
