// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/Toast';
import { PlatformProvider } from '@/platform/PlatformProvider';

/**
 * Витрина тарифов в простом виде обязана показывать ровно те же тарифы, что и
 * обычная: подача разная, данные одни. Плашка «Доступных опций нет» на экране
 * с тарифами означает, что список до неё не доехал.
 */

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key),
    i18n: { language: 'ru', changeLanguage: () => Promise.resolve() },
  }),
  Trans: ({ children }: { children?: unknown }) => children ?? null,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const getSubscription = vi.fn();
const getPurchaseOptions = vi.fn();
const getSubscriptions = vi.fn();

vi.mock('@/api/subscription', () => ({
  subscriptionApi: {
    getSubscription: (...a: unknown[]) => getSubscription(...a),
    getPurchaseOptions: (...a: unknown[]) => getPurchaseOptions(...a),
    getSubscriptions: (...a: unknown[]) => getSubscriptions(...a),
  },
}));

const getLiteModeEnabled = vi.fn();
vi.mock('@/api/branding', () => ({
  brandingApi: { getLiteModeEnabled: () => getLiteModeEnabled() },
}));

vi.mock('@/hooks/usePromoDiscount', () => ({
  usePromoDiscount: () => ({
    applyPromoDiscount: (price: number, original?: number) => ({ price, original, percent: null }),
  }),
}));

vi.mock('@/hooks/useCurrency', () => ({
  useCurrency: () => ({ formatAmount: (v: number) => String(v), currencySymbol: '₽' }),
}));

// jsdom не реализует matchMedia, а тема его спрашивает.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

import SubscriptionPurchase from './SubscriptionPurchase';

const TARIFFS = [
  {
    id: 1,
    name: 'Базовый',
    description: null,
    traffic_limit_label: '200 ГБ',
    device_limit: 5,
    periods: [{ days: 30, price_kopeks: 14900 }],
    is_current: false,
    is_highlighted: false,
  },
  {
    id: 2,
    name: 'Премиум',
    description: null,
    traffic_limit_label: 'Безлимит',
    device_limit: 10,
    periods: [{ days: 30, price_kopeks: 29900 }],
    is_current: false,
    is_highlighted: false,
  },
];

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <PlatformProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={['/subscription/purchase']}>
            <SubscriptionPurchase />
          </MemoryRouter>
        </ToastProvider>
      </PlatformProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  getSubscription.mockResolvedValue({ has_subscription: false, subscription: null });
  getSubscriptions.mockResolvedValue({ subscriptions: [], multi_tariff_enabled: true });
  getPurchaseOptions.mockResolvedValue({
    sales_mode: 'tariffs',
    tariffs: TARIFFS,
    balance_kopeks: 50000,
  });
  getLiteModeEnabled.mockResolvedValue({ enabled: false });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  localStorage.clear();
});

describe('витрина тарифов на странице покупки', () => {
  it('в обычном виде показывает тарифы', async () => {
    renderPage();

    expect(await screen.findByText('Базовый')).toBeTruthy();
    expect(screen.getByText('Премиум')).toBeTruthy();
    expect(screen.queryByText('Доступных опций нет')).toBeNull();
  });

  it('в простом виде показывает те же тарифы', async () => {
    getLiteModeEnabled.mockResolvedValue({ enabled: true });
    renderPage();

    expect(await screen.findByText('Базовый')).toBeTruthy();
    expect(screen.getByText('Премиум')).toBeTruthy();
    expect(screen.queryByText('Доступных опций нет')).toBeNull();
  });
});
