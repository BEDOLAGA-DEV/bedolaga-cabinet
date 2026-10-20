import { expect, it } from 'vitest';
import type { Tariff } from '@/types';
import { customDaysPrice, deviceBillingMonths } from './customDaysPrice';

it.each([
  [15, 1],
  [30, 1],
  [45, 2],
  [75, 2],
  [105, 4],
])('bills %i days as %i device months', (days, months) => {
  expect(deviceBillingMonths(days)).toBe(months);
});
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
  expect(customDaysPrice(tariff, 75)).toEqual({ price: 620, original: 775 });
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
