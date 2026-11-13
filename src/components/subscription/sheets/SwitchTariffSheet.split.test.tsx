// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AxiosError } from 'axios';
import { resetSafeStorage } from '@/utils/safeStorage';
import { SwitchTariffSheet } from './SwitchTariffSheet';

const state = vi.hoisted(() => ({
  preview: vi.fn(),
  switch: vi.fn(),
  close: vi.fn(),
  userId: 5 as number | null,
  fallback: vi.fn(),
  daily: false,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
vi.mock('../../../store/auth', () => ({
  useAuthStore: (select: (s: unknown) => unknown) =>
    select({ user: state.userId === null ? null : { id: state.userId } }),
}));
vi.mock('../../../hooks/useCurrency', () => ({
  useCurrency: () => ({ formatAmount: String, currencySymbol: '₽' }),
}));
vi.mock('../../../hooks/usePromoDiscount', () => ({
  usePromoDiscount: () => ({ applyPromoDiscount: (v: number) => v }),
}));
vi.mock('../../../api/subscription', () => ({
  subscriptionApi: { previewTariffSwitch: state.preview, switchTariff: state.switch },
}));
const quote = {
  can_switch: true,
  current_tariff_id: 2,
  current_tariff_name: 'Source',
  new_tariff_id: 9,
  new_tariff_name: 'Target',
  remaining_days: 20,
  upgrade_cost_kopeks: 1200,
  upgrade_cost_label: '',
  balance_kopeks: 5000,
  balance_label: '',
  has_enough_balance: true,
  missing_amount_kopeks: 0,
  missing_amount_label: '',
  is_upgrade: true,
  traffic_accounting_mode: 'split',
  expected_terms_hash: 'a'.repeat(64),
  expected_end_date: '2026-12-01T00:00:00Z',
};
function mount(subscriptionId = 11) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <SwitchTariffSheet
          open
          tariffId={9}
          subscriptionId={subscriptionId}
          tariffs={
            state.daily ? [{ id: 9, is_daily: true, daily_price_kopeks: 99999 } as never] : []
          }
          subscription={
            state.daily
              ? ({ id: subscriptionId, is_daily: true, traffic_accounting_mode: 'split' } as never)
              : undefined
          }
          onClose={state.close}
          onExpiredFallback={state.fallback}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  sessionStorage.clear();
  vi.resetAllMocks();
  state.userId = 5;
  state.daily = false;
  state.preview.mockResolvedValue(quote);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  resetSafeStorage();
});
it('shows both confirmed traffic limits without depending on the current catalogue', async () => {
  state.preview.mockResolvedValue({
    ...quote,
    split_limits: {
      ordinary: { mode: 'unlimited', limit_gb: 0 },
      bs: { mode: 'finite', limit_gb: 10 },
    },
    device_limit: 4,
  });
  mount();
  expect(await screen.findByText('subscription.splitTraffic.ordinary')).toBeTruthy();
  expect(screen.getByText('subscription.splitTraffic.bs')).toBeTruthy();
  expect(screen.getByText('subscription.splitTraffic.unlimited')).toBeTruthy();
  expect(screen.getAllByText('subscription.devices')).toHaveLength(2);
});
it('replays the original paid confirmation after remount even when fresh preview rejects the already-switched tariff', async () => {
  state.switch
    .mockRejectedValueOnce(new Error('Lost response'))
    .mockResolvedValueOnce({ delivery_pending: false });
  const first = mount();
  fireEvent.click(await screen.findByRole('button', { name: 'subscription.switchTariff.confirm' }));
  await waitFor(() => expect(state.switch).toHaveBeenCalledTimes(1));
  expect(state.switch.mock.calls[0]).toEqual([
    9,
    11,
    {
      operation_id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      expected_price_kopeks: 1200,
      expected_terms_hash: 'a'.repeat(64),
    },
  ]);
  first.unmount();
  state.preview.mockRejectedValue(new Error('Already current'));
  mount();
  const check = await screen.findByRole('button', { name: 'subscription.switchTariff.check' });
  expect(state.preview).toHaveBeenCalledTimes(1);
  fireEvent.click(check);
  await waitFor(() => expect(state.close).toHaveBeenCalledTimes(1));
  expect(state.switch.mock.calls[1]).toEqual(state.switch.mock.calls[0]);
});
it('keeps the same operation when delivery is pending and only closes after verified delivery', async () => {
  state.switch
    .mockResolvedValueOnce({ delivery_pending: true })
    .mockResolvedValueOnce({ delivery_pending: false });
  mount();
  fireEvent.click(await screen.findByRole('button', { name: 'subscription.switchTariff.confirm' }));
  await screen.findByText('subscription.switchTariff.pending');
  expect(state.close).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'subscription.switchTariff.check' }));
  await waitFor(() => expect(state.close).toHaveBeenCalledTimes(1));
  expect(state.switch.mock.calls[1]).toEqual(state.switch.mock.calls[0]);
});

