import type { JobKind, Unit } from '@/api/reachability';
import { safeLocal } from '@/utils/safeStorage';

export type DpiFilter = 'on' | 'off' | 'any';

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

/** Все ли ключи из набора выбраны; пустой набор — нет. */
export function allOf(keys: readonly string[], selected: readonly string[]): boolean {
  return keys.length > 0 && keys.every((key) => selected.includes(key));
}

export interface District {
  code: string;
  label: string;
  units: Unit[];
}

export type GroupState = 'none' | 'some' | 'all';

/** Округа с запада на восток; чего нет в списке — после, по алфавиту. */
const DISTRICT_ORDER = ['ЦФО', 'СЗФО', 'ЮФО', 'ПФО', 'УФО', 'СФО', 'ДФО', 'КРЫМ', 'КГД'];
/** Коды округов, которые сервис отдаёт латиницей. */
const REGION_ALIASES: Record<string, string> = { KGD: 'КГД', CRIMEA: 'КРЫМ' };

/** Подпись округа кириллицей и заглавными: KGD → КГД. */
export function regionLabel(region: string): string {
  const upper = region.trim().toUpperCase();
  return REGION_ALIASES[upper] ?? upper;
}

function districtRank(label: string): number {
  const index = DISTRICT_ORDER.indexOf(label);
  return index === -1 ? DISTRICT_ORDER.length : index;
}

/** Операторы по федеральным округам: порядок с запада на восток, подписи кириллицей. */
export function groupByDistrict(units: readonly Unit[]): District[] {
  const map = new Map<string, District>();
  for (const unit of units) {
    const current = map.get(unit.region_code);
    const label = regionLabel(unit.region);
    if (current) map.set(unit.region_code, { ...current, units: [...current.units, unit] });
    else map.set(unit.region_code, { code: unit.region_code, label, units: [unit] });
  }
  return [...map.values()].sort(
    (a, b) => districtRank(a.label) - districtRank(b.label) || a.label.localeCompare(b.label, 'ru'),
  );
}

function probeableKeys(district: District): string[] {
  return district.units.filter((unit) => unit.probeable).map((unit) => unit.op_key);
}

/** Недоступные симки не считаются: округ «весь отмечен», когда отмечены все доступные. */
export function districtState(district: District, selected: readonly string[]): GroupState {
  const keys = probeableKeys(district);
  const chosen = keys.filter((key) => selected.includes(key)).length;
  if (keys.length === 0 || chosen === 0) return 'none';
  return chosen === keys.length ? 'all' : 'some';
}

export function toggleDistrict(selected: string[], district: District): string[] {
  const keys = probeableKeys(district);
  if (districtState(district, selected) === 'all') {
    return selected.filter((key) => !keys.includes(key));
  }
  return mergeKeys(selected, keys);
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
