import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { type Batch, reachabilityApi } from '@/api/reachability';
import { getApiErrorMessage } from '@/utils/api-error';
import { REACHABILITY_JOBS_KEY } from '../jobsRefetch';
import { REACHABILITY_STATUS_KEY } from '../useReachabilityStatus';
import { REACHABILITY_SUMMARY_KEY } from '../useTargets';
import { isBatchActive } from './batchProgress';

export const REACHABILITY_BATCH_KEY = 'admin-reachability-batch';
const DEFAULT_POLL_MS = 3_000;

interface Options {
  pollMs?: number;
}

/**
 * Опрос пачки, пока она идёт: дёшево (наша ручка), поэтому раз в 3 с и без «медленного» режима.
 * Когда пачка завершилась, обновляются сводка флота, журнал и статус (баланс).
 */
export function useBatch(batchId: number | null, options: Options = {}) {
  const pollMs = options.pollMs ?? DEFAULT_POLL_MS;
  const queryClient = useQueryClient();
  const query = useQuery<Batch>({
    queryKey: [REACHABILITY_BATCH_KEY, batchId],
    queryFn: () => reachabilityApi.getBatch(batchId as number),
    enabled: batchId !== null,
    retry: false,
    refetchInterval: (current) => {
      const data = current.state.data;
      if (data && !isBatchActive(data)) return false;
      return pollMs;
    },
  });

  const batch = query.data;
  const isActive = isBatchActive(batch);
  const wasActive = useRef(false);
  useEffect(() => {
    if (wasActive.current && batch && !isActive) {
      queryClient.invalidateQueries({ queryKey: [REACHABILITY_SUMMARY_KEY] });
      queryClient.invalidateQueries({ queryKey: [REACHABILITY_JOBS_KEY] });
      queryClient.invalidateQueries({ queryKey: REACHABILITY_STATUS_KEY });
    }
    wasActive.current = isActive;
  }, [batch, isActive, queryClient]);

  const error = query.isError ? getApiErrorMessage(query.error, '') : null;
  return { batch, isActive, error, refetch: query.refetch };
}

/** «Остановить»: очередь гаснет сразу, идущие пробы останавливаются; итог придёт опросом. */
export function useCancelBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (batchId: number) => reachabilityApi.cancelBatch(batchId),
    onSuccess: (batch) => {
      queryClient.setQueryData([REACHABILITY_BATCH_KEY, batch.id], batch);
    },
  });
}
