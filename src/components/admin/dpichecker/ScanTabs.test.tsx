// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { usePermissionStore } from '@/store/permissions';
import { CheremshaTab } from './CheremshaTab';
import { NoisyTab, ProbeTab, ScanResult } from './ScanTabs';
import { renderWithProviders } from './testUtils';

/**
 * Соседи, Зонд, Черемша — тексты и логика сайта: Соседи бесплатно по строке на подсеть; Зонд —
 * «как это работает», цена «1 USD + трафик», подтверждение и отчёт как на сайте; Черемша — вердикт
 * словами по каждому адресу.
 */

vi.mock('react-i18next', async () => (await import('./testUtils')).i18nMock());

const NOISY_DONE = {
  id: 2628,
  status: 'done',
  cidr: '198.51.100.0/24',
  raw_target: '198.51.100.0/24',
  result_count: 17,
  analysis: {
    bad_ru: [{ ip: '198.51.100.101', domain: 'zapravki.edadeal.ru', pattern: 'edadeal.ru' }],
    grouped: [{ count: 1, label: 'edadeal.ru' }],
    vpn_like: [{ ip: '198.51.100.80', domain: 'data-1.1984vpn.ru' }],
    own_ip_bad: null,
    bad_foreign: [],
  },
};
const PROBE_DONE = {
  id: 88,
  status: 'done',
  stage: 'report',
  cidr: '198.51.100.0/24',
  raw_target: '198.51.100.0/24',
  verdict: 'clean',
  blocked_ips: 0,
  tested_ips: 3,
  traffic_bytes: '22066173',
  fixed_cost: 1,
  traffic_cost: 0.0331,
  error: null,
  results: {
    scanned: 17,
    kept: 12,
    in_subnet: 7,
    foreign_ok: 3,
    tested: 3,
    drops: [
      { ip: '198.51.100.13', domain: 'max.ru', reason: 'bad_sni' },
      { ip: '198.51.100.54', domain: 'glaveda.net', reason: 'moved_away' },
    ],
    assessment: {
      per_ip: [
        {
          ip: '198.51.100.82',
          domain: 'cache.ozonvideo.com',
          state: 'open',
          pops_green: 10,
          pops_yellow: 0,
          pops_red: 0,
          pops_total: 10,
        },
      ],
      per_pop: [{ pop_id: 35, name: 'Москва', tested: 3, blocked: 0, stalled: 0 }],
    },
  },
};
const CHEREMSHA = {
  loaded: true,
  last_refresh: '2026-09-24T06:35:36Z',
  truncated: false,
  max: 20,
  invalid: ['notadomain_x'],
  results: [
    {
      resource: 'rutracker.org',
      is_domain: true,
      resolved_ips: ['172.67.182.196'],
      domain_hit: true,
      rkn_subnet_hit: null,
      cdn_hit: '172.67.182.196 ∈ 172.67.128.0/17',
      blocked: true,
      asn: '13335',
      asn_org: 'CLOUDFLARENET',
      country: 'US',
    },
    {
      resource: 'google.com',
      is_domain: true,
      resolved_ips: ['142.251.20.101'],
      domain_hit: false,
      rkn_subnet_hit: null,
      cdn_hit: null,
      blocked: false,
      asn: '15169',
      asn_org: 'GOOGLE',
      country: 'US',
    },
  ],
};

const api = vi.hoisted(() => ({
  launchNoisy: vi.fn(),
  launchProbe: vi.fn(),
  getScan: vi.fn(),
  cheremsha: vi.fn(),
}));
vi.mock('@/api/dpichecker', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/dpichecker')>()),
  dpicheckerApi: {
    ...api,
    getStatus: vi.fn(async () => ({
      enabled: true,
      configured: true,
      balance: 53.5,
      noisy: { limit: 10, used: 1, remaining: 9, unlimited: false, resets_at: null },
      monitors: null,
      webhook_ready: true,
      error: null,
      total_spent: 0,
    })),
    noisyCsv: vi.fn(),
  },
}));
vi.mock('./pollInterval', () => ({ CHECK_POLL_MS: 10, CHECK_WAIT_SEC: 1 }));

