// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Премиум-трафик в простом виде кабинета.
 *
 * Простой вид — это список строк и ровно один акцент на экране, поэтому
 * карточка с шкалой (полный вид) сюда не переносится: расход по серверам с
 * отдельным лимитом встаёт строкой, как «Устройства» и «Баланс». Тесты стерегут
 * две вещи: что расход виден там, где человек его ищет, и что строка докупки
 * появляется только когда докупать действительно есть что, — иначе она ведёт в
 * пустую панель.
 */

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key),
    i18n: { language: 'ru', changeLanguage: () => Promise.resolve() },
  }),
  Trans: ({ children }: { children?: unknown }) => children ?? null,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

vi.mock('@/hooks/useTheme', () => ({ useTheme: () => ({ isDark: true }) }));

const getSubscription = vi.fn();
const getDevices = vi.fn();
const getPurchaseOptions = vi.fn();

vi.mock('@/api/subscription', () => ({
  subscriptionApi: {
    getSubscription: (...a: unknown[]) => getSubscription(...a),
    getDevices: (...a: unknown[]) => getDevices(...a),
    getPurchaseOptions: (...a: unknown[]) => getPurchaseOptions(...a),
  },
}));

vi.mock('@/components/subscription/sheets/TrafficTopupSheet', () => ({
  TrafficTopupSheet: ({ open }: { open: boolean }) => (open ? <div>панель трафика</div> : null),
}));
vi.mock('@/components/subscription/sheets/DeviceTopupSheet', () => ({
  DeviceTopupSheet: ({ open }: { open: boolean }) => (open ? <div>панель устройств</div> : null),
}));
vi.mock('@/components/subscription/sheets/DeviceReductionSheet', () => ({
  DeviceReductionSheet: ({ open }: { open: boolean }) =>
    open ? <div>меньше устройств</div> : null,
}));
vi.mock('@/components/subscription/sheets/ServerManagementSheet', () => ({
  ServerManagementSheet: ({ open }: { open: boolean }) => (open ? <div>серверы</div> : null),
}));
vi.mock('@/components/subscription/sheets/DeleteSubscriptionSheet', () => ({
  DeleteSubscriptionSheet: ({ open }: { open: boolean }) => (open ? <div>удаление</div> : null),
}));
// Лист докупки премиума — настоящий компонент со своим запросом и покупкой;
// здесь важно только то, когда он получает open.
vi.mock('@/components/subscription/sheets/PremiumTrafficTopupSheet', () => ({
  PremiumTrafficTopupSheet: ({ open }: { open: boolean }) =>
    open ? <div data-testid="premium-panel">панель премиума</div> : <button>карточка</button>,
}));

vi.mock('@/components/subscription/manage/AutopayToggle', () => ({
  AutopayToggle: () => null,
}));
vi.mock('@/components/subscription/manage/RecurringPanels', () => ({
  RecurringPanels: () => null,
}));
vi.mock('@/components/subscription/manage/DevicesPanel', () => ({
  DevicesPanel: () => null,
}));
vi.mock('@/components/subscription/manage/ReissueLinkButton', () => ({
  ReissueLinkButton: () => null,
  canReissueLink: () => false,
}));
vi.mock('@/components/subscription/manage/DailyPausePanel', () => ({
  DailyPausePanel: () => null,
}));

import SubscriptionLite from './SubscriptionLite';

const PREMIUM = {
  squad_uuid: 'c0b8db48-31dc-423b-9778-e6682fbd6d06',
  name: 'Мобильный LTE резерв',
  limit_gb: 5,
  extra_gb: 0,
  used_gb: 3.2,
  used_percent: 64,
  is_limited: false,
  period_start_at: '2026-09-01T10:00:00Z',
  topup_available: true,
};

