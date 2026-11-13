import { expect, it, vi } from 'vitest';
const calls = vi.hoisted(() => ({
  get: vi.fn().mockResolvedValue({ data: {} }),
  post: vi.fn().mockResolvedValue({ data: {} }),
}));
vi.mock('./client', () => ({ default: calls, apiClient: calls }));
import { subscriptionApi } from './subscription';
it('separates daily quote, explicit immutable debit and offline receipt lookup', async () => {
  const operation = '11111111-1111-4111-8111-111111111111';
  await subscriptionApi.quoteSplitDailyResume(11);
  expect(calls.get).toHaveBeenLastCalledWith('/cabinet/subscription/split-daily/quote', {
    params: { subscription_id: 11 },
  });
  await subscriptionApi.confirmSplitDailyResume({
    subscription_id: 11,
    operation_id: operation,
    expected_price_kopeks: 100,
    expected_terms_hash: 'a'.repeat(64),
  });
  expect(calls.post).toHaveBeenLastCalledWith('/cabinet/subscription/split-daily/confirm', {
    subscription_id: 11,
    operation_id: operation,
    expected_price_kopeks: 100,
    expected_terms_hash: 'a'.repeat(64),
  });
  await subscriptionApi.getSplitDailyResumeResult(11, operation);
  expect(calls.get).toHaveBeenLastCalledWith('/cabinet/subscription/split-daily/result', {
    params: { subscription_id: 11, operation_id: operation },
  });
  expect(calls.post).toHaveBeenCalledTimes(1);
});

it('provides daily confirmation copy at the subscription root in all supported locales', async () => {
  for (const language of ['ru', 'en', 'fa', 'zh']) {
    const locale = await import(`../locales/${language}.json`);
    for (const key of [
      'title',
      'estimatedEnd',
      'consent',
      'pending',
      'confirm',
      'check',
      'retryConfirm',
      'complete',
    ]) {
      expect(typeof locale.default.subscription.splitDaily[key]).toBe('string');
      expect(locale.default.subscription.splitDaily[key].length).toBeGreaterThan(0);
    }
  }
});
