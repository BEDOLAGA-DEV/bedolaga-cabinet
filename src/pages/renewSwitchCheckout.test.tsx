// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PlatformProvider } from '@/platform/PlatformProvider';
import RenewSubscription from './RenewSubscription';
import SubscriptionPurchase from './SubscriptionPurchase';

const state = vi.hoisted(() => ({
  lite: false,
  daily: false,
  limited: false,
  switched: false,
  optionsStatus: 'ready' as 'ready' | 'error' | 'loading',
  preview: vi.fn(),
  switch: vi.fn(),
  purchase: vi.fn(),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'ru' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
vi.mock('../store/auth', () => ({
  useAuthStore: (select: (s: unknown) => unknown) => select({ user: { id: 5 } }),
}));
vi.mock('../hooks/useCurrency', () => ({
  useCurrency: () => ({ formatAmount: String, currencySymbol: 'RUB' }),
}));
vi.mock('../hooks/useTheme', () => ({ useTheme: () => ({ isDark: true }) }));
vi.mock('../hooks/useLiteMode', () => ({ useLiteMode: () => ({ lite: state.lite }) }));
vi.mock('../hooks/usePromoDiscount', () => ({
  usePromoDiscount: () => ({ applyPromoDiscount: (price: number) => ({ price }) }),
}));
vi.mock('../api/subscription', () => ({
  subscriptionApi: {
    getSubscription: async (id = 11) => ({
      subscription: {
        id,
        tariff_id: state.switched ? 2 : 1,
        tariff_name: `Current ${id}`,
        is_active: !state.limited,
        is_limited: state.limited,
        is_trial: false,
        is_daily: state.daily,
        traffic_accounting_mode: state.daily ? 'split' : 'legacy',
      },
    }),
    getRenewalOptions: async () => [
      { period_days: 30, price_kopeks: 1000, price_rubles: 10, discount_percent: 0 },
    ],
    getSubscriptions: async () => ({
      multi_tariff_enabled: true,
      subscriptions: [{ id: 11, tariff_id: state.switched ? 2 : 1 }],
    }),
    getPurchaseOptions: async () => {
      if (state.optionsStatus === 'error') throw new Error('Catalog unavailable');
      if (state.optionsStatus === 'loading') await new Promise(() => {});
      return {
        sales_mode: 'tariffs',
        balance_kopeks: 10000,
        subscription_is_expired: false,
        tariffs: [
          {
            id: 2,
            name: 'Target',
            is_daily: state.daily,
            daily_price_kopeks: state.daily ? 1500 : undefined,
            is_current: state.switched,
            is_purchased: false,
            traffic_limit_gb: 100,
            device_limit: 5,
            periods: [{ days: 30, price_kopeks: 3000, price_rubles: 30, discount_percent: 0 }],
          },
        ],
      };
    },
    previewTariffSwitch: state.preview,
    switchTariff: state.switch,
    purchaseTariff: state.purchase,
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  state.switched = false;
  state.daily = false;
  state.optionsStatus = 'ready';
  HTMLElement.prototype.scrollIntoView = () => {};
  state.preview.mockImplementation(async (_target: number, id: number) => ({
    can_switch: true,
    current_tariff_name: `Current ${id}`,
    new_tariff_name: 'Target',
    remaining_days: 41,
    upgrade_cost_kopeks: 2000,
    has_enough_balance: true,
    balance_kopeks: 10000,
    missing_amount_kopeks: 0,
    is_upgrade: true,
  }));
  state.switch.mockImplementation(async () => {
    state.switched = true;
    return { success: true };
  });
  state.purchase.mockResolvedValue({ success: true });
});
afterEach(cleanup);

function mount(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // The real entry starts from the subscriptions dashboard, which already knows the mode.
  client.setQueryData(['subscriptions-list'], { multi_tariff_enabled: true, subscriptions: [] });
  client.setQueryData(['balance'], { balance_kopeks: 10000 });
  render(
    <QueryClientProvider client={client}>
      <PlatformProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/subscriptions/:subscriptionId/renew" element={<RenewSubscription />} />
            <Route path="/subscription/purchase" element={<SubscriptionPurchase />} />
            <Route path="/subscriptions" element={<output>Subscriptions</output>} />
          </Routes>
        </MemoryRouter>
      </PlatformProvider>
    </QueryClientProvider>,
  );
  return client;
}

it.each([false, true].flatMap((lite) => [11, 12].map((id) => ({ lite, id }))))(
  'direct switch preserves source $id (lite=$lite)',
  async ({ lite, id }) => {
    state.lite = lite;
    state.limited = false;
    const client = mount(`/subscription/purchase?subscriptionId=${id}`);
    await screen.findByRole('heading', { level: 1, name: 'subscription.switchTariff.title' });
    fireEvent.click(
      await screen.findByRole('button', {
        name: /Target/,
      }),
    );
    await waitFor(() => expect(state.preview).toHaveBeenCalledWith(2, id));
    const heading = await screen.findByRole('heading', {
      level: 2,
      name: 'subscription.switchTariff.reviewTitle',
    });
    const sheet = heading.parentElement?.parentElement;
    if (!sheet) throw new Error('Switch sheet missing');
    expect(within(sheet).getByText(`Current ${id}`)).toBeTruthy();
    fireEvent.click(
      within(sheet).getByRole('button', { name: 'subscription.switchTariff.confirm' }),
    );
    await screen.findByText('Subscriptions');
    expect(state.switch).toHaveBeenCalledWith(2, id);
    expect(state.purchase).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(
        client.getQueryData<{ subscriptions: { tariff_id: number }[] }>(['subscriptions-list'])
          ?.subscriptions[0]?.tariff_id,
      ).toBe(2),
    );
    expect(client.getQueryState(['balance'])?.isInvalidated).toBe(true);
    client.clear();
  },
);

it('failed preview can be retried without charging or showing the catalog underneath', async () => {
  state.lite = false;
  state.preview.mockRejectedValueOnce(new Error('Preview unavailable'));
  const client = mount('/subscription/purchase?subscriptionId=11');
  fireEvent.click(await screen.findByRole('button', { name: /Target/ }));
  await screen.findByRole('alert');
  expect(screen.queryByRole('button', { name: /Target/ })).toBeNull();
  expect(screen.queryByRole('button', { name: 'subscription.switchTariff.confirm' })).toBeNull();
  expect(state.switch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
  await screen.findByText('Current 11');
  fireEvent.click(screen.getByRole('button', { name: 'subscription.switchTariff.chooseAnother' }));
  await screen.findByRole('button', { name: /Target/ });
  expect(state.switch).not.toHaveBeenCalled();
  client.clear();
});

it('insufficient balance does not allow confirming a switch', async () => {
  state.lite = false;
  state.preview.mockResolvedValueOnce({
    can_switch: false,
    current_tariff_name: 'Current 11',
    new_tariff_name: 'Target',
    remaining_days: 41,
    upgrade_cost_kopeks: 2000,
    balance_kopeks: 1000,
    has_enough_balance: false,
    missing_amount_kopeks: 1000,
  });
  const client = mount('/subscription/purchase?subscriptionId=11');
  fireEvent.click(await screen.findByRole('button', { name: /Target/ }));
  const confirm = await screen.findByRole('button', { name: 'subscription.switchTariff.confirm' });
  expect((confirm as HTMLButtonElement).disabled).toBe(true);
  expect(screen.queryByText('subscription.switchTariff.balanceAfter')).toBeNull();
  fireEvent.click(confirm);
  expect(state.switch).not.toHaveBeenCalled();
  expect(state.purchase).not.toHaveBeenCalled();
  client.clear();
});

it.each([false, true])('unscoped multi catalog remains a purchase (lite=%s)', async (lite) => {
  state.lite = lite;
  state.limited = false;
  const client = mount('/subscription/purchase');
  await screen.findByText('Target');
  expect(screen.queryByRole('button', { name: 'subscription.switchTariff.switch' })).toBeNull();
  expect(state.preview).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: lite ? /Target/ : 'subscription.purchase' }));
  fireEvent.click(await screen.findByRole('button', { name: 'subscription.purchase' }));
  await waitFor(() =>
    expect(state.purchase).toHaveBeenCalledWith(
      2,
      30,
      undefined,
      undefined,
      expect.any(String),
      undefined,
    ),
  );
  expect(state.switch).not.toHaveBeenCalled();
  client.clear();
});

it.each([
  [false, 'ready'],
  [true, 'ready'],
  [false, 'error'],
  [true, 'error'],
  [false, 'loading'],
  [true, 'loading'],
] as const)(
  'restores an accepted switch with the target already current (lite=%s, catalog=%s)',
  async (lite, optionsStatus) => {
    state.optionsStatus = optionsStatus;
    state.lite = lite;
    state.switched = true;
    sessionStorage.setItem(
      'cabinet:tariff-switch:5:11',
      JSON.stringify({
        operationId: '11111111-1111-4111-8111-111111111111',
        preview: {
          can_switch: true,
          new_tariff_id: 2,
          new_tariff_name: 'Saved target',
          current_tariff_name: 'Original tariff',
          traffic_accounting_mode: 'split',
          expected_terms_hash: 'a'.repeat(64),
          expected_end_date: '2026-12-01T00:00:00Z',
          upgrade_cost_kopeks: 1200,
          remaining_days: 20,
          balance_kopeks: 5000,
          has_enough_balance: true,
        },
      }),
    );
    mount('/subscription/purchase?subscriptionId=11');
    expect(await screen.findByText('Saved target')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'subscription.switchTariff.check' })).toBeTruthy();
    expect(state.preview).not.toHaveBeenCalled();
  },
);

