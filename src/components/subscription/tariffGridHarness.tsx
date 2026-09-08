import { render as rtlRender, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import type { Tariff } from '@/types';
import { TariffPickerGrid } from './purchase/TariffPickerGrid';

/**
 * Обвязка для тестов сетки тарифов: карточка — это блок вокруг названия.
 *
 * Живёт отдельным файлом, а не внутри теста, потому что vi.mock поднимается
 * выше импортов и мок i18n из теста обязан примениться раньше, чем сюда
 * подтянется сама сетка.
 */

const base = (overrides: Partial<Tariff> & { id: number; name: string }): Tariff =>
  ({
    description: null,
    tier_level: 1,
    traffic_limit_gb: 100,
    traffic_limit_label: '100 ГБ',
    is_unlimited_traffic: false,
    device_limit: 1,
    extra_devices_count: 0,
    servers_count: 0,
    servers: [],
    periods: [],
    ...overrides,
  }) as unknown as Tariff;

export function render(
  tariffs: Array<Partial<Tariff> & { id: number; name: string }>,
  options: { currentTariffId?: number } = {},
) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  rtlRender(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <TariffPickerGrid
          tariffs={tariffs.map(base)}
          subscription={
            options.currentTariffId
              ? ({ tariff_id: options.currentTariffId, is_active: true } as never)
              : null
          }
          purchaseOptions={undefined}
          isTariffsMode
          isMultiTariff={false}
          onSelectTariff={() => {}}
          onSwitchTariff={() => {}}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Карточка тарифа — ближайший блок вокруг его названия. */
export function cardFor(name: string): HTMLElement {
  const title = screen.getByText(name);
  const card = title.closest('div.bento-card-hover');
  if (!card) throw new Error(`не нашёл карточку тарифа ${name}`);
  return card as HTMLElement;
}
