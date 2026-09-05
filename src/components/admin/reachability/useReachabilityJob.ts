import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { type Job, reachabilityApi } from '@/api/reachability';
import { getApiErrorMessage } from '@/utils/api-error';

export type JobUiPhase =
  | 'idle'
  | 'loading'
  | 'running'
  | 'done'
  | 'failed'
  | 'cancelled'
  | 'stalled';

export const REACHABILITY_JOB_KEY = 'admin-reachability-job';

const ACTIVE_STATUSES = new Set<Job['status']>(['pending', 'running']);
const DEFAULT_POLL_MS = 3_000;
const DEFAULT_MAX_MS = 25 * 60_000;

interface Options {
  pollMs?: number;
  maxMs?: number;
}

function uiPhase(jobId: number | null, job: Job | undefined, isError: boolean, stalled: boolean) {
  if (jobId === null) return 'idle' as const;
  if (!job) return isError ? ('failed' as const) : ('loading' as const);
  if (job.status === 'done') return 'done' as const;
  if (job.status === 'failed') return 'failed' as const;
  if (job.status === 'cancelled') return 'cancelled' as const;
  return stalled ? ('stalled' as const) : ('running' as const);
}

/**
 * Опрос нашей задачи (не внешнего API): дёшево, поэтому раз в 3 с. Через maxMs
 * опрос прекращается — задача продолжает жить на сервере, результат будет в истории.
 */
export function useReachabilityJob(jobId: number | null, options: Options = {}) {
  const pollMs = options.pollMs ?? DEFAULT_POLL_MS;
  const maxMs = options.maxMs ?? DEFAULT_MAX_MS;
  const [stalled, setStalled] = useState(false);

  useEffect(() => {
    setStalled(false);
    if (jobId === null) return undefined;
    const timer = setTimeout(() => setStalled(true), maxMs);
    return () => clearTimeout(timer);
  }, [jobId, maxMs]);

  const query = useQuery<Job>({
    queryKey: [REACHABILITY_JOB_KEY, jobId],
    queryFn: () => reachabilityApi.getJob(jobId as number),
    enabled: jobId !== null,
    gcTime: 0,
    retry: false,
    refetchInterval: (current) => {
      const data = current.state.data;
      if (stalled || (data && !ACTIVE_STATUSES.has(data.status))) return false;
      return pollMs;
    },
  });

  const job = query.data;
  const phase: JobUiPhase = uiPhase(jobId, job, query.isError, stalled);
  let error: string | null = null;
  if (query.isError) {
    const fallback = query.error instanceof Error ? query.error.message : '';
    error = getApiErrorMessage(query.error, fallback);
  } else if (job?.status === 'failed') {
    error = job.error_message;
  }
  return { job, phase, error, refetch: query.refetch };
}
