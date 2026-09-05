import type { JobKind, Purpose, Unit } from '@/api/reachability';

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

/** Хосты под Белый список проверяются с БС; только обычные — без него; смесь — с БС. */
export function defaultDpiFor(purposes: Purpose[]): DpiFilter {
  const distinct = new Set(purposes.filter((purpose) => purpose !== 'unknown'));
  if (distinct.size === 1 && distinct.has('regular')) return 'off';
  return 'on';
}

const STORAGE_PREFIX = 'cabinet_reachability_units_';

export function loadSelection(kind: JobKind): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + kind);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === 'string') : [];
  } catch {
    return [];
  }
}

export function saveSelection(kind: JobKind, keys: string[]): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + kind, JSON.stringify(keys));
  } catch {
    // хранилище недоступно — выбор просто не запомнится
  }
}
