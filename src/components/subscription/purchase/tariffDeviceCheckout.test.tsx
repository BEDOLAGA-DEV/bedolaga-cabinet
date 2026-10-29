// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PlatformProvider } from '@/platform/PlatformProvider';
import type { Tariff } from '@/types';
import { TariffPurchaseForm } from './TariffPurchaseForm';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: { price?: string }) =>
      key === 'subscription.dailyPurchase.nextCharge' ? `${key}: ${values?.price}` : key,
    i18n: { language: 'ru' },
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
const api = vi.hoisted(() => ({
  previewTariffPurchase: vi.fn(),
  purchaseTariff: vi.fn(),
  previewRecurrentPurchase: vi.fn().mockResolvedValue({
    amount_kopeks: 50000,
    charge_days: 30,
    quote_id: 'recurrent',
    expires_at: new Date(Date.now() + 300000).toISOString(),
    selected_device_limit: 3,
  }),
}));
vi.mock('@/api/subscription', () => ({ subscriptionApi: api }));
beforeEach(() => {
  window.matchMedia = vi
    .fn()
    .mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() });
  HTMLElement.prototype.scrollIntoView = vi.fn();
  api.previewTariffPurchase.mockImplementation(async (request) => ({
    quote_id: `quote-${request.selected_device_limit ?? 1}`,
    expires_at: new Date(Date.now() + 300000).toISOString(),
    purchase_kind: 'new',
    device_selection: {
      effective_limit: request.selected_device_limit ?? 1,
      included_limit: 1,
      selectable: true,
      min_limit: 1,
      max_limit: 5,
      reason: null,
    },
    tariff_cost_kopeks: 30000,
    devices_cost_kopeks: ((request.selected_device_limit ?? 1) - 1) * 10000,
    traffic_cost_kopeks: 0,
    discount_kopeks: 0,
    total_kopeks: 30000 + ((request.selected_device_limit ?? 1) - 1) * 10000,
    balance_kopeks: 100000,
    missing_kopeks: 0,
  }));
  api.purchaseTariff.mockRejectedValue(new Error('test retry'));
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function show(supported = true, daily = false) {
  const tariff = {
    id: 7,
    name: 'Test',
    is_daily: daily,
    daily_price_kopeks: daily ? 100 : 0,
    device_limit: 1,
    purchase_device_selection_supported: supported,
    servers: [],
    traffic_limit_gb: 100,
    periods: [{ days: 30, label: '30 days', price_kopeks: 30000 }],
  } as unknown as Tariff;
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <PlatformProvider>
        <MemoryRouter>
          <TariffPurchaseForm
            tariff={tariff}
            subscriptionId={undefined}
            balanceKopeks={100000}
            onBack={() => {}}
            sbpPurchaseEnabled
          />
        </MemoryRouter>
      </PlatformProvider>
    </QueryClientProvider>,
  );
}

