import type { Job } from '@/api/reachability';
import type { CellState } from './probeCells';

/** Итог задачи одной точкой, как в журнале оригинала: всё доступно · частично · недоступно. */
export type Outcome = CellState | 'pending';

export function jobOutcome(job: Pick<Job, 'status' | 'legs' | 'kind' | 'result'>): Outcome {
  if (job.status === 'pending' || job.status === 'running') return 'pending';
  if (job.status === 'failed') return 'down';
  if (job.status === 'cancelled') return 'na';
  if (job.kind === 'scan') {
    const status =
      job.result && typeof job.result === 'object'
        ? (job.result as Record<string, unknown>).status
        : null;
    const result =
      status && typeof status === 'object' ? (status as Record<string, unknown>).result : null;
    const upN =
      result && typeof result === 'object' ? (result as Record<string, unknown>).up_n : null;
    return typeof upN === 'number' ? (upN > 0 ? 'ok' : 'down') : 'na';
  }
  const judged = job.legs.filter((leg) => leg.verdict !== 'cancelled');
  if (judged.length === 0) return 'na';
  const reachable = judged.filter((leg) => leg.verdict === 'reachable').length;
  if (reachable === judged.length) return 'ok';
  if (reachable === 0) return 'down';
  return 'warn';
}

/** Уникальные коды операторов задачи для ряда иконок. */
export function jobOperators(
  job: Pick<Job, 'legs' | 'units_effective' | 'units_resolved'>,
): string[] {
  const codes = new Set<string>();
  for (const leg of job.legs) codes.add(leg.operator ?? leg.op_key.split('|')[0]);
  if (codes.size === 0) {
    for (const key of job.units_effective ?? job.units_resolved ?? []) codes.add(key.split('|')[0]);
  }
  return [...codes];
}
