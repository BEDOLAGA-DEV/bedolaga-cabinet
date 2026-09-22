// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Простой экран держится на одном обещании: одна фраза о состоянии и одна
 * кнопка, которая ведёт туда, что сейчас нужнее всего. Проверяем именно это —
 * что кнопка ровно одна и её адрес соответствует состоянию подписки. Разметку
 * и отступы тест не сторожит: их меняют часто и осознанно.
 */

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key),
    i18n: { language: 'ru', changeLanguage: () => Promise.resolve() },
  }),
  Trans: ({ children }: { children?: unknown }) => children ?? null,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

vi.mock('@/hooks/useCurrency', () => ({
  useCurrency: () => ({
    formatAmount: (value: number) => String(value),
    currencySymbol: '₽',
  }),
}));

const getSubscriptions = vi.fn();
const getSubscription = vi.fn();
const getDevices = vi.fn();
const getTrialInfo = vi.fn();
const activateTrial = vi.fn();

vi.mock('@/api/subscription', () => ({
  subscriptionApi: {
    getSubscriptions: (...args: unknown[]) => getSubscriptions(...args),
    getSubscription: (...args: unknown[]) => getSubscription(...args),
    getDevices: (...args: unknown[]) => getDevices(...args),
    getTrialInfo: (...args: unknown[]) => getTrialInfo(...args),
    activateTrial: (...args: unknown[]) => activateTrial(...args),
  },
}));

vi.mock('@/api/balance', () => ({
  balanceApi: { getBalance: () => Promise.resolve({ balance_rubles: 350, balance_kopeks: 35000 }) },
}));

vi.mock('@/api/promo', () => ({
  promoApi: {
    getOffers: () => Promise.resolve([]),
    getActiveDiscount: () => Promise.resolve({ discount_percent: 0, is_active: false }),
  },
}));

import DashboardLite from './DashboardLite';

const baseSubscription = {
  id: 7,
  status: 'active',
  is_trial: false,
  is_expired: false,
  is_limited: false,
  days_left: 23,
  end_date: '2026-10-15T00:00:00Z',
  traffic_limit_gb: 200,
  traffic_used_gb: 64,
  traffic_used_percent: 32,
  device_limit: 5,
};

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <DashboardLite />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Единственная кнопка действия: крупная ссылка над списком строк. */
async function primaryAction() {
  return await screen.findByRole('link', { name: /^lite\.action\./ });
}

