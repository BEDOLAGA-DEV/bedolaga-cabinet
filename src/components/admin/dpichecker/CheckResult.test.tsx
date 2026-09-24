// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { ActionOut, CheckView } from '@/api/dpichecker';
import { usePermissionStore } from '@/store/permissions';
import { CheckResult } from './CheckResult';
import { renderWithProviders } from './testUtils';

/**
 * Результат проверки: в очереди — «Отменить» с возвратом; идёт — «сделано из»; готово — сводка
 * «Доступно / Частично / Недоступно / Средняя задержка» и ресурсы по имени; сервис не ответил —
 * «Спросить ещё раз». Ключи на экран не попадают.
 */

vi.mock('react-i18next', async () => (await import('./testUtils')).i18nMock());

const api = vi.hoisted(() => ({
  views: [] as unknown[],
  cancelCheck: vi.fn(),
  resubmit: vi.fn(),
  checkMap: vi.fn(),
  popsFail: false,
}));

vi.mock('@/api/dpichecker', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/dpichecker')>();
  return {
    ...original,
    dpicheckerApi: {
      getCheck: vi.fn(async () => (api.views.length > 1 ? api.views.shift() : api.views[0])),
      cancelCheck: api.cancelCheck,
      resubmit: api.resubmit,
      downloadLink: vi.fn(),
      checkMap: api.checkMap,
      getPops: vi.fn(async () => {
        if (api.popsFail) throw new Error('pops down');
        return {
          pops: [
            {
              id: 1,
              location: 'russia',
              region: 'Алтайский край',
              operator: null,
              is_healthy: true,
            },
            {
              id: 2,
              location: 'russia',
              region: 'Амурская обл.',
              operator: null,
              is_healthy: true,
            },
          ],
          groups: { districts: [], republics: [] },
        };
      }),
    },
  };
});

vi.mock('./pollInterval', () => ({ CHECK_POLL_MS: 10, CHECK_WAIT_SEC: 1 }));

const ACTION: ActionOut = {
  id: 11,
  kind: 'check',
  check_type: 'vpn',
  remote_id: 5286,
  status: 'pending',
  admin_user_id: 1,
  location: 'russia',
  pop_count: 10,
  resource_count: 1,
  source: 'paste',
  source_ref: null,
  label: 'Finland',
  target_names: ['Finland'],
  cost_usd: 0.1,
  refunded_usd: null,
  error_code: null,
  created_at: '2026-09-24T06:25:52Z',
};

const view = (over: Partial<CheckView>): CheckView => ({
  id: 5286,
  status: 'pending',
  check_type: 'vpn',
  location: 'russia',
  usd_cost: 0.1,
  created_at: '2026-09-24T06:25:52Z',
  started_at: null,
  completed_at: null,
  progress: {},
  summary: { available: 0, partial: 0, unavailable: 0, avg_latency_ms: null },
  resources: [],
  ...over,
});

const DONE = view({
  status: 'completed',
  progress: { done: 10, total: 10, percent: 100 },
  summary: { available: 0, partial: 1, unavailable: 0, avg_latency_ms: 1825 },
  resources: [
    {
      index: 0,
      name: '🇫🇮 Finland',
      value: null,
      server_ip: null,
      total: 2,
      ok_count: 1,
      direct: { ok: true, latency_ms: 636, error_code: null },
      rows: [
        {
          pop_id: 1,
          region: 'Алтайский край',
          ok: true,
          latency_ms: 2792,
          speeds: [{ host: 'instagram.com', mbps: 0.16 }],
          error: null,
          reason: null,
          verdict: null,
          error_code: null,
          port_story: null,
          mode: null,
          internet_ok: null,
          proxy_dead: false,
        },
        {
          pop_id: 2,
          region: 'Амурская обл.',
          ok: false,
          latency_ms: null,
          speeds: [],
          error: 'curl exit 28 (соединение не установлено)',
          reason: null,
          verdict: null,
          error_code: null,
          port_story: null,
          mode: null,
          internet_ok: true,
          proxy_dead: false,
        },
      ],
    },
  ],
});

beforeEach(() => {
  usePermissionStore.setState({ permissions: ['dpichecker:*'], isLoaded: true });
});

afterEach(() => {
  cleanup();
  api.views = [];
  api.popsFail = false;
  vi.clearAllMocks();
});

