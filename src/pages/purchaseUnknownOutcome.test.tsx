// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, expect, it, vi } from 'vitest';
import { AxiosError, CanceledError } from 'axios';
import { PlatformProvider } from '@/platform/PlatformProvider';
import RenewSubscription from './RenewSubscription';
import { TrafficTopupSheet } from '@/components/subscription/sheets/TrafficTopupSheet';
import type { PurchaseOptions, Subscription } from '@/types';

const state = vi.hoisted(() => ({ error: null as unknown, commits: 0 }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'ru' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
vi.mock('@/hooks/useCurrency', () => ({
  useCurrency: () => ({ formatAmount: String, currencySymbol: '¤' }),
}));
vi.mock('@/hooks/useTheme', () => ({ useTheme: () => ({ isDark: true }) }));
vi.mock('@/api/subscription', () => ({
  subscriptionApi: {
    getSubscription: async () => ({
      subscription: { id: 7, tariff_id: 1, tariff_name: 'Paid', is_trial: false },
    }),
    getRenewalOptions: async () => [{ period_days: 30, price_kopeks: 10000, is_highlighted: true }],
    getPurchaseOptions: async () => ({ balance_kopeks: 50000 }),
    getTrafficPackages: async () => [{ gb: 10, price_kopeks: 10000 }],
    renewSubscription: async () => {
      state.commits++;
      throw state.error;
    },
    purchaseTraffic: async () => {
      state.commits++;
      throw state.error;
    },
  },
}));
afterEach(() => {
  cleanup();
  state.commits = 0;
});
function mount(kind: string) {
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: 2, retryDelay: 0 } },
        })
      }
    >
      <PlatformProvider>
        <MemoryRouter initialEntries={['/subscriptions/7/renew']}>
          <Routes>
            <Route
              path="/subscriptions/:subscriptionId/renew"
              element={
                kind === 'renew' ? (
                  <RenewSubscription />
                ) : (
                  <TrafficTopupSheet
                    open
                    onOpen={() => {}}
                    onClose={() => {}}
                    subscription={{ id: 7 } as Subscription}
                    subscriptionId={7}
                    selectedTrafficPackage={10}
                    onSelectedTrafficPackageChange={() => {}}
                    purchaseOptions={{ balance_kopeks: 50000 } as PurchaseOptions}
                    isDark
                  />
                )
              }
            />
          </Routes>
        </MemoryRouter>
      </PlatformProvider>
    </QueryClientProvider>,
  );
}
for (const kind of ['renew', 'traffic']) {
  it.each(['network', 'cancel', 502, 503, 504])(
    `${kind}: committed operation with lost response stays uncertain and sends once (%s)`,
    async (failure) => {
      state.error =
        failure === 'cancel'
          ? new CanceledError()
          : Object.assign(new AxiosError('Network Error'), {
              response: typeof failure === 'number' ? { status: failure, data: {} } : undefined,
            });
      mount(kind);
      const label =
        kind === 'renew' ? 'subscription.extend' : 'subscription.additionalOptions.buyTrafficGb';
      fireEvent.click(await screen.findByRole('button', { name: label }));
      await screen.findByText('subscription.purchaseOutcomeUnknown');
      expect(state.commits).toBe(1);
    },
  );
  it(`${kind}: preserves a definite validation rejection`, async () => {
    state.error = Object.assign(new AxiosError('Bad Request'), {
      response: { status: 400, data: { detail: 'Validation rejected' } },
    });
    mount(kind);
    fireEvent.click(
      await screen.findByRole('button', {
        name:
          kind === 'renew' ? 'subscription.extend' : 'subscription.additionalOptions.buyTrafficGb',
      }),
    );
    await screen.findByText('Validation rejected');
    expect(screen.queryByText('subscription.purchaseOutcomeUnknown')).toBeNull();
    expect(state.commits).toBe(1);
  });
}
