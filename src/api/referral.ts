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

interface ReferralEarning {
  id: number;
  amount_kopeks: number;
  amount_rubles: number;
  reason: string;
  referral_username: string | null;
  referral_first_name: string | null;
  created_at: string;
}

interface ReferralEarningsList extends PaginatedResponse<ReferralEarning> {
  total_amount_kopeks: number;
  total_amount_rubles: number;
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
