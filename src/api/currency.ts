// Currency exchange rate API
// Uses free exchangerate.host API

import axios from 'axios';
import { FALLBACK_RATES } from '../utils/currencyUnits';

// RUB per one ISO currency unit. IRR is always rials, never tomans.
interface ExchangeRates {
  USD: number;
  CNY: number;
  IRR: number;
}

interface CachedRates {
  rates: ExchangeRates;
  timestamp: number;
}

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

let cachedRates: CachedRates | null = null;

// Both providers return currency units per RUB; the UI consumes the inverse.
function readRates(value: unknown): ExchangeRates | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const rates = {} as ExchangeRates;
  for (const key of ['USD', 'CNY', 'IRR'] as const) {
    const rate = raw[key];
    if (
      typeof rate !== 'number' ||
      !Number.isFinite(rate) ||
      rate <= 0 ||
      !Number.isFinite(1 / rate)
    )
      return null;
    rates[key] = 1 / rate;
  }
  return rates;
}

export const currencyApi = {
  // Get all exchange rates (RUB to other currencies)
  getExchangeRates: async (): Promise<ExchangeRates> => {
    // Check cache first
    if (cachedRates && Date.now() - cachedRates.timestamp < CACHE_DURATION) {
      return cachedRates.rates;
    }

    // Each source has its own failure boundary: a rejected primary request
    // must still reach the backup, just like an unsuccessful API response.
    try {
      const response = await axios.get('https://api.exchangerate.host/latest', {
        params: { base: 'RUB', symbols: 'USD,CNY,IRR' },
      });
      const rates = response.data?.success ? readRates(response.data.rates) : null;
      if (rates) {
        cachedRates = { rates, timestamp: Date.now() };
        return rates;
      }
    } catch {
      // Continue with the independent backup source.
    }

    try {
      const response = await axios.get('https://open.er-api.com/v6/latest/RUB');
      const rates = readRates(response.data?.rates);
      if (rates) {
        cachedRates = { rates, timestamp: Date.now() };
        return rates;
      }
    } catch {
      // Neither source is available; don't cache the transport failure.
    }
    return FALLBACK_RATES;
  },

  // Convert RUB to target currency
  convertFromRub: (
    rubAmount: number,
    targetCurrency: keyof ExchangeRates,
    rates: ExchangeRates,
  ): number => {
    const rate = rates[targetCurrency];
    if (!rate || rate <= 0) {
      return rubAmount / FALLBACK_RATES[targetCurrency];
    }
    return rubAmount / rate;
  },

  // Convert from target currency to RUB
  convertToRub: (
    amount: number,
    sourceCurrency: keyof ExchangeRates,
    rates: ExchangeRates,
  ): number => {
    const rate = rates[sourceCurrency];
    if (!rate || rate <= 0) {
      return amount * FALLBACK_RATES[sourceCurrency];
    }
    return amount * rate;
  },
};

export type { ExchangeRates };
