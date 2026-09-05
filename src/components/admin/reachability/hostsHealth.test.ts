import { describe, expect, it } from 'vitest';
import type { Summary, SummaryCell } from '@/api/reachability';
import { hostsHealth } from './hostsHealth';

/** Полоска «Хосты под БС: N из M в норме»: по последним легам симок с БС. */

const unit = (op_key: string) => ({
  op_key,
  operator: op_key.split('|')[0],
  name: op_key,
  region: 'ЦФО',
  region_code: 'cfo',
  dpi: 'on',
  channel_state: 'DPI_ON',
  probeable: true,
  in_catalog: true,
});
const cell = (matches: boolean | null, at = '2026-09-05T12:00:00+00:00'): SummaryCell => ({
  verdict: matches ? 'reachable' : 'blocked',
  matches_expectation: matches,
  checked_at: at,
  job_id: 1,
});
const summary: Summary = {
  dpi: 'on',
  units: [unit('mts|цфо|on'), unit('tele2|цфо|on')],
  panel_error: null,
  rows: [
    {
      target_key: 'a',
      kind: 'host',
      ref: 'h-a',
      label: 'A',
      purpose: 'bs',
      purpose_guessed: false,
      in_panel: true,
      cells: { 'mts|цфо|on': cell(true), 'tele2|цфо|on': cell(true, '2026-09-05T13:00:00+00:00') },
    },
    {
      target_key: 'b',
      kind: 'host',
      ref: 'h-b',
      label: 'B',
      purpose: 'bs',
      purpose_guessed: true,
      in_panel: true,
      cells: { 'mts|цфо|on': cell(false) },
    },
    {
      target_key: 'c',
      kind: 'host',
      ref: 'h-c',
      label: 'C',
      purpose: 'regular',
      purpose_guessed: false,
      in_panel: true,
      cells: { 'mts|цфо|on': cell(null) },
    },
    {
      target_key: 'd',
      kind: 'host',
      ref: 'h-d',
      label: 'D',
      purpose: 'bs',
      purpose_guessed: false,
      in_panel: true,
      cells: {},
    },
  ],
};

describe('hostsHealth', () => {
  it('считает хосты под БС: в норме, с проблемами, непроверенные, и время последней проверки', () => {
    expect(hostsHealth(summary)).toEqual({
      total: 3,
      ok: 1,
      failing: 1,
      unchecked: 1,
      lastCheckedAt: '2026-09-05T13:00:00+00:00',
    });
  });

  it('без хостов под БС — нули и нет даты', () => {
    expect(hostsHealth({ ...summary, rows: [summary.rows[2]] })).toEqual({
      total: 0,
      ok: 0,
      failing: 0,
      unchecked: 0,
      lastCheckedAt: null,
    });
  });
});
