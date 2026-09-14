import { describe, expect, it } from 'vitest';
import { formatDecimal, formatGb, formatGbPair } from './formatNumber';

// Intl ставит неразрывные пробелы (U+00A0 / U+202F) — сравниваем с обычными.
const plain = (value: string) => value.replace(/[  ]/g, ' ');

/**
 * Числа в интерфейсе — по правилам языка: «3 002,00», а не «3002.00».
 * Раньше суммы и трафик печатались через toFixed и на русском выглядели программистски.
 */
describe('formatDecimal', () => {
  it('русский: разряды пробелом, дробь запятой', () => {
    expect(plain(formatDecimal(3002, 2, 'ru-RU'))).toBe('3 002,00');
    expect(plain(formatDecimal(12750.5, 2, 'ru-RU'))).toBe('12 750,50');
  });
  it('английский: разряды запятой, дробь точкой', () => {
    expect(formatDecimal(1234.5, 2, 'en-US')).toBe('1,234.50');
  });
  it('ноль знаков — целое без дроби', () => {
    expect(formatDecimal(0, 0, 'ru-RU')).toBe('0');
  });
});

describe('formatGb', () => {
  it('целые гигабайты без «,0»', () => {
    expect(plain(formatGb(1500, 'ru-RU'))).toBe('1 500');
    expect(formatGb(0, 'ru-RU')).toBe('0');
  });
  it('дробные — один знак', () => {
    expect(formatGb(12.8, 'ru-RU')).toBe('12,8');
    expect(formatGb(41.25, 'ru-RU')).toBe('41,3');
  });
  it('меньше десятой — не ноль, а одна десятая', () => {
    expect(formatGb(0.03, 'ru-RU')).toBe('0,1');
  });
});

describe('formatGbPair', () => {
  it('«870 / 1 500 ГБ» — единица одна на пару', () => {
    expect(plain(formatGbPair(870, 1500, 'ГБ', 'ru-RU'))).toBe('870 / 1 500 ГБ');
    expect(plain(formatGbPair(12.8, 100, 'ГБ', 'ru-RU'))).toBe('12,8 / 100 ГБ');
  });
});
