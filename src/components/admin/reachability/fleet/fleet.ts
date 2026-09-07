import type { HostTarget, Purpose, ScopeKind, Summary, SummaryRow, Unit } from '@/api/reachability';

/**
 * Состояние флота: сервер панели глазами симок своего назначения. Чистые функции над сводкой
 * (`/summary/hosts?dpi=any`) и хостами панели; ничего не знают о запросах и разметке.
 */

export type FleetState = 'ok' | 'partial' | 'down' | 'unchecked';

export interface FleetRow {
  /** target_key сводки («адрес:порт»). */
  key: string;
  /** uuid хоста панели — им запускается проверка; null у строки без хоста. */
  ref: string | null;
  label: string;
  address: string;
  purpose: Purpose;
  state: FleetState;
  /** Симки, у которых сервер открылся, и сколько всего судили (без отменённых). */
  ok: number;
  total: number;
  /** Самая свежая релевантная проверка (ISO) или null. */
  checkedAt: string | null;
  /** op_key симок, у которых не ловит. */
  blocked: string[];
  inPanel: boolean;
}

export interface FleetCounts {
  total: number;
  ok: number;
  partial: number;
  down: number;
  unchecked: number;
  bs: number;
  regular: number;
  stale: number;
}

export type FleetFilter = 'all' | 'problems' | 'unchecked' | 'bs' | 'regular';

export interface FleetGroup {
  state: FleetState;
  rows: FleetRow[];
}

export interface OperatorBreakdown {
  operator: string;
  name: string;
  ok: number;
  total: number;
  /** Округа заглавными, где не ловит («ПФО»). */
  blockedRegions: string[];
}

/** «Давно не проверяли» — старше недели или вовсе без проверок. */
export const STALE_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
/** Порядок групп на странице: проблемы сначала. */
export const GROUP_ORDER: readonly FleetState[] = ['down', 'partial', 'unchecked', 'ok'];

/** Симки, которыми судят о сервере: под Белый список — с ним, обычный — без, неизвестно — все. */
export function relevantDpi(purpose: Purpose): 'on' | 'off' | null {
  if (purpose === 'bs') return 'on';
  if (purpose === 'regular') return 'off';
  return null;
}

export function fleetState(ok: number, total: number): FleetState {
  if (total === 0) return 'unchecked';
  if (ok === total) return 'ok';
  if (ok === 0) return 'down';
  return 'partial';
}

function hostAddress(host: HostTarget | undefined, fallback: string): string {
  if (!host) return fallback;
  return host.port ? `${host.address}:${host.port}` : host.address;
}

function relevantCells(row: SummaryRow, dpiOf: Map<string, string>) {
  const wanted = relevantDpi(row.purpose);
  return Object.entries(row.cells).filter(
    ([opKey, cell]) =>
      cell.verdict !== 'cancelled' && (wanted === null || (dpiOf.get(opKey) ?? wanted) === wanted),
  );
}

export function fleetRows(summary: Summary, hosts: HostTarget[]): FleetRow[] {
  const dpiOf = new Map(summary.units.map((u) => [u.op_key, u.dpi]));
  const hostByUuid = new Map(hosts.map((h) => [h.uuid, h]));
  const rows: FleetRow[] = [];
  for (const row of summary.rows) {
    if (!row.in_panel) continue;
    const host = row.ref ? hostByUuid.get(row.ref) : undefined;
    if (host?.excluded) continue;
    const cells = relevantCells(row, dpiOf);
    const blocked = cells
      .filter(([, cell]) => cell.verdict !== 'reachable')
      .map(([opKey]) => opKey);
    const checkedAt = cells.reduce<string | null>(
      (latest, [, cell]) =>
        latest === null || cell.checked_at > latest ? cell.checked_at : latest,
      null,
    );
    const total = cells.length;
    const ok = total - blocked.length;
    rows.push({
      key: row.target_key,
      ref: row.ref,
      label: row.label,
      address: hostAddress(host, row.target_key),
      purpose: row.purpose,
      state: fleetState(ok, total),
      ok,
      total,
      checkedAt,
      blocked,
      inPanel: row.in_panel,
    });
  }
  return rows;
}

