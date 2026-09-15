import { describe, expect, it, vi } from 'vitest';
import { formatTraffic } from './formatTraffic';

vi.mock('../i18n', () => ({
  default: { t: (_key: string, fallback: string) => fallback },
}));

describe('formatTraffic', () => {
  it('formats terabytes from 1000 GB up', () => {
    expect(formatTraffic(1000, 'en-US')).toBe('1.0\u00A0TB');
    expect(formatTraffic(2500, 'en-US')).toBe('2.5\u00A0TB');
  });

  it('formats gigabytes from 1 GB up', () => {
    expect(formatTraffic(1, 'en-US')).toBe('1.0\u00A0GB');
    expect(formatTraffic(999.94, 'en-US')).toBe('999.9\u00A0GB');
  });

  it('formats sub-gigabyte values as megabytes', () => {
    expect(formatTraffic(0.5, 'en-US')).toBe('512\u00A0MB');
    expect(formatTraffic(0, 'en-US')).toBe('0\u00A0MB');
  });

  // Русский интерфейс писал «41.2 ГБ» с точкой — дробь по правилам языка.
  it('uses the locale decimal separator', () => {
    expect(formatTraffic(41.2, 'ru-RU')).toBe('41,2\u00A0GB');
    expect(formatTraffic(1500, 'ru-RU')).toBe('1,5\u00A0TB');
  });

  // Единица не отрывается от числа: «1,0» / «ТБ» разъезжались на две строки.
  it('glues the unit to the number with a non-breaking space', () => {
    expect(formatTraffic(41.2, 'ru-RU')).not.toContain(' ');
  });

  // 999,99 ГБ округлялось до «1 000,0 ГБ» — такое число уже пишется в ТБ.
  it('switches to terabytes when rounding reaches 1000 GB', () => {
    expect(formatTraffic(999.99, 'en-US')).toBe('1.0\u00A0TB');
  });
});
