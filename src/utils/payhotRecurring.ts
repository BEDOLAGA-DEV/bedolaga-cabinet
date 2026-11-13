import type { PurchaseOptions, Subscription } from '@/types';

export type PayHotMethod = 'card' | 'sbp';
export type PayHotSetupTariff = {
  id?: number | null;
  is_daily?: boolean;
  is_available?: boolean;
  periods?: { days: number; price_kopeks: number }[];
  custom_days_enabled?: boolean;
  min_days?: number;
  max_days?: number;
  price_per_day_kopeks?: number;
};
export const isPayHotPeriod = (days?: number): days is number =>
  days !== undefined && Number.isSafeInteger(days) && days > 0;
export const isPayHotLocked = (status: string) => !['none', 'CANCELLED', 'FAILED'].includes(status);
export const canCancelPayHot = (status: string) =>
  [
    'CREATING',
    'CREATION_UNKNOWN',
    'PENDING',
    'ACTIVE',
    'PAUSED',
    'CANCEL_PENDING',
    'REVIEW',
  ].includes(status);
export const isPayHotTransition = (status: string) =>
  ['CREATING', 'CREATION_UNKNOWN', 'PENDING', 'CANCEL_PENDING'].includes(status);
export function payHotPeriodOptions(tariff?: PayHotSetupTariff) {
  if (!tariff || tariff.is_available === false) return { periods: [] as number[], custom: null };
  if (tariff.is_daily) return { periods: [1], custom: null };
  const periods = (tariff.periods ?? [])
    .filter((p) => isPayHotPeriod(p.days) && p.price_kopeks > 0)
    .map((p) => p.days);
  const min = tariff.min_days ?? 1,
    max = tariff.max_days ?? 365;
  const custom =
    tariff.custom_days_enabled &&
    isPayHotPeriod(min) &&
    isPayHotPeriod(max) &&
    min <= max &&
    (tariff.price_per_day_kopeks ?? 0) > 0
      ? { min, max }
      : null;
  return { periods, custom };
}
export function payHotSetupTariff(
  options: PurchaseOptions | undefined,
  subscription: Pick<Subscription, 'tariff_id' | 'status'>,
): PayHotSetupTariff | undefined {
  if (!options || subscription.status === 'disabled') return undefined;
  if (options.sales_mode === 'tariffs')
    return options.tariffs.find((t) => t.id === subscription.tariff_id);
  return {
    id: null,
    periods: options.periods
      .filter((p) => p.is_available)
      .map((p) => ({ days: p.period_days, price_kopeks: p.price_kopeks })),
  };
}
export function resolvePayHotTarget(
  explicitId: number | undefined,
  current: { id: number; tariff_id?: number | null; is_trial: boolean } | null | undefined,
  tariffId: number,
  multi: boolean,
) {
  if (explicitId !== undefined) return explicitId;
  if (!multi && current && (current.is_trial || current.tariff_id === tariffId)) return current.id;
  return undefined;
}
export function formatPayHotCharge(kopeks: number, language: string) {
  return new Intl.NumberFormat(language, { style: 'currency', currency: 'RUB' }).format(
    kopeks / 100,
  );
}
export function payHotErrorKey(error: unknown) {
  const code = (error as { response?: { data?: { detail?: { code?: string } } } })?.response?.data
    ?.detail?.code;
  const known: Record<string, string> = {
    quote_changed: 'changed',
    quote_expired: 'expired',
    price_changed: 'changed',
    recurrent_already_exists: 'existing',
    subscription_not_found: 'missingSubscription',
    period_unavailable: 'period',
    provider_disabled: 'disabled',
  };
  return code && known[code]
    ? `subscription.payhotRecurring.errors.${known[code]}`
    : 'subscription.payhotRecurring.error';
}
