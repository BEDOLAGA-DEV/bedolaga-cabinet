// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PlatformProvider } from '@/platform/PlatformProvider';
import { ToastProvider } from '@/components/Toast';
import ruLocale from '@/locales/ru.json';

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

const featureDisabled = () =>
  Promise.reject({
    response: { status: 403, data: { detail: 'Platega recurrent disabled' } },
  });

let releaseRefresh: (() => void) | undefined;
let pendingRefresh: Promise<void> | undefined;

const calls = { sbp: [] as number[], lava: [] as number[], cashera: [] as number[] };
const state = { purchaseOptions: {} as Record<string, unknown>, used: 80 };
let client: QueryClient;

const subscription = (id: number) => ({
  id,
  status: 'active',
  is_trial: false,
  is_active: true,
  is_expired: false,
  tariff_id: 7,
  tariff_name: 'Базовый',
  end_date: '2026-10-07T00:00:00Z',
  days_left: 28,
  traffic_limit_gb: 100,
  traffic_used_gb: state.used,
  traffic_used_percent: state.used,
  device_limit: 3,
  servers: [],
  connected_squads: [],
  autopay_enabled: false,
});

vi.mock('@/api/subscription', () => ({
  subscriptionApi: {
    getSbpRecurring: (id: number) => {
      calls.sbp.push(id);
      return featureDisabled();
    },
    getLavaRecurring: (id: number) => {
      calls.lava.push(id);
      return featureDisabled();
    },
    getCasheraRecurring: (id: number) => {
      calls.cashera.push(id);
      return featureDisabled();
    },
    getSubscriptions: () =>
      Promise.resolve({
        subscriptions: [subscription(1), subscription(2)],
        multi_tariff_enabled: false,
      }),
    getSubscription: () =>
      Promise.resolve({ has_subscription: true, subscription: subscription(1) }),
    getPurchaseOptions: () => Promise.resolve(state.purchaseOptions),
    getRenewalOptions: () => Promise.resolve([]),
    getSubscriptionServers: () => Promise.resolve([]),
    getDevices: () => Promise.resolve({ devices: [] }),
    getConnectionLink: () => Promise.resolve({}),
    refreshTraffic: async () => {
      await pendingRefresh;
      return { traffic_used_gb: 80, traffic_used_percent: 80, is_unlimited: false };
    },
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
  pendingRefresh = undefined;
  releaseRefresh = undefined;
  localStorage.clear();
  state.used = 80;
  calls.sbp = [];
  calls.lava = [];
  calls.cashera = [];
  state.purchaseOptions = {
    sales_mode: 'tariffs',
    tariffs: [],
    balance_kopeks: 0,
    platega_recurrent_enabled: false,
    lava_recurrent_enabled: false,
    cashera_recurrent_enabled: false,
  };
});

afterEach(cleanup);

function wrap(children: React.ReactNode, path: string, route: string) {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <PlatformProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route path={route} element={children} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </PlatformProvider>
    </QueryClientProvider>,
  );
}

async function renderSubscription() {
  const Page = (await import('@/pages/Subscription')).default;
  wrap(<Page />, '/subscriptions/1', '/subscriptions/:subscriptionId');
  await screen.findAllByText(/Базовый/);
}

it('shows fresh subscription usage after renewal instead of the earlier refresh result', async () => {
  await renderSubscription();
  await screen.findByText(/80.*GB/);
  await act(async () => {
    state.used = 0;
    await client.invalidateQueries({ queryKey: ['subscription'] });
  });
  await waitFor(() => expect(screen.queryByText(/80.*GB/)).toBeNull());
  expect(await screen.findByText(/0.*GB/)).toBeTruthy();
});

it('does not overlay a late refresh response from before the renewal', async () => {
  pendingRefresh = new Promise<void>((resolve) => {
    releaseRefresh = resolve;
  });
  await renderSubscription();
  await screen.findByText(/80.*GB/);
  await act(async () => {
    state.used = 0;
    await client.invalidateQueries({ queryKey: ['subscription'] });
  });
  await waitFor(() => expect(screen.queryByText(/80.*GB/)).toBeNull());
  await act(async () => {
    releaseRefresh?.();
  });
  await waitFor(() => expect(screen.queryByText(/80.*GB/)).toBeNull());
});
