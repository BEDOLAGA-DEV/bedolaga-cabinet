/**
 * Относительное время для админских списков: «5 мин назад», «вчера», «3 нед назад».
 *
 * Возвращает ключ локали и число, а не готовую строку: слова и склонения живут
 * в `common.relative.*` четырёх локалей, компонент подставляет их через `t`.
 */

export type RelativeKey =
  | 'now'
  | 'minutes'
  | 'hours'
  | 'yesterday'
  | 'days'
  | 'weeks'
  | 'months'
  | 'never';

export interface RelativeTimeParts {
  key: RelativeKey;
  count: number;
}

/**
 * Панель красит пользователя зелёным, пока с `userTraffic.onlineAt` прошло не больше минуты.
 * «Подключён сейчас» в кабинете — то же окно, иначе карточка спорит с панелью.
 * Давность действий в боте (`last_activity`) подключением не считается.
 */
export const PANEL_ONLINE_WINDOW_MS = 60_000;

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function isConnectedNow(
  onlineAt: string | null | undefined,
  now: number = Date.now(),
): boolean {
  if (!onlineAt) return false;
  const ts = new Date(onlineAt).getTime();
  return !Number.isNaN(ts) && now - ts <= PANEL_ONLINE_WINDOW_MS;
}

export function relativeTimeParts(
  value: string | null | undefined,
  now: number = Date.now(),
): RelativeTimeParts {
  if (!value) return { key: 'never', count: 0 };
  const ts = new Date(value).getTime();
  if (Number.isNaN(ts)) return { key: 'never', count: 0 };

  const diff = Math.max(0, now - ts);
  const minutes = Math.floor(diff / MINUTE);
  if (minutes < 1) return { key: 'now', count: 0 };
  if (minutes < 60) return { key: 'minutes', count: minutes };
  const hours = Math.floor(diff / HOUR);
  if (hours < 24) return { key: 'hours', count: hours };
  const days = Math.floor(diff / DAY);
  if (days === 1) return { key: 'yesterday', count: 1 };
  if (days < 14) return { key: 'days', count: days };
  if (days < 60) return { key: 'weeks', count: Math.floor(days / 7) };
  return { key: 'months', count: Math.floor(days / 30) };
}

export type CalendarDay = 'today' | 'yesterday' | 'other';

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * День записи по календарю зрителя: «сегодня», «вчера» или другой. Для подписей вида
 * «сегодня, 15:10» — в отличие от `relativeTimeParts`, считает смену даты, а не 24 часа.
 */
export function calendarDay(
  value: string | null | undefined,
  now: Date = new Date(),
): CalendarDay | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / DAY);
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  return 'other';
}
