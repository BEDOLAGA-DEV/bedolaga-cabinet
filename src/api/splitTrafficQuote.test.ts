import { expect, it, vi } from 'vitest';

const post = vi.hoisted(() => vi.fn());
vi.mock('./client', () => ({ default: { post } }));
import { subscriptionApi } from './subscription';

it('requests a quote for the explicit subscription and traffic group', async () => {
  const quote = { subscription_id: 42, group: 'bs', gb: 10, price_kopeks: 2500 };
  post.mockResolvedValueOnce({ data: quote });
  expect(await subscriptionApi.getSplitTrafficQuote(42, 'bs', 10)).toEqual(quote);
  expect(post).toHaveBeenCalledWith(
    '/cabinet/subscription/traffic/split-quote',
    { group: 'bs', gb: 10 },
    { params: { subscription_id: 42 } },
  );
});
