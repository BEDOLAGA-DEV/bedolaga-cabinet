import { type MouseEvent, memo, type PointerEvent, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { GeoMapTooltip, type TooltipLine } from './GeoMapTooltip';
import { type GeoMapData, MAP_ASPECT, type RussiaMap, useGeoMapData } from './geoMapData';
import {
  type CityMarker,
  type GeoMapRow,
  type RegionSummary,
  cityMarkers,
  regionSummaries,
} from './geoMapModel';

export type { GeoMapRow } from './geoMapModel';

export interface GeoMapProps {
  rows: readonly GeoMapRow[];
  /** Активный чип-фильтр: точки других вердиктов приглушены, регионы остаются как есть. */
  highlightVerdict?: string | null;
}

/**
 * Цвета — только через атрибуты и варианты Tailwind, чтобы карта жила в любой теме кабинета:
 * земля и границы серой шкалой темы, итоги — статусной палитрой. Точки рисуются штрихом
 * нулевой длины с `non-scaling-stroke`: размер в пикселях экрана не зависит от ширины карты.
 */
const MAP_STYLES = cn(
  'block h-auto w-full select-none',
  '[&_[data-region]]:fill-dark-700/70 [&_[data-region]]:stroke-dark-400/40 [&_[data-region]]:[stroke-width:0.8px] [&_[data-region]]:[vector-effect:non-scaling-stroke]',
  '[&_[data-region]]:transition-[filter] [&_[data-region]:hover]:[filter:brightness(1.25)]',
  '[&_[data-region][data-tone=ok]]:fill-success-500/50 [&_[data-region][data-tone=warn]]:fill-warning-500/50',
  '[&_[data-region][data-tone=orange]]:fill-orange-500/50 [&_[data-region][data-tone=down]]:fill-error-500/50',
  '[&_[data-region][data-tone=na]]:fill-dark-500/60 [&_[data-region][data-tone=violet]]:fill-violet-500/50',
  '[&_[data-region][data-tone=blue]]:fill-sky-500/50',
  '[&_[data-ring]]:stroke-dark-900/80 [&_[data-ring]]:[stroke-width:11px] [&_[data-ring]]:[stroke-linecap:round] [&_[data-ring]]:[vector-effect:non-scaling-stroke] [&_[data-ring]]:pointer-events-none',
  '[&_[data-city]]:[stroke-width:8px] [&_[data-city]]:[stroke-linecap:round] [&_[data-city]]:[vector-effect:non-scaling-stroke] [&_[data-city]]:cursor-pointer',
  '[&_[data-city]:hover]:[stroke-width:11px]',
  '[&_[data-city][data-tone=ok]]:stroke-success-400 [&_[data-city][data-tone=warn]]:stroke-warning-400',
  '[&_[data-city][data-tone=orange]]:stroke-orange-400 [&_[data-city][data-tone=down]]:stroke-error-400',
  '[&_[data-city][data-tone=na]]:stroke-dark-400 [&_[data-city][data-tone=violet]]:stroke-violet-400',
  '[&_[data-city][data-tone=blue]]:stroke-sky-400',
  '[&_[data-dim=true]]:opacity-25',
);

interface Focus {
  kind: 'city' | 'region';
  key: string;
}

interface MapSvgProps {
  map: RussiaMap;
  markers: CityMarker[];
  regions: Map<string, RegionSummary>;
  highlightVerdict: string | null;
}

/** Сам SVG без обработчиков — мемоизирован, чтобы движение курсора не перерисовывало тысячу точек. */
const MapSvg = memo(function MapSvg({ map, markers, regions, highlightVerdict }: MapSvgProps) {
  const dim = (marker: CityMarker) =>
    highlightVerdict !== null && !marker.rows.some((row) => row.verdict === highlightVerdict);
  return (
    <svg
      viewBox={`0 0 ${map.width} ${map.height}`}
      className={MAP_STYLES}
      role="img"
      aria-hidden="true"
    >
      <g>
        {map.regions.map((region) => (
          <path
            key={region.iso}
            d={region.d}
            data-region={region.iso}
            data-tone={regions.get(region.iso)?.tone ?? 'empty'}
          />
        ))}
      </g>
      <g>
        {markers.map((marker) => (
          <path
            key={marker.key}
            d={`M${marker.x} ${marker.y}h0.01`}
            data-ring=""
            data-dim={dim(marker)}
          />
        ))}
      </g>
      <g>
        {markers.map((marker) => (
          <path
            key={marker.key}
            d={`M${marker.x} ${marker.y}h0.01`}
            data-city={marker.key}
            data-tone={marker.tone}
            data-dim={dim(marker)}
          />
        ))}
      </g>
    </svg>
  );
});

function focusOf(target: EventTarget | null): Focus | null {
  const element = (target as Element | null)?.closest<SVGElement>('[data-city],[data-region]');
  if (!element) return null;
  const city = element.dataset.city;
  return city !== undefined
    ? { kind: 'city', key: city }
    : { kind: 'region', key: element.dataset.region ?? '' };
}

interface GeoMapBodyProps extends GeoMapProps {
  data: GeoMapData;
}

function GeoMapBody({ rows, highlightVerdict = null, data }: GeoMapBodyProps) {
  const { t } = useTranslation();
  const host = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<Focus | null>(null);
  const [pinned, setPinned] = useState<Focus | null>(null);
  const [point, setPoint] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 0, height: 0 });
  const markers = useMemo(() => cityMarkers(rows, data.map, data.coords), [rows, data]);
  const regions = useMemo(() => regionSummaries(rows), [rows]);
  const byKey = useMemo(() => new Map(markers.map((marker) => [marker.key, marker])), [markers]);
  const regionNames = useMemo(
    () => new Map(data.map.regions.map((region) => [region.iso, region.name])),
    [data],
  );

  const locate = (event: PointerEvent | MouseEvent) => {
    const rect = host.current?.getBoundingClientRect();
    if (!rect) return;
    setPoint({ x: event.clientX - rect.left, y: event.clientY - rect.top });
    setSize({ width: rect.width, height: rect.height });
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (pinned) return;
    const next = focusOf(event.target);
    if (next?.kind !== hover?.kind || next?.key !== hover?.key) setHover(next);
    if (next) locate(event);
  };
  const onClick = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as Element).closest('[role="tooltip"]')) return;
    const next = focusOf(event.target);
    if (!next || (pinned && pinned.kind === next.kind && pinned.key === next.key)) {
      setPinned(null);
      return;
    }
    locate(event);
    setPinned(next);
    setHover(null);
  };

  const focus = pinned ?? hover;
  const tooltip = focus ? describe(focus, byKey, regions, regionNames, t) : null;
  return (
    <div
      ref={host}
      className="relative overflow-hidden rounded-2xl border border-dark-700/60 bg-dark-900/40"
      onPointerMove={onPointerMove}
      onPointerLeave={() => setHover(null)}
      onClick={onClick}
    >
      <MapSvg
        map={data.map}
        markers={markers}
        regions={regions}
        highlightVerdict={highlightVerdict}
      />
      {tooltip && (
        <GeoMapTooltip
          {...tooltip}
          x={point.x}
          y={point.y}
          width={size.width}
          height={size.height}
          pinned={pinned !== null}
          onClose={() => setPinned(null)}
        />
      )}
    </div>
  );
}

