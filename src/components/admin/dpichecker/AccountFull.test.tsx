// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { ActionOut, Monitor, RemoteRun } from '@/api/dpichecker';
import { usePermissionStore } from '@/store/permissions';
import { HistoryTab } from './HistoryTab';
import { MonitorsTab } from './MonitorsTab';
import { renderWithProviders } from './testUtils';

/**
 * API DPI//CHECKER целиком: в истории — весь аккаунт (запуски с сайта, из их бота, через API, прогоны
 * мониторов), любой открывается как свой; журнал доставки уведомлений боту; у монитора — прогоны
 * (каждый открывается), правка интервала/порога/«сообщать об успехе» и код привязки группы.
 */

vi.mock('react-i18next', async () => (await import('./testUtils')).i18nMock());

const api = vi.hoisted(() => ({
  listMonitors: vi.fn(),
  adoptMonitor: vi.fn(),
  patchMonitor: vi.fn(),
  deleteMonitor: vi.fn(),
  monitorRuns: vi.fn(),
  listChecks: vi.fn(),
  accountRuns: vi.fn(),
  openRemote: vi.fn(),
  webhookDeliveries: vi.fn(),
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
  notify: 'dm',
  group_linked: false,
  link_code: null,
  last_status: 'up',
  last_checked_at: '2026-09-24T08:49:05Z',
  consecutive_fails: 0,
  next_run_at: '2026-09-24T09:29:09Z',
  created_at: '2026-09-24T08:29:09Z',
  action_id: 3,
  label: 'Finland',
  deleted: false,
};
const ACTION: ActionOut = {
  id: 11,
  kind: 'check',
  check_type: 'vpn',
  remote_id: 5286,
  status: 'completed',
  admin_user_id: null,
  location: 'russia',
  pop_count: 97,
  resource_count: 5,
  source: 'site',
  source_ref: 'web',
  label: 'Germany',
  target_names: ['Germany'],
  cost_usd: 1.746,
  refunded_usd: null,
  error_code: null,
  created_at: '2026-09-24T06:25:52Z',
};
const SITE_RUN: RemoteRun = {
  id: 5197,
  status: 'completed',
  check_type: 'ip',
  location: 'russia',
  usd_cost: 0.388,
  source: 'web',
  resource_count: 1,
  pop_count: 97,
  created_at: '2026-09-23T18:15:57Z',
  completed_at: '2026-09-23T18:18:18Z',
  action_id: null,
};
const OWN_RUN: RemoteRun = { ...SITE_RUN, id: 5286, source: 'api', usd_cost: 1.94, action_id: 11 };

beforeEach(() => {
  usePermissionStore.setState({ permissions: ['dpichecker:*'], isLoaded: true });
  api.listMonitors.mockResolvedValue([MONITOR]);
  api.patchMonitor.mockImplementation(async (_id: number, body: object) => ({
    ...MONITOR,
    ...body,
  }));
  api.monitorRuns.mockResolvedValue({
    items: [
      {
        id: 901,
        check_id: 5400,
        status: 'completed',
        cost: 0.39,
        scheduled_for: '2026-09-24T09:00:00Z',
        created_at: '2026-09-24T09:00:05Z',
        check_status: 'completed',
        completed_at: '2026-09-24T09:02:00Z',
      },
    ],
    total: 1,
  });
  api.listChecks.mockResolvedValue({ items: [ACTION], total: 1, counts: { all: 1 } });
  api.accountRuns.mockResolvedValue({ items: [SITE_RUN, OWN_RUN], total: 2 });
  api.openRemote.mockResolvedValue({ ...ACTION, id: 42 });
  api.webhookDeliveries.mockResolvedValue({
    items: [
      {
        id: 8,
        event: 'check.completed',
        object_type: 'check',
        object_id: 5413,
        status: 'delivered',
        attempts: 1,
        response_code: 200,
        last_error: null,
        created_at: '2026-09-24T15:21:15Z',
        delivered_at: '2026-09-24T15:21:15Z',
        next_attempt_at: null,
      },
    ],
    total: 1,
  });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it('история «Весь аккаунт»: запуски с сайта видны и открываются как свои', async () => {
  renderWithProviders(<HistoryTab />);
  fireEvent.click(await screen.findByRole('radio', { name: 'Весь аккаунт' }));
  await waitFor(() => expect(api.accountRuns).toHaveBeenCalledWith('check', expect.anything()));
  expect(await screen.findByText('Сайт')).toBeTruthy();
  expect(screen.getByText(/0\.3880 USD/)).toBeTruthy();
  fireEvent.click(screen.getByText('#5197'));
  await waitFor(() => expect(api.openRemote).toHaveBeenCalledWith('check', 5197));
  await waitFor(() =>
    expect(navigate).toHaveBeenCalledWith('/admin/dpichecker?tab=history&check=42'),
  );
});

it('история «Весь аккаунт»: уже открытый запуск ведёт к своей строке без повторного взятия', async () => {
  renderWithProviders(<HistoryTab />);
  fireEvent.click(await screen.findByRole('radio', { name: 'Весь аккаунт' }));
  fireEvent.click(await screen.findByText('#5286'));
  expect(navigate).toHaveBeenCalledWith('/admin/dpichecker?tab=history&check=11');
  expect(api.openRemote).not.toHaveBeenCalled();
});

it('история «Весь аккаунт»: вид «Зонд» — свой запрос, открытие ведёт к скану', async () => {
  api.accountRuns.mockResolvedValue({
    items: [
      { ...SITE_RUN, id: 88, check_type: undefined, cidr: '198.51.100.0/24', usd_cost: 1.0331 },
    ],
    total: 1,
  });
  api.openRemote.mockResolvedValue({ ...ACTION, id: 50, kind: 'probe' });
  renderWithProviders(<HistoryTab />);
  fireEvent.click(await screen.findByRole('radio', { name: 'Весь аккаунт' }));
  fireEvent.click(await screen.findByRole('radio', { name: /^Зонд/ }));
  await waitFor(() => expect(api.accountRuns).toHaveBeenLastCalledWith('probe', expect.anything()));
  fireEvent.click(await screen.findByText('198.51.100.0/24'));
  await waitFor(() => expect(api.openRemote).toHaveBeenCalledWith('probe', 88));
  await waitFor(() =>
    expect(navigate).toHaveBeenCalledWith('/admin/dpichecker?tab=history&scan=50'),
  );
});

it('журнал доставки уведомлений: событие, доставлено, ответ бота', async () => {
  renderWithProviders(<HistoryTab />);
  const block = (await screen.findByText(/Уведомления DPI\/\/CHECKER боту/)).closest(
    'details',
  ) as HTMLDetailsElement;
  fireEvent.click(within(block).getByText(/Уведомления DPI\/\/CHECKER боту/));
  block.open = true;
  fireEvent(block, new Event('toggle'));
  await waitFor(() => expect(api.webhookDeliveries).toHaveBeenCalled());
  expect(await within(block).findByText('Проверка готова')).toBeTruthy();
  expect(within(block).getByText('Доставлено')).toBeTruthy();
  expect(within(block).getByText(/200/)).toBeTruthy();
});

it('прогоны монитора: список и открытие прогона', async () => {
  renderWithProviders(<MonitorsTab />);
  fireEvent.click(await screen.findByRole('button', { name: 'Прогоны' }));
  await waitFor(() => expect(api.monitorRuns).toHaveBeenCalledWith(3, expect.any(Number), 0));
  fireEvent.click(await screen.findByRole('button', { name: /Открыть прогон/ }));
  await waitFor(() => expect(api.openRemote).toHaveBeenCalledWith('check', 5400));
  await waitFor(() =>
    expect(navigate).toHaveBeenCalledWith('/admin/dpichecker?tab=history&check=42'),
  );
});

it('настройки монитора правятся: интервал, порог тревоги, «сообщать об успехе»', async () => {
  renderWithProviders(<MonitorsTab />);
  fireEvent.click(await screen.findByRole('button', { name: 'Настройки' }));
  fireEvent.change(screen.getByLabelText('Каждые, часов'), { target: { value: '12' } });
  fireEvent.click(screen.getByRole('switch', { name: 'Сообщать и об успехе' }));
  fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
  await waitFor(() =>
    expect(api.patchMonitor).toHaveBeenCalledWith(3, {
      interval_hours: 12,
      alert_after_fails: 2,
      notify_on_success: true,
    }),
  );
});

it('монитор с тревогами в группу: код привязки и как им пользоваться', async () => {
  api.listMonitors.mockResolvedValue([{ ...MONITOR, notify: 'group', link_code: 'AB12' }]);
  renderWithProviders(<MonitorsTab />);
  expect(await screen.findByText('/link AB12')).toBeTruthy();
  expect(screen.getByText(/добавьте бота DPI\/\/CHECKER в группу/i)).toBeTruthy();
});

it('без права запуска нет правки настроек монитора', async () => {
  usePermissionStore.setState({ permissions: ['dpichecker:read'], isLoaded: true });
  renderWithProviders(<MonitorsTab />);
  await screen.findByText('Finland');
  expect(screen.queryByRole('button', { name: 'Настройки' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Прогоны' })).toBeTruthy();
});
