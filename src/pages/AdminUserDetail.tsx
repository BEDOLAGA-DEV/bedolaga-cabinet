import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { AdminBackButton } from '@/components/admin';
import {
  ActivityHub,
  type ActivityView,
  pickActivityView,
} from '@/components/admin/userDetail/ActivityHub';
import { BalanceTab } from '@/components/admin/userDetail/BalanceTab';
import { AbuseTab } from '@/components/admin/userDetail/AbuseTab';
import { OverviewTab, type DetailTab } from '@/components/admin/userDetail/OverviewTab';
import { ReferralsTab } from '@/components/admin/userDetail/ReferralsTab';
import { SendMessageDialog } from '@/components/admin/userDetail/SendMessageDialog';
import { SubscriptionTab } from '@/components/admin/userDetail/SubscriptionTab';
import { UserActionsMenu } from '@/components/admin/userDetail/UserActionsMenu';
import { UserFacts } from '@/components/admin/userDetail/UserFacts';
import { UserHeader } from '@/components/admin/userDetail/UserHeader';
import { buildReachabilityLink } from '@/components/admin/reachability/deepLink';
import { useReachabilityAvailable } from '@/components/admin/reachability/useReachabilityStatus';
import { TelegramSmallIcon } from '@/components/icons';
import { PageSkeleton, Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { usePermissionStore } from '@/store/permissions';
import { getApiErrorMessage } from '@/utils/api-error';
import { useUserDetailActions } from './adminUserDetail/useUserDetailActions';
import { salesModeOf } from './adminUserDetail/salesMode';
import { useUserDetailData } from './adminUserDetail/useUserDetailData';

// ──────────────────────────────────────────────────────────────────
// Карточка пользователя. Запросы — в `useUserDetailData`, действия с тостами —
// в `useUserDetailActions`, здесь только раскладка. Вкладка, подвид «Активности»
// и открываемая форма живут в адресе (`?tab=&view=&do=`): обновление страницы и
// ссылка коллеге открывают то же место.
// ──────────────────────────────────────────────────────────────────

const TABS: readonly DetailTab[] = [
  'overview',
  'subscription',
  'balance',
  'referrals',
  'activity',
  'abuse',
];

function pickTab(value: string | null): DetailTab {
  return value && (TABS as readonly string[]).includes(value) ? (value as DetailTab) : 'overview';
}

export default function AdminUserDetail() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [params, setParams] = useSearchParams();
  const hasPermission = usePermissionStore((s) => s.hasPermission);
  const [sendMessageOpen, setSendMessageOpen] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);

  const parsedId = id ? Number.parseInt(id, 10) : Number.NaN;
  const userId = Number.isNaN(parsedId) ? null : parsedId;
  const activeTab = pickTab(params.get('tab'));
  const activityView = pickActivityView(params.get('view'));

  const data = useUserDetailData(userId, activeTab);
  const actions = useUserDetailActions(userId ?? 0, data);
  const reachabilityAvailable = useReachabilityAvailable();
  const reachabilityLink =
    userId !== null && hasPermission('reachability:run') && reachabilityAvailable
      ? buildReachabilityLink({ mode: 'vless', userId })
      : null;

  useEffect(() => {
    if (userId === null) navigate('/admin/users', { replace: true });
  }, [userId, navigate]);

  const loaded = data.user !== null;
  // На телефоне вкладки листаются: активная («Активность» по ссылке) не должна прятаться за краем.
  // biome-ignore lint/correctness/useExhaustiveDependencies: ряд вкладок появляется только после загрузки карточки
  useEffect(() => {
    const row = tabsRef.current;
    const tab = row?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!row || !tab) return;
    const overflowRight = tab.offsetLeft + tab.offsetWidth - (row.scrollLeft + row.clientWidth);
    const overflowLeft = row.scrollLeft - tab.offsetLeft;
    if (overflowRight > 0) row.scrollLeft += overflowRight + 16;
    else if (overflowLeft > 0) row.scrollLeft -= overflowLeft + 16;
  }, [activeTab, loaded]);

  /** Вкладка, подвид «Активности» или форма «Подписки» (`?do=`) — одним переходом. */
  const goTo = useCallback(
    (tab: DetailTab, view?: string) => {
      const next = new URLSearchParams(params);
      if (tab === 'overview') next.delete('tab');
      else next.set('tab', tab);
      next.delete('view');
      next.delete('do');
      if (tab === 'activity' && view) next.set('view', view);
      if (tab === 'subscription' && view) next.set('do', view);
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  const { user, userQuery, selectedSub } = data;

  if (!user && (userQuery.isLoading || userQuery.isPending)) {
    return (
      <PageSkeleton
        variant="admin"
        leading={['h-10 w-10 rounded-xl', 'h-14 w-14 rounded-full']}
        titleWidth="w-56"
        className="space-y-6"
      >
        <Skeleton variant="card" count={2} className="h-40" />
      </PageSkeleton>
    );
  }

  if (!user || userId === null) {
    return (
      <div className="animate-fade-in">
        <div className="mb-4 flex items-center gap-3">
          <AdminBackButton to="/admin/users" />
          <h1 className="text-xl font-bold text-dark-100">{t('admin.users.notFound')}</h1>
        </div>
        <p className="mb-4 text-sm text-dark-400">
          {getApiErrorMessage(userQuery.error, t('admin.users.detail.loadError'))}
        </p>
        <button type="button" onClick={() => void userQuery.refetch()} className="btn-secondary">
          {t('common.retry')}
        </button>
      </div>
    );
  }

  const mode = salesModeOf(user);
  const can = {
    message: hasPermission('users:send_message'),
    subscription: hasPermission('users:subscription'),
    balance: hasPermission('users:balance'),
    block: hasPermission('users:block'),
    remove: hasPermission('users:delete'),
    promoGroup: hasPermission('users:promo_group'),
    restrictions: hasPermission('users:edit'),
    sync: hasPermission('users:sync'),
    offer: hasPermission('users:send_offer'),
    referral: hasPermission('users:referral'),
    devices: hasPermission('users:edit'),
    deactivateOffer: hasPermission('promocodes:edit'),
  };
  const devices = data.devicesQuery.data?.devices ?? null;
  // В шапке — только «Написать» и «⋯». «Продлить» / «Выдать» живут у самой подписки во
  // вкладке «Подписка»: в мультитарифе кнопка в шапке не говорила, какую подписку продлит.
  // На телефоне «Написать» — иконкой рядом с «⋯», в строке имени.
  const headerActions = can.message && (
    <button
      type="button"
      onClick={() => setSendMessageOpen(true)}
      disabled={!user.telegram_id}
      aria-label={t('admin.users.detail.header.write')}
      title={
        !user.telegram_id
          ? t('admin.users.sendMessage.noTelegram')
          : t('admin.users.detail.header.write')
      }
      className="btn-secondary h-11 w-11 shrink-0 p-0 sm:h-10 sm:w-auto sm:px-4"
    >
      <TelegramSmallIcon className="h-4 w-4" />
      <span className="hidden sm:inline">{t('admin.users.detail.header.write')}</span>
    </button>
  );

  const menu = (
    <UserActionsMenu
      blocked={user.status === 'blocked'}
      busy={actions.busy}
      can={{
        block: can.block,
        subscription: can.subscription,
        delete: can.remove,
      }}
      actions={actions}
    />
  );

  return (
    <div className="animate-fade-in space-y-5">
      <UserHeader user={user} panelInfo={data.panelInfo} actions={headerActions} menu={menu} />

      <UserFacts
        user={user}
        mode={mode}
        subscription={selectedSub}
        devicesTotal={devices ? devices.length : null}
      />

      <div
        ref={tabsRef}
        role="tablist"
        aria-label={t('admin.users.title')}
        className="scrollbar-hide -mx-4 flex gap-1.5 overflow-x-auto px-4 py-1 sm:gap-2"
      >
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => goTo(tab)}
            className={cn(
              'shrink-0 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition-colors sm:px-4',
              activeTab === tab
                ? 'bg-accent-500/15 text-accent-400 ring-1 ring-accent-500/30'
                : 'bg-dark-800/50 text-dark-400 hover:text-dark-200',
            )}
          >
            {t(`admin.users.detail.tabs.${tab}`)}
            {tab === 'referrals' && user.referral.referrals_count > 0 && (
              <span className="ml-1.5 rounded-full bg-dark-700 px-1.5 text-[11px] tabular-nums text-dark-200">
                {user.referral.referrals_count}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'abuse' && <AbuseTab userId={userId} />}

      {activeTab === 'overview' && (
        <OverviewTab
          user={user}
          panelInfo={data.panelInfo}
          devices={devices}
          promoGroups={data.promoGroups}
          tickets={data.tickets}
          gifts={data.gifts}
          recentActivity={data.recentActivity}
          can={{ promoGroup: can.promoGroup, restrictions: can.restrictions }}
          busy={actions.busy}
          onChangePromoGroup={actions.changePromoGroup}
          onUpdateRestrictions={actions.updateRestrictions}
          onGoTo={goTo}
        />
      )}

      {activeTab === 'subscription' && (
        <SubscriptionTab
          mode={mode}
          userId={userId}
          user={user}
          subscriptions={data.subscriptions}
          selectedSub={selectedSub}
          onSelectSubscription={data.selectSubscription}
          tariffs={data.tariffs}
          currentTariff={data.currentTariff}
          panelInfo={data.panelInfo}
          devices={devices ?? []}
          devicesLoading={data.devicesQuery.isLoading}
          nodeUsage={data.nodeUsage}
          syncStatus={data.syncStatusQuery.data ?? null}
          syncLoading={data.syncStatusQuery.isFetching}
          can={{ manage: can.subscription, sync: can.sync, devices: can.devices }}
          busy={actions.busy}
          actions={actions}
          reachabilityLink={reachabilityLink}
        />
      )}

      {activeTab === 'balance' && (
        <BalanceTab
          user={user}
          userId={userId}
          can={{ balance: can.balance, offer: can.offer, deactivateOffer: can.deactivateOffer }}
          onUserRefresh={() => userQuery.refetch()}
        />
      )}

      {activeTab === 'referrals' && (
        <ReferralsTab
          user={user}
          userId={userId}
          canEdit={can.referral}
          onUserRefresh={() => userQuery.refetch()}
        />
      )}

      {activeTab === 'activity' && (
        <ActivityHub
          userId={userId}
          view={activityView}
          onViewChange={(view: ActivityView) => goTo('activity', view === 'all' ? undefined : view)}
          onNavigateToUser={(targetId) => navigate(`/admin/users/${targetId}`)}
        />
      )}

      <SendMessageDialog
        userId={userId}
        open={sendMessageOpen}
        onClose={() => setSendMessageOpen(false)}
      />
    </div>
  );
}
