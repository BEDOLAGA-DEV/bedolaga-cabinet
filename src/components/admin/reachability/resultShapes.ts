import type { Leg, Verdict } from '@/api/reachability';

/** Чистые преобразования сырых ответов API в форму для отрисовки. Никаких предположений о полноте данных. */

type Raw = Record<string, unknown>;

function isRecord(value: unknown): value is Raw {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

// ---------------------------------------------------------------- probe

export interface ProbeMatrix {
  rows: string[];
  cols: string[];
  cells: Record<string, Record<string, Leg>>;
}

/** Строки — цели, столбцы — симки, порядок — как леги пришли с сервера. */
export function probeMatrix(legs: Leg[]): ProbeMatrix {
  const rows: string[] = [];
  const cols: string[] = [];
  const cells: Record<string, Record<string, Leg>> = {};
  for (const leg of legs) {
    if (!rows.includes(leg.target_key)) rows.push(leg.target_key);
    if (!cols.includes(leg.op_key)) cols.push(leg.op_key);
    cells[leg.target_key] = { ...(cells[leg.target_key] ?? {}), [leg.op_key]: leg };
  }
  return { rows, cols, cells };
}

// ---------------------------------------------------------------- vless

export interface VlessLegView {
  server: string;
  opKey: string;
  verdict: Verdict;
  matches: boolean | null;
  tunnelUp: boolean | null;
  targetsOk: number;
  targetsTotal: number;
  latencyMs: number | null;
  core: string | null;
  failReason: string | null;
  diagnosis: string | null;
}

export function vlessLegView(leg: Leg): VlessLegView {
  const raw = leg.raw ?? {};
  const targets = Array.isArray(raw.targets) ? raw.targets.filter(isRecord) : [];
  return {
    server: asString(raw.server_name) ?? asString(raw.server_addr) ?? leg.target_key,
    opKey: leg.op_key,
    verdict: leg.verdict,
    matches: leg.matches_expectation,
    tunnelUp: typeof raw.tunnel_up === 'boolean' ? raw.tunnel_up : null,
    targetsOk: targets.filter((target) => target.ok === true).length,
    targetsTotal: targets.length,
    latencyMs: asNumber(raw.tcp_latency_ms),
    core: asString(raw.used_core),
    failReason: asString(raw.fail_reason),
    diagnosis: asString(raw.diagnosis),
  };
}

// ---------------------------------------------------------------- scan

export interface ScanUnitProbe {
  icmp: boolean;
  tcp: boolean;
  sni: Record<string, boolean>;
}

export interface ScanIp {
  ip: string;
  units: Record<string, ScanUnitProbe>;
}

export interface ScanSummary {
  upN: number;
  total: number;
  operators: string[];
  ips: ScanIp[];
  aliveByUnit: Record<string, number>;
}

function unitProbe(value: unknown): ScanUnitProbe | null {
  if (!isRecord(value)) return null;
  const sni: Record<string, boolean> = {};
  if (isRecord(value.sni)) {
    for (const [host, ok] of Object.entries(value.sni)) sni[host] = ok === true;
  }
  return { icmp: value.icmp === true, tcp: value.tcp === true, sni };
}

function scanIp(value: unknown): ScanIp | null {
  if (!isRecord(value) || typeof value.ip !== 'string') return null;
  const units: Record<string, ScanUnitProbe> = {};
  if (isRecord(value.by_operator)) {
    for (const [opKey, probe] of Object.entries(value.by_operator)) {
      const parsed = unitProbe(probe);
      if (parsed) units[opKey] = parsed;
    }
  }
  return { ip: value.ip, units };
}

/** Из ``job.result.status.result`` скана: живые адреса, симки с находками, счётчик по симкам. */
export function scanSummary(jobResult: Raw | null): ScanSummary | null {
  const status = isRecord(jobResult?.status) ? jobResult.status : null;
  const result = status && isRecord(status.result) ? status.result : null;
  if (!result) return null;
  const ips = (Array.isArray(result.results) ? result.results : [])
    .map(scanIp)
    .filter((item): item is ScanIp => item !== null);
  const operators = Array.isArray(result.operators)
    ? result.operators.filter((item): item is string => typeof item === 'string')
    : [];
  const aliveByUnit: Record<string, number> = {};
  for (const item of ips) {
    for (const opKey of Object.keys(item.units)) aliveByUnit[opKey] = (aliveByUnit[opKey] ?? 0) + 1;
  }
  return {
    upN: asNumber(result.up_n) ?? ips.length,
    total: asNumber(result.total) ?? 0,
    operators,
    ips,
    aliveByUnit,
  };
}
