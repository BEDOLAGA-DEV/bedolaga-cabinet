import type { PanelSyncStatusResponse } from '@/api/adminUsers';

/**
 * Строки сверки «бот ↔ панель» с тем же допуском, что у бота
 * (`admin_users.get_sync_status`): иначе таблица подсвечивала бы то, что бот
 * отличием не считает, — например, «active» против «ACTIVE».
 */

export type SyncRowKey = 'status' | 'until' | 'trafficLimit' | 'trafficUsed' | 'devices' | 'squads';

export interface SyncRow {
  key: SyncRowKey;
  differs: boolean;
  /** Значение в панели поставил временный доступ — так и задумано, это не расхождение. */
  byGrace: boolean;
}

const HOUR_MS = 3_600_000;
/** Сдвиг МСК, который бот прощает как «часовой пояс, а не расхождение». */
const MSK_OFFSET_MS = 3 * HOUR_MS;
const MSK_TOLERANCE_MS = 5 * 60_000;
const TRAFFIC_LIMIT_TOLERANCE_GB = 1;
const TRAFFIC_USED_TOLERANCE_GB = 0.5;

const BOT_LIVE = new Set(['active', 'trial']);

export function isBotStatusLive(status: string | null): boolean {
  return status !== null && BOT_LIVE.has(status);
}

export function isPanelStatusLive(status: string | null): boolean {
  return status?.toUpperCase() === 'ACTIVE';
}

function datesDiffer(bot: string | null, panel: string | null): boolean {
  if (!bot || !panel) return false;
  const diff = Math.abs(new Date(bot).getTime() - new Date(panel).getTime());
  const timezoneShift = Math.abs(diff - MSK_OFFSET_MS) < MSK_TOLERANCE_MS;
  return diff > HOUR_MS && !timezoneShift;
}

function setsDiffer(a: string[] | null | undefined, b: string[] | null | undefined): boolean {
  const left = new Set(a ?? []);
  const right = new Set(b ?? []);
  if (left.size !== right.size) return true;
  for (const value of left) if (!right.has(value)) return true;
  return false;
}

/**
 * Строки, которые во время временного доступа держит сам грейс.
 *
 * Пока он открыт, в панели стоит его оверлей — дата, статус, лимит и сквад.
 * Бот их намеренно не перенимает (`app/services/panel_sync/projection.py`),
 * поэтому расхождением это не является. Расход трафика панель ведёт и в грейсе,
 * его сверяем по-прежнему.
 */
const GRACE_OWNED: ReadonlySet<SyncRowKey> = new Set(['status', 'until', 'trafficLimit', 'squads']);

export function panelSyncRows(status: PanelSyncStatusResponse): SyncRow[] {
  const statusDiffers =
    status.bot_subscription_status !== null &&
    status.panel_status !== null &&
    isBotStatusLive(status.bot_subscription_status) !== isPanelStatusLive(status.panel_status);
  const rows: Omit<SyncRow, 'byGrace'>[] = [
    { key: 'status', differs: statusDiffers },
    {
      key: 'until',
      differs: datesDiffer(status.bot_subscription_end_date, status.panel_expire_at),
    },
    {
      key: 'trafficLimit',
      differs:
        Math.abs(status.bot_traffic_limit_gb - status.panel_traffic_limit_gb) >
        TRAFFIC_LIMIT_TOLERANCE_GB,
    },
    {
      key: 'trafficUsed',
      differs:
        Math.abs(status.bot_traffic_used_gb - status.panel_traffic_used_gb) >
        TRAFFIC_USED_TOLERANCE_GB,
    },
    { key: 'devices', differs: status.bot_device_limit !== status.panel_device_limit },
    { key: 'squads', differs: setsDiffer(status.bot_squads, status.panel_squads) },
  ];
  const grace = Boolean(status.grace_open);
  return rows.map((row) => {
    const byGrace = grace && row.differs && GRACE_OWNED.has(row.key);
    return { ...row, byGrace, differs: row.differs && !byGrace };
  });
}
