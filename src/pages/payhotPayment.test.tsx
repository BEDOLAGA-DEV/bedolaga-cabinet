// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { METHOD_LABELS } from '@/constants/paymentMethods';
import { findTreeLocation } from '@/components/admin/constants';
import { SettingInput } from '@/components/admin/SettingInput';
import ru from '@/locales/ru.json';
import en from '@/locales/en.json';
import zh from '@/locales/zh.json';
import fa from '@/locales/fa.json';
import TopUpAmount from './TopUpAmount';

const createTopUp = vi.fn();
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
        id: 'payhot',
        name: 'HOT Pay',
        min_amount_kopeks: 10000,
        max_amount_kopeks: 100000000,
        is_available: true,
        options: [
          { id: 'card', name: 'Карта' },
          { id: 'sbp', name: 'СБП' },
          { id: 'sberpay', name: 'SberPay' },
          { id: 'applepay', name: 'Apple Pay' },
          { id: 'googlepay', name: 'Google Pay' },
          { id: 'crypto', name: 'Криптовалюта' },
        ],
      },
    ],
    createTopUp: (...args: unknown[]) => createTopUp(...args),
  },
}));
let testTime = Date.now();
beforeEach(() => {
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

it('registers HOT Pay labels and its own payment settings section in every locale', () => {
  expect(METHOD_LABELS.payhot).toBe('HOT Pay');
  expect(findTreeLocation('PAYHOT')).toEqual({ groupId: 'payments', subItemId: 'payments_payhot' });
  for (const locale of [ru, en, zh, fa]) {
    expect(locale).toHaveProperty('balance.paymentMethods.payhot.description');
    expect(locale).toHaveProperty('admin.settings.tree.payments_payhot', 'HOT Pay');
    expect(locale).toHaveProperty('admin.settings.categories.PAYHOT', 'HOT Pay');
  }
});

it.each([
  ['sbp', null],
  ['card', 'Карта'],
  ['applepay', 'Apple Pay'],
  ['googlepay', 'Google Pay'],
  ['crypto', 'Криптовалюта'],
])('submits HOT Pay with selected %s option', async (option, label) => {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={['/balance/top-up/payhot?amount=500']}>
        <Routes>
          <Route path="/balance/top-up/:methodId" element={<TopUpAmount />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  expect(await screen.findByRole('heading', { name: 'HOT Pay' })).toBeTruthy();
  if (label) fireEvent.click(screen.getByRole('button', { name: label }));
  fireEvent.click(screen.getByRole('button', { name: /balance\.topUp|balance\.pay/i }));
  await waitFor(() => expect(createTopUp).toHaveBeenCalledWith(50000, 'payhot', option));
});

it.each(['PAYHOT_API_KEY', 'PAYHOT_WEBHOOK_SECRET'])(
  'edits masked %s without submitting the mask',
  (key) => {
    const onUpdate = vi.fn();
    const { container } = render(
      <SettingInput
        onUpdate={onUpdate}
        setting={{
          key,
          name: key,
          category: { key: 'PAYHOT', label: 'HOT Pay' },
          type: 'str',
          is_optional: true,
          current: '••••••••',
          original: '••••••••',
          is_secret: true,
          has_override: true,
          read_only: false,
          env_locked: false,
          choices: [],
        }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '••••••••' }));
    const input = container.querySelector('input');
    expect(input?.type).toBe('password');
    expect(input?.value).toBe('');
    fireEvent.click(screen.getByTitle('admin.settings.saveHint'));
    expect(onUpdate).not.toHaveBeenCalled();
  },
);

it('requires a real SberPay phone and removes it from a different option', async () => {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={['/balance/top-up/payhot?amount=500']}>
        <Routes>
          <Route path="/balance/top-up/:methodId" element={<TopUpAmount />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  fireEvent.click(await screen.findByRole('button', { name: 'SberPay' }));
  fireEvent.click(screen.getByRole('button', { name: /balance\.topUp|balance\.pay/i }));
  expect(createTopUp).not.toHaveBeenCalled();
  const phone = screen.getByRole('textbox', { name: 'balance.paymentPhone' });
  fireEvent.change(phone, { target: { value: '+79990000000' } });
  fireEvent.click(screen.getByRole('button', { name: /balance\.topUp|balance\.pay/i }));
  await waitFor(() =>
    expect(createTopUp).toHaveBeenCalledWith(50000, 'payhot', 'sberpay', undefined, '+79990000000'),
  );
});
