import { describe, expect, it } from 'vitest';
import { relativeTimeParts } from './relativeTime';

const NOW = Date.parse('2026-09-14T12:00:00Z');
const ago = (ms: number) => new Date(NOW - ms).toISOString();

/**
 * «5 мин назад», «вчера», «3 нед назад» в списке пользователей и в карточке.
 * Функция чистая: отдаёт ключ локали и число, слова подставляет компонент.
 */
describe('relativeTimeParts', () => {
  it('null — never', () => {
    expect(relativeTimeParts(null, NOW)).toEqual({ key: 'never', count: 0, isOnline: false });
  });
  it('мусор вместо даты — never', () => {
    expect(relativeTimeParts('когда-то', NOW).key).toBe('never');
  });
  it('меньше минуты — now и онлайн', () => {
    expect(relativeTimeParts(ago(20_000), NOW)).toEqual({ key: 'now', count: 0, isOnline: true });
  });
  it('4 минуты — онлайн', () => {
    expect(relativeTimeParts(ago(4 * 60_000), NOW)).toEqual({
      key: 'minutes',
      count: 4,
      isOnline: true,
    });
  });
  it('6 минут — уже не онлайн', () => {
    expect(relativeTimeParts(ago(6 * 60_000), NOW).isOnline).toBe(false);
  });
  it('часы, дни, недели, месяцы', () => {
    expect(relativeTimeParts(ago(3 * 3_600_000), NOW)).toMatchObject({ key: 'hours', count: 3 });
    expect(relativeTimeParts(ago(2 * 86_400_000), NOW)).toMatchObject({ key: 'days', count: 2 });
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
