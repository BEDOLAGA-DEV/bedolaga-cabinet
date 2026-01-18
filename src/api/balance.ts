import apiClient from './client'
import type { Balance, Transaction, PaymentMethod, PaginatedResponse, PendingPayment, ManualCheckResponse } from '../types'

export const balanceApi = {
  // Get current balance
  getBalance: async (): Promise<Balance> => {
    const response = await apiClient.get<Balance>('/cabinet/balance')
    return response.data
  },

  // Get transaction history
  getTransactions: async (params?: {
    page?: number
    per_page?: number
    type?: string
  }): Promise<PaginatedResponse<Transaction>> => {
    const response = await apiClient.get<PaginatedResponse<Transaction>>('/cabinet/balance/transactions', {
      params,
    })
    return response.data
  },

  // Get available payment methods
  getPaymentMethods: async (): Promise<PaymentMethod[]> => {
    const response = await apiClient.get<PaymentMethod[]>('/cabinet/balance/payment-methods')
    return response.data
  },

  // Create top-up payment
  createTopUp: async (amountKopeks: number, paymentMethod: string, paymentOption?: string): Promise<{
    payment_id: string
    payment_url: string
    amount_kopeks: number
    amount_rubles: number
    status: string
    expires_at: string | null
  }> => {
    const payload: {
      amount_kopeks: number
      payment_method: string
      payment_option?: string
    } = {
      amount_kopeks: amountKopeks,
      payment_method: paymentMethod,
    }
    if (paymentOption) {
      payload.payment_option = paymentOption
    }
    const response = await apiClient.post('/cabinet/balance/topup', payload)
    return response.data
  },

  // Activate promo code
  activatePromocode: async (code: string): Promise<{
    success: boolean
    message: string
    balance_before: number
    balance_after: number
    bonus_description: string | null
  }> => {
    const response = await apiClient.post('/cabinet/promocode/activate', { code })
    return response.data
  },

  // Create Telegram Stars invoice for Mini App balance top-up
  createStarsInvoice: async (amountKopeks: number): Promise<{
    invoice_url: string
    stars_amount?: number
    amount_kopeks?: number
  }> => {
    const response = await apiClient.post('/cabinet/balance/stars-invoice', {
      amount_kopeks: amountKopeks,
    })
    return response.data
  },

  // Get pending payments for manual verification
  getPendingPayments: async (params?: {
    page?: number
    per_page?: number
  }): Promise<PaginatedResponse<PendingPayment>> => {
    const response = await apiClient.get<PaginatedResponse<PendingPayment>>('/cabinet/balance/pending-payments', {
      params,
    })
    return response.data
  },

  // Get specific pending payment details
  getPendingPayment: async (method: string, paymentId: number): Promise<PendingPayment> => {
    const response = await apiClient.get<PendingPayment>(`/cabinet/balance/pending-payments/${method}/${paymentId}`)
    return response.data
  },

  // Manually check payment status
  checkPaymentStatus: async (method: string, paymentId: number): Promise<ManualCheckResponse> => {
    const response = await apiClient.post<ManualCheckResponse>(`/cabinet/balance/pending-payments/${method}/${paymentId}/check`)
    return response.data
  },
}

