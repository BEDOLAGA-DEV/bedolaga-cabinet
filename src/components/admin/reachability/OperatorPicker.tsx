import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { JobKind, Unit } from '@/api/reachability';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { OperatorIcon } from './OperatorIcon';
import { SectionHeading } from './SectionHeading';
import {
  type District,
  districtState,
  groupByDistrict,
  mergeKeys,
  pickUnits,
  recallSelection,
  toggleDistrict,
  toggleKey,
} from './unitSelection';
import { useUnits } from './useUnits';

interface OperatorPickerProps {
  kind: JobKind;
  selected: string[];
  onChange: (keys: string[]) => void;
}

const PRESET =
  'min-h-[40px] rounded-xl border px-3 text-sm font-medium transition-colors disabled:opacity-50';
const PRESET_OFF = 'border-dark-700/60 bg-dark-900/40 text-dark-200 hover:border-dark-600';
const PRESET_ON = 'border-accent-500/40 bg-accent-500/10 text-accent-400';

/**
 * Операторы по федеральным округам. Каждая симка списывается отдельно, поэтому ничего не
 * отмечается само: только именованные действия и тап по оператору.
 */
export function OperatorPicker({ kind, selected, onChange }: OperatorPickerProps) {
  const { t } = useTranslation();
  const { data: units = [], isLoading } = useUnits();

  const districts = useMemo(() => groupByDistrict(units), [units]);
  const bsKeys = useMemo(() => pickUnits(units, 'on'), [units]);
  const regularKeys = useMemo(() => pickUnits(units, 'off'), [units]);
  const recalled = useMemo(
    () => recallSelection(kind).filter((key) => units.some((unit) => unit.op_key === key)),
    [kind, units],
  );
  const alive = units.filter((unit) => unit.probeable);
  const chosen = alive.filter((unit) => selected.includes(unit.op_key));
  const allOf = (keys: string[]) => keys.length > 0 && keys.every((key) => selected.includes(key));
  const togglePreset = (keys: string[]) =>
    onChange(
      allOf(keys) ? selected.filter((key) => !keys.includes(key)) : mergeKeys(selected, keys),
    );

  if (isLoading) {
    return (
      <SkeletonGroup aria-label={t('admin.reachability.operators.title')}>
        <Skeleton className="h-7 w-40" />
        <Skeleton className="mt-3 h-10 w-full rounded-xl" />
        <Skeleton className="mt-2 h-24 w-full rounded-xl" />
      </SkeletonGroup>
    );
  }
  if (units.length === 0) {
    return <p className="text-sm text-dark-400">{t('admin.reachability.operators.empty')}</p>;
  }

  return (
    <section aria-labelledby="reachability-operators" className="space-y-3">
      <SectionHeading
        id="reachability-operators"
        title={t('admin.reachability.operators.title')}
        hint={t('admin.reachability.operators.hint')}
        aside={t('admin.reachability.operators.selected', {
          selected: chosen.length,
          total: alive.length,
        })}
      />

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
            className="btn-ghost min-h-[40px] px-3 text-sm"
            onClick={() => onChange([])}
          >
            {t('admin.reachability.operators.reset')}
          </button>
        )}
      </div>

      <ul className="space-y-2">
        {districts.map((district) => (
          <DistrictRow
            key={district.code}
            district={district}
            selected={selected}
            onToggleDistrict={() => onChange(toggleDistrict(selected, district))}
            onToggleUnit={(unit) => onChange(toggleKey(selected, unit.op_key))}
          />
        ))}
      </ul>
    </section>
  );
}

interface DistrictRowProps {
  district: District;
  selected: string[];
  onToggleDistrict: () => void;
  onToggleUnit: (unit: Unit) => void;
}

function DistrictRow({ district, selected, onToggleDistrict, onToggleUnit }: DistrictRowProps) {
  const { t } = useTranslation();
  const state = districtState(district, selected);
  const alive = district.units.filter((unit) => unit.probeable);
  const chosen = alive.filter((unit) => selected.includes(unit.op_key)).length;
  return (
    <li className="rounded-xl border border-dark-700/60 bg-dark-900/30 p-2 sm:flex sm:items-start sm:gap-3">
      <button
        type="button"
        aria-pressed={state === 'all'}
        aria-label={t(
          state === 'all'
            ? 'admin.reachability.operators.unpickDistrict'
            : 'admin.reachability.operators.pickDistrict',
          { code: district.label },
        )}
        disabled={alive.length === 0}
        onClick={onToggleDistrict}
        className="flex min-h-[40px] w-full items-center gap-2 rounded-lg px-1.5 text-left disabled:opacity-50 sm:w-28 sm:shrink-0"
      >
        <span
          aria-hidden="true"
          className={cn(
            'flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] font-bold',
            state === 'none'
              ? 'border-dark-600 text-transparent'
              : 'border-accent-500 bg-accent-500 text-on-accent',
          )}
        >
          {state === 'some' ? '–' : '✓'}
        </span>
        <span className="text-sm font-semibold text-dark-100">{district.label}</span>
        <span className="text-xs tabular-nums text-dark-400">
          {chosen}/{alive.length}
        </span>
      </button>
      <div className="mt-1 flex flex-wrap gap-1.5 sm:mt-0 sm:flex-1">
        {district.units.map((unit) => {
          const on = selected.includes(unit.op_key) && unit.probeable;
          return (
            <button
              key={unit.op_key}
              type="button"
              aria-pressed={on}
              disabled={!unit.probeable}
              onClick={() => onToggleUnit(unit)}
              className={cn(
                'flex min-h-[40px] items-center gap-1.5 rounded-xl border px-2.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                on
                  ? 'border-accent-500/40 bg-accent-500/10 text-dark-50'
                  : 'border-dark-700/60 bg-dark-900/40 text-dark-200 hover:border-dark-600',
              )}
            >
              <OperatorIcon operator={unit.operator} className="h-[18px] w-[18px] rounded" />
              <span>{unit.name}</span>
              {!unit.probeable ? (
                <span className="text-xs text-dark-400">
                  {t('admin.reachability.operators.offline')}
                </span>
              ) : unit.dpi === 'off' ? (
                <span className="text-xs text-dark-400">
                  {t('admin.reachability.operators.noBs')}
                </span>
              ) : (
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-success-500" />
              )}
            </button>
          );
        })}
      </div>
    </li>
  );
}
