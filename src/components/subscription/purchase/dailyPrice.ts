import type { ApplyPromoDiscount, PromoDiscountResult } from '@/hooks/usePromoDiscount';

/**
 * Котировка суточной цены для показа: серверная цена (уже со скидкой группы) плюс
 * активный промокод — один раз. Одна функция на карточку тарифа и экран активации,
 * чтобы они не расходились (было: −36 % на карточке и −20 % на активации).
 */
export interface DailyPricedTariff {
  daily_price_kopeks?: number | null;
  original_daily_price_kopeks?: number | null;
  price_per_day_kopeks?: number | null;
}

export function dailyPriceQuote(
  tariff: DailyPricedTariff,
  applyPromoDiscount: ApplyPromoDiscount,
): PromoDiscountResult | null {
  const dailyPrice = tariff.daily_price_kopeks ?? tariff.price_per_day_kopeks ?? 0;
  const originalDailyPrice = tariff.original_daily_price_kopeks ?? 0;
  if (dailyPrice <= 0 && originalDailyPrice <= 0) return null;
  return applyPromoDiscount(
    dailyPrice,
    originalDailyPrice > dailyPrice ? originalDailyPrice : undefined,
  );
}
