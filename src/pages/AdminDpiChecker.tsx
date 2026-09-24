import type { DpiStatus } from '@/api/dpichecker';
import { type ComponentType, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import {
  BookOpenIcon,
  GlobeIcon,
  HistoryIcon,
  NetworkIcon,
  PulseIcon,
  ScanIcon,
  SendIcon,
  ShieldIcon,
  WallIcon,
} from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { usePermissionStore } from '@/store/permissions';
import { AdminBackButton } from '../components/admin/AdminBackButton';
import { IconTabs } from '../components/admin/IconTabs';
import { CheckForm } from '../components/admin/dpichecker/CheckForm';
import { CheckResult } from '../components/admin/dpichecker/CheckResult';
import { CheremshaTab } from '../components/admin/dpichecker/CheremshaTab';
import { HistoryTab } from '../components/admin/dpichecker/HistoryTab';
import { MonitorsTab } from '../components/admin/dpichecker/MonitorsTab';
import { NoisyTab, ProbeTab, ScanResult } from '../components/admin/dpichecker/ScanTabs';
import { type DpiLink, readLink, TABS, type Tab } from '../components/admin/dpichecker/deepLink';
import type { PanelKind } from '../components/admin/dpichecker/TargetsStep';
import { SetupCard } from '../components/admin/dpichecker/SetupCard';
import { useDpiStatus } from '../components/admin/dpichecker/useDpiStatus';

/** Оригинальное название сервиса — не переводится. */
export const DPI_BRAND = 'DPI//CHECKER';

const TAB_ICONS: Record<Tab, ComponentType<{ className?: string }>> = {
  vpn: ShieldIcon,
  ip: GlobeIcon,
  mtproto: SendIcon,
  noisy: NetworkIcon,
  probe: ScanIcon,
  cheremsha: BookOpenIcon,
  monitors: PulseIcon,
  history: HistoryIcon,
};

const PREFILL_KIND: Record<NonNullable<DpiLink['source']>, PanelKind> = {
  node: 'nodes',
  host: 'hosts',
  user: 'subscription',
};

/** Баланс и остаток Соседей в шапке; `short` — сжатая подпись Соседей для строки под подзаголовком (телефон). */
function HeaderStats({
  className,
  balance,
  noisy,
  loading,
  short = false,
}: {
  className: string;
  balance: number | null | undefined;
  noisy: DpiStatus['noisy'] | undefined;
  loading: boolean;
  short?: boolean;
}) {
  const { t } = useTranslation();
  const showNoisy = noisy && !noisy.unlimited && noisy.limit !== null;
  const showBalance = balance !== null && balance !== undefined;
  if (loading) return <Skeleton className={cn('h-5 w-28', className)} />;
  if (!showNoisy && !showBalance) return null;
  return (
    <div className={className}>
      {showBalance && (
        <span className="text-sm font-semibold tabular-nums text-dark-100">
          {t('admin.dpichecker.money.usd', { value: balance.toFixed(2) })}
        </span>
      )}
      {showNoisy && (
        <span className="text-xs text-dark-400">
          {t(short ? 'admin.dpichecker.header.noisyShort' : 'admin.dpichecker.header.noisyLeft', {
            left: noisy.remaining ?? 0,
            limit: noisy.limit,
          })}
        </span>
      )}
    </div>
  );
}

/** Содержимое вкладки по адресу; без права запуска формы трат не показываются. */
function TabBody({ link, canRun }: { link: DpiLink; canRun: boolean }) {
  const prefill =
    link.source && link.ref ? { kind: PREFILL_KIND[link.source], ref: link.ref } : null;
  if (link.check) return <CheckResult key={link.check} actionId={link.check} />;
  if (link.scan) return <ScanResult key={link.scan} actionId={link.scan} />;
  if (link.tab === 'cheremsha') return <CheremshaTab />;
  if (link.tab === 'monitors') return <MonitorsTab />;
  if (link.tab === 'history') return <HistoryTab />;
  if (link.tab === 'noisy' || link.tab === 'probe') {
    if (!canRun) return <section data-tab={link.tab} />;
    return link.tab === 'noisy' ? <NoisyTab /> : <ProbeTab />;
  }
  if (link.tab === 'vpn' || link.tab === 'ip' || link.tab === 'mtproto') {
    if (!canRun) return <section data-tab={link.tab} />;
    return (
      <CheckForm key={`${link.tab}-${link.ref ?? ''}`} checkType={link.tab} prefill={prefill} />
    );
  }
  return <section data-tab={link.tab} />;
}

/**
 * DPI//CHECKER — проверки VPN-ключей, адресов и MTProto из сетей России, Китая, Ирана и
 * Туркменистана. Логика вкладок — как на dpichecker.st, вид — канон кабинета.
 */
export default function AdminDpiChecker() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const link = useMemo(() => readLink(searchParams), [searchParams]);
  const canRun = usePermissionStore((state) => state.hasPermission('dpichecker:run'));
  const { data: status, isLoading } = useDpiStatus();
  const ready = Boolean(status?.enabled && status?.configured);

  const setTab = (tab: Tab) => setSearchParams(new URLSearchParams({ tab }), { replace: true });
  const tabs = TABS.map((tab) => ({
    value: tab,
    label: t(`admin.dpichecker.tabs.${tab}`),
    icon: TAB_ICONS[tab],
  }));
  const noisy = status?.noisy;

  return (
    <div className="space-y-6 pb-28 lg:pb-0">
      <header className="flex items-start gap-3 sm:items-center">
        <AdminBackButton />
        <div
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-500/10 text-accent-400"
        >
          <WallIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-dark-100">{DPI_BRAND}</h1>
          <p className="text-xs text-dark-400">{t('admin.dpichecker.subtitle')}</p>
          {/* Телефон: баланс и Соседи — строкой под подзаголовком, в колонке названия. */}
          <HeaderStats
            className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 sm:hidden"
            balance={ready ? status?.balance : null}
            noisy={ready ? noisy : null}
            loading={isLoading}
            short
          />
        </div>
        {/* Широкий экран: справа от названия. */}
        <HeaderStats
          className="ms-auto hidden shrink-0 flex-row-reverse items-center gap-4 sm:flex"
          balance={ready ? status?.balance : null}
          noisy={ready ? noisy : null}
          loading={isLoading}
        />
      </header>
      {status?.error && <p className="-mt-3 text-sm text-error-400">{status.error}</p>}

      {status && !ready && <SetupCard status={status} />}
      {ready && (
        <>
          <IconTabs
            value={link.tab}
            tabs={tabs}
            onChange={setTab}
            label={t('admin.dpichecker.tabs.label')}
            scrollOnMobile
          />
          <TabBody link={link} canRun={canRun} />
        </>
      )}
    </div>
  );
}
