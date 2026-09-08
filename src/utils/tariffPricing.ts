import type { Tariff } from '../types';

function roundHalfToEven(value: number): number {
  const floor = Math.floor(value);
  const fraction = value - floor;
  if (fraction === 0.5) return floor % 2 === 0 ? floor : floor + 1;
  return Math.round(value);
}

export function getCustomDaysTariffPricing(tariff: Tariff, days: number) {
  const months = Math.max(1, roundHalfToEven(days / 30));
  const extraDevices = Math.max(0, tariff.extra_devices_count || 0);
  const devicePrice = tariff.device_price_kopeks || 0;
  const originalDevicePrice = tariff.original_device_price_kopeks ?? devicePrice;
  const pricePerDay = tariff.price_per_day_kopeks || 0;
  const originalPricePerDay = tariff.original_price_per_day_kopeks ?? pricePerDay;

  const extraDevicesCost = extraDevices * devicePrice * months;
  const originalExtraDevicesCost = extraDevices * originalDevicePrice * months;

  return {
    months,
    extraDevicesCost,
    originalExtraDevicesCost,
    price: days * pricePerDay + extraDevicesCost,
    originalPrice: days * originalPricePerDay + originalExtraDevicesCost,
  };
}