const ACTION = { id: 5, kind: 'noisy', status: 'pending', label: '198.51.100.0/24' };

beforeEach(() => {
  usePermissionStore.setState({ permissions: ['dpichecker:*'], isLoaded: true });
  api.launchNoisy.mockImplementation(async (body: { target: string }) => ({
    ...ACTION,
    id: body.target.startsWith('198') ? 5 : 6,
  }));
  api.launchProbe.mockResolvedValue({ ...ACTION, id: 7, kind: 'probe', cost_usd: 1 });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it('Соседи: скан на каждую строку, бесплатно, остаток на сегодня виден', async () => {
  api.getScan.mockResolvedValue({ action: { ...ACTION, status: 'done' }, scan: NOISY_DONE });
  renderWithProviders(<NoisyTab />);
  expect(await screen.findByText(/использовано сегодня: 1/)).toBeTruthy();
  fireEvent.change(screen.getByRole('textbox'), {
    target: { value: '198.51.100.0/24\nexample.com' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Сканировать' }));
  await waitFor(() => expect(api.launchNoisy).toHaveBeenCalledTimes(2));
  expect(api.launchNoisy.mock.calls[0][0]).toMatchObject({ target: '198.51.100.0/24' });
  expect((await screen.findAllByText(/data-1\.1984vpn\.ru/)).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/Похожи на VPN/).length).toBeGreaterThan(0);
});

it('Зонд: цена и подтверждение перед запуском', async () => {
  renderWithProviders(<ProbeTab />);
  expect(screen.getByText(/1\.00 USD фикс/)).toBeTruthy();
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '198.51.100.0/24' } });
  fireEvent.click(screen.getByRole('button', { name: 'Оплатить' }));
  fireEvent.click(await screen.findByRole('button', { name: /Списать 1\.00 USD/ }));
  await waitFor(() =>
    expect(api.launchProbe).toHaveBeenCalledWith({ target: '198.51.100.0/24', source: 'paste' }),
  );
});

it('отчёт Зонда — как на сайте', async () => {
  api.getScan.mockResolvedValue({
    action: { ...ACTION, kind: 'probe', status: 'done', cost_usd: 1.0331 },
    scan: PROBE_DONE,
  });
  renderWithProviders(<ScanResult actionId={7} />);
  expect(await screen.findByText('Подсеть не заблокирована')).toBeTruthy();
  expect(screen.getByText(/Заблокировано адресов: 0 из 3 проверенных \(0%\)/)).toBeTruthy();
  expect(
    screen.getByText(
      /хостов 17 → доменов 12 → в подсети 7 → открываются из-за границы 3 → проверено из России 3/,
    ),
  ).toBeTruthy();
  expect(screen.getByText(/плохой SNI/)).toBeTruthy();
  expect(screen.getByText(/10 \/ 0 \/ 0 из 10/)).toBeTruthy();
});

it('Зонд в работе — этап словами', async () => {
  api.getScan.mockResolvedValue({
    action: { ...ACTION, kind: 'probe', status: 'running' },
    scan: { ...PROBE_DONE, status: 'running', stage: 'foreign', results: null, verdict: null },
  });
  renderWithProviders(<ScanResult actionId={7} />);
  expect(await screen.findByText(/проверяю из-за границы/i)).toBeTruthy();
});

it('Черемша: вердикты словами и пропущенное', async () => {
  api.cheremsha.mockResolvedValue(CHEREMSHA);
  renderWithProviders(<CheremshaTab />);
  fireEvent.change(screen.getByRole('textbox'), {
    target: { value: 'rutracker.org\ngoogle.com\nnotadomain_x' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Проверить' }));
  expect(await screen.findByText('заблокирован')).toBeTruthy();
  expect(screen.getByText('в реестре не найден')).toBeTruthy();
  expect(screen.getByText(/Пропущено \(не домен и не IP\): notadomain_x/)).toBeTruthy();
  expect(api.cheremsha).toHaveBeenCalledWith(['rutracker.org', 'google.com', 'notadomain_x']);
});
