import apiClient from './client';
import type { AnimationConfig } from '@/components/ui/backgrounds/types';

// ============================================================
// Public types
// ============================================================

export interface LandingFeature {
  icon: string;
  title: string;
  description: string;
}

export interface LandingTariffPeriod {
  days: number;
  label: string;
  price_kopeks: number;
  price_label: string;
  original_price_kopeks: number | null;
  original_price_label: string | null;
  discount_percent: number | null;
}

export interface LandingTariff {
  id: number;
  name: string;
  description: string | null;
  traffic_limit_gb: number;
  device_limit: number;
  tier_level: number;
  periods: LandingTariffPeriod[];
}

export interface LandingPaymentMethodSubOption {
  id: string;
  name: string;
}

/** Payment method as returned by the public landing config API */
export interface LandingPaymentMethod {
  method_id: string;
  display_name: string;
  description: string | null;
  icon_url: string | null;
  sort_order: number;
  min_amount_kopeks: number | null;
  max_amount_kopeks: number | null;
  currency: string | null;
  sub_options: LandingPaymentMethodSubOption[] | null;
}

/** Payment method as stored/returned by the admin landing API (sub_options is a dict) */
export interface AdminLandingPaymentMethod {
  method_id: string;
  display_name: string;
  description: string | null;
  icon_url: string | null;
  sort_order: number;
  min_amount_kopeks: number | null;
  max_amount_kopeks: number | null;
  currency: string | null;
  return_url: string | null;
  sub_options: Record<string, boolean> | null;
}

/** Editable fields on a payment method in the landing editor */
export type EditableMethodField =
  | 'display_name'
  | 'description'
  | 'icon_url'
  | 'min_amount_kopeks'
  | 'max_amount_kopeks'
  | 'currency'
  | 'return_url';

export interface LandingDiscountInfo {
  percent: number;
  ends_at: string; // ISO datetime
  badge_text: string | null;
}

export interface LandingConfig {
  slug: string;
  title: string;
  subtitle: string | null;
  features: LandingFeature[];
  footer_text: string | null;
  tariffs: LandingTariff[];
  payment_methods: LandingPaymentMethod[];
  gift_enabled: boolean;
  custom_css: string | null;
  meta_title: string | null;
  meta_description: string | null;
  discount: LandingDiscountInfo | null;
  background_config: AnimationConfig | null;
}

export interface PurchaseRequest {
  tariff_id: number;
  period_days: number;
  contact_type: 'email' | 'telegram';
  contact_value: string;
  payment_method: string;
  is_gift: boolean;
  gift_recipient_type?: 'email' | 'telegram';
  gift_recipient_value?: string;
  gift_message?: string;
}

export interface PurchaseResponse {
  purchase_token: string;
  payment_url: string;
}

export interface PurchaseStatus {
  status: 'pending' | 'paid' | 'delivered' | 'pending_activation' | 'failed' | 'expired';
  subscription_url: string | null;
  subscription_crypto_link: string | null;
  is_gift: boolean;
  contact_value: string | null;
  recipient_contact_value: string | null;
  period_days: number | null;
  tariff_name: string | null;
  gift_message: string | null;
  contact_type: 'email' | 'telegram' | null;
  cabinet_email: string | null;
  cabinet_password: string | null;
  auto_login_token: string | null;
  recipient_in_bot: boolean | null;
  bot_link: string | null;
}

// ============================================================
// Locale helpers
// ============================================================

/** Locale dict for multi-language text fields (admin API) */
export type LocaleDict = Record<string, string>;