it('sends the selected devices and matching server quote; retries retain checkout ID', async () => {
  show();
  const input = await screen.findByRole('spinbutton');
  fireEvent.change(input, { target: { value: '3' } });
  const buy = screen.getByRole('button', { name: 'subscription.purchase' });
  await waitFor(() => expect((buy as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(buy);
  await waitFor(() => expect(api.purchaseTariff).toHaveBeenCalled());
  expect(api.purchaseTariff.mock.calls[0][5]).toEqual({
    selected_device_limit: 3,
    quote_id: 'quote-3',
  });
  expect(
    screen.queryByRole('button', { name: 'subscription.sbpRecurring.purchaseButton' }),
  ).not.toBeNull();
  await waitFor(() => expect((buy as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(buy);
  await waitFor(() => expect(api.purchaseTariff).toHaveBeenCalledTimes(2));
  expect(api.purchaseTariff.mock.calls[1][4]).toBe(api.purchaseTariff.mock.calls[0][4]);
});

it('blocks payment while the changed device price is loading', async () => {
  show();
  const input = await screen.findByRole('spinbutton');
  api.previewTariffPurchase.mockImplementation(() => new Promise(() => {}));
  fireEvent.change(input, { target: { value: '4' } });
  expect(
    (screen.getByRole('button', { name: 'subscription.purchase' }) as HTMLButtonElement).disabled,
  ).toBe(true);
  expect(api.purchaseTariff).not.toHaveBeenCalled();
});

it('keeps legacy backend compatibility without showing an unsupported selector', () => {
  show(false);
  expect(screen.queryByRole('spinbutton')).toBeNull();
  expect(api.previewTariffPurchase).not.toHaveBeenCalled();
});

it('can retry an uncertain payment without requiring another quote', async () => {
  show();
  await screen.findByRole('spinbutton');
  const buy = screen.getByRole('button', { name: 'subscription.purchase' });
  await waitFor(() => expect((buy as HTMLButtonElement).disabled).toBe(false));
  api.previewTariffPurchase.mockRejectedValue({ response: { status: 409 } });
  fireEvent.click(buy);
  await waitFor(() => expect(api.purchaseTariff).toHaveBeenCalledOnce());
  await waitFor(() => expect((buy as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(buy);
  await waitFor(() => expect(api.purchaseTariff).toHaveBeenCalledTimes(2));
  expect(api.purchaseTariff.mock.calls[1]).toEqual(api.purchaseTariff.mock.calls[0]);
});

it('quotes daily selection for one day and sends a bound checkout', async () => {
  show(true, true);
  const input = await screen.findByRole('spinbutton');
  fireEvent.change(input, { target: { value: '3' } });
  const buy = screen.getByRole('button', { name: 'subscription.dailyPurchase.activate' });
  await waitFor(() => expect((buy as HTMLButtonElement).disabled).toBe(false));
  expect(api.previewTariffPurchase.mock.lastCall?.[0]).toMatchObject({
    period_days: 1,
    selected_device_limit: 3,
  });
  fireEvent.click(buy);
  await waitFor(() => expect(api.purchaseTariff).toHaveBeenCalled());
  expect(api.purchaseTariff.mock.lastCall).toEqual([
    7,
    1,
    undefined,
    undefined,
    expect.any(String),
    { selected_device_limit: 3, quote_id: 'quote-3' },
  ]);
});

it('shows a one-time daily offer separately from future daily charges after changing devices', async () => {
  const originalPreview = api.previewTariffPurchase.getMockImplementation();
  if (!originalPreview) throw new Error('Preview fixture is missing');
  api.previewTariffPurchase.mockImplementation(async (request) => ({
    ...(await originalPreview(request)),
    total_kopeks: request.selected_device_limit === 3 ? 550 : 500,
    next_daily_charge_kopeks: request.selected_device_limit === 3 ? 1100 : 1000,
  }));
  show(true, true);
  const input = await screen.findByRole('spinbutton');
  fireEvent.change(input, { target: { value: '3' } });
  await screen.findByText(/subscription.dailyPurchase.nextCharge: 11/);
  expect(screen.getByText('subscription.dailyPurchase.firstCharge')).toBeTruthy();
  expect(screen.queryByText('subscription.dailyPurchase.costPerDay')).toBeNull();
  expect(screen.getByText(/5[.,]5/)).toBeTruthy();
});

it('lets the user correct an invalid device count while blocking payment', async () => {
  show();
  const input = await screen.findByRole('spinbutton');
  fireEvent.change(input, { target: { value: '0' } });
  expect((input as HTMLInputElement).disabled).toBe(false);
  expect(
    (screen.getByRole('button', { name: 'subscription.purchase' }) as HTMLButtonElement).disabled,
  ).toBe(true);
  fireEvent.change(input, { target: { value: '3' } });
  await waitFor(() =>
    expect(
      (screen.getByRole('button', { name: 'subscription.purchase' }) as HTMLButtonElement).disabled,
    ).toBe(false),
  );
});

it('retains the last total and all price rows during a delayed recalculation', async () => {
  show();
  const buy = screen.getByRole('button', { name: 'subscription.purchase' });
  await waitFor(() => expect((buy as HTMLButtonElement).disabled).toBe(false));
  const total = screen.getByTestId('tariff-purchase-total');
  const previous = total.textContent;
  const breakdown = screen.getByTestId('tariff-price-breakdown');
  const rows = breakdown.children.length;
  api.previewTariffPurchase.mockImplementation(() => new Promise(() => {}));
  fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '4' } });
  expect(total.textContent).toBe(previous);
  expect(breakdown.children.length).toBe(rows);
  expect((buy as HTMLButtonElement).disabled).toBe(true);
});
