import type { Job } from '@/api/reachability';

export const REACHABILITY_JOBS_KEY = 'admin-reachability-jobs';

const ACTIVE = new Set<Job['status']>(['pending', 'running']);
const ACTIVE_REFETCH_MS = 10_000;

/** Журнал обновляется сам, пока в нём есть незавершённые задачи; иначе сервер не дёргаем. */
export function jobsRefetchInterval(
  items: ReadonlyArray<Pick<Job, 'status'>> | undefined,
): number | false {
  return items?.some((job) => ACTIVE.has(job.status)) ? ACTIVE_REFETCH_MS : false;
}
