import { useCallback } from 'react';
import { useCurrency } from '@/hooks/useCurrency';

/**
 * Суммы в админке: целые — без копеек («3 002 ₽»), дробные — с двумя знаками
 * («41,50 ₽»). Хвост «,00» у каждой суммы только шумит в плотных списках.
 */
export function useMoney() {
  const { formatWithCurrency } = useCurrency();
  return useCallback(
    (rubles: number) => formatWithCurrency(rubles, Number.isInteger(rubles) ? 0 : 2),
    [formatWithCurrency],
  );
}

/** «+3 000 ₽» / «−2 125 ₽» — знак минус типографский, не дефис. */
export function useSignedMoney() {
  const money = useMoney();
  return useCallback(
    (rubles: number) => `${rubles < 0 ? '−' : '+'}${money(Math.abs(rubles))}`,
    [money],
  );
}
