import { describe, expect, it } from 'vitest';
import { getMonthlyPriceKopeks } from './pricing';

describe('getMonthlyPriceKopeks', () => {
  it('hides the monthly rate for periods of a month or shorter', () => {
    expect(getMonthlyPriceKopeks(4830, 7)).toBeNull();
    expect(getMonthlyPriceKopeks(9900, 14)).toBeNull();
    expect(getMonthlyPriceKopeks(16030, 30)).toBeNull();
  });

  it('divides by whole months for multiples of 30 days', () => {
    expect(getMonthlyPriceKopeks(30000, 90)).toBe(10000);
    expect(getMonthlyPriceKopeks(60000, 180)).toBe(10000);
  });

  it('prorates periods that are not whole months', () => {
    expect(getMonthlyPriceKopeks(15000, 45)).toBe(10000);
    expect(getMonthlyPriceKopeks(100000, 365)).toBe(8219);
  });

  it('returns null for non-finite input', () => {
    expect(getMonthlyPriceKopeks(Number.NaN, 90)).toBeNull();
    expect(getMonthlyPriceKopeks(30000, Number.NaN)).toBeNull();
    expect(getMonthlyPriceKopeks(30000, Number.POSITIVE_INFINITY)).toBeNull();
  });
});
