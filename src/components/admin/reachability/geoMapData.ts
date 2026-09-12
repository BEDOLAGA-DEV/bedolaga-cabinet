import { useEffect, useState } from 'react';
import type { AlbersParams } from './geoProjection';

/** Контур региона на холсте карты: код ISO без «RU-», имя по-русски, готовый SVG-путь. */
export interface RegionShape {
  iso: string;
  name: string;
  d: string;
}

export interface RussiaMap {
  width: number;
  height: number;
  projection: AlbersParams;
  probes: Record<string, [number, number]>;
  regions: RegionShape[];
}

/** «region|city» → [широта, долгота] для городов пула сервиса. */
export type CityCoords = Record<string, [number, number]>;

export interface GeoMapData {
  map: RussiaMap;
  coords: CityCoords;
}

/** Пропорции холста известны заранее — под них резервируется место, пока данные грузятся. */
export const MAP_ASPECT = '1000 / 545';

let cached: Promise<GeoMapData> | null = null;

/** Контуры и координаты весят под 200 КБ — грузятся один раз и только на вкладке GEO. */
export function loadGeoMapData(): Promise<GeoMapData> {
  cached ??= Promise.all([
    import('./assets/russia-regions.json'),
    import('./assets/geo-city-coords.json'),
  ]).then(([regions, coords]) => ({
    map: regions.default as unknown as RussiaMap,
    coords: coords.default as unknown as CityCoords,
  }));
  return cached;
}

export function useGeoMapData(): GeoMapData | null {
  const [data, setData] = useState<GeoMapData | null>(null);
  useEffect(() => {
    let alive = true;
    loadGeoMapData().then((loaded) => {
      if (alive) setData(loaded);
    });
    return () => {
      alive = false;
    };
  }, []);
  return data;
}
