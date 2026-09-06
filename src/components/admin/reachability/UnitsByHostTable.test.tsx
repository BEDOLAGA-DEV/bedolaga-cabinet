// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Summary } from '@/api/reachability';

/**
 * Матрица на узких экранах — в том же стиле, что таблицы результата: строки — симки операторов
 * с округом, столбцы — хосты, в ячейке точка и вердикт словом, тап ведёт в задачу.
 */

vi.mock('react-i18next', async () => (await import('./testUtils')).i18nMock());

import { UnitsByHostTable } from './UnitsByHostTable';
import { renderWithProviders, unit } from './testUtils';

afterEach(cleanup);

const summary: Summary = {
  dpi: 'on',
  units: [
    { ...unit('mts|цфо|on', 'on', 'цфо'), name: 'МТС' },
    { ...unit('yota|уфо|off', 'off', 'уфо'), name: 'Yota' },
  ],
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
          checked_at: '2026-09-05T12:00:00Z',
          job_id: 1,
        },
        'yota|уфо|off': {
          verdict: 'blocked',
          matches_expectation: false,
          checked_at: '2026-09-05T12:00:00Z',
          job_id: 2,
        },
      },
    },
    {
      target_key: 'eu.example:443',
      kind: 'host',
      ref: 'h-eu',
      label: 'Germany',
      purpose: 'regular',
      purpose_guessed: false,
      in_panel: true,
      cells: {
        'mts|цфо|on': {
          verdict: 'down',
          matches_expectation: null,
          checked_at: '2026-09-05T12:00:00Z',
          job_id: 3,
        },
      },
    },
  ],
  panel_error: null,
};

describe('UnitsByHostTable', () => {
  it('строки — симки с округом, столбцы — хосты, в ячейке вердикт-ссылка в задачу', () => {
    renderWithProviders(<UnitsByHostTable summary={summary} />);
    expect(screen.getAllByRole('columnheader').map((th) => th.textContent)).toEqual([
      'Оператор',
      'Russia | LTE | БС',
      'Germany',
    ]);
    expect(screen.getAllByRole('row')).toHaveLength(3);
    expect(screen.getByText('МТС')).toBeTruthy();
    expect(screen.getByText('ЦФО')).toBeTruthy();
    expect(screen.getByText('без БС')).toBeTruthy();
    const links = screen.getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual(['доступен', 'недоступен', 'режется']);
    expect(links[0].getAttribute('href')).toContain('job=1');
  });

  it('симка без проверки по хосту — прочерк', () => {
    renderWithProviders(<UnitsByHostTable summary={summary} />);
    expect(screen.getByText('—')).toBeTruthy();
  });
});
