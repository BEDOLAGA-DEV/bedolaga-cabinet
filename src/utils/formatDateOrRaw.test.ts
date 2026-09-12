import { describe, expect, it, vi } from 'vitest';

vi.mock('../i18n', () => ({
  default: { t: (_key: string, fallback: string) => fallback, language: 'ru' },
}));

import { formatDateOrRaw } from './format';

const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };

describe('formatDateOrRaw', () => {
  it('formats a machine date for the locale', () => {
    expect(formatDateOrRaw('2030-11-27T12:00:00+00:00', 'ru-RU', options)).toBe(
      '27 ноября 2030 г.',
    );
  });

  it('shows a non-parseable string as is instead of "Invalid Date"', () => {
    // Бот 4.8.0 присылал строку для писем — такую браузер не разбирает.
    expect(formatDateOrRaw('27.11.2030, 12:00', 'ru-RU', options)).toBe('27.11.2030, 12:00');
  });

  it('returns null for an empty value', () => {
    expect(formatDateOrRaw('', 'ru-RU', options)).toBeNull();
    expect(formatDateOrRaw(undefined, 'ru-RU', options)).toBeNull();
  });
});
