import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type Job, reachabilityApi } from '@/api/reachability';
import { useNotify } from '@/platform/hooks/useNotify';
import { getApiErrorMessage } from '@/utils/api-error';
import type { GeoRow } from './geoRowsView';
import { REACHABILITY_JOBS_KEY } from './jobsRefetch';
import { recheckEntries, recheckKey, runningRechecks } from './geoRecheck';
import { REACHABILITY_JOB_KEY } from './useReachabilityJob';
import { REACHABILITY_STATUS_KEY } from './useReachabilityStatus';

const POLL_MS = 3_000;

export interface GeoRecheck {
  /** Города, по которым перепроверка идёт прямо сейчас (ключ — город × заказанный провайдер). */
  busy: ReadonlySet<string>;
  start: (row: GeoRow, sameExit: boolean) => void;
}

/** Множество с добавленными ключами; без новых — то же самое, чтобы не дёргать эффекты зря. */
function union(current: ReadonlySet<string>, add: Iterable<string>): ReadonlySet<string> {
  let next: Set<string> | null = null;
  for (const key of add) {
    if (current.has(key)) continue;
    next ??= new Set(current);
    next.add(key);
  }
  return next ?? current;
}

function without(current: ReadonlySet<string>, remove: Iterable<string>): ReadonlySet<string> {
  const next = new Set(current);
  for (const key of remove) next.delete(key);
  return next;
}

/**
 * Перепроверка города прямо из отчёта, как у оригинала: без формы и без подтверждения. Новой задачи
 * бот не заводит — гоняет город своим прогоном у сервиса и вливает итог в этот же отчёт; пока идёт,
 * в отчёте лежит запись `result.rechecks[город]`. Хук ждёт её исчезновения опросом родителя и тогда
 * перечитывает отчёт: свежая строка появляется на месте. Запись «идёт», пришедшая с самим отчётом
 * (страницу перезагрузили), тоже занята и дожидается итога.
 */
export function useGeoRecheck(job: Pick<Job, 'id' | 'result'>): GeoRecheck {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const notify = useNotify();
  const fromServer = useMemo(() => runningRechecks(job), [job]);
  const [watching, setWatching] = useState<ReadonlySet<string>>(() => fromServer);
  const starting = useRef(new Set<string>());
  // Итог дождались, а отчёт в списке ещё старый и несёт запись «идёт»: такие ключи не занимать
  // повторно, пока запись не пропадёт из самого отчёта.
  const settled = useRef(new Set<string>());

  useEffect(() => {
    for (const key of settled.current) {
      if (!fromServer.has(key)) settled.current.delete(key);
    }
    const fresh = [...fromServer].filter((key) => !settled.current.has(key));
    if (fresh.length > 0) setWatching((current) => union(current, fresh));
  }, [fromServer]);

  const start = useCallback(
    (row: GeoRow, sameExit: boolean) => {
      const key = recheckKey(row);
      if (starting.current.has(key) || watching.has(key)) return;
      starting.current.add(key);
      reachabilityApi
        .recheckGeo(job.id, {
          region: row.region,
          city: row.city,
          req_isp: row.req_isp ?? null,
          same_exit: sameExit,
        })
        .then(() => setWatching((current) => union(current, [key])))
        .catch((error: unknown) =>
          notify.error(getApiErrorMessage(error, t('admin.reachability.geo.recheck.failed'))),
        )
        .finally(() => starting.current.delete(key));
    },
    [job.id, watching, notify, t],
  );

  useEffect(() => {
    if (watching.size === 0) return undefined;
    let alive = true;
    const tick = async () => {
      try {
        const parent = await reachabilityApi.getJob(job.id);
        if (!alive) return;
        const entries = recheckEntries(parent);
        const finished = [...watching].filter((key) => entries.get(key)?.status !== 'running');
        if (finished.length === 0) return;
        for (const key of finished) {
          settled.current.add(key);
          const entry = entries.get(key);
          if (entry?.status === 'failed') {
            notify.error(entry.error || t('admin.reachability.geo.recheck.failed'));
          }
        }
        setWatching((current) => without(current, finished));
        queryClient.invalidateQueries({ queryKey: [REACHABILITY_JOB_KEY, job.id] });
        queryClient.invalidateQueries({ queryKey: [REACHABILITY_JOBS_KEY] });
        queryClient.invalidateQueries({ queryKey: REACHABILITY_STATUS_KEY });
      } catch {
        // сеть моргнула — следующий опрос через POLL_MS
      }
    };
    const timer = setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [watching, job.id, notify, queryClient, t]);

  const busy = new Set([...watching, ...starting.current]);
  return { busy, start };
}
