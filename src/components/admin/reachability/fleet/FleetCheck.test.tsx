// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Batch, BatchPreview, HostTarget, Summary, Unit } from '@/api/reachability';

/**
 * Вкладка «Хосты» одной формой: «Выбрать все» и чекбоксы групп отмечают строки, симки подбираются
 * по их назначению, «Запуск» считает цену пачки и после подтверждения создаёт её; «Подробнее»
 * открывает карточку под строкой, откуда сервер выбирается одной кнопкой.
 */

const notify = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('react-i18next', async () => (await import('../testUtils')).i18nMock());
vi.mock('@/api/reachability', () => ({
  reachabilityApi: {
    getSummary: vi.fn(),
    getHosts: vi.fn(),
    getUnits: vi.fn(),
    previewBatch: vi.fn(),
    createBatch: vi.fn(),
    getBatch: vi.fn(),
    cancelBatch: vi.fn(),
    listJobs: vi.fn(),
    getJob: vi.fn(),
    updatePref: vi.fn(),
  },
}));
vi.mock('@/platform/hooks/useNotify', () => ({
  useNotify: () => ({ ...notify, notify: vi.fn(), warning: vi.fn(), info: vi.fn() }),
}));
vi.mock('@/platform/hooks/useNativeDialog', () => ({
  useNativeDialog: () => ({ confirm: vi.fn(), alert: vi.fn(), popup: vi.fn(), isNative: false }),
}));

import { reachabilityApi } from '@/api/reachability';
import { parseReachabilityDeepLink } from '../deepLink';
import { installMatchMedia, renderWithProviders, unit } from '../testUtils';
import { FleetCheck } from './FleetCheck';

installMatchMedia();
afterEach(cleanup);

const units: Unit[] = [
  { ...unit('mts|цфо|on', 'on', 'цфо'), name: 'МТС' },
  { ...unit('tele2|цфо|on', 'on', 'цфо'), name: 'Tele2' },
  { ...unit('yota|уфо|off', 'off', 'уфо'), name: 'Yota' },
];
const host = (
  uuid: string,
  remark: string,
  address: string,
  port: number,
  purpose: 'bs' | 'regular',
): HostTarget => ({
  uuid,
  remark,
  address,
  port,
  sni: null,
  is_disabled: false,
  tag: null,
  purpose,
  purpose_guessed: false,
  excluded: false,
  node_uuids: [],
  target_key: `${address}:${port}`,
});
const hosts = [
  host('h1', 'Russia | LTE | БС', 'bs.example', 9443, 'bs'),
  host('h2', 'Germany', 'de.example', 443, 'regular'),
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
  rows: [
    {
      target_key: 'bs.example:9443',
      kind: 'host',
      ref: 'h1',
      label: 'Russia | LTE | БС',
      purpose: 'bs',
      purpose_guessed: false,
      in_panel: true,
      cells: { 'mts|цфо|on': cell('reachable'), 'tele2|цфо|on': cell('blocked') },
    },
    {
      target_key: 'de.example:443',
      kind: 'host',
      ref: 'h2',
      label: 'Germany',
      purpose: 'regular',
      purpose_guessed: false,
      in_panel: true,
      cells: { 'yota|уфо|off': cell('blocked') },
    },
  ],
  panel_error: null,
};
const preview: BatchPreview = {
  targets: [
    {
      kind: 'host',
      label: 'Russia | LTE | БС',
      address: 'bs.example',
      port: 9443,
      target_key: 'bs.example:9443',
      sni: null,
      ref: {},
      purpose: 'bs',
    },
  ],
  units_resolved: ['mts|цфо|on', 'tele2|цфо|on'],
  chunks: 1,
  cost_kopeks: 1_280,
  estimated_minutes: 15,
  warnings: [],
  balance_kopeks: 100_000,
};

beforeEach(() => {
  vi.mocked(reachabilityApi.getSummary).mockResolvedValue(summary);
  vi.mocked(reachabilityApi.getHosts).mockResolvedValue(hosts);
  vi.mocked(reachabilityApi.getUnits).mockResolvedValue(units);
  vi.mocked(reachabilityApi.previewBatch).mockReset().mockResolvedValue(preview);
  vi.mocked(reachabilityApi.createBatch)
    .mockReset()
    .mockResolvedValue({ id: 9, status: 'pending' } as Batch);
  vi.mocked(reachabilityApi.listJobs).mockResolvedValue({
    items: [],
    total: 0,
    offset: 0,
    limit: 3,
  });
  notify.success.mockReset();
});

