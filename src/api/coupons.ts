import apiClient from './client';

// ============== Types ==============

export interface CouponBatch {
  id: number;
  name: string;
  tariff_id: number | null;
  tariff_name: string | null;
  period_days: number;
  coupons_total: number;
  wholesale_price_kopeks: number;
  valid_until: string | null;
  is_revoked: boolean;
  created_at: string;
  active_count: number;
  redeemed_count: number;
  revoked_count: number;
}

export interface CouponBatchListResponse {
  items: CouponBatch[];
  total: number;
  limit: number;
  offset: number;
}

export interface CouponBatchCreateRequest {
  name: string;
  tariff_id: number;
  period_days: number;
  coupons_count: number;
  wholesale_price_kopeks?: number;
  valid_days?: number;
}

export interface CouponBatchCreated extends CouponBatch {
  links: string[];
  tokens: string[];
}

export interface CouponBatchLinks {
  batch_id: number;
  count: number;
  links: string[];
  tokens: string[];
}

export interface CouponBatchRevokeResponse {
  revoked_count: number;
  batch: CouponBatch;
}

export interface CouponRedeemResponse {
  success: boolean;
  tariff_name: string;
  period_days: number;
  renewed: boolean;
  end_date: string | null;
}

export interface CouponStatus {
  tariff_name: string;
  period_days: number;
  valid_until: string | null;
  bot_link: string | null;
}

// ============== API ==============

export const couponsApi = {
  // Admin: batches
  getBatches: async (params?: {
    limit?: number;
    offset?: number;
  }): Promise<CouponBatchListResponse> => {
    const response = await apiClient.get('/cabinet/admin/coupons', { params });
    return response.data;
  },

  getBatch: async (id: number): Promise<CouponBatch> => {
    const response = await apiClient.get(`/cabinet/admin/coupons/${id}`);
    return response.data;
  },

  createBatch: async (data: CouponBatchCreateRequest): Promise<CouponBatchCreated> => {
    const response = await apiClient.post('/cabinet/admin/coupons', data);
    return response.data;
  },

  getBatchLinks: async (id: number): Promise<CouponBatchLinks> => {
    const response = await apiClient.get(`/cabinet/admin/coupons/${id}/links`);
    return response.data;
  },

  revokeBatch: async (id: number): Promise<CouponBatchRevokeResponse> => {
    const response = await apiClient.post(`/cabinet/admin/coupons/${id}/revoke`);
    return response.data;
  },

  // User: redeem a coupon for the current cabinet user
  redeemCoupon: async (token: string): Promise<CouponRedeemResponse> => {
    const response = await apiClient.post('/cabinet/coupon/redeem', { token });
    return response.data;
  },

  // Public: coupon info by token (no auth)
  getCouponStatus: async (token: string): Promise<CouponStatus> => {
    const response = await apiClient.get(`/cabinet/coupon/${token}/status`);
    return response.data;
  },
};
