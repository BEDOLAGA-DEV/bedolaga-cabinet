// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PreviewResponse, ReachabilityStatus, Summary } from '@/api/reachability';

/**
 * Первый экран раздела: ответ словами по каждому хосту, кнопка «Проверить снова» с ценой и
 * вторым шагом на месте, «Подробнее» раскрывает матрицу. Никаких счётчиков «N из M в норме».
 */

const notify = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('react-i18next', async () => (await import('./testUtils')).i18nMock());
vi.mock('@/api/reachability', () => ({
  reachabilityApi: {
    getSummary: vi.fn(),
    getUnits: vi.fn(),
    previewJob: vi.fn(),
    createJob: vi.fn(),
  },
}));
vi.mock('@/platform/hooks/useNativeDialog', () => ({
  useNativeDialog: () => ({ confirm: vi.fn(), alert: vi.fn(), popup: vi.fn(), isNative: false }),
}));
vi.mock('@/platform/hooks/useNotify', () => ({
  useNotify: () => ({ ...notify, notify: vi.fn(), warning: vi.fn(), info: vi.fn() }),
}));

import { reachabilityApi } from '@/api/reachability';
import { HostsAnswer } from './HostsAnswer';
import { installMatchMedia, renderWithProviders, unit } from './testUtils';

installMatchMedia();
afterEach(cleanup);

const summary: Summary = {
  dpi: 'on',
  units: [
    { ...unit('mts|цфо|on', 'on', 'цфо'), name: 'МТС' },
    { ...unit('tele2|цфо|on', 'on', 'цфо'), name: 'Tele2' },
  ],
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
      cells: {
        'mts|цфо|on': {
          verdict: 'reachable',
          matches_expectation: true,
          checked_at: new Date(Date.now() - 26 * 3_600_000).toISOString(),
          job_id: 1,
        },
        'tele2|цфо|on': {
          verdict: 'blocked',
          matches_expectation: false,
          checked_at: new Date(Date.now() - 26 * 3_600_000).toISOString(),
          job_id: 1,
        },
      },
    },
  ],
};
const preview = {
  kind: 'probe',
  targets: [],
  units_resolved: ['mts|цфо|on', 'tele2|цфо|on'],
  skipped: { dpi_off: [], unavailable: [], unknown: [], blocked_targets: [] },
  cost_kopeks: 640,
  estimate_is_exact: true,
  warnings: [],
  balance_kopeks: 10_000,
} as unknown as PreviewResponse;
const status = {
  enabled: true,
  configured: true,
  healthy: true,
  balance_kopeks: 10_000,
  active_jobs: [],
  cost_limit_kopeks: 0,
  cores: {},
  default_sni: 'ads.x5.ru',
} as unknown as ReachabilityStatus;

beforeEach(() => {
  vi.mocked(reachabilityApi.getSummary).mockResolvedValue(summary);
  vi.mocked(reachabilityApi.getUnits).mockResolvedValue(summary.units);
  vi.mocked(reachabilityApi.previewJob).mockResolvedValue(preview);
  vi.mocked(reachabilityApi.createJob).mockReset();
  vi.mocked(reachabilityApi.createJob).mockResolvedValue({ id: 9 } as never);
});

describe('HostsAnswer', () => {
  it('ответ словами по хосту, кто режет, давность и кнопка с ценой', async () => {
    renderWithProviders(<HostsAnswer status={status} runningJobId={null} onRunning={vi.fn()} />);
    expect(await screen.findByText('Russia | LTE | БС')).toBeTruthy();
    expect(screen.getByText('открывается у 1 из 2 симок с Белым списком')).toBeTruthy();
    expect(screen.getByText('Режется: Tele2 ЦФО')).toBeTruthy();
    expect(screen.getByText(/^проверено /)).toBeTruthy();
    expect(screen.queryByText(/в норме/)).toBeNull();
    const button = await screen.findByRole('button', { name: 'Проверить снова · ◈ 640 cred' });
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
    expect(vi.mocked(reachabilityApi.previewJob)).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'probe',
        targets: [{ kind: 'host', ref: 'h-bs' }],
        units: ['mts|цфо|on', 'tele2|цфо|on'],
        dpi: 'on',
      }),
    );
  });

  it('второй шаг на месте: «Запустить за …» создаёт задачу и сообщает наверх', async () => {
    const onRunning = vi.fn();
    renderWithProviders(<HostsAnswer status={status} runningJobId={null} onRunning={onRunning} />);
    const button = await screen.findByRole('button', { name: 'Проверить снова · ◈ 640 cred' });
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(button);
    expect(screen.getByText('Списание средств')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Запустить за ◈ 640 cred' }));
    await waitFor(() => expect(onRunning).toHaveBeenCalledWith(9));
    expect(reachabilityApi.createJob).toHaveBeenCalledTimes(1);
  });

  it('пока идёт проверка — кнопки нет, написано «Идёт проверка»', async () => {
    renderWithProviders(<HostsAnswer status={status} runningJobId={12} onRunning={vi.fn()} />);
    expect(await screen.findByText('Идёт проверка…')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Проверить/ })).toBeNull();
  });

  it('«Подробнее» раскрывает матрицу на месте', async () => {
    renderWithProviders(<HostsAnswer status={status} runningJobId={null} onRunning={vi.fn()} />);
    const details = await screen.findByRole('button', { name: 'Подробнее' });
    expect(screen.queryByRole('table')).toBeNull();
    fireEvent.click(details);
    expect(screen.getAllByRole('table').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Скрыть подробности' })).toBeTruthy();
  });

  it('хостов под Белый список нет — так и написано, кнопки нет', async () => {
    vi.mocked(reachabilityApi.getSummary).mockResolvedValue({ ...summary, rows: [] });
    renderWithProviders(<HostsAnswer status={status} runningJobId={null} onRunning={vi.fn()} />);
    expect(await screen.findByText(/нет хостов/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Проверить/ })).toBeNull();
  });
});
