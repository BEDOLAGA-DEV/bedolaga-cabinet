import type { Job } from '@/api/reachability';
import type { CityMarker, GeoMapRow, RegionSummary } from './geoMapModel';
import { type RecheckState, recheckButtons, recheckState } from './geoRecheck';
import type { GeoRow } from './geoRowsView';
import type { GeoRecheck } from './useGeoRecheck';

/** Подпроверка цели в подсказке: имя (host:port или «Google»), ответила ли, за сколько. */
export interface TooltipCheck {
  name: string;
  ok: boolean;
  ms: number | null;
}

export interface TooltipAction {
  label: string;
  title: string;
  onPress: () => void;
}

/** Повтор для строки подсказки: состояние как у оригинала и кнопки, если они положены. */
export interface TooltipRecheck {
  state: RecheckState;
  actions: TooltipAction[];
}

export interface RecheckContext {
  job: Job;
  recheck: GeoRecheck;
}

/** Строка подсказки — одно наблюдение: город × провайдер × выход. */
export interface TooltipRow {
  key: string;
  verdict: string;
  /** Имя города — в подсказке региона; в подсказке города строки без имени. */
  name?: string;
  provider: string | null;
  latencyMs: number | null;
  exitIp: string | null;
  exitChanged: boolean;
  newExit: boolean;
  checks: TooltipCheck[];
  recheck: TooltipRecheck | null;
}

export interface TooltipModel {
  title: string;
  subtitle?: string;
  rows: TooltipRow[];
  /** Сколько городов региона не поместилось в подсказку. */
  moreCount: number;
  emptyText?: string;
}

/** Больше строк в подсказке региона не влезает даже на десктопе; остальное — «ещё N». */
export const MAX_TOOLTIP_ROWS = 8;

export type Translate = (key: string, options?: Record<string, unknown>) => string;

function checksOf(row: GeoMapRow): TooltipCheck[] {
  if (row.tunnel) {
    return row.tunnel.checks.map((check) => ({ name: check.name, ok: check.ok, ms: check.ms }));
  }
  return (row.targets ?? []).map((target) => ({ name: target.key, ok: target.ok, ms: target.ms }));
}

function recheckOf(
  row: GeoMapRow,
  context: RecheckContext | null,
  t: Translate,
): TooltipRecheck | null {
  if (!context) return null;
  const state = recheckState(context.job, row, context.recheck.busy);
  if (state === 'none') return null;
  const actions =
    state === 'buttons'
      ? recheckButtons(context.job, row, t).map((button) => ({
          label: button.label,
          title: button.title,
          onPress: () => context.recheck.start(row as GeoRow, button.sameExit),
        }))
      : [];
  return { state, actions };
}

export function tooltipRow(
  row: GeoMapRow,
  context: RecheckContext | null,
  t: Translate,
  name?: string,
): TooltipRow {
  return {
    key: `${row.region}|${row.city}|${row.provider ?? ''}|${row.exit_ip ?? ''}`,
    verdict: row.verdict,
    ...(name !== undefined ? { name } : {}),
    provider: row.provider ?? null,
    latencyMs: row.latency_ms ?? null,
    exitIp: row.exit_ip ?? null,
    exitChanged: Boolean(row.exit_changed),
    newExit: Boolean(row.new_exit),
    checks: checksOf(row),
    recheck: recheckOf(row, context, t),
  };
}

/** Подсказка города: регион подписью, по строке на провайдера с выходом и подпроверками. */
export function cityTooltip(
  marker: CityMarker,
  context: RecheckContext | null,
  t: Translate,
): TooltipModel {
  return {
    title: marker.name,
    subtitle: marker.regionName,
    rows: marker.rows.map((row) => tooltipRow(row, context, t)),
    moreCount: 0,
  };
}

/** «3 города · 2 работает · 1 блокируется» — как в оригинале, вердикты словами по убыванию. */
export function regionSubtitle(summary: RegionSummary, t: Translate): string {
  const words = Object.entries(summary.counts)
    .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))
    .map(
      ([verdict, count]) =>
        `${count} ${t(`admin.reachability.geo.verdicts.${verdict}`, { defaultValue: verdict })}`,
    );
  return [t('admin.reachability.geo.result.cities', { count: summary.cities }), ...words].join(
    ' · ',
  );
}

/** Подсказка региона: города списком с их наблюдениями; сверх MAX_TOOLTIP_ROWS — «ещё N». */
export function regionTooltip(
  code: string,
  name: string,
  summary: RegionSummary | undefined,
  markers: readonly CityMarker[],
  context: RecheckContext | null,
  t: Translate,
): TooltipModel {
  const inRegion = markers.filter((marker) => marker.regionCode === code);
  const rows = inRegion.flatMap((marker) =>
    marker.rows.map((row) => tooltipRow(row, context, t, marker.name)),
  );
  const shown = rows.slice(0, MAX_TOOLTIP_ROWS);
  const hiddenCities = new Set(rows.slice(MAX_TOOLTIP_ROWS).map((row) => row.name)).size;
  return {
    title: name,
    subtitle: summary ? regionSubtitle(summary, t) : undefined,
    rows: shown,
    moreCount: hiddenCities,
    emptyText: t('admin.reachability.geo.map.noCities'),
  };
}

/** Высота подсказки для размещения у края: заголовок, строки, выход, подпроверки, кнопки. */
export function tooltipHeight(
  model: Pick<TooltipModel, 'rows' | 'moreCount'>,
  pinned: boolean,
): number {
  const rows = model.rows.reduce(
    (sum, row) =>
      sum + 24 + (row.exitIp ? 18 : 0) + row.checks.length * 18 + (pinned && row.recheck ? 30 : 0),
    0,
  );
  return 48 + Math.max(24, rows) + (model.moreCount ? 18 : 0);
}
