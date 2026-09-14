/**
 * Относительное время для админских списков: «5 мин назад», «вчера», «3 нед назад».
 *
 * Возвращает ключ локали и число, а не готовую строку: слова и склонения живут
 * в `common.relative.*` четырёх локалей, компонент подставляет их через `t`.
 */

export type RelativeKey = 'now' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'never';

export interface RelativeTimeParts {
  key: RelativeKey;
  count: number;
  /** Активность моложе пяти минут считается «онлайн» — то же окно, что у панели. */
  isOnline: boolean;
}

export const ONLINE_WINDOW_MS = 5 * 60_000;

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function relativeTimeParts(
  value: string | null | undefined,
  now: number = Date.now(),
): RelativeTimeParts {
  if (!value) return { key: 'never', count: 0, isOnline: false };
  const ts = new Date(value).getTime();
  if (Number.isNaN(ts)) return { key: 'never', count: 0, isOnline: false };

  const diff = Math.max(0, now - ts);
  const isOnline = diff < ONLINE_WINDOW_MS;
  const minutes = Math.floor(diff / MINUTE);
  if (minutes < 1) return { key: 'now', count: 0, isOnline };
  if (minutes < 60) return { key: 'minutes', count: minutes, isOnline };
  const hours = Math.floor(diff / HOUR);
  if (hours < 24) return { key: 'hours', count: hours, isOnline: false };
  const days = Math.floor(diff / DAY);
  if (days < 14) return { key: 'days', count: days, isOnline: false };
  if (days < 60) return { key: 'weeks', count: Math.floor(days / 7), isOnline: false };
  return { key: 'months', count: Math.floor(days / 30), isOnline: false };
}
