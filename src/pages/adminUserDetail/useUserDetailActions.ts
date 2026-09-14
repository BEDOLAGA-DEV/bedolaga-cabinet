import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  adminUsersApi,
  type UpdateRestrictionsRequest,
  type UpdateSubscriptionRequest,
} from '@/api/adminUsers';
import { useAdminAction } from '@/components/admin/userDetail/useAdminAction';
import { formatShortDate } from '@/utils/format';
import type { UserDetailData } from './useUserDetailData';

type SubscriptionAction = 'extend' | 'shorten' | 'change_tariff' | 'activate' | 'cancel' | 'create';

/**
 * Действия карточки: у каждого своя фраза успеха и то, что нужно перечитать.
 * Ошибки и отказы сервера показывает `useAdminAction` — здесь только «что сделать».
 */
export function useUserDetailActions(userId: number, data: UserDetailData) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { busy, run } = useAdminAction();
  const subscriptionId = data.activeSubscriptionId ?? undefined;
  const withSubscription = subscriptionId ? { subscription_id: subscriptionId } : {};
  const ns = 'admin.users.detail.done';

  // Любое действие меняет сразу несколько блоков (срок, трафик в панели, сверку,
  // события) — перечитываем все запросы этого человека, а список помечаем устаревшим.
  const refreshCard = () =>
    Promise.all([
      queryClient.invalidateQueries({
        predicate: (query) =>
          typeof query.queryKey[0] === 'string' &&
          query.queryKey[0].startsWith('admin-user-') &&
          query.queryKey[1] === userId,
      }),
      queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
    ]);

  const updateSubscription = (
    action: SubscriptionAction,
    extra: { days?: number; tariffId?: number | null } = {},
  ) => {
    const days = extra.days ?? 30;
    const request: UpdateSubscriptionRequest = {
      action,
      ...(action !== 'create' ? withSubscription : {}),
      ...(action === 'extend' || action === 'shorten' || action === 'create' ? { days } : {}),
      ...(extra.tariffId ? { tariff_id: extra.tariffId } : {}),
    };
    return run(() => adminUsersApi.updateSubscription(userId, request), {
      success: (response) =>
        t(`${ns}.subscription.${action}`, {
          count: days,
          date: formatShortDate(response.subscription?.end_date ?? null),
        }),
      after: refreshCard,
    });
  };

  return {
    busy,
    extend: (days: number) => updateSubscription('extend', { days }),
    shorten: (days: number) => updateSubscription('shorten', { days }),
    changeTariff: (tariffId: number) => updateSubscription('change_tariff', { tariffId }),
    activate: () => updateSubscription('activate'),
    cancelSubscription: () => updateSubscription('cancel'),
    createSubscription: (tariffId: number | null, days: number) =>
      updateSubscription('create', { tariffId, days }),

    addTraffic: (gb: number) =>
      run(
        () =>
          adminUsersApi.updateSubscription(userId, {
            action: 'add_traffic',
            traffic_gb: gb,
            ...withSubscription,
          }),
        { success: t('admin.users.detail.subscription.trafficAdded'), after: refreshCard },
      ),
    removeTraffic: (purchaseId: number) =>
      run(
        () =>
          adminUsersApi.updateSubscription(userId, {
            action: 'remove_traffic',
            traffic_purchase_id: purchaseId,
            ...withSubscription,
          }),
        { success: t('admin.users.detail.subscription.trafficRemoved'), after: refreshCard },
      ),
    setDeviceLimit: (limit: number) =>
      run(
        () =>
          adminUsersApi.updateSubscription(userId, {
            action: 'set_device_limit',
            device_limit: limit,
            ...withSubscription,
          }),
        {
          success: t('admin.users.detail.subscription.deviceLimitUpdated'),
          after: refreshCard,
        },
      ),
    cancelSbp: () =>
      run(
        async () => {
          if (!data.selectedSub?.sbp_recurring_id) return;
          await adminUsersApi.cancelSbpRecurring(userId, data.selectedSub.id);
        },
        { success: t('admin.users.detail.subscription.sbpCancelled'), after: refreshCard },
      ),
    deleteSubscription: () =>
      run(
        async () => {
          const sub = data.selectedSub;
          if (!sub) return;
          // Активную платную подписку сервер по умолчанию бережёт — админ уже
          // подтвердил намерение, поэтому просим удалить именно её.
          await adminUsersApi.deleteSubscription(userId, sub.id, sub.is_active && !sub.is_trial);
        },
        { success: t('admin.users.detail.subscription.deleted'), after: refreshCard },
      ),

    deleteDevice: (hwid: string) =>
      run(() => adminUsersApi.deleteUserDevice(userId, hwid, subscriptionId), {
        success: t('admin.users.detail.devices.deleted'),
        after: refreshCard,
      }),
    renameDevice: (hwid: string, name: string) =>
      run(() => adminUsersApi.renameUserDevice(userId, hwid, name.trim() || null), {
        success: t('admin.users.detail.devices.renamed'),
        after: refreshCard,
      }),
    resetDevices: () =>
      run(() => adminUsersApi.resetUserDevices(userId, subscriptionId), {
        success: t('admin.users.detail.devices.allDeleted'),
        after: refreshCard,
      }),

    syncFromPanel: () =>
      run(
        () =>
          adminUsersApi.syncFromPanel(
            userId,
            { update_subscription: true, update_traffic: true },
            subscriptionId,
          ),
        {
          success: t(`${ns}.pulled`),
          // Бот применил дату панели, хотя своя была позже, — это стоит заметить.
          warning: (response) => (response.errors?.length ? t(`${ns}.pulledWithWarning`) : null),
          after: refreshCard,
        },
      ),
    syncToPanel: () =>
      run(() => adminUsersApi.syncToPanel(userId, { create_if_missing: true }, subscriptionId), {
        success: t(`${ns}.pushed`),
        after: refreshCard,
      }),

    changePromoGroup: (groupId: number | null) =>
      run(() => adminUsersApi.updatePromoGroup(userId, groupId), {
        success: t(`${ns}.promoGroup`),
        after: refreshCard,
      }),
    updateRestrictions: (request: UpdateRestrictionsRequest) =>
      run(() => adminUsersApi.updateRestrictions(userId, request), {
        success: t('admin.users.detail.restrictionsSaved'),
        after: refreshCard,
      }),

    block: () =>
      run(() => adminUsersApi.blockUser(userId), {
        success: t(`${ns}.blocked`),
        after: refreshCard,
      }),
    unblock: () =>
      run(() => adminUsersApi.unblockUser(userId), {
        success: t(`${ns}.unblocked`),
        after: refreshCard,
      }),
    resetTrial: () =>
      run(() => adminUsersApi.resetTrial(userId), {
        success: t('admin.users.userActions.success.resetTrial'),
        after: refreshCard,
      }),
    resetSubscriptions: () =>
      run(() => adminUsersApi.resetSubscription(userId), {
        success: t('admin.users.userActions.success.resetSubscription'),
        after: refreshCard,
      }),
    disable: () =>
      run(() => adminUsersApi.disableUser(userId), {
        success: t('admin.users.userActions.success.disable'),
        after: refreshCard,
      }),
    deleteUser: () =>
      run(() => adminUsersApi.fullDeleteUser(userId), {
        success: t('admin.users.userActions.success.delete'),
        after: () => navigate('/admin/users'),
      }),
  };
}

export type UserDetailActions = ReturnType<typeof useUserDetailActions>;
