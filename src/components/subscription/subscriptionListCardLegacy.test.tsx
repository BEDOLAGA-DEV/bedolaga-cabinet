// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlatformProvider } from '@/platform/PlatformProvider';
import type { SubscriptionListItem } from '@/types';

/**
 * Карточка старой подписки в списке (мультитариф, главная и «Мои подписки»).
 *
 * Старая подписка куплена в классике, тарифа нет, оператор на тарифах. В строке
 * статусов у неё стояло «✕ Автопродление» — автоплатёж ей вообще недоступен.
 * Вместо этого карточка подсказывает единственный путь: «Перейти на тариф».
 */

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ru', changeLanguage: () => Promise.resolve() },
  }),
  Trans: ({ children }: { children?: unknown }) => children ?? null,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const item = (overrides: Partial<SubscriptionListItem> = {}): SubscriptionListItem => ({
  id: 42,
  status: 'active',
  tariff_id: null,
  tariff_name: null,
  traffic_limit_gb: 0,
  traffic_used_gb: 1,
  device_limit: 3,
  end_date: '2026-10-07T00:00:00Z',
  subscription_url: null,
  subscription_crypto_link: null,
  is_trial: false,
  autopay_enabled: false,
  connected_squads: [],
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

async function renderCard(sub: SubscriptionListItem) {
  const Card = (await import('./SubscriptionListCard')).default;
  render(
    <PlatformProvider>
      <MemoryRouter>
        <Card subscription={sub} onClick={() => {}} />
      </MemoryRouter>
    </PlatformProvider>,
  );
}

describe('старая подписка в списке', () => {
  it('даёт настоящую кнопку-ссылку на витрину вместо статуса автопродления', async () => {
    await renderCard(item({ requires_tariff_selection: true }));

    const move = await screen.findByRole('link', { name: 'subscription.cta.moveToTariff' });
    expect(move.getAttribute('href')).toBe('/subscription/purchase?subscriptionId=42');
    expect(move.className).toContain('btn-');
    expect(screen.queryByText('subscription.autopay')).toBeNull();
  });

  it('обычная подписка с тарифом показывает автопродление как раньше', async () => {
    await renderCard(
      item({ tariff_id: 7, tariff_name: 'Базовый', requires_tariff_selection: false }),
    );

    expect(await screen.findByText('subscription.autopay')).toBeTruthy();
    expect(screen.queryByText('subscription.cta.moveToTariff')).toBeNull();
  });
});
