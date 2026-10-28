// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, expect, it, vi } from 'vitest';
import { PlatformProvider } from '@/platform/PlatformProvider';
import type { Tariff } from '@/types';
import { TariffPurchaseForm } from './TariffPurchaseForm';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) =>
      key === 'subscription.purchaseDevices.recurringPrice'
        ? `${values?.price} / ${values?.days}`
        : key,
    i18n: { language: 'ru' },
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
const purchase = vi.hoisted(() => ({
  previewRecurrentPurchase: vi.fn().mockResolvedValue({
    amount_kopeks: 12345,
    charge_days: 7,
    selected_device_limit: 3,
    quote_id: 'provider-quote',
    expires_at: new Date(Date.now() + 300000).toISOString(),
  }),
  previewTariffPurchase: vi.fn().mockResolvedValue({
    device_selection: {
      selectable: true,
      effective_limit: 3,
      included_limit: 1,
      min_limit: 1,
      max_limit: 5,
    },
    expires_at: new Date(Date.now() + 300000).toISOString(),
    total_kopeks: 50000,
  }),
  purchaseWithSbpRecurring: vi.fn().mockResolvedValue({ subscription_id: 10 }),
  purchaseWithLavaRecurring: vi.fn().mockResolvedValue({ subscription_id: 10 }),
  purchaseWithCasheraRecurring: vi.fn().mockResolvedValue({ subscription_id: 10 }),
}));
vi.mock('@/api/subscription', () => ({ subscriptionApi: purchase }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it.each([
  ['sbp', 'purchaseWithSbpRecurring', false],
  ['sbp', 'purchaseWithSbpRecurring', true],
  ['lava', 'purchaseWithLavaRecurring', false],
  ['lava', 'purchaseWithLavaRecurring', true],
  ['cashera', 'purchaseWithCasheraRecurring', false],
  ['cashera', 'purchaseWithCasheraRecurring', true],
] as const)('%s button keeps the selected subscription', async (provider, method, recovery) => {
  purchase.previewTariffPurchase.mockResolvedValue({
    purchase_kind: recovery ? 'paid_renewal' : 'new',
    recurrent_checkout_pending: recovery,
    device_selection: {
      selectable: !recovery,
      effective_limit: 3,
      included_limit: 1,
      min_limit: 1,
      max_limit: 5,
    },
    expires_at: new Date(Date.now() + 300000).toISOString(),
    total_kopeks: 50000,
  });
  purchase.previewRecurrentPurchase.mockResolvedValue({
    amount_kopeks: 12345,
    charge_days: 7,
    selected_device_limit: 3,
    quote_id: 'provider-quote',
    checkout_id: recovery ? 'existing-checkout' : undefined,
    expires_at: new Date(Date.now() + 300000).toISOString(),
  });
  window.matchMedia = vi
    .fn()
    .mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() });
  HTMLElement.prototype.scrollIntoView = vi.fn();
  const tariff = {
    id: 1,
    name: 'Test',
    device_limit: 1,
    purchase_device_selection_supported: true,
    servers: [],
    traffic_limit_gb: 100,
    periods: [{ days: 30, label: '30 days', price_kopeks: 300 }],
  } as unknown as Tariff;
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <PlatformProvider>
        <MemoryRouter>
          <TariffPurchaseForm
            tariff={tariff}
            subscriptionId={10}
            balanceKopeks={10000}
            onBack={() => {}}
            sbpPurchaseEnabled
            lavaPurchaseEnabled
            casheraPurchaseEnabled
          />
        </MemoryRouter>
      </PlatformProvider>
    </QueryClientProvider>,
  );
  if (!recovery) await screen.findByRole('spinbutton');
  else {
    await screen.findAllByText(/123.*7/);
    expect(screen.queryByRole('spinbutton')).toBeNull();
    expect(purchase.previewRecurrentPurchase).toHaveBeenCalledWith(
      provider === 'sbp' ? 'platega' : provider,
      1,
      10,
      3,
    );
  }
  await waitFor(() =>
    expect(
      (
        screen.getByRole('button', {
          name: `subscription.${provider}Recurring.purchaseButton`,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false),
  );
  expect(screen.getAllByText(/123.*7/).length).toBeGreaterThan(0);
  purchase[method].mockRejectedValueOnce(
    recovery ? { response: { status: 400 } } : new Error('uncertain network'),
  );
  fireEvent.click(
    screen.getByRole('button', { name: `subscription.${provider}Recurring.purchaseButton` }),
  );
  await waitFor(() =>
    expect(purchase[method]).toHaveBeenCalledWith(1, 10, {
      selected_device_limit: 3,
      quote_id: 'provider-quote',
      checkout_id: recovery ? 'existing-checkout' : expect.any(String),
    }),
  );
  await waitFor(() =>
    expect(
      (
        screen.getByRole('button', {
          name: `subscription.${provider}Recurring.purchaseButton`,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false),
  );
  fireEvent.click(
    screen.getByRole('button', { name: `subscription.${provider}Recurring.purchaseButton` }),
  );
  await waitFor(() => expect(purchase[method]).toHaveBeenCalledTimes(2));
  expect(purchase[method].mock.calls[1]).toEqual(purchase[method].mock.calls[0]);
});
