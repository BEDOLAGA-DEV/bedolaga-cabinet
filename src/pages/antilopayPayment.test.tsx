// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import TopUpAmount from './TopUpAmount';
import ru from '@/locales/ru.json';
import en from '@/locales/en.json';
import zh from '@/locales/zh.json';
import fa from '@/locales/fa.json';

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
        id: 'antilopay',
        name: 'Antilopay',
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

it('requires a real contact and sends it only for Antilopay', async () => {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={['/balance/top-up/antilopay?amount=500']}>
        <Routes>
          <Route path="/balance/top-up/:methodId" element={<TopUpAmount />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  await screen.findByRole('heading', { name: 'Antilopay' });
  fireEvent.click(screen.getByRole('button', { name: 'balance.topUp' }));
  expect(createTopUp).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('balance.paymentEmail'), {
    target: { value: 'buyer@example.com' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'balance.topUp' }));
  await waitFor(() =>
    expect(createTopUp).toHaveBeenCalledWith(50000, 'antilopay', 'sbp', 'buyer@example.com'),
  );
});

it('has contact labels in every locale', () => {
  for (const locale of [ru, en, zh, fa]) {
    expect(locale.balance.paymentEmail).toBeTruthy();
    expect(locale.balance.paymentEmailHelp).toBeTruthy();
    expect(locale.balance.paymentEmailInvalid).toBeTruthy();
  }
});
