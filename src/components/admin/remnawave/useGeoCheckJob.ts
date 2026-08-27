import { useCallback, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { adminRemnawaveApi } from '@/api/adminRemnawave';
import type { GeoCheckRequest, GeoCheckResult } from '@/api/adminRemnawave';
import { getApiErrorMessage } from '@/utils/api-error';

/** Как часто спрашивать панель о готовности отчёта. */
const POLL_INTERVAL_MS = 2500;
/** Нода отвечает до минуты; после этого порога считаем, что не дождались. */
const POLL_TIMEOUT_MS = 180_000;

export type GeoCheckPhase = 'idle' | 'running' | 'done' | 'error';

/**
 * Почему не получилось:
 * - `request` — панель не приняла запуск (старая версия, нода офлайн, нет прав);
 * - `timeout`  — задача принята, но результата не дождались;
 * - `failed`   — проверка завершилась неудачей, подробности в `message`.
 */
export interface GeoCheckError {
  kind: 'request' | 'timeout' | 'failed';
  message: string | null;
}

export interface GeoCheckJob {
  phase: GeoCheckPhase;
  result: GeoCheckResult | null;
  error: GeoCheckError | null;
  /** Запускает проверку; повторный вызов забывает прошлую задачу. */
  start: (body: GeoCheckRequest) => void;
  /** Повторяет проверку с теми же параметрами маршрута. */
  retry: () => void;
  reset: () => void;
}

/**
 * Жизненный цикл одной проверки GeoCheck.
 *
 * Проверка асинхронная: POST отдаёт `job_id`, дальше опрашиваем статус, пока
 * задача не завершится или не выйдет время. Таймаут обязателен — иначе
 * оставленная открытой модалка будет опрашивать панель бесконечно.
 */
export function useGeoCheckJob(nodeUuid: string): GeoCheckJob {
  const [jobId, setJobId] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const lastRequest = useRef<GeoCheckRequest>({});
  const startedAt = useRef(0);

  const startMutation = useMutation({
    mutationFn: (body: GeoCheckRequest) => adminRemnawaveApi.startNodeGeoCheck(nodeUuid, body),
    onSuccess: (data) => {
      startedAt.current = Date.now();
      setJobId(data.job_id);
    },
    onError: (error) => setRequestError(getApiErrorMessage(error, '')),
  });

  const jobQuery = useQuery({
    queryKey: ['admin-remnawave-geocheck', jobId],
    queryFn: () => adminRemnawaveApi.getGeoCheckJob(jobId as string),
    enabled: Boolean(jobId),
    gcTime: 0,
    refetchInterval: (query) => {
      if (Date.now() - startedAt.current > POLL_TIMEOUT_MS) return false;
      const data = query.state.data;
      if (!data) return POLL_INTERVAL_MS;
      return data.is_completed || data.is_failed ? false : POLL_INTERVAL_MS;
    },
  });

  const start = useCallback(
    (body: GeoCheckRequest) => {
      lastRequest.current = body;
      setRequestError(null);
      setJobId(null);
      startMutation.mutate(body);
    },
    [startMutation],
  );

  const retry = useCallback(() => start(lastRequest.current), [start]);

  const reset = useCallback(() => {
    setJobId(null);
    setRequestError(null);
    startMutation.reset();
  }, [startMutation]);

  const job = jobQuery.data;
  const settled = Boolean(job?.is_completed || job?.is_failed);
  const timedOut = Boolean(jobId) && !settled && Date.now() - startedAt.current > POLL_TIMEOUT_MS;
  // `is_failed` от панели и `success: false` внутри результата — разные вещи:
  // первое значит «задача упала», второе — «нода ответила, но проверка не
  // удалась». Админу в обоих случаях нужен `result.message`.
  const failed = Boolean(job?.is_failed || (settled && job?.result && !job.result.success));

  let phase: GeoCheckPhase = 'idle';
  let error: GeoCheckError | null = null;

  if (requestError !== null) {
    phase = 'error';
    error = { kind: 'request', message: requestError || null };
  } else if (timedOut) {
    phase = 'error';
    error = { kind: 'timeout', message: null };
  } else if (startMutation.isPending || (jobId && !settled)) {
    phase = 'running';
  } else if (settled) {
    phase = failed ? 'error' : 'done';
    if (failed) error = { kind: 'failed', message: job?.result?.message ?? null };
  }

  return {
    phase,
    result: job?.result ?? null,
    error,
    start,
    retry,
    reset,
  };
}
