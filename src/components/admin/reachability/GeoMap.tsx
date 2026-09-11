import { type MouseEvent, memo, type PointerEvent, useMemo, useRef, useState } from 'react';
import { MinusIcon, PlusIcon, ResetIcon } from '@/components/icons';
import { useTranslation } from 'react-i18next';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import {
  type MapView,
  ZOOM_STEP,
  fullView,
  panView,
  viewBoxOf,
  zoomOf,
  zoomView,
} from './geoMapView';
import { cn } from '@/lib/utils';
import type { Job } from '@/api/reachability';
import { GeoMapTooltip } from './GeoMapTooltip';
import {
  type RecheckContext,
  cityTooltip,
  regionTooltip,
  tooltipHeight,
} from './geoMapTooltipModel';
import type { GeoRecheck } from './useGeoRecheck';
import { useNarrowScreen } from './useNarrowScreen';
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
  /** Задача отчёта и перепроверка — для кнопок «тот же IP» / «сменить IP» в закреплённой подсказке. */
  job?: Job | null;
  recheck?: GeoRecheck | null;
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
  '[&_[data-outline]]:fill-none [&_[data-outline]]:stroke-accent-400 [&_[data-outline]]:[stroke-width:2px] [&_[data-outline]]:[vector-effect:non-scaling-stroke] [&_[data-outline]]:pointer-events-none',
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
  viewBox: string;
  /** Регион под курсором или закреплённый — обводится поверх соседей. */
  outline: string | null;
}

