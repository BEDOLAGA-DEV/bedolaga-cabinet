export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

import i18next from 'i18next';

const LANG_CURRENCY_MAP: Record<string, { currency: string; locale: string; symbol: string }> = {
  ru: { currency: 'RUB', locale: 'ru-RU', symbol: '₽' },
  en: { currency: 'USD', locale: 'en-US', symbol: '$' },
  zh: { currency: 'CNY', locale: 'zh-CN', symbol: '¥' },
  fa: { currency: 'IRR', locale: 'fa-IR', symbol: '﷼' },
};

const DEFAULT_CURRENCY = { currency: 'RUB', locale: 'ru-RU', symbol: '₽' };

export function formatPrice(kopeks: number, lang?: string): string {
  const resolvedLang = lang || i18next.language || 'ru';
  const config = LANG_CURRENCY_MAP[resolvedLang] || DEFAULT_CURRENCY;
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
