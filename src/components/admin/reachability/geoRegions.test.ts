import { describe, expect, it } from 'vitest';
import { REGION_CODES, normalizeRegionName, regionCodeFor } from './geoRegions';

describe('geoRegions', () => {
  it('русское имя региона из справочника → код региона на карте', () => {
    expect(regionCodeFor('Воронежская область')).toBe('VOR');
    expect(regionCodeFor('Москва')).toBe('MOW');
    expect(regionCodeFor('Московская область')).toBe('MOS');
    expect(regionCodeFor('Республика Татарстан')).toBe('TA');
    expect(regionCodeFor('Татарстан')).toBe('TA');
    expect(regionCodeFor('Санкт-Петербург')).toBe('SPE');
    expect(regionCodeFor('Ханты-Мансийский АО')).toBe('KHM');
    expect(regionCodeFor('Ханты-Мансийский автономный округ — Югра')).toBe('KHM');
    expect(regionCodeFor('Кемеровская область — Кузбасс')).toBe('KEM');
    expect(regionCodeFor('Республика Саха (Якутия)')).toBe('SA');
    expect(regionCodeFor('Забайкальский край')).toBe('Zabaykalsky');
    expect(regionCodeFor('Республика Крым')).toBe('CR');
    expect(regionCodeFor('Севастополь')).toBe('SEV');
    expect(regionCodeFor('Донецкая Народная Республика')).toBe('DON');
  });
  it('нормализация имени: регистр, ё, служебные слова, тире', () => {
    expect(normalizeRegionName('Орловская область')).toBe('орловская');
    expect(normalizeRegionName('Республика Северная Осетия — Алания')).toBe(
      'северная осетия - алания',
    );
    expect(normalizeRegionName('г. Москва')).toBe('москва');
  });
  it('неизвестный регион — null, а не исключение', () => {
    expect(regionCodeFor('Тмутаракань')).toBeNull();
    expect(regionCodeFor('')).toBeNull();
  });
  it('в таблице 83 субъекта с кодами карты и 4 региона без контура на ней', () => {
    // 85 субъектов до 2022 года = 83 с ISO-кодом на карте + Крым и Севастополь; ДНР и ЛНР — тоже без контура.
    const codes = new Set(Object.values(REGION_CODES));
    expect(codes.size).toBe(87);
    expect(['CR', 'SEV', 'DON', 'LUG'].every((code) => codes.has(code))).toBe(true);
  });
});
