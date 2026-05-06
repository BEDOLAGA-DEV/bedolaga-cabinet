export const USER_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

const DEFAULT_CURRENCY = { currency: 'RUB', locale: 'ru-RU', symbol: '₽' };

export function formatPrice(kopeks: number, lang?: string): string {
  void lang;
  const config = DEFAULT_CURRENCY;
  const rubles = kopeks / 100;
  try {
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.currency,
      maximumFractionDigits: 0,
    }).format(rubles);
  } catch {
    return `${Math.round(rubles)} ${config.symbol}`;
  }
}
