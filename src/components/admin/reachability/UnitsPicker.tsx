import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { JobKind, Unit } from '@/api/reachability';
import { CheckIcon, ChevronDownIcon } from '@/components/icons';
import { cn } from '@/lib/utils';
import { OperatorIcon } from './OperatorIcon';
import { SectionHeading } from './SectionHeading';
import {
  type QuickPick,
  activeQuickPick,
  mergeKeys,
  recallSelection,
  toggleKey,
  unitsByMode,
} from './unitSelection';

interface UnitsPickerProps {
  /** Для памяти «Как в прошлый раз»: у каждого вида проверки своя. */
  kind: JobKind;
  /** Каталог симок целиком; без связи не показываются. */
  units: readonly Unit[];
  selected: string[];
  onChange: (keys: string[]) => void;
}

const QUICK: readonly QuickPick[] = ['bs', 'regular', 'all'];
const QUICK_CHIP =
  'flex min-h-[40px] items-center gap-2 rounded-xl border px-3.5 text-sm font-medium transition-colors disabled:opacity-50';
const QUICK_ON = 'border-accent-500/60 bg-accent-500/10 text-dark-50';
const QUICK_OFF = 'border-dark-700/40 text-dark-200 hover:border-dark-600 hover:text-dark-50';
const LINK = 'text-xs font-medium text-accent-400 hover:underline';

/**
 * Симки всегда на виду: быстрый выбор «С Белым списком / Без / Все / Как в прошлый раз»,
 * под ним сетка отдельных симок двумя группами. Подсвечен тот быстрый выбор, что совпадает
 * с выбором целиком; свой набор раскрывает сетку сам. Ничего не отмечается без человека.
 */
export function UnitsPicker({ kind, units, selected, onChange }: UnitsPickerProps) {
  const { t } = useTranslation();
  const base = 'admin.reachability.units';
  const groups = useMemo(() => unitsByMode(units), [units]);
  const keysOf = useMemo<Record<QuickPick, string[]>>(() => {
    const bs = groups.bs.map((unit) => unit.op_key);
    const regular = groups.regular.map((unit) => unit.op_key);
    return { bs, regular, all: [...bs, ...regular] };
  }, [groups]);
  const active = activeQuickPick(units, selected);
  const chosen = selected.filter((key) => keysOf.all.includes(key)).length;
  const recalled = useMemo(
    () => recallSelection(kind).filter((key) => keysOf.all.includes(key)),
    [kind, keysOf],
  );
  // null — сетка открыта сама, когда набор свой; человек может свернуть или раскрыть явно.
  const [detailsOpen, setDetailsOpen] = useState<boolean | null>(null);
  const showDetails = detailsOpen ?? (active === null && chosen > 0);

  if (keysOf.all.length === 0) {
    return (
      <section className="space-y-3">
        <SectionHeading title={t(`${base}.title`)} />
        <p className="text-sm text-dark-400">{t(`${base}.empty`)}</p>
      </section>
    );
  }

  return (
    <section aria-labelledby="reachability-units" className="space-y-3">
      <SectionHeading
        id="reachability-units"
        title={t(`${base}.title`)}
        hint={t(`${base}.hint`)}
        aside={
          chosen === 0
            ? t(`${base}.none`)
            : t(`${base}.selectedOf`, { selected: chosen, total: keysOf.all.length })
        }
      />
      <div role="group" aria-label={t(`${base}.quick.label`)} className="flex flex-wrap gap-2">
        {QUICK.map((pick) => {
          const on = active === pick;
          return (
            <button
              key={pick}
              type="button"
              aria-pressed={on}
              disabled={keysOf[pick].length === 0}
              onClick={() => onChange([...keysOf[pick]])}
              className={cn(QUICK_CHIP, on ? QUICK_ON : QUICK_OFF)}
            >
              {t(`${base}.quick.${pick}`)}{' '}
              <span
                className={cn('text-xs tabular-nums', on ? 'text-accent-400' : 'text-dark-500')}
              >
                {keysOf[pick].length}
              </span>
            </button>
          );
        })}
        {recalled.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([...recalled])}
            className={cn(QUICK_CHIP, QUICK_OFF)}
          >
            {t(`${base}.quick.recall`)}
          </button>
        )}
      </div>

      <button
        type="button"
        aria-expanded={showDetails}
        onClick={() => setDetailsOpen(!showDetails)}
        className="flex min-h-[36px] items-center gap-1.5 text-[13px] text-dark-400 hover:text-dark-200"
      >
        {t(showDetails ? `${base}.detailsHide` : `${base}.detailsShow`)}
        <ChevronDownIcon
          aria-hidden="true"
          className={cn('h-4 w-4 transition-transform', showDetails && 'rotate-180')}
        />
      </button>

      {showDetails && (
        <div className="space-y-4">
          <UnitGroup
            label={t(`${base}.groupBs`)}
            units={groups.bs}
            selected={selected}
            onChange={onChange}
          />
          <UnitGroup
            label={t(`${base}.groupRegular`)}
            units={groups.regular}
            selected={selected}
            onChange={onChange}
          />
        </div>
      )}
    </section>
  );
}

interface UnitGroupProps {
  label: string;
  units: Unit[];
  selected: string[];
  onChange: (keys: string[]) => void;
}

/** Группа симок одного режима: заголовок с «Все / Снять» и сетка чипов «оператор · округ». */
function UnitGroup({ label, units, selected, onChange }: UnitGroupProps) {
  const { t } = useTranslation();
  const base = 'admin.reachability.units';
  if (units.length === 0) return null;
  const keys = units.map((unit) => unit.op_key);
  const chosen = keys.filter((key) => selected.includes(key)).length;
  return (
    <div role="group" aria-label={label} className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-semibold text-dark-300">
          {label}{' '}
          <span className="font-normal text-dark-500">
            {chosen > 0 ? `${chosen} / ${units.length}` : units.length}
          </span>
        </span>
        <span className="flex gap-3">
          {chosen < units.length && (
            <button
              type="button"
              className={LINK}
              onClick={() => onChange(mergeKeys(selected, keys))}
            >
              {t(`${base}.pickGroup`)}
            </button>
          )}
          {chosen > 0 && (
            <button
              type="button"
              className={LINK}
              onClick={() => onChange(selected.filter((key) => !keys.includes(key)))}
            >
              {t(`${base}.unpickGroup`)}
            </button>
          )}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {units.map((unit) => {
          const on = selected.includes(unit.op_key);
          return (
            <button
              key={unit.op_key}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(toggleKey(selected, unit.op_key))}
              className={cn(
                'flex min-h-[44px] items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-sm transition-colors',
                on
                  ? 'border-accent-500/50 bg-accent-500/10 text-dark-50'
                  : 'border-dark-700/40 text-dark-300 hover:border-dark-600 hover:text-dark-100',
              )}
            >
              <OperatorIcon operator={unit.operator} className="h-4 w-4 rounded" />
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate">{unit.name}</span>
                <span className={cn('block text-xs', on ? 'text-dark-300' : 'text-dark-500')}>
                  {unit.region}
                </span>
              </span>
              {on && (
                <CheckIcon aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-accent-400" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
