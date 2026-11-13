import { expect, it, vi } from 'vitest';

const post = vi.hoisted(() => vi.fn().mockResolvedValue({ data: {} }));
vi.mock('./client', () => ({ default: { post }, apiClient: { post } }));
vi.mock('../utils/renewalOperation', () => ({
  renewalOperationId: () => '11111111-1111-4111-8111-111111111111',
}));
import { subscriptionApi } from './subscription';

it('sends the operation and the displayed subscription snapshot', async () => {
  await subscriptionApi.renewSubscription(30, 7, '2026-12-01T00:00:00Z');
  expect(post.mock.calls[0][0]).toBe('/cabinet/subscription/renew');
  expect(post.mock.calls[0][1]).toMatchObject({
    period_days: 30,
    operation_id: '11111111-1111-4111-8111-111111111111',
    expected_end_date: '2026-12-01T00:00:00Z',
  });
});

it('sends a persisted split confirmation with its original expiry and price', async () => {
  const operationId = '22222222-2222-4222-8222-222222222222';
  await subscriptionApi.renewSubscription(30, 7, '2026-12-01T00:00:00Z', {
    operationId,
    expectedPriceKopeks: 2500,
  });
  expect(post).toHaveBeenLastCalledWith(
    '/cabinet/subscription/renew',
    expect.objectContaining({
      operation_id: operationId,
      expected_end_date: '2026-12-01T00:00:00Z',
      expected_price_kopeks: 2500,
    }),
    { params: { subscription_id: 7 } },
  );
});
