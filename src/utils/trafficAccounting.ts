import type { TrafficAccountingSummary } from '@/types';

export function hasUnknownManagedTraffic(
  subscription: TrafficAccountingSummary,
  refreshed?: TrafficAccountingSummary | null,
): boolean {
  const mode = refreshed?.traffic_accounting_mode ?? subscription.traffic_accounting_mode;
  const remaining =
    refreshed?.traffic_remaining_gb !== undefined
      ? refreshed.traffic_remaining_gb
      : subscription.traffic_remaining_gb;
  return (
    mode === 'managed' &&
    (typeof remaining !== 'number' || !Number.isFinite(remaining) || remaining < 0)
  );
}