function open(search = '') {
  const patchParams = vi.fn();
  renderWithProviders(
    <FleetCheck
      status={undefined}
      link={parseReachabilityDeepLink(new URLSearchParams(search))}
      patchParams={patchParams}
    />,
  );
  return patchParams;
}

describe('FleetCheck', () => {
  it('«Выбрать все» отмечает серверы, симки берутся по их назначению, цена считается пачкой', async () => {
    open();
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Выбрать все' }));
    await waitFor(() =>
      expect(reachabilityApi.previewBatch).toHaveBeenCalledWith(
        expect.objectContaining({
          host_refs: ['h1', 'h2'],
          units: ['mts|цфо|on', 'tele2|цфо|on', 'yota|уфо|off'],
          dpi: 'any',
          scope_kind: 'problems',
        }),
      ),
    );
    for (const box of screen.getAllByRole('checkbox', { name: /Russia \| LTE \| БС|Germany/ })) {
      expect(box.getAttribute('aria-checked')).toBe('true');
    }
    expect(
      await screen.findByRole('button', { name: /Проверить 2 сервера · ◈ 1 280 cred/ }),
    ).toBeTruthy();
  });

  it('чекбокс группы отмечает только её серверы', async () => {
    open();
    fireEvent.click(await screen.findByRole('checkbox', { name: /^Не работают/ }));
    await waitFor(() =>
      expect(reachabilityApi.previewBatch).toHaveBeenCalledWith(
        expect.objectContaining({ host_refs: ['h2'], dpi: 'off', scope_kind: 'manual' }),
      ),
    );
    expect(screen.getByRole('checkbox', { name: /Germany/ }).getAttribute('aria-checked')).toBe(
      'true',
    );
    expect(
      screen.getByRole('checkbox', { name: /Russia \| LTE \| БС/ }).getAttribute('aria-checked'),
    ).toBe('false');
  });

  it('запуск с подтверждением создаёт пачку и уводит на её прогресс', async () => {
    const patchParams = open();
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Выбрать все' }));
    const run = await screen.findByRole('button', { name: /Проверить 2 сервера · ◈ 1 280 cred/ });
    await waitFor(() => expect((run as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(run);
    fireEvent.click(screen.getAllByRole('button', { name: 'Запустить за ◈ 1 280 cred' })[0]);
    await waitFor(() => expect(reachabilityApi.createBatch).toHaveBeenCalled());
    expect(vi.mocked(reachabilityApi.createBatch).mock.calls[0][0]).toEqual(
      expect.objectContaining({ host_refs: ['h1', 'h2'], scope_kind: 'problems' }),
    );
    expect(patchParams).toHaveBeenCalledWith({ batch: '9', server: null });
    expect(notify.success).toHaveBeenCalledWith('Проверка запущена');
  });

  it('карточка раскрывается под строкой, оттуда сервер выбирается одной кнопкой', async () => {
    const patchParams = open();
    const rowBox = await screen.findByRole('checkbox', { name: /Russia \| LTE \| БС/ });
    const row = rowBox.parentElement as HTMLElement;
    fireEvent.click(within(row).getByRole('button', { name: 'Подробнее' }));
    expect(patchParams).toHaveBeenCalledWith({ server: 'bs.example:9443' });
    cleanup();
    open('server=bs.example%3A9443');
    expect(await screen.findByText(/ловит у 1 из 2 симок/)).toBeTruthy();
    fireEvent.click(await screen.findByRole('button', { name: /Проверить этот сервер/ }));
    await waitFor(() =>
      expect(reachabilityApi.previewBatch).toHaveBeenLastCalledWith(
        expect.objectContaining({
          host_refs: ['h1'],
          units: ['mts|цфо|on', 'tele2|цфо|on'],
          dpi: 'on',
        }),
      ),
    );
  });
});
