// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Summary } from '@/api/reachability';

/**
 * Полоска над формой — вход в матрицу последних проверок: заголовок, давность, кнопка.
 * Сводки «N из M в норме · K с проблемой» больше нет: она смущала и ничего не решала.
 */

vi.mock('react-i18next', async () => (await import('./testUtils')).i18nMock());
vi.mock('@/api/reachability', () => ({ reachabilityApi: { getSummary: vi.fn() } }));

import { reachabilityApi } from '@/api/reachability';
import { HostsHealthStrip } from './HostsHealthStrip';
import { installMatchMedia, renderWithProviders, unit } from './testUtils';

installMatchMedia();
afterEach(cleanup);

const summary = (rows: Summary['rows']): Summary => ({
  dpi: 'on',
  units: [unit('mts|цфо|on', 'on', 'цфо')],
  panel_error: null,
  rows,
});
const bsRow = (cells: Summary['rows'][number]['cells']): Summary['rows'][number] => ({
  target_key: 'bs.example:9443',
  kind: 'host',
  ref: 'h-bs',
  label: 'Russia | LTE | БС',
  purpose: 'bs',
  purpose_guessed: false,
  in_panel: true,
  cells,
});

describe('HostsHealthStrip', () => {
  it('заголовок, давность и кнопка матрицы — без счётчиков «в норме / с проблемой»', async () => {
    vi.mocked(reachabilityApi.getSummary).mockResolvedValue(
      summary([
        bsRow({
          'mts|цфо|on': {
            verdict: 'blocked',
            matches_expectation: false,
            checked_at: new Date(Date.now() - 3 * 3_600_000).toISOString(),
            job_id: 1,
          },
        }),
      ]),
    );
    renderWithProviders(<HostsHealthStrip />);

    expect(await screen.findByRole('heading', { name: 'Матрица проверок' })).toBeTruthy();
    expect(screen.getByText(/^проверено /)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Показать матрицу' })).toBeTruthy();
    expect(screen.queryByText(/в норме/)).toBeNull();
    expect(screen.queryByText(/с проблем/)).toBeNull();
  });

  it('хосты есть, проверок нет — подсказка вместо кнопки', async () => {
    vi.mocked(reachabilityApi.getSummary).mockResolvedValue(summary([bsRow({})]));
    renderWithProviders(<HostsHealthStrip />);

    expect(await screen.findByText(/Проверок ещё не было/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Показать матрицу' })).toBeNull();
  });

  it('хостов под БС нет — так и написано', async () => {
    vi.mocked(reachabilityApi.getSummary).mockResolvedValue(summary([]));
    renderWithProviders(<HostsHealthStrip />);

    expect(await screen.findByText(/нет хостов/)).toBeTruthy();
  });
});
