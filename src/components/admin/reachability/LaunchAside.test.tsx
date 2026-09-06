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
 * Запуск тратит деньги. Перед POST /jobs — подтверждение со сводкой (цели, симки, цена, остаток):
 * в Mini App — родной попап Telegram, в браузере — второй шаг прямо в панели запуска
 * («Списать ◈ …» / «Отмена»), без модалки. Отказ ничего не отправляет.
 */

const dialog = vi.hoisted(() => ({ confirm: vi.fn(), isNative: false }));
const notify = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock('react-i18next', async () => (await import('./testUtils')).i18nMock());
vi.mock('@/api/reachability', () => ({
  reachabilityApi: {
    previewJob: vi.fn(),
    createJob: vi.fn(),
    getUnits: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock('@/platform/hooks/useNativeDialog', () => ({
  useNativeDialog: () => ({
    confirm: dialog.confirm,
    alert: vi.fn(),
    popup: vi.fn(),
    isNative: dialog.isNative,
  }),
}));
vi.mock('@/platform/hooks/useNotify', () => ({
  useNotify: () => ({ ...notify, notify: vi.fn(), warning: vi.fn(), info: vi.fn() }),
}));

import { useState } from 'react';
import { reachabilityApi } from '@/api/reachability';
import { LaunchAside, LaunchBar } from './LaunchAside';
import { installMatchMedia, renderWithProviders } from './testUtils';
import { recallSelection } from './unitSelection';

const body: JobCreateRequest = {
  kind: 'probe',
  targets: [{ kind: 'host', ref: 'h1' }],
  units: ['mts|цфо|on', 'tele2|цфо|on'],
  dpi: 'on',
  probes: { icmp: false, tcp: true, sni: true },
  core: '',
  sni_hosts: [],
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
  cores: {},
  default_sni: null,
};
const job = { id: 7, kind: 'probe', status: 'pending' } as Job;

installMatchMedia();

beforeEach(() => {
  resetSafeStorage();
  localStorage.clear();
  dialog.confirm.mockReset();
  dialog.isNative = false;
  notify.success.mockReset();
  notify.error.mockReset();
  vi.mocked(reachabilityApi.previewJob).mockResolvedValue(preview);
  vi.mocked(reachabilityApi.createJob).mockReset();
  vi.mocked(reachabilityApi.createJob).mockResolvedValue(job);
});
afterEach(cleanup);

async function renderPanel(onStarted = vi.fn()) {
  renderWithProviders(
    <LaunchAside kind="probe" targetsCount={1} body={body} status={status} onStarted={onStarted} />,
  );
  const run = await screen.findByRole('button', { name: 'Проверить 1 цель · ◈ 640 cred' });
  await waitFor(() => expect((run as HTMLButtonElement).disabled).toBe(false));
  return { run, onStarted };
}

const CHARGE = 'Списать ◈ 640 cred';

describe('LaunchAside в браузере: второй шаг в панели, без модалки', () => {
  it('первый клик показывает сводку и «Списать», диалог не зовётся, задача не создаётся', async () => {
    const { run } = await renderPanel();

    fireEvent.click(run);

    expect(screen.getByText('Цели (1): RU-BS')).toBeTruthy();
    expect(screen.getByText('Симки (2): mts|цфо|on, tele2|цфо|on')).toBeTruthy();
    expect(screen.getByRole('button', { name: CHARGE })).toBeTruthy();
    expect(dialog.confirm).not.toHaveBeenCalled();
    expect(reachabilityApi.createJob).not.toHaveBeenCalled();
  });

  it('«Отмена» убирает второй шаг, задача не создаётся', async () => {
    const { run } = await renderPanel();
    fireEvent.click(run);

    fireEvent.click(screen.getByRole('button', { name: 'Отмена' }));

    expect(screen.queryByRole('button', { name: CHARGE })).toBeNull();
    expect(screen.getByRole('button', { name: 'Проверить 1 цель · ◈ 640 cred' })).toBeTruthy();
    expect(reachabilityApi.createJob).not.toHaveBeenCalled();
  });

  it('«Списать» создаёт задачу и запоминает симки для «как в прошлый раз»', async () => {
    const { run, onStarted } = await renderPanel();
    fireEvent.click(run);

    fireEvent.click(screen.getByRole('button', { name: CHARGE }));

    await waitFor(() => expect(onStarted).toHaveBeenCalledWith(job));
    expect(reachabilityApi.createJob).toHaveBeenCalledWith(body);
    expect(recallSelection('probe')).toEqual(body.units);
    expect(notify.success).toHaveBeenCalledWith('Задача #7 запущена');
  });

  it('изменение набора целей/симок сбрасывает второй шаг', async () => {
    function Harness() {
      const [current, setCurrent] = useState(body);
      return (
        <>
          <button type="button" onClick={() => setCurrent({ ...body, units: ['mts|цфо|on'] })}>
            swap
          </button>
          <LaunchAside
            kind="probe"
            targetsCount={1}
            body={current}
            status={status}
            onStarted={vi.fn()}
          />
        </>
      );
    }
    renderWithProviders(<Harness />);
    const run = await screen.findByRole('button', { name: 'Проверить 1 цель · ◈ 640 cred' });
    await waitFor(() => expect((run as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(run);
    expect(screen.getByRole('button', { name: CHARGE })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'swap' }));

    await waitFor(() => expect(screen.queryByRole('button', { name: CHARGE })).toBeNull());
    expect(reachabilityApi.createJob).not.toHaveBeenCalled();
  });
});

describe('LaunchBar в браузере', () => {
  it('первый тап раскрывает детали со вторым шагом, «Списать» создаёт задачу', async () => {
    const onStarted = vi.fn();
    renderWithProviders(
      <LaunchBar kind="probe" targetsCount={1} body={body} status={status} onStarted={onStarted} />,
    );
    const run = await screen.findByRole('button', { name: 'Проверить 1 цель' });
    await waitFor(() => expect((run as HTMLButtonElement).disabled).toBe(false));

    fireEvent.click(run);
    expect(screen.getByText('Цели (1): RU-BS')).toBeTruthy();
    expect(reachabilityApi.createJob).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: CHARGE }));
    await waitFor(() => expect(onStarted).toHaveBeenCalledWith(job));
  });
});

describe('LaunchAside в Mini App: родной попап', () => {
  beforeEach(() => {
    dialog.isNative = true;
  });

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
    expect(screen.queryByRole('button', { name: CHARGE })).toBeNull();
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
