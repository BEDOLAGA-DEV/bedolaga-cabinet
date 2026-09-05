import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type JobKind, type Unit, reachabilityApi } from '@/api/reachability';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  type DpiFilter,
  filterUnits,
  loadSelection,
  regionsOf,
  saveSelection,
  toggleKey,
} from './unitSelection';

export const REACHABILITY_UNITS_KEY = ['admin-reachability-units'] as const;

interface UnitPickerProps {
  kind: JobKind;
  dpi: DpiFilter;
  onDpiChange: (dpi: DpiFilter) => void;
  selected: string[];
  onChange: (keys: string[]) => void;
}

const DPI_OPTIONS: Array<{ value: DpiFilter; key: string }> = [
  { value: 'on', key: 'dpiOn' },
  { value: 'off', key: 'dpiOff' },
  { value: 'any', key: 'dpiAny' },
];

function groupByOperator(units: Unit[]): Array<[string, Unit[]]> {
  const map = new Map<string, Unit[]>();
  for (const unit of units) map.set(unit.name, [...(map.get(unit.name) ?? []), unit]);
  return [...map.entries()];
}

export function UnitPicker({ kind, dpi, onDpiChange, selected, onChange }: UnitPickerProps) {
  const { t } = useTranslation();
  const [region, setRegion] = useState<string | null>(null);
  const hydrated = useRef(false);
  const { data: units = [], isLoading } = useQuery({
    queryKey: REACHABILITY_UNITS_KEY,
    queryFn: () => reachabilityApi.getUnits({ dpi: 'any' }),
    staleTime: 60_000,
  });

  // Один раз после загрузки каталога: подставить прошлый выбор, если сейчас ничего не выбрано.
  useEffect(() => {
    if (hydrated.current || units.length === 0) return;
    hydrated.current = true;
    if (selected.length > 0) return;
    const stored = loadSelection(kind).filter((key) => units.some((u) => u.op_key === key));
    if (stored.length) onChange(stored);
  }, [units, kind, selected.length, onChange]);

  const visible = useMemo(() => filterUnits(units, { dpi, region }), [units, dpi, region]);
  const grouped = useMemo(() => groupByOperator(visible), [visible]);
  const regions = useMemo(() => regionsOf(units), [units]);

  const update = (keys: string[]) => {
    onChange(keys);
    saveSelection(kind, keys);
  };
  const selectVisible = () =>
    update([...new Set([...selected, ...visible.filter((u) => u.probeable).map((u) => u.op_key)])]);
  const clearVisible = () => update(selected.filter((k) => !visible.some((u) => u.op_key === k)));

  if (isLoading) {
    return (
      <SkeletonGroup aria-label={t('admin.reachability.units.title')}>
        <Skeleton className="h-8 w-64 rounded-xl" />
        <Skeleton className="mt-3 h-32 w-full rounded-2xl" />
      </SkeletonGroup>
    );
  }
  if (units.length === 0) {
    return <p className="text-sm text-dark-400">{t('admin.reachability.units.empty')}</p>;
  }

  return (
    <section className="rounded-2xl border border-dark-700/60 bg-dark-800/60 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-lg font-semibold text-dark-100">
          {t('admin.reachability.units.title')}
        </h2>
        {DPI_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={dpi === option.value}
            onClick={() => onDpiChange(option.value)}
            className={cn(
              'rounded-xl px-3 py-1.5 text-xs font-medium transition-colors',
              dpi === option.value
                ? 'bg-accent-500 text-on-accent'
                : 'bg-dark-700 text-dark-300 hover:text-dark-100',
            )}
          >
            {t(`admin.reachability.units.${option.key}`)}
          </button>
        ))}
        <select
          value={region ?? ''}
          onChange={(event) => setRegion(event.target.value || null)}
          aria-label={t('admin.reachability.units.allRegions')}
          className="rounded-xl border border-dark-700 bg-dark-900 px-3 py-1.5 text-xs text-dark-100"
        >
          <option value="">{t('admin.reachability.units.allRegions')}</option>
          {regions.map((item) => (
            <option key={item.code} value={item.code}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-dark-400">
        <span>{t('admin.reachability.units.selected', { count: selected.length })}</span>
        <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={selectVisible}>
          {t('admin.reachability.units.selectAll')}
        </button>
        <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={clearVisible}>
          {t('admin.reachability.units.selectNone')}
        </button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {grouped.map(([operator, list]) => (
          <div key={operator} className="rounded-xl border border-dark-700/60 p-3">
            <p className="text-sm font-medium text-dark-100">{operator}</p>
            <ul className="mt-2 space-y-1">
              {list.map((unit) => (
                <li key={unit.op_key}>
                  <label
                    className={cn(
                      'flex items-center gap-2 text-sm',
                      unit.probeable ? 'text-dark-200' : 'text-dark-400',
                    )}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-dark-600 accent-accent-500"
                      checked={selected.includes(unit.op_key)}
                      disabled={!unit.probeable}
                      onChange={() => update(toggleKey(selected, unit.op_key))}
                    />
                    <span className="font-mono text-xs">{unit.region}</span>
                    <span className="text-xs text-dark-400">
                      {unit.dpi === 'on' ? t('admin.reachability.units.bsShort') : '—'}
                    </span>
                    {!unit.probeable && (
                      <span className="text-xs text-warning-400">
                        {t('admin.reachability.units.notProbeable')}
                      </span>
                    )}
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
