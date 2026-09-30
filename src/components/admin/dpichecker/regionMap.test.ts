import { describe, expect, it } from 'vitest';
import type { CheckResource, CheckRow, Pop } from '@/api/dpichecker';
import RUSSIA from '../reachability/assets/russia-regions.json';
import { DPI_REGION_ISO } from './regionIso';
import { regionStates } from './regionMap';

/**
 * Карта результата как на dpichecker.st: регион красится по своим точкам (все доступны — зелёный,
 * ни одна — красный, часть — жёлтый, не проверялся или прокси не поднялся — серый), в подсказке —
 * операторы региона «ок из скольких», «Любой» последним.
 */

const row = (pop_id: number, ok: boolean, extra: Partial<CheckRow> = {}): CheckRow => ({
  pop_id,
  region: `точка ${pop_id}`,
  ok,
  latency_ms: null,
  speeds: [],
  error: null,
  reason: null,
  verdict: null,
  error_code: null,
  port_story: null,
  mode: null,
  internet_ok: null,
  proxy_dead: false,
  ...extra,
});
const resource = (index: number, rows: CheckRow[]): CheckResource => ({
  index,
  name: `r${index}`,
  value: null,
  server_ip: null,
  total: rows.length,
  ok_count: rows.filter((item) => item.ok).length,
  direct: null,
  rows,
});
const pop = (id: number, region: string, operator: string | null = null): Pop => ({
  id,
  location: 'russia',
  region,
  operator,
  is_healthy: true,
});
const POPS = [
  pop(1, 'Алтайский край'),
  pop(3, 'Архангельская обл.', 'Ростелеком'),
  pop(4, 'Архангельская обл.'),
  pop(5, 'Мурманск'),
  pop(6, 'Крым'),
];

describe('regionStates', () => {
  it('регион по кодам карты, операторы с «ок из», «Любой» последним — по всем ресурсам', () => {
    const states = regionStates(
      [
        resource(0, [row(1, true), row(3, true), row(4, false)]),
        resource(1, [row(3, true), row(4, true)]),
      ],
      POPS,
    );
    expect(states.get('ALT')).toEqual({
      name: 'Алтайский край',
      status: 'green',
      pops: [{ label: null, ok: 1, bad: 0, dead: 0 }],
    });
    expect(states.get('ARK')).toEqual({
      name: 'Архангельская обл.',
      status: 'yellow',
      pops: [
        { label: 'Ростелеком', ok: 2, bad: 0, dead: 0 },
        { label: null, ok: 1, bad: 1, dead: 0 },
      ],
    });
  });

  it('ни одной удачной — красный; только мёртвый прокси — серый; Крым тоже на карте', () => {
    const states = regionStates(
      [resource(0, [row(5, false), row(6, false, { proxy_dead: true })])],
      POPS,
    );
    expect(states.get('MUR')?.status).toBe('red');
    expect(states.get('CR')).toEqual({
      name: 'Крым',
      status: 'gray',
      pops: [{ label: null, ok: 0, bad: 0, dead: 1 }],
    });
  });

  it('точки нет в справочнике — строка не теряется, но на карту не попадает', () => {
    expect(regionStates([resource(0, [row(99, true)])], POPS).size).toBe(0);
  });
});

describe('DPI_REGION_ISO', () => {
  it('все 85 регионов сервиса лежат на общей карте, коды без повторов', () => {
    const contours = new Set(RUSSIA.regions.map((region) => region.iso));
    const codes = Object.values(DPI_REGION_ISO);
    expect(Object.keys(DPI_REGION_ISO)).toHaveLength(85);
    expect(codes.filter((code) => !contours.has(code))).toEqual([]);
    expect(new Set(codes).size).toBe(codes.length);
  });
});
