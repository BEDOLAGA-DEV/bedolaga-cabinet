import type { Pop } from '@/api/dpichecker';

/**
 * Выбор точек присутствия — логика формы dpichecker.st буквально: пресеты «Оптимальный выбор /
 * Все доступные / Случайные 10 / очистить», клик по точке, по региону и по округу (все → снять,
 * иначе добавить), нерабочие точки не выбираются никогда. Выбор — неизменяемый Set.
 */

export type GroupState = 'all' | 'part' | 'none';
export const RANDOM_COUNT = 10;

function healthySet(pops: Pop[]): Set<number> {
  return new Set(pops.filter((pop) => pop.is_healthy).map((pop) => pop.id));
}

export function healthyIds(pops: Pop[]): number[] {
  return pops.filter((pop) => pop.is_healthy).map((pop) => pop.id);
}

export function pickAll(pops: Pop[]): Set<number> {
  return new Set(healthyIds(pops));
}

export function pickOptimal(ids: number[], pops: Pop[]): Set<number> {
  const healthy = healthySet(pops);
  return new Set(ids.filter((id) => healthy.has(id)));
}

export function pickRandom(pops: Pop[], count = RANDOM_COUNT, rnd = Math.random): Set<number> {
  const pool = healthyIds(pops);
  const shuffled = pool
    .map((id) => ({ id, key: rnd() }))
    .sort((a, b) => a.key - b.key)
    .map((item) => item.id);
  return new Set(shuffled.slice(0, count));
}

export function toggle(selected: Set<number>, id: number, pops: Pop[]): Set<number> {
  const next = new Set(selected);
  if (next.has(id)) {
    next.delete(id);
    return next;
  }
  if (healthySet(pops).has(id)) next.add(id);
  return next;
}

export function groupState(ids: number[], selected: Set<number>, pops: Pop[]): GroupState {
  const healthy = healthySet(pops);
  const alive = ids.filter((id) => healthy.has(id));
  const chosen = alive.filter((id) => selected.has(id)).length;
  if (alive.length === 0 || chosen === 0) return 'none';
  return chosen === alive.length ? 'all' : 'part';
}

export function toggleGroup(ids: number[], selected: Set<number>, pops: Pop[]): Set<number> {
  const healthy = healthySet(pops);
  const alive = ids.filter((id) => healthy.has(id));
  const next = new Set(selected);
  if (groupState(ids, selected, pops) === 'all') {
    for (const id of alive) next.delete(id);
  } else {
    for (const id of alive) next.add(id);
  }
  return next;
}

export interface RegionGroup {
  region: string;
  pops: Pop[];
  alive: number;
}

export function byRegion(pops: Pop[], query: string): RegionGroup[] {
  const needle = query.trim().toLocaleLowerCase('ru');
  const groups = new Map<string, Pop[]>();
  for (const pop of pops) {
    const hay = `${pop.region ?? ''} ${pop.operator ?? ''}`.toLocaleLowerCase('ru');
    if (needle && !hay.includes(needle)) continue;
    const region = pop.region || '—';
    groups.set(region, [...(groups.get(region) ?? []), pop]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'ru'))
    .map(([region, list]) => ({
      region,
      pops: list,
      alive: list.filter((pop) => pop.is_healthy).length,
    }));
}

export function effectiveSelection(selected: Set<number>, pops: Pop[]): number[] {
  const healthy = healthySet(pops);
  return [...selected].filter((id) => healthy.has(id)).sort((a, b) => a - b);
}
