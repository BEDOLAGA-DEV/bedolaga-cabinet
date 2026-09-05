// @vitest-environment jsdom
import type { ComponentType } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/Toast';
import { PlatformProvider } from '@/platform/PlatformProvider';

/**
 * Проверяет, что состояния загрузки страниц действительно рисуют скелетон и не
 * падают. Раньше это можно было увидеть только вручную и только с поднятым
 * бэкендом: состояния живут доли секунды, а без бэкенда экраны не открываются
 * вовсе — их перекрывает «Сервис недоступен».
 *
 * Все запросы держатся в состоянии загрузки одним моком react-query, поэтому
 * страница обязана уйти в свою loading-ветку. Утверждение одинаковое для всех:
 * должен быть `role="status"` с плейсхолдерами примитива и без спиннера.
 */

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key),
    i18n: { language: 'ru', changeLanguage: () => Promise.resolve() },
  }),
  Trans: ({ children }: { children?: unknown }) => children ?? null,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@tanstack/react-query');
  const pending = {
    data: undefined,
    isLoading: true,
    isPending: true,
    isFetching: true,
    isError: false,
    error: null,
    refetch: () => Promise.resolve(),
  };
  return {
    ...actual,
    useQuery: () => pending,
    useInfiniteQuery: () => ({ ...pending, fetchNextPage: () => {}, hasNextPage: false }),
    useMutation: () => ({
      mutate: () => {},
      mutateAsync: () => Promise.resolve(),
      isPending: false,
    }),
    useQueryClient: () => ({
      invalidateQueries: () => {},
      setQueryData: () => {},
      getQueryData: () => undefined,
    }),
  };
});

// jsdom не реализует matchMedia, а тема и фоны его спрашивают.
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

// Значение подставляет vite через define; в тестах его нет.
(globalThis as Record<string, unknown>).__APP_VERSION__ ??= '0.0.0-test';

// jsdom не всегда инициализирует localStorage, а в Node 22+ globalThis.localStorage
// возвращает undefined без --localstorage-file.
const storageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
})();