/** Сам SVG без обработчиков — мемоизирован, чтобы движение курсора не перерисовывало тысячу точек. */
const MapSvg = memo(function MapSvg({
  map,
  markers,
  regions,
  highlightVerdict,
  viewBox,
  outline,
}: MapSvgProps) {
  const dim = (marker: CityMarker) =>
    highlightVerdict !== null && !marker.rows.some((row) => row.verdict === highlightVerdict);
  const outlined = outline ? map.regions.find((region) => region.iso === outline) : undefined;
  return (
    <svg
      viewBox={viewBox}
      className={MAP_STYLES}
      style={{ aspectRatio: `${map.width} / ${map.height}` }}
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
      {outlined && <path d={outlined.d} data-outline="" />}
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

interface Gesture {
  kind: 'drag' | 'pinch';
  startView: MapView;
  /** Стартовые точки пальцев в px контейнера (одна у перетаскивания, две у щипка). */
  start: Array<{ x: number; y: number }>;
  moved: boolean;
}

const TAP_MS = 300;
const TAP_PX = 30;
const MOVE_PX = 4;

const insideTooltip = (target: EventTarget | null): boolean =>
  Boolean((target as Element | null)?.closest?.('[role="tooltip"]'));

function GeoMapBody({
  rows,
  highlightVerdict = null,
  job = null,
  recheck = null,
  data,
}: GeoMapBodyProps) {
  const { t } = useTranslation();
  // На телефоне подсказка не влезает в карту 330 px шириной — она становится панелью под картой.
  const narrow = useNarrowScreen();
  const context: RecheckContext | null = job && recheck ? { job, recheck } : null;
  const host = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<Focus | null>(null);
  const [pinned, setPinned] = useState<Focus | null>(null);
  const [point, setPoint] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [view, setView] = useState<MapView>(() => fullView(data.map.width, data.map.height));
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<Gesture | null>(null);
  const lastTap = useRef<{ at: number; x: number; y: number } | null>(null);
  const skipClick = useRef(false);
  const { width: W, height: H } = data.map;
  const zoomed = zoomOf(view, W) > 1.001;

  const local = (event: { clientX: number; clientY: number }) => {
    const rect = host.current?.getBoundingClientRect();
    return rect
      ? {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          width: rect.width || W,
          height: rect.height || H,
        }
      : { x: 0, y: 0, width: W, height: H };
  };
  const changeView = (next: MapView) => {
    setView(next);
    setPinned(null);
    setHover(null);
  };
  const zoomAt = (factor: number, x: number, y: number, width: number, height: number) =>
    changeView(zoomView(view, W, H, factor, x / width, y / height));
  const zoomCenter = (factor: number) => changeView(zoomView(view, W, H, factor));

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (insideTooltip(event.target)) return;
    if (event.pointerType === 'mouse' && !zoomed) return;
    const p = local(event);
    pointers.current.set(event.pointerId ?? 0, { x: p.x, y: p.y });
    const points = [...pointers.current.values()];
    if (points.length === 2) {
      gesture.current = { kind: 'pinch', startView: view, start: points, moved: true };
    } else if (points.length === 1 && zoomed) {
      gesture.current = { kind: 'drag', startView: view, start: points, moved: false };
    }
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId ?? 0);
    } catch {
      // jsdom и старые WebKit без захвата указателя — жест всё равно работает внутри карты
    }
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (insideTooltip(event.target)) return;
    pointers.current.delete(event.pointerId ?? 0);
    const active = gesture.current;
    if (active?.moved) skipClick.current = true;
    if (pointers.current.size === 0) gesture.current = null;
    if (event.pointerType === 'touch' && !active?.moved) {
      // Двойное касание — приближение в точке (у телефона нет колеса и наведения).
      const p = local(event);
      const previous = lastTap.current;
      lastTap.current = { at: Date.now(), x: p.x, y: p.y };
      if (
        previous &&
        Date.now() - previous.at < TAP_MS &&
        Math.hypot(p.x - previous.x, p.y - previous.y) < TAP_PX
      ) {
        lastTap.current = null;
        skipClick.current = true;
        zoomAt(ZOOM_STEP, p.x, p.y, p.width, p.height);
      }
    }
  };
  const onGestureMove = (event: PointerEvent<HTMLDivElement>): boolean => {
    const active = gesture.current;
    if (!active || !pointers.current.has(event.pointerId ?? 0)) return false;
    const p = local(event);
    pointers.current.set(event.pointerId ?? 0, { x: p.x, y: p.y });
    const points = [...pointers.current.values()];
    const unit = active.startView.w / p.width;
    if (active.kind === 'pinch' && points.length >= 2) {
      const [a0, b0] = active.start;
      const [a, b] = points;
      const d0 = Math.hypot(b0.x - a0.x, b0.y - a0.y) || 1;
      const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const mid0 = { x: (a0.x + b0.x) / 2, y: (a0.y + b0.y) / 2 };
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const scaled = zoomView(active.startView, W, H, d / d0, mid0.x / p.width, mid0.y / p.height);
      const unitNow = scaled.w / p.width;
      changeView(panView(scaled, (mid.x - mid0.x) * unitNow, (mid.y - mid0.y) * unitNow, W, H));
      return true;
    }
    if (active.kind === 'drag') {
      const [s0] = active.start;
      const dx = p.x - s0.x;
      const dy = p.y - s0.y;
      if (!active.moved && Math.hypot(dx, dy) < MOVE_PX) return true;
      active.moved = true;
      changeView(panView(active.startView, dx * unit, dy * unit, W, H));
      return true;
    }
    return false;
  };
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
    if (onGestureMove(event)) return;
    if (pinned || narrow || event.pointerType !== 'mouse') return;
    const next = focusOf(event.target);
    if (next?.kind !== hover?.kind || next?.key !== hover?.key) setHover(next);
    if (next) locate(event);
  };
  const onClick = (event: MouseEvent<HTMLDivElement>) => {
    if (skipClick.current) {
      skipClick.current = false;
      return;
    }
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
  const tooltip = focus
    ? focus.kind === 'city'
      ? byKey.has(focus.key)
        ? cityTooltip(byKey.get(focus.key) as CityMarker, context, t)
        : null
      : regionTooltip(
          focus.key,
          regionNames.get(focus.key) ?? focus.key,
          regions.get(focus.key),
          markers,
          context,
          t,
        )
    : null;
  const tooltipProps = tooltip
    ? {
        ...tooltip,
        x: point.x,
        y: point.y,
        width: size.width,
        height: size.height,
        estimatedHeight: tooltipHeight(tooltip, pinned !== null),
        pinned: pinned !== null,
        onClose: () => setPinned(null),
      }
    : null;
  const zoomButton = (
    label: string,
    onPress: () => void,
    Icon: typeof PlusIcon,
    disabled = false,
  ) => (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onPress();
      }}
      className="flex h-10 w-10 items-center justify-center rounded-lg border border-dark-700/60 bg-dark-900/80 text-dark-100 backdrop-blur disabled:opacity-40"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
  return (
    <>
      <div
        ref={host}
        data-zoom={zoomOf(view, W).toFixed(2)}
        className="relative overflow-hidden rounded-2xl border border-dark-700/60 bg-dark-900/40"
        // Приближено — карта ловит палец сама (сдвиг, щипок); иначе страница листается как обычно.
        style={{ touchAction: zoomed ? 'none' : 'pan-y' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => setHover(null)}
        onClick={onClick}
      >
        <MapSvg
          map={data.map}
          markers={markers}
          regions={regions}
          highlightVerdict={highlightVerdict}
          viewBox={viewBoxOf(view)}
          outline={focus?.kind === 'region' ? focus.key : null}
        />
        {/* Зум только на телефоне: на широком экране карта и так вся перед глазами, владелец зум не хочет. */}
        <div className="absolute right-2 top-2 flex flex-col gap-1 md:hidden">
          {zoomButton(
            t('admin.reachability.geo.map.zoomIn'),
            () => zoomCenter(ZOOM_STEP),
            PlusIcon,
            zoomOf(view, W) >= 5.99,
          )}
          {zoomButton(
            t('admin.reachability.geo.map.zoomOut'),
            () => zoomCenter(1 / ZOOM_STEP),
            MinusIcon,
            !zoomed,
          )}
          {zoomed &&
            zoomButton(
              t('admin.reachability.geo.map.reset'),
              () => changeView(fullView(W, H)),
              ResetIcon,
            )}
        </div>
        {tooltipProps && !narrow && <GeoMapTooltip {...tooltipProps} />}
      </div>
      {tooltipProps && narrow && pinned && <GeoMapTooltip {...tooltipProps} panel />}
    </>
  );
}

/**
 * Карта РФ как у оригинала bsbord.com: только страна с границами субъектов, регион красится по
 * худшему городу, город — точкой своего цвета. Наведение показывает подсказку словами, касание
 * закрепляет её (у телефона наведения нет). На широком экране зума нет — нарочно; на телефоне карта
 * мелкая, поэтому там кнопки «+/−», щипок, двойное касание и перетаскивание одним пальцем, когда
 * карта приближена. Список городов карта не фильтрует.
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
