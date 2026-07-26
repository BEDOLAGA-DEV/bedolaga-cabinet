import { describe, expect, it, vi } from 'vitest';
import { formatTraffic } from './formatTraffic';

vi.mock('../i18n', () => ({
  default: { t: (_key: string, fallback: string) => fallback },
}));

describe('formatTraffic', () => {
  it('formats terabytes from 1000 GB up', () => {
    expect(formatTraffic(1000)).toBe('1.0 TB');
    expect(formatTraffic(2500)).toBe('2.5 TB');
  });

  it('formats gigabytes from 1 GB up', () => {
    expect(formatTraffic(1)).toBe('1.0 GB');
    expect(formatTraffic(999.94)).toBe('999.9 GB');
  });

  it('formats sub-gigabyte values as megabytes', () => {
    expect(formatTraffic(0.5)).toBe('512 MB');
    expect(formatTraffic(0)).toBe('0 MB');
  });
});
