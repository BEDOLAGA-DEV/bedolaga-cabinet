// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { afterEach, expect, it, vi } from 'vitest';
import { SwitchTariffSheet } from './SwitchTariffSheet';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
vi.mock('../../../hooks/useCurrency', () => ({
  useCurrency: () => ({ formatAmount: (value: number) => String(value), currencySymbol: '₽' }),
}));
vi.mock('../../../hooks/usePromoDiscount', () => ({
  usePromoDiscount: () => ({ applyPromoDiscount: (value: number) => value }),
}));
vi.mock('../../../api/subscription', () => ({
  subscriptionApi: {
    previewTariffSwitch: (_tariff: number, subscription: number) =>
      Promise.resolve({
        can_switch: true,
        current_tariff_id: subscription,
        current_tariff_name: `Source ${subscription}`,
        new_tariff_id: 9,
        new_tariff_name: 'Target',
        remaining_days: subscription,
        upgrade_cost_kopeks: subscription * 100,
        upgrade_cost_label: '',
        balance_kopeks: 100000,
        balance_label: '',
        has_enough_balance: true,
        missing_amount_kopeks: 0,
        missing_amount_label: '',
        is_upgrade: true,
      }),
  },
}));

HTMLElement.prototype.scrollIntoView = () => {};
afterEach(cleanup);

it('recalculates the same target tariff when the selected source subscription changes', async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  const sheet = (subscriptionId: number) => (
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <SwitchTariffSheet
          open
          tariffId={9}
          subscriptionId={subscriptionId}
          tariffs={[]}
          onClose={() => {}}
          onExpiredFallback={() => {}}
        />
      </MemoryRouter>
    </QueryClientProvider>
  );
  const { rerender } = render(sheet(11));
  expect(await screen.findByText('Source 11')).toBeTruthy();
  rerender(sheet(22));
  expect(await screen.findByText('Source 22')).toBeTruthy();
  expect(screen.queryByText('Source 11')).toBeNull();
  expect(screen.getByText(/^22\s₽$/)).toBeTruthy();
  rerender(sheet(11));
  expect(await screen.findByText('Source 11')).toBeTruthy();
  expect(screen.queryByText('Source 22')).toBeNull();
  client.clear();
});
