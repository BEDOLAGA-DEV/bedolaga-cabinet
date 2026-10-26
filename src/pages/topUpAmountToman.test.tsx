// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const openLink = vi.fn();
const createTopUp = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key),
    i18n: { language: 'fa' },
  }),
}));
vi.mock('@/platform', () => ({
  usePlatform: () => ({
    openInvoice: vi.fn(),
    openTelegramLink: vi.fn(),
    openLink,
    platform: 'web',
  }),
  useHaptic: () => ({ notification: vi.fn(), impact: vi.fn(), selection: vi.fn() }),
}));
vi.mock('../api/balance', () => ({
  balanceApi: {
    getPaymentMethods: vi.fn(async () => [
      {
        id: 'cashera',
        name: 'Cashera',
        description: null,
        min_amount_kopeks: 10000,
        max_amount_kopeks: 10000000,
        is_available: true,
        options: [{ id: 'sbp', name: 'СБП' }],
        quick_amounts: [],
        open_url_direct: true,
      },
    ]),
    createTopUp: (...args: unknown[]) => createTopUp(...args),
  },
}));

import TopUpAmount from './TopUpAmount';
import { balanceApi } from '../api/balance';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderPage(rate = 0.001) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(['exchange-rates'], { USD: 100, CNY: 10, IRR: rate });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/balance/top-up/cashera?amount=500']}>
        <Routes>
          <Route path="/balance/top-up/:methodId" element={<TopUpAmount />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function submit() {
  const button = await screen.findByRole('button', {
    name: /balance\.topUp|Пополнить|balance\.pay/i,
  });
  fireEvent.click(button);
}

it.each([
  [0.001, 6407],
  [0.0010001, 6408],
])('converts typed tomans at rate %s to %s kopeks', async (rate, expected) => {
  const methods = await balanceApi.getPaymentMethods();
  vi.mocked(balanceApi.getPaymentMethods).mockResolvedValueOnce(
    methods.map((method) => ({ ...method, min_amount_kopeks: 6407 })),
  );
  createTopUp.mockResolvedValue({
    payment_id: 'local',
    payment_url: 'https://example.com/pay',
    amount_kopeks: 6407,
    amount_rubles: 64.07,
    status: 'pending',
    expires_at: null,
  });
  renderPage(rate);
  const input = await screen.findByRole('spinbutton');
  fireEvent.change(input, { target: { value: '6407' } });
  await submit();
  await waitFor(() => expect(createTopUp).toHaveBeenCalledWith(expected, 'cashera', 'sbp'));
});
it('preserves the canonical RUB prefill when shown in whole tomans', async () => {
  createTopUp.mockResolvedValue({
    payment_id: 'local',
    payment_url: 'https://example.com/pay',
    amount_kopeks: 50000,
    amount_rubles: 500,
    status: 'pending',
    expires_at: null,
  });
  renderPage();
  const input = await screen.findByRole('spinbutton');
  expect((input as HTMLInputElement).value).toBe('50000');
  await submit();
  await waitFor(() => expect(createTopUp).toHaveBeenCalledWith(50000, 'cashera', 'sbp'));
});
