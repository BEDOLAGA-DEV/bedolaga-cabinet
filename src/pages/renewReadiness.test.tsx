// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AxiosError } from 'axios';
import { createInstance } from 'i18next';
import { PlatformProvider } from '@/platform/PlatformProvider';
import ru from '@/locales/ru.json';
import en from '@/locales/en.json';
import fa from '@/locales/fa.json';
import zh from '@/locales/zh.json';
import RenewSubscription from './RenewSubscription';

const api = vi.hoisted(() => ({ options: vi.fn(), renew: vi.fn() }));
const translations = createInstance();
await translations.init({
  resources: {
    ru: { translation: ru },
    en: { translation: en },
    fa: { translation: fa },
    zh: { translation: zh },
  },
  lng: 'ru',
  initAsync: false,
});
vi.mock('react-i18next', async () => ({
  ...(await vi.importActual('react-i18next')),
  useTranslation: () => ({ t: translations.t.bind(translations), i18n: translations }),
}));
vi.mock('@/hooks/useCurrency', () => ({
  useCurrency: () => ({ formatAmount: String, currencySymbol: '¤' }),
}));
vi.mock('@/hooks/useTheme', () => ({ useTheme: () => ({ isDark: true }) }));
vi.mock('@/api/subscription', () => ({
  subscriptionApi: {
    getSubscription: async () => ({
      subscription: {
        id: 7,
        tariff_id: 1,
        tariff_name: 'Synthetic',
        is_trial: false,
        is_daily: false,
        traffic_accounting_mode: 'split',
        end_date: '2026-12-01T00:00:00Z',
      },
    }),
    getRenewalOptions: api.options,
    getPurchaseOptions: async () => ({ balance_kopeks: 50000 }),
    renewSubscription: api.renew,
  },
}));

const serverMessage =
  'Previous subscription changes are still being applied. Please try again shortly.';
function notReady() {
  return Object.assign(new AxiosError('Conflict'), {
    response: {
      status: 409,
      data: { detail: { code: 'split_renewal_not_ready', message: serverMessage } },
    },
  });
}
const messages = {
  ru: 'Предыдущие изменения подписки ещё применяются. Попробуйте немного позже.',
  en: serverMessage,
  fa: 'تغییرات قبلی اشتراک هنوز در حال اعمال است. کمی بعد دوباره تلاش کنید.',
  zh: '订阅的上一次更改仍在处理中，请稍后重试。',
};
const clients: QueryClient[] = [];
function mount() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: 2, retryDelay: 0 },
      mutations: { retry: 2, retryDelay: 0 },
    },
  });
  clients.push(client);
  render(
    <QueryClientProvider client={client}>
      <PlatformProvider>
        <MemoryRouter initialEntries={['/subscriptions/7/renew']}>
          <Routes>
            <Route path="/subscriptions/:subscriptionId/renew" element={<RenewSubscription />} />
            <Route path="/subscriptions/:subscriptionId" element={<output>Renewed</output>} />
          </Routes>
        </MemoryRouter>
      </PlatformProvider>
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  api.options.mockResolvedValue([{ period_days: 30, price_kopeks: 10000, is_highlighted: true }]);
  api.renew.mockResolvedValue({ success: true });
});
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => {
    client.clear();
  });
});

it.each(Object.keys(messages) as (keyof typeof messages)[])(
  'shows localized GET readiness and only manually retries quotes (%s)',
  async (language) => {
    await translations.changeLanguage(language);
    api.options.mockRejectedValue(notReady());
    mount();
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', messages[language]);
    expect(screen.queryByText(translations.t('subscription.noRenewalOptions'))).toBeNull();
    expect(
      screen.queryByRole('button', { name: translations.t('subscription.extend') }),
    ).toBeNull();
    expect(api.options).toHaveBeenCalledTimes(1);
    expect(api.renew).not.toHaveBeenCalled();
    api.options.mockResolvedValue([{ period_days: 30, price_kopeks: 10000, is_highlighted: true }]);
    fireEvent.click(screen.getByRole('button', { name: translations.t('common.retry') }));
    await screen.findByRole('button', { name: translations.t('subscription.extend') });
    expect(api.options).toHaveBeenCalledTimes(2);
    expect(api.renew).not.toHaveBeenCalled();
  },
);

it.each(Object.keys(messages) as (keyof typeof messages)[])(
  'shows localized POST readiness without automatic payment retries (%s)',
  async (language) => {
    await translations.changeLanguage(language);
    api.renew.mockRejectedValue(notReady());
    mount();
    fireEvent.click(
      await screen.findByRole('button', { name: translations.t('subscription.extend') }),
    );
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', messages[language]);
    await waitFor(() => expect(api.renew).toHaveBeenCalledTimes(1));
    expect(sessionStorage.getItem('split-renewal:7')).toBeNull();
  },
);

it('keeps an existing paid confirmation available when new renewal quotes are blocked', async () => {
  await translations.changeLanguage('ru');
  sessionStorage.setItem(
    'split-renewal:7',
    JSON.stringify({
      period: 30,
      price: 10000,
      operation: '11111111-1111-4111-8111-111111111111',
      endDate: '2026-12-01T00:00:00Z',
      delivery_pending: true,
    }),
  );
  api.options.mockRejectedValue(notReady());
  mount();
  const check = await screen.findByRole('button', {
    name: translations.t('subscription.splitPurchase.check'),
  });
  expect(api.renew).not.toHaveBeenCalled();
  fireEvent.click(check);
  await screen.findByText('Renewed');
  expect(api.renew).toHaveBeenCalledTimes(1);
  expect(api.renew).toHaveBeenCalledWith(30, 7, '2026-12-01T00:00:00Z', {
    operationId: '11111111-1111-4111-8111-111111111111',
    expectedPriceKopeks: 10000,
  });
});
