import { describe, expect, it } from 'vitest';
import { isUserOnline } from './online';

/**
 * «Онлайн» в списке — подключение к VPN по отметке панели, и гаснет оно само.
 *
 * Раньше сервер присылал готовый признак, посчитанный в момент запроса: открытый
 * список держал зелёные точки сколько угодно долго, и в выборке «Онлайн» стояли
 * люди, отключившиеся минуты назад.
 */
describe('isUserOnline', () => {
  const NOW = Date.parse('2026-09-16T12:00:00Z');
  const at = (secondsAgo: number) => new Date(NOW - secondsAgo * 1000).toISOString();

  it('горит, пока отметке не больше минуты', () => {
    expect(isUserOnline({ online_at: at(1) }, NOW)).toBe(true);
    expect(isUserOnline({ online_at: at(59) }, NOW)).toBe(true);
  });

  it('гаснет сам, когда отметка перевалила за минуту', () => {
    expect(isUserOnline({ online_at: at(61) }, NOW)).toBe(false);
    expect(isUserOnline({ online_at: at(600) }, NOW)).toBe(false);
  });

  it('свежая отметка гаснет на тех же данных, когда время ушло вперёд', () => {
    const user = { online_at: at(55) };
    expect(isUserOnline(user, NOW)).toBe(true);
    expect(isUserOnline(user, NOW + 10_000)).toBe(false);
  });

  it('без отметки точки нет', () => {
    expect(isUserOnline({ online_at: null }, NOW)).toBe(false);
    expect(isUserOnline({ online_at: null, is_online: true }, NOW)).toBe(false);
  });

  it('старый бот отметку не шлёт — верим его признаку', () => {
    expect(isUserOnline({ is_online: true }, NOW)).toBe(true);
    expect(isUserOnline({ is_online: false }, NOW)).toBe(false);
    expect(isUserOnline({ is_online: null }, NOW)).toBe(false);
  });
});