it('в очереди — можно отменить, возврат словами', async () => {
  api.views = [{ action: ACTION, check: view({ status: 'pending' }) }];
  api.cancelCheck.mockResolvedValue({ ...ACTION, status: 'cancelled', refunded_usd: 0.1 });
  renderWithProviders(<CheckResult actionId={11} />);
  fireEvent.click(await screen.findByRole('button', { name: /Отменить/ }));
  await waitFor(() => expect(api.cancelCheck).toHaveBeenCalledWith(11));
  expect(await screen.findByText(/Вернули 0\.1000 USD/)).toBeTruthy();
});

it('идёт — прогресс, потом готовый результат сам', async () => {
  api.views = [
    {
      action: { ...ACTION, status: 'active' },
      check: view({ status: 'active', progress: { done: 3, total: 10, percent: 30 } }),
    },
    { action: { ...ACTION, status: 'completed' }, check: DONE },
  ];
  renderWithProviders(<CheckResult actionId={11} />);
  expect(await screen.findByText(/3 из 10/)).toBeTruthy();
  expect(await screen.findByText('🇫🇮 Finland')).toBeTruthy();
  expect(screen.getByText(/1 из 2 доступно/)).toBeTruthy();
  expect(screen.getByText('1825 мс')).toBeTruthy();
  expect(screen.getByText(/Из-за границы: доступен · 636 мс/)).toBeTruthy();
  expect(screen.getByText(/соединение не установлено/)).toBeTruthy();
  expect(document.body.innerHTML).not.toContain('vless://');
});

it('сервис не ответил — «Спросить ещё раз» тем же ключом', async () => {
  api.views = [
    {
      action: { ...ACTION, status: 'unknown', remote_id: null },
      check: view({ status: 'unknown', id: null }),
    },
  ];
  api.resubmit.mockResolvedValue({ ...ACTION, status: 'pending' });
  renderWithProviders(<CheckResult actionId={11} />);
  fireEvent.click(await screen.findByRole('button', { name: /Спросить ещё раз/ }));
  await waitFor(() => expect(api.resubmit).toHaveBeenCalledWith(11));
});

it('Россия — карта регионов сразу, без кнопки «Карта»', async () => {
  api.views = [{ action: { ...ACTION, status: 'completed' }, check: DONE }];
  const { container } = renderWithProviders(<CheckResult actionId={11} />);
  await waitFor(() =>
    expect(container.querySelector('[data-region="ALT"]')?.getAttribute('data-status')).toBe(
      'green',
    ),
  );
  expect(container.querySelector('[data-region="AMU"]')?.getAttribute('data-status')).toBe('red');
  expect(screen.queryByRole('button', { name: 'Карта' })).toBeNull();
  expect(api.checkMap).not.toHaveBeenCalled();
  // CSV — в шапке результата, а не отдельной строкой между картой и списком.
  const header = screen.getByRole('heading', { level: 2 }).closest('header') as HTMLElement;
  expect(header.querySelector('button')?.textContent).toMatch(/CSV/);
});

it('Китай и другие страны — картинка карты от сервиса сразу', async () => {
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:map');
  globalThis.URL.revokeObjectURL = vi.fn();
  api.checkMap.mockResolvedValue(new Blob(['png'], { type: 'image/png' }));
  api.views = [{ action: { ...ACTION, status: 'completed', location: 'china' }, check: DONE }];
  renderWithProviders(<CheckResult actionId={11} />);
  const image = await screen.findByRole('img', { name: 'Карта' });
  expect(image.getAttribute('src')).toBe('blob:map');
  expect(api.checkMap).toHaveBeenCalledWith(11);
});

it('справочник точек не пришёл — не серая «непроверенная» карта, а картинка сервиса', async () => {
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:map');
  globalThis.URL.revokeObjectURL = vi.fn();
  api.popsFail = true;
  api.checkMap.mockResolvedValue(new Blob(['png'], { type: 'image/png' }));
  api.views = [{ action: { ...ACTION, status: 'completed' }, check: DONE }];
  const { container } = renderWithProviders(<CheckResult actionId={11} />);
  expect(await screen.findByRole('img', { name: 'Карта' })).toBeTruthy();
  expect(container.querySelector('[data-region]')).toBeNull();
});
