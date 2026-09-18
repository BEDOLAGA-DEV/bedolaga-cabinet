// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Subscription } from '@/types';

/**
 * Главная кнопка на странице подписки для старой подписки.
 *
 * Старая подписка куплена в классике; оператор потом включил тарифы. Продлить
 * её нельзя: в мультитарифе кнопка «Продлить» открывала пустой список
 * «Нет доступных вариантов продления». Теперь у такой подписки кнопка
 * «Перейти на тариф», и ведёт она на витрину тарифов с этой подпиской —
 * выбранный тариф надевается на неё же.
 */

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ru', changeLanguage: () => Promise.resolve() },
  }),
  Trans: ({ children }: { children?: unknown }) => children ?? null,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const subscription = (overrides: Partial<Subscription> = {}): Subscription => ({
  id: 42,
  status: 'active',
  is_trial: false,
  start_date: '2026-08-07T00:00:00Z',
  end_date: '2026-10-07T00:00:00Z',
  days_left: 19,
  hours_left: 0,
  minutes_left: 0,
  time_left_display: '19 д.',
  traffic_limit_gb: 100,
  traffic_used_gb: 0,
  traffic_used_percent: 0,
  device_limit: 3,
  connected_squads: [],
  servers: [],
  autopay_enabled: false,
  autopay_days_before: 3,
  subscription_url: null,
  hide_subscription_link: false,
  is_active: true,
  is_expired: false,
  is_limited: false,
  ...overrides,
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
});

async function renderCta(sub: Subscription, isMultiTariff: boolean) {
  const Cta = (await import('./PurchaseCTAButton')).default;
  render(
    <MemoryRouter>
      <Cta subscription={sub} isMultiTariff={isMultiTariff} />
    </MemoryRouter>,
  );
}

function href(): string | null {
  return screen.getByRole('link').getAttribute('href');
}

describe('старая подписка (нужен тариф)', () => {
  it('в мультитарифе ведёт на витрину тарифов с этой подпиской, а не на продление', async () => {
    await renderCta(subscription({ requires_tariff_selection: true }), true);

    expect(href()).toBe('/subscription/purchase?subscriptionId=42');
    expect(screen.getByText('subscription.cta.moveToTariff')).toBeTruthy();
    expect(screen.queryByText('subscription.extend')).toBeNull();
  });

  it('в одиночном режиме тоже называется «перейти на тариф»', async () => {
    await renderCta(subscription({ requires_tariff_selection: true }), false);

    expect(href()).toBe('/subscription/purchase?subscriptionId=42');
    expect(screen.getByText('subscription.cta.moveToTariff')).toBeTruthy();
  });

  it('истёкшая старая подписка тоже ведёт на витрину с этой подпиской', async () => {
    await renderCta(
      subscription({ requires_tariff_selection: true, is_active: false, is_expired: true }),
      true,
    );

    expect(href()).toBe('/subscription/purchase?subscriptionId=42');
    expect(screen.getByText('subscription.cta.moveToTariff')).toBeTruthy();
  });
});

describe('подписка с тарифом', () => {
  it('в мультитарифе по-прежнему ведёт на продление', async () => {
    await renderCta(subscription({ tariff_id: 7, requires_tariff_selection: false }), true);

    expect(href()).toBe('/subscriptions/42/renew');
    expect(screen.getByText('subscription.extend')).toBeTruthy();
  });
});
