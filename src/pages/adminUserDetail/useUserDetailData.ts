import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/api/admin';
import { adminUsersApi } from '@/api/adminUsers';
import { promocodesApi } from '@/api/promocodes';
import type { DetailTab } from '@/components/admin/userDetail/OverviewTab';
import { usePermissionStore } from '@/store/permissions';

/** Последние события в «Обзоре» — пять строк, остальное во вкладке «Активность». */
const RECENT_EVENTS = 5;
/** Тикетов у одного человека единицы — одной порции хватает и на счётчики, и на список. */
const TICKETS_PAGE = 50;
/** «Онлайн», нода и трафик из панели меняются сами — перечитываем раз в минуту. */
const PANEL_REFRESH_MS = 60_000;
/** Вернулся на вкладку — карточка догоняет то, что изменилось без админа. */
const FRESH = { refetchOnWindowFocus: true } as const;

/**
 * Все запросы карточки пользователя. Данные берутся прямо из кэша React Query —
 * без копий в useState, которые раньше отставали от ответа на один рендер.
 * Выбранная подписка (мультитариф) вычисляется: выбор админа или первая живая.
 */
export function useUserDetailData(userId: number | null, activeTab: DetailTab) {
  const hasPermission = usePermissionStore((s) => s.hasPermission);
  const valid = userId !== null;
  const id = userId ?? 0;
  const [pickedSubscriptionId, setPickedSubscriptionId] = useState<number | null>(null);

  const userQuery = useQuery({
    queryKey: ['admin-user-detail', userId] as const,
    queryFn: () => adminUsersApi.getUser(id),
    enabled: valid,
    ...FRESH,
  });
  const user = userQuery.data ?? null;
  const subscriptions = user?.subscriptions ?? [];
  const fallbackSubscription = subscriptions.find((sub) => sub.is_active) ?? subscriptions[0];
  const activeSubscriptionId =
    pickedSubscriptionId !== null && subscriptions.some((sub) => sub.id === pickedSubscriptionId)
      ? pickedSubscriptionId
      : (fallbackSubscription?.id ?? null);
  const selectedSub =
    subscriptions.find((sub) => sub.id === activeSubscriptionId) ?? user?.subscription ?? null;
  const subParam = activeSubscriptionId ?? undefined;
  // Запросы подписки ждут карточку: иначе первый уходит без номера подписки и повторяется.
  const ready = valid && user !== null;

  const panelInfoQuery = useQuery({
    queryKey: ['admin-user-panel-info', userId, activeSubscriptionId] as const,
    queryFn: () => adminUsersApi.getPanelInfo(id, subParam),
    enabled: ready,
    refetchInterval: PANEL_REFRESH_MS,
    ...FRESH,
  });
  const devicesQuery = useQuery({
    queryKey: ['admin-user-devices', userId, activeSubscriptionId] as const,
    queryFn: () => adminUsersApi.getUserDevices(id, subParam),
    enabled: ready,
    ...FRESH,
  });
  const syncStatusQuery = useQuery({
    queryKey: ['admin-user-sync-status', userId, activeSubscriptionId] as const,
    queryFn: () => adminUsersApi.getSyncStatus(id, subParam),
    enabled: ready && activeTab === 'subscription' && hasPermission('users:sync'),
    ...FRESH,
  });
  const tariffsQuery = useQuery({
    queryKey: ['admin-user-tariffs', userId] as const,
    queryFn: () => adminUsersApi.getAvailableTariffs(id, true),
    enabled: ready && (activeTab === 'subscription' || activeTab === 'overview'),
  });
  const nodeUsageQuery = useQuery({
    queryKey: ['admin-user-node-usage', userId, activeSubscriptionId] as const,
    queryFn: () => adminUsersApi.getNodeUsage(id, subParam),
    enabled: ready && activeTab === 'subscription',
  });
  const promoGroupsQuery = useQuery({
    queryKey: ['admin-promo-groups-all'] as const,
    queryFn: () => promocodesApi.getPromoGroups({ limit: 100 }),
    enabled: ready && hasPermission('users:promo_group'),
  });
  const recentActivityQuery = useQuery({
    queryKey: ['admin-user-recent-activity', userId] as const,
    queryFn: () => adminUsersApi.getUserActivity(id, 0, RECENT_EVENTS),
    enabled: ready && activeTab === 'overview',
    ...FRESH,
  });
  const ticketsQuery = useQuery({
    queryKey: ['admin-user-tickets', userId] as const,
    queryFn: () => adminApi.getTickets({ user_id: id, per_page: TICKETS_PAGE }),
    enabled: ready && activeTab === 'overview',
  });
  const giftsQuery = useQuery({
    queryKey: ['admin-user-gifts', userId] as const,
    queryFn: () => adminUsersApi.getUserGifts(id),
    enabled: ready && activeTab === 'overview',
  });

  const tariffs = tariffsQuery.data?.tariffs ?? [];
  const currentTariff = tariffs.find((tariff) => tariff.id === selectedSub?.tariff_id) ?? null;

  return {
    userQuery,
    user,
    subscriptions,
    activeSubscriptionId,
    selectSubscription: setPickedSubscriptionId,
    selectedSub,
    panelInfo: panelInfoQuery.data ?? null,
    panelInfoQuery,
    devicesQuery,
    syncStatusQuery,
    tariffs,
    currentTariff,
    nodeUsage: nodeUsageQuery.data ?? null,
    promoGroups: promoGroupsQuery.data?.items ?? [],
    recentActivity: recentActivityQuery.data?.items ?? null,
    tickets: ticketsQuery.data?.items ?? null,
    gifts: giftsQuery.data ?? null,
  };
}

export type UserDetailData = ReturnType<typeof useUserDetailData>;
