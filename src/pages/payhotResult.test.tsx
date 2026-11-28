// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, expect, it, vi } from 'vitest';
import TopUpResult from './TopUpResult';
const latest = vi.fn(async (..._args: unknown[]) => ({
  status: 'pending',
  is_paid: false,
  amount_kopeks: 10000,
}));
vi.mock('../api/balance', () => ({
  balanceApi: { getLatestPayment: (...args: unknown[]) => latest(...args) },
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../hooks/useCurrency', () => ({
  useCurrency: () => ({ formatAmount: String, currencySymbol: '₽' }),
}));
vi.mock('@/platform', () => ({ useHaptic: () => ({ notification: vi.fn() }) }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  sessionStorage.clear();
});
it.each(['status=success', 'success=true', 'payment=failed'])(
  'checks actual PayHot status despite return hint %s',
  async (hint) => {
    sessionStorage.clear();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[`/balance/top-up/result?method=payhot&${hint}`]}>
          <TopUpResult />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await waitFor(() => expect(latest).toHaveBeenCalledWith('payhot'));
    client.clear();
  },
);