try {
  Object.defineProperty(window, 'localStorage', {
    value: storageMock,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'localStorage', {
    value: storageMock,
    writable: true,
    configurable: true,
  });
} catch {
  // ignore
}

afterEach(cleanup);

type PageCase = {
  name: string;
  load: () => Promise<{ default: ComponentType }>;
  /** Шаблон маршрута и адрес — страницы с ранним выходом по параметру. */
  path?: string;
  entry?: string;
};

/**
 * AdminTrafficUsage сюда не входит намеренно: его заглушки — ячейки таблицы,
 * которые появляются только когда строки уже пришли, а обогащение ещё грузится.
 * Пустой мок такого состояния не даёт. Ячейки не обёрнуты в SkeletonGroup
 * специально: role="status" в каждой заставил бы скринридер зачитать
 * «загрузка» по разу на ячейку.
 */
const PAGES: PageCase[] = [
  { name: 'Referral', load: () => import('./Referral') },
  { name: 'Contests', load: () => import('./Contests') },
  { name: 'Polls', load: () => import('./Polls') },
  { name: 'AdminPartnerSettings', load: () => import('./AdminPartnerSettings') },
  { name: 'AdminReferralLevels', load: () => import('./AdminReferralLevels') },
  { name: 'AdminTicketSettings', load: () => import('./AdminTicketSettings') },
  {
    name: 'AdminBroadcastDetail',
    load: () => import('./AdminBroadcastDetail'),
    path: '/b/:id',
    entry: '/b/1',
  },
  {
    name: 'AdminCouponDetail',
    load: () => import('./AdminCouponDetail'),
    path: '/c/:id',
    entry: '/c/1',
  },
  {
    name: 'AdminWithdrawalDetail',
    load: () => import('./AdminWithdrawalDetail'),
    path: '/w/:id',
    entry: '/w/1',
  },
  {
    name: 'AdminPromocodeStats',
    load: () => import('./AdminPromocodeStats'),
    path: '/p/:id',
    entry: '/p/1',
  },
  {
    name: 'AdminLandingStats',
    load: () => import('./AdminLandingStats'),
    path: '/l/:id',
    entry: '/l/1',
  },
  {
    name: 'AdminPartnerDetail',
    load: () => import('./AdminPartnerDetail'),
    path: '/pt/:userId',
    entry: '/pt/1',
  },
  {
    name: 'AdminRemnawaveSquadDetail',
    load: () => import('./AdminRemnawaveSquadDetail'),
    path: '/s/:uuid',
    entry: '/s/abc',
  },
  { name: 'Subscriptions', load: () => import('./Subscriptions') },
  { name: 'SavedCards', load: () => import('./SavedCards') },
  { name: 'ConnectedAccounts', load: () => import('./ConnectedAccounts') },
  { name: 'Dashboard', load: () => import('./Dashboard') },
  { name: 'Connection', load: () => import('./Connection') },
  { name: 'SubscriptionPurchase', load: () => import('./SubscriptionPurchase') },
  { name: 'Wheel', load: () => import('./Wheel') },
  { name: 'CouponStatus', load: () => import('./CouponStatus') },
  { name: 'AdminNews', load: () => import('./AdminNews') },
  { name: 'AdminInfoPages', load: () => import('./AdminInfoPages') },
  { name: 'AdminEmailTemplates', load: () => import('./AdminEmailTemplates') },
  { name: 'AdminUpdates', load: () => import('./AdminUpdates') },
  { name: 'AdminDashboard', load: () => import('./AdminDashboard') },
  { name: 'AdminBanSystem', load: () => import('./AdminBanSystem') },
  { name: 'AdminChannelSubscriptions', load: () => import('./AdminChannelSubscriptions') },
  { name: 'AdminWheel', load: () => import('./AdminWheel') },
  { name: 'AdminLegalPages', load: () => import('./AdminLegalPages') },
  {
    name: 'AdminPromoGroupCreate',
    load: () => import('./AdminPromoGroupCreate'),
    path: '/pg/:id',
    entry: '/pg/1',
  },
  {
    name: 'AdminPromocodeCreate',
    load: () => import('./AdminPromocodeCreate'),
    path: '/pc/:id',
    entry: '/pc/1',
  },
  {
    name: 'AdminTariffCreate',
    load: () => import('./AdminTariffCreate'),
    path: '/tc/:id',
    entry: '/tc/1',
  },
  {
    name: 'AdminNewsCreate',
    load: () => import('./AdminNewsCreate'),
    path: '/n/:id',
    entry: '/n/1',
  },
  {
    name: 'AdminInfoPageEditor',
    load: () => import('./AdminInfoPageEditor'),
    path: '/i/:id',
    entry: '/i/1',
  },
  {
    name: 'AdminCampaignEdit',
    load: () => import('./AdminCampaignEdit'),
    path: '/ce/:id',
    entry: '/ce/1',
  },
  {
    name: 'AdminCampaignStats',
    load: () => import('./AdminCampaignStats'),
    path: '/cs/:id',
    entry: '/cs/1',
  },
  {
    name: 'AdminPolicyEdit',
    load: () => import('./AdminPolicyEdit'),
    path: '/pe/:id',
    entry: '/pe/1',
  },
  { name: 'AdminRoleEdit', load: () => import('./AdminRoleEdit'), path: '/re/:id', entry: '/re/1' },
  {
    name: 'AdminServerEdit',
    load: () => import('./AdminServerEdit'),
    path: '/se/:id',
    entry: '/se/1',
  },
  {
    name: 'AdminPaymentMethodEdit',
    load: () => import('./AdminPaymentMethodEdit'),
    path: '/pm/:id',
    entry: '/pm/1',
  },
  { name: 'AdminPromoOfferSend', load: () => import('./AdminPromoOfferSend') },
  {
    name: 'AdminPromoOfferTemplateEdit',
    load: () => import('./AdminPromoOfferTemplateEdit'),
    path: '/pt/:id',
    entry: '/pt/1',
  },
  {
    name: 'AdminUserDetail',
    load: () => import('./AdminUserDetail'),
    path: '/u/:id',
    entry: '/u/1',
  },
  {
    name: 'MergeAccounts',
    load: () => import('./MergeAccounts'),
    path: '/m/:mergeToken',
    entry: '/m/tok',
  },
  { name: 'NewsArticle', load: () => import('./NewsArticle'), path: '/na/:slug', entry: '/na/x' },
  { name: 'InfoPageView', load: () => import('./InfoPageView'), path: '/ip/:slug', entry: '/ip/x' },
  { name: 'GiftClaim', load: () => import('./GiftClaim'), path: '/g/:code', entry: '/g/x' },
];

describe('состояния загрузки страниц', () => {
  for (const { name, load, path, entry } of PAGES) {
    it(`${name} рисует скелетон, а не спиннер и не пустоту`, async () => {
      const { default: Page } = await load();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      });
      render(
        <QueryClientProvider client={queryClient}>
          <PlatformProvider>
            <ToastProvider>
              <MemoryRouter initialEntries={[entry ?? '/']}>
                {path ? (
                  <Routes>
                    <Route path={path} element={<Page />} />
                  </Routes>
                ) : (
                  <Page />
                )}
              </MemoryRouter>
            </ToastProvider>
          </PlatformProvider>
        </QueryClientProvider>,
      );

      const groups = screen.getAllByRole('status');
      expect(groups.length).toBeGreaterThanOrEqual(1);
      expect(groups[0].getAttribute('aria-busy')).toBe('true');

      // Плейсхолдеры примитива, а не инлайновая разметка. Заливку иногда
      // перекрывает вызывающая сторона (стеклянные карточки Subscriptions),
      // поэтому проверяем сам факт плейсхолдеров.
      expect(groups[0].querySelectorAll('span').length).toBeGreaterThan(0);

      // Внутри области загрузки спиннера быть не должно. Снаружи — можно:
      // кнопка «обновить» имеет право крутиться во время рефетча.
      expect(groups[0].querySelectorAll('.animate-spin')).toHaveLength(0);
    });
  }
});
