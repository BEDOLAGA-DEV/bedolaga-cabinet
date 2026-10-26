// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, expect, it, vi } from 'vitest';
import { PlatformProvider } from '@/platform/PlatformProvider';
import type { Tariff } from '@/types';
import { combinePromoDiscount } from '@/hooks/usePromoDiscount';
import { TariffPurchaseForm } from './TariffPurchaseForm';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, value?: unknown) => (typeof value === 'string' ? value : key),
    i18n: { language: 'ru' },
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
vi.mock('@/hooks/useCurrency', () => ({
  useCurrency: () => ({ formatAmount: (n: number) => n.toFixed(2), currencySymbol: '₽' }),
}));
vi.mock('@/hooks/usePromoDiscount', async (load) => {
  const actual = await load<typeof import('@/hooks/usePromoDiscount')>();
  return {
    ...actual,
    usePromoDiscount: () => ({
      applyPromoDiscount: (p: number, o?: number) => actual.combinePromoDiscount(p, o, 0),
    }),
  };
});
const purchase = vi.hoisted(() => vi.fn().mockResolvedValue({ success: true }));
vi.mock('@/api/subscription', () => ({ subscriptionApi: { purchaseTariff: purchase } }));
afterEach(() => {
  cleanup();
  purchase.mockReset().mockResolvedValue({ success: true });
});

it.each(['legacy', 'exact75', 'free30'])(
  'custom75 %s retains devices and selected subscription',
  async (mode) => {
    window.matchMedia = vi
      .fn()
      .mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() });
    HTMLElement.prototype.scrollIntoView = vi.fn();
    const tariff = {
      id: 1,
      name: 'Test',
      device_limit: 3,
      base_device_limit: 1,
      extra_devices_count: 2,
      device_price_kopeks: 100,
      price_per_day_kopeks: 10,
      ...(mode !== 'legacy'
        ? {
            price_per_day_kopeks: mode === 'free30' ? 0 : 7,
            custom_days_pricing: {
              price_per_day_kopeks: 10,
              device_price_kopeks: 100,
              period_prices: {},
              default_device_discount_percent: 0,
              discounts_by_days:
                mode === 'free30'
                  ? { '30': { period: 100, devices: 0 } }
                  : { '75': { period: 20, devices: 20 } },
            },
          }
        : {}),
      custom_days_enabled: true,
      min_days: 1,
      max_days: 365,
      periods: [{ days: 30, label: '30 days', price_kopeks: 500 }],
      servers: [],
      traffic_limit_gb: 100,
    } as unknown as Tariff;
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <PlatformProvider>
          <MemoryRouter>
            <TariffPurchaseForm
              tariff={tariff}
              subscriptionId={10}
              balanceKopeks={10000}
              onBack={() => {}}
            />
          </MemoryRouter>
        </PlatformProvider>
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole('switch', { name: 'subscription.customDays.title' }));
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '75' } });
    const total = screen.getByText('subscription.total').parentElement;
    if (!total) throw new Error('Missing total row');
    expect(within(total).getByText(mode === 'exact75' ? /10\.00/ : /12\.50/)).toBeTruthy();
    const button = screen.getByRole('button', {
      name: /subscription\.purchase|subscription\.buy|subscription\.confirm/,
    });
    purchase.mockRejectedValue(new Error('Connection lost'));
    fireEvent.click(button);
    await waitFor(() =>
      expect(purchase).toHaveBeenCalledWith(1, 75, undefined, 10, expect.any(String)),
    );
    const checkout = purchase.mock.calls[0][4];
    expect(checkout).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    await waitFor(() => expect(button.hasAttribute('disabled')).toBe(false));
    fireEvent.click(button);
    await waitFor(() => expect(purchase).toHaveBeenCalledTimes(2));
    expect(purchase.mock.calls[1][4]).toBe(checkout);
    await waitFor(() => expect(button.hasAttribute('disabled')).toBe(false));
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '76' } });
    fireEvent.click(button);
    await waitFor(() => expect(purchase).toHaveBeenCalledTimes(3));
    expect(purchase.mock.calls[2][1]).toBe(76);
    expect(purchase.mock.calls[2][4]).not.toBe(checkout);
  },
);

it('promo discount retains the same fractional kopek as the backend', () => {
  expect(combinePromoDiscount(2, undefined, 30).price).toBe(2);
});
