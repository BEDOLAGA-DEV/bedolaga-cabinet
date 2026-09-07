import type { Job, Leg } from '@/api/reachability';

/**
 * Ячейки таблицы результата пробы — как в оригинале bsbord: строка — симка оператора,
 * столбцы — пробы ICMP · TCP · SNI · HTTP, в ячейке точка и значение (задержка, «(tls)»).
 * Чистые функции над сырым ответом API, без предположений о полноте данных.
 */

export type ProbeName = 'icmp' | 'tcp' | 'sni' | 'http';
export type CellState = 'ok' | 'down' | 'warn' | 'na';

export interface ProbeCell {
  probe: ProbeName;
  state: CellState;
  value: string | null;
  /** Multi-SNI: по точке на каждое имя. */
  subs: boolean[] | null;
}

type Raw = Record<string, unknown>;

const ORDER: ProbeName[] = ['icmp', 'tcp', 'sni', 'http'];

function isRecord(value: unknown): value is Raw {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function number(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function sniAlive(entry: unknown): boolean {
  return isRecord(entry) && (entry.ok === true || entry.verdict === 'alive');
}

/** Столбцы: заказанные пробы из запроса задачи; HTTP — если API добавил его сам (для доменов). */
export function probeColumns(job: Pick<Job, 'probes' | 'legs'>): ProbeName[] {
  const seen = new Set<ProbeName>();
  for (const leg of job.legs) {
    const raw = leg.raw ?? {};
    for (const probe of ORDER) {
      if (raw[probe] !== null && raw[probe] !== undefined) seen.add(probe);
    }
  }
  const requested = job.probes
    ? (Object.entries(job.probes) as Array<[ProbeName, boolean]>)
        .filter(([name, on]) => on && ORDER.includes(name))
        .map(([name]) => name)
    : [];
  const columns = new Set<ProbeName>([...requested, ...seen]);
  return ORDER.filter((probe) => columns.has(probe));
}

function icmpCell(raw: Raw): ProbeCell {
  const icmp = raw.icmp;
  if (!isRecord(icmp)) return { probe: 'icmp', state: 'na', value: null, subs: null };
  const rtt = number(icmp.rtt_avg_ms) ?? number(icmp.rtt_ms) ?? number(raw.latency_ms);
  if (icmp.ok === true) {
    return {
      probe: 'icmp',
      state: 'ok',
      value: rtt !== null ? `${Math.round(rtt)} ms` : null,
      subs: null,
    };
  }
  const loss = number(icmp.loss_pct);
  return {
    probe: 'icmp',
    state: 'down',
    value: loss !== null ? `${Math.round(loss)}%` : null,
    subs: null,
  };
}

function tcpCell(raw: Raw): ProbeCell {
  const tcp = raw.tcp ?? raw.tsp_tls;
  if (!isRecord(tcp)) return { probe: 'tcp', state: 'na', value: null, subs: null };
  const received = number(tcp.received) ?? 0;
  const ok = tcp.ok === true || received > 0;
  return {
    probe: 'tcp',
    state: ok ? 'ok' : 'down',
    value: raw.tcp_is_tls === true ? '(tls)' : null,
    subs: null,
  };
}

function sniCell(raw: Raw): ProbeCell {
  const entries = Array.isArray(raw.sni) ? raw.sni : [];
  if (entries.length === 0) return { probe: 'sni', state: 'na', value: null, subs: null };
  if (entries.length === 1) {
    const entry = entries[0];
    const rtt = isRecord(entry) ? number(entry.rtt_ms) : null;
    return {
      probe: 'sni',
      state: sniAlive(entry) ? 'ok' : 'down',
      value: rtt !== null ? `${Math.round(rtt)} ms` : null,
      subs: null,
    };
  }
  const subs = entries.map(sniAlive);
  const alive = subs.filter(Boolean).length;
  return {
    probe: 'sni',
    state: alive === subs.length ? 'ok' : alive === 0 ? 'down' : 'warn',
    value: `${alive}/${subs.length}`,
    subs,
  };
}

function httpCell(raw: Raw): ProbeCell {
  const http = raw.http;
  if (!isRecord(http)) return { probe: 'http', state: 'na', value: null, subs: null };
  const elapsed = number(http.elapsed_ms);
  return {
    probe: 'http',
    state: http.ok === true ? 'ok' : 'down',
    value: http.ok === true && elapsed !== null ? `${Math.round(elapsed)} ms` : null,
    subs: null,
  };
}

const BUILDERS: Record<ProbeName, (raw: Raw) => ProbeCell> = {
  icmp: icmpCell,
  tcp: tcpCell,
  sni: sniCell,
  http: httpCell,
};

/** Ячейки лега по столбцам; лег с ошибкой (симка не ответила) — все ячейки «недоступно». */
export function probeCells(leg: Pick<Leg, 'raw'>, columns: ProbeName[]): ProbeCell[] {
  const raw = leg.raw ?? {};
  const failed = raw.ok === false || (typeof raw.error === 'string' && raw.error !== '');
  return columns.map((probe) =>
    failed ? { probe, state: 'down', value: null, subs: null } : BUILDERS[probe](raw),
  );
}

/** Группы строк: по цели, в порядке легов. */
export function groupLegsByTarget(legs: Leg[]): Array<{ targetKey: string; legs: Leg[] }> {
  const groups: Array<{ targetKey: string; legs: Leg[] }> = [];
  for (const leg of legs) {
    const group = groups.find((item) => item.targetKey === leg.target_key);
    if (group) group.legs.push(leg);
    else groups.push({ targetKey: leg.target_key, legs: [leg] });
  }
  return groups;
}
