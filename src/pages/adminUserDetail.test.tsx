// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserDetailResponse } from '@/api/adminUsers';
import { ToastProvider } from '@/components/Toast';
import { PlatformProvider } from '@/platform/PlatformProvider';
import { usePermissionStore } from '@/store/permissions';

/**
 * Карточка пользователя: вкладка из адреса, шапка отвечает на первые вопросы,
 * опасные действия спрятаны в меню и требуют подтверждения.
 */

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: unknown) =>
      opts && typeof opts === 'object' && 'defaultValue' in (opts as object)
        ? String((opts as { defaultValue: string }).defaultValue)
        : key,
    i18n: { language: 'ru', changeLanguage: () => Promise.resolve() },
  }),
  Trans: ({ children }: { children?: unknown }) => children ?? null,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
vi.mock('@/i18n', () => ({ default: { language: 'ru', t: (key: string) => key } }));

const confirm = vi.fn();
vi.mock('@/platform/hooks/useNativeDialog', () => ({
  useNativeDialog: () => ({ confirm, alert: vi.fn(), popup: vi.fn(), isNative: false }),
  useDestructiveConfirm: () => confirm,
}));

vi.mock('@/components/admin/reachability/useReachabilityStatus', () => ({
  useReachabilityAvailable: () => false,
}));

const detail: UserDetailResponse = {
  id: 42,
  telegram_id: 453205530,
  username: 'c0mrade_ton',
  first_name: 'Егор',
  last_name: 'Ф.',
  full_name: 'Егор Ф.',
  status: 'active',
  language: 'ru',
  balance_kopeks: 300200,
  balance_rubles: 3002,
  email: 'egor@example.com',
  email_verified: true,
  created_at: '2026-08-07T10:00:00Z',
  updated_at: null,
  last_activity: '2026-09-14T12:00:00Z',
  cabinet_last_login: '2026-09-14T12:10:00Z',
  subscription: {
    id: 2424,
    status: 'active',
    is_trial: false,
    start_date: '2026-06-14T12:05:00Z',
    end_date: '2026-12-13T12:14:00Z',
    traffic_limit_gb: 1500,
    traffic_used_gb: 0,
    device_limit: 10,
    tariff_id: 3,
    tariff_name: 'Командный',
    autopay_enabled: true,
    sbp_recurring_status: null,
    sbp_recurring_id: null,
    is_active: true,
    days_remaining: 90,
    purchased_traffic_gb: 0,
    traffic_purchases: [],
  },
  subscriptions: [],
  promo_group: { id: 2, name: 'Premium', is_default: false },
  referral: {
    referral_code: 'ref_c0mrade',
    referrals_count: 2,
    total_earnings_kopeks: 45000,
    commission_percent: null,
    referred_by_id: null,
    referred_by_username: null,
  },
  total_spent_kopeks: 1275000,
  purchase_count: 6,
  used_promocodes: 1,
  has_had_paid_subscription: true,
  lifetime_used_traffic_bytes: 177 * 1024 ** 3,
  campaign_name: 'Реклама в TG-канале',
  campaign_id: 5,
  restriction_topup: false,
  restriction_subscription: false,
  restriction_reason: null,
  promo_offer_discount_percent: 0,
  promo_offer_discount_source: null,
  promo_offer_discount_expires_at: null,
  recent_transactions: [],
  remnawave_id: 9001,
};
detail.subscriptions = [detail.subscription as NonNullable<typeof detail.subscription>];

