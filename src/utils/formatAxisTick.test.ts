import { describe, expect, it } from 'vitest';

import { formatAxisTick } from './formatNumber';

const plain = (s: string) => s.replace(/\s/g, ' ');

describe('formatAxisTick', () => {
  it('небольшие значения — полностью, с разрядами', () => {
    expect(plain(formatAxisTick(1500, 'ru'))).toBe('1 500');
    expect(formatAxisTick(0, 'ru')).toBe('0');
  });

  it('крупные — коротко, чтобы ось не съедала график', () => {
    expect(plain(formatAxisTick(4_000_000, 'ru'))).toBe('4 млн');
    expect(plain(formatAxisTick(150_000, 'ru'))).toBe('150 тыс.');
    expect(formatAxisTick(4_000_000, 'en')).toBe('4M');
  });

  it('не число — пусто', () => {
    expect(formatAxisTick(Number.NaN, 'ru')).toBe('');
  });
});
