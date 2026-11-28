// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, expect, it, vi } from 'vitest';
import { PlatformProvider } from '@/platform/PlatformProvider';
import ruLocale from '@/locales/ru.json';
import type { LandingConfig, LandingTariff, LandingTariffPeriod } from '@/api/landings';

/**
 * Лендинг выбирает выгодный тариф и выгодный период сразу.
 *
 * Быстрая покупка знала только порядок: первый тариф и самый короткий период.
 * Отметку оператора сюда не отдавали вовсе, хотя ставится она у того же тарифа.
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
const state = { config: null as LandingConfig | null };

vi.mock('@/api/landings', () => ({
  landingApi: {
    getConfig: () => Promise.resolve(state.config),
    createPurchase: (...args: unknown[]) => createPurchase(...args),
  },
}));

vi.mock('@/api/currency', () => ({
  currencyApi: { getExchangeRates: () => Promise.resolve({ USD: 100, CNY: 14, IRR: 0.0024 }) },
}));

const period = (days: number, highlighted = false): LandingTariffPeriod => ({
  days,
  label: `${days} дней`,
  price_kopeks: days * 1000,
  price_label: `${days * 10} ₽`,
  original_price_kopeks: null,
  original_price_label: null,
  discount_percent: null,
  is_highlighted: highlighted,
});

const tariff = (
  overrides: Partial<LandingTariff> & { id: number; name: string; periods: LandingTariffPeriod[] },
): LandingTariff => ({
  description: null,
  traffic_limit_gb: 100,
  device_limit: 1,
  tier_level: 1,
  is_highlighted: false,
  ...overrides,
});

const config = (tariffs: LandingTariff[]): LandingConfig =>
  ({
    slug: 'promo',
    title: 'Быстрая покупка',
    subtitle: null,
    features: [],
    footer_text: null,
    tariffs,
    payment_methods: [],
    gift_enabled: false,
    custom_css: null,
    meta_title: null,
    meta_description: null,
    discount: null,
    background_config: null,
    analytics_view_enabled: false,
  }) as unknown as LandingConfig;

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

async function renderLanding() {
  const Landing = (await import('@/pages/QuickPurchase')).default;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <PlatformProvider>
        <MemoryRouter initialEntries={['/l/promo']}>
          <Routes>
            <Route path="/l/:slug" element={<Landing />} />
          </Routes>
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
  await renderLanding();
  fireEvent.change(await screen.findByPlaceholderText(ru('landing.contactPlaceholder')), {
    target: { value: 'payer@example.com' },
  });
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
  fireEvent.click(screen.getByRole('button', { name: new RegExp(ru('landing.pay')) }));
  await waitFor(() =>
    expect(createPurchase).toHaveBeenCalledWith(
      'promo',
      expect.objectContaining({
        payment_method: 'payhot_sberpay',
        payment_phone: '+79990000001',
        contact_value: 'payer@example.com',
      }),
    ),
  );
});
