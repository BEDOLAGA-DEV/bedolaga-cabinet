import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getMonthToDateRange, isMonthToDate } from './period';

describe('period', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('builds a month-to-date range with zero-padded local dates', () => {
    vi.setSystemTime(new Date(2026, 2, 5));
    expect(getMonthToDateRange()).toEqual({ startDate: '2026-03-01', endDate: '2026-03-05' });
  });

  it('recognises the current month-to-date period', () => {
    vi.setSystemTime(new Date(2026, 6, 13));
    expect(isMonthToDate({ startDate: '2026-07-01', endDate: '2026-07-13' })).toBe(true);
  });

  it('rejects day-based and mismatched periods', () => {
    vi.setSystemTime(new Date(2026, 6, 13));
    expect(isMonthToDate({ days: 30 })).toBe(false);
    expect(isMonthToDate({ startDate: '2026-07-01', endDate: '2026-07-12' })).toBe(false);
    expect(isMonthToDate({})).toBe(false);
  });
});