it.each([false, true])(
  'discovers a daily switch in the existing picker (lite=%s)',
  async (lite) => {
    state.lite = lite;
    state.daily = true;
    state.preview.mockResolvedValue({
      can_switch: true,
      current_tariff_id: 1,
      current_tariff_name: 'Current 11',
      new_tariff_id: 2,
      new_tariff_name: 'Target',
      remaining_days: 1,
      upgrade_cost_kopeks: 217,
      has_enough_balance: true,
      balance_kopeks: 10000,
      missing_amount_kopeks: 0,
      traffic_accounting_mode: 'split',
      expected_terms_hash: 'a'.repeat(64),
      expected_end_date: '2026-11-14T12:30:00Z',
      billing_kind: 'daily',
      source_daily_rate_kopeks: 1000,
      target_daily_rate_kopeks: 1500,
      paid_window_end: '2026-11-14T12:30:00Z',
    });
    const client = mount('/subscription/purchase?subscriptionId=11');
    fireEvent.click(await screen.findByRole('button', { name: /Target/ }));
    await screen.findByText('subscription.switchTariff.dailyPaidUntil');
    fireEvent.click(screen.getByRole('button', { name: 'subscription.switchTariff.confirm' }));
    await screen.findByText('Subscriptions');
    expect(state.switch).toHaveBeenCalledWith(2, 11, {
      operation_id: expect.any(String),
      expected_price_kopeks: 217,
      expected_terms_hash: 'a'.repeat(64),
    });
    expect(state.purchase).not.toHaveBeenCalled();
    client.clear();
  },
);
