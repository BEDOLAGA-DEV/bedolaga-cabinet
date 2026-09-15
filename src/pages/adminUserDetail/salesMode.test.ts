import { describe, expect, it } from 'vitest';
import type { UserSubscriptionInfo } from '@/api/adminUsers';
import { isLiveSubscription, salesModeOf } from './salesMode';

const sub = (extra: Partial<UserSubscriptionInfo> = {}) =>
  ({ id: 1, status: 'active', is_active: true, ...extra }) as UserSubscriptionInfo;

describe('salesModeOf', () => {
  it('классика — даже если флаг мультитарифа включён', () => {
    expect(
      salesModeOf({ sales_mode: 'classic', multi_tariff_enabled: true, subscriptions: [] }),
    ).toBe('classic');
  });
  it('мультитариф по флагу бота — и с одной подпиской', () => {
    expect(
      salesModeOf({ sales_mode: 'tariffs', multi_tariff_enabled: true, subscriptions: [sub()] }),
    ).toBe('multi');
  });
  it('тарифы с одной подпиской', () => {
    expect(
      salesModeOf({ sales_mode: 'tariffs', multi_tariff_enabled: false, subscriptions: [sub()] }),
    ).toBe('tariffs');
  });
  it('старый бот без полей: мультитариф угадывается по числу подписок', () => {
    expect(salesModeOf({ subscriptions: [sub(), sub({ id: 2 })] })).toBe('multi');
    expect(salesModeOf({ subscriptions: [sub()] })).toBe('tariffs');
  });
});

describe('isLiveSubscription', () => {
  it('активная, пробная и упёршаяся в трафик — живые; истёкшая — нет', () => {
    expect(isLiveSubscription(sub())).toBe(true);
    expect(isLiveSubscription(sub({ status: 'trial', is_active: false }))).toBe(true);
    expect(isLiveSubscription(sub({ status: 'limited', is_active: false }))).toBe(true);
    expect(isLiveSubscription(sub({ status: 'expired', is_active: false }))).toBe(false);
  });
});
