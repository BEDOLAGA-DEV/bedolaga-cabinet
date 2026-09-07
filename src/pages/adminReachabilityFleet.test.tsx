// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Batch, HostTarget, ReachabilityStatus, Summary, Unit } from '@/api/reachability';

/**
 * Страница флота: сводка словами, список группами, карточка сервера по клику (в адресе ?server=),
 * идущая пачка из статуса показывает прогресс и «Остановить».
 */

const notify = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('react-i18next', async () =>
  (await import('../components/admin/reachability/testUtils')).i18nMock(),
);
vi.mock('@/api/reachability', () => ({
  reachabilityApi: {
    getStatus: vi.fn(),
    getSummary: vi.fn(),
    getHosts: vi.fn(),
    getUnits: vi.fn(),
    previewBatch: vi.fn(),
    createBatch: vi.fn(),
    cancelBatch: vi.fn(),
    getBatch: vi.fn(),
    listJobs: vi.fn(),
    updatePref: vi.fn(),
  },
}));
vi.mock('@/platform/hooks/useNotify', () => ({
  useNotify: () => ({ ...notify, notify: vi.fn(), warning: vi.fn(), info: vi.fn() }),
}));

import { reachabilityApi } from '@/api/reachability';
import {
  installMatchMedia,
  renderWithProviders,
  unit,
} from '../components/admin/reachability/testUtils';
import AdminReachability from './AdminReachability';

installMatchMedia();
afterEach(cleanup);

const status: ReachabilityStatus = {
  enabled: true,
  configured: true,
  healthy: true,
  health_message: null,
  balance_kopeks: 100_018,
  bonus_kopeks: 0,
  tier: 'gold',
  tier_expires_at: null,
  min_interval_sec: 1,
  active_jobs: [],
  reference: null,
  cost_limit_kopeks: 0,
  cores: {},
  default_sni: 'ads.x5.ru',
  active_batch: null,
};
const units: Unit[] = [
  { ...unit('mts|цфо|on', 'on', 'цфо'), name: 'МТС' },
  { ...unit('tele2|цфо|on', 'on', 'цфо'), name: 'Tele2' },
];
const cell = (verdict: 'reachable' | 'blocked') => ({
  verdict,
  matches_expectation: null,
  checked_at: '2026-09-06T21:14:00Z',
  job_id: 1,
});
const summary: Summary = {
  dpi: 'any',
  units,
  panel_error: null,
  rows: [
    {
      target_key: 'bs.example:9443',
      kind: 'host',
      ref: 'h-bs',
      label: 'Russia | LTE | БС',
      purpose: 'bs',
      purpose_guessed: false,
      in_panel: true,
      cells: { 'mts|цфо|on': cell('reachable'), 'tele2|цфо|on': cell('blocked') },
    },
    {
      target_key: 'de.example:443',
      kind: 'host',
      ref: 'h-de',
      label: 'Germany',
      purpose: 'regular',
      purpose_guessed: false,
      in_panel: true,
      cells: {},
    },
  ],
};
const hosts: HostTarget[] = [
  {
    uuid: 'h-bs',
    remark: 'Russia | LTE | БС',
    address: 'bs.example',
    port: 9443,
    sni: null,
    is_disabled: false,
    tag: null,
    purpose: 'bs',
    purpose_guessed: false,
    excluded: false,
    node_uuids: [],
    target_key: 'bs.example:9443',
  },
  {
    uuid: 'h-de',
    remark: 'Germany',
    address: 'de.example',
    port: 443,
    sni: null,
    is_disabled: false,
    tag: null,
    purpose: 'regular',
    purpose_guessed: false,
    excluded: false,
    node_uuids: [],
    target_key: 'de.example:443',
  },
];
const runningBatch: Batch = {
  id: 5,
  status: 'running',
  phase: null,
  scope: { kind: 'problems', host_refs: ['h-bs'] },
  total_targets: 1,
  done_targets: 0,
  estimated_kopeks: 640,
  cost_kopeks: null,
  error_message: null,
  created_at: null,
  started_at: null,
  finished_at: null,
  jobs: [
    {
      id: 9,
      status: 'running',
      phase: 'waiting',
      target_keys: ['bs.example:9443'],
      cost_kopeks: null,
      partial: null,
    },
  ],
};

beforeEach(() => {
  vi.mocked(reachabilityApi.getStatus).mockResolvedValue(status);
  vi.mocked(reachabilityApi.getSummary).mockResolvedValue(summary);
  vi.mocked(reachabilityApi.getHosts).mockResolvedValue(hosts);
  vi.mocked(reachabilityApi.getUnits).mockResolvedValue(units);
  vi.mocked(reachabilityApi.previewBatch).mockResolvedValue({
    targets: [],
    units_resolved: ['mts|цфо|on'],
    chunks: 1,
    cost_kopeks: 640,
    estimated_minutes: 15,
    warnings: [],
    balance_kopeks: 100_018,
  });
  vi.mocked(reachabilityApi.listJobs).mockResolvedValue({
    items: [],
    total: 0,
    offset: 0,
    limit: 3,
  });
  vi.mocked(reachabilityApi.getBatch).mockResolvedValue(runningBatch);
});

describe('AdminReachability (флот)', () => {
  it('shows the fleet statement, groups and opens a server card from the list', async () => {
    renderWithProviders(<AdminReachability />);
    await waitFor(() =>
      expect(screen.getAllByRole('heading', { level: 2 })[0].textContent).toBe(
        'Работают 0 из 2 серверов',
      ),
    );
    expect(screen.getByText('1 не у всех')).toBeTruthy();
    expect(screen.getByText('1 не проверяли')).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Работают не у всех' })).toBeTruthy();
    const row = screen.getByRole('button', { name: /Russia \| LTE \| БС/ })
      .parentElement as HTMLElement;
    fireEvent.click(within(row).getByRole('button', { name: 'Подробнее' }));
    await waitFor(() => expect(screen.getByText('ловит во всех округах')).toBeTruthy());
    expect(screen.getByText('не ловит')).toBeTruthy();
    expect(screen.getAllByText('Russia | LTE | БС').length).toBeGreaterThan(1);
  });

  it('shows the running batch from status with a stop button', async () => {
    vi.mocked(reachabilityApi.getStatus).mockResolvedValue({
      ...status,
      active_batch: { id: 5, total_targets: 1, done_targets: 0, started_at: null },
    });
    renderWithProviders(<AdminReachability />);
    await waitFor(() =>
      expect(screen.getAllByRole('heading', { level: 2 })[0].textContent).toBe(
        'Проверяем 1 сервер',
      ),
    );
    expect(screen.getAllByRole('button', { name: 'Остановить' }).length).toBeGreaterThan(0);
    expect(screen.getByText('Готово 0 из 1 · ещё около 4 минут')).toBeTruthy();
  });
});
