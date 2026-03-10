import apiClient from './client';

// Types

export interface GiftTariffPeriod {
  days: number;
  price_kopeks: number;
  price_label: string;
  original_price_kopeks: number | null;
  discount_percent: number | null;
}

export interface GiftTariff {
  id: number;
  name: string;
  description: string | null;
  traffic_limit_gb: number;
  device_limit: number;
  periods: GiftTariffPeriod[];
}

export interface GiftPaymentMethodSubOption {
  id: string;
  name: string;
}

export interface GiftPaymentMethod {
  method_id: string;
  display_name: string;
  description: string | null;
  icon_url: string | null;
  min_amount_kopeks: number | null;
  max_amount_kopeks: number | null;
  sub_options: GiftPaymentMethodSubOption[] | null;
}

export interface GiftConfig {
  is_enabled: boolean;
  tariffs: GiftTariff[];
  payment_methods: GiftPaymentMethod[];
  balance_kopeks: number;
  currency_symbol: string;
}

export interface GiftPurchaseRequest {
  tariff_id: number;
  period_days: number;
  recipient_type?: 'email' | 'telegram';
  recipient_value?: string;
  gift_message?: string;
  payment_mode: 'balance' | 'gateway';
  payment_method?: string;
}

export interface GiftPurchaseResponse {
  status: 'ok' | 'created' | 'paid';
  purchase_token: string;
  payment_url: string | null;
  warning: string | null;
}

export type GiftPurchaseStatusValue =
  | 'pending'
  | 'paid'
  | 'delivered'
  | 'pending_activation'
  | 'failed'
  | 'expired';

export interface GiftPurchaseStatus {
  status: GiftPurchaseStatusValue;
  is_gift: boolean;
  is_code_only: boolean;
  purchase_token: string | null;
  recipient_contact_value: string | null;
  gift_message: string | null;
  tariff_name: string | null;
  period_days: number | null;
  warning: string | null;
}

export interface PendingGift {
  token: string;
  tariff_name: string | null;
  period_days: number;
  gift_message: string | null;
  sender_display: string | null;
  created_at: string | null;
}

export interface SentGift {
  token: string;
  tariff_name: string | null;
  period_days: number;
  device_limit: number;
  status: string;
  gift_recipient_value: string | null;
  gift_message: string | null;
  activated_by_username: string | null;
  created_at: string | null;
}

export interface ReceivedGift {
  token: string;
  tariff_name: string | null;
  period_days: number;
  device_limit: number;
  status: string;
  sender_display: string | null;
  gift_message: string | null;
  created_at: string | null;
}

export interface ActivateGiftResponse {
  status: string;
  tariff_name: string | null;
  period_days: number | null;
}

// API

export const giftApi = {
  getConfig: async (): Promise<GiftConfig> => {
    const { data } = await apiClient.get<GiftConfig>('/cabinet/gift/config');
    return data;
  },

  createPurchase: async (request: GiftPurchaseRequest): Promise<GiftPurchaseResponse> => {
    const { data } = await apiClient.post<GiftPurchaseResponse>('/cabinet/gift/purchase', request);
    return data;
  },

  getPurchaseStatus: async (token: string): Promise<GiftPurchaseStatus> => {
    const { data } = await apiClient.get<GiftPurchaseStatus>(`/cabinet/gift/purchase/${token}`);
    return data;
  },

  getPendingGifts: async (): Promise<PendingGift[]> => {
    const { data } = await apiClient.get<PendingGift[]>('/cabinet/gift/pending');
    return data;
  },

  getSentGifts: async (): Promise<SentGift[]> => {
    const { data } = await apiClient.get<SentGift[]>('/cabinet/gift/sent');
    return data;
  },

  getReceivedGifts: async (): Promise<ReceivedGift[]> => {
    const { data } = await apiClient.get<ReceivedGift[]>('/cabinet/gift/received');
    return data;
  },

  activateGiftCode: async (code: string): Promise<ActivateGiftResponse> => {
    const { data } = await apiClient.post<ActivateGiftResponse>('/cabinet/gift/activate', { code });
    return data;
  },
};
