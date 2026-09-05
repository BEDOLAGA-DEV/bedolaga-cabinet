// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  Job,
  JobCreateRequest,
  PreviewResponse,
  ReachabilityStatus,
} from '@/api/reachability';
import { resetSafeStorage } from '@/utils/safeStorage';

/**
 * Запуск тратит деньги. Перед POST /jobs — родной диалог подтверждения со
 * сводкой (цели, симки, цена, остаток); отказ ничего не отправляет.
 */

const dialog = vi.hoisted(() => ({ confirm: vi.fn() }));
const notify = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock('react-i18next', async () => (await import('./testUtils')).i18nMock());
vi.mock('@/api/reachability', () => ({
  reachabilityApi: { previewJob: vi.fn(), createJob: vi.fn() },
}));
vi.mock('@/platform/hooks/useNativeDialog', () => ({
  useNativeDialog: () => ({ ...dialog, alert: vi.fn(), popup: vi.fn(), isNative: false }),
}));
vi.mock('@/platform/hooks/useNotify', () => ({
  useNotify: () => ({ ...notify, notify: vi.fn(), warning: vi.fn(), info: vi.fn() }),
}));

import { reachabilityApi } from '@/api/reachability';
import { LaunchPanel } from './LaunchPanel';
import { installMatchMedia, renderWithProviders } from './testUtils';
import { recallSelection } from './unitSelection';

const body: JobCreateRequest = {
  kind: 'probe',
  targets: [{ kind: 'host', ref: 'h1' }],
  units: ['mts|цфо|on', 'tele2|цфо|on'],
  dpi: 'on',
  probes: { icmp: false, tcp: true, sni: true },
  core: '',
};
const preview: PreviewResponse = {
  kind: 'probe',
  targets: [
    {
      kind: 'host',
      label: 'RU-BS',
      address: 'bs.example',
      port: 443,
      target_key: 'bs.example:443',
      sni: null,
      ref: {},
      purpose: 'bs',
    },
  ],
  units_resolved: ['mts|цфо|on', 'tele2|цфо|on'],
  skipped: { dpi_off: [], unavailable: [], unknown: [], blocked_targets: [] },
  cost_kopeks: 640,
  estimate_is_exact: true,
  warnings: [],
  balance_kopeks: 10_000,
};
const status: ReachabilityStatus = {
  enabled: true,
  configured: true,
  healthy: true,
  health_message: null,
  balance_kopeks: 10_000,
  bonus_kopeks: 0,
  tier: 'gold',
  tier_expires_at: null,
  min_interval_sec: 1,
  active_jobs: [],
  reference: null,
  cost_limit_kopeks: 0,
};
const job = { id: 7, kind: 'probe', status: 'pending' } as Job;

installMatchMedia();

beforeEach(() => {
  resetSafeStorage();
  localStorage.clear();
  dialog.confirm.mockReset();
  notify.success.mockReset();
  notify.error.mockReset();
  vi.mocked(reachabilityApi.previewJob).mockResolvedValue(preview);
  vi.mocked(reachabilityApi.createJob).mockReset();
  vi.mocked(reachabilityApi.createJob).mockResolvedValue(job);
});
afterEach(cleanup);

async function renderPanel(onStarted = vi.fn()) {
  renderWithProviders(<LaunchPanel body={body} status={status} onStarted={onStarted} />);
  const run = await screen.findByRole('button', { name: 'Запустить за ◈ 640 cred' });
  await waitFor(() => expect((run as HTMLButtonElement).disabled).toBe(false));
  return { run, onStarted };
}

describe('LaunchPanel', () => {
  it('отказ в диалоге — задача не создаётся', async () => {
    dialog.confirm.mockResolvedValue(false);
    const { run } = await renderPanel();

    fireEvent.click(run);

    await waitFor(() => expect(dialog.confirm).toHaveBeenCalledTimes(1));
    const [text, title] = dialog.confirm.mock.calls[0];
    expect(title).toBe('Списание средств');
    for (const part of [
      'RU-BS',
      'mts|цфо|on',
      'tele2|цфо|on',
      '◈ 640 cred ≈ 6,40 ₽',
      '◈ 9 360 cred ≈ 93,60 ₽',
    ]) {
      expect(text).toContain(part);
    }
    expect(reachabilityApi.createJob).not.toHaveBeenCalled();
  });

  it('после подтверждения создаёт задачу и запоминает симки для «как в прошлый раз»', async () => {
    dialog.confirm.mockResolvedValue(true);
    const { run, onStarted } = await renderPanel();

    fireEvent.click(run);

    await waitFor(() => expect(onStarted).toHaveBeenCalledWith(job));
    expect(reachabilityApi.createJob).toHaveBeenCalledWith(body);
    expect(recallSelection('probe')).toEqual(body.units);
    expect(notify.success).toHaveBeenCalledWith('Задача #7 запущена');
  });
});
