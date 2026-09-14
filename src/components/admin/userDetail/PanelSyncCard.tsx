import { useTranslation } from 'react-i18next';
import type { PanelSyncStatusResponse } from '@/api/adminUsers';
import { Card } from '@/components/data-display';
import { RefreshIcon, RemnawaveIcon } from '@/components/icons';
import { cn } from '@/lib/utils';
import { useNativeDialog } from '@/platform/hooks/useNativeDialog';
import { relativeTimeParts } from '@/utils/relativeTime';

interface PanelSyncCardProps {
  status: PanelSyncStatusResponse | null;
  loading: boolean;
  remnawaveId: number | null;
  disabled: boolean;
  locale: string;
  onRefresh: () => void;
  onPull: () => Promise<void>;
  onPush: () => Promise<void>;
}

/**
 * Блок «Панель Remnawave» внутри вкладки «Подписка» — вместо отдельной вкладки.
 * Панель — источник истины: бот сам забирает её изменения; ручные кнопки нужны
 * редко и потому спрашивают подтверждение.
 */
export function PanelSyncCard({
  status,
  loading,
  remnawaveId,
  disabled,
  locale,
  onRefresh,
  onPull,
  onPush,
}: PanelSyncCardProps) {
  const { t } = useTranslation();
  const dialog = useNativeDialog();
  const ns = 'admin.users.detail.panel';

  const tone = !status
    ? 'neutral'
    : !status.panel_found
      ? 'warning'
      : status.has_differences
        ? 'warning'
        : 'success';
  const label = !status
    ? t(`${ns}.unknown`)
    : !status.panel_found
      ? t('admin.users.detail.sync.notLinked')
      : status.has_differences
        ? t(`${ns}.differs`)
        : t(`${ns}.matches`);
  const checked = relativeTimeParts(status?.last_sync ?? null);

  const pull = async () => {
    if (await dialog.confirm(t(`${ns}.confirmPull`), t(`${ns}.pull`))) await onPull();
  };
  const push = async () => {
    if (await dialog.confirm(t(`${ns}.confirmPush`), t(`${ns}.pushManual`))) await onPush();
  };

  const rows: { label: string; bot: string; panel: string }[] = status
    ? [
        {
          label: t('admin.users.detail.sync.statusLabel'),
          bot: status.bot_subscription_status ?? '—',
          panel: status.panel_status ?? '—',
        },
        {
          label: t('admin.users.detail.sync.until'),
          bot: status.bot_subscription_end_date
            ? new Date(status.bot_subscription_end_date).toLocaleDateString(locale)
            : '—',
          panel: status.panel_expire_at
            ? new Date(status.panel_expire_at).toLocaleDateString(locale)
            : '—',
        },
        {
          label: t('admin.users.detail.sync.traffic'),
          bot: `${status.bot_traffic_used_gb.toFixed(1)} / ${status.bot_traffic_limit_gb} ${t('common.units.gb')}`,
          panel: `${status.panel_traffic_used_gb.toFixed(1)} / ${status.panel_traffic_limit_gb} ${t('common.units.gb')}`,
        },
        {
          label: t('admin.users.detail.sync.devices'),
          bot: String(status.bot_device_limit),
          panel: String(status.panel_device_limit),
        },
        {
          label: t('admin.users.detail.sync.squads'),
          bot: String(status.bot_squads?.length ?? 0),
          panel: String(status.panel_squads?.length ?? 0),
        },
      ]
    : [];

  return (
    <Card size="md" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <RemnawaveIcon className="h-5 w-5 text-accent-400" />
        <h2 className="min-w-[10rem] flex-1 text-lg font-semibold text-dark-100">
          {t(`${ns}.title`)}
        </h2>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[11px] font-semibold',
            tone === 'success' && 'bg-success-500/15 text-success-400',
            tone === 'warning' && 'bg-warning-500/15 text-warning-400',
            tone === 'neutral' && 'bg-dark-800 text-dark-400',
          )}
        >
          {label}
        </span>
      </div>

      <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        <dt className="text-dark-500">{t(`${ns}.checked`)}</dt>
        <dd className="m-0 text-dark-100">
          {checked.key === 'never'
            ? t('common.relative.never')
            : checked.key === 'now'
              ? t('common.relative.now')
              : t(`common.relative.${checked.key}`, { count: checked.count })}
          <span className="text-dark-500"> · {t(`${ns}.truth`)}</span>
        </dd>
        <dt className="text-dark-500">Remnawave ID</dt>
        <dd className="m-0 font-mono text-dark-100">
          {status?.remnawave_id ?? remnawaveId ?? t('admin.users.detail.sync.notLinked')}
        </dd>
      </dl>

      {status?.has_differences && (
        <div className="overflow-x-auto rounded-xl border border-warning-500/25 bg-warning-500/5">
          <table className="w-full min-w-[360px] text-left text-sm">
            <thead>
              <tr className="text-xs text-dark-500">
                <th className="px-3 py-2 font-medium" />
                <th className="px-3 py-2 font-medium">{t('admin.users.detail.sync.bot')}</th>
                <th className="px-3 py-2 font-medium">{t('admin.users.detail.sync.panel')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-t border-dark-800">
                  <td className="px-3 py-1.5 text-dark-500">{row.label}</td>
                  <td className="px-3 py-1.5 tabular-nums text-dark-200">{row.bot}</td>
                  <td
                    className={cn(
                      'px-3 py-1.5 tabular-nums',
                      row.bot !== row.panel ? 'text-warning-400' : 'text-dark-200',
                    )}
                  >
                    {row.panel}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {status.differences.length > 0 && (
            <ul className="m-0 list-none border-t border-dark-800 px-3 py-2 text-xs text-dark-400">
              {status.differences.map((difference) => (
                <li key={difference}>• {difference}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onRefresh} disabled={loading} className="btn-secondary">
          <RefreshIcon className={cn('h-4 w-4', loading && 'animate-spin')} />
          {t(`${ns}.checkNow`)}
        </button>
        <button type="button" onClick={pull} disabled={disabled} className="btn-ghost">
          {t(`${ns}.pull`)}
        </button>
        <button type="button" onClick={push} disabled={disabled} className="btn-ghost">
          {t(`${ns}.pushManual`)}
        </button>
      </div>
    </Card>
  );
}
