// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlatformProvider } from '@/platform/PlatformProvider';
import type { Subscription } from '@/types';

/**
 * Карточка истёкшей СТАРОЙ подписки на главной.
 *
 * Старая подписка куплена в классике, тарифа у неё нет, оператор уже на
 * тарифах. «Продлить» вела на пустой выбор периода. Теперь кнопка одна —
 * «Перейти на тариф» — и ведёт на витрину тарифов с этой подпиской:
 * выбранный тариф надевается на неё же, ссылка у человека не меняется.
 */

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ru', changeLanguage: () => Promise.resolve() },
  }),
  Trans: ({ children }: { children?: unknown }) => children ?? null,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const calls = {
  renew: [] as unknown[][],
  purchaseTariff: [] as unknown[][],
};

vi.mock('@/api/subscription', () => ({
  subscriptionApi: {
    renewSubscription: (...args: unknown[]) => {
      calls.renew.push(args);
      return Promise.resolve({});
    },
    purchaseTariff: (...args: unknown[]) => {
      calls.purchaseTariff.push(args);
      return Promise.resolve({});
    },
    togglePause: () => Promise.resolve({}),
  },
}));

vi.mock('@/api/currency', () => ({
  currencyApi: { getExchangeRates: () => Promise.resolve({ USD: 100, CNY: 14, IRR: 0.0024 }) },
}));

const legacyExpired = (): Subscription => ({
  id: 42,
  status: 'expired',
  is_trial: false,
  start_date: '2026-08-07T00:00:00Z',
  end_date: '2026-09-07T00:00:00Z',
  days_left: 0,
  hours_left: 0,
  minutes_left: 0,
  time_left_display: '',
  traffic_limit_gb: 0,
  traffic_used_gb: 0,
  traffic_used_percent: 0,
  device_limit: 3,
  connected_squads: [],
  servers: [],
  autopay_enabled: false,
  autopay_days_before: 3,
  subscription_url: null,
  hide_subscription_link: false,
  is_active: false,
  is_expired: true,
  is_limited: false,
  requires_tariff_selection: true,
});

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
  calls.renew = [];
  calls.purchaseTariff = [];
});

async function renderCard(sub: Subscription) {
  const Card = (await import('./SubscriptionCardExpired')).default;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <PlatformProvider>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<Card subscription={sub} balanceKopeks={500000} />} />
            <Route path="/subscriptions/:id/renew" element={<div>экран выбора периода</div>} />
            <Route path="/subscription/purchase" element={<div>витрина тарифов</div>} />
          </Routes>
        </MemoryRouter>
      </PlatformProvider>
    </QueryClientProvider>,
  );
}

describe('истёкшая старая подписка', () => {
  it('предлагает перейти на тариф, а не продлить', async () => {
    await renderCard(legacyExpired());

    const move = await screen.findByText('subscription.cta.moveToTariff');
    expect(screen.queryByText('dashboard.expired.quickRenew')).toBeNull();
    expect(move.closest('a')?.getAttribute('href')).toBe(
      '/subscription/purchase?subscriptionId=42',
    );

    fireEvent.click(move);

    expect(await screen.findByText('витрина тарифов')).toBeTruthy();
    expect(calls.renew).toEqual([]);
    expect(calls.purchaseTariff).toEqual([]);
  });

  it('не дублирует переход второй ссылкой на витрину', async () => {
    await renderCard(legacyExpired());

    await screen.findByText('subscription.cta.moveToTariff');
    const links = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(links.filter((h) => h?.startsWith('/subscription/purchase'))).toHaveLength(1);
  });
});
