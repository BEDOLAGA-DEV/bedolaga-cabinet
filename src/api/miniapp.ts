export interface MiniappCreatePaymentPayload {
  initData: string
  method: string
  amountKopeks?: number | null
  option?: string | null
}

export interface MiniappCreatePaymentResponse {
  payment_url: string
  amount_kopeks?: number
  extra?: Record<string, unknown>
}

export const miniappApi = {
  // Create payment inside Telegram Mini App (same flow as miniapp/index.html)
  createPayment: async (
    payload: MiniappCreatePaymentPayload
  ): Promise<MiniappCreatePaymentResponse> => {
    const res = await fetch('/miniapp/payments/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        initData: payload.initData || '',
        method: payload.method,
        amountKopeks: payload.amountKopeks ?? null,
        option: payload.option ?? null,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const message = (data && (data.detail || data.message)) || 'Failed to create payment'
      throw new Error(String(message))
    }
    return data as MiniappCreatePaymentResponse
  },
}
