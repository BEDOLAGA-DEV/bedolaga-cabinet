import { describe, expect, it } from 'vitest';
import type { HostTarget, Summary, SummaryRow, Unit } from '@/api/reachability';
import { unit } from '../testUtils';
import {
  type FleetRow,
  fleetCounts,
  fleetRows,
  fleetState,
  filterRows,
  groupRows,
  isStale,
  lastCheckedAt,
  operatorBreakdown,
  scopeRefs,
} from './fleet';

/**
 * Состояние флота из сводки и хостов панели: сервер судится симками своего назначения,
 * группы «проблемы сначала», фильтры с числами, объём пачки по выбору.
 */

const NOW = new Date('2026-09-07T12:00:00Z');
const units: Unit[] = [
  { ...unit('mts|цфо|on', 'on', 'цфо'), name: 'МТС' },
  { ...unit('mts|пфо|on', 'on', 'пфо'), name: 'МТС' },
  { ...unit('tele2|цфо|on', 'on', 'цфо'), name: 'Tele2' },
  { ...unit('mts|цфо|off', 'off', 'цфо'), name: 'МТС' },
];
const cell = (verdict: string, at = '2026-09-06T21:14:00Z') => ({
  verdict: verdict as SummaryRow['cells'][string]['verdict'],
  matches_expectation: null,
  checked_at: at,
  job_id: 1,
});
const row = (over: Partial<SummaryRow>): SummaryRow => ({
  target_key: 'bs.example:9443',
  kind: 'host',
  ref: 'h-bs',
  label: 'Russia | LTE | БС',
  purpose: 'bs',
  purpose_guessed: false,
  in_panel: true,
  cells: {},
  ...over,
});
const host = (over: Partial<HostTarget>): HostTarget => ({
  uuid: 'h-bs',
  remark: 'Russia | LTE | БС',
  address: 'bs.example',
  port: 9443,
  sni: null,
  is_disabled: false,
  tag: null,
  purpose: 'bs',
  purpose_guessed: false,
  excluded: false,
  node_uuids: [],
  target_key: 'bs.example:9443',
  ...over,
});
const summary = (rows: SummaryRow[]): Summary => ({ dpi: 'any', units, rows, panel_error: null });
const fleetRow = (over: Partial<FleetRow>): FleetRow => ({
  key: 'a',
  ref: 'a',
  label: 'A',
  address: '',
  purpose: 'regular',
  state: 'ok',
  ok: 2,
  total: 2,
  checkedAt: '2026-09-06T00:00:00Z',
  blocked: [],
  inPanel: true,
  ...over,
});

describe('fleetRows', () => {
  it('judges a whitelist host only by whitelist sims and keeps the address', () => {
    const rows = fleetRows(
      summary([
        row({
          cells: {
            'mts|цфо|on': cell('reachable'),
            'tele2|цфо|on': cell('blocked'),
            'mts|цфо|off': cell('blocked'),
          },
        }),
      ]),
      [host({})],
    );
    expect(rows[0]).toMatchObject({
      key: 'bs.example:9443',
      ref: 'h-bs',
      state: 'partial',
      ok: 1,
      total: 2,
      blocked: ['tele2|цфо|on'],
      address: 'bs.example:9443',
      purpose: 'bs',
      checkedAt: '2026-09-06T21:14:00Z',
    });
  });

  it('skips cancelled cells, marks unchecked, drops excluded and out-of-panel rows', () => {
    const rows = fleetRows(
      summary([
        row({ cells: { 'mts|цфо|on': cell('cancelled') } }),
        row({ target_key: 'x:1', ref: 'h-x', label: 'X' }),
        row({ target_key: 'gone:1', ref: 'h-gone', label: 'Gone', in_panel: false }),
      ]),
      [host({}), host({ uuid: 'h-x', target_key: 'x:1', excluded: true })],
    );
    expect(rows.map((r) => [r.key, r.state, r.checkedAt])).toEqual([
      ['bs.example:9443', 'unchecked', null],
    ]);
  });

  it('judges a regular host by sims without the whitelist and unknown by all', () => {
    const cells = { 'mts|цфо|on': cell('blocked'), 'mts|цфо|off': cell('reachable') };
    const [regular] = fleetRows(summary([row({ purpose: 'regular', cells })]), [
      host({ purpose: 'regular' }),
    ]);
    const [unknown] = fleetRows(summary([row({ purpose: 'unknown', cells })]), [
      host({ purpose: 'unknown' }),
    ]);
    expect([regular.state, regular.ok, regular.total]).toEqual(['ok', 1, 1]);
    expect([unknown.state, unknown.ok, unknown.total]).toEqual(['partial', 1, 2]);
  });
});

