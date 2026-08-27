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

export function usePromoDiscount() {
  const { data: activeDiscount } = useQuery({
    queryKey: ['active-discount'],
    queryFn: promoApi.getActiveDiscount,
    staleTime: 30000,
  });

  const applyPromoDiscount = useCallback(
    (priceKopeks: number, existingOriginalPrice?: number | null): PromoDiscountResult => {
      const hasExisting = (existingOriginalPrice ?? 0) > priceKopeks;
      const hasPromo = !!activeDiscount?.is_active && !!activeDiscount.discount_percent;

      if (!hasExisting && !hasPromo) {
        return { price: priceKopeks, original: null, percent: null, isPromoGroup: false };
      }

      let finalPrice = priceKopeks;
      if (hasPromo) {
        finalPrice = Math.round(priceKopeks * (1 - activeDiscount!.discount_percent! / 100));
      }

      if (hasExisting) {
        const combinedPercent = hasPromo
          ? Math.round((1 - finalPrice / existingOriginalPrice!) * 100)
          : Math.round((1 - priceKopeks / existingOriginalPrice!) * 100);
        return {
          price: finalPrice,
          original: existingOriginalPrice!,
          percent: combinedPercent,
          isPromoGroup: true,
        };
      }

      return {
        price: finalPrice,
        original: priceKopeks,
        percent: activeDiscount!.discount_percent!,
        isPromoGroup: false,
      };
    },
    [activeDiscount],
  );

  return { activeDiscount, applyPromoDiscount };
}
