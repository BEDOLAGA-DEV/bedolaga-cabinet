import type { Job } from '@/api/reachability';

/**
 * Ответ словами по задаче — первая строка результата и строки журнала: «открывается везде»,
 * «у N из M», «нигде», ошибка, отмена, идёт, итог скана. Считается по легам без отменённых.
 */
export type HeadlineKey =
  | 'all'
  | 'partial'
  | 'none'
  | 'failed'
  | 'cancelled'
  | 'pending'
  | 'scan'
  | 'empty';

export interface ResultHeadline {
  key: HeadlineKey;
  tone: 'ok' | 'warn' | 'down' | 'na' | 'pending';
  ok: number;
  total: number;
  /** Симки, у которых не открылось (op_key), для строки «режется: …». */
  blocked: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function scanCounts(result: Job['result']): { ok: number; total: number } | null {
  const status = isRecord(result) ? result.status : null;
  const inner = isRecord(status) ? status.result : null;
  if (!isRecord(inner)) return null;
  return {
    ok: typeof inner.up_n === 'number' ? inner.up_n : 0,
    total: typeof inner.total === 'number' ? inner.total : 0,
  };
}

const empty = (key: HeadlineKey, tone: ResultHeadline['tone']): ResultHeadline => ({
  key,
  tone,
  ok: 0,
  total: 0,
  blocked: [],
});

export function resultHeadline(
  job: Pick<Job, 'kind' | 'status' | 'legs' | 'result'>,
  targetKey?: string,
): ResultHeadline {
  if (job.status === 'pending' || job.status === 'running') return empty('pending', 'pending');
  if (job.status === 'failed') return empty('failed', 'down');
  if (job.status === 'cancelled') return empty('cancelled', 'na');
  if (job.kind === 'scan') {
    const counts = scanCounts(job.result);
    if (!counts) return empty('empty', 'na');
    return { key: 'scan', tone: counts.ok > 0 ? 'ok' : 'down', ...counts, blocked: [] };
  }
  const judged = job.legs.filter(
    (leg) =>
      leg.verdict !== 'cancelled' && (targetKey === undefined || leg.target_key === targetKey),
  );
  if (judged.length === 0) return empty('empty', 'na');
  const blocked = judged.filter((leg) => leg.verdict !== 'reachable').map((leg) => leg.op_key);
  const ok = judged.length - blocked.length;
  const key = ok === judged.length ? 'all' : ok === 0 ? 'none' : 'partial';
  const tone = key === 'all' ? 'ok' : key === 'none' ? 'down' : 'warn';
  return { key, tone, ok, total: judged.length, blocked };
}
