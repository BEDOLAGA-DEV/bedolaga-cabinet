import type { SbpRecurringInfo } from '../types';

/**
 * Локализационный ключ для интервала списания СБП-автоплатежа.
 * Бэк присылает 1=день, 2=неделя, 3=месяц, 4=год; неизвестное/отсутствующее
 * значение деградирует в "месяц" — самый частый и безопасный дефолт.
 */
export function sbpIntervalLabelKey(interval: number | undefined): string {
  switch (interval) {
    case 1:
      return 'subscription.sbpRecurring.interval.day';
    case 2:
      return 'subscription.sbpRecurring.interval.week';
    case 3:
      return 'subscription.sbpRecurring.interval.month';
    case 4:
      return 'subscription.sbpRecurring.interval.year';
    default:
      return 'subscription.sbpRecurring.interval.month';
  }
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

/**
 * true, если ошибка — это ровно "фича СБП-автоплатежа выключена на бэке"
 * (403 с detail==='Platega recurrent disabled'). На бэке этот же 403-статус
 * используют и другие guard'ы с detail-объектом (см. isBlacklistedError и
 * соседей в api/client.ts) — поэтому сравнение строгое, без падения на любой
 * форме detail (строка/объект/отсутствует).
 */
export function isSbpFeatureDisabledError(error: unknown): boolean {
  if (!isRecord(error)) return false;

  const response = error.response;
  if (!isRecord(response)) return false;
  if (response.status !== 403) return false;

  const data = response.data;
  if (!isRecord(data)) return false;

  return data.detail === 'Platega recurrent disabled';
}

export type SbpUiState = 'hidden' | 'off' | 'pending' | 'active' | 'past_due';

/**
 * Сводит статус СБП-автоплатежа к состоянию UI. Бэк отдаёт из GET только
 * 'none' | 'PENDING' | 'ACTIVE' | 'PAST_DUE' — CANCELLED/FAILED никогда не
 * возвращаются (терминальные состояния), но на всякий случай любой
 * нераспознанный статус тоже деградирует в 'off', а не падает/подвисает.
 */
export function sbpUiState(
  info: SbpRecurringInfo | undefined,
  featureDisabled: boolean,
): SbpUiState {
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
