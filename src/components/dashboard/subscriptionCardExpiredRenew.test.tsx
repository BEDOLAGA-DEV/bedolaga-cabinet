// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlatformProvider } from '@/platform/PlatformProvider';
import type { Subscription } from '@/types';

/**
 * Кнопка «Продлить» на карточке истёкшей подписки.
 *
 * Раньше она сама списывала с баланса ровно 30 дней: период за клиента выбирал
 * кабинет, мимо скидок за длинные периоды, а у тарифа, который месяцем вообще не
 * продаётся, сервер отвечал «период недоступен» — кнопка выглядела сломанной.
 *
 * Здесь держится разделение: где выбирать нечего (суточный тариф, приостановка)
 * — списываем сразу; обычной подписке открываем выбор периода её тарифа.
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
  togglePause: [] as unknown[][],
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
    togglePause: (...args: unknown[]) => {
      calls.togglePause.push(args);
      return Promise.resolve({});
    },
  },
}));

vi.mock('@/api/currency', () => ({
  currencyApi: { getExchangeRates: () => Promise.resolve({ USD: 100, CNY: 14, IRR: 0.0024 }) },
}));

const subscription = (overrides: Partial<Subscription> = {}): Subscription => ({
  id: 42,
  status: 'expired',
  is_trial: false,
  start_date: '2026-08-07T00:00:00Z',
  end_date: '2026-09-07T00:00:00Z',
  days_left: 0,
  hours_left: 0,
  minutes_left: 0,
  time_left_display: '',
  traffic_limit_gb: 100,
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
  tariff_id: 7,
  ...overrides,
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
  calls.togglePause = [];
});

async function renderCard(sub: Subscription, balanceKopeks: number) {
  const Card = (await import('./SubscriptionCardExpired')).default;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <PlatformProvider>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<Card subscription={sub} balanceKopeks={balanceKopeks} />} />
            <Route path="/subscriptions/:id/renew" element={<div>экран выбора периода</div>} />
          </Routes>
        </MemoryRouter>
      </PlatformProvider>
    </QueryClientProvider>,
  );
}

describe('обычная истёкшая подписка', () => {
  it('открывает выбор периода вместо молчаливого списания за месяц', async () => {
    await renderCard(subscription(), 500000);

    const renew = await screen.findByText('dashboard.expired.quickRenew');
    fireEvent.click(renew);

    expect(await screen.findByText('экран выбора периода')).toBeTruthy();
    expect(calls.renew).toEqual([]);
    expect(calls.purchaseTariff).toEqual([]);
  });

  it('ведёт на выбор периода и без денег на балансе — цены надо сначала увидеть', async () => {
    await renderCard(subscription(), 0);

    const renew = await screen.findByText('dashboard.expired.quickRenew');
    fireEvent.click(renew);

    expect(await screen.findByText('экран выбора периода')).toBeTruthy();
  });
});

describe('суточный тариф', () => {
  it('покупает ровно один день: выбирать там нечего', async () => {
    await renderCard(subscription({ is_daily: true, daily_price_kopeks: 2000 }), 500000);

    fireEvent.click(await screen.findByText('dashboard.expired.quickRenew'));

    await waitFor(() => {
      expect(calls.purchaseTariff).toEqual([[7, 1, undefined, 42]]);
    });
    expect(calls.renew).toEqual([]);
  });

  it('приостановленный — возобновляется, а не продлевается', async () => {
    await renderCard(
      subscription({ is_daily: true, status: 'disabled', daily_price_kopeks: 2000 }),
      500000,
    );

    fireEvent.click(await screen.findByText('dashboard.suspended.resume'));

    await waitFor(() => {
      expect(calls.togglePause).toEqual([[42]]);
    });
    expect(calls.renew).toEqual([]);
  });

  it('без денег на суточный день предлагает пополнить баланс', async () => {
    await renderCard(subscription({ is_daily: true, daily_price_kopeks: 2000 }), 0);

    expect(await screen.findByText('dashboard.expired.topUp')).toBeTruthy();
    expect(screen.queryByText('dashboard.expired.quickRenew')).toBeNull();
  });
});
