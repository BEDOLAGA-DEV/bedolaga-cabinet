import type { CasheraRecurringInfo } from '../types';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

/**
 * true, если ошибка — ровно «автопродление Cashera выключено на бэке»
 * (403 с detail==='Cashera recurrent disabled'). Сравнение строгое: тот же
 * 403 используют другие guard'ы с detail-объектом.
 */
export function isCasheraFeatureDisabledError(error: unknown): boolean {
  if (!isRecord(error)) return false;
  const response = error.response;
  if (!isRecord(response) || response.status !== 403) return false;
  const data = response.data;
  return isRecord(data) && data.detail === 'Cashera recurrent disabled';
}

export type CasheraUiState = 'hidden' | 'off' | 'pending' | 'active' | 'past_due';

/** Статус привязки → состояние UI; нераспознанный статус деградирует в 'off'. */
export function casheraUiState(
  info: CasheraRecurringInfo | undefined,
  featureDisabled: boolean,
): CasheraUiState {
  if (featureDisabled) return 'hidden';
  if (!info) return 'off';
  switch (info.status) {
    case 'PENDING':
      return 'pending';
    case 'ACTIVE':
      return 'active';
    case 'PAST_DUE':
      return 'past_due';
    default:
      return 'off';
  }
}

/** Ключ подписи периодичности: у Cashera интервал приезжает строкой. */
export function casheraIntervalLabelKey(interval: string | undefined): string {
  switch (interval) {
    case 'daily':
      return 'subscription.casheraRecurring.interval.daily';
    case 'weekly':
      return 'subscription.casheraRecurring.interval.weekly';
    case 'yearly':
      return 'subscription.casheraRecurring.interval.yearly';
    default:
      return 'subscription.casheraRecurring.interval.monthly';
  }
}
