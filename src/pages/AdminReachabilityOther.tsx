import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { AdminBackButton } from '../components/admin/AdminBackButton';
import { Launcher } from '../components/admin/reachability/Launcher';
import {
  type LaunchMode,
  MODE_KEYS,
  OTHER_MODES,
  REACHABILITY_PATH,
  parseReachabilityDeepLink,
} from '../components/admin/reachability/deepLink';
import { useReachabilityStatus } from '../components/admin/reachability/useReachabilityStatus';

/**
 * «Проверить адрес или подписку»: прежний запуск одиночной проверки без вкладки хостов,
 * они живут на экране флота. «Повторить» из журнала для проверки хостов открывает все вкладки.
 */
export default function AdminReachabilityOther() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const parsed = useMemo(() => parseReachabilityDeepLink(searchParams), [searchParams]);
  const modes = parsed.repeatJobId !== null ? MODE_KEYS : OTHER_MODES;
  const link = useMemo(
    () => (modes.includes(parsed.mode) ? parsed : { ...parsed, mode: modes[0] }),
    [parsed, modes],
  );
  const { data: status } = useReachabilityStatus();

  const setMode = (mode: LaunchMode) => {
    const next = new URLSearchParams(searchParams);
    next.set('kind', mode);
    setSearchParams(next, { replace: true });
  };
  const setRunning = (jobId: number | null) => {
    const next = new URLSearchParams(searchParams);
    if (jobId === null) next.delete('running');
    else next.set('running', String(jobId));
    next.delete('repeat');
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="space-y-6 pb-28 lg:pb-0">
      <header className="flex items-center gap-3">
        <AdminBackButton to={REACHABILITY_PATH} />
        <div>
          <h1 className="text-xl font-bold text-dark-100">{t('admin.reachability.fleet.other')}</h1>
          <p className="text-xs text-dark-400">{t('admin.reachability.title')}</p>
        </div>
      </header>
      <Launcher
        status={status}
        link={link}
        onModeChange={setMode}
        runningJobId={link.runningJobId}
        onRunning={setRunning}
        modes={modes}
      />
    </div>
  );
}
