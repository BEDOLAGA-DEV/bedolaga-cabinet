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
export const MAP_ASPECT = '1000 / 531';

let cached: Promise<GeoMapData> | null = null;
let cachedMap: Promise<RussiaMap> | null = null;

/** Только контуры регионов (без городов) — карта результата DPI//CHECKER. */
export function loadRussiaMap(): Promise<RussiaMap> {
  cachedMap ??= import('./assets/russia-regions.json').then(
    (regions) => regions.default as unknown as RussiaMap,
  );
  return cachedMap;
}

/** Контуры и координаты весят под 200 КБ — грузятся один раз и только на вкладке GEO. */
export function loadGeoMapData(): Promise<GeoMapData> {
  cached ??= Promise.all([loadRussiaMap(), import('./assets/geo-city-coords.json')]).then(
    ([map, coords]) => ({ map, coords: coords.default as unknown as CityCoords }),
  );
  return cached;
}

function useLoaded<T>(load: () => Promise<T>): T | null {
  const [data, setData] = useState<T | null>(null);
  useEffect(() => {
    let alive = true;
    load().then((loaded) => {
      if (alive) setData(loaded);
    });
    return () => {
      alive = false;
    };
  }, [load]);
  return data;
}

export function useGeoMapData(): GeoMapData | null {
  return useLoaded(loadGeoMapData);
}

export function useRussiaMap(): RussiaMap | null {
  return useLoaded(loadRussiaMap);
}
