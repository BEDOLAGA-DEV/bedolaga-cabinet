import apiClient from './client'

// ==================== TYPES ====================

export interface WheelPrize {
  id: number
  display_name: string
  emoji: string
  color: string
  prize_type: string
}

export interface WheelConfig {
  is_enabled: boolean
  name: string
  spin_cost_stars: number | null
  spin_cost_days: number | null
  spin_cost_stars_enabled: boolean
  spin_cost_days_enabled: boolean
  prizes: WheelPrize[]
  daily_limit: number
  user_spins_today: number
  can_spin: boolean
  can_spin_reason: string | null
  can_pay_stars: boolean
  can_pay_days: boolean
  user_balance_kopeks: number
  required_balance_kopeks: number
}

export interface SpinAvailability {
  can_spin: boolean
  reason: string | null
  spins_remaining_today: number
  can_pay_stars: boolean
  can_pay_days: boolean
  min_subscription_days: number
  user_subscription_days: number
}

export interface SpinResult {
  success: boolean
  prize_id: number | null
  prize_type: string | null
  prize_value: number
  prize_display_name: string
  emoji: string
  color: string
  rotation_degrees: number
  message: string
  promocode: string | null
  error: string | null
}

export interface SpinHistoryItem {
  id: number
  payment_type: string
  payment_amount: number
  prize_type: string
  prize_value: number
  prize_display_name: string
  emoji: string
  color: string
  prize_value_kopeks: number
  created_at: string
}

export interface SpinHistoryResponse {
  items: SpinHistoryItem[]
  total: number
  page: number
  per_page: number
  pages: number
}

export interface StarsInvoiceResponse {
  invoice_url: string
  stars_amount: number
}

// Admin types
export interface WheelPrizeAdmin {
  id: number
  config_id: number
  prize_type: string
  prize_value: number
  display_name: string
  emoji: string
  color: string
  prize_value_kopeks: number
  sort_order: number
  manual_probability: number | null
  is_active: boolean
  promo_balance_bonus_kopeks: number
  promo_subscription_days: number
  promo_traffic_gb: number
  created_at: string | null
  updated_at: string | null
}

// Type for creating a new prize (excludes id, config_id which are auto-generated)
export interface CreateWheelPrizeData {
  prize_type: string
  prize_value: number
  display_name: string
  emoji?: string
  color?: string
  prize_value_kopeks: number
  sort_order?: number
  manual_probability?: number | null
  is_active?: boolean
  promo_balance_bonus_kopeks?: number
  promo_subscription_days?: number
  promo_traffic_gb?: number
}

export interface AdminWheelConfig {
  id: number
  is_enabled: boolean
  name: string
  spin_cost_stars: number
  spin_cost_days: number
  spin_cost_stars_enabled: boolean
  spin_cost_days_enabled: boolean
  rtp_percent: number
  daily_spin_limit: number
  min_subscription_days_for_day_payment: number
  promo_prefix: string
  promo_validity_days: number
  prizes: WheelPrizeAdmin[]
  created_at: string | null
  updated_at: string | null
}

export interface WheelStatistics {
  total_spins: number
  total_revenue_kopeks: number
  total_payout_kopeks: number
  actual_rtp_percent: number
  configured_rtp_percent: number
  spins_by_payment_type: Record<string, { count: number; total_kopeks: number }>
  prizes_distribution: Array<{
    prize_type: string
    display_name: string
    count: number
    total_kopeks: number
  }>
  top_wins: Array<{
    user_id: number
    username: string | null
    prize_display_name: string
    prize_value_kopeks: number
    created_at: string | null
  }>
  period_from: string | null
  period_to: string | null
}

export interface AdminSpinItem {
  id: number
  user_id: number
  username: string | null
  payment_type: string
  payment_amount: number
  payment_value_kopeks: number
  prize_type: string
  prize_value: number
  prize_display_name: string
  prize_value_kopeks: number
  is_applied: boolean
  created_at: string
}

