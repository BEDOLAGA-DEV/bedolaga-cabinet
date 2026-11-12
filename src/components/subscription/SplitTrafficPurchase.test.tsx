// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import SplitTrafficPurchase from './SplitTrafficPurchase';
import { resetSafeStorage } from '@/utils/safeStorage';

const api = vi.hoisted(() => ({ getSplitTrafficQuote: vi.fn(), purchaseSplitTraffic: vi.fn() }));
vi.mock('@/api/subscription', () => ({ subscriptionApi: api }));
vi.mock('@/utils/format', () => ({ formatPrice: (v: number) => String(v) }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } }),
}));
afterEach(() => {
  cleanup();
  resetSafeStorage();
  vi.restoreAllMocks();
  sessionStorage.clear();
  vi.clearAllMocks();
});
const quote = { subscription_id: 42, group: 'bs', gb: 10, price_kopeks: 2000, missing_kopeks: 0 };
function show() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <SplitTrafficPurchase subscriptionId={42} packages={[{ group: 'bs', gb: 10 }]} />
    </QueryClientProvider>,
  );
}
async function preview() {
  api.getSplitTrafficQuote.mockResolvedValue(quote);
  fireEvent.change(screen.getByRole('combobox'), { target: { value: '0' } });
  fireEvent.click(screen.getByText('subscription.splitPurchase.quote'));
  await screen.findByText('subscription.splitPurchase.confirm');
}
it('reuses the operation after an unknown transport result and remount', async () => {
  api.purchaseSplitTraffic.mockRejectedValueOnce(new Error('private'));
  const first = show();
  await preview();
  fireEvent.click(screen.getByText('subscription.splitPurchase.confirm'));
  await screen.findByText('subscription.splitPurchase.retry');
  const sent = api.purchaseSplitTraffic.mock.calls[0];
  first.unmount();
  show();
  api.purchaseSplitTraffic.mockResolvedValue({ subscription_id: 42, delivery_status: 'pending' });
  fireEvent.click(screen.getByText('subscription.splitPurchase.check'));
  await screen.findByText('subscription.splitPurchase.pending');
  expect(api.purchaseSplitTraffic.mock.calls[1]).toEqual(sent);
  expect(JSON.parse(sessionStorage.getItem('split-purchase:42') ?? 'null').key).toBe(
    sent[1].operation_key,
  );
  api.purchaseSplitTraffic.mockResolvedValue({ subscription_id: 42, delivery_status: 'verified' });
  fireEvent.click(screen.getByText('subscription.splitPurchase.check'));
  await screen.findByText('subscription.splitPurchase.success');
  expect(api.purchaseSplitTraffic.mock.calls[2]).toEqual(sent);
  expect(sessionStorage.getItem('split-purchase:42')).toBeNull();
});
it('requires a new quote when server rejects changed terms', async () => {
  api.purchaseSplitTraffic.mockRejectedValue({ response: { status: 409 } });
  show();
  await preview();
  fireEvent.click(screen.getByText('subscription.splitPurchase.confirm'));
  await screen.findByText('subscription.splitPurchase.quoteError');
  expect(screen.queryByText('subscription.splitPurchase.confirm')).toBeNull();
  expect(sessionStorage.getItem('split-purchase:42')).toBeNull();
});
it('does not offer payment with insufficient balance', async () => {
  show();
  api.getSplitTrafficQuote.mockResolvedValue({ ...quote, missing_kopeks: 100 });
  fireEvent.change(screen.getByRole('combobox'), { target: { value: '0' } });
  fireEvent.click(screen.getByText('subscription.splitPurchase.quote'));
  await waitFor(() =>
    expect(screen.getByText('subscription.splitPurchase.confirm').hasAttribute('disabled')).toBe(
      true,
    ),
  );
  expect(api.purchaseSplitTraffic).not.toHaveBeenCalled();
});

it('does not send money request when confirmation cannot survive reload', async () => {
  show();
  await preview();
  const denied = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Blocked', 'SecurityError');
  });
  fireEvent.click(screen.getByText('subscription.splitPurchase.confirm'));
  await screen.findByText('subscription.splitPurchase.storageUnavailable');
  expect(api.purchaseSplitTraffic).not.toHaveBeenCalled();
  denied.mockRestore();
});
