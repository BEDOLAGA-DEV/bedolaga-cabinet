import type { CityCoords, RussiaMap } from './geoMapData';
import { projectPoint } from './geoProjection';
import { regionCodeFor } from './geoRegions';
import { GEO_VERDICTS, type GeoTone, verdictTone, worstVerdict } from './geoVerdicts';

/** Что карте нужно от строки прогона: где город, чей выход, какой итог; остальное — для подсказки. */
export interface GeoMapRow {
  region: string;
  region_ru: string;
  city: string;
  city_ru: string;
  verdict: string;
  provider: string | null;
  latency_ms: number | null;
  req_isp?: string | null;
  exit_ip?: string | null;
  exit_changed?: boolean;
  sid?: string | null;
  sid_hold_s?: number | null;
  rechecked?: boolean;
  new_exit?: boolean;
  flaky?: boolean;
  targets?: Array<{ key: string; ok: boolean; ms: number | null }>;
  tunnel?: { checks: Array<{ name: string; ok: boolean; ms: number | null }> } | null;
}

/** Точка города: одна на город, строк может быть несколько (по провайдеру на каждую). */
export interface CityMarker {
  key: string;
  x: number;
  y: number;
  name: string;
  regionName: string;
  regionCode: string | null;
  tone: GeoTone;
  rows: GeoMapRow[];
}

/** Регион на карте: тон заливки по худшему городу и счётчик вердиктов для подсказки. */
export interface RegionSummary {
  code: string;
  tone: GeoTone;
  cities: number;
  counts: Partial<Record<string, number>>;
}

export const cityKey = (row: Pick<GeoMapRow, 'region' | 'city'>): string =>
  `${row.region}|${row.city}`;

/** Тон группы строк: худший результат; одни шумовые — тон первой из них (серый, фиолетовый, синий). */
export function groupTone(rows: readonly Pick<GeoMapRow, 'verdict'>[]): GeoTone {
  const worst = worstVerdict(rows.map((row) => row.verdict));
  return verdictTone(worst ?? rows[0]?.verdict ?? '');
}

function groupBy<T>(rows: readonly T[], key: (row: T) => string | null): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const id = key(row);
    if (id === null) continue;
    groups.set(id, [...(groups.get(id) ?? []), row]);
  }
  return groups;
}

/** Города с координатами → точки на холсте; город вне справочника координат точки не получает. */
export function cityMarkers(
  rows: readonly GeoMapRow[],
  map: RussiaMap,
  coords: CityCoords,
): CityMarker[] {
  return [...groupBy(rows, cityKey)].flatMap(([key, group]) => {
    const point = coords[key];
    if (!point) return [];
    const [x, y] = projectPoint(map.projection, point[0], point[1]);
    const first = group[0];
    return [
      {
        key,
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        name: first.city_ru || first.city,
        regionName: first.region_ru || first.region,
        regionCode: regionCodeFor(first.region, first.region_ru),
        tone: groupTone(group),
        rows: group,
      },
    ];
  });
}

/** Сводка по регионам, у которых есть проверенные города. */
export function regionSummaries(rows: readonly GeoMapRow[]): Map<string, RegionSummary> {
  const byCode = groupBy(rows, (row) => regionCodeFor(row.region, row.region_ru));
  return new Map(
    [...byCode].map(([code, group]) => [
      code,
      {
        code,
        tone: groupTone(group),
        cities: new Set(group.map(cityKey)).size,
        counts: countVerdicts(group),
      },
    ]),
  );
}

/** Сколько строк на каждый вердикт, в порядке легенды; отсутствующие не входят. */
export function countVerdicts(
  rows: readonly Pick<GeoMapRow, 'verdict'>[],
): Partial<Record<string, number>> {
  const counts: Partial<Record<string, number>> = {};
  for (const verdict of GEO_VERDICTS) {
    const n = rows.filter((row) => row.verdict === verdict).length;
    if (n > 0) counts[verdict] = n;
  }
  return counts;
}
