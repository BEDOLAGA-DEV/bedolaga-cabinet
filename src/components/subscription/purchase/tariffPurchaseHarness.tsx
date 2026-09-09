import { render as rtlRender, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { PlatformProvider } from '@/platform/PlatformProvider';
import type { Tariff, TariffPeriod } from '@/types';
import { TariffPurchaseForm } from './TariffPurchaseForm';

/**
 * Обвязка для тестов формы покупки тарифа.
 *
 * Отдельным файлом, а не внутри теста: vi.mock поднимается выше импортов, и мок
 * i18n из теста обязан примениться раньше, чем сюда подтянется сама форма.
 */

export const period = (overrides: Partial<TariffPeriod> & { days: number }): TariffPeriod =>
  ({
    label: `${overrides.days} дней`,
    months: Math.round(overrides.days / 30),
    price_kopeks: overrides.days * 1000,
    price_label: `${overrides.days * 10} ₽`,
    price_per_month_kopeks: 30000,
    price_per_month_label: '300 ₽',
    is_highlighted: false,
    ...overrides,
  }) as unknown as TariffPeriod;

const tariffOf = (periods: TariffPeriod[]): Tariff =>
  ({
    id: 1,
    name: 'Базовый',
    description: null,
    tier_level: 1,
    traffic_limit_gb: 100,
    traffic_limit_label: '100 ГБ',
    is_unlimited_traffic: false,
    device_limit: 1,
    base_device_limit: 1,
    extra_devices_count: 0,
    device_price_kopeks: 0,
    servers_count: 0,
    servers: [],
    is_highlighted: false,
    is_daily: false,
    daily_price_kopeks: 0,
    custom_days_enabled: false,
    custom_traffic_enabled: false,
    price_per_day_kopeks: 0,
    periods,
  }) as unknown as Tariff;

export function render(periods: TariffPeriod[]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  rtlRender(
    <QueryClientProvider client={client}>
      <PlatformProvider>
        <MemoryRouter>
          <TariffPurchaseForm
            tariff={tariffOf(periods)}
            subscriptionId={undefined}
            balanceKopeks={10_000_000}
            onBack={() => {}}
          />
        </MemoryRouter>
      </PlatformProvider>
    </QueryClientProvider>,
  );
}

/** Карточка периода — кнопка вокруг его подписи. */
export function cardFor(label: string): HTMLElement {
  const title = screen.getByText(label);
  const card = title.closest('button');
  if (!card) throw new Error(`не нашёл карточку периода ${label}`);
  return card;
}
