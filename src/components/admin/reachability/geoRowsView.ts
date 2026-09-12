import type { Job } from '@/api/reachability';
import { regionCodeFor } from './geoRegions';
import { GEO_VERDICTS, isGeoVerdict } from './geoVerdicts';

/** Строка города из `Job.result.rows` (форма бота, часть 1). */
export interface GeoTargetCell {
  key: string;
  ok: boolean;
  ms: number | null;
  kind: string | null;
  err: string | null;
}

export interface GeoRow {
  region: string;
  region_ru: string;
  district: string;
  city: string;
  city_ru: string;
  req_isp?: string | null;
  provider: string | null;
  exit_ip?: string | null;
  verdict: string;
  is_result: boolean;
  latency_ms: number | null;
  targets: GeoTargetCell[];
  tunnel: {
    used_core: string | null;
    checks: Array<{ name: string; ok: boolean; ms: number | null }>;
  } | null;
  heavy: { kbps: number | null; froze: boolean; hv_measured: boolean; hv_small: boolean } | null;
  mb_bill: number | null;
  err: string | null;
  flaky: boolean;
  retries: number | null;
  /** Повтор через тот же выход: sid строки и остаток удержания; «выход сменился» — пометка повтора. */
  sid?: string | null;
  sid_hold_s?: number | null;
  exit_changed?: boolean;
  /** Строка пришла повтором с другого выхода; прежние строки города помечены `rechecked`. */
  new_exit?: boolean;
  rechecked?: boolean;
  /** Номер прогона сервиса, которым строка получена при повторе. */
  recheck_run_id?: number | null;
}

export interface GeoSummary {
  byVerdict: Record<string, number>;
  resultRows: number;
  noiseRows: number;
  conclusion: string | null;
  progress: { done: number; total: number } | null;
  scopeLabel: string;
  nNodes: number | null;
  note: string | null;
}

/** Что выбрано касанием на карте (телефон): город или регион — список ниже сужается до него. */
export interface MapPick {
  kind: 'city' | 'region';
  /** Город — `region|city`, регион — код на карте (ISO без «RU-»). */
  key: string;
  label: string;
}

export interface GeoFilter {
  verdict: string | null;
  query: string;
  pick?: MapPick | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

const num = (value: unknown): number | null => (typeof value === 'number' ? value : null);
const str = (value: unknown): string | null => (typeof value === 'string' ? value : null);

export function geoRowsOf(job: Pick<Job, 'result'>): GeoRow[] {
  const rows = isRecord(job.result) ? job.result.rows : null;
  return Array.isArray(rows) ? (rows.filter(isRecord) as unknown as GeoRow[]) : [];
}

export function geoSummaryOf(job: Pick<Job, 'result'>): GeoSummary | null {
  if (!isRecord(job.result)) return null;
  const summary = isRecord(job.result.summary) ? job.result.summary : {};
  const geo = isRecord(job.result.geo) ? job.result.geo : {};
  const conclusion = isRecord(summary.conclusion) ? summary.conclusion : null;
  const progress = isRecord(summary.progress) ? summary.progress : null;
  const done = num(progress?.done);
  const total = num(progress?.total);
  return {
    byVerdict: isRecord(summary.by_verdict) ? (summary.by_verdict as Record<string, number>) : {},
    resultRows: num(summary.result_rows) ?? 0,
    noiseRows: num(summary.noise_rows) ?? 0,
    conclusion: str(conclusion?.text),
    progress: done !== null && total !== null ? { done, total } : null,
    scopeLabel: str(geo.scope_label) ?? '',
    nNodes: num(geo.n_nodes),
    note: str(job.result.note),
  };
}

const ORDER = new Map<string, number>(GEO_VERDICTS.map((verdict, index) => [verdict, index]));
/** Результативные вердикты — сверху, от худшего к лучшему; шум сервиса — ниже, в порядке легенды. */
const SEVERITY_FIRST = ['blocked', 'throttled', 'target_error', 'unconfirmed', 'partial', 'ok'];

function rank(row: GeoRow): number {
  const severity = SEVERITY_FIRST.indexOf(row.verdict);
  return severity === -1 ? 100 + (ORDER.get(row.verdict) ?? 99) : severity;
}

export function sortGeoRows(rows: readonly GeoRow[]): GeoRow[] {
  return [...rows].sort(
    (a, b) =>
      rank(a) - rank(b) ||
      a.district.localeCompare(b.district, 'ru') ||
      a.region_ru.localeCompare(b.region_ru, 'ru') ||
      a.city_ru.localeCompare(b.city_ru, 'ru'),
  );
}

export function filterGeoRows(rows: readonly GeoRow[], filter: GeoFilter): GeoRow[] {
  const query = filter.query.trim().toLowerCase();
  const pick = filter.pick ?? null;
  return rows.filter(
    (row) =>
      (filter.verdict === null || row.verdict === filter.verdict) &&
      (pick === null || matchesPick(row, pick)) &&
      (query === '' || `${row.city_ru} ${row.city} ${row.region_ru}`.toLowerCase().includes(query)),
  );
}

function matchesPick(row: GeoRow, pick: MapPick): boolean {
  return pick.kind === 'city'
    ? `${row.region}|${row.city}` === pick.key
    : regionCodeFor(row.region, row.region_ru) === pick.key;
}

export function verdictOrUnknown(value: string): string {
  return isGeoVerdict(value) ? value : 'unknown';
}
