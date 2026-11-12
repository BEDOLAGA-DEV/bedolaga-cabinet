import { expect, it, vi } from 'vitest';

const get = vi.hoisted(() => vi.fn());
vi.mock('./client', () => ({ default: { get } }));
import { subscriptionApi } from './subscription';

it('keeps exact byte strings and requests only the selected subscription', async () => {
  const summary = {
    subscription_id: 42,
    calculated_at: '2030-01-01T00:00:00Z',
    grace_active: false,
    groups: {
      ordinary: {
        mode: 'unlimited',
        remaining_bytes: null,
        pending_bytes: '0',
        pending_operations: 0,
        needs_review: false,
      },
      bs: {
        mode: 'finite',
        remaining_bytes: '9007199254740993',
        pending_bytes: '123',
        pending_operations: 1,
        needs_review: false,
      },
    },
  };
  get.mockResolvedValueOnce({ data: summary });
  expect(await subscriptionApi.getSplitTrafficSummary(42)).toEqual(summary);
  expect(get).toHaveBeenCalledWith('/cabinet/subscription/traffic/split-summary', {
    params: { subscription_id: 42 },
  });
});
