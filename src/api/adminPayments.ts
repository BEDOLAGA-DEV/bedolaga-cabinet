import apiClient from './client'
import type { PaginatedResponse, PendingPayment, ManualCheckResponse } from '../types'

export interface PaymentsStats {
  total_pending: number
  by_method: Record<string, number>
}

export const adminPaymentsApi = {
  // Get all pending payments (admin)
  getPendingPayments: async (params?: {
    page?: number
    per_page?: number
    method_filter?: string
  }): Promise<PaginatedResponse<PendingPayment>> => {
    const response = await apiClient.get<PaginatedResponse<PendingPayment>>('/cabinet/admin/payments', {
      params,
    })
    return response.data
  },

  // Get payments statistics
  getStats: async (): Promise<PaymentsStats> => {
    const response = await apiClient.get<PaymentsStats>('/cabinet/admin/payments/stats')
    return response.data
  },

  // Get specific payment details
  getPayment: async (method: string, paymentId: number): Promise<PendingPayment> => {
    const response = await apiClient.get<PendingPayment>(`/cabinet/admin/payments/${method}/${paymentId}`)
    return response.data
  },

  // Manually check payment status
  checkPaymentStatus: async (method: string, paymentId: number): Promise<ManualCheckResponse> => {
    const response = await apiClient.post<ManualCheckResponse>(`/cabinet/admin/payments/${method}/${paymentId}/check`)
    return response.data
  },
}
