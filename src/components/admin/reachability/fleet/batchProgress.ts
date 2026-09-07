import type { Batch, BatchJob, PartialLeg } from '@/api/reachability';

/**
 * Прогресс пачки по серверам: из задач и их частичных результатов (409 request_in_progress)
 * собирается «ждёт / проверяем / готово» и промежуточный счёт «ловит у ok из total».
 */

export type TargetProgressState = 'queued' | 'checking' | 'done';

export interface TargetProgress {
  state: TargetProgressState;
  /** Симки, у которых уже ловит, всего симок цели в пробе и сколько из них ответили. */
  ok: number;
  total: number;
  done: number;
}

const ACTIVE = new Set<Batch['status']>(['pending', 'running']);
const TERMINAL = new Set<BatchJob['status']>(['done', 'failed', 'cancelled']);

const empty = (state: TargetProgressState): TargetProgress => ({ state, ok: 0, total: 0, done: 0 });

/** API отдаёт цель так, как её отправили: «host:port» или голый домен; сравниваем без регистра. */
function legMatches(leg: PartialLeg, key: string): boolean {
  const target = leg.target.toLowerCase();
  const lowered = key.toLowerCase();
  return target === lowered || lowered.startsWith(`${target}:`);
}

function progressFromLegs(
  legs: PartialLeg[],
  key: string,
  state: TargetProgressState,
): TargetProgress {
  const own = legs.filter((leg) => legMatches(leg, key));
  const finished = own.filter((leg) => leg.state === 'done');
  return {
    state,
    ok: finished.filter((leg) => leg.verdict === 'reachable').length,
    total: own.length,
    done: finished.length,
  };
}

export function batchTargets(batch: Batch): Map<string, TargetProgress> {
  const map = new Map<string, TargetProgress>();
  for (const job of batch.jobs) {
    const legs = job.partial?.legs ?? [];
    for (const key of job.target_keys) {
      if (job.status === 'pending') {
        map.set(key, empty('queued'));
      } else if (TERMINAL.has(job.status)) {
        map.set(key, legs.length ? progressFromLegs(legs, key, 'done') : empty('done'));
      } else {
        map.set(key, legs.length ? progressFromLegs(legs, key, 'checking') : empty('checking'));
      }
    }
  }
  return map;
}

/** Сколько ещё ждать: доля несделанных серверов от оценки на всю пачку, не меньше минуты. */
export function batchEtaMinutes(batch: Batch, estimatedMinutes: number | null): number | null {
  if (estimatedMinutes === null || batch.total_targets === 0) return null;
  const left = 1 - batch.done_targets / batch.total_targets;
  return Math.max(1, Math.round(estimatedMinutes * left));
}

export function isBatchActive(batch: Pick<Batch, 'status'> | null | undefined): boolean {
  return batch ? ACTIVE.has(batch.status) : false;
}

export function spentSoFar(batch: Batch): number {
  return batch.jobs.reduce((sum, job) => sum + (job.cost_kopeks ?? 0), 0);
}
