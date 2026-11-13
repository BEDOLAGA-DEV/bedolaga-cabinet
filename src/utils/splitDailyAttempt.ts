import type { SplitDailyQuote } from '@/api/subscription';
import { safeSession } from './safeStorage';
export type SplitDailyAttempt = { operationId: string; quote: SplitDailyQuote; accepted: boolean };
export const splitDailyStorageKey = (userId?: number, subscriptionId?: number) =>
  userId && subscriptionId ? `cabinet:split-daily:${userId}:${subscriptionId}` : null;
export function validSplitDailyQuote(
  value: SplitDailyQuote | undefined,
  subscriptionId: number,
): value is SplitDailyQuote {
  return (
    !!value &&
    value.subscription_id === subscriptionId &&
    Number.isSafeInteger(value.tariff_id) &&
    value.tariff_id > 0 &&
    typeof value.tariff_name === 'string' &&
    Number.isSafeInteger(value.price_kopeks) &&
    value.price_kopeks >= 0 &&
    /^[0-9a-f]{64}$/.test(value.terms_hash) &&
    Number.isFinite(Date.parse(value.old_end_date)) &&
    Number.isFinite(Date.parse(value.intended_end_date))
  );
}
export function readSplitDailyAttempt(
  key: string | null,
  subscriptionId: number,
): SplitDailyAttempt | null {
  if (!key) return null;
  try {
    const value = JSON.parse(safeSession.getItem(key) ?? 'null');
    return typeof value?.operationId === 'string' &&
      /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(value.operationId) &&
      typeof value.accepted === 'boolean' &&
      validSplitDailyQuote(value.quote, subscriptionId)
      ? value
      : null;
  } catch {
    return null;
  }
}
