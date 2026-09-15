import { describe, expect, it } from 'vitest';
import { formatCredits, formatKopeks, formatMoney } from './money';

/**
 * Валюта сервиса — кредиты (1 кредит = 1 копейка); рубли — справочно, как в
 * самом bschekbot: «◈ 96 367 cred ≈ 963,67 ₽».
 */

describe('formatKopeks', () => {
  it.each([
    [279, '2,79\u00A0₽'],
    [100018, '1\u00A0000,18\u00A0₽'],
    [5, '0,05\u00A0₽'],
    [0, '0,00\u00A0₽'],
    [-150, '-1,50\u00A0₽'],
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
    [96367, '◈\u00A096\u00A0367\u00A0cred'],
    [640, '◈\u00A0640\u00A0cred'],
    [1234567, '◈\u00A01\u00A0234\u00A0567\u00A0cred'],
    [0, '◈\u00A00\u00A0cred'],
    [-150, '◈\u00A0-150\u00A0cred'],
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
    expect(formatMoney(96367)).toBe('◈\u00A096\u00A0367\u00A0cred ≈ 963,67\u00A0₽');
    expect(formatMoney(640)).toBe('◈\u00A0640\u00A0cred ≈ 6,40\u00A0₽');
    expect(formatMoney(null)).toBe('—');
  });
});
