import { describe, expect, it } from 'vitest';
import type { Summary, SummaryCell } from '@/api/reachability';
import { lastCheckedAt } from './lastChecked';
import { unit } from './testUtils';

/** Над матрицей — только давность последней проверки; никаких «N из M в норме». */

const cell = (at: string): SummaryCell => ({
  verdict: 'reachable',
  matches_expectation: true,
  checked_at: at,
  job_id: 1,
});
const row = (target_key: string, cells: Record<string, SummaryCell>): Summary['rows'][number] => ({
  target_key,
  kind: 'host',
  ref: null,
  label: target_key,
  purpose: 'bs',
  purpose_guessed: false,
  in_panel: true,
  cells,
});
const summary = (rows: Summary['rows']): Summary => ({
  dpi: 'on',
  units: [unit('mts|цфо|on', 'on', 'цфо')],
  panel_error: null,
  rows,
});

describe('lastCheckedAt', () => {
  it('самая свежая проверка по всем хостам и симкам', () => {
    expect(
      lastCheckedAt(
        summary([
          row('a', { 'mts|цфо|on': cell('2026-09-05T12:00:00+00:00') }),
          row('b', { 'mts|цфо|on': cell('2026-09-06T09:30:00+00:00') }),
        ]),
      ),
    ).toBe('2026-09-06T09:30:00+00:00');
  });

  it('без проверок — null', () => {
    expect(lastCheckedAt(summary([row('a', {})]))).toBeNull();
    expect(lastCheckedAt(summary([]))).toBeNull();
  });
});
