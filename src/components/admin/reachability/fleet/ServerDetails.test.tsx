// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Batch, BatchPreview, JobList, SummaryRow, Unit } from '@/api/reachability';

/**
 * Карточка сервера: вердикт словом, разбор по операторам словами, прошлые проверки,
 * смена назначения и проверка одного сервера с ценой.
 */

const notify = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('react-i18next', async () => (await import('../testUtils')).i18nMock());
vi.mock('@/api/reachability', () => ({
  reachabilityApi: {
    previewBatch: vi.fn(),
    createBatch: vi.fn(),
    listJobs: vi.fn(),
    updatePref: vi.fn(),
  },
}));
vi.mock('@/platform/hooks/useNotify', () => ({
  useNotify: () => ({ ...notify, notify: vi.fn(), warning: vi.fn(), info: vi.fn() }),
}));

import { reachabilityApi } from '@/api/reachability';
import { installMatchMedia, renderWithProviders, unit } from '../testUtils';
import { ServerDetails } from './ServerDetails';
import type { FleetRow } from './fleet';

installMatchMedia();
afterEach(cleanup);

const units: Unit[] = [
  { ...unit('mts|цфо|on', 'on', 'цфо'), name: 'МТС' },
  { ...unit('mts|пфо|on', 'on', 'пфо'), name: 'МТС' },
  { ...unit('tele2|цфо|on', 'on', 'цфо'), name: 'Tele2' },
];
const cell = (verdict: SummaryRow['cells'][string]['verdict']) => ({
  verdict,
  matches_expectation: null,
  checked_at: '2026-09-06T21:14:00Z',
  job_id: 1,
});
const summaryRow: SummaryRow = {
  target_key: 'bs.example:9443',
  kind: 'host',
  ref: 'h-bs',
  label: 'Russia | LTE | БС',
  purpose: 'bs',
  purpose_guessed: false,
  in_panel: true,
  cells: {
    'mts|цфо|on': cell('reachable'),
    'mts|пфо|on': cell('blocked'),
    'tele2|цфо|on': cell('blocked'),
  },
};
const row: FleetRow = {
  key: 'bs.example:9443',
  ref: 'h-bs',
  label: 'Russia | LTE | БС',
  address: 'bs.example:9443',
  purpose: 'bs',
  state: 'partial',
  ok: 1,
  total: 3,
  checkedAt: '2026-09-06T21:14:00Z',
  blocked: ['mts|пфо|on', 'tele2|цфо|on'],
  inPanel: true,
};
const preview: BatchPreview = {
  targets: [],
  units_resolved: ['mts|цфо|on'],
  chunks: 1,
  cost_kopeks: 640,
  estimated_minutes: 15,
  warnings: [],
  balance_kopeks: 100_000,
};
const batch = { id: 3, status: 'pending' } as Batch;
const jobs: JobList = { items: [], total: 0, offset: 0, limit: 3 };

beforeEach(() => {
  vi.mocked(reachabilityApi.previewBatch).mockResolvedValue(preview);
  vi.mocked(reachabilityApi.createBatch).mockResolvedValue(batch);
  vi.mocked(reachabilityApi.listJobs).mockResolvedValue(jobs);
  vi.mocked(reachabilityApi.updatePref).mockResolvedValue({
    target_kind: 'host',
    target_ref: 'h-bs',
    purpose: 'regular',
    excluded: false,
    note: null,
  });
});

function renderDetails(onRunning = vi.fn()) {
  renderWithProviders(
    <ServerDetails
      row={row}
      summaryRow={summaryRow}
      units={units}
      status={undefined}
      onClose={vi.fn()}
      onRunning={onRunning}
    />,
  );
  return onRunning;
}

describe('ServerDetails', () => {
  it('tells the verdict and the operators in words', async () => {
    renderDetails();
    expect(screen.getByRole('heading', { name: 'Russia | LTE | БС' })).toBeTruthy();
    expect(screen.getByText('Работает не у всех')).toBeTruthy();
    expect(screen.getByText(/ловит у 1 из 3 симок с Белым списком/)).toBeTruthy();
    expect(screen.getByText('не ловит в ПФО')).toBeTruthy();
    expect(screen.getByText('не ловит')).toBeTruthy();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /Проверить этот сервер · ◈ 640 cred/ }),
      ).toBeTruthy(),
    );
    expect(reachabilityApi.previewBatch).toHaveBeenCalledWith(
      expect.objectContaining({ host_refs: ['h-bs'], dpi: 'on', scope_kind: 'manual' }),
    );
  });

  it('starts a one-server batch and hands over its id', async () => {
    const onRunning = renderDetails();
    const button = await screen.findByRole('button', { name: /◈ 640 cred/ });
    fireEvent.click(button);
    await waitFor(() => expect(onRunning).toHaveBeenCalledWith(3));
    expect(reachabilityApi.createBatch).toHaveBeenCalledWith(
      expect.objectContaining({ host_refs: ['h-bs'], scope_kind: 'manual' }),
    );
  });

  it('changes the purpose through the chip and tells about it', async () => {
    renderDetails();
    fireEvent.click(screen.getByRole('button', { name: /Сменить назначение/ }));
    await waitFor(() => expect(reachabilityApi.updatePref).toHaveBeenCalled());
    expect(reachabilityApi.updatePref).toHaveBeenCalledWith({
      target_kind: 'host',
      target_ref: 'h-bs',
      purpose: 'regular',
    });
    await waitFor(() => expect(notify.success).toHaveBeenCalledWith('Назначение изменено'));
  });
});
