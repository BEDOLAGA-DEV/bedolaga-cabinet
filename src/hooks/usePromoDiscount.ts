import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { promoApi } from '../api/promo';

// ──────────────────────────────────────────────────────────────────
// usePromoDiscount
//
// Single source of truth for the active-discount query + the
// applyPromoDiscount helper. Extracted from SubscriptionPurchase.tsx
// so that every flow / sub-component (tariff picker, tariff purchase
// form, classic wizard, switch-tariff sheet) can call the same hook
// without re-fetching or threading a function through props.
//
// Returns:
//   activeDiscount: the raw API value (or undefined while loading)
//   applyPromoDiscount: combines the active discount with any
//     pre-existing price reduction (promo-group pricing) and reports
//     final price, original price, total percent off, and whether
//     the existing reduction is a promo-group price.
// ──────────────────────────────────────────────────────────────────

export interface PromoDiscountResult {
  price: number;
  original: number | null;
  percent: number | null;
  isPromoGroup: boolean;
}

/**
 * Наложить активную скидку промокода на серверную цену (уже со скидкой группы).
 * Чистая часть хука: сервер промокод в цену НЕ вкладывает, клиент накладывает
 * его ровно один раз — здесь. `existingOriginalPrice` — цена до групповой скидки,
 * от неё считается суммарный процент.
 */
export function combinePromoDiscount(
  priceKopeks: number,
  existingOriginalPrice: number | null | undefined,
  activePercent: number,
): PromoDiscountResult {
  const hasExisting = (existingOriginalPrice ?? 0) > priceKopeks;
  const hasPromo = activePercent > 0;

  if (!hasExisting && !hasPromo) {
    return { price: priceKopeks, original: null, percent: null, isPromoGroup: false };
  }

  const finalPrice = hasPromo ? Math.round(priceKopeks * (1 - activePercent / 100)) : priceKopeks;

  if (hasExisting) {
    const original = existingOriginalPrice as number;
    return {
      price: finalPrice,
      original,
      percent: Math.round((1 - finalPrice / original) * 100),
      isPromoGroup: true,
    };
  }

  return { price: finalPrice, original: priceKopeks, percent: activePercent, isPromoGroup: false };
}

export type ApplyPromoDiscount = (
  priceKopeks: number,
  existingOriginalPrice?: number | null,
) => PromoDiscountResult;

export function usePromoDiscount() {
  const { data: activeDiscount } = useQuery({
    queryKey: ['active-discount'],
    queryFn: promoApi.getActiveDiscount,
    staleTime: 30000,
  });

  const activePercent = activeDiscount?.is_active ? (activeDiscount.discount_percent ?? 0) : 0;

  const applyPromoDiscount = useCallback<ApplyPromoDiscount>(
    (priceKopeks, existingOriginalPrice) =>
      combinePromoDiscount(priceKopeks, existingOriginalPrice, activePercent),
    [activePercent],
  );

  return { activeDiscount, applyPromoDiscount };
}
