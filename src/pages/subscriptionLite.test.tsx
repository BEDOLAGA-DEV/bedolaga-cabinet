// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Простое управление подпиской ничего не переписывает: строка лишь открывает
 * существующую панель докупки. Тесты стерегут именно это — что панель
 * открывается своей строкой, что её собственная кнопка-карточка при этом не
 * появляется, и что настройки, которых здесь нет, остаются достижимыми.
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

// Панели докупки — настоящие компоненты со своими мутациями. Для этих тестов
// важно не их содержимое, а то, КОГДА они получают open=true.
vi.mock('@/components/subscription/sheets/TrafficTopupSheet', () => ({
  TrafficTopupSheet: ({ open }: { open: boolean }) =>
    open ? <div data-testid="traffic-panel">панель трафика</div> : <button>карточка</button>,
}));
vi.mock('@/components/subscription/sheets/DeviceTopupSheet', () => ({
  DeviceTopupSheet: ({ open }: { open: boolean }) =>
    open ? <div data-testid="devices-panel">панель устройств</div> : <button>карточка</button>,
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

// Блоки настроек — самостоятельные компоненты со своими запросами, мутациями
// и провайдерами (тосты, платформа, подтверждения). Здесь проверяется список
// строк простого экрана, поэтому блоки подменены маркерами.
vi.mock('@/components/subscription/manage/AutopayToggle', () => ({
  AutopayToggle: () => <div data-testid="autopay">автоплатёж</div>,
}));
vi.mock('@/components/subscription/manage/RecurringPanels', () => ({
  RecurringPanels: () => <div data-testid="recurring">автосписания</div>,
}));
vi.mock('@/components/subscription/manage/DevicesPanel', () => ({
  DevicesPanel: () => <div data-testid="devices-list">список устройств</div>,
}));
vi.mock('@/components/subscription/manage/ReissueLinkButton', () => ({
  ReissueLinkButton: () => <div data-testid="reissue">перевыпуск</div>,
  canReissueLink: (s: { is_trial?: boolean; is_active?: boolean; is_limited?: boolean }) =>
    Boolean(s.is_active || s.is_limited) && !s.is_trial,
}));
vi.mock('@/components/subscription/manage/DailyPausePanel', () => ({
  DailyPausePanel: () => <div data-testid="pause">пауза</div>,
}));

import SubscriptionLite from './SubscriptionLite';

const subscription = {
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
};

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
  getSubscription.mockResolvedValue({ has_subscription: true, subscription });
  getDevices.mockResolvedValue({ total: 2, devices: [] });
  getPurchaseOptions.mockResolvedValue({ sales_mode: 'classic' });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SubscriptionLite', () => {
  it('показывает тариф, срок и остаток трафика', async () => {
    renderScreen();

    expect((await screen.findByRole('heading')).textContent).toContain('Базовый');
    expect((await screen.findByRole('progressbar')).getAttribute('aria-valuenow')).toBe('32');
  });

  it('докупка трафика открывается строкой, а не своей карточкой', async () => {
    renderScreen();

    const row = await screen.findByRole('button', { name: /Докупить трафик/ });
    expect(screen.queryByTestId('traffic-panel')).toBeNull();

    row.click();

    expect(await screen.findByTestId('traffic-panel')).toBeTruthy();
    // Закрытая панель рисует собственную кнопку-карточку; раз открытием
    // управляет строка, эта карточка не должна появляться никогда.
    expect(screen.queryByRole('button', { name: 'карточка' })).toBeNull();
  });

  it('за раз открыта одна панель', async () => {
    renderScreen();

    (await screen.findByRole('button', { name: /Докупить трафик/ })).click();
    expect(await screen.findByTestId('traffic-panel')).toBeTruthy();

    (await screen.findByRole('button', { name: /Докупить устройства/ })).click();

    expect(await screen.findByTestId('devices-panel')).toBeTruthy();
    expect(screen.queryByTestId('traffic-panel')).toBeNull();
  });

  it('настройки, которых здесь нет, остаются достижимыми', async () => {
    // Автоплатёж, рекурренты, пауза и перевыпуск живут в теле полной страницы.
    // Если эта строка пропадёт, они станут недоступны в простом виде вообще.
    renderScreen();

    const link = (await screen.findByText('Все настройки подписки')).closest('a');
    expect(link?.getAttribute('href')).toBe('/subscriptions/7?full=1');
  });

  it('продление ведёт на свой экран', async () => {
    renderScreen();

    const link = (await screen.findByText('lite.action.renew')).closest('a');
    expect(link?.getAttribute('href')).toBe('/subscriptions/7/renew');
  });

  it('у пробной подписки докупок нет', async () => {
    getSubscription.mockResolvedValue({
      has_subscription: true,
      subscription: { ...subscription, is_trial: true },
    });
    renderScreen();

    await screen.findByRole('heading');
    expect(screen.queryByRole('button', { name: /Докупить/ })).toBeNull();
  });

  it('в режиме тарифов серверами не управляют', async () => {
    getPurchaseOptions.mockResolvedValue({ sales_mode: 'tariffs' });
    renderScreen();

    await screen.findByRole('button', { name: /Докупить трафик/ });
    expect(screen.queryByRole('button', { name: 'Серверы' })).toBeNull();
  });

  it('безлимитной подписке не предлагают докупить трафик', async () => {
    getSubscription.mockResolvedValue({
      has_subscription: true,
      subscription: { ...subscription, traffic_limit_gb: 0 },
    });
    renderScreen();

    await screen.findByRole('heading');
    expect(screen.queryByRole('button', { name: /Докупить трафик/ })).toBeNull();
  });

  it('отказ сети показывает ошибку, а не пустую подписку', async () => {
    getSubscription.mockRejectedValue(new Error('offline'));
    renderScreen();

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Не удалось загрузить данные');
  });

  it('настройки оплаты и устройств доехали до простого вида', async () => {
    // Раньше автоплатёж, автосписания, перевыпуск и список устройств жили
    // только на полной странице, и простой вид отправлял за ними по ссылке.
    renderScreen();
    await screen.findByRole('heading');

    expect(screen.getByTestId('autopay')).toBeTruthy();
    expect(screen.getByTestId('recurring')).toBeTruthy();
    expect(screen.getByTestId('reissue')).toBeTruthy();
    expect(screen.getByTestId('pause')).toBeTruthy();
  });

  it('список устройств раскрывается своей строкой', async () => {
    renderScreen();

    expect(screen.queryByTestId('devices-list')).toBeNull();
    (await screen.findByRole('button', { name: /Мои устройства/ })).click();
    expect(await screen.findByTestId('devices-list')).toBeTruthy();
  });

  it('у пробной подписки нет ни блока перевыпуска, ни пустой рамки от него', async () => {
    getSubscription.mockResolvedValue({
      has_subscription: true,
      subscription: { ...subscription, is_trial: true },
    });
    renderScreen();
    await screen.findByRole('heading');

    expect(screen.queryByTestId('reissue')).toBeNull();
  });
});
