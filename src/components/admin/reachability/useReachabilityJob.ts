import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { type Job, reachabilityApi } from '@/api/reachability';
import { getApiErrorMessage } from '@/utils/api-error';

export type JobUiPhase = 'idle' | 'loading' | 'running' | 'done' | 'failed' | 'cancelled';

export const REACHABILITY_JOB_KEY = 'admin-reachability-job';

const ACTIVE_STATUSES = new Set<Job['status']>(['pending', 'running']);
const DEFAULT_POLL_MS = 3_000;
const DEFAULT_SLOW_POLL_MS = 15_000;
const DEFAULT_SLOW_AFTER_MS = 3 * 60_000;

interface Options {
  pollMs?: number;
  /** После slowAfterMs опрос реже — долгая проба по всему флоту идёт 10–20 минут. */
  slowPollMs?: number;
  slowAfterMs?: number;
}

function uiPhase(jobId: number | null, job: Job | undefined, isError: boolean): JobUiPhase {
  if (jobId === null) return 'idle';
  if (!job) return isError ? 'failed' : 'loading';
  if (job.status === 'done' || job.status === 'failed' || job.status === 'cancelled') {
    return job.status;
  }
  return 'running';
}

/**
 * Опрос нашей задачи (не внешнего API): дёшево, поэтому раз в 3 с; через несколько минут —
 * раз в 15 с. Пока задача идёт, опрос не прекращается: страница обновляется сама.
 */
export function useReachabilityJob(jobId: number | null, options: Options = {}) {
  const pollMs = options.pollMs ?? DEFAULT_POLL_MS;
  const slowPollMs = options.slowPollMs ?? DEFAULT_SLOW_POLL_MS;
  const slowAfterMs = options.slowAfterMs ?? DEFAULT_SLOW_AFTER_MS;
  const [watchingSince, setWatchingSince] = useState(() => Date.now());

  useEffect(() => {
    setWatchingSince(Date.now());
  }, []);

  const query = useQuery<Job>({
    queryKey: [REACHABILITY_JOB_KEY, jobId],
    queryFn: () => reachabilityApi.getJob(jobId as number),
    enabled: jobId !== null,
    gcTime: 0,
    retry: false,
    refetchInterval: (current) => {
      const data = current.state.data;
      if (data && !ACTIVE_STATUSES.has(data.status)) return false;
      return Date.now() - watchingSince > slowAfterMs ? slowPollMs : pollMs;
    },
  });

  const job = query.data;
  const phase = uiPhase(jobId, job, query.isError);
  let error: string | null = null;
  if (query.isError) {
    const fallback = query.error instanceof Error ? query.error.message : '';
    error = getApiErrorMessage(query.error, fallback);
  } else if (job?.status === 'failed') {
    error = job.error_message;
  }
  return { job, phase, error, refetch: query.refetch };
}
