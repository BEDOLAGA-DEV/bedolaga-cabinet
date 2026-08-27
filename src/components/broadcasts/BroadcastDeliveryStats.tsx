import { useTranslation } from 'react-i18next';
import { StatCard } from '@/components/stats';
import { BanIcon, SendIcon, UsersIcon, XCircleIcon } from '@/components/icons';
import { isBroadcastInFlight } from '../../utils/broadcastStatus';

const statusConfig: Record<string, { bg: string; text: string; labelKey: string }> = {
  queued: {
    bg: 'bg-warning-500/20',
    text: 'text-warning-400',
    labelKey: 'admin.broadcasts.status.queued',
  },
  in_progress: {
    bg: 'bg-accent-500/20',
    text: 'text-accent-400',
    labelKey: 'admin.broadcasts.status.inProgress',
  },
  completed: {
    bg: 'bg-success-500/20',
    text: 'text-success-400',
    labelKey: 'admin.broadcasts.status.completed',
  },
  partial: {
    bg: 'bg-warning-500/20',
    text: 'text-warning-400',
    labelKey: 'admin.broadcasts.status.partial',
  },
  failed: {
    bg: 'bg-error-500/20',
    text: 'text-error-400',
    labelKey: 'admin.broadcasts.status.failed',
  },
  cancelled: {
    bg: 'bg-dark-500/20',
    text: 'text-dark-400',
    labelKey: 'admin.broadcasts.status.cancelled',
  },
  cancelling: {
    bg: 'bg-warning-500/20',
    text: 'text-warning-400',
    labelKey: 'admin.broadcasts.status.cancelling',
  },
};

export function BroadcastStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const config = statusConfig[status] || statusConfig.queued;
  return (
    <span className={`rounded-full px-3 py-1 text-sm font-medium ${config.bg} ${config.text}`}>
      {t(config.labelKey)}
    </span>
  );
}

export interface BroadcastDeliveryStatsProps {
  status: string;
  progressPercent: number;
  totalCount: number;
  sentCount: number;
  blockedCount: number;
  failedCount: number;
}

/**
 * Прогресс доставки и счётчики: сколько ушло, сколько заблокировало бота, сколько
 * не доехало. Используется и на странице рассылки, и на отправке промопредложения.
 */
export function BroadcastDeliveryStats({
  status,
  progressPercent,
  totalCount,
  sentCount,
  blockedCount,
  failedCount,
}: BroadcastDeliveryStatsProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      {isBroadcastInFlight(status) && (
        <div className="rounded-xl border border-dark-700 bg-dark-800/50 p-4">
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-dark-400">{t('admin.broadcasts.progress')}</span>
            <span className="font-medium text-dark-100">{progressPercent.toFixed(1)}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-dark-700">
            <div
              className="h-full bg-gradient-to-r from-accent-500 to-accent-400 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label={t('admin.broadcasts.total')}
          value={totalCount}
          icon={<UsersIcon className="h-5 w-5" />}
          tone="neutral"
        />
        <StatCard
          label={t('admin.broadcasts.sent')}
          value={sentCount}
          icon={<SendIcon className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label={t('admin.broadcasts.blocked')}
          value={blockedCount}
          icon={<BanIcon className="h-5 w-5" />}
          tone="warning"
        />
        <StatCard
          label={t('admin.broadcasts.failed')}
          value={failedCount}
          icon={<XCircleIcon className="h-5 w-5" />}
          tone="error"
        />
      </div>
    </div>
  );
}

export default BroadcastDeliveryStats;
