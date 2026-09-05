import type { JobKind, Purpose, Unit } from '@/api/reachability';
import { safeLocal } from '@/utils/safeStorage';

export type DpiFilter = 'on' | 'off' | 'any';

export interface UnitFilter {
  dpi: DpiFilter;
  region: string | null;
}

export function filterUnits(units: Unit[], filter: UnitFilter): Unit[] {
  return units.filter(
    (unit) =>
      (filter.dpi === 'any' || unit.dpi === filter.dpi) &&
      (!filter.region || unit.region_code === filter.region),
  );
}

export function regionsOf(units: Unit[]): Array<{ code: string; label: string }> {
  const seen = new Map<string, string>();
  for (const unit of units) {
    if (!seen.has(unit.region_code)) seen.set(unit.region_code, unit.region);
  }
  return [...seen.entries()].map(([code, label]) => ({ code, label }));
}

/** Всегда новый массив: выбор хранится в состоянии React. */
export function toggleKey(selected: string[], key: string): string[] {
  return selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key];
}

/** Объединение без дублей, порядок — сначала уже выбранные. */
export function mergeKeys(selected: string[], keys: string[]): string[] {
  return [...new Set([...selected, ...keys])];
}

/** Хосты под Белый список проверяются с БС; только обычные — без него; смесь — с БС. */
export function defaultDpiFor(purposes: Purpose[]): DpiFilter {
  const distinct = new Set(purposes.filter((purpose) => purpose !== 'unknown'));
  if (distinct.size === 1 && distinct.has('regular')) return 'off';
  return 'on';
}

/** Быстрый выбор: все доступные симки одного режима. Каждая трата — явное действие админа. */
export function pickUnits(units: Unit[], dpi: 'on' | 'off'): string[] {
  return units.filter((unit) => unit.probeable && unit.dpi === dpi).map((unit) => unit.op_key);
}

export interface OperatorGroup {
  operator: string;
  units: Unit[];
}

export function groupByOperator(units: Unit[]): OperatorGroup[] {
  const map = new Map<string, Unit[]>();
  for (const unit of units) map.set(unit.name, [...(map.get(unit.name) ?? []), unit]);
  return [...map.entries()].map(([operator, list]) => ({ operator, units: list }));
}

export type GroupState = 'none' | 'some' | 'all';

function probeableKeys(group: OperatorGroup): string[] {
  return group.units.filter((unit) => unit.probeable).map((unit) => unit.op_key);
}

/** Недоступные симки не считаются: группа «вся отмечена», когда отмечены все доступные. */
export function groupState(group: OperatorGroup, selected: string[]): GroupState {
  const keys = probeableKeys(group);
  const chosen = keys.filter((key) => selected.includes(key)).length;
  if (keys.length === 0 || chosen === 0) return 'none';
  return chosen === keys.length ? 'all' : 'some';
}

export function toggleGroup(selected: string[], group: OperatorGroup): string[] {
  const keys = probeableKeys(group);
  if (groupState(group, selected) === 'all') {
    return selected.filter((key) => !keys.includes(key));
  }
  return mergeKeys(selected, keys);
}

const STORAGE_PREFIX = 'cabinet_reachability_units_';

/** Память последнего запуска. Подставляется ТОЛЬКО по явной кнопке «как в прошлый раз». */
export function recallSelection(kind: JobKind): string[] {
  const parsed = safeLocal.getJson<unknown>(STORAGE_PREFIX + kind, []);
  return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === 'string') : [];
}

export function rememberSelection(kind: JobKind, keys: string[]): void {
  safeLocal.setJson(STORAGE_PREFIX + kind, keys);
}
