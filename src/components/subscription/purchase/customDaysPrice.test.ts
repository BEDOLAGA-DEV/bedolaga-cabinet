import { expect, it } from 'vitest';
import { combinePromoDiscount } from '@/hooks/usePromoDiscount';
import type { Tariff } from '@/types';
import { customDaysPrice } from './customDaysPrice';

it.each([1, 7, 14, 29, 30, 31, 45, 75, 105, 365, 10000])(
  'prorates additional devices for %i days',
  (days) => {
    expect(
      customDaysPrice(
        {
          price_per_day_kopeks: 200,
          base_device_limit: 2,
          extra_devices_count: 1,
          device_price_kopeks: 3000,
        } as Tariff,
        days,
      ),
    ).toEqual({ price: days * 300 });
  },
);
it('uses the API group-discounted unit prices once for base and extra devices', () => {
  const tariff = {
    price_per_day_kopeks: 4,
    original_price_per_day_kopeks: 5,
    custom_days_discount_percent: 30,
    device_price_kopeks: 80,
    original_device_price_kopeks: 100,
    device_discount_percent: 20,
    base_device_limit: 1,
    extra_devices_count: 2,
  } as Tariff;
  expect(customDaysPrice(tariff, 75)).toEqual({ price: 700, original: 875 });
});
it('unlimited devices have no extra-device charge', () => {
  expect(
    customDaysPrice(
      {
        price_per_day_kopeks: 10,
        base_device_limit: 0,
        extra_devices_count: 2,
        device_price_kopeks: 100,
      } as Tariff,
      75,
    ),
  ).toEqual({ price: 750 });
});

it.each([
  [45, false, 1302, undefined],
  [75, false, 787, 880],
  [75, true, 661, 880],
  [105, true, 1232, undefined],
])('matches exact group rates for %i days (default=%s)', (days, defaultGroup, price, original) => {
  const tariff = {
    price_per_day_kopeks: 4,
    device_price_kopeks: 71,
    base_device_limit: 1,
    extra_devices_count: 2,
    custom_days_pricing: {
      price_per_day_kopeks: 5,
      device_price_kopeks: 101,
      period_prices: { '45': 999 },
      default_device_discount_percent: 0,
      discounts_by_days: {
        '30': { period: 30, devices: defaultGroup ? 30 : 0 },
        '75': { period: 25, devices: defaultGroup ? 25 : 0 },
      },
    },
  } as unknown as Tariff;
  const quote = customDaysPrice(tariff, days);
  expect(quote).toEqual({ price, ...(original ? { original } : {}) });
  expect(combinePromoDiscount(quote.price, quote.original, 17).price).toBe(
    price - Math.floor((price * 17) / 100),
  );
  expect(combinePromoDiscount(quote.price, quote.original, 100).price).toBe(0);
});

it('matches the engine custom-day fallback for a zero configured period', () => {
  const tariff = {
    base_device_limit: 1,
    extra_devices_count: 2,
    custom_days_pricing: {
      price_per_day_kopeks: 5,
      device_price_kopeks: 101,
      period_prices: { '45': 0 },
      default_device_discount_percent: 0,
      discounts_by_days: {},
    },
  } as unknown as Tariff;
  expect(customDaysPrice(tariff, 45)).toEqual({ price: 528 });
});
