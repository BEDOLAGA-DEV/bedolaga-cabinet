import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { JobKind, Unit } from '@/api/reachability';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { OperatorIcon } from './OperatorIcon';
import { SectionHeading } from './SectionHeading';
import { CheckGlyph } from './SelectableRow';
import {
  type District,
  allOf,
  districtState,
  groupByDistrict,
  mergeKeys,
  pickUnits,
  recallSelection,
  toggleDistrict,
  toggleKey,
} from './unitSelection';

interface OperatorPickerProps {
  /** Для памяти «Как в прошлый раз»: у каждого вида проверки своя. */
  kind: JobKind;
  /** Каталог симок целиком; без связи показываются выключенными. */
  units: readonly Unit[];
  selected: string[];
  onChange: (keys: string[]) => void;
  loading?: boolean;
}

const TOGGLE =
  'flex min-h-[36px] items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors disabled:opacity-50';
const TOGGLE_ON = 'border-accent-500/50 bg-accent-500/10 text-dark-50';
const TOGGLE_OFF = 'border-dark-700/50 bg-dark-900/30 text-dark-200 hover:border-dark-600';
const CHIP =
  'flex min-h-[36px] items-center gap-1.5 rounded-lg border px-2.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40';
const CHIP_ON = 'border-accent-500 bg-accent-500/15 text-dark-50 ring-1 ring-accent-500/60';
const CHIP_OFF = 'border-dark-700/50 bg-dark-900/30 text-dark-200 hover:border-dark-500';

/** Точка режима: зелёная — симка с Белым списком, янтарная — без него. Одна и та же в чипах и в легенде. */
function ModeDot({ dpi }: { dpi: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'h-2 w-2 shrink-0 rounded-full',
        dpi === 'off' ? 'bg-warning-400' : 'bg-success-500',
      )}
    />
  );
}

/**
 * Операторы как в оригинале bsbord.com: один ряд «● БС · 16 / ● без БС · 18» (точки — легенда),
 * в его конце «выбрано 18 / 34 · Сбросить»; округа строками с чекбоксом и счётом, внутри чипы
 * операторов с точкой режима и заметной обводкой у выбранных. Каждая симка списывается
 * отдельно — ничего не отмечается само. Место под «Сбросить» держится всегда, чтобы округа
 * не прыгали, когда выбор появляется или исчезает.
 */
