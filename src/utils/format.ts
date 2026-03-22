/** Cached browser timezone — computed once, never changes during session. */
export const USER_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

export function formatPrice(kopeks: number): string {
  const rubles = kopeks / 100;
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(rubles);
}
