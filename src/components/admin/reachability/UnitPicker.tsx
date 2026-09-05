import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type JobKind, type Unit, reachabilityApi } from '@/api/reachability';
import { DropdownSelect } from '@/components/admin/bulkActions/DropdownSelect';
import { Card } from '@/components/data-display';
import { ChevronDownIcon } from '@/components/icons';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ChoiceChips } from './ChoiceChips';
import { OperatorIcon } from './OperatorIcon';
import {
  type DpiFilter,
  type GroupState,
  type OperatorGroup,
  filterUnits,
  groupByOperator,
  groupState,
  mergeKeys,
  pickUnits,
  recallSelection,
  regionsOf,
  toggleGroup,
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

const DPI_VALUES: DpiFilter[] = ['on', 'off', 'any'];
const DPI_LABEL_KEY: Record<DpiFilter, string> = { on: 'dpiOn', off: 'dpiOff', any: 'dpiAny' };

/**
 * Выбор симок. Каждая симка — отдельное списание, поэтому ничего не отмечается само:
 * ни память прошлого запуска, ни «все». Есть только именованные быстрые выборы.
 */
export function UnitPicker({ kind, dpi, onDpiChange, selected, onChange }: UnitPickerProps) {
  const { t } = useTranslation();
  const [region, setRegion] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const { data: units = [], isLoading } = useQuery({
    queryKey: REACHABILITY_UNITS_KEY,
    queryFn: () => reachabilityApi.getUnits({ dpi: 'any' }),
    staleTime: 60_000,
  });

  const visible = useMemo(() => filterUnits(units, { dpi, region }), [units, dpi, region]);
  const groups = useMemo(() => groupByOperator(visible), [visible]);
  const regions = useMemo(() => regionsOf(units), [units]);
  const bsPick = useMemo(() => pickUnits(visible, 'on'), [visible]);
  const regularPick = useMemo(() => pickUnits(visible, 'off'), [visible]);
  const recalled = useMemo(
    () => recallSelection(kind).filter((key) => units.some((unit) => unit.op_key === key)),
    [kind, units],
  );

  const toggleExpanded = (operator: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(operator)) next.delete(operator);
      else next.add(operator);
      return next;
    });

  if (isLoading) {
    return (
      <SkeletonGroup aria-label={t('admin.reachability.units.title')}>
        <Skeleton variant="card" className="h-40 w-full rounded-2xl" />
      </SkeletonGroup>
    );
  }
  if (units.length === 0) {
    return <p className="text-sm text-dark-400">{t('admin.reachability.units.empty')}</p>;
  }

  return (
    <Card size="md" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-dark-100">
          {t('admin.reachability.units.title')}
        </h2>
        <span className="text-xs text-dark-400">
          {t('admin.reachability.units.selected', { count: selected.length })}
        </span>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <ChoiceChips
          value={dpi}
          onChange={onDpiChange}
          label={t('admin.reachability.units.mode')}
          showLabel
          options={DPI_VALUES.map((value) => ({
            value,
            label: t(`admin.reachability.units.${DPI_LABEL_KEY[value]}`),
          }))}
        />
        <DropdownSelect
          value={region ?? ''}
          onChange={(value) => setRegion(value || null)}
          className="sm:ml-auto sm:w-48"
          options={[
            { value: '', label: t('admin.reachability.units.allRegions') },
            ...regions.map((item) => ({ value: item.code, label: item.label })),
          ]}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-secondary px-3 py-1.5 text-xs"
          disabled={bsPick.length === 0}
          onClick={() => onChange(mergeKeys(selected, bsPick))}
        >
          {t('admin.reachability.units.pickBs', { count: bsPick.length })}
        </button>
        <button
          type="button"
          className="btn-secondary px-3 py-1.5 text-xs"
          disabled={regularPick.length === 0}
          onClick={() => onChange(mergeKeys(selected, regularPick))}
        >
          {t('admin.reachability.units.pickRegular', { count: regularPick.length })}
        </button>
        {recalled.length > 0 && (
          <button
            type="button"
            className="btn-secondary px-3 py-1.5 text-xs"
            onClick={() => onChange(mergeKeys(selected, recalled))}
          >
            {t('admin.reachability.units.recall', { count: recalled.length })}
          </button>
        )}
        {selected.length > 0 && (
          <button
            type="button"
            className="btn-ghost px-3 py-1.5 text-xs"
            onClick={() => onChange([])}
          >
            {t('admin.reachability.units.clearAll')}
          </button>
        )}
      </div>

      {selected.length === 0 && (
        <p className="text-xs text-dark-400">{t('admin.reachability.units.noneSelected')}</p>
      )}

      <ul className="divide-y divide-dark-700/60 rounded-xl border border-dark-700/60">
        {groups.map((group) => (
          <OperatorRow
            key={group.operator}
            group={group}
            state={groupState(group, selected)}
            expanded={expanded.has(group.operator)}
            selected={selected}
            onToggleGroup={() => onChange(toggleGroup(selected, group))}
            onToggleExpanded={() => toggleExpanded(group.operator)}
            onToggleUnit={(unit) => onChange(toggleKey(selected, unit.op_key))}
          />
        ))}
      </ul>
    </Card>
  );
}

