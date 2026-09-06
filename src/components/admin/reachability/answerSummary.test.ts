import { describe, expect, it } from 'vitest';
import type { Summary, SummaryCell, SummaryRow } from '@/api/reachability';
import { defaultProbeSet, hostAnswers } from './answerSummary';
import { unit } from './testUtils';

/** Первый экран: по одному предложению на хост из сводки и набор «Проверить снова» по умолчанию. */

const cell = (verdict: SummaryCell['verdict'], at = '2026-09-05T12:00:00+00:00'): SummaryCell => ({
  verdict,
  matches_expectation: verdict === 'reachable',
  checked_at: at,
  job_id: 1,
});
const row = (patch: Partial<SummaryRow>): SummaryRow => ({
  target_key: 'bs.example:9443',
  kind: 'host',
  ref: 'h-bs',
  label: 'Russia | LTE | БС',
  purpose: 'bs',
  purpose_guessed: false,
  in_panel: true,
  cells: {},
  ...patch,
});
const summary = (rows: SummaryRow[]): Summary => ({
  dpi: 'on',
  units: [unit('mts|цфо|on', 'on', 'цфо'), unit('tele2|цфо|on', 'on', 'цфо')],
  panel_error: null,
  rows,
});

describe('hostAnswers', () => {
  it('считает открывшиеся симки, перечисляет режущие, берёт самую свежую проверку', () => {
    const answers = hostAnswers(
      summary([
        row({
          cells: {
            'mts|цфо|on': cell('reachable'),
            'tele2|цфо|on': cell('blocked', '2026-09-06T09:00:00+00:00'),
          },
        }),
        row({ target_key: 'eu.example:443', ref: 'h-eu', label: 'Germany', purpose: 'regular' }),
      ]),
    );
    expect(answers).toEqual([
      {
        targetKey: 'bs.example:9443',
        ref: 'h-bs',
        label: 'Russia | LTE | БС',
        purpose: 'bs',
        ok: 1,
        total: 2,
        blocked: ['tele2|цфо|on'],
        checkedAt: '2026-09-06T09:00:00+00:00',
      },
      {
        targetKey: 'eu.example:443',
        ref: 'h-eu',
        label: 'Germany',
        purpose: 'regular',
        ok: 0,
        total: 0,
        blocked: [],
        checkedAt: null,
      },
    ]);
  });

  it('отменённые проверки не считаются', () => {
    const [answer] = hostAnswers(summary([row({ cells: { 'mts|цфо|on': cell('cancelled') } })]));
    expect([answer.ok, answer.total, answer.checkedAt]).toEqual([0, 0, null]);
  });
});

describe('defaultProbeSet', () => {
  const catalog = [
    unit('mts|цфо|on', 'on', 'цфо'),
    unit('tele2|цфо|on', 'on', 'цфо'),
    unit('yota|уфо|off', 'off', 'уфо'),
    { ...unit('dead|цфо|on', 'on', 'цфо'), probeable: false },
  ];

  it('хосты под Белый список и симки с ним', () => {
    expect(
      defaultProbeSet(
        summary([
          row({}),
          row({ target_key: 'eu.example:443', ref: 'h-eu', label: 'Germany', purpose: 'regular' }),
        ]),
        catalog,
      ),
    ).toEqual({ hosts: ['h-bs'], units: ['mts|цфо|on', 'tele2|цфо|on'], dpi: 'on' });
  });

  it('без хостов под Белый список — все хосты панели и симки без него', () => {
    expect(
      defaultProbeSet(
        summary([
          row({ target_key: 'eu.example:443', ref: 'h-eu', label: 'Germany', purpose: 'regular' }),
          row({
            target_key: 'gone',
            ref: 'h-gone',
            label: 'Gone',
            purpose: 'regular',
            in_panel: false,
          }),
        ]),
        catalog,
      ),
    ).toEqual({ hosts: ['h-eu'], units: ['yota|уфо|off'], dpi: 'off' });
  });
});
