import { describe, expect, it } from 'vitest';
import { formatCredits, formatKopeks, formatMoney } from './money';

/**
 * Валюта сервиса — кредиты (1 кредит = 1 копейка); рубли — справочно, как в
 * самом bschekbot: «◈ 96 367 cred ≈ 963,67 ₽».
 */

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

describe('formatCredits', () => {
  it.each([
    [96367, '◈ 96 367 cred'],
    [640, '◈ 640 cred'],
    [1234567, '◈ 1 234 567 cred'],
    [0, '◈ 0 cred'],
    [-150, '◈ -150 cred'],
  ])('%s → %s', (credits, expected) => {
    expect(formatCredits(credits)).toBe(expected);
  });

  it('пусто для null/undefined', () => {
    expect(formatCredits(null)).toBe('—');
    expect(formatCredits(undefined)).toBe('—');
  });
});

describe('formatMoney', () => {
  it('кредиты и рубли рядом, как в bschekbot', () => {
    expect(formatMoney(96367)).toBe('◈ 96 367 cred ≈ 963,67 ₽');
    expect(formatMoney(640)).toBe('◈ 640 cred ≈ 6,40 ₽');
    expect(formatMoney(null)).toBe('—');
  });
});
