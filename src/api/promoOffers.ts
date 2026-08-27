import apiClient from './client';

// ============== Types ==============

export interface PromoOfferUserInfo {
  id: number;
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
}

export interface PromoOfferSubscriptionInfo {
  id: number;
  status: string;
  is_trial: boolean;
  start_date: string;
  end_date: string;
  autopay_enabled: boolean;
}

export interface PromoOffer {
  id: number;
  user_id: number;
  subscription_id: number | null;
  notification_type: string;
  discount_percent: number;
  bonus_amount_kopeks: number;
  expires_at: string;
  claimed_at: string | null;
  is_active: boolean;
  effect_type: string;
  // Dynamic extra data from backend - shape depends on effect_type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extra_data: Record<string, any>;
  created_at: string;
  updated_at: string;
  user: PromoOfferUserInfo | null;
  subscription: PromoOfferSubscriptionInfo | null;
}

export interface PromoOfferListResponse {
  items: PromoOffer[];
  total: number;
  limit: number;
  offset: number;
}

export interface PromoOfferBroadcastRequest {
  notification_type: string;
  valid_hours: number;
  discount_percent?: number;
  bonus_amount_kopeks?: number;
  effect_type?: string;
  extra_data?: Record<string, unknown>;
  target?: string;
  user_id?: number;
  telegram_id?: number;
  // Telegram notification options
  send_notification?: boolean;
  message_text?: string;
  button_text?: string;
}

export interface PromoOfferBroadcastResponse {
  created_offers: number;
  user_ids: number[];
  target: string | null;
  /** Счётчики email-уведомлений; доставка в Telegram отслеживается через broadcast_id */
  notifications_sent: number;
  notifications_failed: number;
  /** Запись рассылки с прогрессом доставки в Telegram (null — слать было некому) */
  broadcast_id: number | null;
  telegram_recipients: number;
}

export interface PromoOfferSegment {
  key: string;
  count: number;
}

export interface PromoOfferSegmentListResponse {
  segments: PromoOfferSegment[];
}

export interface PromoOfferTemplate {
  id: number;
  name: string;
  offer_type: string;
  message_text: string;
  button_text: string;
  valid_hours: number;
  discount_percent: number;
  bonus_amount_kopeks: number;
  active_discount_hours: number | null;
  test_duration_hours: number | null;
  test_squad_uuids: string[];
  is_active: boolean;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface PromoOfferTemplateListResponse {
  items: PromoOfferTemplate[];
}

export interface PromoOfferTemplateUpdateRequest {
  name?: string;
  message_text?: string;
  button_text?: string;
  valid_hours?: number;
  discount_percent?: number;
  bonus_amount_kopeks?: number;
  active_discount_hours?: number;
  test_duration_hours?: number;
  test_squad_uuids?: string[];
  is_active?: boolean;
}

export interface PromoOfferLogOfferInfo {
  id: number;
  notification_type: string | null;
  discount_percent: number | null;
  bonus_amount_kopeks: number | null;
  effect_type: string | null;
  expires_at: string | null;
  claimed_at: string | null;
  is_active: boolean | null;
}

export interface PromoOfferLog {
  id: number;
  user_id: number | null;
  offer_id: number | null;
  action: string;
  source: string | null;
  percent: number | null;
  effect_type: string | null;
  details: Record<string, unknown>;
  created_at: string;
  user: PromoOfferUserInfo | null;
  offer: PromoOfferLogOfferInfo | null;
}

export interface PromoOfferLogListResponse {
  items: PromoOfferLog[];
  total: number;
  limit: number;
  offset: number;
}

// Target segments for broadcast
export const TARGET_SEGMENTS = {
  all: 'admin.promoOffers.segments.all',
  active: 'admin.promoOffers.segments.active',
  trial: 'admin.promoOffers.segments.trial',
  trial_ending: 'admin.promoOffers.segments.trialEnding',
  expiring: 'admin.promoOffers.segments.expiring',
  expired: 'admin.promoOffers.segments.expired',
  zero: 'admin.promoOffers.segments.zero',
  autopay_failed: 'admin.promoOffers.segments.autopayFailed',
  low_balance: 'admin.promoOffers.segments.lowBalance',
  inactive_30d: 'admin.promoOffers.segments.inactive30d',
  inactive_60d: 'admin.promoOffers.segments.inactive60d',
  inactive_90d: 'admin.promoOffers.segments.inactive90d',
  custom_today: 'admin.promoOffers.segments.customToday',
  custom_week: 'admin.promoOffers.segments.customWeek',
  custom_month: 'admin.promoOffers.segments.customMonth',
  custom_active_today: 'admin.promoOffers.segments.customActiveToday',
} as const;

export type TargetSegment = keyof typeof TARGET_SEGMENTS;

// Offer type configurations
export const OFFER_TYPE_CONFIG = {
  test_access: {
    icon: '🧪',
    labelKey: 'admin.promoOffers.offerType.testAccess',
    effect: 'test_access',
    descriptionKey: 'admin.promoOffers.offerType.testAccessDesc',
  },
  extend_discount: {
    icon: '💎',
    labelKey: 'admin.promoOffers.offerType.extendDiscount',
    effect: 'percent_discount',
    descriptionKey: 'admin.promoOffers.offerType.extendDiscountDesc',
  },
  purchase_discount: {
    icon: '🎯',
    labelKey: 'admin.promoOffers.offerType.purchaseDiscount',
    effect: 'percent_discount',
    descriptionKey: 'admin.promoOffers.offerType.purchaseDiscountDesc',
  },
} as const;

export type OfferType = keyof typeof OFFER_TYPE_CONFIG;

// ============== API ==============

export const promoOffersApi = {
  // Get list of promo offers
  getOffers: async (params?: {
    limit?: number;
    offset?: number;
    user_id?: number;
    is_active?: boolean;
  }): Promise<PromoOfferListResponse> => {
    const response = await apiClient.get('/cabinet/admin/promo-offers', { params });
    return response.data;
  },

  // Broadcast offer to multiple users
  broadcastOffer: async (
    data: PromoOfferBroadcastRequest,
  ): Promise<PromoOfferBroadcastResponse> => {
    const response = await apiClient.post('/cabinet/admin/promo-offers/broadcast', data);
    return response.data;
  },

  // Get recipient counts per target segment
  getSegments: async (): Promise<PromoOfferSegmentListResponse> => {
    const response = await apiClient.get('/cabinet/admin/promo-offers/segments');
    return response.data;
  },

  // Get promo offer logs
  getLogs: async (params?: {
    limit?: number;
    offset?: number;
    user_id?: number;
    action?: string;
  }): Promise<PromoOfferLogListResponse> => {
    const response = await apiClient.get('/cabinet/admin/promo-offers/logs', { params });
    return response.data;
  },

  // Get all templates
  getTemplates: async (): Promise<PromoOfferTemplateListResponse> => {
    const response = await apiClient.get('/cabinet/admin/promo-offers/templates');
    return response.data;
  },

  // Get single template
  getTemplate: async (id: number): Promise<PromoOfferTemplate> => {
    const response = await apiClient.get(`/cabinet/admin/promo-offers/templates/${id}`);
    return response.data;
  },

  // Update template
  updateTemplate: async (
    id: number,
    data: PromoOfferTemplateUpdateRequest,
  ): Promise<PromoOfferTemplate> => {
    const response = await apiClient.patch(`/cabinet/admin/promo-offers/templates/${id}`, data);
    return response.data;
  },
};
