import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render as rtlRender } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

import type { PurchaseOptions, Subscription, Tariff } from '@/types';
import { TariffPickerLite } from './purchase/TariffPickerLite';

/**
 * Обвязка для тестов простого списка тарифов.
 *
 * Отдельным файлом по той же причине, что и обвязка обычной сетки: vi.mock
 * поднимается выше импортов, и мок i18n из теста обязан примениться раньше,
 * чем сюда подтянется сам список.
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

export interface LiteRenderOptions {
  subscription?: Partial<Subscription> | null;
  purchaseOptions?: Partial<PurchaseOptions>;
  isMultiTariff?: boolean;
  onSelectTariff?: (tariff: Tariff) => void;
  onSwitchTariff?: (tariffId: number) => void;
}

export function render(
  tariffs: Array<Partial<Tariff> & { id: number; name: string }>,
  options: LiteRenderOptions = {},
) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  rtlRender(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <TariffPickerLite
          tariffs={tariffs.map(base)}
          subscription={(options.subscription ?? null) as never}
          purchaseOptions={options.purchaseOptions as never}
          isTariffsMode
          isMultiTariff={options.isMultiTariff ?? false}
          onSelectTariff={options.onSelectTariff ?? (() => {})}
          onSwitchTariff={options.onSwitchTariff ?? (() => {})}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
