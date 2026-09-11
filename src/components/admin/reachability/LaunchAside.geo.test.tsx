// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { JobCreateRequest, PreviewResponse } from '@/api/reachability';

/** Панель «Запуск» для GEO: вместо симок — города и потолок режима; отказ «слишком много городов» — кнопкой. */

vi.mock('react-i18next', async () => (await import('./testUtils')).i18nMock());
vi.mock('@/api/reachability', () => ({
  reachabilityApi: {
    previewJob: vi.fn(),
    createJob: vi.fn(),
    getUnits: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock('@/platform/hooks/useNativeDialog', () => ({
  useNativeDialog: () => ({ confirm: vi.fn(), alert: vi.fn(), popup: vi.fn(), isNative: false }),
}));
vi.mock('@/platform/hooks/useNotify', () => ({
  useNotify: () => ({
    success: vi.fn(),
    error: vi.fn(),
    notify: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  }),
}));

import { reachabilityApi } from '@/api/reachability';
import { LaunchAside } from './LaunchAside';
import { DEFAULT_GEO_FORM, toGeoOptions } from './geoForm';
import { jobAdapterFor } from './launchAdapters';
import { installMatchMedia, renderWithProviders } from './testUtils';
import { useLaunch } from './useLaunch';

function Panel({ onApply }: { onApply?: (limit: number) => void }) {
  const launch = useLaunch(body, undefined, vi.fn(), jobAdapterFor('geo'));
  return <LaunchAside launch={launch} onApplyCityLimit={onApply} />;
}

const body: JobCreateRequest = {
  kind: 'geo',
  targets: [{ kind: 'custom', value: 'example.com' }],
  units: [],
  dpi: 'any',
  probes: { icmp: false, tcp: false, sni: false },
  core: '',
  sni_hosts: [],
  geo: toGeoOptions(DEFAULT_GEO_FORM),
};

const preview: PreviewResponse = {
  kind: 'geo',
  targets: [
    {
      kind: 'custom',
      label: 'example.com',
      address: 'example.com',
      port: 443,
      target_key: 'example.com:443',
      sni: null,
      ref: {},
      purpose: 'unknown',
    },
  ],
  units_resolved: ['geo'],
  skipped: { dpi_off: [], unavailable: [], unknown: [], blocked_targets: [] },
  cost_kopeks: 90,
  estimate_is_exact: false,
  warnings: ['Цена GEO — резерв: спишется факт по трафику, разница вернётся'],
  balance_kopeks: 10000,
  geo: { n_nodes: 89, cap_mb: 0.8, reserve_credits: 90, estimated_sec: 45, max_nodes: 800 },
};

installMatchMedia();
// Хук не должен возвращать мок: возвращённую функцию vitest зовёт как очистку после теста,
// а к тому моменту мок уже отклоняет промис — и это отклонение никто не ждёт.
beforeEach(() => {
  vi.mocked(reachabilityApi.previewJob).mockResolvedValue(preview);
});
afterEach(cleanup);

describe('LaunchAside · geo', () => {
  it('строка «Городов» с потолком режима, кнопка считает города, симки не упоминаются', async () => {
    renderWithProviders(<Panel />);
    await screen.findByText('89');
    expect(screen.getByText('потолок для режима 800')).toBeTruthy();
    expect(screen.queryByText(/Симки/)).toBeNull();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Проверить 89 городов/ })).toBeTruthy(),
    );
    expect(screen.getByText(/резерв/)).toBeTruthy();
    expect(screen.getByText('около 1 минут')).toBeTruthy();
  });
  it('отказ «слишком много городов» — кнопка ставит предложенный потолок в форму', async () => {
    const refusal = Object.assign(new Error('too_many_nodes'), {
      isAxiosError: true,
      response: {
        status: 400,
        data: {
          detail: 'Слишком много городов для этого режима: сервис предлагает потолок 120 городов',
        },
      },
    });
    vi.mocked(reachabilityApi.previewJob).mockRejectedValue(refusal);
    const onApply = vi.fn();
    renderWithProviders(<Panel onApply={onApply} />);
    const apply = await screen.findByRole('button', { name: 'Поставить потолок 120' });
    expect(screen.getByText(/потолок 120 городов/)).toBeTruthy();
    fireEvent.click(apply);
    expect(onApply).toHaveBeenCalledWith(120);
  });
});