export interface AdminSpinsResponse {
  items: AdminSpinItem[]
  total: number
  page: number
  per_page: number
  pages: number
}

// ==================== USER API ====================

export const wheelApi = {
  // Get wheel config
  getConfig: async (): Promise<WheelConfig> => {
    const response = await apiClient.get<WheelConfig>('/cabinet/wheel/config')
    return response.data
  },

  // Check spin availability
  checkAvailability: async (): Promise<SpinAvailability> => {
    const response = await apiClient.get<SpinAvailability>('/cabinet/wheel/availability')
    return response.data
  },

  // Spin the wheel
  spin: async (paymentType: 'telegram_stars' | 'subscription_days'): Promise<SpinResult> => {
    const response = await apiClient.post<SpinResult>('/cabinet/wheel/spin', {
      payment_type: paymentType,
    })
    return response.data
  },

  // Get spin history
  getHistory: async (page = 1, perPage = 20): Promise<SpinHistoryResponse> => {
    const response = await apiClient.get<SpinHistoryResponse>('/cabinet/wheel/history', {
      params: { page, per_page: perPage },
    })
    return response.data
  },

  // Create Stars invoice for Mini App payment
  createStarsInvoice: async (): Promise<StarsInvoiceResponse> => {
    const response = await apiClient.post<StarsInvoiceResponse>('/cabinet/wheel/stars-invoice')
    return response.data
  },
}

// ==================== ADMIN API ====================

export const adminWheelApi = {
  // Get full config
  getConfig: async (): Promise<AdminWheelConfig> => {
    const response = await apiClient.get<AdminWheelConfig>('/cabinet/admin/wheel/config')
    return response.data
  },

  // Update config
  updateConfig: async (data: Partial<AdminWheelConfig>): Promise<AdminWheelConfig> => {
    const response = await apiClient.put<AdminWheelConfig>('/cabinet/admin/wheel/config', data)
    return response.data
  },

  // Get prizes
  getPrizes: async (): Promise<WheelPrizeAdmin[]> => {
    const response = await apiClient.get<WheelPrizeAdmin[]>('/cabinet/admin/wheel/prizes')
    return response.data
  },

  // Create prize
  createPrize: async (data: CreateWheelPrizeData): Promise<WheelPrizeAdmin> => {
    const response = await apiClient.post<WheelPrizeAdmin>('/cabinet/admin/wheel/prizes', data)
    return response.data
  },

  // Update prize
  updatePrize: async (prizeId: number, data: Partial<WheelPrizeAdmin>): Promise<WheelPrizeAdmin> => {
    const response = await apiClient.put<WheelPrizeAdmin>(`/cabinet/admin/wheel/prizes/${prizeId}`, data)
    return response.data
  },

  // Delete prize
  deletePrize: async (prizeId: number): Promise<void> => {
    await apiClient.delete(`/cabinet/admin/wheel/prizes/${prizeId}`)
  },

  // Reorder prizes
  reorderPrizes: async (prizeIds: number[]): Promise<void> => {
    await apiClient.post('/cabinet/admin/wheel/prizes/reorder', { prize_ids: prizeIds })
  },

  // Get statistics
  getStatistics: async (dateFrom?: string, dateTo?: string): Promise<WheelStatistics> => {
    const response = await apiClient.get<WheelStatistics>('/cabinet/admin/wheel/statistics', {
      params: { date_from: dateFrom, date_to: dateTo },
    })
    return response.data
  },

  // Get all spins
  getSpins: async (params?: {
    user_id?: number
    date_from?: string
    date_to?: string
    page?: number
    per_page?: number
  }): Promise<AdminSpinsResponse> => {
    const response = await apiClient.get<AdminSpinsResponse>('/cabinet/admin/wheel/spins', {
      params,
    })
    return response.data
  },
}
