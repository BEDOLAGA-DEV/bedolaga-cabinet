// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router';
import { afterEach, expect, it, vi } from 'vitest';
import en from '../../locales/en.json';
import fa from '../../locales/fa.json';
import ru from '../../locales/ru.json';
import zh from '../../locales/zh.json';
import type { Tariff } from '../../types';
import { TariffPickerGrid } from './purchase/TariffPickerGrid';
import { TariffPickerLite } from './purchase/TariffPickerLite';
import { TariffPurchaseForm } from './purchase/TariffPurchaseForm';

vi.mock('../../hooks/useCurrency', () => ({
  useCurrency: () => ({
    formatAmount: (v: number) => String(v),
    currencySymbol: 'RUB',
  }),
}));
vi.mock('../../platform', () => ({ usePlatform: () => ({ openLink: vi.fn(), platform: 'web' }) }));
vi.mock('../../hooks/useTheme', () => ({ useTheme: () => ({ isDark: true, theme: 'dark' }) }));
afterEach(cleanup);
const resources = {
  ru: { translation: ru },
  en: { translation: en },
  fa: { translation: fa },
  zh: { translation: zh },
};
it.each(['grid', 'lite', 'form'] as const)(
  '%s follows UI language changes with cached Russian API labels',
  async (view) => {
    const i18n = createInstance();
    await i18n.init({ lng: 'en', resources, interpolation: { escapeValue: false } });
    const tariff = {
      id: 1,
      name: 'Example',
      description: '',
      tier_level: 1,
      traffic_limit_gb: 200,
      traffic_limit_label: '200 ГБ',
      is_unlimited_traffic: false,
      device_limit: 1,
      extra_devices_count: 0,
      servers_count: 0,
      servers: [],
      periods: [],
      is_daily: true,
      daily_price_kopeks: 100,
      is_available: true,
    } as unknown as Tariff;
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    function content(tariff: Tariff) {
      const props = {
        tariffs: [tariff],
        subscription: null,
        purchaseOptions: undefined,
        isTariffsMode: true,
        isMultiTariff: false,
        onSelectTariff: vi.fn(),
        onSwitchTariff: vi.fn(),
      };
      return (
        <I18nextProvider i18n={i18n}>
          <QueryClientProvider client={client}>
            <MemoryRouter>
              {view === 'grid' ? (
                <TariffPickerGrid {...props} />
              ) : view === 'lite' ? (
                <TariffPickerLite {...props} />
              ) : (
                <TariffPurchaseForm
                  tariff={tariff}
                  subscriptionId={undefined}
                  balanceKopeks={10000}
                  onBack={vi.fn()}
                />
              )}
            </MemoryRouter>
          </QueryClientProvider>
        </I18nextProvider>
      );
    }
    const rendered = render(content(tariff));
    for (const [language, expected] of [
      ['en', '200 GB'],
      ['fa', '200 GB'],
      ['zh', '200 GB'],
      ['ru', '200 ГБ'],
    ]) {
      await i18n.changeLanguage(language);
      rendered.rerender(content(tariff));
      expect(screen.getByText((text) => text.includes(expected))).toBeTruthy();
      if (language !== 'ru') expect(rendered.container.textContent).not.toContain('ГБ');
    }
    const unlimited = {
      ...tariff,
      traffic_limit_gb: 0,
      traffic_limit_label: '♾️ Безлимит',
      is_unlimited_traffic: true,
    };
    for (const [language, expected] of [
      ['en', 'Unlimited'],
      ['fa', 'نامحدود'],
      ['zh', '无限'],
      ['ru', 'Безлимит'],
    ]) {
      await i18n.changeLanguage(language);
      rendered.rerender(content(unlimited));
      expect(screen.getByText((text) => text.includes(expected))).toBeTruthy();
      if (language !== 'ru') expect(rendered.container.textContent).not.toContain('Безлимит');
    }
  },
);
