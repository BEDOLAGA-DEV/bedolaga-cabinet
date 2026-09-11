import { describe, expect, it } from 'vitest';
import type { Job } from '@/api/reachability';
import { filterGeoRows, geoRowsOf, geoSummaryOf, sortGeoRows } from './geoRowsView';

const row = (patch: Record<string, unknown>) => ({
  region: 'moscow',
  region_ru: 'Москва',
  district: 'ЦФО',
  city: 'moscow',
  city_ru: 'Москва',
  provider: 'mts',
  verdict: 'ok',
  is_result: true,
  latency_ms: 90,
  targets: [{ key: 'a.example:443', ok: true, ms: 90, kind: 'tls', err: null }],
  tunnel: null,
  heavy: null,
  mb_bill: 0.1,
  err: null,
  flaky: false,
  retries: null,
  ...patch,
});

const job = {
  kind: 'geo',
  status: 'done',
  legs: [],
  result: {
    rows: [
      row({}),
      row({
        region: 'voronezh_oblast',
        region_ru: 'Воронежская область',
        city: 'voronezh',
        city_ru: 'Воронеж',
        provider: 'rt',
        verdict: 'blocked',
        latency_ms: null,
        targets: [{ key: 'a.example:443', ok: false, ms: null, kind: 'tls', err: 'timeout' }],
      }),
      row({
        region: 'omsk_oblast',
        region_ru: 'Омская область',
        district: 'СФО',
        city: 'omsk',
        city_ru: 'Омск',
        provider: null,
        verdict: 'no_ru_node',
        is_result: false,
        latency_ms: null,
        targets: [],
        mb_bill: null,
        err: 'run-timeout',
      }),
      'мусор',
    ],
    summary: {
      by_verdict: { ok: 1, blocked: 1, no_ru_node: 1 },
      result_rows: 2,
      noise_rows: 1,
      conclusion: { code: 'mixed', text: 'Смешанная картина' },
      progress: { done: 3, total: 3 },
    },
    geo: {
      n_nodes: 3,
      reserve_credits: 90,
      estimated_sec: 5,
      scope_label: 'сайты · проводной · вся РФ',
    },
    note: 'Трафика не было, резерв возвращён',
  },
} as unknown as Job;

describe('geoRowsView', () => {
  it('строки и сводка читаются из результата задачи; мусор в строках пропускается', () => {
    expect(geoRowsOf(job)).toHaveLength(3);
    expect(geoSummaryOf(job)).toEqual({
      byVerdict: { ok: 1, blocked: 1, no_ru_node: 1 },
      resultRows: 2,
      noiseRows: 1,
      conclusion: 'Смешанная картина',
      progress: { done: 3, total: 3 },
      scopeLabel: 'сайты · проводной · вся РФ',
      nNodes: 3,
      note: 'Трафика не было, резерв возвращён',
    });
    expect(geoSummaryOf({ ...job, result: null })).toBeNull();
    expect(geoRowsOf({ ...job, result: { rows: 'нет' } })).toEqual([]);
  });
  it('сортировка: хуже — выше, потом по округу и региону; фильтр по вердикту и поиску', () => {
    const sorted = sortGeoRows(geoRowsOf(job));
    expect(sorted.map((item) => item.city)).toEqual(['voronezh', 'moscow', 'omsk']);
    const pick = (filter: Parameters<typeof filterGeoRows>[1]) =>
      filterGeoRows(sorted, filter).map((item) => item.city);
    expect(pick({ verdict: 'blocked', query: '' })).toEqual(['voronezh']);
    expect(pick({ verdict: null, query: 'ом' })).toEqual(['omsk']);
    expect(pick({ verdict: null, query: 'Воронеж' })).toEqual(['voronezh']);
  });
});
