import apiClient from './client';

export interface PromoOffer {
  id: number;
  notification_type: string;
  discount_percent: number | null;
  effect_type: string;
  expires_at: string;
  is_active: boolean;
  is_claimed: boolean;
  claimed_at: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extra_data: Record<string, any> | null;
}

export interface ActiveDiscount {
  discount_percent: number;
  source: string | null;
  expires_at: string | null;
  is_active: boolean;
}

export interface PromoGroupDiscounts {
  group_name: string | null;
  server_discount_percent: number;
  traffic_discount_percent: number;
  device_discount_percent: number;
  period_discounts: Record<string, number>;
}

export interface ClaimOfferResponse {
  success: boolean;
  message: string;
  discount_percent: number | null;
  expires_at: string | null;
}

export interface DeactivateDiscountResponse {
  success: boolean;
}

export interface LoyaltyTierInfo {
  id: number;
  name: string;
  threshold_rubles: number;
  server_discount_percent: number;
  traffic_discount_percent: number;
  device_discount_percent: number;
  period_discounts: Record<string, number>;
  is_current: boolean;
  is_achieved: boolean;
}

export interface LoyaltyTiersResponse {
  tiers: LoyaltyTierInfo[];
  current_spent_rubles: number;
  current_tier_name: string | null;
  next_tier_name: string | null;
  next_tier_threshold_rubles: number | null;
  progress_percent: number;
}

export const promoApi = {
  // Get available promo offers
  getOffers: async (): Promise<PromoOffer[]> => {
    const response = await apiClient.get<PromoOffer[]>('/cabinet/promo/offers');
    return response.data;
  },

  // Get active discount
  getActiveDiscount: async (): Promise<ActiveDiscount> => {
    const response = await apiClient.get<ActiveDiscount>('/cabinet/promo/active-discount');
    return response.data;
  },

  // Get promo group discounts
  getGroupDiscounts: async (): Promise<PromoGroupDiscounts> => {
    const response = await apiClient.get<PromoGroupDiscounts>('/cabinet/promo/group-discounts');
    return response.data;
  },

  // Get loyalty tiers (promo groups with spending thresholds)
  getLoyaltyTiers: async (): Promise<LoyaltyTiersResponse> => {
    const response = await apiClient.get<LoyaltyTiersResponse>('/cabinet/promo/loyalty-tiers');
    return response.data;
  },

  // Claim a promo offer
  claimOffer: async (offerId: number): Promise<ClaimOfferResponse> => {
    const response = await apiClient.post<ClaimOfferResponse>('/cabinet/promo/claim', {
      offer_id: offerId,
    });
    return response.data;
  },

  // Clear active discount
  clearActiveDiscount: async (): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>('/cabinet/promo/active-discount');
    return response.data;
  },

  // Deactivate current active promo discount
  deactivateDiscount: async (): Promise<DeactivateDiscountResponse> => {
    const response = await apiClient.post<DeactivateDiscountResponse>('/cabinet/promo/deactivate');
    return response.data;
  },
};
