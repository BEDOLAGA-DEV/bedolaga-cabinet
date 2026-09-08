import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import { RadarIcon } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminBackButton } from '../components/admin/AdminBackButton';
import { Launcher } from '../components/admin/reachability/Launcher';
import { ModeSwitch } from '../components/admin/reachability/ModeSwitch';
import { RecentJobs } from '../components/admin/reachability/RecentJobs';
import { SetupGuide } from '../components/admin/reachability/SetupGuide';
import { TierBadge } from '../components/admin/reachability/TierBadge';
import {
  type PageTab,
  REACHABILITY_SETTINGS_PATH,
  parseReachabilityDeepLink,
} from '../components/admin/reachability/deepLink';
import { FleetCheck } from '../components/admin/reachability/fleet/FleetCheck';
import { formatCredits } from '../components/admin/reachability/money';
import { useReachabilityStatus } from '../components/admin/reachability/useReachabilityStatus';

type ParamPatch = Record<string, string | null>;

/**
 * BSCHEKER одной страницей, как bsbord.com: вкладки «Хосты · IP / домен · Скан CIDR · VPN-тест ·
 * История», под ними цели, пробы, операторы по округам и «Запуск»; история — журнал во вкладке.
 */
export default function AdminReachability() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const link = useMemo(() => parseReachabilityDeepLink(searchParams), [searchParams]);
  const { data: status, isLoading } = useReachabilityStatus();
  const ready = Boolean(status?.enabled && status?.configured);

  const patchParams = (patch: ParamPatch) => {
    const next = new URLSearchParams(searchParams);
    for (const [name, value] of Object.entries(patch)) {
      if (value === null) next.delete(name);
      else next.set(name, value);
    }
    setSearchParams(next, { replace: true });
  };
  const setMode = (mode: PageTab) => patchParams({ kind: mode, server: null });
  const setRunning = (jobId: number | null) =>
    patchParams({ running: jobId === null ? null : String(jobId), repeat: null });

  return (
    <div className="space-y-6 pb-28 lg:pb-0">
      <header className="flex flex-wrap items-center gap-3">
        <AdminBackButton />
        <div
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-500/10 text-accent-400"
        >
          <RadarIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-dark-50">{t('admin.reachability.title')}</h1>
            {status?.tier && ready && <TierBadge tier={status.tier} />}
          </div>
          <p className="text-xs text-dark-400">{t('admin.reachability.subtitle')}</p>
        </div>
        <div className="ms-auto flex items-center gap-4">
          {isLoading && <Skeleton className="h-6 w-28" />}
          {status && ready && (
            <span className="text-sm font-semibold tabular-nums text-dark-100">
              {formatCredits(status.balance_kopeks)}
            </span>
          )}
        </div>
        {status && !status.healthy && status.health_message && (
          <p className="w-full text-sm text-error-400">
            {status.health_message} ·{' '}
            <Link to={REACHABILITY_SETTINGS_PATH} className="text-accent-400 hover:underline">
              {t('admin.reachability.setup.openSettings')}
            </Link>
          </p>
        )}
      </header>

      {status && !ready && <SetupGuide status={status} />}
      {ready && <ModeSwitch value={link.mode} onChange={setMode} />}
      {ready && link.mode === 'hosts' && (
        <FleetCheck status={status} link={link} patchParams={patchParams} />
      )}
      {ready && link.mode === 'history' && (
        <RecentJobs
          initialJobId={link.jobId}
          targetKey={link.serverKey}
          onClearTarget={() => patchParams({ server: null })}
        />
      )}
      {ready && link.mode !== 'hosts' && link.mode !== 'history' && (
        <Launcher
          status={status}
          link={link}
          runningJobId={link.runningJobId}
          onRunning={setRunning}
        />
      )}
    </div>
  );
}
