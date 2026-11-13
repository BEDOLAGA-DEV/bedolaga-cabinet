import { expect, it, vi } from 'vitest';
const post = vi.hoisted(() => vi.fn().mockResolvedValue({ data: {} }));
vi.mock('./client', () => ({ default: { post }, apiClient: { post } }));
import { subscriptionApi } from './subscription';
it('sends the fixed split confirmation to the owned subscription endpoint', async () => {
  await subscriptionApi.switchTariff(9, 11, {
    operation_id: '11111111-1111-4111-8111-111111111111',
    expected_price_kopeks: 1200,
    expected_terms_hash: 'a'.repeat(64),
  });
  expect(post).toHaveBeenLastCalledWith(
    '/cabinet/subscription/tariff/switch',
    expect.objectContaining({
      tariff_id: 9,
      period_days: 30,
      operation_id: '11111111-1111-4111-8111-111111111111',
      expected_price_kopeks: 1200,
      expected_terms_hash: 'a'.repeat(64),
    }),
    { params: { subscription_id: 11 } },
  );
});