export function OperatorPicker({ kind, units, selected, onChange, loading }: OperatorPickerProps) {
  const { t } = useTranslation();
  const base = 'admin.reachability.operators';
  const districts = useMemo(() => groupByDistrict(units), [units]);
  const alive = useMemo(() => units.filter((unit) => unit.probeable), [units]);
  const bsKeys = useMemo(() => pickUnits(units, 'on'), [units]);
  const regularKeys = useMemo(() => pickUnits(units, 'off'), [units]);
  const recalled = useMemo(
    () => recallSelection(kind).filter((key) => alive.some((unit) => unit.op_key === key)),
    [kind, alive],
  );
  const chosen = alive.filter((unit) => selected.includes(unit.op_key));
  const toggleAll = (keys: string[]) =>
    onChange(
      allOf(keys, selected)
        ? selected.filter((key) => !keys.includes(key))
        : mergeKeys(selected, keys),
    );

  if (loading) {
    return (
      <SkeletonGroup aria-label={t(`${base}.title`)}>
        <Skeleton className="h-7 w-40" />
        <Skeleton className="mt-3 h-9 w-full rounded-lg" />
        <Skeleton className="mt-2 h-24 w-full rounded-xl" />
      </SkeletonGroup>
    );
  }
  if (alive.length === 0) {
    return (
      <section className="space-y-3">
        <SectionHeading title={t(`${base}.title`)} />
        <p className="text-sm text-dark-400">{t(`${base}.empty`)}</p>
      </section>
    );
  }

  return (
    <section aria-labelledby="reachability-operators" className="space-y-3">
      <SectionHeading
        id="reachability-operators"
        title={t(`${base}.title`)}
        hint={t(`${base}.hint`)}
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-pressed={allOf(bsKeys, selected)}
          disabled={bsKeys.length === 0}
          onClick={() => toggleAll(bsKeys)}
          className={cn(TOGGLE, allOf(bsKeys, selected) ? TOGGLE_ON : TOGGLE_OFF)}
        >
          <ModeDot dpi="on" />
          {t(`${base}.bs`)}{' '}
          <span className="text-xs tabular-nums text-dark-400">{bsKeys.length}</span>
        </button>
        <button
          type="button"
          aria-pressed={allOf(regularKeys, selected)}
          disabled={regularKeys.length === 0}
          onClick={() => toggleAll(regularKeys)}
          className={cn(TOGGLE, allOf(regularKeys, selected) ? TOGGLE_ON : TOGGLE_OFF)}
        >
          <ModeDot dpi="off" />
          {t(`${base}.regular`)}{' '}
          <span className="text-xs tabular-nums text-dark-400">{regularKeys.length}</span>
        </button>
        {recalled.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([...recalled])}
            className={cn(TOGGLE, TOGGLE_OFF)}
          >
            {t(`${base}.recall`)}
          </button>
        )}
        <span className="ms-auto flex items-center gap-3 text-xs text-dark-400">
          <span className="tabular-nums">
            {t(`${base}.selected`, { selected: chosen.length, total: alive.length })}
          </span>
          <button
            type="button"
            onClick={() => onChange([])}
            disabled={chosen.length === 0}
            aria-hidden={chosen.length === 0}
            tabIndex={chosen.length === 0 ? -1 : undefined}
            className={cn(
              'min-h-[36px] text-sm text-dark-400 hover:text-dark-200',
              chosen.length === 0 && 'invisible',
            )}
          >
            {t(`${base}.reset`)}
          </button>
        </span>
      </div>

      <ul className="space-y-1.5">
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
  const base = 'admin.reachability.operators';
  const state = districtState(district, selected);
  const alive = district.units.filter((unit) => unit.probeable);
  const chosen = alive.filter((unit) => selected.includes(unit.op_key)).length;
  return (
    <li className="rounded-xl border border-dark-700/40 bg-dark-900/30 p-1.5 sm:flex sm:items-start sm:gap-2">
      <button
        type="button"
        aria-pressed={state === 'all'}
        aria-label={t(state === 'all' ? `${base}.unpickDistrict` : `${base}.pickDistrict`, {
          code: district.label,
        })}
        disabled={alive.length === 0}
        onClick={onToggleDistrict}
        className="flex min-h-[36px] w-full items-center gap-2 rounded-lg px-1.5 text-left disabled:opacity-50 sm:w-28 sm:shrink-0"
      >
        <CheckGlyph on={state === 'all'} mixed={state === 'some'} />
        <span className="text-sm font-semibold text-dark-100">{district.label}</span>
        <span className="text-xs tabular-nums text-dark-500">
          {chosen}/{alive.length}
        </span>
      </button>
      <div className="mt-1 flex flex-wrap gap-1.5 sm:mt-0 sm:flex-1">
        {district.units.map((unit) => {
          const on = unit.probeable && selected.includes(unit.op_key);
          return (
            <button
              key={unit.op_key}
              type="button"
              aria-pressed={on}
              disabled={!unit.probeable}
              title={unit.probeable ? undefined : t(`${base}.offline`)}
              aria-label={`${unit.name} ${t(unit.dpi === 'off' ? `${base}.noBs` : `${base}.bs`)}`}
              onClick={() => onToggleUnit(unit)}
              className={cn(CHIP, on ? CHIP_ON : CHIP_OFF)}
            >
              <OperatorIcon operator={unit.operator} className="h-[18px] w-[18px] rounded" />
              <span>{unit.name}</span>
              <ModeDot dpi={unit.dpi} />
            </button>
          );
        })}
      </div>
    </li>
  );
}