beforeEach(() => {
  getSubscriptions.mockResolvedValue({ subscriptions: [], multi_tariff_enabled: false });
  getSubscription.mockResolvedValue({ has_subscription: true, subscription: baseSubscription });
  getDevices.mockResolvedValue({ total: 2, devices: [] });
  getTrialInfo.mockResolvedValue({ is_available: false, requires_payment: false, price_rubles: 0 });
  activateTrial.mockResolvedValue({});
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('DashboardLite', () => {
  it('живая подписка: зовёт подключиться и ведёт на подключение этой подписки', async () => {
    renderScreen();

    const action = await primaryAction();
    expect(action.textContent).toContain('lite.action.connect');
    expect(action.getAttribute('href')).toBe('/connection?sub=7');
    expect((await screen.findByRole('heading')).textContent).toContain('lite.status.active');
  });

  it('кнопка действия ровно одна', async () => {
    renderScreen();
    await primaryAction();

    expect(screen.getAllByRole('link', { name: /^lite\.action\./ })).toHaveLength(1);
  });

  it('истёкшая подписка ведёт продлевать, а не подключаться', async () => {
    getSubscription.mockResolvedValue({
      has_subscription: true,
      subscription: { ...baseSubscription, is_expired: true, days_left: 0 },
    });
    renderScreen();

    const action = await primaryAction();
    expect(action.textContent).toContain('lite.action.renew');
    expect(action.getAttribute('href')).toBe('/subscriptions/7/renew');
  });

  it('без подписки ведёт в витрину тарифов', async () => {
    getSubscription.mockResolvedValue({ has_subscription: false, subscription: null });
    renderScreen();

    const action = await primaryAction();
    expect(action.textContent).toContain('lite.action.buy');
    expect(action.getAttribute('href')).toBe('/subscription/purchase');
  });

  it('доступный триал становится главным действием — иначе бесплатный вход виден только в полном виде', async () => {
    // Витрина тарифов активировать пробный период не умеет: там есть лишь
    // предложение апгрейда уже начатому триалу. Если простой экран не позовёт
    // попробовать, новый человек про бесплатный вход не узнает вовсе.
    getSubscription.mockResolvedValue({ has_subscription: false, subscription: null });
    getTrialInfo.mockResolvedValue({
      is_available: true,
      requires_payment: false,
      price_rubles: 0,
    });
    renderScreen();

    const action = await screen.findByRole('button', { name: 'lite.action.tryFree' });
    expect(screen.queryByRole('link', { name: /^lite\.action\./ })).toBeNull();

    action.click();
    await waitFor(() => expect(activateTrial).toHaveBeenCalled());
  });

  it('при доступном триале витрина тарифов остаётся строкой', async () => {
    getSubscription.mockResolvedValue({ has_subscription: false, subscription: null });
    getTrialInfo.mockResolvedValue({
      is_available: true,
      requires_payment: false,
      price_rubles: 0,
    });
    renderScreen();

    await screen.findByRole('button', { name: 'lite.action.tryFree' });
    expect(screen.getByText('Посмотреть тарифы').closest('a')?.getAttribute('href')).toBe(
      '/subscription/purchase',
    );
  });

  it('платный триал называет цену, а не притворяется бесплатным', async () => {
    getSubscription.mockResolvedValue({ has_subscription: false, subscription: null });
    getTrialInfo.mockResolvedValue({
      is_available: true,
      requires_payment: true,
      price_rubles: 99,
    });
    renderScreen();

    const action = await screen.findByRole('button', { name: /lite\.action\.tryPaid/ });
    expect(action.textContent).toContain('lite.action.tryPaid');
    expect(screen.queryByRole('button', { name: 'lite.action.tryFree' })).toBeNull();
  });

  it('без подписки не показывает ни шкалы трафика, ни строки устройств', async () => {
    getSubscription.mockResolvedValue({ has_subscription: false, subscription: null });
    renderScreen();
    await primaryAction();

    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.queryByText('Устройства')).toBeNull();
  });

  it('шкала показывает израсходованную долю трафика', async () => {
    renderScreen();

    const meter = await screen.findByRole('progressbar');
    expect(meter.getAttribute('aria-valuenow')).toBe('32');
  });

  it('безлимитная подписка обходится без шкалы', async () => {
    getSubscription.mockResolvedValue({
      has_subscription: true,
      subscription: { ...baseSubscription, traffic_limit_gb: 0, traffic_used_percent: 0 },
    });
    renderScreen();
    await primaryAction();

    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.getByText('Трафик без ограничений')).toBeTruthy();
  });

  it('несколько подписок: экран становится выбором, без единственного действия', async () => {
    getSubscriptions.mockResolvedValue({
      multi_tariff_enabled: true,
      subscriptions: [
        { id: 7, tariff_name: 'Базовый', end_date: '2026-10-15T00:00:00Z' },
        { id: 9, tariff_name: 'Премиум', end_date: '2026-11-01T00:00:00Z' },
      ],
    });
    renderScreen();

    // У этого заголовка в коде есть инлайн-дефолт, поэтому мок t отдаёт текст,
    // а не ключ — в отличие от состояний, где ключ собирается динамически.
    expect((await screen.findByRole('heading')).textContent).toContain('Ваши подписки');
    expect(screen.queryByRole('link', { name: /^lite\.action\./ })).toBeNull();

    const basic = screen.getByText('Базовый').closest('a');
    expect(basic?.getAttribute('href')).toBe('/subscriptions/7');
    expect(screen.getByText('Премиум').closest('a')?.getAttribute('href')).toBe('/subscriptions/9');
  });

  it('единственная подписка в мультитарифе спрашивается по id — иначе экран пустой', async () => {
    getSubscriptions.mockResolvedValue({
      multi_tariff_enabled: true,
      subscriptions: [{ id: 42, tariff_name: 'Базовый', end_date: '2026-10-15T00:00:00Z' }],
    });
    getSubscription.mockResolvedValue({
      has_subscription: true,
      subscription: { ...baseSubscription, id: 42 },
    });
    renderScreen();

    await primaryAction();
    await waitFor(() => expect(getSubscription).toHaveBeenCalledWith(42));
    expect(await screen.findByRole('progressbar')).toBeTruthy();
  });

  it('баланс показан строкой и ведёт на пополнение', async () => {
    renderScreen();
    await primaryAction();

    const balanceRow = screen.getByText('Баланс').closest('a');
    expect(balanceRow?.getAttribute('href')).toBe('/balance');
    expect(within(balanceRow as HTMLElement).getByText(/350/)).toBeTruthy();
  });
});

describe('DashboardLite: отказ сети', () => {
  it('не выдаёт сетевую ошибку за «подписки пока нет»', async () => {
    // Список подписок не ответил. Если экран молча покажет пустое состояние,
    // платящий человек увидит «Подписки пока нет» и кнопку «Выбрать тариф» —
    // то есть предложение купить то, что у него уже куплено.
    getSubscriptions.mockRejectedValue(new Error('offline'));
    renderScreen();

    // Ждём именно появления сообщения об ошибке, а не отсутствия текста:
    // проверка на отсутствие проходит и пока экран ещё рисует скелетон, то
    // есть «зеленеет» ровно в том случае, который должна ловить.
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Не удалось загрузить данные');
    expect(screen.queryByText('lite.status.none')).toBeNull();
    expect(screen.queryByRole('link', { name: 'lite.action.buy' })).toBeNull();
  });

  it('даёт повторить попытку', async () => {
    getSubscriptions.mockRejectedValue(new Error('offline'));
    renderScreen();

    const retry = await screen.findByRole('button', { name: 'Повторить' });
    getSubscriptions.mockResolvedValue({ subscriptions: [], multi_tariff_enabled: false });
    retry.click();

    const action = await primaryAction();
    expect(action.textContent).toContain('lite.action.connect');
  });
});
