import { type MouseEvent, memo, type PointerEvent, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { tooltipPlacement } from '../reachability/GeoMapTooltip';
import { MAP_ASPECT, type RussiaMap, useRussiaMap } from '../reachability/geoMapData';
import type { RegionPop, RegionState, RegionStatus } from './regionMap';

/** Цвета только классами темы — карта живёт и на светлой, и на тёмной, и на своих темах кабинета. */
const MAP_STYLES = cn(
  'block h-auto w-full select-none',
  '[&_[data-region]]:fill-dark-700/70 [&_[data-region]]:stroke-dark-400/40 [&_[data-region]]:[stroke-width:0.8px] [&_[data-region]]:[vector-effect:non-scaling-stroke]',
  '[&_[data-region]]:cursor-pointer [&_[data-region]]:transition-[filter] [&_[data-region]:hover]:[filter:brightness(1.3)]',
  '[&_[data-status=green]]:fill-success-500/60 [&_[data-status=yellow]]:fill-warning-500/60',
  '[&_[data-status=red]]:fill-error-500/60 [&_[data-status=gray]]:fill-dark-500/70',
  '[&_[data-outline]]:fill-none [&_[data-outline]]:stroke-accent-400 [&_[data-outline]]:[stroke-width:2px] [&_[data-outline]]:[vector-effect:non-scaling-stroke] [&_[data-outline]]:pointer-events-none',
);

/**
 * Образцы для легенды и подсказки — та же заливка, что у регионов. Текстовые *-400 в светлой теме
 * затемняются до *-700, а заливка карты — нет: точки легенды с ними расходились с картой.
 */
const SWATCH: Record<RegionStatus | 'none', string> = {
  green: 'bg-success-500/60',
  yellow: 'bg-warning-500/60',
  red: 'bg-error-500/60',
  gray: 'bg-dark-500/70',
  none: 'bg-dark-700/70',
};
const TONE: Record<RegionStatus, string> = {
  green: 'text-success-400',
  yellow: 'text-warning-400',
  red: 'text-error-400',
  gray: 'text-dark-400',
};
const LEGEND = ['green', 'yellow', 'red', 'none'] as const;
/** Строка подсказки ~22 px, шапка ~44 px — для прижима к краю карты. */
const tipHeight = (rows: number) => 48 + rows * 22;

function popTone(pop: RegionPop): RegionStatus {
  if (pop.ok + pop.bad === 0) return 'gray';
  if (pop.bad === 0) return 'green';
  return pop.ok === 0 ? 'red' : 'yellow';
}

const MapSvg = memo(function MapSvg({
  map,
  states,
  outline,
}: {
  map: RussiaMap;
  states: ReadonlyMap<string, RegionState>;
  outline: string | null;
}) {
  const outlined = outline ? map.regions.find((region) => region.iso === outline) : undefined;
  return (
    <svg
      viewBox={`0 0 ${map.width} ${map.height}`}
      className={MAP_STYLES}
      style={{ aspectRatio: `${map.width} / ${map.height}` }}
      role="img"
      aria-hidden="true"
    >
      {map.regions.map((region) => (
        <path
          key={region.iso}
          d={region.d}
          data-region={region.iso}
          data-status={states.get(region.iso)?.status ?? 'none'}
        />
      ))}
      {outlined && <path d={outlined.d} data-outline="" />}
    </svg>
  );
});

function Tooltip({
  name,
  state,
  left,
  top,
  maxWidth,
}: {
  name: string;
  state: RegionState | undefined;
  left: number;
  top: number;
  maxWidth: number;
}) {
  const { t } = useTranslation();
  const status = state?.status ?? 'gray';
  const pops = state?.pops ?? [];
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-10 min-w-[180px] rounded-xl border border-dark-700/60 bg-dark-900/95 px-3 py-2.5 text-sm shadow-linear backdrop-blur"
      style={{ left, top, maxWidth }}
    >
      <p className="font-semibold text-dark-50">{name}</p>
      <p className={cn('mt-0.5 flex items-center gap-2', TONE[status])}>
        <span
          className={cn(
            'inline-block h-2.5 w-2.5 shrink-0 rounded-sm',
            SWATCH[state ? status : 'none'],
          )}
        />
        <span>{t(`admin.dpichecker.map.status.${state ? status : 'none'}`)}</span>
      </p>
      {pops.length > 0 && (
        <ul className="mt-1.5 space-y-1">
          {pops.map((pop) => (
            <li key={pop.label ?? ''} className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-dark-300">
                {pop.label ?? t('admin.dpichecker.map.any')}
              </span>
              {pop.ok + pop.bad === 0 ? (
                <span className="whitespace-nowrap text-dark-400">
                  {t('admin.dpichecker.map.proxyDead')}
                </span>
              ) : (
                <span className="whitespace-nowrap tabular-nums">
                  <span className={TONE[popTone(pop)]}>
                    {t('admin.dpichecker.map.okOf', { ok: pop.ok, total: pop.ok + pop.bad })}
                  </span>
                  {pop.dead > 0 && (
                    <span className="text-dark-400">
                      {' '}
                      {t('admin.dpichecker.map.deadExtra', { count: pop.dead })}
                    </span>
                  )}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MapBody({ map, states }: { map: RussiaMap; states: ReadonlyMap<string, RegionState> }) {
  const { t } = useTranslation();
  const host = useRef<HTMLDivElement>(null);
  const touching = useRef(false);
  const [focus, setFocus] = useState<string | null>(null);
  const [point, setPoint] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const names = useMemo(
    () => new Map(map.regions.map((region) => [region.iso, region.name])),
    [map],
  );

  const regionOf = (target: EventTarget | null) =>
    (target as Element | null)?.closest<SVGElement>('[data-region]')?.dataset.region ?? null;
  const locate = (event: { clientX: number; clientY: number }) => {
    const rect = host.current?.getBoundingClientRect();
    if (!rect) return;
    setPoint({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
    });
  };
  // Наведение — только настоящая мышь: касание перед кликом шлёт синтетическое движение, и
  // подсказка открывалась бы и тут же закрывалась кликом (так же устроено на dpichecker.st).
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse') return;
    const next = regionOf(event.target);
    if (next !== focus) setFocus(next);
    if (next) locate(event);
  };
  const onClick = (event: MouseEvent<HTMLDivElement>) => {
    const next = regionOf(event.target);
    if (!next || (next === focus && touching.current)) {
      setFocus(null);
      return;
    }
    setFocus(next);
    locate(event);
  };

  const state = focus ? states.get(focus) : undefined;
  const placement = tooltipPlacement(point, tipHeight(state?.pops.length ?? 0));
  return (
    <div className="space-y-2">
      <div
        ref={host}
        className="relative overflow-hidden rounded-2xl border border-dark-700/60 bg-dark-900/40 p-2"
        onPointerDown={(event) => {
          touching.current = event.pointerType !== 'mouse';
        }}
        onPointerMove={onPointerMove}
        onPointerLeave={(event) => {
          if (event.pointerType === 'mouse') setFocus(null);
        }}
        onClick={onClick}
      >
        <MapSvg map={map} states={states} outline={focus} />
        {focus && (
          <Tooltip
            name={state?.name ?? names.get(focus) ?? focus}
            state={state}
            left={placement.left}
            top={placement.top}
            maxWidth={placement.maxWidth}
          />
        )}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-dark-400">
        {LEGEND.map((status) => (
          <li key={status} className="flex items-center gap-1.5">
            <span
              data-legend={status}
              className={cn(
                'inline-block h-2.5 w-2.5 rounded-sm ring-1 ring-dark-400/40',
                SWATCH[status],
              )}
            />
            {t(`admin.dpichecker.map.status.${status}`)}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Карта России в результате проверки — как на dpichecker.st: регион цветом итога своих точек,
 * наведение мышью — подсказка с операторами «ок из скольких», касание закрепляет её, повторное —
 * убирает. Контуры — общие с GEO-картой BSCHEKER, грузятся отдельно и один раз.
 */
export function DpiRegionMap({ states }: { states: ReadonlyMap<string, RegionState> }) {
  const map = useRussiaMap();
  if (!map) {
    return (
      <SkeletonGroup>
        <Skeleton
          variant="card"
          className="w-full rounded-2xl"
          style={{ aspectRatio: MAP_ASPECT }}
        />
      </SkeletonGroup>
    );
  }
  return <MapBody map={map} states={states} />;
}
