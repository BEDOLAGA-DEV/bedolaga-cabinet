import { describe, expect, it, vi } from 'vitest';

// Браузер западнее UTC: там `new Date('YYYY-MM-DD')` — это вчерашний вечер.
process.env.TZ = 'America/Los_Angeles';

vi.mock('../i18n', () => ({
  default: { t: (_key: string, fallback: string) => fallback, language: 'ru' },
}));

import { parseCalendarDate } from './format';

describe('parseCalendarDate', () => {
  it('reads a date-only string as a local calendar day, not UTC midnight', () => {
    const day = parseCalendarDate('2026-09-12');
    expect([day.getFullYear(), day.getMonth(), day.getDate()]).toEqual([2026, 8, 12]);
    expect(day.getHours()).toBe(0);
  });

  it('keeps full timestamps as instants', () => {
    const iso = '2026-09-12T10:00:00Z';
    expect(parseCalendarDate(iso).getTime()).toBe(Date.parse(iso));
  });
});
