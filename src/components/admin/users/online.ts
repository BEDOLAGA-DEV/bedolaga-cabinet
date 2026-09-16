import type { UserListItem } from '@/api/adminUsers';
import { isConnectedNow } from '@/utils/relativeTime';

/** Как часто строки списка пересчитывают «в сети»: окно панели — минута. */
export const ONLINE_TICK_MS = 10_000;

/**
 * Подключён ли человек к VPN прямо сейчас — по отметке панели, а не по готовому «да».
 *
 * Сервер отдаёт время последнего подключения (`online_at`), и строка гасит точку
 * сама, как только отметке стало больше минуты. Раньше приходил только готовый
 * признак, посчитанный в момент запроса: открытый список держал точки зажжёнными
 * сколько угодно долго и показывал «в сети» тех, кто давно отключился.
 *
 * `is_online` остаётся запасным ответом для старого бота, который отметку ещё не шлёт.
 */
export function isUserOnline(
  user: Pick<UserListItem, 'online_at' | 'is_online'>,
  now: number,
): boolean {
  if (user.online_at) return isConnectedNow(user.online_at, now);
  return user.online_at === undefined && user.is_online === true;
}
