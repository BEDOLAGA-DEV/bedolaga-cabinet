import { beforeEach, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({
  post: vi.fn(async () => ({ data: {} })),
  get: vi.fn(async () => ({ data: {} })),
}));
vi.mock('./client', () => ({ default: api }));
import { subscriptionApi } from './subscription';
beforeEach(() => vi.clearAllMocks());
it('quotes the exact existing subscription and keeps zero/unlimited devices', async () => {
  const body = {
    tariff_id: null,
    subscription_id: 42,
    period_days: 10000,
    device_limit: 0,
    payment_method: 'sbp' as const,
  };
  await subscriptionApi.quotePayHotRecurring(body);
  expect(api.post).toHaveBeenCalledWith('/cabinet/subscription/payhot-recurrent/quote', body);
});
it('submits quote and checkout identity without charging on GET', async () => {
  await subscriptionApi.purchasePayHotRecurring('quote-1', 'checkout-1');
  expect(api.post).toHaveBeenCalledWith('/cabinet/subscription/payhot-recurrent/purchase', {
    quote_id: 'quote-1',
    checkout_id: 'checkout-1',
  });
});
it.each([undefined, 8])('reads and cancels the exact target for admin=%s', async (admin) => {
  await subscriptionApi.getPayHotRecurring(42, admin);
  await subscriptionApi.cancelPayHotRecurring(42, admin);
  const path = admin
    ? '/cabinet/admin/users/8/subscriptions/42/payhot-recurring'
    : '/cabinet/subscription/payhot-recurrent';
  expect(api.get).toHaveBeenCalledWith(path, { params: { subscription_id: 42 } });
  expect(api.post).toHaveBeenCalledWith(`${path}/cancel`, null, {
    params: { subscription_id: 42 },
  });
});
