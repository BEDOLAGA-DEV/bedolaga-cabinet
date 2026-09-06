import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { JobKind, Unit } from '@/api/reachability';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { OperatorIcon } from './OperatorIcon';
import {
  type OperatorGroup,
  groupByOperator,
  groupState,
  mergeKeys,
  pickUnits,
  recallSelection,
  toggleGroup,
  toggleKey,
} from './unitSelection';
import { useUnits } from './useUnits';

interface OperatorPickerProps {
  kind: JobKind;
  selected: string[];
  onChange: (keys: string[]) => void;
}

const PRESET = 'min-h-[36px] rounded-lg px-3 text-sm font-medium transition-colors';
const PRESET_OFF = 'bg-dark-800/50 text-dark-200 hover:bg-dark-700/50';
const PRESET_ON = 'bg-accent-500/15 text-accent-400 ring-1 ring-accent-500/30';

/**
 * Ручной выбор симок: плоский список без рамок — пресеты словами, операторы группами,
 * округа чипами, «без» рядом с округом без Белого списка. Ничего не отмечается само.
 */
export function OperatorPicker({ kind, selected, onChange }: OperatorPickerProps) {
  const { t } = useTranslation();
  const { data: catalog = [], isLoading } = useUnits();
  // Симки без связи не показываем: отмечать их нельзя, а место на экране они едят.
  const units = useMemo(() => catalog.filter((unit) => unit.probeable), [catalog]);
  const groups = useMemo(() => groupByOperator(units), [units]);
  const bsKeys = useMemo(() => pickUnits(units, 'on'), [units]);
  const regularKeys = useMemo(() => pickUnits(units, 'off'), [units]);
  const recalled = useMemo(
    () => recallSelection(kind).filter((key) => units.some((unit) => unit.op_key === key)),
    [kind, units],
  );
  const allOf = (keys: string[]) => keys.length > 0 && keys.every((key) => selected.includes(key));
  const togglePreset = (keys: string[]) =>
    onChange(
      allOf(keys) ? selected.filter((key) => !keys.includes(key)) : mergeKeys(selected, keys),
    );

  if (isLoading) {
    return (
      <SkeletonGroup aria-label={t('admin.reachability.operators.title')}>
        <Skeleton className="h-9 w-full rounded-lg" />
        <Skeleton className="mt-3 h-24 w-full rounded-lg" />
      </SkeletonGroup>
    );
  }
  if (units.length === 0) {
    return <p className="text-sm text-dark-400">{t('admin.reachability.operators.empty')}</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={cn(PRESET, allOf(bsKeys) ? PRESET_ON : PRESET_OFF)}
          disabled={bsKeys.length === 0}
          onClick={() => togglePreset(bsKeys)}
        >
          {t(
            allOf(bsKeys)
              ? 'admin.reachability.operators.unpickBs'
              : 'admin.reachability.operators.pickBs',
          )}
        </button>
        <button
          type="button"
          className={cn(PRESET, allOf(regularKeys) ? PRESET_ON : PRESET_OFF)}
          disabled={regularKeys.length === 0}
          onClick={() => togglePreset(regularKeys)}
        >
          {t(
            allOf(regularKeys)
              ? 'admin.reachability.operators.unpickRegular'
              : 'admin.reachability.operators.pickRegular',
          )}
        </button>
        {recalled.length > 0 && (
          <button
            type="button"
            className={cn(PRESET, PRESET_OFF)}
            onClick={() => onChange(mergeKeys(selected, recalled))}
          >
            {t('admin.reachability.operators.recall')}
          </button>
        )}
        {selected.length > 0 && (
          <button
            type="button"
            className={cn(PRESET, 'text-dark-400 hover:text-dark-200')}
            onClick={() => onChange([])}
          >
            {t('admin.reachability.operators.reset')}
          </button>
        )}
      </div>

      <ul className="divide-y divide-dark-700/60">
        {groups.map((group) => (
          <OperatorRow
            key={group.operator}
            group={group}
            selected={selected}
            onToggleGroup={() => onChange(toggleGroup(selected, group))}
            onToggleUnit={(unit) => onChange(toggleKey(selected, unit.op_key))}
          />
        ))}
      </ul>
    </div>
  );
}

interface OperatorRowProps {
  group: OperatorGroup;
  selected: string[];
  onToggleGroup: () => void;
  onToggleUnit: (unit: Unit) => void;
}

function OperatorRow({ group, selected, onToggleGroup, onToggleUnit }: OperatorRowProps) {
  const { t } = useTranslation();
  const state = groupState(group, selected);
  const first = group.units[0];
  return (
    <li
      role="group"
      aria-label={group.operator}
      className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2 sm:flex-nowrap"
    >
      <button
        type="button"
        aria-pressed={state === 'all'}
        aria-label={t(
          state === 'all'
            ? 'admin.reachability.operators.unpickOperator'
            : 'admin.reachability.operators.pickOperator',
          { name: group.operator },
        )}
        onClick={onToggleGroup}
        className="flex min-h-[40px] w-full items-center gap-2 text-left sm:w-40 sm:shrink-0"
      >
        <span
          aria-hidden="true"
          className={cn(
            'flex h-4 w-4 shrink-0 items-center justify-center rounded border text-xs font-bold',
            state === 'none'
              ? 'border-dark-600 text-transparent'
              : 'border-accent-500 bg-accent-500 text-on-accent',
          )}
        >
          {state === 'some' ? '–' : '✓'}
        </span>
        <OperatorIcon operator={first?.operator} className="h-5 w-5 rounded" />
        <span className="text-sm font-medium text-dark-100">{group.operator}</span>
      </button>
      <div className="flex flex-wrap gap-1.5">
        {group.units.map((unit) => {
          const on = selected.includes(unit.op_key);
          return (
            <button
              key={unit.op_key}
              type="button"
              aria-pressed={on}
              title={
                unit.dpi === 'off'
                  ? `${unit.region} · ${t('admin.reachability.units.dpiOff')}`
                  : `${unit.region} · ${t('admin.reachability.units.dpiOn')}`
              }
              onClick={() => onToggleUnit(unit)}
              className={cn(
                'min-h-[36px] rounded-lg px-2.5 text-sm transition-colors',
                on
                  ? 'bg-accent-500/15 text-accent-400 ring-1 ring-accent-500/30'
                  : 'bg-dark-800/50 text-dark-200 hover:bg-dark-700/50',
              )}
            >
              {unit.region}
              {unit.dpi === 'off' && (
                <span className="ms-1 text-xs text-dark-400">
                  {t('admin.reachability.operators.noBsShort')}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </li>
  );
}
