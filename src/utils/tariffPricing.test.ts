import { describe, expect, it } from 'vitest';

import type { Tariff } from '../types';
import { getCustomDaysTariffPricing } from './tariffPricing';

const tariff = {
  extra_devices_count: 2,
  price_per_day_kopeks: 100,
  original_price_per_day_kopeks: 120,
  device_price_kopeks: 500,
  original_device_price_kopeks: 600,
} as Tariff;

describe('getCustomDaysTariffPricing', () => {
  it('includes preserved extra devices in custom-day prices', () => {
    expect(getCustomDaysTariffPricing(tariff, 45)).toEqual({
      months: 2,
      extraDevicesCost: 2000,
      originalExtraDevicesCost: 2400,
      price: 6500,
      originalPrice: 7800,
    });
  });

  it('matches backend half-to-even month rounding', () => {
    expect(getCustomDaysTariffPricing(tariff, 75).months).toBe(2);
  });
});
