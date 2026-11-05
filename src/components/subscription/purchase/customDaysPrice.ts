import type { Tariff } from '@/types';

// Match PricingEngine: monthly rate, exact days, truncate the total to kopeks.
function deviceCost(devices: number, monthlyPrice: number, days: number): number {
  return Math.floor((devices * monthlyPrice * days) / 30);
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
    const extra = deviceCost(devices, exact.device_price_kopeks, days);
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
  const extra = deviceCost(devices, tariff.device_price_kopeks ?? 0, days);
  const original =
    days * (tariff.original_price_per_day_kopeks ?? tariff.price_per_day_kopeks ?? 0) +
    deviceCost(
      devices,
      tariff.original_device_price_kopeks ?? tariff.device_price_kopeks ?? 0,
      days,
    );
  const price = base + extra;
  return { price, ...(original > price ? { original } : {}) };
}
