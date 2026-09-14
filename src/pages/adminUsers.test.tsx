// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserListItem } from '@/api/adminUsers';
import { PlatformProvider } from '@/platform/PlatformProvider';

/**
 * Список пользователей: одно поле поиска, состояние в адресе, лента вместо
 * страниц, статусы словами. Тесты держат контракты, а не вёрстку.
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

const getUsers = vi.fn();
vi.mock('@/api/adminUsers', () => ({
  adminUsersApi: {
    getUsers: (params: unknown) => getUsers(params),
    getStats: () =>
      Promise.resolve({
        total_users: 120,
        active_users: 100,
        users_with_active_subscription: 60,
        new_today: 3,
        blocked_users: 2,
        deleted_users: 1,
      }),
  },
}));
vi.mock('@/api/promocodes', () => ({
  promocodesApi: {
    getPromoGroups: () => Promise.resolve({ items: [], total: 0, limit: 100, offset: 0 }),
  },
}));
vi.mock('@/api/campaigns', () => ({
  campaignsApi: { getCampaigns: () => Promise.resolve({ campaigns: [], total: 0 }) },
}));
vi.mock('@/api/tariffs', () => ({
  tariffsApi: { getTariffs: () => Promise.resolve({ tariffs: [], total: 0 }) },
}));

const user = (id: number, extra: Partial<UserListItem> = {}): UserListItem => ({
  id,
  telegram_id: 1000 + id,
  username: `u${id}`,
  first_name: `Имя${id}`,
  last_name: null,
  full_name: `Имя${id}`,
  status: 'active',
  balance_kopeks: 0,
  balance_rubles: 0,
  created_at: '2026-08-01T00:00:00Z',
  last_activity: new Date().toISOString(),
  has_subscription: true,
  subscription_status: 'active',
  subscription_is_trial: false,
  subscription_end_date: '2026-10-01T00:00:00Z',
  tariff_id: 3,
  tariff_name: 'Командный',
  traffic_used_gb: 10,
  traffic_limit_gb: 100,
  device_limit: 3,
  days_remaining: 17,
  promo_group_id: null,
  promo_group_name: null,
  total_spent_kopeks: 0,
  purchase_count: 0,
  has_restrictions: false,
  restriction_topup: false,
  restriction_subscription: false,
  ...extra,
});

const page = (users: UserListItem[], total: number, offset = 0) => ({
  users,
  total,
  offset,
  limit: 50,
});

let observer: { cb: IntersectionObserverCallback } | null = null;

beforeEach(() => {
  getUsers.mockReset();
  observer = null;
  window.localStorage.clear();
  (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver = class {
    constructor(cb: IntersectionObserverCallback) {
      observer = { cb };
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver;
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
});
afterEach(cleanup);

let lastSearch = '';
function LocationProbe() {
  lastSearch = useLocation().search;
  return null;
}

async function renderPage(initial = '/admin/users') {
  const AdminUsers = (await import('./AdminUsers')).default;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <PlatformProvider>
        <MemoryRouter initialEntries={[initial]}>
          <LocationProbe />
          <Routes>
            <Route path="/admin/users" element={<AdminUsers />} />
          </Routes>
        </MemoryRouter>
      </PlatformProvider>
    </QueryClientProvider>,
  );
}

describe('AdminUsers', () => {
  it('состояние приходит из адреса и уходит в запрос', async () => {
    getUsers.mockResolvedValue(page([user(1)], 1));
    await renderPage('/admin/users?q=%40olga&sub=expired&sort=balance');
    await waitFor(() => expect(getUsers).toHaveBeenCalled());
    expect(getUsers.mock.calls[0][0]).toMatchObject({
      search: 'olga',
      subscription_status: 'expired',
      sort_by: 'balance',
      offset: 0,
      limit: 50,
    });
    expect((await screen.findAllByText('Имя1')).length).toBeGreaterThan(0);
  });

  it('email в одном поле уходит параметром email, адрес обновляется', async () => {
    getUsers.mockResolvedValue(page([], 0));
    await renderPage();
    const box = screen.getByRole('searchbox');
    fireEvent.change(box, { target: { value: 'a@b.cc' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    await waitFor(() =>
      expect(getUsers).toHaveBeenLastCalledWith(expect.objectContaining({ email: 'a@b.cc' })),
    );
    expect(lastSearch).toContain('q=a%40b.cc');
  });

  it('сегмент «истекают» пишет view в адрес и ставит серверный фильтр', async () => {
    getUsers.mockResolvedValue(page([], 0));
    await renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'admin.users.views.expiring' }));
    await waitFor(() => expect(lastSearch).toContain('view=expiring'));
    await waitFor(() =>
      expect(getUsers).toHaveBeenLastCalledWith(
        expect.objectContaining({ subscription_status: 'active', expires_within_days: 7 }),
      ),
    );
  });

  it('лента подгружает следующую порцию по наблюдателю', async () => {
    getUsers
      .mockResolvedValueOnce(
        page(
          Array.from({ length: 50 }, (_, i) => user(i + 1)),
          60,
        ),
      )
      .mockResolvedValueOnce(
        page(
          Array.from({ length: 10 }, (_, i) => user(i + 51)),
          60,
          50,
        ),
      );
    await renderPage();
    await screen.findAllByText('Имя50');
    await waitFor(() => expect(observer).not.toBeNull());
    observer?.cb(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
    expect((await screen.findAllByText('Имя60')).length).toBeGreaterThan(0);
    expect(getUsers.mock.calls[1][0]).toMatchObject({ offset: 50 });
    expect(screen.getAllByText('Имя1').length).toBeGreaterThan(0);
  });

  it('сырые статусы не показываются — только словарь', async () => {
    getUsers.mockResolvedValue(
      page([user(1, { status: 'blocked', has_subscription: false, subscription_status: null })], 1),
    );
    await renderPage();
    await screen.findAllByText('Имя1');
    expect(screen.queryByText('blocked')).toBeNull();
    expect(screen.getAllByText('admin.users.statuses.blocked').length).toBeGreaterThan(0);
  });

  it('чистый вход продолжает последнюю выборку из хранилища', async () => {
    window.localStorage.setItem('admin-users:last-view', 'status=blocked');
    getUsers.mockResolvedValue(page([], 0));
    await renderPage();
    await waitFor(() => expect(lastSearch).toContain('status=blocked'));
    await waitFor(() =>
      expect(getUsers).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'blocked' })),
    );
  });
});
