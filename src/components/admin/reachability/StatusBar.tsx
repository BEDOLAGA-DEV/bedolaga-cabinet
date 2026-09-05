import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { ReachabilityStatus } from '@/api/reachability';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatKopeks } from './money';

interface StatusBarProps {
  status: ReachabilityStatus | undefined;
  isLoading: boolean;
}

type Tone = 'default' | 'warning' | 'accent';

const TONE_CLASS: Record<Tone, string> = {
  default: 'text-dark-50',
  warning: 'text-warning-400',
  accent: 'text-accent-400',
};

function Stat({ label, value, tone = 'default' }: { label: string; value: string; tone?: Tone }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-dark-400">{label}</p>
      <p className={cn('mt-1 truncate text-sm font-semibold', TONE_CLASS[tone])}>{value}</p>
    </div>
  );
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
}

export function StatusBar({ status, isLoading }: StatusBarProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return <Skeleton variant="card" className="h-16 w-full rounded-2xl" />;
  }
  if (!status) return null;

  if (!status.enabled || !status.configured) {
    const key = status.enabled ? 'notConfigured' : 'disabled';
    return (
      <div className="rounded-2xl border border-warning-500/30 bg-warning-500/10 p-4 text-sm text-dark-100">
        <p className="font-medium">{t(`admin.reachability.status.${key}`)}</p>
        <Link to="/admin/settings" className="mt-2 inline-block text-accent-400 hover:underline">
          {t('admin.reachability.status.openSettings')}
        </Link>
      </div>
    );
  }

  const reference = status.reference;
  const referenceValue =
    reference?.error ??
    t('admin.reachability.status.referenceConfigs', { count: reference?.configs ?? 0 });
  const activity =
    status.active_jobs.length === 0
      ? t('admin.reachability.status.idle')
      : status.active_jobs.map((job) => t(`admin.reachability.kinds.${job.kind}`)).join(', ');

  return (
    <div className="grid gap-3 rounded-2xl border border-dark-700/60 bg-dark-800/60 p-4 sm:grid-cols-4">
      <Stat
        label={t('admin.reachability.status.balance')}
        value={formatKopeks(status.balance_kopeks)}
      />
      <Stat
        label={t('admin.reachability.status.tier')}
        value={status.tier ? `${status.tier} · ${formatDate(status.tier_expires_at)}` : '—'}
      />
      <Stat
        label={t('admin.reachability.status.reference')}
        value={referenceValue}
        tone={reference?.error ? 'warning' : 'default'}
      />
      <Stat
        label={t('admin.reachability.status.activity')}
        value={activity}
        tone={status.active_jobs.length ? 'accent' : 'default'}
      />
      {!status.healthy && (
        <p className="text-sm text-error-400 sm:col-span-4">{status.health_message}</p>
      )}
    </div>
  );
}