const getUser = vi.fn();
const fullDeleteUser = vi.fn();
vi.mock('@/api/adminUsers', () => ({
  adminUsersApi: {
    getUser: () => getUser(),
    getPanelInfo: () =>
      Promise.resolve({
        found: true,
        trojan_password: null,
        vless_uuid: 'uuid',
        ss_password: null,
        subscription_url: 'https://sub.example/abc',
        happ_link: null,
        used_traffic_bytes: 0,
        lifetime_used_traffic_bytes: 0,
        traffic_limit_bytes: 0,
        first_connected_at: '2026-06-14T13:00:00Z',
        online_at: new Date().toISOString(),
        last_connected_node_uuid: 'n1',
        last_connected_node_name: 'Germany 3',
      }),
    getUserDevices: () => Promise.resolve({ devices: [], total: 0, device_limit: 10 }),
    getUserActivity: () => Promise.resolve({ items: [], total: 0, offset: 0, limit: 5 }),
    getUserGifts: () =>
      Promise.resolve({ sent: [], received: [], sent_total: 0, received_total: 0 }),
    getAvailableTariffs: () =>
      Promise.resolve({
        user_id: 42,
        promo_group_id: null,
        promo_group_name: null,
        tariffs: [],
        total: 0,
        current_tariff_id: 3,
        current_tariff_name: 'Командный',
      }),
    getNodeUsage: () => Promise.resolve({ items: [], categories: [], period_days: 7 }),
    getSyncStatus: () =>
      Promise.resolve({
        user_id: 42,
        telegram_id: 453205530,
        remnawave_id: 9001,
        subscription_id: 2424,
        subscription_tariff_name: 'Командный',
        last_sync: new Date().toISOString(),
        bot_subscription_status: 'active',
        bot_subscription_end_date: '2026-12-13T12:14:00Z',
        bot_traffic_limit_gb: 1500,
        bot_traffic_used_gb: 0,
        bot_device_limit: 10,
        bot_squads: ['a'],
        panel_found: true,
        panel_status: 'ACTIVE',
        panel_expire_at: '2026-12-13T12:14:00Z',
        panel_traffic_limit_gb: 1500,
        panel_traffic_used_gb: 0,
        panel_device_limit: 10,
        panel_squads: ['a'],
        has_differences: false,
        differences: [],
      }),
    getSubscriptionRequestHistory: () => Promise.resolve({ total: 0, records: [] }),
    getReferrals: () => Promise.resolve({ users: [], total: 0, offset: 0, limit: 100 }),
    getTransactions: () => Promise.resolve({ items: [], total: 0 }),
    fullDeleteUser: () => fullDeleteUser(),
    blockUser: vi.fn(),
    unblockUser: vi.fn(),
  },
}));
vi.mock('@/api/admin', () => ({
  adminApi: {
    getTickets: () => Promise.resolve({ items: [], total: 1, page: 1, per_page: 1, pages: 1 }),
  },
}));
vi.mock('@/api/promocodes', () => ({
  promocodesApi: {
    getPromoGroups: () => Promise.resolve({ items: [], total: 0, limit: 100, offset: 0 }),
  },
}));

beforeEach(() => {
  getUser.mockReset();
  getUser.mockResolvedValue(detail);
  fullDeleteUser.mockReset();
  confirm.mockReset();
  confirm.mockResolvedValue(false);
  usePermissionStore.setState({ permissions: ['*:*'], roleLevel: 100 } as never);
  (globalThis as Record<string, unknown>).__APP_VERSION__ ??= '0.0.0-test';
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
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = ((cb: FrameRequestCallback) =>
      setTimeout(() => cb(0), 0)) as unknown as typeof window.requestAnimationFrame;
  }
});
afterEach(cleanup);

async function renderDetail(initial = '/admin/users/42') {
  const AdminUserDetail = (await import('./AdminUserDetail')).default;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <PlatformProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={[initial]}>
            <Routes>
              <Route path="/admin/users/:id" element={<AdminUserDetail />} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </PlatformProvider>
    </QueryClientProvider>,
  );
  await screen.findByRole('heading', { level: 1, name: 'Егор Ф.' });
}

