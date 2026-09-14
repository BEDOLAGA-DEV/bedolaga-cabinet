import { describe, expect, it } from 'vitest';
import {
  PANEL_ONLINE_WINDOW_MS,
  calendarDay,
  isConnectedNow,
  relativeTimeParts,
} from './relativeTime';

const NOW = Date.parse('2026-09-14T12:00:00Z');
const ago = (ms: number) => new Date(NOW - ms).toISOString();

/**
 * «5 мин назад», «вчера», «3 нед назад» в списке пользователей и в карточке.
 * Функция чистая: отдаёт ключ локали и число, слова подставляет компонент.
 */
describe('relativeTimeParts', () => {
  it('null — never', () => {
    expect(relativeTimeParts(null, NOW)).toEqual({ key: 'never', count: 0 });
  });
  it('мусор вместо даты — never', () => {
    expect(relativeTimeParts('когда-то', NOW).key).toBe('never');
  });
  it('меньше минуты — now', () => {
    expect(relativeTimeParts(ago(20_000), NOW)).toEqual({ key: 'now', count: 0 });
  });
  it('4 минуты — минуты, без «онлайн»: давность действий в боте не значит подключение', () => {
    expect(relativeTimeParts(ago(4 * 60_000), NOW)).toEqual({ key: 'minutes', count: 4 });
  });
  it('часы, дни, недели, месяцы', () => {
    expect(relativeTimeParts(ago(3 * 3_600_000), NOW)).toMatchObject({ key: 'hours', count: 3 });
    expect(relativeTimeParts(ago(2 * 86_400_000), NOW)).toMatchObject({ key: 'days', count: 2 });
    expect(relativeTimeParts(ago(30 * 3_600_000), NOW)).toMatchObject({ key: 'yesterday' });
    expect(relativeTimeParts(ago(15 * 86_400_000), NOW)).toMatchObject({ key: 'weeks', count: 2 });
    expect(relativeTimeParts(ago(70 * 86_400_000), NOW)).toMatchObject({
      key: 'months',
      count: 2,
    });
  });
  it('будущее считается «сейчас»', () => {
    expect(relativeTimeParts(new Date(NOW + 60_000).toISOString(), NOW).key).toBe('now');
  });
});

/**
 * «Подключён сейчас» — по отметке панели `onlineAt`, как зелёная точка в самой панели:
 * не старше минуты. Раньше карточка держала пять минут и спорила с панелью.
 */
describe('isConnectedNow', () => {
  it('отметка моложе минуты — подключён', () => {
    expect(isConnectedNow(ago(59_000), NOW)).toBe(true);
  });
  it('старше минуты — уже нет', () => {
    expect(isConnectedNow(ago(61_000), NOW)).toBe(false);
  });
  it('никогда не подключался или мусор — нет', () => {
    expect(isConnectedNow(null, NOW)).toBe(false);
    expect(isConnectedNow('когда-то', NOW)).toBe(false);
  });
  it('окно — минута, как у панели', () => {
    expect(PANEL_ONLINE_WINDOW_MS).toBe(60_000);
  });
});

/**
 * «сегодня, 15:10», «вчера, 09:02», «07.08.2026» — день по календарю зрителя,
 * а не «24 часа назад»: запись в 23:50 вчерашнего дня — это «вчера», даже если прошло 20 минут.
 */
describe('calendarDay', () => {
  const at = (iso: string) => new Date(iso);
  const now = at('2026-09-14T15:00:00');
  it('тот же день — today', () => {
    expect(calendarDay('2026-09-14T00:05:00', now)).toBe('today');
  });
  it('предыдущий календарный день — yesterday', () => {
    expect(calendarDay('2026-09-13T23:50:00', now)).toBe('yesterday');
  });
  it('раньше — other', () => {
    expect(calendarDay('2026-09-12T23:59:00', now)).toBe('other');
  });
  it('мусор — null', () => {
    expect(calendarDay('когда-то', now)).toBeNull();
    expect(calendarDay(null, now)).toBeNull();
  });
});
