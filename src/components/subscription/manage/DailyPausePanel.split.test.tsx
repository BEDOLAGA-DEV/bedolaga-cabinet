// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AxiosError } from 'axios';
import type { Subscription } from '@/types';
import { resetSafeStorage } from '@/utils/safeStorage';
import { DailyPausePanel } from './DailyPausePanel';
const state = vi.hoisted(() => ({
  quote: vi.fn(),
  confirm: vi.fn(),
  result: vi.fn(),
  pause: vi.fn(),
  userId: 5 as number | null,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
vi.mock('@/store/auth', () => ({
  useAuthStore: (pick: (s: unknown) => unknown) =>
    pick({ user: state.userId ? { id: state.userId } : null }),
}));
vi.mock('@/hooks/useCurrency', () => ({
  useCurrency: () => ({ formatAmount: String, currencySymbol: '₽' }),
}));
vi.mock('@/hooks/useTheme', () => ({ useTheme: () => ({ isDark: true }) }));
vi.mock('@/api/subscription', () => ({
  subscriptionApi: {
    quoteSplitDailyResume: state.quote,
    confirmSplitDailyResume: state.confirm,
    getSplitDailyResumeResult: state.result,
    togglePause: state.pause,
  },
}));
const quote = {
  subscription_id: 11,
  tariff_id: 3,
  tariff_name: 'Daily',
  price_kopeks: 100,
  terms_hash: 'a'.repeat(64),
  old_end_date: '2020-01-01T00:00:00Z',
  intended_end_date: '2027-01-02T00:00:00Z',
  balance_kopeks: 1000,
};
const result = {
  success: true,
  is_paused: false,
  charged_kopeks: 100,
  new_end_date: '2027-01-02T00:00:00Z',
  delivery_pending: false,
  replayed: false,
  balance_kopeks: 900,
};
function failure(code: string, status = 409) {
  return new AxiosError('request failed', undefined, undefined, undefined, {
    status,
    data: { detail: { code } },
  } as never);
}
function mount(overrides: Partial<Subscription> = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <DailyPausePanel
          subscription={
            {
              id: 11,
              is_daily: true,
              is_trial: false,
              traffic_accounting_mode: 'split',
              status: 'expired',
              is_daily_paused: true,
              end_date: quote.old_end_date,
              ...overrides,
            } as Subscription
          }
          subscriptionId={overrides.id ?? 11}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
async function openQuote() {
  fireEvent.click(screen.getByRole('button', { name: 'subscription.pause.resumeBtn' }));
  return screen.findByRole('button', { name: 'subscription.splitDaily.confirm' });
}
beforeEach(() => {
  sessionStorage.clear();
  resetSafeStorage();
  vi.resetAllMocks();
  state.userId = 5;
  state.quote.mockResolvedValue(quote);
  state.confirm.mockResolvedValue(result);
  state.result.mockRejectedValue(failure('daily_resume_receipt_not_found', 404));
  state.pause.mockResolvedValue({ success: true, is_paused: false });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  resetSafeStorage();
});
it('uses quote and explicit consent for expired split instead of legacy pause debit', async () => {
  mount();
  const confirm = await openQuote();
  expect(state.pause).not.toHaveBeenCalled();
  expect(state.confirm).not.toHaveBeenCalled();
  fireEvent.click(confirm);
  await waitFor(() => expect(state.confirm).toHaveBeenCalledTimes(1));
  expect(state.confirm.mock.calls[0][0]).toEqual({
    subscription_id: 11,
    operation_id: expect.stringMatching(/^[0-9a-f-]{36}$/),
    expected_price_kopeks: 100,
    expected_terms_hash: quote.terms_hash,
  });
});
it('free paid-day resume stays explicit and makes no purchase', async () => {
  mount({ status: 'active', end_date: '2099-01-01T00:00:00Z' });
  fireEvent.click(screen.getByRole('button', { name: 'subscription.pause.resumeBtn' }));
  await waitFor(() => expect(state.pause).toHaveBeenCalledWith(11, false));
  expect(state.quote).not.toHaveBeenCalled();
  expect(state.confirm).not.toHaveBeenCalled();
});
it('lost reply restores consent and uses GET before explicit same-UUID retry', async () => {
  state.confirm.mockRejectedValueOnce(new Error('offline'));
  const first = mount();
  fireEvent.click(await openQuote());
  await waitFor(() => expect(state.confirm).toHaveBeenCalledTimes(1));
  const request = state.confirm.mock.calls[0][0];
  first.unmount();
  state.quote.mockRejectedValue(new Error('no quote'));
  mount();
  await waitFor(() => expect(state.result).toHaveBeenCalledWith(11, request.operation_id));
  expect(state.confirm).toHaveBeenCalledTimes(1);
  fireEvent.click(
    await screen.findByRole('button', { name: 'subscription.splitDaily.retryConfirm' }),
  );
  await waitFor(() => expect(state.confirm).toHaveBeenCalledTimes(2));
  expect(state.confirm.mock.calls[1][0]).toEqual(request);
});
it('accepted pending receipt only checks GET after refresh even if subscription is now active', async () => {
  state.confirm.mockResolvedValue({ ...result, delivery_pending: true });
  const first = mount();
  fireEvent.click(await openQuote());
  await screen.findByText('subscription.splitDaily.pending');
  const request = state.confirm.mock.calls[0][0];
  first.unmount();
  state.result.mockResolvedValue({ ...result, delivery_pending: true, replayed: true });
  mount({ status: 'active', is_daily_paused: false, end_date: '2099-01-01T00:00:00Z' });
  await waitFor(() => expect(state.result).toHaveBeenCalledWith(11, request.operation_id));
  fireEvent.click(await screen.findByRole('button', { name: 'subscription.splitDaily.check' }));
  await waitFor(() => expect(state.result.mock.calls.length).toBeGreaterThan(1));
  expect(state.confirm).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('button', { name: 'subscription.splitDaily.retryConfirm' })).toBeNull();
});
it.each(['daily_resume_unavailable', 'unknown_conflict'])(
  'keeps original consent on %s',
  async (code) => {
    state.confirm.mockRejectedValue(failure(code));
    const first = mount();
    fireEvent.click(await openQuote());
    await waitFor(() => expect(state.confirm).toHaveBeenCalledTimes(1));
    const request = state.confirm.mock.calls[0][0];
    first.unmount();
    mount();
    await waitFor(() => expect(state.result).toHaveBeenCalledWith(11, request.operation_id));
    expect(state.quote).toHaveBeenCalledTimes(1);
  },
);
it('does not recover another user or subscription attempt', async () => {
  state.confirm.mockRejectedValue(new Error('offline'));
  const first = mount();
  fireEvent.click(await openQuote());
  await waitFor(() => expect(state.confirm).toHaveBeenCalledTimes(1));
  first.unmount();
  state.result.mockClear();
  state.userId = 6;
  const second = mount();
  expect(state.result).not.toHaveBeenCalled();
  second.unmount();
  state.userId = 5;
  mount({ id: 12 });
  expect(state.result).not.toHaveBeenCalled();
});
it('refuses payment when durable storage fails', async () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  mount();
  fireEvent.click(await openQuote());
  await screen.findByText('subscription.splitDaily.storageError');
  expect(state.confirm).not.toHaveBeenCalled();
});

it('BS-only exhaustion with an active ordinary day offers pause, not another paid day', async () => {
  mount({ status: 'limited', is_daily_paused: false, end_date: '2099-01-01T00:00:00Z' });
  fireEvent.click(screen.getByRole('button', { name: 'subscription.pause.pauseBtn' }));
  await waitFor(() => expect(state.pause).toHaveBeenCalledWith(11, true));
  expect(state.quote).not.toHaveBeenCalled();
  expect(state.confirm).not.toHaveBeenCalled();
});
it('blocks stale quote after quote-changed when fresh preview fails', async () => {
  state.confirm.mockRejectedValue(failure('daily_resume_quote_changed'));
  state.quote.mockResolvedValueOnce(quote).mockRejectedValue(new Error('offline'));
  mount();
  fireEvent.click(await openQuote());
  await screen.findByText('subscription.splitDaily.previewError');
  expect(screen.queryByRole('button', { name: 'subscription.splitDaily.confirm' })).toBeNull();
  expect(state.confirm).toHaveBeenCalledTimes(1);
});
it('free resume requiring payment opens a quote without charging', async () => {
  state.pause.mockRejectedValue(failure('daily_resume_requires_confirmation'));
  mount({ status: 'active', end_date: '2099-01-01T00:00:00Z' });
  fireEvent.click(screen.getByRole('button', { name: 'subscription.pause.resumeBtn' }));
  await screen.findByRole('button', { name: 'subscription.splitDaily.confirm' });
  expect(state.confirm).not.toHaveBeenCalled();
});
it('retains insufficient-balance consent for the same explicit retry', async () => {
  state.confirm.mockRejectedValueOnce(failure('insufficient_balance', 402));
  mount();
  fireEvent.click(await openQuote());
  await screen.findByText('subscription.splitDaily.insufficient');
  const request = state.confirm.mock.calls[0][0];
  fireEvent.click(
    await screen.findByRole('button', { name: 'subscription.splitDaily.retryConfirm' }),
  );
  await waitFor(() => expect(state.confirm).toHaveBeenCalledTimes(2));
  expect(state.confirm.mock.calls[1][0]).toEqual(request);
});
it('does not fetch or submit while logged out', () => {
  state.userId = null;
  mount();
  expect(
    (screen.getByRole('button', { name: 'subscription.pause.resumeBtn' }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  expect(state.quote).not.toHaveBeenCalled();
  expect(state.result).not.toHaveBeenCalled();
  expect(state.confirm).not.toHaveBeenCalled();
});

it.each([409, 503])(
  'cancel failed quote (%s) refreshes subscription and returns free pause without payment',
  async (status) => {
    const expired = {
      id: 11,
      is_daily: true,
      is_trial: false,
      traffic_accounting_mode: 'split',
      status: 'expired',
      is_daily_paused: false,
      end_date: quote.old_end_date,
    } as Subscription;
    const updated = {
      ...expired,
      status: 'active',
      end_date: '2099-01-01T00:00:00Z',
    } as Subscription;
    const getSubscription = vi.fn().mockResolvedValue(updated);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(['subscription', 11], expired);
    client.setQueryData(['subscriptions-list'], [expired]);
    const invalidations = vi.spyOn(client, 'invalidateQueries');
    function CurrentSubscription() {
      const current = useQuery({
        queryKey: ['subscription', 11],
        queryFn: getSubscription,
        staleTime: Infinity,
      });
      return current.data ? (
        <DailyPausePanel subscription={current.data} subscriptionId={11} />
      ) : null;
    }
    state.quote.mockRejectedValue(
      failure(
        status === 409 ? 'daily_resume_unavailable' : 'daily_resume_temporarily_unavailable',
        status,
      ),
    );
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <CurrentSubscription />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'subscription.pause.resumeBtn' }));
    await screen.findByText('subscription.splitDaily.previewError');
    fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }));
    await screen.findByRole('button', { name: 'subscription.pause.pauseBtn' });
    expect(getSubscription).toHaveBeenCalledTimes(1);
    expect(invalidations).toHaveBeenCalledWith({ queryKey: ['subscription'] });
    expect(invalidations).toHaveBeenCalledWith({ queryKey: ['subscriptions-list'] });
    expect(state.confirm).not.toHaveBeenCalled();
    expect(state.pause).not.toHaveBeenCalled();
    expect(screen.queryByText('subscription.splitDaily.previewError')).toBeNull();
  },
);
