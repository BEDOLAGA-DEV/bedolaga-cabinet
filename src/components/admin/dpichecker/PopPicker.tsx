import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { dpicheckerApi, LOCATIONS, type Location, type Pop } from '@/api/dpichecker';
import { DropdownSelect } from '@/components/admin/bulkActions/DropdownSelect';
import { CheckIcon } from '@/components/icons';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useNotify } from '@/platform/hooks/useNotify';
import {
  byRegion,
  type GroupState,
  groupState,
  pickAll,
  pickOptimal,
  pickRandom,
  toggle,
  toggleGroup,
} from './popSelection';

type Preset = 'optimal' | 'all' | 'random';

interface PopPickerProps {
  location: Location;
  onLocation: (location: Location) => void;
  selected: Set<number>;
  onSelected: (selected: Set<number>) => void;
  /** Точки загружены — форме нужны сами точки, чтобы отбрасывать нерабочие. */
  onPops?: (pops: Pop[]) => void;
}

const CHIP_BASE =
  'inline-flex min-h-[32px] items-center gap-1 rounded-lg border px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50';

function chipClass(state: GroupState | 'on' | 'off' | 'dead'): string {
  if (state === 'all' || state === 'on') {
    return cn(CHIP_BASE, 'border-accent-500/50 bg-accent-500/15 text-accent-300');
  }
  if (state === 'part') return cn(CHIP_BASE, 'border-accent-500/30 bg-accent-500/5 text-dark-100');
  if (state === 'dead')
    return cn(CHIP_BASE, 'cursor-not-allowed border-dark-700 text-dark-600 line-through');
  return cn(CHIP_BASE, 'border-dark-700 text-dark-300 hover:border-dark-500 hover:text-dark-100');
}

/**
 * «Откуда проверяем» — как на dpichecker.st: страна, пресеты, для России — округа и «Республики»,
 * поиск по региону или оператору, точки по регионам (клик по региону — весь регион).
 */