export function isStale(row: FleetRow, now: Date): boolean {
  if (row.checkedAt === null) return true;
  return now.getTime() - new Date(row.checkedAt).getTime() > STALE_DAYS * DAY_MS;
}

export function fleetCounts(rows: FleetRow[], now: Date): FleetCounts {
  const counts: FleetCounts = {
    total: rows.length,
    ok: 0,
    partial: 0,
    down: 0,
    unchecked: 0,
    bs: 0,
    regular: 0,
    stale: 0,
  };
  for (const row of rows) {
    counts[row.state] += 1;
    if (row.purpose === 'bs') counts.bs += 1;
    else counts.regular += 1;
    if (isStale(row, now)) counts.stale += 1;
  }
  return counts;
}

function matchesFilter(row: FleetRow, filter: FleetFilter): boolean {
  switch (filter) {
    case 'problems':
      return row.state === 'down' || row.state === 'partial';
    case 'unchecked':
      return row.state === 'unchecked';
    case 'bs':
      return row.purpose === 'bs';
    case 'regular':
      return row.purpose !== 'bs';
    default:
      return true;
  }
}

export function filterRows(rows: FleetRow[], filter: FleetFilter, query: string): FleetRow[] {
  const needle = query.trim().toLowerCase();
  return rows.filter(
    (row) =>
      matchesFilter(row, filter) &&
      (needle === '' ||
        row.label.toLowerCase().includes(needle) ||
        row.address.toLowerCase().includes(needle)),
  );
}

export function groupRows(rows: FleetRow[]): FleetGroup[] {
  return GROUP_ORDER.map((state) => ({
    state,
    rows: rows.filter((row) => row.state === state),
  })).filter((group) => group.rows.length > 0);
}

/** Какие серверы берёт пачка по выбранному объёму; порядок — как в списке, строки без хоста не берутся. */
export function scopeRefs(
  rows: FleetRow[],
  kind: ScopeKind,
  now: Date,
  manual: readonly string[],
): string[] {
  const picked = new Set(manual);
  return rows
    .filter((row) => {
      if (row.ref === null) return false;
      if (kind === 'problems') return row.state === 'down' || row.state === 'partial';
      if (kind === 'stale') return isStale(row, now);
      if (kind === 'manual') return picked.has(row.ref);
      return true;
    })
    .map((row) => row.ref as string);
}

export function lastCheckedAt(rows: FleetRow[]): string | null {
  return rows.reduce<string | null>(
    (latest, row) =>
      row.checkedAt !== null && (latest === null || row.checkedAt > latest)
        ? row.checkedAt
        : latest,
    null,
  );
}

/** Разбор сервера по операторам: сколько симок ловит и в каких округах режется. */
export function operatorBreakdown(
  row: SummaryRow,
  units: Unit[],
  dpi: 'on' | 'off' | null,
): OperatorBreakdown[] {
  const byOperator = new Map<string, OperatorBreakdown>();
  for (const unit of units) {
    if (dpi !== null && unit.dpi !== dpi) continue;
    const cell = row.cells[unit.op_key];
    if (!cell || cell.verdict === 'cancelled') continue;
    const entry = byOperator.get(unit.operator) ?? {
      operator: unit.operator,
      name: unit.name || unit.operator,
      ok: 0,
      total: 0,
      blockedRegions: [],
    };
    entry.total += 1;
    if (cell.verdict === 'reachable') entry.ok += 1;
    else entry.blockedRegions.push((unit.region || unit.op_key.split('|')[1] || '').toUpperCase());
    byOperator.set(unit.operator, entry);
  }
  return [...byOperator.values()].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
}
