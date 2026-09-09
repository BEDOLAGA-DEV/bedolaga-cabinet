// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

const state = { config: null as GiftConfig | null };

vi.mock('@/api/gift', () => ({
  giftApi: {
    getConfig: () => Promise.resolve(state.config),
    getSentGifts: () => Promise.resolve([]),
    getReceivedGifts: () => Promise.resolve([]),
    createPurchase: () => Promise.resolve({}),
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

/** Карточка тарифа — радиокнопка вокруг названия. */
function tariffCard(name: string): HTMLElement {
  const title = screen.getByText(name);
  const card = title.closest('button');
  if (!card) throw new Error(`не нашёл карточку тарифа ${name}`);
  return card;
}

/** Карточка периода — кнопка вокруг подписи периода. */
function periodCard(label: string): HTMLElement {
  const title = screen.getByText(label);
  const card = title.closest('button');
  if (!card) throw new Error(`не нашёл карточку периода ${label}`);
  return card;
}

const SELECTED_TARIFF = 'border-accent-500/50';
const SELECTED_PERIOD = 'from-accent-500';

describe('подарок: выбранные по умолчанию тариф и период', () => {
  it('выгодный тариф выбран сразу, а не первый по счёту', async () => {
    state.config = config([
      tariff({ id: 1, name: 'Базовый', periods: [period(30)] }),
      tariff({ id: 2, name: 'Годовой', is_highlighted: true, periods: [period(30)] }),
    ]);
    await renderGift();
    await screen.findByText('Годовой');

    expect(tariffCard('Годовой').className).toContain(SELECTED_TARIFF);
    expect(tariffCard('Базовый').className).not.toContain(SELECTED_TARIFF);
  });

  it('выгодный период выбран сразу, а не первый по счёту', async () => {
    state.config = config([
      tariff({ id: 1, name: 'Базовый', periods: [period(30), period(180, true)] }),
    ]);
    await renderGift();
    await screen.findByText('1 месяц');

    expect(periodCard('6 месяцев').className).toContain(SELECTED_PERIOD);
    expect(periodCard('1 месяц').className).not.toContain(SELECTED_PERIOD);
  });

  it('выгодный период подписан «Выгодно», остальные — нет', async () => {
    state.config = config([
      tariff({ id: 1, name: 'Базовый', periods: [period(30), period(180, true)] }),
    ]);
    await renderGift();
    await screen.findByText('1 месяц');

    const badges = screen.getAllByText(ru('subscription.bestValue'));
    expect(badges).toHaveLength(1);
    expect(periodCard('6 месяцев').contains(badges[0])).toBe(true);
  });

  it('выгодный тариф подписан «Выгодно»', async () => {
    state.config = config([
      tariff({ id: 1, name: 'Базовый', periods: [period(30)] }),
      tariff({ id: 2, name: 'Годовой', is_highlighted: true, periods: [period(30)] }),
    ]);
    await renderGift();
    await screen.findByText('Годовой');

    const badges = screen.getAllByText(ru('subscription.bestValue'));
    expect(badges).toHaveLength(1);
    expect(tariffCard('Годовой').contains(badges[0])).toBe(true);
  });

  it('без отметок ничего не подписывает', async () => {
    state.config = config([tariff({ id: 1, name: 'Базовый', periods: [period(30), period(180)] })]);
    await renderGift();
    await screen.findByText('1 месяц');

    expect(screen.queryByText(ru('subscription.bestValue'))).toBeNull();
  });

  it('смена тарифа переносит выбор на выгодный период нового тарифа', async () => {
    state.config = config([
      tariff({ id: 1, name: 'Базовый', periods: [period(30), period(180)] }),
      tariff({ id: 2, name: 'Премиум', periods: [period(30), period(180, true)] }),
    ]);
    await renderGift();
    await screen.findByText('Премиум');
    expect(periodCard('1 месяц').className).toContain(SELECTED_PERIOD);

    fireEvent.click(tariffCard('Премиум'));

    expect(periodCard('6 месяцев').className).toContain(SELECTED_PERIOD);
    expect(periodCard('1 месяц').className).not.toContain(SELECTED_PERIOD);
  });

  it('свой выбор периода не перебивается', async () => {
    state.config = config([
      tariff({ id: 1, name: 'Базовый', periods: [period(30), period(180, true)] }),
      tariff({ id: 2, name: 'Премиум', periods: [period(30), period(180)] }),
    ]);
    await renderGift();
    await screen.findByText('Базовый');

    fireEvent.click(periodCard('1 месяц'));

    expect(periodCard('1 месяц').className).toContain(SELECTED_PERIOD);
    expect(periodCard('6 месяцев').className).not.toContain(SELECTED_PERIOD);
  });

  it('без отметок остаётся первый тариф и первый период', async () => {
    state.config = config([
      tariff({ id: 1, name: 'Базовый', periods: [period(30), period(180)] }),
      tariff({ id: 2, name: 'Годовой', periods: [period(30)] }),
    ]);
    await renderGift();
    await screen.findByText('Базовый');

    expect(tariffCard('Базовый').className).toContain(SELECTED_TARIFF);
    expect(periodCard('1 месяц').className).toContain(SELECTED_PERIOD);
  });
});
