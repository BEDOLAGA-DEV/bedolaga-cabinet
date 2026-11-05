// @vitest-environment jsdom
import { AxiosError } from 'axios';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

const state = { requiresTariff: false, status: 'expired', paused: false };
const togglePause = vi.fn().mockResolvedValue({ success: true });

vi.mock('@/api/subscription', () => ({
  subscriptionApi: {
    getRenewalOptions: () => Promise.resolve([]),
    getSubscription: () =>
      Promise.resolve({
        subscription: {
          id: 42,
          tariff_name: null,
          requires_tariff_selection: false,
          is_daily: true,
          is_trial: false,
          status: state.status,
          is_daily_paused: state.paused,
          daily_price_kopeks: 1000,
          end_date: '2026-01-01T00:00:00Z',
          days_left: 0,
        },
      }),
    getPurchaseOptions: () => Promise.resolve({ balance_kopeks: 0 }),
    renewSubscription: () => Promise.resolve({}),
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
  vi.clearAllMocks();
  state.paused = false;
  togglePause.mockResolvedValue({ success: true });
});

async function renderRenew() {
  const Renew = (await import('@/pages/RenewSubscription')).default;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <PlatformProvider>
        <MemoryRouter initialEntries={['/subscriptions/42/renew']}>
          <Routes>
            <Route path="/subscriptions/:subscriptionId/renew" element={<Renew />} />
            <Route path="/subscription/purchase" element={<div>витрина тарифов</div>} />
          </Routes>
        </MemoryRouter>
      </PlatformProvider>
    </QueryClientProvider>,
  );
}

describe('суточное продление', () => {
  it.each(['expired', 'disabled', 'limited'])(
    'offers resume for %s instead of empty periods',
    async (status) => {
      state.status = status;
      await renderRenew();
      const button = await screen.findByRole('button', { name: 'subscription.pause.resumeBtn' });
      expect(screen.queryByText('subscription.noRenewalOptions')).toBeNull();
      fireEvent.click(button);
      await waitFor(() => expect(togglePause).toHaveBeenCalledWith(42, false));
    },
  );
});

it('allows resuming a paused paid day', async () => {
  state.status = 'active';
  state.paused = true;
  await renderRenew();
  fireEvent.click(await screen.findByRole('button', { name: 'subscription.pause.resumeBtn' }));
  await waitFor(() => expect(togglePause).toHaveBeenCalledWith(42, false));
});
it('shows a balance top-up action when resume needs more money', async () => {
  state.status = 'expired';
  togglePause.mockRejectedValueOnce(
    Object.assign(new AxiosError('Insufficient balance'), {
      response: {
        status: 402,
        data: { detail: { code: 'insufficient_balance', required: 1000, balance: 0 } },
      },
    }),
  );
  await renderRenew();
  fireEvent.click(await screen.findByRole('button', { name: 'subscription.pause.resumeBtn' }));
  expect(await screen.findByText(/subscription.pause.insufficientBalance/)).toBeTruthy();
});
