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
  const { canSetupCisPayTariff } = await import('./cispayRecurring');
  const tariff = {
    is_daily: false,
    is_available: true,
    periods: [{ days: 365, price_kopeks: 10000 }],
  };
  expect(canSetupCisPayTariff(tariff)).toBe(false);
  expect(canSetupCisPayTariff({ ...tariff, periods: [{ days: 30, price_kopeks: 1000 }] })).toBe(
    true,
  );
  expect(
    canSetupCisPayTariff({
      ...tariff,
      is_daily: true,
      periods: [{ days: 30, price_kopeks: 1000 }],
    }),
  ).toBe(false);
  expect(
    canSetupCisPayTariff({
      ...tariff,
      custom_days_enabled: true,
      price_per_day_kopeks: 100,
      min_days: 1,
      max_days: 10000,
    }),
  ).toBe(true);
  expect(
    canSetupCisPayTariff({
      ...tariff,
      custom_days_enabled: true,
      price_per_day_kopeks: 100,
      min_days: 365,
      max_days: 10000,
    }),
  ).toBe(false);
  expect(canSetupCisPayTariff(undefined)).toBe(false);
});