describe('AdminUserDetail', () => {
  it('в шапке видны группа и онлайн; тариф и срок — в плитке, «Активен» чипом не пишется', async () => {
    await renderDetail();
    expect(screen.queryByText('admin.users.statuses.active')).toBeNull();
    expect(screen.getByText('admin.users.detail.header.group')).toBeTruthy();
    expect(screen.getByText('admin.users.detail.facts.until')).toBeTruthy();
    expect(await screen.findByText('admin.users.detail.header.onlineAt')).toBeTruthy();
    // Мок t отдаёт defaultValue — у языка это код заглавными, если перевода нет.
    expect(screen.getByText('RU')).toBeTruthy();
  });

  it('вкладка берётся из адреса, невалидная — обзор', async () => {
    await renderDetail('/admin/users/42?tab=referrals');
    expect(screen.getByRole('tab', { selected: true }).textContent).toContain(
      'admin.users.detail.tabs.referrals',
    );
    cleanup();
    await renderDetail('/admin/users/42?tab=hack');
    expect(screen.getByRole('tab', { selected: true }).textContent).toContain(
      'admin.users.detail.tabs.overview',
    );
    expect(
      screen.getByRole('heading', { level: 2, name: 'admin.users.detail.overview.connection' }),
    ).toBeTruthy();
  });

  it('вкладок шесть, «Синхронизации» и «Информации» среди них нет', async () => {
    await renderDetail();
    const tabs = screen.getAllByRole('tab').map((tab) => tab.textContent ?? '');
    // Шестая — нарушения; сторож остаётся на том же месте: разделы, которые
    // когда-то отсюда выкинули, не должны вернуться.
    expect(tabs.filter((label) => label.startsWith('admin.users.detail.tabs.'))).toHaveLength(6);
    expect(tabs.some((label) => label.includes('tabs.sync') || label.includes('tabs.info'))).toBe(
      false,
    );
  });

  it('опасные действия только в меню и требуют подтверждения', async () => {
    await renderDetail();
    expect(screen.queryByRole('button', { name: 'admin.users.userActions.delete' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'admin.users.detail.menu.more' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /admin\.users\.userActions\.delete/ }));
    await waitFor(() => expect(confirm).toHaveBeenCalled());
    expect(fullDeleteUser).not.toHaveBeenCalled();
  });

  it('удаление после подтверждения уходит на сервер', async () => {
    confirm.mockResolvedValue(true);
    fullDeleteUser.mockResolvedValue({ success: true, message: '' });
    await renderDetail();
    fireEvent.click(screen.getByRole('button', { name: 'admin.users.detail.menu.more' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /admin\.users\.userActions\.delete/ }));
    await waitFor(() => expect(fullDeleteUser).toHaveBeenCalled());
  });

  it('«Продлить ▾» — у самой подписки: «другой срок» открывает форму под карточкой', async () => {
    await renderDetail('/admin/users/42?tab=subscription');
    await screen.findByText('admin.users.detail.panel.title');
    fireEvent.click(screen.getByRole('button', { name: 'admin.users.detail.subscription.extend' }));
    fireEvent.click(
      await screen.findByRole('menuitem', { name: 'admin.users.detail.subscription.customDays' }),
    );
    expect(await screen.findByLabelText('admin.users.detail.subscription.extendDays')).toBeTruthy();
  });

  it('в шапке нет «Продлить» — в мультитарифе не понять, какую подписку он продлит', async () => {
    const extendButtons = () =>
      screen.queryAllByRole('button', { name: 'admin.users.detail.subscription.extend' });
    await renderDetail();
    await screen.findByText('admin.users.detail.facts.balance');
    expect(extendButtons()).toHaveLength(0);
    expect(screen.queryByRole('button', { name: 'admin.users.detail.header.topUp' })).toBeNull();
    expect(screen.getByRole('button', { name: 'admin.users.detail.header.write' })).toBeTruthy();
    cleanup();
    await renderDetail('/admin/users/42?tab=subscription');
    await screen.findByText('admin.users.detail.panel.title');
    expect(extendButtons()).toHaveLength(1);
  });

  it('мультитариф: плитка «Подписки» вместо срока, трафика и устройств одной из них', async () => {
    const second = {
      ...(detail.subscription as NonNullable<typeof detail.subscription>),
      id: 2425,
      tariff_name: 'Семейный',
      end_date: '2026-10-01T00:00:00Z',
    };
    getUser.mockResolvedValue({
      ...detail,
      multi_tariff_enabled: true,
      sales_mode: 'tariffs',
      subscriptions: [detail.subscription, second],
    });
    await renderDetail();
    expect(await screen.findByText('admin.users.detail.facts.subscriptions')).toBeTruthy();
    expect(screen.getByText('admin.users.detail.facts.subscriptionsLive')).toBeTruthy();
    expect(screen.queryByText('admin.users.detail.facts.until')).toBeNull();
    expect(screen.queryByText('admin.users.detail.facts.traffic')).toBeNull();
    expect(screen.queryByText('admin.users.detail.facts.devices')).toBeNull();
  });

  it('мультитариф с одной подпиской: карточка сразу и можно выдать ещё одну', async () => {
    getUser.mockResolvedValue({ ...detail, multi_tariff_enabled: true, sales_mode: 'tariffs' });
    await renderDetail('/admin/users/42?tab=subscription');
    await screen.findByText('admin.users.detail.panel.title');
    expect(screen.getByText('admin.users.detail.subscription.createNew')).toBeTruthy();
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent ?? '');
    expect(headings[headings.length - 1]).toBe('admin.users.detail.subscription.dangerZone.title');
  });

  it('классика: без «Сменить тариф» и без названия тарифа в плитке', async () => {
    getUser.mockResolvedValue({ ...detail, sales_mode: 'classic', multi_tariff_enabled: false });
    await renderDetail('/admin/users/42?tab=subscription');
    await screen.findByText('admin.users.detail.panel.title');
    expect(
      screen.queryByRole('button', { name: 'admin.users.detail.subscription.changeTariff' }),
    ).toBeNull();
    expect(screen.queryByText(/Командный/)).toBeNull();
  });

  it('в «⋯» только действия с аккаунтом: промогруппа, ограничения и подписка — на своих местах', async () => {
    await renderDetail();
    fireEvent.click(screen.getByRole('button', { name: 'admin.users.detail.menu.more' }));
    const items = (await screen.findAllByRole('menuitem')).map((item) => item.textContent ?? '');
    expect(items.some((label) => label.includes('menu.promoGroup'))).toBe(false);
    expect(items.some((label) => label.includes('menu.restrictions'))).toBe(false);
    expect(items.some((label) => label.includes('resetSubscription'))).toBe(false);
    expect(items.some((label) => label.includes('userActions.delete'))).toBe(true);
  });

  it('«Подписка»: опасная зона последняя, формы «Создать» нет при живой подписке', async () => {
    await renderDetail('/admin/users/42?tab=subscription');
    await screen.findByText('admin.users.detail.panel.title');
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent ?? '');
    expect(headings[headings.length - 1]).toBe('admin.users.detail.subscription.dangerZone.title');
    expect(screen.queryByText('admin.users.detail.subscription.createNew')).toBeNull();
    expect(screen.queryByText('admin.users.detail.tabs.sync')).toBeNull();
  });

  it('«Подписка» без подписок показывает только форму «Создать»', async () => {
    getUser.mockResolvedValue({ ...detail, subscription: null, subscriptions: [] });
    await renderDetail('/admin/users/42?tab=subscription');
    expect(await screen.findByText('admin.users.detail.subscription.noActive')).toBeTruthy();
    expect(screen.queryByText('admin.users.detail.subscription.dangerZone.title')).toBeNull();
  });

  it('удаление подписки из опасной зоны требует подтверждения', async () => {
    await renderDetail('/admin/users/42?tab=subscription');
    await screen.findByText('admin.users.detail.subscription.dangerZone.title');
    fireEvent.click(
      screen.getByRole('button', { name: /admin\.users\.detail\.subscription\.deleteButton/ }),
    );
    await waitFor(() => expect(confirm).toHaveBeenCalled());
  });
});
