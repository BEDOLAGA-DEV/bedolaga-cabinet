import apiClient from './client';

/** Состояние премиум-лимита подписки по одному серверу. */
export interface AdminPremiumTrafficState {
  squad_uuid: string;
  name: string | null;
  limit_gb: number;
  extra_gb: number;
  used_gb: number;
  remaining_gb: number;
  /** Сервер снят за перерасход. */
  is_limited: boolean;
  period_start_at: string | null;
  last_checked_at: string | null;
  /** false — воркер ещё не дошёл до подписки, показаны настройки тарифа. */
  has_state: boolean;
}

/**
 * Что сбрасывать: премиум-лимиты, общий трафик в панели или оба.
 * Обычный сброс не трогает премиум, премиум — общий трафик.
 */
export type PremiumTrafficResetScope = 'premium' | 'regular' | 'both';

export interface PremiumTrafficResetResult {
  scope: PremiumTrafficResetScope;
  regular_reset: boolean;
  premium_squads: string[];
}

export interface PremiumTrafficGrantResult {
  success: boolean;
  squad_uuid: string;
  gb: number;
  extra_gb: number;
  /** Сервер был снят и теперь вернётся — ближайшим проходом воркера. */
  squad_restored: boolean;
}

export const adminPremiumTrafficApi = {
  getStates: async (subscriptionId: number): Promise<AdminPremiumTrafficState[]> => {
    const response = await apiClient.get<AdminPremiumTrafficState[]>(
      `/cabinet/admin/premium-traffic/${subscriptionId}`,
    );
    return response.data;
  },

  reset: async (
    subscriptionId: number,
    scope: PremiumTrafficResetScope,
    squadUuid?: string,
  ): Promise<PremiumTrafficResetResult> => {
    const response = await apiClient.post<PremiumTrafficResetResult>(
      `/cabinet/admin/premium-traffic/${subscriptionId}/reset`,
      { scope, squad_uuid: squadUuid ?? null },
    );
    return response.data;
  },

  grant: async (
    subscriptionId: number,
    squadUuid: string,
    gb: number,
  ): Promise<PremiumTrafficGrantResult> => {
    const response = await apiClient.post<PremiumTrafficGrantResult>(
      `/cabinet/admin/premium-traffic/${subscriptionId}/grant`,
      { squad_uuid: squadUuid, gb },
    );
    return response.data;
  },
};
