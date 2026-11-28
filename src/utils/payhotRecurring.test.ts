import { expect, it } from 'vitest';
import {
  payHotPeriodOptions,
  resolvePayHotTarget,
  isPayHotLocked,
  canCancelPayHot,
  isPayHotTransition,
} from './payhotRecurring';
it('allows cancellation while enrollment creation is uncertain', () => {
  expect(canCancelPayHot('CREATION_UNKNOWN')).toBe(true);
});
it('polls while enrollment creation is uncertain', () => {
  expect(isPayHotTransition('CREATION_UNKNOWN')).toBe(true);
});
it('uses tariff periods without CisPay limits, including daily and unlimited devices', () => {
  expect(payHotPeriodOptions({ is_daily: true }).periods).toEqual([1]);
  expect(
    payHotPeriodOptions({
      periods: [
        { days: 1, price_kopeks: 100 },
        { days: 10000, price_kopeks: 50000 },
      ],
    }).periods,
  ).toEqual([1, 10000]);
  expect(
    payHotPeriodOptions({
      custom_days_enabled: true,
      min_days: 1,
      max_days: 10000,
      price_per_day_kopeks: 10,
    }).custom,
  ).toEqual({ min: 1, max: 10000 });
});
it('never picks another subscription in multi mode', () => {
  expect(
    resolvePayHotTarget(undefined, { id: 42, tariff_id: 3, is_trial: true }, 3, true),
  ).toBeUndefined();
  expect(resolvePayHotTarget(43, { id: 42, tariff_id: 3, is_trial: true }, 3, true)).toBe(43);
  expect(resolvePayHotTarget(undefined, { id: 42, tariff_id: 3, is_trial: true }, 3, false)).toBe(
    42,
  );
});
it('unknown states cannot authorize another recurring agreement', () => {
  expect(isPayHotLocked('FUTURE_STATE')).toBe(true);
  expect(isPayHotLocked('REVIEW')).toBe(true);
  expect(isPayHotLocked('CANCELLED')).toBe(false);
});