describe('state, counts, filters, groups, scope', () => {
  const rows: FleetRow[] = [
    fleetRow({
      key: 'a',
      ref: 'a',
      label: 'Austria',
      purpose: 'bs',
      state: 'partial',
      ok: 1,
      total: 2,
    }),
    fleetRow({
      key: 'b',
      ref: 'b',
      label: 'Belgium',
      address: 'be.example:443',
      checkedAt: '2026-08-01T00:00:00Z',
    }),
    fleetRow({
      key: 'c',
      ref: 'c',
      label: 'Chile',
      state: 'unchecked',
      ok: 0,
      total: 0,
      checkedAt: null,
    }),
    fleetRow({ key: 'd', ref: 'd', label: 'Denmark', state: 'down', ok: 0, total: 3 }),
  ];

  it('maps ok/total to state', () => {
    expect([fleetState(0, 0), fleetState(3, 3), fleetState(0, 3), fleetState(1, 3)]).toEqual([
      'unchecked',
      'ok',
      'down',
      'partial',
    ]);
  });

  it('counts states, purposes and stale servers', () => {
    expect(fleetCounts(rows, NOW)).toEqual({
      total: 4,
      ok: 1,
      partial: 1,
      down: 1,
      unchecked: 1,
      bs: 1,
      regular: 3,
      stale: 2,
    });
    expect(isStale(rows[1], NOW)).toBe(true);
    expect(isStale(rows[0], NOW)).toBe(false);
  });

  it('фильтрует по состоянию, давности, назначению и тексту в имени или адресе', () => {
    expect(filterRows(rows, 'problems', '', NOW).map((r) => r.key)).toEqual(['a', 'd']);
    expect(filterRows(rows, 'stale', '', NOW).map((r) => r.key)).toEqual(['b', 'c']);
    expect(filterRows(rows, 'bs', '', NOW).map((r) => r.key)).toEqual(['a']);
    expect(filterRows(rows, 'regular', '', NOW).map((r) => r.key)).toEqual(['b', 'c', 'd']);
    expect(filterRows(rows, 'all', 'BE.exa', NOW).map((r) => r.key)).toEqual(['b']);
    expect(filterRows(rows, 'all', 'chi', NOW).map((r) => r.key)).toEqual(['c']);
  });

  it('groups problems first and omits empty groups', () => {
    expect(groupRows(rows).map((g) => [g.state, g.rows.map((r) => r.key)])).toEqual([
      ['down', ['d']],
      ['partial', ['a']],
      ['unchecked', ['c']],
      ['ok', ['b']],
    ]);
    expect(groupRows([rows[1]]).map((g) => g.state)).toEqual(['ok']);
  });

  it('resolves scope refs for the batch', () => {
    expect(scopeRefs(rows, 'problems', NOW, [])).toEqual(['a', 'd']);
    expect(scopeRefs(rows, 'stale', NOW, [])).toEqual(['b', 'c']);
    expect(scopeRefs(rows, 'all', NOW, [])).toEqual(['a', 'b', 'c', 'd']);
    expect(scopeRefs(rows, 'manual', NOW, ['c', 'zzz', 'a'])).toEqual(['a', 'c']);
    expect(scopeRefs([fleetRow({ ref: null })], 'all', NOW, [])).toEqual([]);
  });

  it('finds the latest check across rows', () => {
    expect(lastCheckedAt(rows)).toBe('2026-09-06T00:00:00Z');
    expect(lastCheckedAt([rows[2]])).toBeNull();
  });
});

describe('operatorBreakdown', () => {
  it('groups sims by operator with blocked regions in words, sorted by name', () => {
    const r = row({
      cells: {
        'mts|цфо|on': cell('reachable'),
        'mts|пфо|on': cell('blocked'),
        'tele2|цфо|on': cell('down'),
        'mts|цфо|off': cell('reachable'),
      },
    });
    expect(operatorBreakdown(r, units, 'on')).toEqual([
      { operator: 'mts', name: 'МТС', ok: 1, total: 2, blockedRegions: ['ПФО'] },
      { operator: 'tele2', name: 'Tele2', ok: 0, total: 1, blockedRegions: ['ЦФО'] },
    ]);
    expect(operatorBreakdown(r, units, null).find((o) => o.operator === 'mts')?.total).toBe(3);
  });
});
