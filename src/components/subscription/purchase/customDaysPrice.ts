import type { Tariff } from '@/types';

// Match PricingEngine: round(days / 30) uses half-to-even, with at least one month.
export function deviceBillingMonths(days: number): number {
  const whole = Math.floor(days / 30);
  const remainder = days % 30;
  return Math.max(1, whole + (remainder > 15 || (remainder === 15 && whole % 2 === 1) ? 1 : 0));
}

/** Use API group-discounted units once; the active promo offer is applied to the total. */
export function customDaysPrice(
  tariff: Tariff,
  days: number,
): { price: number; original?: number } {
  const base = days * (tariff.price_per_day_kopeks ?? 0);
  const devices = tariff.base_device_limit === 0 ? 0 : (tariff.extra_devices_count ?? 0);
  const months = deviceBillingMonths(days);
  const extra = devices * (tariff.device_price_kopeks ?? 0) * months;
  const original =
    days * (tariff.original_price_per_day_kopeks ?? tariff.price_per_day_kopeks ?? 0) +
    devices * (tariff.original_device_price_kopeks ?? tariff.device_price_kopeks ?? 0) * months;
  const price = base + extra;
  return { price, ...(original > price ? { original } : {}) };
}
