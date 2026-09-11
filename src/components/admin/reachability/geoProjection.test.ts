import { describe, expect, it } from 'vitest';
import RUSSIA from './assets/russia-regions.json';
import type { RussiaMap } from './geoMapData';
import { projectPoint } from './geoProjection';

const map = RUSSIA as unknown as RussiaMap;

describe('geoProjection', () => {
  it('точка Москвы ложится туда же, куда её положил генератор карты', () => {
    const [x, y] = projectPoint(map.projection, 55.7558, 37.6173);
    expect(x).toBeCloseTo(map.probes.moscow[0], 0);
    expect(y).toBeCloseTo(map.probes.moscow[1], 0);
  });
  it('запад — левее, север — выше; Чукотка за 180° не улетает на левый край', () => {
    const kaliningrad = projectPoint(map.projection, 54.71, 20.51);
    const vladivostok = projectPoint(map.projection, 43.12, 131.89);
    const anadyr = projectPoint(map.projection, 64.73, 177.51);
    const providenya = projectPoint(map.projection, 64.42, -173.23);
    const murmansk = projectPoint(map.projection, 68.97, 33.08);
    expect(kaliningrad[0]).toBeLessThan(vladivostok[0]);
    expect(vladivostok[0]).toBeLessThan(anadyr[0]);
    expect(anadyr[0]).toBeLessThan(providenya[0]);
    expect(providenya[0]).toBeLessThanOrEqual(map.width);
    expect(murmansk[1]).toBeLessThan(kaliningrad[1]);
    for (const [x, y] of [kaliningrad, vladivostok, anadyr, murmansk]) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(map.height);
    }
  });
});
