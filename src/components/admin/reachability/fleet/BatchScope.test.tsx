// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Batch, BatchPreview, Unit } from '@/api/reachability';

/**
 * «Что проверить?»: варианты объёма с числом серверов, цена и время для выбранного,
 * запуск пачки с тем объёмом, который выбран.
 */

const notify = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('react-i18next', async () => (await import('../testUtils')).i18nMock());
vi.mock('@/api/reachability', () => ({
  reachabilityApi: { previewBatch: vi.fn(), createBatch: vi.fn(), getUnits: vi.fn() },
}));
vi.mock('@/platform/hooks/useNotify', () => ({
  useNotify: () => ({ ...notify, notify: vi.fn(), warning: vi.fn(), info: vi.fn() }),
}));

import { reachabilityApi } from '@/api/reachability';
import { installMatchMedia, renderWithProviders, unit } from '../testUtils';
import { BatchScope } from './BatchScope';
import { type FleetRow, fleetCounts } from './fleet';

installMatchMedia();
afterEach(cleanup);

let counter = 0;
const row = (over: Partial<FleetRow>): FleetRow => {
  counter += 1;
  return {
    key: `s${counter}.example:443`,
    ref: `h${counter}`,
    label: `Server ${counter}`,
    address: `s${counter}.example:443`,
    purpose: 'bs',
    state: 'ok',
    ok: 15,
    total: 15,
    checkedAt: new Date().toISOString(),
    blocked: [],
    inPanel: true,
    ...over,
  };
};
counter = 0;
const rows: FleetRow[] = [
  ...Array.from({ length: 12 }, () => row({ state: 'partial', ok: 7 })),
  ...Array.from({ length: 30 }, () => row({ checkedAt: '2026-08-01T00:00:00Z' })),
  ...Array.from({ length: 58 }, () => row({})),
];
const units: Unit[] = [{ ...unit('mts|цфо|on', 'on', 'цфо'), name: 'МТС' }];
const preview: BatchPreview = {
  targets: [],
  units_resolved: ['mts|цфо|on'],
  chunks: 2,
  cost_kopeks: 768_000,
  estimated_minutes: 15,
  warnings: [],
  balance_kopeks: 10_001_800,
};

beforeEach(() => {
  vi.mocked(reachabilityApi.previewBatch).mockReset().mockResolvedValue(preview);
  vi.mocked(reachabilityApi.createBatch)
    .mockReset()
    .mockResolvedValue({ id: 3, status: 'pending' } as Batch);
  vi.mocked(reachabilityApi.getUnits).mockResolvedValue(units);
});

function open(onStarted = vi.fn(), onPickManually = vi.fn()) {
  renderWithProviders(
    <BatchScope
      isOpen
      onClose={vi.fn()}
      rows={rows}
      counts={fleetCounts(rows, new Date())}
      status={undefined}
      units={units}
      picked={[]}
      onPickManually={onPickManually}
      onStarted={onStarted}
    />,
  );
  return { onStarted, onPickManually };
}

describe('BatchScope', () => {
  it('offers scopes with server counts and prices the selected one', async () => {
    open();
    expect(screen.getByRole('radio', { name: /С проблемами/ }).getAttribute('aria-checked')).toBe(
      'true',
    );
    expect(screen.getByRole('radio', { name: /С проблемами/ }).textContent).toContain(
      '12 серверов',
    );
    expect(screen.getByRole('radio', { name: /Давно не проверяли/ }).textContent).toContain(
      '30 серверов',
    );
    expect(screen.getByRole('radio', { name: /Все серверы/ }).textContent).toContain(
      '100 серверов',
    );
    await waitFor(() => expect(screen.getByText('◈ 768 000 cred')).toBeTruthy());
    expect(screen.getByText(/около 15 минут/)).toBeTruthy();
    expect(reachabilityApi.previewBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        scope_kind: 'problems',
        dpi: 'on',
        host_refs: expect.arrayContaining(['h1', 'h12']),
      }),
    );
    expect(vi.mocked(reachabilityApi.previewBatch).mock.calls[0][0].host_refs).toHaveLength(12);
  });

  it('re-prices another scope and starts the batch with it', async () => {
    const { onStarted } = open();
    fireEvent.click(screen.getByRole('radio', { name: /Давно не проверяли/ }));
    await waitFor(() =>
      expect(reachabilityApi.previewBatch).toHaveBeenLastCalledWith(
        expect.objectContaining({ scope_kind: 'stale' }),
      ),
    );
    expect(vi.mocked(reachabilityApi.previewBatch).mock.lastCall?.[0].host_refs).toHaveLength(30);
    const run = await screen.findByRole('button', { name: /Запустить за ◈ 768 000 cred/ });
    fireEvent.click(run);
    await waitFor(() => expect(onStarted).toHaveBeenCalledWith(expect.objectContaining({ id: 3 })));
    expect(reachabilityApi.createBatch).toHaveBeenCalledWith(
      expect.objectContaining({ scope_kind: 'stale' }),
    );
    expect(notify.success).toHaveBeenCalledWith('Проверка запущена');
  });

  it('hands over to manual picking when nothing is picked yet', () => {
    const { onPickManually } = open();
    fireEvent.click(screen.getByRole('radio', { name: /Выбрать вручную/ }));
    expect(onPickManually).toHaveBeenCalled();
  });
});
