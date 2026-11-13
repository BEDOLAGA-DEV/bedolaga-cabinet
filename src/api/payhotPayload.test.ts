import { afterEach, expect, it, vi } from 'vitest';
import { balanceApi } from './balance';
import apiClient from './client';
vi.mock('./client', () => ({ default: { post: vi.fn(async () => ({ data: {} })) } }));
vi.mock('../i18n', () => ({ default: { language: 'ru' } }));
afterEach(() => vi.clearAllMocks());
it('sends the payer phone only for SberPay, leaving principal amount unchanged', async () => {
  await balanceApi.createTopUp(50000, 'payhot', 'sberpay', undefined, ' +79990000000 ');
  expect(apiClient.post).toHaveBeenCalledWith('/cabinet/balance/topup', {
    amount_kopeks: 50000,
    payment_method: 'payhot',
    payment_option: 'sberpay',
    payment_phone: '+79990000000',
    language: 'ru',
  });
});
it.each(['card', 'sbp', 'crypto', 'applepay', 'googlepay'])(
  'does not leak a previous phone to %s',
  async (option) => {
    await balanceApi.createTopUp(50000, 'payhot', option, undefined, '+79990000000');
    expect(apiClient.post).toHaveBeenCalledWith(
      '/cabinet/balance/topup',
      expect.not.objectContaining({ payment_phone: expect.anything() }),
    );
  },
);
