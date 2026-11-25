// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { liveCopiesOf } from './purchase/TariffCopyChoiceSheet';
import type { SubscriptionListItem } from '@/types';

vi.mock('react-i18next', async () =>
  (await import('@/components/admin/reachability/testUtils')).i18nMock(),
);

import { TariffChoicePrompt } from './TariffChoicePrompt';

afterEach(cleanup);

describe('TariffChoicePrompt', () => {
  it('предлагает каждую живую подписку тарифа и отдельную копию', () => {
    const onAnswer = vi.fn();
    render(
      <TariffChoicePrompt
        subscriptions={[
          { id: 5, end_date: '2026-12-31T00:00:00+00:00' },
          { id: 7, end_date: '2027-01-03T09:05:00+00:00' },
        ]}
        onAnswer={onAnswer}
      />,
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
    fireEvent.click(buttons[0]);
    fireEvent.click(buttons[2]);
    expect(onAnswer).toHaveBeenNthCalledWith(1, { target_subscription_id: 5 });
    expect(onAnswer).toHaveBeenNthCalledWith(2, { as_copy: true });
  });

  it('пока идёт запрос, ответить нельзя', () => {
    render(
      <TariffChoicePrompt
        subscriptions={[{ id: 5, end_date: '2026-12-31T00:00:00+00:00' }]}
        busy
        onAnswer={vi.fn()}
      />,
    );
    for (const button of screen.getAllByRole('button'))
      expect(button).toHaveProperty('disabled', true);
  });
});

describe('liveCopiesOf', () => {
  const row = (over: Partial<SubscriptionListItem>) =>
    ({ id: 1, tariff_id: 3, status: 'active', is_trial: false, ...over }) as SubscriptionListItem;

  it('берёт только живые платные подписки этого тарифа', () => {
    const subscriptions = [
      row({ id: 1 }),
      row({ id: 2, status: 'limited' }),
      row({ id: 3, status: 'expired' }),
      row({ id: 4, is_trial: true, status: 'trial' }),
      row({ id: 5, tariff_id: 9 }),
    ];
    expect(liveCopiesOf(3, subscriptions).map((subscription) => subscription.id)).toEqual([1, 2]);
  });

  it('без списка подписок — пусто', () => {
    expect(liveCopiesOf(3, undefined)).toEqual([]);
  });
});
