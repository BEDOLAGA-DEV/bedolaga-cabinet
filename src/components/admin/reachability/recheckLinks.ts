import type { Job } from '@/api/reachability';
import { buildReachabilityLink } from './deepLink';
import type { GeoRow } from './geoRowsView';
import { canRepeat } from './repeatFromJob';

/**
 * Перепроверка города из отчёта GEO — как у оригинала bsbord.com: «ещё раз» (выход выберется
 * заново) и «тот же IP» (повтор через тот же выход, пока сервис его держит). Ссылка ведёт на
 * вкладку GEO с теми же целями и охватом из одного города; выбор сети, метода и ядра — из задачи.
 */

export function canRecheck(job: Pick<Job, 'kind' | 'status' | 'targets'>): boolean {
  return (
    job.kind === 'geo' && (job.status === 'done' || job.status === 'cancelled') && canRepeat(job)
  );
}

export function recheckLink(
  job: Pick<Job, 'id' | 'kind' | 'status' | 'targets'>,
  row: Pick<GeoRow, 'region' | 'city' | 'req_isp' | 'sid' | 'exit_ip'>,
  sameExit = false,
): string | null {
  if (!canRecheck(job)) return null;
  if (sameExit && !row.sid) return null;
  return buildReachabilityLink({
    mode: 'geo',
    repeatJobId: job.id,
    geoCity: row.req_isp
      ? { region: row.region, city: row.city, isp: row.req_isp }
      : { region: row.region, city: row.city },
    geoSession: sameExit && row.sid ? { sid: row.sid, exitIp: row.exit_ip ?? '' } : null,
  });
}
