import type { Job } from '@/api/reachability';
import type { GeoRow } from './geoRowsView';

/**
 * Перепроверка проваленного города из отчёта GEO — логика ровно как у оригинала bsbord.com:
 * у зелёных строк кнопок нет; у остальных — «Тот же IP» и «Сменить IP»; пока идёт —
 * «Идёт проверка…»; строка, по которой уже перепроверяли, — «Перепроверено».
 * Вид кнопок — канон кабинета (RecheckButtons), не оригинала.
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
  /** Иконка из общего набора кабинета: повтор — стрелки по кругу, смена выхода — перемешать. */
  icon: 'refresh' | 'shuffle';
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
      icon: 'refresh',
    },
    { sameExit: false, label: t(`${base}.newIp`), title: t(`${base}.newIpTitle`), icon: 'shuffle' },
  ];
}

/** Запись повтора в отчёте родителя: бот держит «идёт», пока прогон у сервиса не кончился. */
export interface GeoRecheckEntry {
  status: 'running' | 'failed';
  /** Причина словами, если повтор не удался; кнопки у строки при этом возвращаются. */
  error?: string;
}

/** Записи `result.rechecks` — ключ «регион|город|провайдер», как у recheckKey; мусор пропускается. */
export function recheckEntries(job: Pick<Job, 'result'>): Map<string, GeoRecheckEntry> {
  const entries = new Map<string, GeoRecheckEntry>();
  const raw = job.result?.rechecks;
  if (!raw || typeof raw !== 'object') return entries;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') continue;
    const entry = value as Record<string, unknown>;
    if (entry.status !== 'running' && entry.status !== 'failed') continue;
    entries.set(key, {
      status: entry.status,
      ...(typeof entry.error === 'string' ? { error: entry.error } : {}),
    });
  }
  return entries;
}

/** Города, по которым повтор идёт прямо сейчас по данным самого отчёта. */
export function runningRechecks(job: Pick<Job, 'result'>): ReadonlySet<string> {
  const running = new Set<string>();
  for (const [key, entry] of recheckEntries(job)) {
    if (entry.status === 'running') running.add(key);
  }
  return running;
}
