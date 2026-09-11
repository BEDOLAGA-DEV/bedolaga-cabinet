import type { Job } from '@/api/reachability';
import type { GeoRow } from './geoRowsView';

/**
 * Перепроверка проваленного города из отчёта GEO — ровно как у оригинала bsbord.com:
 * у зелёных строк кнопок нет; у остальных — «🔄 тот же IP» и «🔀 сменить IP»; пока идёт —
 * «⏳ идёт проверка…»; строка, по которой уже перепроверяли, — «⤴ перепроверено».
 */

export type RecheckState = 'none' | 'buttons' | 'busy' | 'rechecked';

/** Ключ города × заказанный провайдер: по нему оригинал не даёт закликать один город дважды. */
export const recheckKey = (row: Pick<GeoRow, 'region' | 'city' | 'req_isp'>): string =>
  `${row.region}|${row.city}|${row.req_isp ?? ''}`;

export function canRecheckJob(job: Pick<Job, 'kind' | 'status'>): boolean {
  return job.kind === 'geo' && (job.status === 'done' || job.status === 'cancelled');
}

export function recheckState(
  job: Pick<Job, 'kind' | 'status'>,
  row: Pick<GeoRow, 'verdict' | 'rechecked' | 'region' | 'city' | 'req_isp'>,
  busy: ReadonlySet<string>,
): RecheckState {
  if (!canRecheckJob(job)) return 'none';
  if (busy.has(recheckKey(row))) return 'busy';
  if (row.rechecked) return 'rechecked';
  return row.verdict === 'ok' ? 'none' : 'buttons';
}

/** Сколько секунд сервис ещё держит выход строки: удержание считается от конца прогона. */
export function holdLeftSeconds(
  job: Pick<Job, 'finished_at'>,
  row: Pick<GeoRow, 'sid_hold_s'>,
  now = Date.now(),
): number | null {
  if (typeof row.sid_hold_s !== 'number' || !job.finished_at) return null;
  const elapsed = Math.max(0, (now - new Date(job.finished_at).getTime()) / 1000);
  return Math.max(0, Math.round(row.sid_hold_s - elapsed));
}

type Translate = (key: string, options?: Record<string, unknown>) => string;

export interface RecheckButton {
  sameExit: boolean;
  label: string;
  title: string;
}

/** Две кнопки строки с подписями оригинала: «тот же IP» (с « ?», если удержание истекло) и «сменить IP». */
export function recheckButtons(
  job: Pick<Job, 'finished_at'>,
  row: Pick<GeoRow, 'sid' | 'sid_hold_s' | 'exit_ip'>,
  t: Translate,
  now = Date.now(),
): RecheckButton[] {
  const base = 'admin.reachability.geo.recheck';
  const ip = row.exit_ip ?? '';
  const hold = holdLeftSeconds(job, row, now);
  const fresh = hold !== null && hold > 0;
  const sameTitle = !row.sid
    ? t(`${base}.sameIpNoSid`)
    : fresh
      ? t(`${base}.sameIpHold`, { ip, seconds: hold })
      : t(`${base}.sameIpExpired`, { ip });
  return [
    {
      sameExit: true,
      label: `${t(`${base}.sameIp`)}${row.sid && !fresh ? ' ?' : ''}`,
      title: sameTitle,
    },
    { sameExit: false, label: t(`${base}.newIp`), title: t(`${base}.newIpTitle`) },
  ];
}
