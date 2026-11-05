import type { ExchangeRates } from '../api/currency';

// Fallback rates if API fails (approximate)
export const FALLBACK_RATES: ExchangeRates = {
  USD: 100, // 1 USD = 100 RUB
  CNY: 14, // 1 CNY = 14 RUB
  IRR: 0.0024, // 1 IRR = 0.0024 RUB (or 1 RUB = ~420 IRR)
};

// Persian UI uses tomans: one toman equals ten rials.
export const RIALS_PER_TOMAN = 10;
