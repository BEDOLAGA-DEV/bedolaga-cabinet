import apiClient from './client';
import type {
  NetworkGraphData,
  NetworkUserDetail,
  NetworkCampaignDetail,
  NetworkSearchResult,
  ScopeOptionsData,
  ScopeSelection,
} from '@/types/referralNetwork';

export const referralNetworkApi = {
  getScopeOptions: async (): Promise<ScopeOptionsData> => {
    const response = await apiClient.get('/cabinet/admin/referral-network/scope-options');
    return response.data;
  },

  getScopedGraph: async (selections: ScopeSelection[]): Promise<NetworkGraphData> => {
    const campaignIds = selections.filter((s) => s.type === 'campaign').map((s) => s.id);
    const partnerIds = selections.filter((s) => s.type === 'partner').map((s) => s.id);
    const userIds = selections.filter((s) => s.type === 'user').map((s) => s.id);

    const response = await apiClient.get('/cabinet/admin/referral-network/scoped', {
      params: {
        campaign_ids: campaignIds,
        partner_ids: partnerIds,
        user_ids: userIds,
      },
      paramsSerializer: {
        indexes: null,
      },
    });
    return response.data;
  },

  getUserDetail: async (userId: number): Promise<NetworkUserDetail> => {
    const response = await apiClient.get(`/cabinet/admin/referral-network/user/${userId}`);
    return response.data;
  },

  getCampaignDetail: async (campaignId: number): Promise<NetworkCampaignDetail> => {
    const response = await apiClient.get(`/cabinet/admin/referral-network/campaign/${campaignId}`);
    return response.data;
  },

  search: async (query: string): Promise<NetworkSearchResult> => {
    const response = await apiClient.get('/cabinet/admin/referral-network/search', {
      params: { q: query },
    });
    return response.data;
  },
};
