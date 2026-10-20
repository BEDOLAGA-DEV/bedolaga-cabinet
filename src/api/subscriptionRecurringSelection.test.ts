import { beforeEach, expect, it, vi } from 'vitest';

const post = vi.hoisted(() => vi.fn().mockResolvedValue({ data: { subscription_id: 10 } }));
vi.mock('./client', () => ({ default: { post } }));
import { subscriptionApi } from './subscription';
beforeEach(() => post.mockClear());

it.each([
  ['purchaseWithSbpRecurring', 'platega'],
  ['purchaseWithLavaRecurring', 'lava'],
  ['purchaseWithCasheraRecurring', 'cashera'],
] as const)('%s forwards the selected subscription to the backend', async (method, provider) => {
  await subscriptionApi[method](1, 10);
  expect(post).toHaveBeenCalledWith(
    `/cabinet/subscription/${provider}-recurrent/purchase`,
    {},
    {
      params: { tariff_id: 1, subscription_id: 10 },
    },
  );
});
