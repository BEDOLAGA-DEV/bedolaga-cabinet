// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlatformProvider } from '@/platform/PlatformProvider';
import { ToastProvider } from '@/components/Toast';
import ruLocale from '@/locales/ru.json';

/**
 * Расход по премиум-серверам на странице подписки.
 *
 * На главной строки премиума стояли под общим трафиком с самого начала, а на
 * странице подписки их не было: человек видел только общий расход и не
 * понимал, почему пропал «Мобильный резерв».
 */

function ru(key: string): string {
  const value = key
    .split('.')
    .reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], ruLocale);
  if (typeof value !== 'string') throw new Error(`нет строки ${key}`);
  return value;
}

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: unknown, options?: Record<string, unknown>) => {
      const opts = typeof fallback === 'object' && fallback !== null ? fallback : options;
      let template: string;
      try {
        template = ru(key);
      } catch {
        template = typeof fallback === 'string' ? fallback : key;
      }
      return template.replace(/{{(\w+)}}/g, (_m, name) => String((opts as never)?.[name] ?? ''));
    },
    i18n: { language: 'ru', changeLanguage: () => Promise.resolve() },
  }),
  Trans: ({ children }: { children?: unknown }) => children ?? null,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const state = { premium: [] as unknown[] };

const subscription = () => ({
  id: 1,
  status: 'active',
  is_trial: false,
  is_active: true,
  is_expired: false,
  tariff_id: 7,
  tariff_name: 'MAX',
  end_date: '2026-10-07T00:00:00Z',
  days_left: 28,
  traffic_limit_gb: 1500,
  traffic_used_gb: 27.8,
  device_limit: 6,
  servers: [],
  connected_squads: [],
  autopay_enabled: false,
  premium_traffic: state.premium,
});

vi.mock('@/api/subscription', () => ({
  subscriptionApi: {
    getSubscriptions: () =>
      Promise.resolve({ subscriptions: [subscription()], multi_tariff_enabled: false }),
    getSubscription: () =>
      Promise.resolve({ has_subscription: true, subscription: subscription() }),
    getPurchaseOptions: () =>
      Promise.resolve({
        sales_mode: 'tariffs',
        tariffs: [],
        balance_kopeks: 0,
        platega_recurrent_enabled: false,
        lava_recurrent_enabled: false,
      }),
    getRenewalOptions: () => Promise.resolve([]),
    getSubscriptionServers: () => Promise.resolve([]),
    getDevices: () => Promise.resolve({ devices: [] }),
    getPremiumTrafficOptions: () => Promise.resolve([]),
  },
}));

vi.mock('@/api/balance', () => ({
  balanceApi: { getSavedCards: () => Promise.resolve([]) },
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

beforeEach(() => {
  state.premium = [];
});

afterEach(cleanup);

async function renderSubscription() {
  const Page = (await import('@/pages/Subscription')).default;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <PlatformProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={['/subscriptions/1']}>
            <Routes>
              <Route path="/subscriptions/:subscriptionId" element={<Page />} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </PlatformProvider>
    </QueryClientProvider>,
  );
  await screen.findAllByText(/MAX/);
}

describe('страница подписки: премиум-трафик', () => {
  it('показывает расход по каждому премиум-серверу под общим трафиком', async () => {
    state.premium = [
      {
        squad_uuid: 'c0b8db48-31dc-423b-9778-e6682fbd6d06',
        name: 'Мобильный LTE резерв #1',
        limit_gb: 15,
        extra_gb: 0,
        used_gb: 3,
        used_percent: 20,
        is_limited: false,
        topup_available: false,
      },
      {
        squad_uuid: 'e4f819ca-2cfd-4425-9354-16a262b180c1',
        name: 'Мобильный LTE резерв #2',
        limit_gb: 15,
        extra_gb: 0,
        used_gb: 0,
        used_percent: 0,
        is_limited: false,
        topup_available: false,
      },
    ];
    await renderSubscription();

    expect(await screen.findByText('Мобильный LTE резерв #1')).toBeTruthy();
    expect(screen.getByText('Мобильный LTE резерв #2')).toBeTruthy();
  });

  it('без премиум-серверов в тарифе строк нет', async () => {
    await renderSubscription();

    expect(screen.queryByText(/Мобильный LTE резерв/)).toBeNull();
  });
});
