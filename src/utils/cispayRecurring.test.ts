import { describe, expect, it } from 'vitest';
import { canUseCisPayPeriod, canCancelCisPay, isCisPayTransition } from './cispayRecurring';

describe('CisPay recurring contract', () => {
  it('uses exact supported periods', () => {
    for (const days of [7, 10, 30, 360]) expect(canUseCisPayPeriod(days, false)).toBe(true);
    for (const days of [1, 6, 365, 10000, 7.5]) expect(canUseCisPayPeriod(days, false)).toBe(false);
    expect(canUseCisPayPeriod(30, true)).toBe(false);
  });
  it('allows cancellation even while creation or revocation is unresolved', () => {
    for (const state of [
      'CREATING',
      'CREATION_UNKNOWN',
      'PENDING',
      'ACTIVE',
      'PAUSED',
      'CANCEL_PENDING',
    ])
      expect(canCancelCisPay(state)).toBe(true);
    expect(canCancelCisPay('CANCELLED')).toBe(false);
    expect(isCisPayTransition('CREATION_UNKNOWN')).toBe(true);
    expect(isCisPayTransition('ACTIVE')).toBe(false);
  });
});

it('shows the exact RUB bank charge from kopeks without exchange conversion', async () => {
  const { formatCisPayCharge } = await import('./cispayRecurring');
  expect(formatCisPayCharge(12345, 'ru')).toMatch(/123,45/);
  expect(formatCisPayCharge(12345, 'en')).toMatch(/123\.45/);
  expect(formatCisPayCharge(12345, 'ru')).not.toMatch(/12.?345/);
});

it('targets the existing single subscription but never an implicit multi subscription', async () => {
  const { resolveCisPayTarget } = await import('./cispayRecurring');
  const paid = { id: 4, tariff_id: 8, is_trial: false };
  expect(resolveCisPayTarget(undefined, paid, 8, false)).toBe(4);
  expect(resolveCisPayTarget(undefined, paid, 9, false)).toBeUndefined();
  expect(resolveCisPayTarget(undefined, paid, 8, true)).toBeUndefined();
  expect(resolveCisPayTarget(7, paid, 8, true)).toBe(7);
  expect(resolveCisPayTarget(undefined, { ...paid, is_trial: true }, 9, false)).toBe(4);
  expect(resolveCisPayTarget(undefined, undefined, 9, false)).toBeUndefined();
});

it('only offers setup for a purchasable supported period, including custom days', async () => {
  const { cisPaySetupTariff } = await import('./cispayRecurring');
  const tariff = {
    id: 9,
    is_daily: false,
    is_available: true,
    periods: [{ days: 365, price_kopeks: 10000 }],
  };
  const sub = { tariff_id: 9, status: 'active' };
  const setup = (t: typeof tariff & Record<string, unknown>) =>
    cisPaySetupTariff({ sales_mode: 'tariffs', cispay_recurrent_enabled: true, tariffs: [t] }, sub);
  expect(setup(tariff)).toBeUndefined();
  const monthly = { ...tariff, periods: [{ days: 30, price_kopeks: 1000 }] };
  expect(setup(monthly)).toBe(monthly);
  expect(setup({ ...monthly, is_daily: true })).toBeUndefined();
  expect(
    setup({
      ...tariff,
      custom_days_enabled: true,
      price_per_day_kopeks: 100,
      min_days: 1,
      max_days: 10000,
    }),
  ).toBeDefined();
  expect(
    setup({
      ...tariff,
      custom_days_enabled: true,
      price_per_day_kopeks: 100,
      min_days: 365,
      max_days: 10000,
    }),
  ).toBeUndefined();
});

it('ties setup to tariffs mode, the CisPay switch and a live subscription', async () => {
  const { cisPaySetupTariff } = await import('./cispayRecurring');
  const tariff = { id: 9, periods: [{ days: 30, price_kopeks: 1000 }] };
  const options = { sales_mode: 'tariffs', cispay_recurrent_enabled: true, tariffs: [tariff] };
  const sub = { tariff_id: 9, status: 'active' };
  expect(cisPaySetupTariff(options, sub)).toBe(tariff);
  expect(cisPaySetupTariff({ ...options, cispay_recurrent_enabled: false }, sub)).toBeUndefined();
  expect(cisPaySetupTariff({ ...options, sales_mode: 'classic' }, sub)).toBeUndefined();
  expect(cisPaySetupTariff(options, { ...sub, status: 'disabled' })).toBeUndefined();
  expect(cisPaySetupTariff(options, { ...sub, tariff_id: 10 })).toBeUndefined();
  expect(cisPaySetupTariff(undefined, sub)).toBeUndefined();
});

it('lists supported fixed periods and clamps custom days to the CisPay range', async () => {
  const { cisPayPeriodOptions } = await import('./cispayRecurring');
  expect(
    cisPayPeriodOptions({
      periods: [
        { days: 3, price_kopeks: 100 },
        { days: 30, price_kopeks: 1000 },
        { days: 90, price_kopeks: 0 },
        { days: 365, price_kopeks: 10000 },
      ],
    }),
  ).toEqual({ periods: [30], custom: null });
  expect(
    cisPayPeriodOptions({
      custom_days_enabled: true,
      price_per_day_kopeks: 100,
      min_days: 1,
      max_days: 10000,
    }),
  ).toEqual({ periods: [], custom: { min: 7, max: 360 } });
  expect(
    cisPayPeriodOptions({ is_available: false, periods: [{ days: 30, price_kopeks: 1000 }] }),
  ).toEqual({ periods: [], custom: null });
});
