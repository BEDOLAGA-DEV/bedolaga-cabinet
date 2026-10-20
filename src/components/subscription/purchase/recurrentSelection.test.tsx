// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, expect, it, vi } from 'vitest';
import { PlatformProvider } from '@/platform/PlatformProvider';
import type { Tariff } from '@/types';
import { TariffPurchaseForm } from './TariffPurchaseForm';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'ru' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
const purchase = vi.hoisted(() => ({
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
  ['sbp', 'purchaseWithSbpRecurring'],
  ['lava', 'purchaseWithLavaRecurring'],
  ['cashera', 'purchaseWithCasheraRecurring'],
] as const)('%s button keeps the selected subscription', async (provider, method) => {
  window.matchMedia = vi
    .fn()
    .mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() });
  HTMLElement.prototype.scrollIntoView = vi.fn();
  const tariff = {
    id: 1,
    name: 'Test',
    device_limit: 1,
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
  fireEvent.click(
    screen.getByRole('button', { name: `subscription.${provider}Recurring.purchaseButton` }),
  );
  await waitFor(() => expect(purchase[method]).toHaveBeenCalledWith(1, 10));
});
