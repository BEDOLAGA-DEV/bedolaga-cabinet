export const USER_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

import i18next from 'i18next';
import { currencyApi, type ExchangeRates } from '../api/currency';

const LANG_CURRENCY_MAP: Record<
  string,
  { currency: string; locale: string; symbol: string; key?: keyof ExchangeRates }
> = {
  ru: { currency: 'RUB', locale: 'ru-RU', symbol: '₽' },
  en: { currency: 'USD', locale: 'en-US', symbol: '$', key: 'USD' },
  zh: { currency: 'CNY', locale: 'zh-CN', symbol: '¥', key: 'CNY' },
  fa: { currency: 'IRR', locale: 'fa-IR', symbol: '﷼', key: 'IRR' },
};

const DEFAULT_CURRENCY = { currency: 'RUB', locale: 'ru-RU', symbol: '₽' };

// Глобальный кэш курсов. Заполняется один раз из useCurrency (см. setExchangeRates ниже)
// и используется здесь синхронно. Без него formatPrice падал в "просто замена символа",
// что давало пользователю на лендинге `¥220` вместо реально конвертированной суммы.
let cachedExchangeRates: ExchangeRates | null = null;

export function setExchangeRates(rates: ExchangeRates | null): void {
  cachedExchangeRates = rates;
}

export function formatPrice(kopeks: number, lang?: string): string {
  const resolvedLang = lang || i18next.language || 'ru';
  const config = LANG_CURRENCY_MAP[resolvedLang] || DEFAULT_CURRENCY;
  let amount = kopeks / 100;

  // Конвертация по курсу для не-рублёвых локалей. Без rates fallback на сырую сумму
  // (поведение до фикса), чтобы первый рендер до загрузки курсов не отдавал NaN.
  if (config.key && cachedExchangeRates) {
    amount = currencyApi.convertFromRub(amount, config.key, cachedExchangeRates);
  }

  // Для IRR суммы большие — без дробной части.
  const maximumFractionDigits = config.currency === 'IRR' ? 0 : 2;

  try {
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.currency,
      maximumFractionDigits,
    }).format(amount);
  } catch {
    const rounded =
      maximumFractionDigits === 0 ? Math.round(amount) : Math.round(amount * 100) / 100;
    return `${rounded} ${config.symbol}`;
  }
}
