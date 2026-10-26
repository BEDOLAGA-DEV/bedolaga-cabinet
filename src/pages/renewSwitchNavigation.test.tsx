// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useSearchParams } from 'react-router';
import { afterEach, expect, it, vi } from 'vitest';
import { PlatformProvider } from '@/platform/PlatformProvider';
import RenewSubscription from './RenewSubscription';

const state = vi.hoisted(() => ({ limited: false }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'ru' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
vi.mock('../hooks/useCurrency', () => ({
  useCurrency: () => ({ formatAmount: String, currencySymbol: 'RUB' }),
}));
vi.mock('../hooks/useTheme', () => ({ useTheme: () => ({ isDark: true }) }));
vi.mock('../api/subscription', () => ({
  subscriptionApi: {
    getSubscription: async (id: number) => ({
      subscription: {
        id,
        tariff_id: 1,
        tariff_name: 'Current',
        is_active: !state.limited,
        is_limited: state.limited,
        is_trial: false,
        is_daily: false,
      },
    }),
    getRenewalOptions: async () => [
      { period_days: 30, price_kopeks: 1000, price_rubles: 10, discount_percent: 0 },
    ],
    getPurchaseOptions: async () => ({ balance_kopeks: 10000 }),
  },
}));

afterEach(cleanup);
function Catalog() {
  const [params] = useSearchParams();
  return <output>Catalog for {params.get('subscriptionId')}</output>;
}
it.each([
  { id: 11, limited: false },
  { id: 12, limited: false },
  { id: 11, limited: true },
])('renewal keeps only renewal actions for $id (limited=$limited)', async ({ id, limited }) => {
  state.limited = limited;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <PlatformProvider>
        <MemoryRouter initialEntries={[`/subscriptions/${id}/renew`]}>
          <Routes>
            <Route path="/subscriptions/:subscriptionId/renew" element={<RenewSubscription />} />
            <Route path="/subscription/purchase" element={<Catalog />} />
          </Routes>
        </MemoryRouter>
      </PlatformProvider>
    </QueryClientProvider>,
  );
  await screen.findByRole('heading', { name: 'subscription.extend' });
  expect(screen.queryByRole('link', { name: 'subscription.switchTariff.title' })).toBeNull();
  client.clear();
});
