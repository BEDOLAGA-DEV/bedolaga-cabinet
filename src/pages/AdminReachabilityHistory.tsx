import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { AdminBackButton } from '../components/admin/AdminBackButton';
import { RecentJobs } from '../components/admin/reachability/RecentJobs';
import {
  REACHABILITY_PATH,
  parseReachabilityDeepLink,
} from '../components/admin/reachability/deepLink';

/** Журнал всех проверок BSCHEKER: отдельный экран, чтобы состояние флота оставалось коротким. */
export default function AdminReachabilityHistory() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const link = useMemo(() => parseReachabilityDeepLink(searchParams), [searchParams]);
  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <AdminBackButton to={REACHABILITY_PATH} />
        <div>
          <h1 className="text-xl font-bold text-dark-100">
            {t('admin.reachability.fleet.history')}
          </h1>
          <p className="text-xs text-dark-400">{t('admin.reachability.title')}</p>
        </div>
      </header>
      <RecentJobs initialJobId={link.jobId} />
    </div>
  );
}
