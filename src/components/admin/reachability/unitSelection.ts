import type { JobKind, Unit } from '@/api/reachability';
import { safeLocal } from '@/utils/safeStorage';

export type DpiFilter = 'on' | 'off' | 'any';

/** Быстрый выбор симок: все с Белым списком, все без него, все вместе. */
export type QuickPick = 'bs' | 'regular' | 'all';

/** Всегда новый массив: выбор хранится в состоянии React. */
export function toggleKey(selected: string[], key: string): string[] {
  return selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key];
}

/** Объединение без дублей, порядок — сначала уже выбранные. */
export function mergeKeys(selected: string[], keys: string[]): string[] {
  return [...new Set([...selected, ...keys])];
}

/** Быстрый выбор: все доступные симки одного режима. Каждая трата — явное действие админа. */
export function pickUnits(units: readonly Unit[], dpi: 'on' | 'off'): string[] {
  return units.filter((unit) => unit.probeable && unit.dpi === dpi).map((unit) => unit.op_key);
}

export interface UnitsByMode {
  bs: Unit[];
  regular: Unit[];
}

function byOperatorAndRegion(a: Unit, b: Unit): number {
  return a.name.localeCompare(b.name, 'ru') || a.region.localeCompare(b.region, 'ru');
}

/** Сетка симок: две группы по Белому списку, внутри по оператору и округу; без связи не показываем. */
export function unitsByMode(units: readonly Unit[]): UnitsByMode {
  const alive = units.filter((unit) => unit.probeable);
  return {
    bs: alive.filter((unit) => unit.dpi === 'on').sort(byOperatorAndRegion),
    regular: alive.filter((unit) => unit.dpi !== 'on').sort(byOperatorAndRegion),
  };
}

function sameKeys(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((key) => b.includes(key));
}

/** Какой быстрый выбор совпадает с выбором целиком; свой набор или пусто — null. */
export function activeQuickPick(
  units: readonly Unit[],
  selected: readonly string[],
): QuickPick | null {
  if (selected.length === 0) return null;
  const bs = pickUnits(units, 'on');
  const regular = pickUnits(units, 'off');
  if (sameKeys(bs, selected)) return 'bs';
  if (sameKeys(regular, selected)) return 'regular';
  if (sameKeys([...bs, ...regular], selected)) return 'all';
  return null;
}

/** Режим Белого списка следует за выбранными симками: только с БС → on, только без → off, иначе any. */
export function dpiForSelection(units: readonly Unit[], selected: readonly string[]): DpiFilter {
  const chosen = units.filter((unit) => selected.includes(unit.op_key));
  if (chosen.length === 0) return 'any';
  if (chosen.every((unit) => unit.dpi === 'on')) return 'on';
  if (chosen.every((unit) => unit.dpi === 'off')) return 'off';
  return 'any';
}

const STORAGE_PREFIX = 'cabinet_reachability_units_';

/** Память последнего запуска. Подставляется ТОЛЬКО по явной кнопке «Как в прошлый раз». */
export function recallSelection(kind: JobKind): string[] {
  const parsed = safeLocal.getJson<unknown>(STORAGE_PREFIX + kind, []);
  return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === 'string') : [];
}

export function rememberSelection(kind: JobKind, keys: string[]): void {
  safeLocal.setJson(STORAGE_PREFIX + kind, keys);
}
