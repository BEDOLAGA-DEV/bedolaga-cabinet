// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { PlatformProvider } from '@/platform/PlatformProvider';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Страница открывается по `system_errors:read`, а повторная доставка на бэкенде
 * требует `system_errors:manage`. Две ловушки, которые тут и держатся:
 *
 * 1. Кнопка, показанная админу с доступом только на чтение, — это гарантированный
 *    403; без гейта он жмёт и не понимает, почему ничего не происходит.
 * 2. Эндпоинт повтора отдаёт 200 и при неудачной отправке: он ловит сбой, пишет
 *    статус `failed` и всё равно возвращает запись. Судить об исходе по коду
 *    ответа нельзя — только по `delivery_status`.
 */

import type { DeliveryStatus } from '../api/adminSystemErrors';
import ruLocale from '@/locales/ru.json';

function resolveRu(key: string): string | undefined {
  const value = key
    .split('.')
    .reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], ruLocale);
  return typeof value === 'string' ? value : undefined;
}

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    // Ключа нет в ru.json — отдаём сам ключ: забытый перевод виден в тесте.
    t: (key: string) => resolveRu(key) ?? key,
    i18n: { language: 'ru', changeLanguage: () => Promise.resolve() },
  }),
}));

const notifications: { success: string[]; error: string[] } = { success: [], error: [] };

// Подменяем ТОЛЬКО useNotify: остальной platform нужен живым — AdminBackButton
// внутри страницы дёргает usePlatform().
vi.mock('@/platform', async () => {
  const actual = await vi.importActual<typeof import('@/platform')>('@/platform');
  return {
    ...actual,
    useNotify: () => ({
      success: (message: string) => notifications.success.push(message),
      error: (message: string) => notifications.error.push(message),
      info: () => {},
      warning: () => {},
    }),
  };
});

const granted = new Set<string>();

vi.mock('@/store/permissions', () => ({
  usePermissionStore: (selector: (state: unknown) => unknown) =>
    selector({
      hasPermission: (perm: string) => granted.has(perm),
      hasAnyPermission: (...perms: string[]) => perms.some((p) => granted.has(p)),
      hasAllPermissions: (...perms: string[]) => perms.every((p) => granted.has(p)),
    }),
}));

const ITEM = {
  id: 7,
  created_at: '2026-08-28T12:00:00Z',
  level: 'error',
  logger_name: 'app.services.x',
  event: 'Panel unreachable',
  error_type: 'ConnectionError',
  user_id: null,
  delivery_status: 'failed' as const,
  delivery_attempts: 1,
  delivered_at: null,
  has_traceback: true,
};

type RetryResult = Omit<typeof ITEM, 'delivery_status'> & {
  delivery_status: DeliveryStatus;
  delivery_error: string | null;
};
const retryResult: { value: RetryResult } = {
  value: { ...ITEM, delivery_status: 'sent', delivery_error: null },
};

vi.mock('../api/adminSystemErrors', async () => {
  const actual = await vi.importActual<typeof import('../api/adminSystemErrors')>(
    '../api/adminSystemErrors',
  );
  return {
    ...actual,
    adminSystemErrorsApi: {
      getSummary: () =>
        Promise.resolve({
          undelivered_total: 1,
          last_24h: 1,
          last_7d: 1,
          by_status_7d: {},
          top_errors_7d: [],
        }),
      getAll: () => Promise.resolve({ items: [ITEM], total: 1, limit: 50, offset: 0 }),
      getOne: () => Promise.resolve({ ...ITEM, traceback: null, context: null }),
      retry: () => Promise.resolve(retryResult.value),
    },
  };
});

import AdminSystemErrors from './AdminSystemErrors';

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <PlatformProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <AdminSystemErrors />
        </MemoryRouter>
      </QueryClientProvider>
    </PlatformProvider>,
  );
}

const retryLabel = resolveRu('admin.systemErrors.detail.retry') as string;

async function openFirstRow() {
  const row = await screen.findByText(ITEM.event);
  fireEvent.click(row);
}

beforeEach(() => {
  granted.clear();
  notifications.success = [];
  notifications.error = [];
  retryResult.value = { ...ITEM, delivery_status: 'sent', delivery_error: null };
});

afterEach(cleanup);

describe('кнопка повторной доставки', () => {
  it('скрыта без system_errors:manage', async () => {
    granted.add('system_errors:read');
    renderPage();
    await openFirstRow();

    expect(screen.queryByText(retryLabel)).toBeNull();
  });

  it('показана с system_errors:manage', async () => {
    granted.add('system_errors:read');
    granted.add('system_errors:manage');
    renderPage();
    await openFirstRow();

    expect(await screen.findByText(retryLabel)).toBeTruthy();
  });
});

describe('исход повторной доставки', () => {
  beforeEach(() => {
    granted.add('system_errors:read');
    granted.add('system_errors:manage');
  });

  it('доставлено — сообщаем об успехе', async () => {
    renderPage();
    await openFirstRow();
    fireEvent.click(await screen.findByText(retryLabel));

    await waitFor(() => expect(notifications.success.length).toBe(1));
    expect(notifications.error).toEqual([]);
  });

  it('ответ 200 со статусом failed — это НЕ успех', async () => {
    retryResult.value = {
      ...ITEM,
      delivery_status: 'failed',
      delivery_error: 'Telegram недоступен',
    };
    renderPage();
    await openFirstRow();
    fireEvent.click(await screen.findByText(retryLabel));

    await waitFor(() => expect(notifications.error).toEqual(['Telegram недоступен']));
    expect(notifications.success).toEqual([]);
  });
});
