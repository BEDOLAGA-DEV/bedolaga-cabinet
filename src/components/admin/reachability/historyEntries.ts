import type { Job, JobStatus } from '@/api/reachability';
import { resultHeadline } from './resultHeadline';

/**
 * Журнал для людей: пачка (проверка многих серверов одной кнопкой) в боте — это несколько
 * задач по 10 целей, а в журнале должна быть одна строка «24 сервера · работают 12 из 24».
 * Чистые функции над списком задач; ничего не знают о запросах и разметке.
 */

export type HistoryEntry =
  | { kind: 'job'; key: string; job: Job }
  | { kind: 'batch'; key: string; batchId: number; jobs: Job[] };

export type BatchStatus = 'pending' | 'done' | 'failed' | 'cancelled';

export interface BatchSummary {
  targets: number;
  ok: number;
  partial: number;
  down: number;
  status: BatchStatus;
  tone: 'ok' | 'warn' | 'down' | 'na' | 'pending';
  costKopeks: number | null;
  units: number;
  startedAt: string | null;
}

const ACTIVE: ReadonlySet<JobStatus> = new Set(['pending', 'running']);

/** Задачи одной пачки склеиваются по batch_id, даже если между ними стоит чужая; порядок — по первой. */
export function groupHistory(jobs: readonly Job[]): HistoryEntry[] {
  const byKey = new Map<string, HistoryEntry>();
  for (const job of jobs) {
    if (job.batch_id === null || job.batch_id === undefined) {
      const key = `job-${job.id}`;
      byKey.set(key, { kind: 'job', key, job });
      continue;
    }
    const key = `batch-${job.batch_id}`;
    const current = byKey.get(key);
    // Ключ пачки известен: выше отсеяны задачи без неё.
    if (current?.kind === 'batch') byKey.set(key, { ...current, jobs: [...current.jobs, job] });
    else byKey.set(key, { kind: 'batch', key, batchId: job.batch_id, jobs: [job] });
  }
  return [...byKey.values()];
}

function batchStatus(jobs: readonly Job[]): BatchStatus {
  if (jobs.some((job) => ACTIVE.has(job.status))) return 'pending';
  if (jobs.every((job) => job.status === 'cancelled')) return 'cancelled';
  if (jobs.every((job) => job.status === 'failed')) return 'failed';
  return 'done';
}

function unitsCount(job: Job): number {
  return (job.units_effective ?? job.units_resolved ?? job.units_requested ?? []).length;
}

function sumOrNull(values: ReadonlyArray<number | null>): number | null {
  const known = values.filter((value): value is number => value !== null);
  return known.length === 0 ? null : known.reduce((sum, value) => sum + value, 0);
}

/** Итог пачки словами: сколько серверов работают, не у всех, не работают; цена суммой; время — самое раннее. */
export function batchSummary(jobs: readonly Job[]): BatchSummary {
  const status = batchStatus(jobs);
  const verdicts = jobs.flatMap((job) =>
    job.targets.map((target) => resultHeadline(job, target.target_key).key),
  );
  const ok = verdicts.filter((key) => key === 'all').length;
  const partial = verdicts.filter((key) => key === 'partial').length;
  const down = verdicts.filter((key) => key === 'none').length;
  const judged = ok + partial + down;
  const tone: BatchSummary['tone'] =
    status === 'pending'
      ? 'pending'
      : status === 'failed'
        ? 'down'
        : status === 'cancelled' || judged === 0
          ? 'na'
          : ok === judged
            ? 'ok'
            : ok === 0
              ? 'down'
              : 'warn';
  const starts = jobs
    .map((job) => job.started_at ?? job.created_at)
    .filter((value): value is string => value !== null)
    .sort();
  return {
    targets: verdicts.length,
    ok,
    partial,
    down,
    status,
    tone,
    costKopeks: sumOrNull(jobs.map((job) => job.cost_kopeks)),
    units: Math.max(0, ...jobs.map(unitsCount)),
    startedAt: starts[0] ?? null,
  };
}

/** Одна задача для показа результата пачки: все цели, все леги, цена суммой. Исходные задачи не трогаются. */
export function mergeBatchJobs(jobs: readonly Job[]): Job {
  const summary = batchSummary(jobs);
  const status: JobStatus =
    summary.status === 'pending'
      ? 'running'
      : summary.status === 'cancelled'
        ? 'cancelled'
        : summary.status === 'failed'
          ? 'failed'
          : 'done';
  return {
    ...jobs[0],
    status,
    targets: jobs.flatMap((job) => job.targets),
    legs: jobs.flatMap((job) => job.legs),
    cost_kopeks: summary.costKopeks,
    refunded_kopeks: sumOrNull(jobs.map((job) => job.refunded_kopeks)),
    estimate_is_exact: jobs.every((job) => job.estimate_is_exact),
    error_code: null,
    error_message: null,
    started_at: summary.startedAt,
  };
}

/** Хосты панели из всех задач пачки — для «Повторить» на всех серверах сразу. */
export function batchHosts(jobs: readonly Job[]): string[] {
  return jobs
    .flatMap((job) => job.targets)
    .filter((target) => target.kind === 'host')
    .map((target) => target.ref?.host_uuid)
    .filter((uuid): uuid is string => typeof uuid === 'string' && uuid !== '');
}
