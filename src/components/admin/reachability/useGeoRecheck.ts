import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type Job, reachabilityApi } from '@/api/reachability';
import { useNotify } from '@/platform/hooks/useNotify';
import { getApiErrorMessage } from '@/utils/api-error';
import type { GeoRow } from './geoRowsView';
import { REACHABILITY_JOBS_KEY } from './jobsRefetch';
import { recheckKey } from './geoRecheck';
import { REACHABILITY_JOB_KEY } from './useReachabilityJob';
import { REACHABILITY_STATUS_KEY } from './useReachabilityStatus';

const POLL_MS = 3_000;
const TERMINAL: ReadonlySet<Job['status']> = new Set(['done', 'failed', 'cancelled']);

export interface GeoRecheck {
  /** Города, по которым перепроверка идёт прямо сейчас (ключ — город × заказанный провайдер). */
  busy: ReadonlySet<string>;
  start: (row: GeoRow, sameExit: boolean) => void;
}

/**
 * Перепроверка города прямо из отчёта, как у оригинала: без формы и без подтверждения — бот заводит
 * дочернюю задачу на один город, а её строки вливает в отчёт родителя. Хук ждёт дочернюю задачу
 * опросом и, когда она кончилась, перечитывает родителя: свежая строка появляется на месте.
 */
export function useGeoRecheck(job: Pick<Job, 'id'>): GeoRecheck {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const notify = useNotify();
  const [children, setChildren] = useState<Record<string, number>>({});
  const starting = useRef(new Set<string>());

  const start = useCallback(
    (row: GeoRow, sameExit: boolean) => {
      const key = recheckKey(row);
      if (starting.current.has(key) || key in children) return;
      starting.current.add(key);
      reachabilityApi
        .recheckGeo(job.id, {
          region: row.region,
          city: row.city,
          req_isp: row.req_isp ?? null,
          same_exit: sameExit,
        })
        .then((child) => setChildren((current) => ({ ...current, [key]: child.id })))
        .catch((error: unknown) =>
          notify.error(getApiErrorMessage(error, t('admin.reachability.geo.recheck.failed'))),
        )
        .finally(() => starting.current.delete(key));
    },
    [job.id, children, notify, t],
  );

  useEffect(() => {
    const ids = Object.entries(children);
    if (ids.length === 0) return undefined;
    let alive = true;
    const tick = async () => {
      for (const [key, childId] of ids) {
        try {
          const child = await reachabilityApi.getJob(childId);
          if (!alive || !TERMINAL.has(child.status)) continue;
          if (child.status === 'failed' && child.error_message) notify.error(child.error_message);
          setChildren((current) => {
            const { [key]: _done, ...rest } = current;
            return rest;
          });
          queryClient.invalidateQueries({ queryKey: [REACHABILITY_JOB_KEY, job.id] });
          queryClient.invalidateQueries({ queryKey: [REACHABILITY_JOBS_KEY] });
          queryClient.invalidateQueries({ queryKey: REACHABILITY_STATUS_KEY });
        } catch {
          // сеть моргнула — следующий опрос через POLL_MS
        }
      }
    };
    const timer = setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [children, job.id, notify, queryClient]);

  const busyKeys = new Set([...Object.keys(children), ...starting.current]);
  return { busy: busyKeys, start };
}
