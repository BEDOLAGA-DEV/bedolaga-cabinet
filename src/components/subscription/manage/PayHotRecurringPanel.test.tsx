// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, expect, it, vi } from 'vitest';
import { PayHotRecurringPanel } from './PayHotRecurringPanel';
import { PayHotPurchaseButton } from '../purchase/PayHotPurchaseButton';
const api = vi.hoisted(() => ({
  getPayHotRecurring: vi.fn(),
  cancelPayHotRecurring: vi.fn(),
  quotePayHotRecurring: vi.fn(),
  purchasePayHotRecurring: vi.fn(),
}));
vi.mock('@/api/subscription', () => ({ subscriptionApi: api }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'en' },
    t: (key: string, values?: Record<string, unknown>) =>
      key.endsWith('.consent')
        ? `${values?.amount} / ${values?.days}`
        : values?.count !== undefined
          ? `${key}:${values.count}`
          : key,
  }),
}));
vi.mock('@/platform', () => ({ usePlatform: () => ({ platform: 'browser', openLink: vi.fn() }) }));
vi.mock('@/utils/openPaymentUrl', () => ({ openPaymentUrl: vi.fn() }));
function mount(ui: React.ReactNode) {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        })
      }
    >
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
const tariff = {
  id: 3,
  periods: [
    { days: 1, price_kopeks: 100 },
    { days: 10000, price_kopeks: 100000 },
  ],
  custom_days_enabled: true,
  min_days: 1,
  max_days: 10000,
  price_per_day_kopeks: 100,
};
it('does not authorize an old quote after changing the period during its request', async () => {
  api.getPayHotRecurring.mockResolvedValue({ status: 'none', enabled: true, methods: ['card'] });
  let resolveQuote!: (value: unknown) => void;
  api.quotePayHotRecurring.mockReturnValue(
    new Promise((resolve) => {
      resolveQuote = resolve;
    }),
  );
  mount(<PayHotRecurringPanel subscriptionId={42} setupTariff={tariff} />);
  fireEvent.click(await screen.findByText('subscription.payhotRecurring.choose'));
  await waitFor(() => expect(api.quotePayHotRecurring).toHaveBeenCalledOnce());
  fireEvent.click(screen.getByText('subscription.days:10000'));
  await act(async () =>
    resolveQuote({ quote_id: 'old', amount_kopeks: 100, period_days: 1, payment_method: 'card' }),
  );
  await waitFor(() => expect(screen.queryByText('common.loading')).toBeNull());
  expect(screen.queryByText('subscription.payhotRecurring.confirm')).toBeNull();
  expect(screen.getByText('subscription.payhotRecurring.choose')).toBeTruthy();
  expect(api.purchasePayHotRecurring).not.toHaveBeenCalled();
});
it('keeps cancellation visible when operator disables new agreements', async () => {
  api.getPayHotRecurring.mockResolvedValue({
    status: 'ACTIVE',
    enabled: false,
    methods: [],
    amount_kopeks: 12300,
    period_days: 1,
  });
  api.cancelPayHotRecurring.mockResolvedValue({ status: 'CANCEL_PENDING' });
  mount(<PayHotRecurringPanel subscriptionId={42} setupTariff={tariff} />);
  fireEvent.click(await screen.findByText('subscription.payhotRecurring.cancel'));
  await waitFor(() => expect(api.cancelPayHotRecurring).toHaveBeenCalledWith(42, undefined));
  expect(screen.queryByText('subscription.payhotRecurring.choose')).toBeNull();
});
it.each([false, true])(
  'existing inline setup preserves selected subscription, daily=%s',
  async (daily) => {
    api.getPayHotRecurring.mockResolvedValue({ status: 'none', enabled: true, methods: ['sbp'] });
    api.quotePayHotRecurring.mockResolvedValue({
      quote_id: 'quote1',
      amount_kopeks: 12300,
      period_days: daily ? 1 : 10000,
      payment_method: 'sbp',
    });
    mount(
      <PayHotRecurringPanel subscriptionId={42} setupTariff={{ ...tariff, is_daily: daily }} />,
    );
    await screen.findByText('subscription.payhotRecurring.choose');
    if (!daily) fireEvent.click(screen.getByText('subscription.days:10000'));
    fireEvent.click(screen.getByText('subscription.payhotRecurring.choose'));
    await screen.findByText(/123.00/);
    expect(api.quotePayHotRecurring).toHaveBeenCalledWith({
      tariff_id: 3,
      subscription_id: 42,
      period_days: daily ? 1 : 10000,
      device_limit: undefined,
      payment_method: 'sbp',
    });
    expect(api.purchasePayHotRecurring).not.toHaveBeenCalled();
  },
);
it('explicit consent, unlimited devices, same checkout key on uncertain retry, REVIEW blocks new setup', async () => {
  api.quotePayHotRecurring.mockResolvedValue({
    quote_id: 'quote1',
    amount_kopeks: 12300,
    period_days: 1,
    payment_method: 'card',
  });
  api.purchasePayHotRecurring
    .mockRejectedValueOnce(new Error('timeout'))
    .mockResolvedValueOnce({ status: 'REVIEW', subscription_id: 42 });
  mount(
    <PayHotPurchaseButton
      tariffId={3}
      methods={['card', 'sbp']}
      subscriptionId={42}
      periodDays={1}
      deviceLimit={0}
    />,
  );
  fireEvent.click(screen.getByText('subscription.payhotRecurring.choose'));
  await screen.findByText(/123.00/);
  expect(api.quotePayHotRecurring).toHaveBeenCalledWith(
    expect.objectContaining({ device_limit: 0 }),
  );
  expect(api.purchasePayHotRecurring).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('subscription.payhotRecurring.confirm'));
  await screen.findByRole('alert');
  expect(screen.getByText('subscription.payhotRecurring.methods.sbp').matches(':disabled')).toBe(
    true,
  );
  fireEvent.click(screen.getByText('subscription.payhotRecurring.confirm'));
  await screen.findByText('subscription.payhotRecurring.state.REVIEW');
  expect(api.purchasePayHotRecurring.mock.calls[0]).toEqual(
    api.purchasePayHotRecurring.mock.calls[1],
  );
  expect(
    (screen.getByText('subscription.payhotRecurring.confirm') as HTMLButtonElement).disabled,
  ).toBe(true);
});
it('admin can inspect but cannot create and cannot cancel without manage permission', async () => {
  api.getPayHotRecurring.mockResolvedValue({ status: 'ACTIVE', enabled: true, methods: ['card'] });
  mount(
    <PayHotRecurringPanel
      subscriptionId={42}
      adminUserId={8}
      canManage={false}
      setupTariff={tariff}
    />,
  );
  await screen.findByText('subscription.payhotRecurring.state.ACTIVE');
  expect(api.getPayHotRecurring).toHaveBeenCalledWith(42, 8);
  expect(screen.queryByText('subscription.payhotRecurring.choose')).toBeNull();
  expect(screen.queryByText('subscription.payhotRecurring.cancel')).toBeNull();
});
it('unknown status never offers a replacement agreement', async () => {
  api.getPayHotRecurring.mockResolvedValue({
    status: 'UNKNOWN_FUTURE',
    enabled: true,
    methods: ['card'],
  });
  mount(<PayHotRecurringPanel subscriptionId={42} setupTariff={tariff} />);
  await screen.findByRole('status');
  expect(screen.queryByText('subscription.payhotRecurring.choose')).toBeNull();
});

it('recovers unknown creation with the same checkout identity instead of starting another', async () => {
  api.quotePayHotRecurring.mockResolvedValue({
    quote_id: 'quote1',
    amount_kopeks: 100,
    period_days: 1,
    payment_method: 'card',
  });
  api.purchasePayHotRecurring
    .mockResolvedValueOnce({ status: 'CREATING' })
    .mockResolvedValueOnce({ status: 'PENDING', subscription_id: 42 });
  mount(<PayHotPurchaseButton tariffId={3} methods={['card']} periodDays={1} />);
  fireEvent.click(screen.getByText('subscription.payhotRecurring.choose'));
  await screen.findByText('subscription.payhotRecurring.confirm');
  fireEvent.click(screen.getByText('subscription.payhotRecurring.confirm'));
  await screen.findByText('subscription.payhotRecurring.state.CREATING');
  fireEvent.click(screen.getByText('subscription.payhotRecurring.refresh'));
  await screen.findByText('subscription.payhotRecurring.state.PENDING');
  expect(api.purchasePayHotRecurring.mock.calls[0]).toEqual(
    api.purchasePayHotRecurring.mock.calls[1],
  );
  expect(api.quotePayHotRecurring).toHaveBeenCalledTimes(1);
});
