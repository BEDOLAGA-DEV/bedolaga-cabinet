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
import { usePlatform } from '@/platform';
import { usePermissionStore } from '@/store/permissions';
import { AdminBackButton } from '../components/admin/AdminBackButton';
import { IconTabs } from '../components/admin/IconTabs';
import { CheckForm } from '../components/admin/dpichecker/CheckForm';
import { CheckResult } from '../components/admin/dpichecker/CheckResult';
import { type DpiLink, readLink, TABS, type Tab } from '../components/admin/dpichecker/deepLink';
import type { PanelKind } from '../components/admin/dpichecker/TargetsStep';
import { SetupCard } from '../components/admin/dpichecker/SetupCard';
import { useDpiStatus } from '../components/admin/dpichecker/useDpiStatus';

const TOPUP_URL = 'https://dpichecker.st/topup';
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

/** Содержимое вкладки по адресу; без права запуска формы трат не показываются. */
function TabBody({ link, canRun }: { link: DpiLink; canRun: boolean }) {
  const prefill =
    link.source && link.ref ? { kind: PREFILL_KIND[link.source], ref: link.ref } : null;
  if (link.check) return <CheckResult key={link.check} actionId={link.check} />;
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
  const { openLink } = usePlatform();
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
      <header className="flex flex-wrap items-center gap-3">
        <AdminBackButton />
        <div
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-500/10 text-accent-400"
        >
          <WallIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-dark-100">{DPI_BRAND}</h1>
          <p className="text-xs text-dark-400">{t('admin.dpichecker.subtitle')}</p>
        </div>
        <div className="ms-auto flex flex-wrap items-center gap-x-4 gap-y-2">
          {isLoading && <Skeleton className="h-6 w-28" />}
          {ready && noisy && !noisy.unlimited && noisy.limit !== null && (
            <span className="text-xs text-dark-400">
              {t('admin.dpichecker.header.noisyLeft', {
                left: noisy.remaining ?? 0,
                limit: noisy.limit,
              })}
            </span>
          )}
          {ready && status?.balance !== null && status?.balance !== undefined && (
            <span className="text-sm font-semibold tabular-nums text-dark-100">
              {t('admin.dpichecker.money.usd', { value: status.balance.toFixed(2) })}
            </span>
          )}
          {ready && canRun && (
            <button
              type="button"
              className="btn-secondary min-h-[36px] px-3 text-sm"
              onClick={() => openLink(TOPUP_URL)}
            >
              {t('admin.dpichecker.header.topup')}
            </button>
          )}
        </div>
        {status?.error && <p className="w-full text-sm text-error-400">{status.error}</p>}
      </header>

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