/** Supported locales for the admin editor */
export const SUPPORTED_LOCALES = ['ru', 'en', 'zh', 'fa'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_META: Record<SupportedLocale, { flag: string; name: string; rtl: boolean }> = {
  ru: { flag: '\u{1F1F7}\u{1F1FA}', name: 'RU', rtl: false },
  en: { flag: '\u{1F1EC}\u{1F1E7}', name: 'EN', rtl: false },
  zh: { flag: '\u{1F1E8}\u{1F1F3}', name: 'ZH', rtl: false },
  fa: { flag: '\u{1F1EE}\u{1F1F7}', name: 'FA', rtl: true },
};

// ============================================================
// Admin types
// ============================================================

/** Admin feature type with localized title/description */
export interface AdminLandingFeature {
  icon: string;
  title: LocaleDict;
  description: LocaleDict;
}

export interface LandingListItem {
  id: number;
  slug: string;
  title: LocaleDict;
  is_active: boolean;
  display_order: number;
  gift_enabled: boolean;
  tariff_count: number;
  method_count: number;
  purchase_stats: {
    total: number;
    pending: number;
    paid: number;
    delivered: number;
    pending_activation: number;
    failed: number;
    expired: number;
  };
  created_at: string | null;
  updated_at: string | null;
  has_active_discount: boolean;
}

export interface LandingDetail {
  id: number;
  slug: string;
  title: LocaleDict;
  subtitle: LocaleDict | null;
  is_active: boolean;
  features: AdminLandingFeature[];
  footer_text: LocaleDict | null;
  allowed_tariff_ids: number[];
  allowed_periods: Record<string, number[]>;
  payment_methods: AdminLandingPaymentMethod[];
  gift_enabled: boolean;
  custom_css: string | null;
  meta_title: LocaleDict | null;
  meta_description: LocaleDict | null;
  display_order: number;
  created_at: string | null;
  updated_at: string | null;
  discount_percent: number | null;
  discount_overrides: Record<string, number> | null;
  discount_starts_at: string | null;
  discount_ends_at: string | null;
  discount_badge_text: LocaleDict | null;
  background_config: AnimationConfig | null;
}

export interface LandingCreateRequest {
  slug: string;
  title: LocaleDict;
  subtitle?: LocaleDict;
  is_active?: boolean;
  features?: AdminLandingFeature[];
  footer_text?: LocaleDict;
  allowed_tariff_ids?: number[];
  allowed_periods?: Record<string, number[]>;
  payment_methods?: AdminLandingPaymentMethod[];
  gift_enabled?: boolean;
  custom_css?: string;
  meta_title?: LocaleDict;
  meta_description?: LocaleDict;
  discount_percent?: number | null;
  discount_overrides?: Record<string, number> | null;
  discount_starts_at?: string | null;
  discount_ends_at?: string | null;
  discount_badge_text?: LocaleDict | null;
  background_config?: AnimationConfig | null;
}

export type LandingUpdateRequest = Partial<LandingCreateRequest>;

/**
 * Normalize a value that might be a plain string (old API) or a LocaleDict.
 * If it's a string, wraps it as `{ ru: value }`.
 * If null/undefined, returns the fallback.
 */
/** Extract best display string from a LocaleDict: ru → en → first available → '' */
export function resolveLocaleDisplay(dict: LocaleDict | string | null | undefined): string {
  if (!dict) return '';
  if (typeof dict === 'string') return dict;
  return dict.ru || dict.en || Object.values(dict).find((v) => v?.trim()) || '';
}

export function toLocaleDict(
  value: string | LocaleDict | null | undefined,
  fallback: LocaleDict = {},
): LocaleDict {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value ? { ru: value } : fallback;
  return value;
}

// ============================================================
// Public API
// ============================================================

export const landingApi = {
  getConfig: async (slug: string, lang?: string): Promise<LandingConfig> => {
    const params = lang ? `?lang=${lang}` : '';
    const response = await apiClient.get(`/cabinet/landing/${slug}${params}`);
    return response.data;
  },

  createPurchase: async (slug: string, data: PurchaseRequest): Promise<PurchaseResponse> => {
    const response = await apiClient.post(`/cabinet/landing/${slug}/purchase`, data);
    return response.data;
  },

  getPurchaseStatus: async (token: string): Promise<PurchaseStatus> => {
    const response = await apiClient.get(`/cabinet/landing/purchase/${token}`);
    return response.data;
  },

  activatePurchase: async (token: string): Promise<PurchaseStatus> => {
    const response = await apiClient.post(`/cabinet/landing/activate/${token}`);
    return response.data;
  },
};

// ============================================================
// Admin stats types
// ============================================================

export interface LandingDailyStat {
  date: string;
  purchases: number;
  revenue_kopeks: number;
  gifts: number;
}

export interface LandingTariffStat {
  tariff_id: number | null;
  tariff_name: string;
  purchases: number;
  revenue_kopeks: number;
}

export interface LandingStatsResponse {
  total_purchases: number;
  total_revenue_kopeks: number;
  total_gifts: number;
  total_regular: number;
  avg_purchase_kopeks: number;
  total_created: number;
  total_successful: number;
  conversion_rate: number;
  daily_stats: LandingDailyStat[];
  tariff_stats: LandingTariffStat[];
}

// ============================================================
// Admin purchase list types
// ============================================================

export type PurchaseItemStatus =
  | 'pending'
  | 'paid'
  | 'delivered'
  | 'pending_activation'
  | 'failed'
  | 'expired';

export interface LandingPurchaseItem {
  id: number;
  token: string;
  contact_type: 'email' | 'telegram';
  contact_value: string;
  is_gift: boolean;
  gift_recipient_type: 'email' | 'telegram' | null;
  gift_recipient_value: string | null;
  tariff_name: string;
  period_days: number;
  amount_kopeks: number;
  currency: string;
  payment_method: string;
  status: PurchaseItemStatus;
  created_at: string;
  paid_at: string | null;
}

export interface LandingPurchaseListResponse {
  items: LandingPurchaseItem[];
  total: number;
}

// ============================================================
// Admin API
// ============================================================

export const adminLandingsApi = {
  list: async (): Promise<LandingListItem[]> => {
    const response = await apiClient.get('/cabinet/admin/landings');
    return response.data;
  },

  get: async (id: number): Promise<LandingDetail> => {
    const response = await apiClient.get(`/cabinet/admin/landings/${id}`);
    return response.data;
  },

  create: async (data: LandingCreateRequest): Promise<LandingDetail> => {
    const response = await apiClient.post('/cabinet/admin/landings', data);
    return response.data;
  },

  update: async (id: number, data: LandingUpdateRequest): Promise<LandingDetail> => {
    const response = await apiClient.put(`/cabinet/admin/landings/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<{ success: boolean }> => {
    const response = await apiClient.delete(`/cabinet/admin/landings/${id}`);
    return response.data;
  },

  toggle: async (id: number): Promise<LandingDetail> => {
    const response = await apiClient.post(`/cabinet/admin/landings/${id}/toggle`);
    return response.data;
  },

  reorder: async (landingIds: number[]): Promise<void> => {
    await apiClient.put('/cabinet/admin/landings/order', { landing_ids: landingIds });
  },

  getStats: async (id: number): Promise<LandingStatsResponse> => {
    const response = await apiClient.get(`/cabinet/admin/landings/${id}/stats`);
    return response.data;
  },

  getPurchases: async (
    id: number,
    offset: number,
    limit: number,
    status?: PurchaseItemStatus,
  ): Promise<LandingPurchaseListResponse> => {
    const params: Record<string, string | number> = { offset, limit };
    if (status) params.status = status;
    const response = await apiClient.get(`/cabinet/admin/landings/${id}/purchases`, { params });
    return response.data;
  },
};