export function PopPicker({ location, onLocation, selected, onSelected, onPops }: PopPickerProps) {
  const { t } = useTranslation();
  const notify = useNotify();
  const [query, setQuery] = useState('');
  const [preset, setPreset] = useState<Preset | null>(null);

  const popsQuery = useQuery({
    queryKey: ['dpichecker', 'pops', location],
    queryFn: () => dpicheckerApi.getPops(location),
    staleTime: 60_000,
  });
  useEffect(() => {
    if (popsQuery.data) onPops?.(popsQuery.data.pops);
  }, [popsQuery.data, onPops]);
  // «Оптимальный выбор» считается у сервиса — берём заранее, чтобы клик был мгновенным (как на сайте).
  const optimalQuery = useQuery({
    queryKey: ['dpichecker', 'optimal', location],
    queryFn: () => dpicheckerApi.getOptimal(location),
    staleTime: 60_000,
    enabled: popsQuery.isSuccess,
  });
  const pops = popsQuery.data?.pops ?? [];
  const groups = popsQuery.data?.groups;
  const regions = useMemo(() => byRegion(pops, query), [pops, query]);

  const choose = (next: Set<number>, mode: Preset | null = null) => {
    setPreset(mode);
    onSelected(next);
  };
  const applyPreset = async (mode: Preset) => {
    if (mode === 'all') return choose(pickAll(pops), 'all');
    if (mode === 'random') return choose(pickRandom(pops), 'random');
    const ids = optimalQuery.data ?? (await optimalQuery.refetch()).data;
    if (!ids) {
      notify.error(t('admin.dpichecker.pops.optimalFailed'));
      return;
    }
    choose(pickOptimal(ids, pops), 'optimal');
  };
  const onGroup = (ids: number[]) => {
    if (groupState(ids, pickAll(pops), pops) === 'none') {
      notify.warning(t('admin.dpichecker.pops.groupEmpty'));
      return;
    }
    choose(toggleGroup(ids, selected, pops));
  };

  const presets: Preset[] = ['optimal', 'all', 'random'];
  const locationOptions = LOCATIONS.map((value) => ({
    value,
    label: t(`admin.dpichecker.locations.${value}`),
  }));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <DropdownSelect
          value={location}
          options={locationOptions}
          onChange={(value) => {
            setPreset(null);
            onSelected(new Set());
            onLocation(value as Location);
          }}
          className="w-44"
        />
        {presets.map((mode) => (
          <button
            key={mode}
            type="button"
            className="btn-secondary min-h-[36px] gap-1 px-3 text-sm"
            aria-pressed={preset === mode}
            disabled={!popsQuery.isSuccess}
            onClick={() => void applyPreset(mode)}
          >
            {preset === mode && <CheckIcon className="h-4 w-4" />}
            {t(`admin.dpichecker.pops.${mode}`)}
          </button>
        ))}
        <button
          type="button"
          className="btn-ghost min-h-[36px] px-3 text-sm"
          disabled={selected.size === 0}
          onClick={() => choose(new Set())}
        >
          {t('admin.dpichecker.pops.clear')}
        </button>
      </div>

      {groups && groups.districts.length > 0 && (
        <div
          role="group"
          aria-label={t('admin.dpichecker.pops.districts')}
          className="flex flex-wrap gap-1.5"
        >
          {groups.districts.map((district) => (
            <button
              key={district.code}
              type="button"
              className={chipClass(groupState(district.pop_ids, selected, pops))}
              aria-pressed={groupState(district.pop_ids, selected, pops) === 'all'}
              onClick={() => onGroup(district.pop_ids)}
            >
              {district.name}
            </button>
          ))}
          <button
            type="button"
            className={chipClass(groupState(groups.republics, selected, pops))}
            aria-pressed={groupState(groups.republics, selected, pops) === 'all'}
            onClick={() => onGroup(groups.republics)}
          >
            {t('admin.dpichecker.pops.republics')}
          </button>
        </div>
      )}

      <input
        type="search"
        className="input w-full"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t('admin.dpichecker.pops.search')}
        aria-label={t('admin.dpichecker.pops.search')}
      />

      {popsQuery.isLoading && (
        <SkeletonGroup className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </SkeletonGroup>
      )}
      {popsQuery.isError && (
        <p className="text-sm text-error-400">{t('admin.dpichecker.pops.loadFailed')}</p>
      )}
      {popsQuery.isSuccess && regions.length === 0 && (
        <p className="text-sm text-dark-400">{t('admin.dpichecker.pops.nothingFound')}</p>
      )}
      <div className="max-h-[420px] space-y-2 overflow-y-auto pe-1">
        {regions.map((group) => {
          const ids = group.pops.map((pop) => pop.id);
          const state = groupState(ids, selected, pops);
          const chosen = ids.filter((id) => selected.has(id)).length;
          return (
            <div key={group.region} className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                className={cn(
                  'min-h-[32px] rounded-lg px-2 text-start text-sm font-medium',
                  state === 'all' ? 'text-accent-300' : 'text-dark-100 hover:text-accent-300',
                  group.alive === 0 && 'cursor-not-allowed text-dark-500',
                )}
                disabled={group.alive === 0}
                title={t('admin.dpichecker.pops.wholeRegion')}
                onClick={() => choose(toggleGroup(ids, selected, pops))}
              >
                {group.region}{' '}
                <span className="text-xs tabular-nums text-dark-400">
                  {chosen}/{group.alive}
                </span>
              </button>
              {group.pops.map((pop) => {
                const on = selected.has(pop.id);
                return (
                  <button
                    key={pop.id}
                    type="button"
                    className={chipClass(!pop.is_healthy ? 'dead' : on ? 'on' : 'off')}
                    disabled={!pop.is_healthy}
                    aria-pressed={on}
                    title={pop.is_healthy ? undefined : t('admin.dpichecker.pops.dead')}
                    onClick={() => choose(toggle(selected, pop.id, pops))}
                  >
                    {pop.operator ?? t('admin.dpichecker.pops.anyOperator')}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
