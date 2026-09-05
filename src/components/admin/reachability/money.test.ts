import { describe, expect, it } from 'vitest';
import { formatKopeks } from './money';

describe('formatKopeks', () => {
  it.each([
    [279, '2,79 ₽'],
    [100018, '1000,18 ₽'],
    [5, '0,05 ₽'],
    [0, '0,00 ₽'],
    [-150, '-1,50 ₽'],
  ])('%s → %s', (kopeks, expected) => {
    expect(formatKopeks(kopeks)).toBe(expected);
  });

  it('пусто для null/undefined', () => {
    expect(formatKopeks(null)).toBe('—');
    expect(formatKopeks(undefined)).toBe('—');
  });
});