it('does not replay a different subscription confirmation', async () => {
  state.switch.mockRejectedValue(new Error('Lost response'));
  const first = mount();
  fireEvent.click(await screen.findByRole('button', { name: 'subscription.switchTariff.confirm' }));
  await waitFor(() => expect(state.switch).toHaveBeenCalledTimes(1));
  first.unmount();
  mount(22);
  expect(
    await screen.findByRole('button', { name: 'subscription.switchTariff.confirm' }),
  ).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'subscription.switchTariff.check' })).toBeNull();
});
it('does not send a charge if the confirmation cannot survive reload', async () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Quota');
  });
  mount();
  fireEvent.click(await screen.findByRole('button', { name: 'subscription.switchTariff.confirm' }));
  await screen.findByText('subscription.splitPurchase.storageUnavailable');
  expect(state.switch).not.toHaveBeenCalled();
});
it('replaces a definitively stale quote only after a new explicit confirmation', async () => {
  state.preview.mockResolvedValueOnce(quote).mockResolvedValue({
    ...quote,
    upgrade_cost_kopeks: 1500,
    expected_terms_hash: 'b'.repeat(64),
  });
  state.switch
    .mockRejectedValueOnce(httpError(409, 'split_switch_quote_changed'))
    .mockResolvedValueOnce({ delivery_pending: false });
  mount();
  fireEvent.click(await screen.findByRole('button', { name: 'subscription.switchTariff.confirm' }));
  await screen.findByText('subscription.switchTariff.quoteChanged');
  await screen.findByText(/^15\s₽$/);
  expect(state.switch).toHaveBeenCalledTimes(1);
  expect(sessionStorage.getItem('cabinet:tariff-switch:5:11')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'subscription.switchTariff.confirm' }));
  await waitFor(() => expect(state.close).toHaveBeenCalledTimes(1));
  expect(state.switch.mock.calls[1]).toEqual([
    9,
    11,
    {
      operation_id: expect.any(String),
      expected_price_kopeks: 1500,
      expected_terms_hash: 'b'.repeat(64),
    },
  ]);
  expect(state.switch.mock.calls[1][2].operation_id).not.toBe(
    state.switch.mock.calls[0][2].operation_id,
  );
});
it('does not offer confirmation for a split quote without fixed terms', async () => {
  state.preview.mockResolvedValue({ ...quote, expected_terms_hash: undefined });
  mount();
  await screen.findByText('subscription.switchTariff.previewError');
  expect(screen.queryByRole('button', { name: 'subscription.switchTariff.confirm' })).toBeNull();
});

function httpError(status: number, code: string) {
  return new AxiosError('Request failed', undefined, undefined, undefined, {
    status,
    data: { detail: { code } },
    headers: {},
    statusText: '',
    config: {} as never,
  });
}
it.each([
  [409, 'split_switch_unavailable'],
  [409, 'conflict'],
  [402, 'insufficient_funds'],
  [503, 'split_switch_quote_changed'],
])('preserves the exact confirmation after HTTP %s / %s', async (status, code) => {
  state.switch
    .mockRejectedValueOnce(httpError(status, code))
    .mockResolvedValueOnce({ delivery_pending: false });
  const first = mount();
  fireEvent.click(await screen.findByRole('button', { name: 'subscription.switchTariff.confirm' }));
  await screen.findByRole('alert');
  expect(sessionStorage.getItem('cabinet:tariff-switch:5:11')).not.toBeNull();
  first.unmount();
  state.preview.mockRejectedValue(new Error('Fresh preview must not gate receipt replay'));
  mount();
  const check = await screen.findByRole('button', { name: 'subscription.switchTariff.check' });
  expect(state.preview).toHaveBeenCalledTimes(1);
  fireEvent.click(check);
  await waitFor(() => expect(state.close).toHaveBeenCalledTimes(1));
  expect(state.switch.mock.calls[1]).toEqual(state.switch.mock.calls[0]);
  expect(sessionStorage.getItem('cabinet:tariff-switch:5:11')).toBeNull();
});
it('isolates persisted confirmations across logout and another account, then restores the original account', async () => {
  state.switch.mockRejectedValue(new Error('Lost response'));
  const first = mount();
  fireEvent.click(await screen.findByRole('button', { name: 'subscription.switchTariff.confirm' }));
  await screen.findByRole('alert');
  const original = state.switch.mock.calls[0];
  first.unmount();
  state.userId = null;
  const loggedOut = mount();
  fireEvent.click(await screen.findByRole('button', { name: 'subscription.switchTariff.confirm' }));
  await screen.findByText('subscription.splitPurchase.storageUnavailable');
  expect(state.switch).toHaveBeenCalledTimes(1);
  loggedOut.unmount();
  state.userId = 6;
  const otherAccount = mount();
  fireEvent.click(await screen.findByRole('button', { name: 'subscription.switchTariff.confirm' }));
  await screen.findByRole('alert');
  expect(state.switch.mock.calls[1][2].operation_id).not.toBe(original[2].operation_id);
  expect(sessionStorage.getItem('cabinet:tariff-switch:5:11')).not.toBeNull();
  expect(sessionStorage.getItem('cabinet:tariff-switch:6:11')).not.toBeNull();
  otherAccount.unmount();
  state.userId = 5;
  mount();
  fireEvent.click(await screen.findByRole('button', { name: 'subscription.switchTariff.check' }));
  await waitFor(() => expect(state.switch).toHaveBeenCalledTimes(3));
  expect(state.switch.mock.calls[2]).toEqual(original);
});

