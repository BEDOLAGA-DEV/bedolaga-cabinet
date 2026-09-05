import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { ReachabilityStatus } from '@/api/reachability';
import { StatCard } from '@/components/stats';
import { formatShortDate } from '@/utils/format';
import { formatKopeks } from './money';

interface StatusBarProps {
  status: ReachabilityStatus | undefined;
  isLoading: boolean;
}

const CARDS = 4;

export function StatusBar({ status, isLoading }: StatusBarProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: CARDS }, (_, index) => (
          <StatCard key={index} loading />
        ))}
      </div>
    );
  }
  if (!status) return null;

  if (!status.enabled || !status.configured) {
    const key = status.enabled ? 'notConfigured' : 'disabled';
    return (
      <div className="rounded-xl border border-warning-500/30 bg-warning-500/10 p-4 text-sm text-dark-100">
        <p className="font-medium">{t(`admin.reachability.status.${key}`)}</p>
        <Link to="/admin/settings" className="mt-2 inline-block text-accent-400 hover:underline">
          {t('admin.reachability.status.openSettings')}
        </Link>
      </div>
    );
  }

  const reference = status.reference;
  const active = status.active_jobs.length > 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={t('admin.reachability.status.balance')}
          value={formatKopeks(status.balance_kopeks)}
        />
        <StatCard
          label={t('admin.reachability.status.tier')}
          value={status.tier ?? '—'}
          subValue={status.tier_expires_at ? formatShortDate(status.tier_expires_at) : undefined}
        />
        <StatCard
          label={t('admin.reachability.status.reference')}
          value={
            reference?.error
              ? '—'
              : t('admin.reachability.status.referenceConfigs', { count: reference?.configs ?? 0 })
          }
          subValue={reference?.error ?? undefined}
          tone={reference?.error ? 'warning' : 'neutral'}
        />
        <StatCard
          label={t('admin.reachability.status.activity')}
          value={
            active
              ? status.active_jobs
                  .map((job) => t(`admin.reachability.kinds.${job.kind}`))
                  .join(', ')
              : t('admin.reachability.status.idle')
          }
          tone={active ? 'accent' : 'neutral'}
        />
      </div>
      {!status.healthy && <p className="text-sm text-error-400">{status.health_message}</p>}
    </div>
  );
}
