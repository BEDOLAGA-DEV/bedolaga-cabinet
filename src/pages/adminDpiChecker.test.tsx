// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { DpiStatus } from '@/api/dpichecker';
import { ToastProvider } from '@/components/Toast';
import ruLocale from '@/locales/ru.json';
import { PlatformProvider } from '@/platform/PlatformProvider';
import { usePermissionStore } from '@/store/permissions';

/**
 * Раздел DPI//CHECKER: без ключа — подсказка, где взять ключ, и путь в настройки; вкладка из адреса;
 * без права запуска — ни одной кнопки, которая тратит деньги.
 */

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

const api = vi.hoisted(() => ({ status: null as unknown }));

vi.mock('@/api/dpichecker', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/dpichecker')>();
  return {
    ...original,
    dpicheckerApi: {
      getStatus: vi.fn(async () => api.status),
      getPops: vi.fn(async () => ({ pops: [], groups: { districts: [], republics: [] } })),
      getOptimal: vi.fn(async () => []),
      listChecks: vi.fn(async () => ({ items: [], total: 0 })),
      listMonitors: vi.fn(async () => []),
      spend: vi.fn(async () => []),
    },
  };
});

const READY: DpiStatus = {
  enabled: true,
  configured: true,
  balance: 53.5052,
  total_spent: 49.49,
  noisy: { limit: 10, used: 1, remaining: 9, unlimited: false, resets_at: null },
  monitors: { active: 0, limit: 50 },
  webhook_ready: true,
  error: null,
};

async function renderPage(path: string) {
  const { default: AdminDpiChecker } = await import('./AdminDpiChecker');
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <PlatformProvider>
      <QueryClientProvider client={client}>
        <ToastProvider>
          <MemoryRouter initialEntries={[path]}>
            <AdminDpiChecker />
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    </PlatformProvider>,
  );
}

beforeEach(() => {
  api.status = READY;
  usePermissionStore.setState({ permissions: ['dpichecker:*'], isLoaded: true });
});

afterEach(() => cleanup());

it('без ключа объясняет, где его взять, и ведёт в настройки раздела', async () => {
  api.status = { ...READY, configured: false, balance: null, noisy: null, monitors: null };
  await renderPage('/admin/dpichecker');
  expect(await screen.findByText(/Главное меню → API/)).toBeTruthy();
  const link = screen.getByRole('link', { name: /Открыть настройки/ });
  expect(link.getAttribute('href')).toBe('/admin/settings?section=sys_dpichecker');
  expect(screen.queryByRole('tablist')).toBeNull();
});

it('показывает баланс и остаток Соседей, вкладки — все восемь', async () => {
  await renderPage('/admin/dpichecker');
  expect(await screen.findByText('53.51 USD')).toBeTruthy();
  expect(screen.getByText(/9 из 10/)).toBeTruthy();
  expect(screen.getAllByRole('tab')).toHaveLength(8);
});

it('вкладка из адреса выбрана', async () => {
  await renderPage('/admin/dpichecker?tab=history');
  const tab = await screen.findByRole('tab', { name: /История/ });
  expect(tab.getAttribute('aria-selected')).toBe('true');
});

it('неверный ключ — текст бота над вкладками', async () => {
  api.status = {
    ...READY,
    balance: null,
    error: 'Ключ API DPI//CHECKER неверный — проверьте его в настройках',
  };
  await renderPage('/admin/dpichecker');
  expect(await screen.findByText(/Ключ API DPI\/\/CHECKER неверный/)).toBeTruthy();
});

it('без права запуска нет кнопки «Пополнить»', async () => {
  usePermissionStore.setState({ permissions: ['dpichecker:read'], isLoaded: true });
  await renderPage('/admin/dpichecker?tab=ip');
  await screen.findByText('53.51 USD');
  expect(screen.queryByRole('button', { name: /Пополнить/ })).toBeNull();
});
