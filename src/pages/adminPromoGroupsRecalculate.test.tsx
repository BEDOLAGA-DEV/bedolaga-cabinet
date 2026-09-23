// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/Toast';
import { PlatformProvider } from '@/platform/PlatformProvider';
import { usePermissionStore } from '@/store/permissions';

/**
 * «Пересчитать участников» в разделе «Группы скидок».
 *
 * Бот раздаёт группы по тратам только в момент оплаты; после того как оператор
 * пересобрал группы, тысячи людей остаются в базовой. Кнопка ставит пересчёт
 * в фон, страница опрашивает состояние, пока идёт проход, и по окончании сама
 * обновляет счётчики участников и говорит, сколько человек переназначено.
 */

import ruLocale from '@/locales/ru.json';

function resolveRu(key: string): string | undefined {
  const value = key
    .split('.')
    .reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], ruLocale);
  return typeof value === 'string' ? value : undefined;
}

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      (resolveRu(key) ?? key).replace(/{{(\w+)}}/g, (_m, name) => String(options?.[name] ?? '')),
    i18n: { language: 'ru', changeLanguage: () => Promise.resolve() },
  }),
  Trans: ({ children }: { children?: unknown }) => children ?? null,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

vi.mock('./adminPromoGroups/pollInterval', () => ({
  RECALCULATION_POLL_MS: 20,
}));

type Status = {
  running: boolean;
  queued: boolean;
  reason: string | null;
  started: boolean;
  last: {
    reason: string;
    checked: number;
    changed: number;
    failed: number;
    error: string | null;
  } | null;
};

const idle: Status = {
  running: false,
  queued: false,
  reason: null,
  started: false,
  last: null,
};
const finished: Status = {
  ...idle,
  last: {
    reason: 'запущен из кабинета',
    checked: 5913,
    changed: 42,
    failed: 0,
    error: null,
  },
};

const api = {
  listCalls: 0,
  startCalls: 0,
  statuses: [] as Status[],
};

vi.mock('@/api/promocodes', () => ({
  promocodesApi: {
    getPromoGroups: () => {
      api.listCalls += 1;
      return Promise.resolve({
        items: [
          {
            id: 1,
            name: 'Путник',
            server_discount_percent: 0,
            traffic_discount_percent: 0,
            device_discount_percent: 0,
            period_discounts: {},
            auto_assign_total_spent_kopeks: null,
            apply_discounts_to_addons: true,
            is_default: true,
            members_count: 5913,
            created_at: null,
            updated_at: null,
          },
        ],
        total: 1,
        limit: 100,
        offset: 0,
      });
    },
    recalculatePromoGroups: () => {
      api.startCalls += 1;
      return Promise.resolve({
        ...idle,
        running: true,
        started: true,
        reason: 'запущен из кабинета',
      });
    },
    getPromoGroupRecalculation: () => {
      const next = api.statuses.length > 1 ? api.statuses.shift() : api.statuses[0];
      return Promise.resolve(next ?? idle);
    },
    deletePromoGroup: () => Promise.resolve(),
  },
}));

import AdminPromoGroups from './AdminPromoGroups';

beforeEach(() => {
  api.listCalls = 0;
  api.startCalls = 0;
  api.statuses = [idle];
  usePermissionStore.setState({
    permissions: ['promo_groups:*'],
    isLoaded: true,
  });
});

afterEach(() => {
  cleanup();
});

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <PlatformProvider>
      <QueryClientProvider client={client}>
        <ToastProvider>
          <MemoryRouter>
            <AdminPromoGroups />
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    </PlatformProvider>,
  );
}

const label = resolveRu('admin.promoGroups.recalculate') as string;
const progress = resolveRu('admin.promoGroups.recalculating') as string;

it('кнопка ставит пересчёт, страница ждёт конца, обновляет список и говорит итог', async () => {
  // Первый опрос после старта — идёт; следующий — закончился с итогом.
  api.statuses = [idle, { ...idle, running: true }, finished];
  renderPage();

  const button = await screen.findByRole('button', { name: label });
  await waitFor(() => expect(api.listCalls).toBe(1));

  fireEvent.click(button);

  await waitFor(() => expect(api.startCalls).toBe(1));
  expect(await screen.findByText(progress)).toBeTruthy();

  await waitFor(() => expect(screen.queryByText(progress)).toBeNull(), {
    timeout: 3000,
  });
  await waitFor(() => expect(api.listCalls).toBeGreaterThanOrEqual(2));
  expect(
    await screen.findByText(
      (resolveRu('admin.promoGroups.recalculateDone') as string)
        .replace('{{checked}}', '5913')
        .replace('{{changed}}', '42'),
    ),
  ).toBeTruthy();
});

it('пересчёт, запущенный не отсюда (правка группы), тоже виден и доводится до конца', async () => {
  api.statuses = [{ ...idle, running: true, reason: 'создана группа' }, finished];
  renderPage();

  expect(await screen.findByText(progress)).toBeTruthy();
  await waitFor(() => expect(screen.queryByText(progress)).toBeNull(), {
    timeout: 3000,
  });
  await waitFor(() => expect(api.listCalls).toBeGreaterThanOrEqual(2));
  expect(api.startCalls).toBe(0);
});

it('без права на правку групп кнопки нет', async () => {
  usePermissionStore.setState({
    permissions: ['promo_groups:read'],
    isLoaded: true,
  });
  renderPage();

  await screen.findByText('Путник');
  expect(screen.queryByRole('button', { name: label })).toBeNull();
});
