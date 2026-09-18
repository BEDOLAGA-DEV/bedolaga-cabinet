import { describe, expect, it } from 'vitest';
import type { UserListItem } from '@/api/adminUsers';
import { describeUserStatus } from './UserStatusChip';
import { extraTariffsCount } from './UsersTable';

/**
 * Чип строки при истёкшей подписке и открытом временном доступе (грейсе).
 *
 * У человека подписка кончилась, а VPN ещё работает — по списку это было не
 * отличить от обычной «истекла», и админ не понимал, почему тот в сети.
 */
describe('describeUserStatus: временный доступ', () => {
  const NOW = Date.parse('2026-09-16T12:00:00Z');

  const expired = (extra: Partial<UserListItem> = {}) =>
    ({
      status: 'active',
      has_subscription: true,
      subscription_status: 'expired',
      subscription_is_trial: false,
      days_remaining: 0,
      subscription_end_date: '2026-09-13T12:00:00Z',
      ...extra,
    }) as UserListItem;

  it('открытый грейс вытесняет «истекла»', () => {
    const chip = describeUserStatus(expired({ grace_until: '2026-09-18T12:00:00Z' }), NOW);
    expect(chip.key).toBe('subscriptionChips.graceUntil');
    expect(chip.tone).toBe('warning');
    expect(chip.date).toBeTruthy();
  });

  it('кончившийся грейс возвращает обычную «истекла»', () => {
    const chip = describeUserStatus(expired({ grace_until: '2026-09-15T12:00:00Z' }), NOW);
    expect(chip.key).toBe('subscriptionChips.expiredAgo');
    expect(chip.tone).toBe('error');
  });

  it('без грейса всё как было', () => {
    expect(describeUserStatus(expired(), NOW).key).toBe('subscriptionChips.expiredAgo');
  });

  it('заблокированный аккаунт важнее любого доступа', () => {
    const chip = describeUserStatus(
      expired({ status: 'blocked', grace_until: '2026-09-18T12:00:00Z' }),
      NOW,
    );
    expect(chip.key).toBe('statuses.blocked');
  });
});

describe('extraTariffsCount', () => {
  const withSubs = (count: number) =>
    ({
      subscriptions: Array.from({ length: count }, (_, index) => ({ id: index })),
    }) as unknown as UserListItem;

  it('считает тарифы сверх показанного в строке', () => {
    expect(extraTariffsCount(withSubs(3))).toBe(2);
    expect(extraTariffsCount(withSubs(1))).toBe(0);
    expect(extraTariffsCount(withSubs(0))).toBe(0);
  });

  it('старый бот списка подписок не шлёт — пометки нет', () => {
    expect(extraTariffsCount({} as UserListItem)).toBe(0);
  });
});

describe('триал', () => {
  it('чип «Триал N дн.», когда ручка прислала сегмент trial — и для классического триала тоже', () => {
    // Бот присылает subscription_status как сегмент (триал лежит в базе со статусом active + is_trial),
    // иначе классический триал выглядел бы как «N дней» обычной подписки.
    const row = {
      status: 'active',
      has_subscription: true,
      subscription_status: 'trial',
      subscription_is_trial: true,
      days_remaining: 3,
    } as UserListItem;
    const chip = describeUserStatus(row, Date.parse('2026-09-18T12:00:00Z'));
    expect(chip.key).toBe('subscriptionChips.trial');
    expect(chip.count).toBe(3);
  });
});
