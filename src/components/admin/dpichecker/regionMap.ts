import type { CheckResource, Pop } from '@/api/dpichecker';
import { DPI_REGION_ISO } from './regionIso';

/** Итог региона как у сайта: все точки доступны, ни одна, часть, не проверялся. */
export type RegionStatus = 'green' | 'yellow' | 'red' | 'gray';

/** Оператор внутри региона: `label` null — точка «Любой» (без оператора). */
export interface RegionPop {
  label: string | null;
  ok: number;
  bad: number;
  /** Прокси самой точки не поднялся — ни «доступно», ни «недоступно». */
  dead: number;
}

export interface RegionState {
  /** Название региона у сервиса («Мурманск», «Приморье») — его и видит админ в списке ниже. */
  name: string;
  status: RegionStatus;
  pops: RegionPop[];
}

function statusOf(pops: RegionPop[]): RegionStatus {
  const ok = pops.reduce((sum, pop) => sum + pop.ok, 0);
  const bad = pops.reduce((sum, pop) => sum + pop.bad, 0);
  if (ok + bad === 0) return 'gray';
  if (bad === 0) return 'green';
  return ok === 0 ? 'red' : 'yellow';
}

const byLabel = (a: RegionPop, b: RegionPop) =>
  a.label === null ? 1 : b.label === null ? -1 : a.label.localeCompare(b.label, 'ru');

/**
 * Строки проверки (ресурс × точка) → итог по регионам карты, ключ — код региона на карте. Регион и
 * оператор точки берутся из справочника точек (в строке они склеены: «Архангельская обл. Ростелеком»).
 * Точка без справочника или вне карты на неё не попадает — список ниже её всё равно показывает.
 */
export function regionStates(
  resources: readonly CheckResource[],
  pops: readonly Pop[],
): Map<string, RegionState> {
  const popById = new Map(pops.map((pop) => [pop.id, pop]));
  const counters = new Map<string, { name: string; pops: Map<string, RegionPop> }>();
  for (const row of resources.flatMap((resource) => resource.rows)) {
    const pop = row.pop_id === null ? undefined : popById.get(row.pop_id);
    const iso = pop ? DPI_REGION_ISO[pop.region] : undefined;
    if (!pop || !iso) continue;
    const region = counters.get(iso) ?? { name: pop.region, pops: new Map() };
    counters.set(iso, region);
    const key = pop.operator ?? '';
    const current = region.pops.get(key) ?? { label: pop.operator, ok: 0, bad: 0, dead: 0 };
    region.pops.set(key, {
      ...current,
      ok: current.ok + (row.ok ? 1 : 0),
      bad: current.bad + (!row.ok && !row.proxy_dead ? 1 : 0),
      dead: current.dead + (!row.ok && row.proxy_dead ? 1 : 0),
    });
  }
  return new Map(
    [...counters].map(([iso, region]) => {
      const list = [...region.pops.values()].sort(byLabel);
      return [iso, { name: region.name, status: statusOf(list), pops: list }];
    }),
  );
}
