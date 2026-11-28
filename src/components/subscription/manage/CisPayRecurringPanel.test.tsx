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
      key === 'subscription.cispayRecurring.consent'
        ? `${values?.amount} / ${values?.days}`
        : values?.count !== undefined
          ? `${key}:${values.count}`
          : key,
  }),
}));
const tariff = {
  id: 3,
  is_daily: false,
  periods: [
    { days: 7, price_kopeks: 7000 },
    { days: 30, price_kopeks: 20000 },
    { days: 365, price_kopeks: 100000 },
  ],
};
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
it('cancels existing agreement and does not offer a second setup', async () => {
  api.getCisPayRecurring.mockResolvedValue({
    status: 'ACTIVE',
    amount_kopeks: 12300,
    period_days: 10,
  });
  api.cancelCisPayRecurring.mockResolvedValue({ status: 'CANCEL_PENDING' });
  mount(<CisPayRecurringPanel subscriptionId={42} setupTariff={tariff} />);
  fireEvent.click(await screen.findByText('subscription.cispayRecurring.cancel'));
  await waitFor(() => expect(api.cancelCisPayRecurring).toHaveBeenCalledWith(42, undefined));
  expect(screen.queryByText('subscription.cispayRecurring.period')).toBeNull();
  expect(screen.queryByText('subscription.cispayRecurring.choose')).toBeNull();
});
it('hides the panel when the subscription cannot be set up', async () => {
  api.getCisPayRecurring.mockResolvedValue({ status: 'none' });
  const { container } = mount(
    <CisPayRecurringPanel
      subscriptionId={42}
      setupTariff={{ ...tariff, periods: [{ days: 365, price_kopeks: 100000 }] }}
    />,
  );
  // Loading shows a skeleton; once the state arrives nothing is rendered.
  await waitFor(() => expect(api.getCisPayRecurring).toHaveBeenCalled());
  await waitFor(() => expect(container.firstChild).toBeNull());
});
it('sets up autopay for the current subscription right in the panel', async () => {
  api.getCisPayRecurring.mockResolvedValue({ status: 'none' });
  api.quoteCisPayRecurring.mockResolvedValue({
    quote_id: 'quote',
    amount_kopeks: 20000,
    period_days: 30,
  });
  mount(<CisPayRecurringPanel subscriptionId={42} setupTariff={tariff} />);
  const week = await screen.findByText('subscription.days:7');
  const month = screen.getByText('subscription.days:30');
  expect(screen.queryByText('subscription.days:365')).toBeNull();
  expect(week.getAttribute('aria-pressed')).toBe('true');
  fireEvent.click(month);
  expect(month.getAttribute('aria-pressed')).toBe('true');
  fireEvent.click(screen.getByText('subscription.cispayRecurring.choose'));
  await screen.findByText(/200\.00.*30/);
  // No device_limit: the backend keeps the paid subscription's own limit.
  expect(api.quoteCisPayRecurring.mock.calls[0][0]).toStrictEqual({
    tariff_id: 3,
    subscription_id: 42,
    period_days: 30,
    device_limit: undefined,
  });
});
it('custom days stay within the CisPay range', async () => {
  api.getCisPayRecurring.mockResolvedValue({ status: 'none' });
  api.quoteCisPayRecurring.mockResolvedValue({
    quote_id: 'quote',
    amount_kopeks: 36000,
    period_days: 360,
  });
  mount(
    <CisPayRecurringPanel
      subscriptionId={42}
      setupTariff={{
        id: 3,
        periods: [],
        custom_days_enabled: true,
        price_per_day_kopeks: 100,
        min_days: 1,
        max_days: 1000,
      }}
    />,
  );
  const input = (await screen.findByLabelText('subscription.customDays.title')) as HTMLInputElement;
  expect(input.value).toBe('7');
  // Typing «30» passes through «3», which is below the minimum and must not snap to 7.
  fireEvent.change(input, { target: { value: '3' } });
  expect(input.value).toBe('3');
  fireEvent.change(input, { target: { value: '30' } });
  fireEvent.blur(input);
  expect(input.value).toBe('30');
  // Out of range keeps the last valid period and shows it again on blur.
  fireEvent.change(input, { target: { value: '999' } });
  fireEvent.blur(input);
  expect(input.value).toBe('30');
  fireEvent.click(screen.getByText('subscription.cispayRecurring.choose'));
  await waitFor(() =>
    expect(api.quoteCisPayRecurring).toHaveBeenCalledWith(
      expect.objectContaining({ subscription_id: 42, period_days: 30 }),
    ),
  );
});
it('falls back to an offered period when the tariff drops the chosen one', async () => {
  api.getCisPayRecurring.mockResolvedValue({ status: 'none' });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = (setupTariff: typeof tariff) => (
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <CisPayRecurringPanel subscriptionId={42} setupTariff={setupTariff} />
      </MemoryRouter>
    </QueryClientProvider>
  );
  const { rerender } = render(view(tariff));
  fireEvent.click(await screen.findByText('subscription.days:30'));
  rerender(view({ ...tariff, periods: [{ days: 7, price_kopeks: 7000 }] }));
  expect(screen.getByText('subscription.days:7').getAttribute('aria-pressed')).toBe('true');
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

it('does not quote a fractional or incomplete custom period', async () => {
  api.getCisPayRecurring.mockResolvedValue({ status: 'none' });
  mount(
    <CisPayRecurringPanel
      subscriptionId={42}
      setupTariff={{
        id: 3,
        periods: [],
        custom_days_enabled: true,
        price_per_day_kopeks: 100,
        min_days: 1,
        max_days: 1000,
      }}
    />,
  );
  const input = await screen.findByLabelText('subscription.customDays.title');
  const button = screen.getByText('subscription.cispayRecurring.choose') as HTMLButtonElement;
  for (const value of ['7.5', '', '3', '361']) {
    fireEvent.change(input, { target: { value } });
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
  }
  expect(api.quoteCisPayRecurring).not.toHaveBeenCalled();
  fireEvent.change(input, { target: { value: '30' } });
  expect(button.disabled).toBe(false);
});

it('never offers customer checkout inside an admin view even with tariff props', async () => {
  api.getCisPayRecurring.mockResolvedValue({ status: 'none' });
  const { container } = mount(
    <CisPayRecurringPanel
      subscriptionId={42}
      adminUserId={5}
      canManage={false}
      setupTariff={tariff}
    />,
  );
  await waitFor(() => expect(api.getCisPayRecurring).toHaveBeenCalled());
  await waitFor(() => expect(container.firstChild).toBeNull());
});
