// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlatformProvider } from '@/platform/PlatformProvider';
import type { Subscription } from '@/types';

/**
 * Вёрстка карточки подписки на телефоне.
 *
 * У тарифа с длинным именем («🟡 Компания - 10 устройств») плитка «Осталось»
 * уезжала за правый край карточки: у флекс-элемента без `min-w-0` минимальная
 * ширина равна ширине неразрывного текста внутри. А десять точек-индикаторов
 * съедали 124px из 272px плитки «Подключить устройство», и заголовок ломался
 * на четыре строки.
 *
 * jsdom не считает раскладку, поэтому здесь сторожатся сами признаки:
 * ограничитель ширины у обеих плиток и вид индикатора устройств.
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
  end_date: '2029-08-29T00:00:00Z',
  days_left: 1085,
  hours_left: 0,
  minutes_left: 0,
  time_left_display: '',
  traffic_limit_gb: 250,
  traffic_used_gb: 22.2,
  traffic_used_percent: 9,
  device_limit: 10,
  connected_squads: [],
  servers: [],
  autopay_enabled: false,
  autopay_days_before: 3,
  subscription_url: 'https://example.com/sub/abc',
  hide_subscription_link: false,
  is_active: true,
  is_expired: false,
  is_limited: false,
  tariff_id: 7,
  tariff_name: '🟡 Компания - 10 устройств',
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

afterEach(cleanup);

const idleMutation = {
  mutate: () => {},
  isPending: false,
} as unknown as Parameters<
  typeof import('./SubscriptionCardActive').default
>[0]['refreshTrafficMutation'];

async function renderCard(sub: Subscription, connectedDevices = 0) {
  const Card = (await import('./SubscriptionCardActive')).default;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const { container } = render(
    <QueryClientProvider client={client}>
      <PlatformProvider>
        <MemoryRouter initialEntries={['/']}>
          <Card
            subscription={sub}
            trafficData={null}
            refreshTrafficMutation={idleMutation}
            trafficRefreshCooldown={0}
            connectedDevices={connectedDevices}
          />
        </MemoryRouter>
      </PlatformProvider>
    </QueryClientProvider>,
  );
  return container;
}

describe('ряд «Тариф» + «Осталось»', () => {
  it('обе плитки умеют сжиматься — длинное имя тарифа не выталкивает соседа', async () => {
    const container = await renderCard(subscription());

    const row = container.querySelector('.mb-5.flex.gap-2\\.5');
    expect(row).toBeTruthy();
    const plates = [...(row?.children ?? [])];
    expect(plates).toHaveLength(2);
    for (const plate of plates) {
      expect(plate.className).toContain('min-w-0');
      expect(plate.className).toContain('flex-1');
    }
  });

  it('имя тарифа переносится, а не обрезается в одну строку', async () => {
    await renderCard(subscription());

    const name = screen.getByText('🟡 Компания - 10 устройств');
    expect(name.className).toContain('line-clamp-2');
    expect(name.className).not.toContain('truncate');
  });
});

describe('индикатор устройств', () => {
  const dots = (container: Element) =>
    container.querySelectorAll('.h-\\[7px\\].w-\\[7px\\].rounded-full');

  it('до пяти устройств показывает точки', async () => {
    const container = await renderCard(subscription({ device_limit: 5 }), 2);

    expect(dots(container)).toHaveLength(5);
  });

  it('свыше пяти — полоску: десять точек не оставляли места заголовку', async () => {
    const container = await renderCard(subscription({ device_limit: 10 }), 10);

    expect(dots(container)).toHaveLength(0);
    expect(container.querySelector('.w-16 .rounded-full')).toBeTruthy();
  });
});
