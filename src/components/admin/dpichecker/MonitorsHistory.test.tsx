// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { ActionOut, Monitor } from '@/api/dpichecker';
import { usePermissionStore } from '@/store/permissions';
import { HistoryTab } from './HistoryTab';
import { MonitorsTab } from './MonitorsTab';
import { renderWithProviders } from './testUtils';

/**
 * Мониторы: свои — пауза и отключение, созданные на сайте — только чтение, подпись про админ-чат.
 * История как на сайте: у фильтров счётчики, у строки — имя админа и статус цветом; «только мои» уходят
 * в запрос, строка ведёт к результату. «Потрачено по админам» убрано (владелец 24.09).
 */

vi.mock('react-i18next', async () => (await import('./testUtils')).i18nMock());

const api = vi.hoisted(() => ({
  listMonitors: vi.fn(),
  patchMonitor: vi.fn(),
  deleteMonitor: vi.fn(),
  monitorRuns: vi.fn(),
  listChecks: vi.fn(),
}));
vi.mock('@/api/dpichecker', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/dpichecker')>()),
  dpicheckerApi: api,
}));
const navigate = vi.fn();
vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useNavigate: () => navigate,
}));

const MONITOR: Monitor = {
  id: 77,
  check_type: 'ip',
  location: 'russia',
  pop_ids: [1, 2],
  resources: [],
  interval_hours: 6,
  is_active: true,
  paused_reason: null,
  notify_on_success: false,
  alert_after_fails: 2,
  last_status: 'up',
  last_checked_at: '2026-09-24T08:49:05Z',
  consecutive_fails: 0,
  next_run_at: '2026-09-24T09:29:09Z',
  created_at: '2026-09-24T08:29:09Z',
  action_id: 3,
  label: 'Finland',
};
const FOREIGN: Monitor = { ...MONITOR, id: 99, action_id: null, label: null };
const ACTION: ActionOut = {
  id: 11,
  kind: 'check',
  check_type: 'vpn',
  remote_id: 5286,
  status: 'completed',
  admin_user_id: 7,
  location: 'russia',
  pop_count: 97,
  resource_count: 5,
  source: 'panel_subscription',
  source_ref: 'su',
  label: 'Моя подписка',
  target_names: ['Finland'],
  cost_usd: 1.746,
  refunded_usd: null,
  error_code: null,
  created_at: '2026-09-24T06:25:52Z',
  admin_name: 'Егор',
};

beforeEach(() => {
  usePermissionStore.setState({ permissions: ['dpichecker:*'], isLoaded: true });
  api.listMonitors.mockResolvedValue([MONITOR, FOREIGN]);
  api.patchMonitor.mockResolvedValue({ ...MONITOR, is_active: false });
  api.listChecks.mockResolvedValue({
    items: [ACTION],
    total: 1,
    counts: { all: 20, vpn: 18, ip: 1, mtproto: 1, noisy: 0, probe: 0 },
  });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it('свой монитор ставится на паузу, чужой — только чтение', async () => {
  renderWithProviders(<MonitorsTab />);
  expect(await screen.findByText('Finland')).toBeTruthy();
  expect(screen.getByText(/Создан на сайте DPI\/\/CHECKER/)).toBeTruthy();
  expect(screen.getByText(/админ-чат/)).toBeTruthy();
  const toggles = screen.getAllByRole('switch', { name: /Монитор активен/ });
  expect(toggles).toHaveLength(1);
  fireEvent.click(toggles[0]);
  await waitFor(() => expect(api.patchMonitor).toHaveBeenCalledWith(3, { is_active: false }));
});

it('без права запуска у мониторов нет управления', async () => {
  usePermissionStore.setState({ permissions: ['dpichecker:read'], isLoaded: true });
  renderWithProviders(<MonitorsTab />);
  await screen.findByText('Finland');
  expect(screen.queryByRole('switch', { name: /Монитор активен/ })).toBeNull();
  expect(screen.queryByRole('button', { name: /Отключить/ })).toBeNull();
});

it('история: фильтр вида и «только мои» — в запрос, строка ведёт к результату', async () => {
  renderWithProviders(<HistoryTab />);
  expect(await screen.findByText('Моя подписка')).toBeTruthy();
  expect(screen.getByText(/1\.7460 USD/)).toBeTruthy();
  fireEvent.click(screen.getByRole('radio', { name: /^IP \/ домен/ }));
  await waitFor(() =>
    expect(api.listChecks).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: 'check', check_type: 'ip' }),
    ),
  );
  fireEvent.click(screen.getByRole('switch', { name: /Только мои/ }));
  await waitFor(() =>
    expect(api.listChecks).toHaveBeenLastCalledWith(expect.objectContaining({ mine: true })),
  );
  fireEvent.click(await screen.findByText('Моя подписка'));
  expect(navigate).toHaveBeenCalledWith('/admin/dpichecker?tab=history&check=11');
});

it('история: у фильтров счётчики, у строки имя админа и итог; трат по админам нет', async () => {
  renderWithProviders(<HistoryTab />);
  expect(await screen.findByText('Егор')).toBeTruthy();
  expect(screen.queryByText(/админ #7/)).toBeNull();
  expect(screen.getByRole('radio', { name: /VPN\D*18/ })).toBeTruthy();
  expect(screen.getByRole('radio', { name: /Все\D*20/ })).toBeTruthy();
  expect(screen.getByText('5 рес.')).toBeTruthy();
  expect(screen.getByText('Готово')).toBeTruthy();
  expect(screen.queryByText(/Потрачено по админам/)).toBeNull();
});
