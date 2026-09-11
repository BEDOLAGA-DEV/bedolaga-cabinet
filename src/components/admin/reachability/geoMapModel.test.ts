import { describe, expect, it } from 'vitest';
import COORDS from './assets/geo-city-coords.json';
import RUSSIA from './assets/russia-regions.json';
import type { CityCoords, RussiaMap } from './geoMapData';
import { cityMarkers, countVerdicts, groupTone, regionSummaries } from './geoMapModel';

const map = RUSSIA as unknown as RussiaMap;
const coords = COORDS as unknown as CityCoords;

const row = (region: string, city: string, verdict: string, provider = 'mts') => ({
  region,
  region_ru: region,
  city,
  city_ru: city,
  verdict,
  provider,
  latency_ms: verdict === 'ok' ? 100 : null,
});

const ROWS = [
  row('moscow', 'moscow', 'ok'),
  row('moscow', 'moscow', 'blocked', 'beeline'),
  row('voronezh_oblast', 'voronezh', 'ok'),
  row('voronezh_oblast', 'liski', 'partial'),
  row('omsk_oblast', 'omsk', 'exit_bad'),
  row('nowhere', 'nowhere', 'ok'),
];

describe('geoMapModel', () => {
  it('одна точка на город: две строки Москвы сливаются, тон — по худшей; город без координат точки не получает', () => {
    const markers = cityMarkers(ROWS, map, coords);
    expect(markers.map((marker) => marker.key)).toEqual([
      'moscow|moscow',
      'voronezh_oblast|voronezh',
      'voronezh_oblast|liski',
      'omsk_oblast|omsk',
    ]);
    const moscow = markers[0];
    expect(moscow.tone).toBe('down');
    expect(moscow.rows).toHaveLength(2);
    expect(moscow.regionCode).toBe('MOW');
    expect(moscow.x).toBeCloseTo(map.probes.moscow[0], 0);
    expect(moscow.y).toBeCloseTo(map.probes.moscow[1], 0);
  });
  it('регион: тон по худшему городу, число городов и счёт вердиктов; шум — серый', () => {
    const regions = regionSummaries(ROWS);
    expect(regions.get('MOW')).toEqual({
      code: 'MOW',
      tone: 'down',
      cities: 1,
      counts: { ok: 1, blocked: 1 },
    });
    expect(regions.get('VOR')).toEqual({
      code: 'VOR',
      tone: 'warn',
      cities: 2,
      counts: { ok: 1, partial: 1 },
    });
    expect(regions.get('OMS')?.tone).toBe('na');
    expect(regions.has('nowhere')).toBe(false);
  });
  it('тон группы: худший результат, а без результатов — тон первого шумового вердикта', () => {
    expect(groupTone([{ verdict: 'ok' }, { verdict: 'throttled' }])).toBe('orange');
    expect(groupTone([{ verdict: 'no_udp' }, { verdict: 'exit_bad' }])).toBe('violet');
    expect(groupTone([])).toBe('na');
    expect(countVerdicts([{ verdict: 'ok' }, { verdict: 'ok' }, { verdict: 'x' }])).toEqual({
      ok: 2,
    });
  });
});
