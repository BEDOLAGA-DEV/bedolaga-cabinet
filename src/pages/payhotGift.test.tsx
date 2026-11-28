// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { PlatformProvider } from '@/platform/PlatformProvider';
import ruLocale from '@/locales/ru.json';
import type { GiftConfig, GiftTariff, GiftTariffPeriod } from '@/api/gift';

/**
 * Подарок выбирает выгодный тариф и выгодный период сразу.
 *
 * Витрина подарка отметку оператора вообще не знала: сервер её не отдавал, а
 * страница брала первый тариф и первый период. Клиент видел ровный список — ту
 * же жалобу, что и на экране покупки.
 */

function ru(key: string): string {
  const value = key
    .split('.')
    .reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], ruLocale);
  if (typeof value !== 'string') throw new Error(`нет строки ${key}`);
  return value;
}

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: unknown, options?: Record<string, unknown>) => {
      const opts = typeof fallback === 'object' && fallback !== null ? fallback : options;
      let template: string;
      try {
        template = ru(key);
      } catch {
        template = typeof fallback === 'string' ? fallback : key;
      }
      return template.replace(/{{(\w+)}}/g, (_m, name) => String((opts as never)?.[name] ?? ''));
    },
    i18n: { language: 'ru', changeLanguage: () => Promise.resolve() },
  }),
  Trans: ({ children }: { children?: unknown }) => children ?? null,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const createPurchase = vi.fn((..._args: unknown[]) => new Promise(() => {}));
const state = { config: null as GiftConfig | null };

vi.mock('@/api/gift', () => ({
  giftApi: {
    getConfig: () => Promise.resolve(state.config),
    getSentGifts: () => Promise.resolve([]),
    getReceivedGifts: () => Promise.resolve([]),
    createPurchase: (...args: unknown[]) => createPurchase(...args),
    activateGiftCode: () => Promise.resolve({}),
  },
}));

vi.mock('@/api/branding', () => ({
  brandingApi: { getTelegramWidgetConfig: () => Promise.resolve({ bot_username: 'bot' }) },
}));

vi.mock('@/api/currency', () => ({
  currencyApi: { getExchangeRates: () => Promise.resolve({ USD: 100, CNY: 14, IRR: 0.0024 }) },
}));

const period = (days: number, highlighted = false): GiftTariffPeriod => ({
  days,
  price_kopeks: days * 1000,
  price_label: `${days * 10} ₽`,
  original_price_kopeks: null,
  discount_percent: null,
  is_highlighted: highlighted,
});

const tariff = (
  overrides: Partial<GiftTariff> & { id: number; name: string; periods: GiftTariffPeriod[] },
): GiftTariff => ({
  description: null,
  traffic_limit_gb: 100,
  device_limit: 1,
  is_highlighted: false,
  ...overrides,
});

const config = (tariffs: GiftTariff[]): GiftConfig => ({
  is_enabled: true,
  tariffs,
  payment_methods: [],
  balance_kopeks: 1_000_000,
  currency_symbol: '₽',
  promo_group_name: null,
  active_discount_percent: null,
  active_discount_expires_at: null,
});

if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

afterEach(() => {
  cleanup();
  state.config = null;
});

async function renderGift() {
  const Gift = (await import('@/pages/GiftSubscription')).default;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <PlatformProvider>
        <MemoryRouter initialEntries={['/gift']}>
          <Gift />
        </MemoryRouter>
      </PlatformProvider>
    </QueryClientProvider>,
  );
}

it('sends payer phone only for HOT Pay SberPay, clears it when method changes', async () => {
  state.config = config([tariff({ id: 1, name: 'Test', periods: [period(30)] })]);
  state.config.payment_methods = [
    {
      method_id: 'payhot',
      display_name: 'HOT Pay',
      sub_options: [
        { id: 'sberpay', name: 'SberPay' },
        { id: 'card', name: 'Card' },
      ],
    },
  ] as typeof state.config.payment_methods;
  await renderGift();
  fireEvent.click(await screen.findByRole('button', { name: ru('gift.viaGateway') }));
  const phone = await screen.findByRole('textbox', { name: ru('balance.paymentPhone') });
  fireEvent.change(phone, { target: { value: '+79990000000' } });
  fireEvent.click(screen.getByRole('button', { name: 'Card' }));
  await waitFor(() =>
    expect(screen.queryByRole('textbox', { name: ru('balance.paymentPhone') })).toBeNull(),
  );
  fireEvent.click(screen.getByRole('button', { name: 'SberPay' }));
  const fresh = await screen.findByRole('textbox', { name: ru('balance.paymentPhone') });
  expect((fresh as HTMLInputElement).value).toBe('');
  fireEvent.change(fresh, { target: { value: '+79990000001' } });
  fireEvent.click(screen.getByRole('button', { name: new RegExp(ru('gift.giftButton')) }));
  await waitFor(() =>
    expect(createPurchase).toHaveBeenCalledWith(
      expect.objectContaining({ payment_method: 'payhot_sberpay', payment_phone: '+79990000001' }),
    ),
  );
});
