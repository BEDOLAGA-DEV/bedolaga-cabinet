export function canUseCisPayPeriod(days: number | undefined, daily: boolean): boolean {
  return !daily && days !== undefined && Number.isInteger(days) && days >= 7 && days <= 360;
}
export function canCancelCisPay(status: string): boolean {
  return ['CREATING', 'CREATION_UNKNOWN', 'PENDING', 'ACTIVE', 'PAUSED', 'CANCEL_PENDING'].includes(
    status,
  );
}
export function isCisPayTransition(status: string): boolean {
  return ['CREATING', 'CREATION_UNKNOWN', 'PENDING', 'CANCEL_PENDING'].includes(status);
}

/** CisPay charges RUB. Consent must show that exact amount, not an exchange estimate. */
export function formatCisPayCharge(kopeks: number, language: string): string {
  return new Intl.NumberFormat(language, { style: 'currency', currency: 'RUB' }).format(
    kopeks / 100,
  );
}

/** A purchase without an explicit target creates a separate subscription in multi mode. */
export function resolveCisPayTarget(
  explicitId: number | undefined,
  current: { id: number; tariff_id?: number | null; is_trial: boolean } | null | undefined,
  tariffId: number,
  multi: boolean,
): number | undefined {
  if (explicitId !== undefined) return explicitId;
  if (!multi && current && (current.is_trial || current.tariff_id === tariffId)) return current.id;
  return undefined;
}

export function canSetupCisPayTariff(
  tariff:
    | {
        is_daily?: boolean;
        is_available?: boolean;
        periods?: { days: number; price_kopeks: number; original_price_kopeks?: number }[];
        custom_days_enabled?: boolean;
        min_days?: number;
        max_days?: number;
        price_per_day_kopeks?: number;
        original_price_per_day_kopeks?: number;
      }
    | undefined,
): boolean {
  if (!tariff || tariff.is_daily || tariff.is_available === false) return false;
  if (
    tariff.periods?.some(
      (p) => canUseCisPayPeriod(p.days, false) && (p.original_price_kopeks ?? p.price_kopeks) > 0,
    )
  )
    return true;
  return (
    !!tariff.custom_days_enabled &&
    (tariff.original_price_per_day_kopeks ?? tariff.price_per_day_kopeks ?? 0) > 0 &&
    Math.max(7, tariff.min_days ?? 1) <= Math.min(360, tariff.max_days ?? 365)
  );
}

export function cisPayErrorKey(error: unknown): string {
  const code = (error as { response?: { data?: { detail?: { code?: string } } } })?.response?.data
    ?.detail?.code;
  const known: Record<string, string> = {
    disable_balance_autopay_first: 'balanceAutopay',
    recurrent_already_exists: 'existing',
    quote_changed: 'quoteChanged',
    quote_expired: 'quoteChanged',
    subscription_disabled: 'disabledSubscription',
    tariff_switch_requires_balance: 'changeTariff',
    device_selection_not_available: 'devices',
    amount_out_of_range: 'amount',
    subscription_not_found: 'missingSubscription',
    select_existing_subscription: 'selectSubscription',
  };
  return code && known[code]
    ? `subscription.cispayRecurring.errors.${known[code]}`
    : 'subscription.cispayRecurring.error';
}
