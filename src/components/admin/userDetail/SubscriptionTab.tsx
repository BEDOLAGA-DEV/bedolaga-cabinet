import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import type {
  PanelSyncStatusResponse,
  UserAvailableTariff,
  UserDetailResponse,
  UserNodeUsageResponse,
  UserPanelInfo,
  UserSubscriptionInfo,
} from '@/api/adminUsers';
import { GraceAccessChip, SubscriptionStateChip, useTrafficLabel } from '@/components/admin/users';
import { BackIcon, ChevronRightIcon } from '@/components/icons';
import { formatShortDate } from '@/utils/format';
import type { SalesMode } from '@/pages/adminUserDetail/salesMode';
import { CreateSubscriptionForm } from './CreateSubscriptionForm';
import { DangerZone } from './DangerZone';
import { type DeviceRow, DevicesCard } from './DevicesCard';
import { NodeUsageCard } from './NodeUsageCard';
import { PanelSyncCard } from './PanelSyncCard';
import { PremiumTrafficAdmin } from './PremiumTrafficAdmin';
import {
  SubscriptionCard,
  type SubscriptionCardActions,
  type SubscriptionPanel,
} from './SubscriptionCard';
import { SupportDetails } from './SupportDetails';

const PANELS: readonly SubscriptionPanel[] = ['extend', 'shorten', 'tariff', 'traffic', 'devices'];
/** Куда подкрутить по `?do=`: формы живут в карточке подписки, устройства — своя карточка. */
const SCROLL_TARGET: Record<string, string> = {
  devices: 'subscription-extend',
  create: 'subscription-create',
  tariff: 'subscription-tariff',
  traffic: 'subscription-traffic',
};

export interface SubscriptionTabActions extends SubscriptionCardActions {
  cancelSubscription: () => Promise<boolean>;
  deleteSubscription: () => Promise<boolean>;
  createSubscription: (tariffId: number | null, days: number) => Promise<boolean>;
  renameDevice: (hwid: string, name: string) => Promise<boolean>;
  deleteDevice: (hwid: string) => Promise<boolean>;
  resetDevices: () => Promise<boolean>;
  syncFromPanel: () => Promise<boolean>;
  syncToPanel: () => Promise<boolean>;
}

export interface SubscriptionTabProps {
  userId: number;
  user: UserDetailResponse;
  subscriptions: UserSubscriptionInfo[];
  selectedSub: UserSubscriptionInfo | null;
  onSelectSubscription: (id: number) => void;
  tariffs: UserAvailableTariff[];
  currentTariff: UserAvailableTariff | null;
  panelInfo: UserPanelInfo | null;
  devices: DeviceRow[];
  devicesLoading: boolean;
  nodeUsage: UserNodeUsageResponse | null;
  syncStatus: PanelSyncStatusResponse | null;
  syncLoading: boolean;
  can: { manage: boolean; sync: boolean; devices: boolean };
  busy: boolean;
  actions: SubscriptionTabActions;
  reachabilityLink: string | null;
  mode: SalesMode;
}

/**
 * Вкладка «Подписка»: сверху то, что делают каждый день (продлить, сменить тариф,
 * трафик, устройства), ниже — ноды, панель, техданные и в самом конце опасная зона.
 * Мультитариф: список подписок → карточка выбранной.
 */
