// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { afterEach, expect, it, vi } from 'vitest';
import { PlatformProvider } from '@/platform/PlatformProvider';
import Balance from './Balance';

const state = vi.hoisted(() => ({ end: 'old-date', refreshUser: async () => {} }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'ru' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
vi.mock('../store/auth', () => ({
  useAuthStore: (selector: (s: typeof state) => unknown) => selector(state),
}));
vi.mock('../hooks/useCurrency', () => ({
  useCurrency: () => ({ formatAmount: String, currencySymbol: 'RUB' }),
}));
vi.mock('../hooks/useTheme', () => ({ useTheme: () => ({ isDark: true }) }));
vi.mock('../api/balance', () => ({
  balanceApi: {
    getBalance: async () => ({ balance_kopeks: 0, balance_rubles: 0 }),
    getTransactions: async () => ({ items: [], total: 0, page: 1, per_page: 20, pages: 0 }),
    getPaymentMethods: async () => [],
    getSavedCards: async () => ({ cards: [], recurrent_enabled: false }),
    activatePromocode: async () => {
      state.end = 'granted-date';
      return {
        success: true,
        balance_before: 0,
        balance_after: 0,
        bonus_description: 'Three free days',
      };
    },
  },
}));

afterEach(cleanup);

function SubscriptionConsumer() {
  const { data } = useQuery({
    queryKey: ['subscription', 10],
    queryFn: async () => state.end,
    staleTime: Infinity,
  });
  return <output>{data}</output>;
}

it('refreshes an already cached subscription after granting promo days', async () => {
  state.end = 'old-date';
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(['subscription', 10], 'old-date');
  render(
    <QueryClientProvider client={client}>
      <PlatformProvider>
        <MemoryRouter>
          <Balance />
          <SubscriptionConsumer />
        </MemoryRouter>
      </PlatformProvider>
    </QueryClientProvider>,
  );
  expect(await screen.findByText('old-date')).toBeTruthy();
  fireEvent.change(screen.getByPlaceholderText('balance.promocode.placeholder'), {
    target: { value: 'FREE3' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'balance.promocode.activate' }));
  expect(await screen.findByText('Three free days')).toBeTruthy();
  expect(await screen.findByText('granted-date')).toBeTruthy();
  client.clear();
});
