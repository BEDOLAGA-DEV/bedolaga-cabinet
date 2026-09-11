// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', async () => (await import('./testUtils')).i18nMock());
vi.mock('@/platform/hooks/useNativeDialog', () => ({
  useNativeDialog: () => ({ isNative: false, confirm: vi.fn() }),
}));
vi.mock('@/platform/hooks/useNotify', () => ({
  useNotify: () => ({ success: vi.fn(), error: vi.fn() }),
}));
vi.mock('@/api/reachability', async () => {
  const actual = await vi.importActual<typeof import('@/api/reachability')>('@/api/reachability');
  return {
    ...actual,
    reachabilityApi: {
      ...actual.reachabilityApi,
      getUnits: vi.fn(async () => []),
      getHosts: vi.fn(async () => []),
      getGeoCatalog: vi.fn(async () => ({
        networks: ['res'],
        districts: [],
        regions: [],
        isps: [],
        cities: [],
        cities_total: 0,
        cities_truncated: false,
      })),
      previewJob: vi.fn(async () => ({
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
        warnings: [],
        balance_kopeks: 10000,
        geo: { n_nodes: 89, cap_mb: 0.8, reserve_credits: 90, estimated_sec: 45, max_nodes: 800 },
      })),
    },
  };
});

import { Launcher } from './Launcher';
import { parseReachabilityDeepLink } from './deepLink';
import { installMatchMedia, renderWithProviders } from './testUtils';

installMatchMedia();
afterEach(cleanup);

describe('Launcher · geo', () => {
  it('во вкладке GEO показаны блоки «Цели», «Откуда», «Метод», а не симки', async () => {
    renderWithProviders(
      <Launcher
        status={undefined}
        link={parseReachabilityDeepLink(new URLSearchParams('kind=geo'))}
        runningJobId={null}
        onRunning={vi.fn()}
      />,
    );
    expect(await screen.findByRole('heading', { name: 'Откуда' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Метод' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Цели' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Операторы' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Пробы' })).toBeNull();
  });
});
