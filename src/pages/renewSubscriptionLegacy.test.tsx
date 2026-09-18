// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlatformProvider } from '@/platform/PlatformProvider';

/**
 * Страница продления, открытая для старой подписки (например, по старой
 * ссылке или диплинку renew_N). Продлевать там нечего: бот отдаёт пустой
 * список периодов. Вместо «Нет доступных вариантов продления» страница сама
 * уводит на витрину тарифов с этой подпиской.
 */

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ru', changeLanguage: () => Promise.resolve() },
  }),
  Trans: ({ children }: { children?: unknown }) => children ?? null,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const state = { requiresTariff: true };

vi.mock('@/api/subscription', () => ({
  subscriptionApi: {
    getRenewalOptions: () => Promise.resolve([]),
    getSubscription: () =>
      Promise.resolve({
        subscription: {
          id: 42,
          tariff_name: null,
          requires_tariff_selection: state.requiresTariff,
        },
      }),
    getPurchaseOptions: () => Promise.resolve({ balance_kopeks: 0 }),
    renewSubscription: () => Promise.resolve({}),
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
  state.requiresTariff = true;
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

describe('продление старой подписки', () => {
  it('уводит на витрину тарифов вместо пустого списка периодов', async () => {
    await renderRenew();

    expect(await screen.findByText('витрина тарифов')).toBeTruthy();
    expect(screen.queryByText('subscription.noRenewalOptions')).toBeNull();
  });

  it('обычной подписке без вариантов по-прежнему честно говорит, что их нет', async () => {
    state.requiresTariff = false;
    await renderRenew();

    expect(await screen.findByText('subscription.noRenewalOptions')).toBeTruthy();
    expect(screen.queryByText('витрина тарифов')).toBeNull();
  });
});
