import type { LavaRecurringInfo } from '../types';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

/**
 * true, если ошибка — это ровно "автопродление Lava выключено на бэке"
 * (403 с detail==='Lava recurrent disabled'). Сравнение строгое: тот же
 * 403-статус используют другие guard'ы с detail-объектом, и на любой форме
 * detail (строка/объект/отсутствует) функция не должна падать.
 */
export function isLavaFeatureDisabledError(error: unknown): boolean {
  if (!isRecord(error)) return false;

  const response = error.response;
  if (!isRecord(response)) return false;
  if (response.status !== 403) return false;

  const data = response.data;
  if (!isRecord(data)) return false;

  return data.detail === 'Lava recurrent disabled';
}

export type LavaUiState = 'hidden' | 'off' | 'pending' | 'active' | 'past_due';

/**
 * Сводит статус автопродления Lava к состоянию UI. Бэк отдаёт из GET только
 * 'none' | 'PENDING' | 'ACTIVE' | 'PAST_DUE' (CANCELLED/FAILED терминальны и
 * не возвращаются), но любой нераспознанный статус деградирует в 'off', а не
 * подвешивает интерфейс.
 */
export function lavaUiState(
  info: LavaRecurringInfo | undefined,
  featureDisabled: boolean,
): LavaUiState {
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

/**
 * Локализационный ключ периодичности списания. У Lava период задан продуктом
 * в кабинете провайдера и приезжает числом дней, поэтому точные подписи есть
 * только для канонических значений; остальное показывается как "N дней".
 */
export function lavaPeriodLabelKey(chargeDays: number | undefined): string | null {
  switch (chargeDays) {
    case 1:
      return 'subscription.lavaRecurring.period.day';
    case 7:
      return 'subscription.lavaRecurring.period.week';
    case 30:
      return 'subscription.lavaRecurring.period.month';
    case 90:
      return 'subscription.lavaRecurring.period.quarter';
    case 180:
      return 'subscription.lavaRecurring.period.halfYear';
    case 365:
      return 'subscription.lavaRecurring.period.year';
    default:
      return null;
  }
}
