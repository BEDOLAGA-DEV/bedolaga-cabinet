// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Бонус кампании «Скидка»: после входа по ссылке человек видит процент. Если
 * скидку не выдали (у него уже была не меньше), бот присылает пустой процент —
 * тогда молчим, а не показываем «скидка 0%».
 */
const mocks = vi.hoisted(() => ({
  showToast: vi.fn(),
  clearBonus: vi.fn(),
  bonus: null as unknown,
  t: (key: string, params?: Record<string, unknown>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: mocks.t }) }));
vi.mock('./Toast', () => ({ useToast: () => ({ showToast: mocks.showToast }) }));
vi.mock('../store/auth', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector({ pendingCampaignBonus: mocks.bonus, clearCampaignBonus: mocks.clearBonus }),
}));

import CampaignBonusNotifier from './CampaignBonusNotifier';

const discountBonus = {
  campaign_name: 'curly',
  bonus_type: 'discount',
  balance_kopeks: 0,
  subscription_days: null,
  tariff_name: null,
  discount_percent: 15,
};

describe('уведомление о бонусе кампании', () => {
  beforeEach(() => {
    mocks.showToast.mockClear();
    mocks.clearBonus.mockClear();
  });

  it('скидка показывается процентом и названием кампании', () => {
    mocks.bonus = discountBonus;
    render(<CampaignBonusNotifier />);

    expect(mocks.showToast).toHaveBeenCalledOnce();
    expect(mocks.showToast.mock.calls[0][0].message).toBe(
      'campaignBonus.discount:{"percent":15,"name":"curly"}',
    );
    expect(mocks.clearBonus).toHaveBeenCalled();
  });

  it('скидку не выдали — тоста нет, бонус всё равно снимается', () => {
    mocks.bonus = { ...discountBonus, discount_percent: null };
    render(<CampaignBonusNotifier />);

    expect(mocks.showToast).not.toHaveBeenCalled();
    expect(mocks.clearBonus).toHaveBeenCalled();
  });
});
