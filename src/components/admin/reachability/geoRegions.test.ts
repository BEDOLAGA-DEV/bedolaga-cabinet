import { describe, expect, it } from 'vitest';
import REGION_ISO from './assets/geo-region-iso.json';
import RUSSIA from './assets/russia-regions.json';
import { normalizeRegionName, regionCodeFor } from './geoRegions';

describe('geoRegions', () => {
  it('токен региона сервиса → код региона на карте', () => {
    expect(regionCodeFor('moscow')).toBe('MOW');
    expect(regionCodeFor('st.-petersburg')).toBe('SPE');
    expect(regionCodeFor('arkhangelskaya')).toBe('ARK');
    expect(regionCodeFor('yevrey_(jewish)_autonomous_oblast')).toBe('YEV');
    expect(regionCodeFor('transbaikal_territory')).toBe('ZAB');
  });
  it('незнакомый токен — по русскому имени; совсем неизвестный — null, не исключение', () => {
    expect(regionCodeFor('x', 'Воронежская область')).toBe('VOR');
    expect(regionCodeFor('x', 'Ханты-Мансийский автономный округ — Югра')).toBe('KHM');
    expect(regionCodeFor('x', 'Республика Саха (Якутия)')).toBe('SA');
    expect(regionCodeFor('Тмутаракань')).toBeNull();
    expect(regionCodeFor('')).toBeNull();
  });
  it('нормализация имени: регистр, ё, служебные слова, тире', () => {
    expect(normalizeRegionName('Орловская область')).toBe('орловская');
    expect(normalizeRegionName('Республика Северная Осетия — Алания')).toBe(
      'северная осетия - алания',
    );
    expect(normalizeRegionName('г. Москва')).toBe('москва');
  });
  it('у каждого региона пула есть контур на карте', () => {
    const contours = new Set(RUSSIA.regions.map((region) => region.iso));
    const missing = Object.entries(REGION_ISO).filter(([, iso]) => !contours.has(iso));
    expect(missing).toEqual([]);
    expect(Object.keys(REGION_ISO).length).toBe(82);
    expect(RUSSIA.regions.length).toBe(83);
  });
});
