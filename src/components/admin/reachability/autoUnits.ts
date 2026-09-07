import type { Purpose, Unit } from '@/api/reachability';
import { pickUnits } from './unitSelection';

/**
 * Симки выбираются сами по назначению целей: есть хост «под Белый список» (или назначение
 * неизвестно) — все симки с ним; только обычные хосты — симки без него; целей нет — ничего.
 */
export function autoUnitsFor(purposes: readonly Purpose[], catalog: readonly Unit[]): string[] {
  if (purposes.length === 0) return [];
  const alive = catalog.filter((unit) => unit.probeable);
  const onlyRegular = purposes.every((purpose) => purpose === 'regular');
  return pickUnits(alive, onlyRegular ? 'off' : 'on');
}

export interface UnitsDescription {
  total: number;
  bs: number;
  regular: number;
}

/** Сколько выбранных симок с Белым списком и без — для строки «N симок с Белым списком». */
export function describeUnits(
  selected: readonly string[],
  catalog: readonly Unit[],
): UnitsDescription {
  const known = catalog.filter((unit) => selected.includes(unit.op_key));
  const bs = known.filter((unit) => unit.dpi === 'on').length;
  return { total: known.length, bs, regular: known.length - bs };
}
