import apiClient from './client';
import type { ReferralInfo, ReferralTerms, PaginatedResponse } from '../types';

interface ReferralItem {
  id: number;
  username: string | null;
  first_name: string | null;
  created_at: string;
  has_subscription: boolean;
  has_paid: boolean;
}

export interface ReferralEarning {
  id: number;
  amount_kopeks: number;
  amount_rubles: number;
  reason: string;
  /**
   * A `days` reward carries amount_kopeks = 0 and days_granted > 0. Rendering it
   * by the money amount alone prints "+0.00 ₽" for a real reward.
   */
  reward_type?: 'money' | 'days';
  /** Chain level the reward was earned on. The only thing distinguishing
   *  otherwise identical rows from different links of the chain. */
  level?: number;
  days_granted?: number;
  tariff_id?: number | null;
  tariff_name?: string | null;
  referral_username: string | null;
  referral_first_name: string | null;
  campaign_name: string | null;
  created_at: string;
}

interface ReferralEarningsList extends PaginatedResponse<ReferralEarning> {
  total_amount_kopeks: number;
  total_amount_rubles: number;
  total_days_granted?: number;
}

export const referralApi = {
  // Get referral info
  getReferralInfo: async (): Promise<ReferralInfo> => {
    const response = await apiClient.get<ReferralInfo>('/cabinet/referral');
    return response.data;
  },

  // Get referral list
  getReferralList: async (params?: {
    page?: number;
    per_page?: number;
  }): Promise<PaginatedResponse<ReferralItem>> => {
    const response = await apiClient.get<PaginatedResponse<ReferralItem>>(
      '/cabinet/referral/list',
      {
        params,
      },
    );
    return response.data;
  },

  // Get referral earnings
  getReferralEarnings: async (params?: {
    page?: number;
    per_page?: number;
  }): Promise<ReferralEarningsList> => {
    const response = await apiClient.get<ReferralEarningsList>('/cabinet/referral/earnings', {
      params,
    });
    return response.data;
  },

  // Get referral terms
  getReferralTerms: async (): Promise<ReferralTerms> => {
    const response = await apiClient.get<ReferralTerms>('/cabinet/referral/terms');
    return response.data;
  },
};