function subscription(premium: unknown[] = [PREMIUM]) {
  return {
    id: 7,
    status: 'active',
    tariff_name: 'Базовый',
    is_trial: false,
    is_expired: false,
    is_active: true,
    is_limited: false,
    end_date: '2026-10-15T00:00:00Z',
    traffic_limit_gb: 200,
    traffic_used_gb: 64,
    traffic_used_percent: 32,
    device_limit: 5,
    premium_traffic: premium,
  };
}

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/subscriptions/7']}>
        <Routes>
          <Route path="/subscriptions/:subscriptionId" element={<SubscriptionLite />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  getSubscription.mockResolvedValue({ has_subscription: true, subscription: subscription() });
  getDevices.mockResolvedValue({ total: 2, devices: [] });
  getPurchaseOptions.mockResolvedValue({ sales_mode: 'classic' });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('премиум-трафик в простом виде', () => {
  it('показывает расход по премиум-серверу строкой', async () => {
    renderScreen();

    expect(await screen.findByText('Мобильный LTE резерв')).toBeTruthy();
    // Единицы приходят из настоящего i18n (formatTraffic зовёт его напрямую),
    // поэтому здесь «GB», а не «ГБ»; неразрывный пробел Testing Library
    // нормализует в обычный.
    expect(screen.getByText('3.2 GB / 5.0 GB')).toBeTruthy();
  });

  it('снятый сервер отмечен словом, а не цифрами', async () => {
    getSubscription.mockResolvedValue({
      has_subscription: true,
      subscription: subscription([{ ...PREMIUM, is_limited: true, used_gb: 5.4 }]),
    });
    renderScreen();

    expect(await screen.findByText('Лимит исчерпан')).toBeTruthy();
    expect(screen.queryByText(/5\.4/)).toBeNull();
  });

  it('докупка премиума открывается строкой, а не своей карточкой', async () => {
    renderScreen();

    const row = await screen.findByRole('button', { name: /Докупить премиум-трафик/ });
    expect(screen.queryByTestId('premium-panel')).toBeNull();

    row.click();

    expect(await screen.findByTestId('premium-panel')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'карточка' })).toBeNull();
  });

  it('без докупки по серверу строки докупки нет, а расход виден', async () => {
    getSubscription.mockResolvedValue({
      has_subscription: true,
      subscription: subscription([{ ...PREMIUM, topup_available: false }]),
    });
    renderScreen();

    expect(await screen.findByText('Мобильный LTE резерв')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Докупить премиум-трафик/ })).toBeNull();
  });

  it('у тарифа без премиум-серверов на экране ничего не прибавляется', async () => {
    getSubscription.mockResolvedValue({ has_subscription: true, subscription: subscription([]) });
    renderScreen();

    await screen.findByRole('heading');
    expect(screen.queryByRole('button', { name: /Докупить премиум-трафик/ })).toBeNull();
    expect(screen.queryByTestId('premium-panel')).toBeNull();
  });
});

describe('премиум-трафик на главной простого вида', () => {
  // Главный экран собирает свои данные сам — подписки, устройства, баланс,
  // триал и промо. Докупки здесь нет: она живёт в управлении подпиской.
  async function renderHome(premium: unknown[], opts: { many?: boolean } = {}) {
    vi.resetModules();
    vi.doMock('@/api/subscription', () => ({
      subscriptionApi: {
        getSubscriptions: () =>
          Promise.resolve(
            opts.many
              ? {
                  subscriptions: [subscription([PREMIUM]), { ...subscription([]), id: 8 }],
                  multi_tariff_enabled: true,
                }
              : { subscriptions: [], multi_tariff_enabled: false },
          ),
        getSubscription: () =>
          Promise.resolve({ has_subscription: true, subscription: subscription(premium) }),
        getDevices: () => Promise.resolve({ total: 2, devices: [] }),
        getTrialInfo: () =>
          Promise.resolve({ is_available: false, requires_payment: false, price_rubles: 0 }),
        activateTrial: () => Promise.resolve({}),
      },
    }));
    vi.doMock('@/api/balance', () => ({
      balanceApi: {
        getBalance: () => Promise.resolve({ balance_rubles: 350, balance_kopeks: 35000 }),
      },
    }));
    vi.doMock('@/api/promo', () => ({
      promoApi: {
        getOffers: () => Promise.resolve([]),
        getActiveDiscount: () => Promise.resolve({ discount_percent: 0, is_active: false }),
      },
    }));
    vi.doMock('@/hooks/useCurrency', () => ({
      useCurrency: () => ({ formatAmount: (value: number) => String(value), currencySymbol: '₽' }),
    }));
    const { default: DashboardLite } = await import('./DashboardLite');
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <DashboardLite />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  it('расход по премиум-серверу виден строкой рядом с устройствами и балансом', async () => {
    await renderHome([PREMIUM]);

    expect(await screen.findByText('Мобильный LTE резерв')).toBeTruthy();
    expect(screen.getByText('3.2 GB / 5.0 GB')).toBeTruthy();
  });

  it('со списком из нескольких подписок остаток не показывается', async () => {
    // Здесь на экране нет ни шкалы, ни кнопки действия: они относятся к
    // подписке, а не к их списку. Остаток премиума — тоже.
    await renderHome([PREMIUM], { many: true });

    await screen.findByRole('heading');
    expect(screen.queryByText('Мобильный LTE резерв')).toBeNull();
  });

  it('у тарифа без премиум-серверов строк не прибавляется', async () => {
    await renderHome([]);

    await screen.findByRole('heading');
    expect(screen.queryByText('Мобильный LTE резерв')).toBeNull();
  });
});
