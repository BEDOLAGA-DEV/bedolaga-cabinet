// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PlatformProvider } from '@/platform/PlatformProvider';
import type { Tariff } from '@/types';
import { TariffPurchaseForm } from './TariffPurchaseForm';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'ru' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
const api = vi.hoisted(() => ({ previewTariffPurchase: vi.fn(), purchaseTariff: vi.fn() }));
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

function show(supported = true) {
  const tariff = {
    id: 7,
    name: 'Test',
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
  ).toBeNull();
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
