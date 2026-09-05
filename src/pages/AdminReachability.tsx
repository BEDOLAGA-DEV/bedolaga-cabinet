import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { AdminBackButton } from '../components/admin/AdminBackButton';
import { JobsHistory } from '../components/admin/reachability/JobsHistory';
import { ProbeTab } from '../components/admin/reachability/ProbeTab';
import { ScanTab } from '../components/admin/reachability/ScanTab';
import { StatusBar } from '../components/admin/reachability/StatusBar';
import { SummaryTab } from '../components/admin/reachability/SummaryTab';
import { VlessTab } from '../components/admin/reachability/VlessTab';
import {
  TAB_KEYS,
  type TabKey,
  parseReachabilityDeepLink,
} from '../components/admin/reachability/deepLink';
import { useReachabilityStatus } from '../components/admin/reachability/useReachabilityStatus';
import { CellSignalIcon } from '@/components/icons';
import { cn } from '@/lib/utils';

export default function AdminReachability() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const link = useMemo(() => parseReachabilityDeepLink(searchParams), [searchParams]);
  const { data: status, isLoading } = useReachabilityStatus();

  const setTab = (tab: TabKey) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <AdminBackButton />
        <div className="rounded-xl bg-accent-500/20 p-3">
          <CellSignalIcon className="h-6 w-6 text-accent-400" />
        </div>
        <h1 className="text-xl font-bold text-dark-100">{t('admin.reachability.title')}</h1>
      </div>

      <StatusBar status={status} isLoading={isLoading} />

      <div className="flex gap-1 overflow-x-auto rounded-2xl bg-dark-800/60 p-1" role="tablist">
        {TAB_KEYS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={link.tab === tab}
            onClick={() => setTab(tab)}
            className={cn(
              'whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-colors',
              link.tab === tab
                ? 'bg-accent-500 text-on-accent'
                : 'text-dark-300 hover:bg-dark-700 hover:text-dark-100',
            )}
          >
            {t(`admin.reachability.tabs.${tab}`)}
          </button>
        ))}
      </div>

      {link.tab === 'summary' && <SummaryTab status={status} />}
      {link.tab === 'probe' && <ProbeTab status={status} preselected={link.targets} />}
      {link.tab === 'vless' && (
        <VlessTab status={status} userId={link.userId} shortUuid={link.shortUuid} />
      )}
      {link.tab === 'scan' && <ScanTab status={status} />}
      {link.tab === 'history' && <JobsHistory />}
    </div>
  );
}
