import { useTranslation } from 'react-i18next';
import type { PanelSyncStatusResponse } from '@/api/adminUsers';
import { relativeLabel } from '@/components/admin/users';
import { RemnawaveIcon } from '@/components/icons';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/utils';
import { useNativeDialog } from '@/platform/hooks/useNativeDialog';
import { formatShortDate } from '@/utils/format';
import { formatGb } from '@/utils/formatNumber';
import { relativeTimeParts } from '@/utils/relativeTime';
import {
  type SyncRowKey,
  isBotStatusLive,
  isPanelStatusLive,
  panelSyncRows,
} from './panelSyncRows';
import { Section } from './sectionParts';

interface PanelSyncCardProps {
  status: PanelSyncStatusResponse | null;
  /** Сверка обновляется сама (открытие вкладки, возврат в окно, после действий). */
  loading: boolean;
  busy: boolean;
  onPull: () => Promise<boolean>;
  onPush: () => Promise<boolean>;
}

type Tone = 'success' | 'warning' | 'neutral';

const TONE: Record<Tone, string> = {
  success: 'bg-success-500/15 text-success-400',
  warning: 'bg-warning-500/15 text-warning-400',
  neutral: 'bg-dark-800 text-dark-400',
};

/**
 * Блок «Панель Remnawave» во вкладке «Подписка»: что в боте и что в панели — таблицей,
 * всегда, отличия подсвечены строкой. Направлений ровно два: из панели в бота и из
 * бота в панель; обе кнопки спрашивают подтверждение. Отдельной «Сверить сейчас» нет —
 * сверка обновляется сама.
 */
export function PanelSyncCard({ status, loading, busy, onPull, onPush }: PanelSyncCardProps) {
  const { t } = useTranslation();
  const dialog = useNativeDialog();
  const ns = 'admin.users.detail.panel';
  const gb = (value: number) => `${formatGb(value)} ${t('common.units.gb')}`;
  const limitGb = (value: number) => (value > 0 ? gb(value) : t('admin.users.unlimited'));

  const notLinked = status !== null && !status.panel_found;
  const differs = Boolean(status?.panel_found && status.has_differences);
  const tone: Tone = !status ? 'neutral' : notLinked || differs ? 'warning' : 'success';
  const label = !status
    ? t(`${ns}.unknown`)
    : notLinked
      ? t(`${ns}.notLinked`)
      : differs
        ? t(`${ns}.differs`)
        : t(`${ns}.matches`);

  const pull = async () => {
    if (await dialog.confirm(t(`${ns}.confirmPull`), t(`${ns}.pullTitle`))) await onPull();
  };
  const push = async () => {
    if (await dialog.confirm(t(`${ns}.confirmPush`), t(`${ns}.pushTitle`))) await onPush();
  };

  const liveWord = (live: boolean) => t(live ? `${ns}.live` : `${ns}.notLive`);
  const cells: Record<SyncRowKey, (s: PanelSyncStatusResponse) => [string, string]> = {
    status: (s) => [
      liveWord(isBotStatusLive(s.bot_subscription_status)),
      liveWord(isPanelStatusLive(s.panel_status)),
    ],
    until: (s) => [
      formatShortDate(s.bot_subscription_end_date),
      formatShortDate(s.panel_expire_at),
    ],
    trafficLimit: (s) => [limitGb(s.bot_traffic_limit_gb), limitGb(s.panel_traffic_limit_gb)],
    trafficUsed: (s) => [gb(s.bot_traffic_used_gb), gb(s.panel_traffic_used_gb)],
    devices: (s) => [String(s.bot_device_limit), String(s.panel_device_limit)],
    squads: (s) => [String(s.bot_squads?.length ?? 0), String(s.panel_squads?.length ?? 0)],
  };

  return (
    <Section
      icon={<RemnawaveIcon className="h-5 w-5" />}
      title={t(`${ns}.title`)}
      action={
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold',
            TONE[tone],
          )}
        >
          {loading && <Spinner className="h-3 w-3" />}
          {label}
        </span>
      }
    >
      {status?.panel_found && (
        <div className="overflow-x-auto rounded-xl bg-dark-800/40">
          <table className="w-full whitespace-nowrap text-left text-[13px] sm:text-sm">
            <thead>
              <tr className="text-xs text-dark-500">
                <th scope="col" className="w-2/5 px-2.5 py-2.5 font-medium sm:px-3">
                  <span className="sr-only">{t(`${ns}.title`)}</span>
                </th>
                <th scope="col" className="px-2.5 py-2.5 font-medium sm:px-3">
                  {t('admin.users.detail.sync.bot')}
                </th>
                <th scope="col" className="px-2.5 py-2.5 font-medium sm:px-3">
                  {t('admin.users.detail.sync.panel')}
                </th>
              </tr>
            </thead>
            <tbody>
              {panelSyncRows(status).map((row) => {
                const [bot, panel] = cells[row.key](status);
                return (
                  <tr
                    key={row.key}
                    className={cn(
                      'border-t border-dark-700/40',
                      row.differs && 'bg-warning-500/[0.06]',
                    )}
                  >
                    <th scope="row" className="px-2.5 py-2 font-normal text-dark-400 sm:px-3">
                      <span className="inline-flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className={cn(
                            'h-1.5 w-1.5 shrink-0 rounded-full',
                            row.differs ? 'bg-warning-400' : 'bg-transparent',
                          )}
                        />
                        {t(`${ns}.rows.${row.key}`)}
                      </span>
                    </th>
                    <td className="px-2.5 py-2 tabular-nums text-dark-100 sm:px-3">{bot}</td>
                    <td
                      className={cn(
                        'px-2.5 py-2 tabular-nums sm:px-3',
                        row.differs ? 'font-medium text-warning-400' : 'text-dark-100',
                      )}
                    >
                      {panel}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {status?.last_sync && (
        <p className="text-xs text-dark-500">
          {t(`${ns}.checked`)}: {relativeLabel(relativeTimeParts(status.last_sync), t)}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {/* Два направления, других нет. При отличиях главная — «из панели в бота»: панель — истина. */}
        {status?.panel_found && (
          <button
            type="button"
            onClick={pull}
            disabled={busy}
            className={differs ? 'btn-primary' : 'btn-secondary'}
          >
            {t(`${ns}.pull`)}
          </button>
        )}
        <button type="button" onClick={push} disabled={busy} className="btn-secondary">
          {t(`${ns}.pushManual`)}
        </button>
      </div>
    </Section>
  );
}
