// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, expect, it, vi } from 'vitest';
import { CisPayRecurringPanel } from './CisPayRecurringPanel';
import { CisPayPurchaseButton } from '../purchase/CisPayPurchaseButton';

const api = vi.hoisted(() => ({
  getCisPayRecurring: vi.fn(),
  cancelCisPayRecurring: vi.fn(),
  quoteCisPayRecurring: vi.fn(),
  purchaseCisPayRecurring: vi.fn(),
}));
vi.mock('@/api/subscription', () => ({ subscriptionApi: api }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'en' },
    t: (key: string, values?: Record<string, unknown>) =>
      key === 'subscription.cispayRecurring.consent' ? `${values?.amount} / ${values?.days}` : key,
  }),
}));
vi.mock('@/hooks/useCurrency', () => ({
  useCurrency: () => ({ formatAmount: (amount: number) => `${amount / 100} RUB` }),
}));
vi.mock('@/platform', () => ({ usePlatform: () => ({ platform: 'browser', openLink: vi.fn() }) }));
vi.mock('@/utils/openPaymentUrl', () => ({ openPaymentUrl: vi.fn() }));
function mount(ui: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it('cancels existing agreement even when setup is disabled', async () => {
  api.getCisPayRecurring.mockResolvedValue({
    status: 'ACTIVE',
    amount_kopeks: 12300,
    period_days: 10,
  });
  api.cancelCisPayRecurring.mockResolvedValue({ status: 'CANCEL_PENDING' });
  mount(<CisPayRecurringPanel subscriptionId={42} canSetup={false} />);
  fireEvent.click(await screen.findByText('subscription.cispayRecurring.cancel'));
  await waitFor(() => expect(api.cancelCisPayRecurring).toHaveBeenCalledWith(42, undefined));
  expect(screen.queryByText('subscription.cispayRecurring.setup')).toBeNull();
});
it('read-only admin cannot cancel or open customer checkout', async () => {
  api.getCisPayRecurring.mockResolvedValue({
    status: 'PENDING',
    redirect_url: 'https://pay.example/checkout',
  });
  mount(<CisPayRecurringPanel subscriptionId={42} adminUserId={9} canManage={false} />);
  await screen.findByText('subscription.cispayRecurring.state.PENDING');
  expect(api.getCisPayRecurring).toHaveBeenCalledWith(42, 9);
  expect(screen.queryByText('subscription.cispayRecurring.cancel')).toBeNull();
  expect(screen.queryByText('subscription.cispayRecurring.continue')).toBeNull();
});
it('shows exact amount before payment and retries same checkout after transport error', async () => {
  api.quoteCisPayRecurring.mockResolvedValue({
    quote_id: 'quote',
    amount_kopeks: 12300,
    period_days: 10,
  });
  api.purchaseCisPayRecurring
    .mockRejectedValueOnce(new Error('timeout'))
    .mockResolvedValueOnce({ status: 'CREATION_UNKNOWN' });
  mount(<CisPayPurchaseButton tariffId={3} subscriptionId={42} periodDays={10} deviceLimit={0} />);
  fireEvent.click(screen.getByText('subscription.cispayRecurring.choose'));
  await screen.findByText(/123\.00.*10/);
  expect(api.purchaseCisPayRecurring).not.toHaveBeenCalled();
  expect(api.quoteCisPayRecurring).toHaveBeenCalledWith({
    tariff_id: 3,
    subscription_id: 42,
    period_days: 10,
    device_limit: 0,
  });
  fireEvent.click(screen.getByText('subscription.cispayRecurring.confirm'));
  await screen.findByRole('alert');
  fireEvent.click(screen.getByText('subscription.cispayRecurring.confirm'));
  await screen.findByText('subscription.cispayRecurring.state.CREATION_UNKNOWN');
  expect(api.purchaseCisPayRecurring).toHaveBeenCalledTimes(2);
  expect(api.purchaseCisPayRecurring.mock.calls[0]).toEqual(
    api.purchaseCisPayRecurring.mock.calls[1],
  );
  expect(
    (screen.getByText('subscription.cispayRecurring.confirm') as HTMLButtonElement).disabled,
  ).toBe(true);
});
it('unsupported period never offers recurring checkout', () => {
  mount(<CisPayPurchaseButton tariffId={3} periodDays={365} />);
  expect(screen.queryByRole('button')).toBeNull();
});

it.each(['quote_expired', 'quote_changed'])('requests fresh consent after %s', async (code) => {
  api.quoteCisPayRecurring.mockResolvedValue({
    quote_id: 'quote',
    amount_kopeks: 12300,
    period_days: 10,
  });
  api.purchaseCisPayRecurring.mockRejectedValue({
    response: { status: 409, data: { detail: { code } } },
  });
  mount(<CisPayPurchaseButton tariffId={3} periodDays={10} />);
  fireEvent.click(screen.getByText('subscription.cispayRecurring.choose'));
  await screen.findByText(/123\.00.*10/);
  fireEvent.click(screen.getByText('subscription.cispayRecurring.confirm'));
  await screen.findByRole('alert');
  fireEvent.click(screen.getByText('subscription.cispayRecurring.choose'));
  await waitFor(() => expect(api.quoteCisPayRecurring).toHaveBeenCalledTimes(2));
  expect(api.purchaseCisPayRecurring).toHaveBeenCalledTimes(1);
});

it('explains that balance autopay must be disabled before bank setup', async () => {
  api.quoteCisPayRecurring.mockRejectedValue({
    response: { data: { detail: { code: 'disable_balance_autopay_first' } } },
  });
  mount(<CisPayPurchaseButton tariffId={3} periodDays={30} />);
  fireEvent.click(screen.getByText('subscription.cispayRecurring.choose'));
  expect((await screen.findByRole('alert')).textContent).toBe(
    'subscription.cispayRecurring.errors.balanceAutopay',
  );
});
