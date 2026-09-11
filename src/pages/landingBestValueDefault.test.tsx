// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

const state = { config: null as LandingConfig | null };

vi.mock('@/api/landings', () => ({
  landingApi: {
    getConfig: () => Promise.resolve(state.config),
    createPurchase: () => Promise.resolve({}),
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

/** Карточка тарифа — радиокнопка с его заголовком (название есть и в сводке). */
function tariffCard(name: string): HTMLElement {
  const card = screen
    .getAllByRole('radio')
    .find((node) => node.querySelector('h3')?.textContent === name);
  if (!card) throw new Error(`не нашёл карточку тарифа ${name}`);
  return card;
}

/** Вкладка периода — кнопка с его подписью. */
function periodTab(label: string): HTMLElement {
  const tab = screen.getByRole('button', { name: label });
  return tab;
}

const SELECTED_TARIFF = 'border-accent-500/50';
const SELECTED_PERIOD = 'bg-accent-500';

describe('лендинг: выбранные по умолчанию тариф и период', () => {
  it('выгодный тариф выбран сразу, а не первый по счёту', async () => {
    state.config = config([
      tariff({ id: 1, name: 'Базовый', periods: [period(30)] }),
      tariff({ id: 2, name: 'Годовой', is_highlighted: true, periods: [period(30)] }),
    ]);
    await renderLanding();
    await screen.findAllByText('Годовой');

    expect(tariffCard('Годовой').className).toContain(SELECTED_TARIFF);
    expect(tariffCard('Базовый').className).not.toContain(SELECTED_TARIFF);
  });

  it('выгодный период выбран сразу, а не самый короткий', async () => {
    state.config = config([
      tariff({ id: 1, name: 'Базовый', periods: [period(30), period(180, true)] }),
    ]);
    await renderLanding();
    await screen.findAllByText('Базовый');

    expect(periodTab('6 месяцев').className).toContain(SELECTED_PERIOD);
    expect(periodTab('1 месяц').className).not.toContain(SELECTED_PERIOD);
  });

  it('выгодный тариф подписан «Выгодно», остальные — нет', async () => {
    state.config = config([
      tariff({ id: 1, name: 'Базовый', periods: [period(30)] }),
      tariff({ id: 2, name: 'Годовой', is_highlighted: true, periods: [period(30)] }),
    ]);
    await renderLanding();
    await screen.findAllByText('Годовой');

    const badges = screen.getAllByText(ru('subscription.bestValue'));
    expect(badges).toHaveLength(1);
    expect(tariffCard('Годовой').contains(badges[0])).toBe(true);
  });

  it('без отметок ничего не подписывает', async () => {
    state.config = config([tariff({ id: 1, name: 'Базовый', periods: [period(30), period(180)] })]);
    await renderLanding();
    await screen.findAllByText('Базовый');

    expect(screen.queryByText(ru('subscription.bestValue'))).toBeNull();
  });

  it('свой выбор периода не перебивается', async () => {
    state.config = config([
      tariff({ id: 1, name: 'Базовый', periods: [period(30), period(180, true)] }),
    ]);
    await renderLanding();
    await screen.findAllByText('Базовый');

    fireEvent.click(periodTab('1 месяц'));

    expect(periodTab('1 месяц').className).toContain(SELECTED_PERIOD);
    expect(periodTab('6 месяцев').className).not.toContain(SELECTED_PERIOD);
  });

  it('свой выбор тарифа не перебивается', async () => {
    state.config = config([
      tariff({ id: 1, name: 'Базовый', periods: [period(30)] }),
      tariff({ id: 2, name: 'Годовой', is_highlighted: true, periods: [period(30)] }),
    ]);
    await renderLanding();
    await screen.findAllByText('Базовый');

    fireEvent.click(tariffCard('Базовый'));

    expect(tariffCard('Базовый').className).toContain(SELECTED_TARIFF);
    expect(tariffCard('Годовой').className).not.toContain(SELECTED_TARIFF);
  });

  it('без отметок остаётся первый тариф и самый короткий период', async () => {
    state.config = config([
      tariff({ id: 1, name: 'Базовый', periods: [period(30), period(180)] }),
      tariff({ id: 2, name: 'Годовой', periods: [period(30)] }),
    ]);
    await renderLanding();
    await screen.findAllByText('Базовый');

    expect(tariffCard('Базовый').className).toContain(SELECTED_TARIFF);
    expect(periodTab('1 месяц').className).toContain(SELECTED_PERIOD);
  });
});
