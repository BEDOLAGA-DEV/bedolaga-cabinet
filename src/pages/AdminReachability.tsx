import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import { AdminBackButton } from '../components/admin/AdminBackButton';
import { BalanceBadge } from '../components/admin/reachability/BalanceBadge';
import { FleetStatus } from '../components/admin/reachability/FleetStatus';
import { HostsHealthStrip } from '../components/admin/reachability/HostsHealthStrip';
import { Launcher } from '../components/admin/reachability/Launcher';
import { RecentJobs } from '../components/admin/reachability/RecentJobs';
import { parseReachabilityDeepLink } from '../components/admin/reachability/deepLink';
import { useReachabilityStatus } from '../components/admin/reachability/useReachabilityStatus';
import type { JobKind } from '@/api/reachability';
import { CellSignalIcon } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminReachability() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const link = useMemo(() => parseReachabilityDeepLink(searchParams), [searchParams]);
  const { data: status, isLoading } = useReachabilityStatus();
  const ready = Boolean(status?.enabled && status?.configured);

  const setKind = (kind: JobKind) => {
    const next = new URLSearchParams(searchParams);
    next.set('kind', kind);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="space-y-8 pb-28 lg:pb-0">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <AdminBackButton />
          <div className="rounded-xl bg-accent-500/20 p-3">
            <CellSignalIcon className="h-6 w-6 text-accent-400" />
          </div>
          <h1 className="text-xl font-bold text-dark-100">{t('admin.reachability.title')}</h1>
          <div className="ml-auto">
            {isLoading && <Skeleton className="h-10 w-32" />}
            {status && ready && <BalanceBadge status={status} />}
          </div>
        </div>
        {ready && <FleetStatus />}
        {status && !status.healthy && status.health_message && (
          <p className="text-sm text-error-400">{status.health_message}</p>
        )}
      </header>

      {status && !ready && (
        <div className="rounded-xl border border-warning-500/30 bg-warning-500/10 p-4 text-sm text-dark-100">
          <p className="font-medium">
            {t(`admin.reachability.status.${status.enabled ? 'notConfigured' : 'disabled'}`)}
          </p>
          <Link to="/admin/settings" className="mt-2 inline-block text-accent-400 hover:underline">
            {t('admin.reachability.status.openSettings')}
          </Link>
        </div>
      )}

      {ready && (
        <>
          <HostsHealthStrip />
          <Launcher status={status} link={link} onKindChange={setKind} />
          <RecentJobs initialJobId={link.jobId} />
        </>
      )}
    </div>
  );
}
