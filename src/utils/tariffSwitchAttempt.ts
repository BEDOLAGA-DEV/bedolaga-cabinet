import type { subscriptionApi } from '@/api/subscription';
import { safeSession } from './safeStorage';

type Preview = Awaited<ReturnType<typeof subscriptionApi.previewTariffSwitch>>;
export type TariffSwitchAttempt = { operationId: string; preview: Preview };
export function tariffSwitchStorageKey(userId?: number, subscriptionId?: number): string | null {
  return userId && subscriptionId ? `cabinet:tariff-switch:${userId}:${subscriptionId}` : null;
}
export function readTariffSwitchAttempt(key: string | null): TariffSwitchAttempt | null {
  if (!key) return null;
  try {
    const value = JSON.parse(safeSession.getItem(key) ?? 'null');
    const preview = value?.preview;
    return typeof value?.operationId === 'string' &&
      /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value.operationId) &&
      preview?.traffic_accounting_mode === 'split' &&
      Number.isSafeInteger(preview.new_tariff_id) &&
      preview.new_tariff_id > 0 &&
      Number.isSafeInteger(preview.upgrade_cost_kopeks) &&
      preview.upgrade_cost_kopeks >= 0 &&
      typeof preview.expected_terms_hash === 'string' &&
      /^[0-9a-f]{64}$/i.test(preview.expected_terms_hash) &&
      typeof preview.expected_end_date === 'string' &&
      Number.isFinite(Date.parse(preview.expected_end_date))
      ? value
      : null;
  } catch {
    return null;
  }
}
