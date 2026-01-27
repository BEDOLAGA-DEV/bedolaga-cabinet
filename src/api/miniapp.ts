import axios, { AxiosError } from 'axios';

export interface MiniappCreatePaymentPayload {
  initData: string;
  method: string;
  amountKopeks?: number | null;
  option?: string | null;
}

export interface MiniappCreatePaymentResponse {
  payment_url: string;
  amount_kopeks?: number;
  extra?: Record<string, unknown>;
}

export const miniappApi = {
  // Create payment inside Telegram Mini App (same flow as miniapp/index.html)
  createPayment: async (
    payload: MiniappCreatePaymentPayload,
  ): Promise<MiniappCreatePaymentResponse> => {
    try {
      const response = await axios.post<MiniappCreatePaymentResponse>(
        '/miniapp/payments/create',
        {
          initData: payload.initData || '',
          method: payload.method,
          amountKopeks: payload.amountKopeks ?? null,
          option: payload.option ?? null,
        },
        {
          headers: { 'Content-Type': 'application/json' },
        },
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ detail?: string; message?: string }>;
      const message =
        axiosError.response?.data?.detail ||
        axiosError.response?.data?.message ||
        'Failed to create payment';
      throw new Error(message);
    }
  },
};
