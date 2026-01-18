import apiClient from './client'

// ============== Types ==============

export interface PromoOfferUserInfo {
  id: number
  telegram_id: number
  username: string | null
  first_name: string | null
  last_name: string | null
  full_name: string | null
}

export interface PromoOfferSubscriptionInfo {
  id: number
  status: string
  is_trial: boolean
  start_date: string
  end_date: string
  autopay_enabled: boolean
}

export interface PromoOffer {
  id: number
  user_id: number
  subscription_id: number | null
  notification_type: string
  discount_percent: number
  bonus_amount_kopeks: number
  expires_at: string
  claimed_at: string | null
  is_active: boolean
  effect_type: string
  extra_data: Record<string, any>
  created_at: string
  updated_at: string
  user: PromoOfferUserInfo | null
  subscription: PromoOfferSubscriptionInfo | null
}

export interface PromoOfferListResponse {
  items: PromoOffer[]
  total: number
  limit: number
  offset: number
}

export interface PromoOfferBroadcastRequest {
  notification_type: string
  valid_hours: number
  discount_percent?: number
  bonus_amount_kopeks?: number
  effect_type?: string
  extra_data?: Record<string, any>
  target?: string
  user_id?: number
  telegram_id?: number
}

export interface PromoOfferBroadcastResponse {
  created_offers: number
  user_ids: number[]
  target: string | null
}

export interface PromoOfferTemplate {
  id: number
  name: string
  offer_type: string
  message_text: string
  button_text: string
  valid_hours: number
  discount_percent: number
  bonus_amount_kopeks: number
  active_discount_hours: number | null
  test_duration_hours: number | null
  test_squad_uuids: string[]
  is_active: boolean
  created_by: number | null
  created_at: string
  updated_at: string
}

export interface PromoOfferTemplateListResponse {
  items: PromoOfferTemplate[]
}

export interface PromoOfferTemplateUpdateRequest {
  name?: string
  message_text?: string
  button_text?: string
  valid_hours?: number
  discount_percent?: number
  bonus_amount_kopeks?: number
  active_discount_hours?: number
  test_duration_hours?: number
  test_squad_uuids?: string[]
  is_active?: boolean
}

export interface PromoOfferLogOfferInfo {
  id: number
  notification_type: string | null
  discount_percent: number | null
  bonus_amount_kopeks: number | null
  effect_type: string | null
  expires_at: string | null
  claimed_at: string | null
  is_active: boolean | null
}

export interface PromoOfferLog {
  id: number
  user_id: number | null
  offer_id: number | null
  action: string
  source: string | null
  percent: number | null
  effect_type: string | null
  details: Record<string, any>
  created_at: string
  user: PromoOfferUserInfo | null
  offer: PromoOfferLogOfferInfo | null
}

export interface PromoOfferLogListResponse {
  items: PromoOfferLog[]
  total: number
  limit: number
  offset: number
}

// Target segments for broadcast
export const TARGET_SEGMENTS = {
  all: 'Все пользователи',
  active: 'Активные подписчики',
  trial: 'Триал пользователи',
  trial_ending: 'Заканчивается триал',
  expiring: 'Заканчивается подписка',
  expired: 'Истекшая подписка',
  zero: 'Нулевой баланс',
  autopay_failed: 'Ошибка автоплатежа',
  low_balance: 'Низкий баланс',
  inactive_30d: 'Неактивны 30 дней',
  inactive_60d: 'Неактивны 60 дней',
  inactive_90d: 'Неактивны 90 дней',
  custom_today: 'Зарегистрированы сегодня',
  custom_week: 'Зарегистрированы за неделю',
  custom_month: 'Зарегистрированы за месяц',
  custom_active_today: 'Активны сегодня',
} as const

export type TargetSegment = keyof typeof TARGET_SEGMENTS

// Offer type configurations
export const OFFER_TYPE_CONFIG = {
  test_access: {
    icon: '🧪',
    label: 'Тестовый доступ',
    effect: 'test_access',
    description: 'Временный доступ к дополнительным серверам',
  },
  extend_discount: {
    icon: '💎',
    label: 'Скидка на продление',
    effect: 'percent_discount',
    description: 'Скидка для текущих подписчиков',
  },
  purchase_discount: {
    icon: '🎯',
    label: 'Скидка на покупку',
    effect: 'percent_discount',
    description: 'Скидка для новых пользователей',
  },
} as const

export type OfferType = keyof typeof OFFER_TYPE_CONFIG

// ============== API ==============

export const promoOffersApi = {
  // Get list of promo offers
  getOffers: async (params?: {
    limit?: number
    offset?: number
    user_id?: number
    is_active?: boolean
  }): Promise<PromoOfferListResponse> => {
    const response = await apiClient.get('/cabinet/admin/promo-offers', { params })
    return response.data
  },

  // Broadcast offer to multiple users
  broadcastOffer: async (data: PromoOfferBroadcastRequest): Promise<PromoOfferBroadcastResponse> => {
    const response = await apiClient.post('/cabinet/admin/promo-offers/broadcast', data)
    return response.data
  },

  // Get promo offer logs
  getLogs: async (params?: {
    limit?: number
    offset?: number
    user_id?: number
    action?: string
  }): Promise<PromoOfferLogListResponse> => {
    const response = await apiClient.get('/cabinet/admin/promo-offers/logs', { params })
    return response.data
  },

  // Get all templates
  getTemplates: async (): Promise<PromoOfferTemplateListResponse> => {
    const response = await apiClient.get('/cabinet/admin/promo-offers/templates')
    return response.data
  },

  // Get single template
  getTemplate: async (id: number): Promise<PromoOfferTemplate> => {
    const response = await apiClient.get(`/cabinet/admin/promo-offers/templates/${id}`)
    return response.data
  },

  // Update template
  updateTemplate: async (id: number, data: PromoOfferTemplateUpdateRequest): Promise<PromoOfferTemplate> => {
    const response = await apiClient.patch(`/cabinet/admin/promo-offers/templates/${id}`, data)
    return response.data
  },
}
