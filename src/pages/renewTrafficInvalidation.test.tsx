// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, expect, it, vi } from 'vitest';
import { resetSafeStorage } from '@/utils/safeStorage';
import { PlatformProvider } from '@/platform/PlatformProvider';

/**
 * Суточная подписка возобновляется без выбора периода. Проверяем явный
 * запрос resume для выбранной подписки и подсказку при недостатке баланса.
 */

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ru', changeLanguage: () => Promise.resolve() },
  }),
  Trans: ({ children }: { children?: unknown }) => children ?? null,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const state = {
  requiresTariff: false,
  status: 'expired',
  paused: false,
  split: false,
  price: 1000,
};
const renew = vi.fn().mockResolvedValue({});
const togglePause = vi.fn().mockResolvedValue({ success: true });

vi.mock('@/api/subscription', () => ({
  subscriptionApi: {
    getRenewalOptions: () => Promise.resolve([{ period_days: 30, price_kopeks: state.price }]),
    getSubscription: () =>
      Promise.resolve({
        subscription: {
          id: 42,
          traffic_accounting_mode: state.split ? 'split' : 'legacy',
          tariff_name: null,
          requires_tariff_selection: false,
          is_daily: false,
          is_trial: false,
          status: state.status,
          is_daily_paused: state.paused,
          daily_price_kopeks: 1000,
          end_date: '2026-01-01T00:00:00Z',
          days_left: 0,
        },
      }),
    getPurchaseOptions: () => Promise.resolve({ balance_kopeks: 10000 }),
    renewSubscription: (...args: unknown[]) => renew(...args),
    togglePause: (...args: unknown[]) => togglePause(...args),
  },
}));

vi.mock('@/api/currency', () => ({
  currencyApi: { getExchangeRates: () => Promise.resolve({ USD: 100, CNY: 14, IRR: 0.0024 }) },
}));

if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

afterEach(() => {
  cleanup();
  resetSafeStorage();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  state.paused = false;
  state.split = false;
  state.price = 1000;
  sessionStorage.clear();
  renew.mockReset().mockResolvedValue({});
  togglePause.mockResolvedValue({ success: true });
});

let client: QueryClient;
async function renderRenew() {
  const Renew = (await import('@/pages/RenewSubscription')).default;
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(['subscription'], { subscription: { traffic_used_gb: 80 } });
  render(
    <QueryClientProvider client={client}>
      <PlatformProvider>
        <MemoryRouter initialEntries={['/subscriptions/42/renew']}>
          <Routes>
            <Route path="/subscriptions/:subscriptionId/renew" element={<Renew />} />
            <Route path="/subscriptions/:subscriptionId" element={<div>renewed</div>} />
            <Route path="/subscription/purchase" element={<div>витрина тарифов</div>} />
          </Routes>
        </MemoryRouter>
      </PlatformProvider>
    </QueryClientProvider>,
  );
}

it('invalidates the dashboard subscription as well as the renewed detail', async () => {
  await renderRenew();
  fireEvent.click(await screen.findByRole('button', { name: /30 subscription.days/ }));
  fireEvent.click(await screen.findByRole('button', { name: 'subscription.extend' }));
  await screen.findByText('renewed');
  expect(client.getQueryState(['subscription'])?.isInvalidated).toBe(true);
});

it('keeps confirmed split price and operation across uncertain retries', async () => {
  state.split = true;
  renew.mockRejectedValueOnce({ isAxiosError: true, response: { status: 503 } });
  await renderRenew();
  fireEvent.click(await screen.findByRole('button', { name: /30 subscription.days/ }));
  fireEvent.click(await screen.findByRole('button', { name: 'subscription.extend' }));
  await screen.findByText('subscription.purchaseOutcomeUnknown');
  const first = renew.mock.calls[0];
  expect(first[3]).toBe(1000);
  state.price = 2000;
  await client.invalidateQueries({ queryKey: ['renewal-options'] });
  fireEvent.click(await screen.findByRole('button', { name: 'subscription.splitPurchase.check' }));
  await screen.findByText('renewed');
  expect(renew.mock.calls[1]).toEqual(first);
});
it('shows paid pending renewal without a second payment button', async () => {
  state.split = true;
  renew.mockResolvedValue({ delivery_pending: true });
  await renderRenew();
  fireEvent.click(await screen.findByRole('button', { name: /30 subscription.days/ }));
  fireEvent.click(await screen.findByRole('button', { name: 'subscription.extend' }));
  await screen.findByText('subscription.splitRenewalPending');
  expect(screen.queryByRole('button', { name: 'subscription.extend' })).toBeNull();
  expect(JSON.parse(sessionStorage.getItem('split-renewal:42') ?? 'null').operation).toBe(
    renew.mock.calls[0][2],
  );
  expect(screen.getByRole('button', { name: 'subscription.splitPurchase.check' })).toBeTruthy();
});
it('retains split confirmation for a saved-cart 402 top-up retry', async () => {
  state.split = true;
  renew.mockRejectedValueOnce({
    isAxiosError: true,
    response: {
      status: 402,
      data: { detail: { code: 'insufficient_funds', missing_amount: 500 } },
    },
  });
  await renderRenew();
  fireEvent.click(await screen.findByRole('button', { name: /30 subscription.days/ }));
  fireEvent.click(await screen.findByRole('button', { name: 'subscription.extend' }));
  await screen.findByRole('button', { name: 'balance.topUp' });
  const stored = JSON.parse(sessionStorage.getItem('split-renewal:42') ?? 'null');
  expect(stored.price).toBe(1000);
  expect(stored.operation).toBe(renew.mock.calls[0][2]);
});

it('checks the same paid receipt after remount instead of starting another renewal', async () => {
  state.split = true;
  renew.mockResolvedValueOnce({ delivery_pending: true });
  await renderRenew();
  fireEvent.click(await screen.findByRole('button', { name: /30 subscription.days/ }));
  fireEvent.click(await screen.findByRole('button', { name: 'subscription.extend' }));
  await screen.findByText('subscription.splitRenewalPending');
  const first = renew.mock.calls[0];
  cleanup();
  await renderRenew();
  await screen.findByText('subscription.splitRenewalPending');
  fireEvent.click(await screen.findByRole('button', { name: 'subscription.splitPurchase.check' }));
  await screen.findByText('renewed');
  expect(renew.mock.calls[1]).toEqual(first);
  expect(sessionStorage.getItem('split-renewal:42')).toBeNull();
});

it('does not submit renewal when the browser cannot persist its confirmation', async () => {
  state.split = true;
  await renderRenew();
  fireEvent.click(await screen.findByRole('button', { name: /30 subscription.days/ }));
  const denied = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Blocked', 'SecurityError');
  });
  fireEvent.click(await screen.findByRole('button', { name: 'subscription.extend' }));
  await screen.findByText('subscription.splitPurchase.storageUnavailable');
  expect(renew).not.toHaveBeenCalled();
  denied.mockRestore();
});
