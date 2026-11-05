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
    i18n: { language: 'ru' },
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
vi.mock('../hooks/useCurrency', () => ({
  useCurrency: () => ({
    formatAmount: (v: number) => String(v),
    currencySymbol: '₽',
    convertAmount: (v: number) => v,
    convertToRub: (v: number) => v,
    targetCurrency: 'RUB',
  }),
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
import { loadTopUpPendingInfo } from '../utils/topUpStorage';

let testTime = Date.now();
beforeEach(() => {
  // Separate user attempts by more than the real payment rate-limit window.
  testTime += 31000;
  vi.spyOn(Date, 'now').mockReturnValue(testTime);
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

function renderPage() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
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

it('показывает QR своего экрана оплаты и не уводит на страницу провайдера', async () => {
  createTopUp.mockResolvedValue({
    payment_id: '5',
    payment_url: 'https://pay.cashera.cash/x',
    amount_kopeks: 50000,
    amount_rubles: 500,
    status: 'pending',
    expires_at: null,
    qr_payload: 'https://qr.nspk.ru/AS1',
  });
  renderPage();
  await submit();

  expect(await screen.findByTestId('topup-qr')).toBeTruthy();
  // open_url_direct=true, но при QR автоматический переход не делается
  expect(openLink).not.toHaveBeenCalled();
});

it('без QR — прежнее поведение', async () => {
  createTopUp.mockResolvedValue({
    payment_id: '5',
    payment_url: 'https://pay.cashera.cash/x',
    amount_kopeks: 50000,
    amount_rubles: 500,
    status: 'pending',
    expires_at: null,
  });
  renderPage();
  await submit();

  await waitFor(() => expect(createTopUp).toHaveBeenCalled());
  expect(screen.queryByTestId('topup-qr')).toBeNull();
});

it('отправляет точный дробный минимум без потери копейки при ручном вводе', async () => {
  const methods = await balanceApi.getPaymentMethods();
  vi.mocked(balanceApi.getPaymentMethods).mockResolvedValueOnce(
    methods.map((method) => ({ ...method, min_amount_kopeks: 6407 })),
  );
  createTopUp.mockResolvedValue({
    payment_id: 'local-invoice',
    payment_url: 'https://example.com/pay',
    amount_kopeks: 6407,
    amount_rubles: 64.07,
    status: 'pending',
    expires_at: null,
  });
  renderPage();
  const input = await screen.findByRole('spinbutton');
  fireEvent.change(input, { target: { value: '64.07' } });
  await submit();
  await waitFor(() => expect(createTopUp).toHaveBeenCalledWith(6407, 'cashera', 'sbp'));
});

it('сохраняет настроенное имя метода на экране суммы и в данных платежа', async () => {
  const methods = await balanceApi.getPaymentMethods();
  vi.mocked(balanceApi.getPaymentMethods).mockResolvedValueOnce(
    methods.map((method) => ({ ...method, name: 'Configured Gateway' })),
  );
  createTopUp.mockResolvedValue({
    payment_id: 'local-name',
    payment_url: 'https://example.com/pay',
    amount_kopeks: 50000,
    amount_rubles: 500,
    status: 'pending',
    expires_at: null,
    qr_payload: 'https://qr.example/pay',
  });
  renderPage();
  expect(await screen.findByRole('heading', { name: 'Configured Gateway' })).toBeTruthy();
  await submit();
  await screen.findByTestId('topup-qr');
  expect(loadTopUpPendingInfo()?.method_name).toBe('Configured Gateway');
});
