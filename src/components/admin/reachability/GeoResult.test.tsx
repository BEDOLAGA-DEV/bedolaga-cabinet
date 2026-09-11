// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Job } from '@/api/reachability';

vi.mock('react-i18next', async () => (await import('./testUtils')).i18nMock());
vi.mock('@/platform/hooks/useNotify', () => ({
  useNotify: () => ({
    success: vi.fn(),
    error: vi.fn(),
    notify: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  }),
}));

import { GeoResult } from './GeoResult';
import { installMatchMedia, renderWithProviders } from './testUtils';

installMatchMedia();

afterEach(cleanup);

const row = (city: string, region_ru: string, verdict: string, is_result = true) => ({
  region: city,
  region_ru,
  district: 'ЦФО',
  city,
  city_ru: city,
  provider: 'mts',
  verdict,
  is_result,
  latency_ms: 50,
  targets: [],
  tunnel: null,
  heavy: null,
  mb_bill: 0.1,
  err: null,
  flaky: false,
  retries: null,
});

const job = {
  kind: 'geo',
  status: 'done',
  legs: [],
  result: {
    rows: [
      row('Москва', 'Москва', 'ok'),
      row('Воронеж', 'Воронежская область', 'blocked'),
      row('Омск', 'Омская область', 'exit_bad', false),
    ],
    summary: {
      by_verdict: { ok: 1, blocked: 1, exit_bad: 1 },
      result_rows: 2,
      noise_rows: 1,
      conclusion: { code: 'mixed', text: 'Смешанная картина' },
      progress: { done: 3, total: 3 },
    },
    geo: { n_nodes: 3, scope_label: 'сайты · проводной · вся РФ' },
  },
} as unknown as Job;

describe('GeoResult', () => {
  it('фраза-вывод, чипы вердиктов со счётом; чип фильтрует города, повторный клик снимает', () => {
    renderWithProviders(<GeoResult job={job} />);
    expect(screen.getByText('Смешанная картина')).toBeTruthy();
    expect(screen.getByText('не результат: 1')).toBeTruthy();
    const blocked = screen.getByRole('button', { name: /блокируется.*· 1/ });
    fireEvent.click(blocked);
    expect(screen.getAllByText('Воронеж').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('Москва')).toHaveLength(0);
    fireEvent.click(blocked);
    expect(screen.getAllByText('Москва').length).toBeGreaterThan(0);
  });
  it('поиск по городу или региону сужает список', () => {
    renderWithProviders(<GeoResult job={job} />);
    fireEvent.change(screen.getByLabelText('Найти город или регион…'), {
      target: { value: 'омск' },
    });
    expect(screen.getAllByText('Омск').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('Воронеж')).toHaveLength(0);
  });
  it('без результата — подпись', () => {
    renderWithProviders(<GeoResult job={{ ...job, result: null }} />);
    expect(screen.getByText('Результат пуст')).toBeTruthy();
  });
});