it('blocks confirmation of the old price while a definitively changed quote refreshes', async () => {
  let finishQuote: (value: typeof quote) => void = () => {};
  const fresh = new Promise<typeof quote>((resolve) => {
    finishQuote = resolve;
  });
  state.preview.mockResolvedValueOnce(quote).mockReturnValueOnce(fresh);
  state.switch.mockRejectedValueOnce(httpError(409, 'split_switch_quote_changed'));
  mount();
  fireEvent.click(await screen.findByRole('button', { name: 'subscription.switchTariff.confirm' }));
  await screen.findByText('subscription.switchTariff.quoteChanged');
  expect(
    (screen.getByRole('button', { name: 'subscription.switchTariff.confirm' }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  finishQuote({ ...quote, upgrade_cost_kopeks: 1500, expected_terms_hash: 'b'.repeat(64) });
  await screen.findByText(/^15\s₽$/);
  await waitFor(() =>
    expect(
      (
        screen.getByRole('button', {
          name: 'subscription.switchTariff.confirm',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false),
  );
});

const dailyQuote = {
  ...quote,
  billing_kind: 'daily',
  source_daily_rate_kopeks: 1000,
  target_daily_rate_kopeks: 1500,
  paid_window_end: '2026-11-14T12:30:00Z',
  expected_end_date: '2026-11-14T12:30:00Z',
  upgrade_cost_kopeks: 217,
};
it('shows the server daily rate, preserved paid time and exact prorated debit', async () => {
  state.daily = true;
  state.preview.mockResolvedValue(dailyQuote);
  mount();
  await screen.findByText('subscription.switchTariff.dailyPaidUntil');
  expect(screen.getByText(/subscription.switchTariff.nextDailyPayment/)).toBeTruthy();
  expect(screen.getByText(/^15\s₽$/)).toBeTruthy();
  expect(screen.getByText(/^2.17\s₽$/)).toBeTruthy();
  expect(screen.queryByText('subscription.switchTariff.toDailyTerm')).toBeNull();
  expect(screen.queryByText('subscription.switchTariff.remainingDays')).toBeNull();
});
it.each([
  { billing_kind: null },
  { target_daily_rate_kopeks: null },
  { source_daily_rate_kopeks: null },
  { paid_window_end: null },
  { traffic_accounting_mode: null },
])('fails closed for daily split quote missing proof %j', async (missing) => {
  state.daily = true;
  state.preview.mockResolvedValue({ ...dailyQuote, ...missing });
  mount();
  await screen.findByText('subscription.switchTariff.previewError');
  expect(screen.queryByRole('button', { name: 'subscription.switchTariff.confirm' })).toBeNull();
  expect(state.switch).not.toHaveBeenCalled();
  expect(state.fallback).not.toHaveBeenCalled();
});
it('keeps a zero-cost daily switch operation for exact network replay', async () => {
  state.daily = true;
  state.preview.mockResolvedValue({
    ...dailyQuote,
    upgrade_cost_kopeks: 0,
    target_daily_rate_kopeks: 0,
  });
  state.switch
    .mockRejectedValueOnce(new Error('Lost response'))
    .mockResolvedValueOnce({ delivery_pending: false });
  const first = mount();
  fireEvent.click(await screen.findByRole('button', { name: 'subscription.switchTariff.confirm' }));
  await screen.findByRole('alert');
  const original = state.switch.mock.calls[0];
  expect(original[2].expected_price_kopeks).toBe(0);
  first.unmount();
  mount();
  fireEvent.click(await screen.findByRole('button', { name: 'subscription.switchTariff.check' }));
  await waitFor(() => expect(state.close).toHaveBeenCalledTimes(1));
  expect(state.switch.mock.calls[1]).toEqual(original);
});
it('requires fresh consent when a daily boundary changes the quote', async () => {
  state.daily = true;
  state.preview.mockResolvedValueOnce(dailyQuote).mockResolvedValue({
    ...dailyQuote,
    upgrade_cost_kopeks: 500,
    paid_window_end: '2026-11-15T12:30:00Z',
    expected_end_date: '2026-11-15T12:30:00Z',
    expected_terms_hash: 'b'.repeat(64),
  });
  state.switch.mockRejectedValueOnce(httpError(409, 'split_switch_quote_changed'));
  mount();
  fireEvent.click(await screen.findByRole('button', { name: 'subscription.switchTariff.confirm' }));
  await screen.findByText('subscription.switchTariff.quoteChanged');
  await screen.findByText(/^5\s₽$/);
  expect(state.switch).toHaveBeenCalledTimes(1);
  expect(state.fallback).not.toHaveBeenCalled();
});
