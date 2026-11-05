// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { METHOD_LABELS } from '@/constants/paymentMethods';
import { findTreeLocation } from '@/components/admin/constants';
import ru from '@/locales/ru.json';
import en from '@/locales/en.json';
import zh from '@/locales/zh.json';
import fa from '@/locales/fa.json';
import TopUpAmount from './TopUpAmount';

const createTopUp = vi.fn();
let cryptoAvailable = true;
let minimumAmount = 10000;
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'ru' } }),
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
vi.mock('../hooks/useCurrency', () => ({
  useCurrency: () => ({
    formatAmount: String,
    currencySymbol: '₽',
    convertAmount: Number,
    convertToRub: Number,
    targetCurrency: 'RUB',
  }),
}));
vi.mock('../api/balance', () => ({
  balanceApi: {
    getPaymentMethods: async () => [
      {
        id: 'cispay',
        name: 'CisPay',
        min_amount_kopeks: minimumAmount,
        max_amount_kopeks: 100000000,
        is_available: true,
        options: [
          { id: 'card', name: 'Карта', min_amount_kopeks: 5000 },
          { id: 'sbp', name: 'СБП' },
          ...(cryptoAvailable ? [{ id: 'crypto', name: 'Криптовалюта' }] : []),
        ],
      },
    ],
    createTopUp: (...args: unknown[]) => createTopUp(...args),
  },
}));
let testTime = Date.now();
beforeEach(() => {
  cryptoAvailable = true;
  minimumAmount = 10000;
  testTime += 31000;
  vi.spyOn(Date, 'now').mockReturnValue(testTime);
  localStorage.clear();
  sessionStorage.clear();
  createTopUp.mockResolvedValue({
    payment_id: 'masked-1',
    payment_url: 'https://pay.example/invoice',
    status: 'pending',
  });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

it('registers CisPay labels and its own payment settings section in every locale', () => {
  expect(METHOD_LABELS.cispay).toBe('CisPay');
  expect(findTreeLocation('CISPAY')).toEqual({ groupId: 'payments', subItemId: 'payments_cispay' });
  for (const locale of [ru, en, zh, fa]) {
    expect(locale).toHaveProperty('balance.paymentMethods.cispay.description');
    expect(locale).toHaveProperty('admin.settings.tree.payments_cispay', 'CisPay');
    expect(locale).toHaveProperty('admin.settings.categories.CISPAY', 'CisPay');
  }
});

it.each([
  ['sbp', null],
  ['card', 'Карта'],
  ['crypto', 'Криптовалюта'],
])('submits CisPay with selected %s option', async (option, label) => {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={['/balance/top-up/cispay?amount=500']}>
        <Routes>
          <Route path="/balance/top-up/:methodId" element={<TopUpAmount />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  expect(await screen.findByRole('heading', { name: 'CisPay' })).toBeTruthy();
  if (label) fireEvent.click(screen.getByRole('button', { name: label }));
  fireEvent.click(screen.getByRole('button', { name: /balance\.topUp|balance\.pay/i }));
  await waitFor(() => expect(createTopUp).toHaveBeenCalledWith(50000, 'cispay', option));
});

it('does not offer crypto when the server excludes it', async () => {
  cryptoAvailable = false;
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={['/balance/top-up/cispay?amount=500']}>
        <Routes>
          <Route path="/balance/top-up/:methodId" element={<TopUpAmount />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  await screen.findByRole('heading', { name: 'CisPay' });
  expect(screen.queryByRole('button', { name: 'Криптовалюта' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /balance\.topUp|balance\.pay/i }));
  await waitFor(() => expect(createTopUp).toHaveBeenCalledWith(50000, 'cispay', 'sbp'));
});

it.each([
  ['sbp', false],
  ['card', true],
])('applies the selected %s minimum', async (option, blocked) => {
  minimumAmount = 1000;
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={['/balance/top-up/cispay?amount=10']}>
        <Routes>
          <Route path="/balance/top-up/:methodId" element={<TopUpAmount />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  await screen.findByRole('heading', { name: 'CisPay' });
  if (option === 'card') fireEvent.click(screen.getByRole('button', { name: 'Карта' }));
  fireEvent.click(screen.getByRole('button', { name: /balance\.topUp|balance\.pay/i }));
  if (blocked) {
    expect(await screen.findByText('balance.errors.amountRange')).toBeTruthy();
    expect(createTopUp).not.toHaveBeenCalled();
  } else {
    await waitFor(() => expect(createTopUp).toHaveBeenCalledWith(1000, 'cispay', 'sbp'));
  }
});