type Translate = (key: string, options?: Record<string, unknown>) => string;

function describe(
  focus: Focus,
  markers: Map<string, CityMarker>,
  regions: Map<string, RegionSummary>,
  regionNames: Map<string, string>,
  t: Translate,
): { title: string; subtitle?: string; lines: TooltipLine[]; emptyText?: string } | null {
  if (focus.kind === 'city') {
    const marker = markers.get(focus.key);
    if (!marker) return null;
    return {
      title: marker.name,
      subtitle: marker.regionName,
      lines: marker.rows.map((row) => ({
        verdict: row.verdict,
        detail: [
          row.provider,
          row.latency_ms === null
            ? null
            : t('admin.reachability.geo.rows.latency', { value: row.latency_ms }),
        ]
          .filter(Boolean)
          .join(' · '),
      })),
    };
  }
  const summary = regions.get(focus.key);
  return {
    title: regionNames.get(focus.key) ?? focus.key,
    subtitle: summary
      ? t('admin.reachability.geo.result.cities', { count: summary.cities })
      : undefined,
    lines: summary
      ? Object.entries(summary.counts).map(([verdict, count]) => ({
          verdict,
          detail: String(count),
        }))
      : [],
    emptyText: t('admin.reachability.geo.map.noCities'),
  };
}

/**
 * Карта РФ как у оригинала bsbord.com: только страна с границами субъектов, регион красится по
 * худшему городу, город — точкой своего цвета. Наведение показывает подсказку словами, касание
 * закрепляет её (у телефона наведения нет). Зума нет — нарочно. Список городов карта не фильтрует.
 */
export function GeoMap(props: GeoMapProps) {
  const data = useGeoMapData();
  if (!data) {
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
  return <GeoMapBody {...props} data={data} />;
}
