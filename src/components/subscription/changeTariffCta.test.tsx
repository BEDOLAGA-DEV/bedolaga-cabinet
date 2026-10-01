// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Subscription } from '@/types';

/**
 * «Сменить тариф» на странице подписки в мультитарифе.
 *
 * Раньше человек на «Стандарте», которому нужно больше устройств, мог только
 * докупить устройства, купить ещё одну подписку на другой тариф или писать
 * админу. Теперь кнопка открывает витрину, привязанную к этой подписке, и там
 * тариф меняется с пересчётом остатка.
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
  tariff_id: 7,
  requires_tariff_selection: false,
  ...overrides,
});

afterEach(() => {
  cleanup();
});

async function renderCta(sub: Subscription, isMultiTariff: boolean) {
  const Cta = (await import('./ChangeTariffCTA')).default;
  render(
    <MemoryRouter>
      <Cta subscription={sub} isMultiTariff={isMultiTariff} />
    </MemoryRouter>,
  );
}

describe('ChangeTariffCTA', () => {
  it('в мультитарифе ведёт на витрину тарифов этой подписки', async () => {
    await renderCta(subscription(), true);

    expect(screen.getByRole('link').getAttribute('href')).toBe(
      '/subscription/purchase?subscriptionId=42',
    );
    expect(screen.getByText('subscription.cta.changeTariff')).toBeTruthy();
  });

  it('исчерпавшую трафик подписку тоже меняют', async () => {
    await renderCta(subscription({ is_active: false, is_limited: true }), true);

    expect(screen.queryByRole('link')).not.toBeNull();
  });

  it('в одиночном режиме не показывается: смена там на витрине, куда ведёт «Продлить»', async () => {
    await renderCta(subscription(), false);

    expect(screen.queryByRole('link')).toBeNull();
  });

  it.each([
    ['триал покупают, а не меняют', { is_trial: true }],
    ['истёкшую продлевают', { is_active: false, is_expired: true }],
    ['старую подписку без тарифа переводят на тариф', { requires_tariff_selection: true }],
    ['без тарифа менять нечего', { tariff_id: undefined }],
  ])('не показывается: %s', async (_name, overrides) => {
    await renderCta(subscription(overrides as Partial<Subscription>), true);

    expect(screen.queryByRole('link')).toBeNull();
  });
});