interface OperatorRowProps {
  group: OperatorGroup;
  state: GroupState;
  expanded: boolean;
  selected: string[];
  onToggleGroup: () => void;
  onToggleExpanded: () => void;
  onToggleUnit: (unit: Unit) => void;
}

function OperatorRow({
  group,
  state,
  expanded,
  selected,
  onToggleGroup,
  onToggleExpanded,
  onToggleUnit,
}: OperatorRowProps) {
  const { t } = useTranslation();
  const checkbox = useRef<HTMLInputElement>(null);
  const probeable = group.units.filter((unit) => unit.probeable);
  const chosen = probeable.filter((unit) => selected.includes(unit.op_key)).length;

  useEffect(() => {
    if (checkbox.current) checkbox.current.indeterminate = state === 'some';
  }, [state]);

  return (
    <li>
      <div className="flex items-center gap-3 px-3 py-2">
        <input
          ref={checkbox}
          type="checkbox"
          className="h-4 w-4 shrink-0 rounded border-dark-600 accent-accent-500"
          aria-label={t('admin.reachability.units.pickGroup', { operator: group.operator })}
          checked={state === 'all'}
          disabled={probeable.length === 0}
          onChange={onToggleGroup}
        />
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={t('admin.reachability.units.showGroup', { operator: group.operator })}
          onClick={onToggleExpanded}
          className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2 text-left"
        >
          <OperatorIcon operator={group.units[0]?.operator} />
          <span className="truncate text-sm font-medium text-dark-100">{group.operator}</span>
          <span className="text-xs text-dark-400">
            {t('admin.reachability.units.groupCount', {
              selected: chosen,
              total: probeable.length,
            })}
          </span>
          <ChevronDownIcon
            className={cn('ml-auto h-4 w-4 shrink-0 text-dark-400', expanded && 'rotate-180')}
          />
        </button>
      </div>
      {expanded && (
        <ul className="space-y-1 px-3 pb-3 pl-10">
          {group.units.map((unit) => (
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
                  onChange={() => onToggleUnit(unit)}
                />
                <span className="font-mono text-xs">{unit.region}</span>
                {unit.dpi === 'on' ? (
                  <span className="rounded-md bg-accent-500/15 px-1.5 py-0.5 text-[10px] font-medium text-accent-400">
                    {t('admin.reachability.units.bsShort')}
                  </span>
                ) : (
                  <span className="text-xs text-dark-400">—</span>
                )}
                {!unit.probeable && (
                  <span className="text-xs text-warning-400">
                    {t('admin.reachability.units.notProbeable')}
                  </span>
                )}
              </label>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
