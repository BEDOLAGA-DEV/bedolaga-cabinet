import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { currencyApi, type ExchangeRates } from '../api/currency';

// Map language to currency
const LANGUAGE_CURRENCY_MAP: Record<string, keyof ExchangeRates | 'RUB'> = {
  ru: 'RUB',
  en: 'USD',
  zh: 'CNY',
  fa: 'IRR',
};

// Default rates for fallback
const DEFAULT_RATES: ExchangeRates = {
  USD: 100,
  CNY: 14,
  IRR: 0.0024,
};

export function useCurrency() {
  const { i18n, t } = useTranslation();

  // Fetch exchange rates
  const { data: exchangeRates = DEFAULT_RATES } = useQuery({
    queryKey: ['exchange-rates'],
    queryFn: currencyApi.getExchangeRates,
    staleTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    retry: 2,
  });

  // Get current language and currency
  const currentLanguage = i18n.language;
  const targetCurrency = LANGUAGE_CURRENCY_MAP[currentLanguage] || 'USD';

  // Check if current language is Russian (no conversion needed)
  const isRussian = currentLanguage === 'ru';

  // Get currency symbol from translations
  const currencySymbol = t('common.currency');

  // Format amount with currency conversion
  const formatAmount = (rubAmount: number, decimals: number = 2): string => {
    if (isRussian) {
      return rubAmount.toFixed(decimals);
    }

    // Convert to target currency
    const convertedAmount = currencyApi.convertFromRub(
      rubAmount,
      targetCurrency as keyof ExchangeRates,
      exchangeRates,
    );

    // For IRR (Iranian Toman), use no decimals as amounts are large
    if (targetCurrency === 'IRR') {
      return Math.round(convertedAmount).toLocaleString('fa-IR');
    }

    return convertedAmount.toFixed(decimals);
  };

  // Format amount with currency symbol
  const formatWithCurrency = (rubAmount: number, decimals: number = 2): string => {
    return `${formatAmount(rubAmount, decimals)} ${currencySymbol}`;
  };

  // Format amount with + sign (for earnings/bonuses)
  const formatPositive = (rubAmount: number, decimals: number = 2): string => {
    return `+${formatAmount(rubAmount, decimals)} ${currencySymbol}`;
  };

  // Get raw converted amount (for calculations)
  const convertAmount = (rubAmount: number): number => {
    if (isRussian) {
      return rubAmount;
    }
    return currencyApi.convertFromRub(
      rubAmount,
      targetCurrency as keyof ExchangeRates,
      exchangeRates,
    );
  };

  // Convert from user's currency back to rubles
  const convertToRub = (amount: number): number => {
    if (isRussian) {
      return amount;
    }
    return currencyApi.convertToRub(amount, targetCurrency as keyof ExchangeRates, exchangeRates);
  };

  return {
    exchangeRates,
    targetCurrency,
    isRussian,
    currencySymbol,
    formatAmount,
    formatWithCurrency,
    formatPositive,
    convertAmount,
    convertToRub,
  };
}
