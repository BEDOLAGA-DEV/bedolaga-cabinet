// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const createTopUp = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key),
    i18n: { language: 'ru' },
  }),
}));
vi.mock('@/platform', () => ({
  usePlatform: () => ({
    openInvoice: vi.fn(),
    openTelegramLink: vi.fn(),
    openLink: vi.fn(),
    platform: 'web',
  }),
  useHaptic: () => ({ notification: vi.fn(), impact: vi.fn(), selection: vi.fn() }),
}));
vi.mock('../api/balance', () => ({
  balanceApi: {
    getPaymentMethods: vi.fn(),
    createTopUp: (...args: unknown[]) => createTopUp(...args),
  },
}));

import TopUpAmount from './TopUpAmount';
import { balanceApi } from '../api/balance';

const tributeMethod = {
  id: 'tribute',
  name: 'Tribute',
  description: null,
  min_amount_kopeks: 10000,
  max_amount_kopeks: 42000,
  is_available: true,
  options: null,
  quick_amounts: [10000, 15000, 42000],
};

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(['exchange-rates'], { USD: 100, CNY: 10, IRR: 0.001 });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/balance/top-up/tribute']}>
        <Routes>
          <Route path="/balance/top-up/:methodId" element={<TopUpAmount />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

it('fixed_amounts_only: the amount field is read-only and the label asks to select', async () => {
  vi.mocked(balanceApi.getPaymentMethods).mockResolvedValue([
    { ...tributeMethod, fixed_amounts_only: true },
  ]);
  renderPage();

  const input = (await screen.findByRole('spinbutton')) as HTMLInputElement;
  expect(input.readOnly).toBe(true);
  expect(input.inputMode).toBe('none');
  expect(screen.getByText('balance.selectAmount')).toBeTruthy();
  expect(screen.queryByText('balance.enterAmount')).toBeNull();
});

it('fixed_amounts_only: typing is ignored, a chip fills the field and is sent as exact kopeks', async () => {
  vi.mocked(balanceApi.getPaymentMethods).mockResolvedValue([
    { ...tributeMethod, fixed_amounts_only: true },
  ]);
  createTopUp.mockResolvedValue({
    payment_id: 'local',
    payment_url: 'https://web.tribute.tg/p/JNs',
    amount_kopeks: 15000,
    amount_rubles: 150,
    status: 'pending',
    expires_at: null,
  });
  renderPage();

  const input = (await screen.findByRole('spinbutton')) as HTMLInputElement;
  const submit = (await screen.findByRole('button', {
    name: /balance\.topUp/i,
  })) as HTMLButtonElement;
  expect(submit.disabled).toBe(true); // пока не выбрана сумма

  fireEvent.click(await screen.findByText('150'));
  expect(input.value).toBe('150');
  expect(submit.disabled).toBe(false);

  fireEvent.click(submit);
  await waitFor(() => expect(createTopUp).toHaveBeenCalledTimes(1));
  expect(createTopUp.mock.calls[0][0]).toBe(15000);
  expect(createTopUp.mock.calls[0][1]).toBe('tribute');
});

it('without the flag the amount field stays editable (default behaviour is unchanged)', async () => {
  vi.mocked(balanceApi.getPaymentMethods).mockResolvedValue([tributeMethod]);
  renderPage();

  const input = (await screen.findByRole('spinbutton')) as HTMLInputElement;
  expect(input.readOnly).toBe(false);
  expect(input.inputMode).toBe('decimal');
  expect(screen.getByText('balance.enterAmount')).toBeTruthy();
  fireEvent.change(input, { target: { value: '333' } });
  expect(input.value).toBe('333');
});

it('fixed_amounts_only without usable quick amounts falls back to a normal field', async () => {
  vi.mocked(balanceApi.getPaymentMethods).mockResolvedValue([
    { ...tributeMethod, fixed_amounts_only: true, quick_amounts: [] },
  ]);
  renderPage();

  const input = (await screen.findByRole('spinbutton')) as HTMLInputElement;
  expect(input.readOnly).toBe(false);
});