export function SubscriptionTab(props: SubscriptionTabProps) {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const [openPanel, setOpenPanel] = useState<SubscriptionPanel | null>(null);
  const [detailView, setDetailView] = useState(false);
  const { user, subscriptions, selectedSub, can, busy, actions, mode } = props;

  // Список — когда подписок несколько; одна открывается сразу. «Создать» в мультитарифе
  // есть всегда (кроме карточки одной из многих — там оно в списке): раньше с одной
  // подпиской вторую было не выдать.
  const multi = subscriptions.length > 1;
  const showDetail = (detailView || !multi) && selectedSub !== null;
  const showList = multi && !detailView;
  const showCreate =
    can.manage && (subscriptions.length === 0 || (mode === 'multi' && (showList || !multi)));
  const liveTariffIds = new Set(
    subscriptions
      .filter((sub) => sub.is_active || sub.status === 'trial' || sub.status === 'limited')
      .map((sub) => sub.tariff_id)
      .filter((id): id is number => id !== null),
  );
  // В мультитарифе операции общие на человека — чья это оплата, не понять; не показываем.
  const lastPayment = multi
    ? null
    : (user.recent_transactions.find(
        (tx) => tx.type === 'subscription_payment' && tx.is_completed,
      ) ?? null);

  // Ссылка с `?do=extend|tariff|…` открывает нужную форму, подкручивает к ней и убирает
  // параметр из адреса.
  useEffect(() => {
    const wanted = params.get('do');
    if (!wanted) return;
    if ((PANELS as readonly string[]).includes(wanted)) {
      setOpenPanel(wanted as SubscriptionPanel);
      setDetailView(true);
    }
    requestAnimationFrame(() => {
      const node =
        document.getElementById(SCROLL_TARGET[wanted] ?? 'subscription-extend') ??
        document.getElementById('subscription-extend');
      node?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    });
    const next = new URLSearchParams(params);
    next.delete('do');
    setParams(next, { replace: true });
  }, [params, setParams]);

  return (
    <div className="space-y-4">
      {showList && (
        <SubscriptionList
          subscriptions={subscriptions}
          onOpen={(id) => {
            props.onSelectSubscription(id);
            setDetailView(true);
          }}
        />
      )}

      {showDetail && selectedSub && (
        <>
          {multi && (
            <button
              type="button"
              onClick={() => setDetailView(false)}
              className="btn-secondary self-start"
            >
              <BackIcon className="h-4 w-4" />
              {t('admin.users.detail.subscription.backToList')}
            </button>
          )}

          <SubscriptionCard
            sub={selectedSub}
            tariffs={props.tariffs}
            currentTariff={props.currentTariff}
            panelInfo={props.panelInfo}
            lastPayment={lastPayment}
            canManage={can.manage}
            busy={busy}
            openPanel={openPanel}
            onOpenPanel={setOpenPanel}
            actions={actions}
            classic={mode === 'classic'}
          />

          {/* Премиум-трафик: сам скрывается, если премиум-серверов в тарифе нет */}
          <PremiumTrafficAdmin subscriptionId={selectedSub.id} />

          <div className="grid gap-4 lg:grid-cols-2">
            <DevicesCard
              devices={props.devices}
              loading={props.devicesLoading}
              limit={selectedSub.device_limit}
              busy={busy}
              canManage={can.devices}
              onRename={actions.renameDevice}
              onDelete={actions.deleteDevice}
              onResetAll={actions.resetDevices}
            />
            {props.panelInfo?.found && <NodeUsageCard usage={props.nodeUsage} />}
          </div>

          {can.sync && (
            <PanelSyncCard
              status={props.syncStatus}
              loading={props.syncLoading}
              busy={busy}
              onPull={actions.syncFromPanel}
              onPush={actions.syncToPanel}
            />
          )}

          <SupportDetails
            userId={props.userId}
            subscriptionId={selectedSub.id}
            panelInfo={props.panelInfo}
            remnawaveId={user.remnawave_id}
            reachabilityLink={props.reachabilityLink}
          />
        </>
      )}

      {/* Без подписки сверка тоже нужна: «забрать из панели» подтянет её аккаунт. */}
      {subscriptions.length === 0 && can.sync && (
        <PanelSyncCard
          status={props.syncStatus}
          loading={props.syncLoading}
          busy={busy}
          onPull={actions.syncFromPanel}
          onPush={actions.syncToPanel}
        />
      )}

      {showCreate && (
        <CreateSubscriptionForm
          tariffs={props.tariffs}
          excludeTariffIds={liveTariffIds}
          busy={busy}
          noSubscriptions={subscriptions.length === 0}
          onCreate={actions.createSubscription}
        />
      )}

      {/* Опасная зона — всегда последней, и под формой «Создать» тоже. */}
      {showDetail && selectedSub && can.manage && (
        <DangerZone
          busy={busy}
          canCancel={selectedSub.is_active}
          onCancel={actions.cancelSubscription}
          onDelete={async () => {
            const deleted = await actions.deleteSubscription();
            if (deleted) setDetailView(false);
            return deleted;
          }}
        />
      )}
    </div>
  );
}

function SubscriptionList({
  subscriptions,
  onOpen,
}: {
  subscriptions: UserSubscriptionInfo[];
  onOpen: (id: number) => void;
}) {
  const { t } = useTranslation();
  const trafficLabel = useTrafficLabel();
  return (
    <div className="space-y-2">
      {subscriptions.map((sub) => (
        <button
          key={sub.id}
          type="button"
          onClick={() => onOpen(sub.id)}
          className="flex w-full items-center gap-3 rounded-2xl border border-dark-700/60 bg-dark-900/40 p-4 text-left transition-colors hover:bg-dark-800/60"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-dark-100">{sub.tariff_name || `#${sub.id}`}</span>
              <SubscriptionStateChip status={sub.status} />
              <GraceAccessChip until={sub.grace_until} />
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 text-xs tabular-nums text-dark-400">
              <span>{t('admin.users.until', { date: formatShortDate(sub.end_date) })}</span>
              <span>{trafficLabel(sub.traffic_used_gb, sub.traffic_limit_gb)}</span>
              <span>
                {t('admin.users.detail.subscription.devicesLimit', { count: sub.device_limit })}
              </span>
            </div>
          </div>
          <ChevronRightIcon className="h-4 w-4 shrink-0 text-dark-500" />
        </button>
      ))}
    </div>
  );
}
