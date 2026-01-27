import apiClient from './client';
import type { PaymentMethodConfig, PromoGroupSimple } from '../types';

export const adminPaymentMethodsApi = {
  getAll: async (): Promise<PaymentMethodConfig[]> => {
    const response = await apiClient.get<PaymentMethodConfig[]>('/cabinet/admin/payment-methods');
    return response.data;
  },

  getOne: async (methodId: string): Promise<PaymentMethodConfig> => {
    const response = await apiClient.get<PaymentMethodConfig>(
      `/cabinet/admin/payment-methods/${methodId}`,
    );
    return response.data;
  },

  update: async (methodId: string, data: Record<string, unknown>): Promise<PaymentMethodConfig> => {
    const response = await apiClient.put<PaymentMethodConfig>(
      `/cabinet/admin/payment-methods/${methodId}`,
      data,
    );
    return response.data;
  },

  updateOrder: async (methodIds: string[]): Promise<void> => {
    await apiClient.put('/cabinet/admin/payment-methods/order', { method_ids: methodIds });
  },

  getPromoGroups: async (): Promise<PromoGroupSimple[]> => {
    const response = await apiClient.get<PromoGroupSimple[]>(
      '/cabinet/admin/payment-methods/promo-groups',
    );
    return response.data;
  },
};
