import type { UserDetailResponse, UserSubscriptionInfo } from '@/api/adminUsers';

/**
 * Как бот продаёт подписки — от этого зависят плитки карточки и вкладка «Подписка»:
 * - `classic` — без тарифов: у подписки нет названия тарифа, сменить тариф нельзя;
 * - `tariffs` — одна подписка по тарифу;
 * - `multi` — мультитариф: подписок у человека несколько, «срок / трафик / устройства»
 *   одной из них в плитках над вкладками вводили бы в заблуждение.
 */
export type SalesMode = 'classic' | 'tariffs' | 'multi';

type ModeSource = Pick<UserDetailResponse, 'sales_mode' | 'multi_tariff_enabled' | 'subscriptions'>;

export function salesModeOf(user: ModeSource): SalesMode {
  if (user.sales_mode === 'classic') return 'classic';
  // Старый бот режим не присылает: несколько подписок бывают только в мультитарифе.
  if (user.multi_tariff_enabled ?? user.subscriptions.length > 1) return 'multi';
  return 'tariffs';
}

/** Живая подписка — ей можно пользоваться (активна, пробная или упёрлась в трафик). */
export function isLiveSubscription(
  sub: Pick<UserSubscriptionInfo, 'status' | 'is_active'>,
): boolean {
  return sub.is_active || sub.status === 'trial' || sub.status === 'limited';
}
