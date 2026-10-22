import { useCallback, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { currencyApi, type ExchangeRates } from '../api/currency';
import { FALLBACK_RATES, RIALS_PER_TOMAN } from '../utils/currencyUnits';
import { setExchangeRates as setGlobalExchangeRates } from '../utils/format';
import { formatDecimal } from '../utils/formatNumber';
import { uiLocale } from '../utils/uiLocale';

// Map language to currency
const LANGUAGE_CURRENCY_MAP: Record<string, keyof ExchangeRates | 'RUB'> = {
  ru: 'RUB',
  en: 'USD',
  zh: 'CNY',
  fa: 'IRR',
};

// Default rates for fallback
const DEFAULT_RATES = FALLBACK_RATES;

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

  // Делимся курсом с синхронным formatPrice из utils/format.ts —
  // у него нет своего источника rates, а на лендинге его дёргают subcomponents.
  useEffect(() => {
    setGlobalExchangeRates(exchangeRates);
  }, [exchangeRates]);

  // Get current language and currency
  const currentLanguage = i18n.language;
  const targetCurrency = LANGUAGE_CURRENCY_MAP[currentLanguage] || 'USD';

  // Check if current language is Russian (no conversion needed)
  const isRussian = currentLanguage === 'ru';

  // Get currency symbol from translations
  const currencySymbol = t('common.currency');

  // Format amount with currency conversion
  const formatAmount = useCallback(
    (rubAmount: number, decimals: number = 2): string => {
      // Разряды и дробь — по правилам языка: «3 002,00», а не «3002.00».
      if (isRussian) {
        return formatDecimal(rubAmount, decimals, uiLocale());
      }

      // Convert to target currency
      const convertedAmount = currencyApi.convertFromRub(
        rubAmount,
        targetCurrency as keyof ExchangeRates,
        exchangeRates,
      );

      // API returns rials; the Persian UI displays whole tomans.
      if (targetCurrency === 'IRR') {
        return Math.round(convertedAmount / RIALS_PER_TOMAN).toLocaleString('fa-IR');
      }

      return formatDecimal(convertedAmount, decimals, uiLocale());
    },
    [isRussian, targetCurrency, exchangeRates],
  );

  // Format amount with currency symbol
  const formatWithCurrency = useCallback(
    (rubAmount: number, decimals: number = 2): string => {
      return `${formatAmount(rubAmount, decimals)}\u00A0${currencySymbol}`;
    },
    [formatAmount, currencySymbol],
  );

  // Format amount with + sign (for earnings/bonuses)
  const formatPositive = useCallback(
    (rubAmount: number, decimals: number = 2): string => {
      return `+${formatAmount(rubAmount, decimals)}\u00A0${currencySymbol}`;
    },
    [formatAmount, currencySymbol],
  );

  // Get raw converted amount (for calculations)
  const convertAmount = useCallback(
    (rubAmount: number): number => {
      if (isRussian) {
        return rubAmount;
      }
      const converted = currencyApi.convertFromRub(
        rubAmount,
        targetCurrency as keyof ExchangeRates,
        exchangeRates,
      );
      return targetCurrency === 'IRR' ? converted / RIALS_PER_TOMAN : converted;
    },
    [isRussian, targetCurrency, exchangeRates],
  );

  // Convert from user's currency back to rubles
  const convertToRub = useCallback(
    (amount: number): number => {
      if (isRussian) {
        return amount;
      }
      return currencyApi.convertToRub(
        targetCurrency === 'IRR' ? amount * RIALS_PER_TOMAN : amount,
        targetCurrency as keyof ExchangeRates,
        exchangeRates,
      );
    },
    [isRussian, targetCurrency, exchangeRates],
  );

  return useMemo(
    () => ({
      exchangeRates,
      targetCurrency,
      isRussian,
      currencySymbol,
      formatAmount,
      formatWithCurrency,
      formatPositive,
      convertAmount,
      convertToRub,
    }),
    [
      exchangeRates,
      targetCurrency,
      isRussian,
      currencySymbol,
      formatAmount,
      formatWithCurrency,
      formatPositive,
      convertAmount,
      convertToRub,
    ],
  );
}
