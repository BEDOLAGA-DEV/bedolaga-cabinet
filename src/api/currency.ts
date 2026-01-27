// Currency exchange rate API
// Uses free exchangerate.host API

import axios from 'axios';

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

// Fallback rates if API fails (approximate)
const FALLBACK_RATES: ExchangeRates = {
  USD: 100, // 1 USD = 100 RUB
  CNY: 14, // 1 CNY = 14 RUB
  IRR: 0.0024, // 1 IRR = 0.0024 RUB (or 1 RUB = ~420 IRR)
};

let cachedRates: CachedRates | null = null;

export const currencyApi = {
  // Get all exchange rates (RUB to other currencies)
  getExchangeRates: async (): Promise<ExchangeRates> => {
    // Check cache first
    if (cachedRates && Date.now() - cachedRates.timestamp < CACHE_DURATION) {
      return cachedRates.rates;
    }

    try {
      // Try primary API (exchangerate.host) - get RUB based rates
      const response = await axios.get<{
        success?: boolean;
        rates?: { USD?: number; CNY?: number; IRR?: number };
      }>('https://api.exchangerate.host/latest', {
        params: { base: 'RUB', symbols: 'USD,CNY,IRR' },
      });

      if (response.data.success && response.data.rates) {
        // API returns how much of each currency equals 1 RUB
        // We need the inverse: how many RUB equals 1 of each currency
        const rates: ExchangeRates = {
          USD: response.data.rates.USD ? 1 / response.data.rates.USD : FALLBACK_RATES.USD,
          CNY: response.data.rates.CNY ? 1 / response.data.rates.CNY : FALLBACK_RATES.CNY,
          IRR: response.data.rates.IRR ? 1 / response.data.rates.IRR : FALLBACK_RATES.IRR,
        };
        cachedRates = { rates, timestamp: Date.now() };
        return rates;
      }

      // Try backup API (open.er-api.com)
      const backupResponse = await axios.get<{
        rates?: { USD?: number; CNY?: number; IRR?: number };
      }>('https://open.er-api.com/v6/latest/RUB');

      if (backupResponse.data.rates) {
        const rates: ExchangeRates = {
          USD: backupResponse.data.rates.USD
            ? 1 / backupResponse.data.rates.USD
            : FALLBACK_RATES.USD,
          CNY: backupResponse.data.rates.CNY
            ? 1 / backupResponse.data.rates.CNY
            : FALLBACK_RATES.CNY,
          IRR: backupResponse.data.rates.IRR
            ? 1 / backupResponse.data.rates.IRR
            : FALLBACK_RATES.IRR,
        };
        cachedRates = { rates, timestamp: Date.now() };
        return rates;
      }

      // Return fallback rates if both APIs fail
      return FALLBACK_RATES;
    } catch (error) {
      console.warn('Failed to fetch exchange rates, using fallback:', error);
      return FALLBACK_RATES;
    }
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
