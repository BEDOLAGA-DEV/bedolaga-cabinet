import type { Tariff } from '@/types';

// Match PricingEngine: round(days / 30) uses half-to-even, with at least one month.
export function deviceBillingMonths(days: number): number {
  const whole = Math.floor(days / 30);
  const remainder = days % 30;
  return Math.max(1, whole + (remainder > 15 || (remainder === 15 && whole % 2 === 1) ? 1 : 0));
}

/** Match server category totals and exact-day group rates; active promo applies later. */
export function customDaysPrice(
  tariff: Tariff,
  days: number,
): { price: number; original?: number } {
  const exact = tariff.custom_days_pricing;
  if (exact) {
    const rates = exact.discounts_by_days[String(days)];
    const base = exact.period_prices[String(days)] || days * exact.price_per_day_kopeks;
    const devices = tariff.base_device_limit === 0 ? 0 : (tariff.extra_devices_count ?? 0);
    const extra = devices * exact.device_price_kopeks * deviceBillingMonths(days);
    const discounted = (price: number, percent: number) =>
      price - Math.floor((price * percent) / 100);
    const price =
      discounted(base, rates?.period ?? 0) +
      discounted(extra, rates?.devices ?? exact.default_device_discount_percent);
    const original = base + extra;
    return { price, ...(original > price ? { original } : {}) };
  }
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
