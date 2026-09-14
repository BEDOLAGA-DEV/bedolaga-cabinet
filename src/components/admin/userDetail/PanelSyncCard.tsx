import { useTranslation } from 'react-i18next';
import type { PanelSyncStatusResponse } from '@/api/adminUsers';
import { relativeLabel } from '@/components/admin/users';
import { RefreshIcon, RemnawaveIcon } from '@/components/icons';
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
import { KeyValues, Section } from './sectionParts';

interface PanelSyncCardProps {
  status: PanelSyncStatusResponse | null;
  loading: boolean;
  busy: boolean;
  onCheck: () => void;
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
 * Блок «Панель Remnawave» во вкладке «Подписка». Панель — источник истины:
 * бот сам забирает её изменения, поэтому «Забрать из панели» появляется только
 * при отличиях, а ручная отправка — редкая и спрашивает подтверждение.
 */
export function PanelSyncCard({
  status,
  loading,
  busy,
  onCheck,
  onPull,
  onPush,
}: PanelSyncCardProps) {
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
        <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', TONE[tone])}>
          {label}
        </span>
      }
    >
      <KeyValues
        rows={[
          {
            key: 'checked',
            label: t(`${ns}.checked`),
            value: relativeLabel(relativeTimeParts(status?.last_sync ?? null), t),
          },
        ]}
      />

      {differs && status && (
        <div className="overflow-x-auto rounded-xl border border-warning-500/25">
          <table className="w-full min-w-[20rem] text-left text-sm">
            <thead>
              <tr className="text-xs text-dark-500">
                <th className="px-3 py-2 font-medium" />
                <th className="px-3 py-2 font-medium">{t('admin.users.detail.sync.bot')}</th>
                <th className="px-3 py-2 font-medium">{t('admin.users.detail.sync.panel')}</th>
              </tr>
            </thead>
            <tbody>
              {panelSyncRows(status).map((row) => {
                const [bot, panel] = cells[row.key](status);
                return (
                  <tr key={row.key} className="border-t border-dark-800">
                    <td className="px-3 py-1.5 text-dark-500">{t(`${ns}.rows.${row.key}`)}</td>
                    <td className="px-3 py-1.5 tabular-nums text-dark-200">{bot}</td>
                    <td
                      className={cn(
                        'px-3 py-1.5 tabular-nums',
                        row.differs ? 'font-medium text-warning-400' : 'text-dark-200',
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

      <div className="flex flex-wrap gap-2">
        {differs && (
          <button type="button" onClick={pull} disabled={busy} className="btn-primary">
            {t(`${ns}.pull`)}
          </button>
        )}
        <button type="button" onClick={onCheck} disabled={loading} className="btn-secondary">
          <RefreshIcon className={cn('h-4 w-4', loading && 'animate-spin')} />
          {t(`${ns}.checkNow`)}
        </button>
        <button type="button" onClick={push} disabled={busy} className="btn-secondary">
          {t(`${ns}.pushManual`)}
        </button>
      </div>
    </Section>
  );
}
