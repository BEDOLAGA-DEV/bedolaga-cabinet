// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { PlatformProvider } from '@/platform/PlatformProvider';
import { afterEach, expect, it, vi } from 'vitest';

/**
 * Владелец завёл бесплатный тариф, а форма не давала поставить цену периода 0:
 * набранный ноль тут же превращался в единицу, и кнопка «Добавить» на нулевой
 * цене вообще ничего не делала.
 *
 * Бесплатный тариф — штатная настройка (бот и кабинет продают такой период),
 * поэтому здесь держится контракт формы: ноль вводится и уезжает на сервер
 * нулём, а не единицей.
 */

import ruLocale from '@/locales/ru.json';

function resolveRu(key: string): string | undefined {
  const value = key
    .split('.')
    .reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], ruLocale);
  return typeof value === 'string' ? value : undefined;
}

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      (resolveRu(key) ?? key).replace(/{{(\w+)}}/g, (_m, name) => String(options?.[name] ?? '')),
    i18n: { language: 'ru', changeLanguage: () => Promise.resolve() },
  }),
  Trans: ({ children }: { children?: unknown }) => children ?? null,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const created: unknown[] = [];

vi.mock('@/api/tariffs', () => ({
  tariffsApi: {
    getServers: () => Promise.resolve([]),
    getExternalSquads: () => Promise.resolve([]),
    getPromoGroups: () => Promise.resolve([]),
    getTariff: () => Promise.resolve(null),
    createTariff: (payload: unknown) => {
      created.push(payload);
      return Promise.resolve({ id: 1 });
    },
    updateTariff: (_id: number, payload: unknown) => {
      created.push(payload);
      return Promise.resolve({ id: 1 });
    },
  },
}));

import AdminTariffCreate from './AdminTariffCreate';

afterEach(() => {
  created.length = 0;
  cleanup();
});

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <PlatformProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <AdminTariffCreate />
        </MemoryRouter>
      </QueryClientProvider>
    </PlatformProvider>,
  );
}

/** Поле «Цена» на вкладке периодов — то, что рядом с полем «Дней». */
function priceInput(): HTMLInputElement {
  const label = screen.getAllByText(resolveRu('admin.tariffs.priceLabel') as string)[0];
  return label.parentElement!.querySelector('input') as HTMLInputElement;
}

function daysInput(): HTMLInputElement {
  const label = screen.getByText(resolveRu('admin.tariffs.daysLabel') as string);
  return label.parentElement!.querySelector('input') as HTMLInputElement;
}

async function openPeriodsTab() {
  fireEvent.click(screen.getByText(resolveRu('admin.tariffs.periodTariff') as string));
  fireEvent.click(await screen.findByText(resolveRu('admin.tariffs.tabPeriods') as string));
}

function fillName(value: string) {
  fireEvent.change(document.getElementById('tariff-name') as HTMLInputElement, {
    target: { value },
  });
}

it('нулевая цена периода вводится и не подменяется единицей', async () => {
  renderPage();
  await openPeriodsTab();

  fireEvent.change(priceInput(), { target: { value: '0' } });

  expect(priceInput().value).toBe('0');
});

it('период с нулевой ценой добавляется и сохраняется нулём', async () => {
  renderPage();
  await openPeriodsTab();

  fireEvent.change(daysInput(), { target: { value: '30' } });
  fireEvent.change(priceInput(), { target: { value: '0' } });
  fireEvent.click(screen.getByText(resolveRu('admin.tariffs.addButton') as string));

  // Период появился в списке — значит «Добавить» не промолчала на нулевой цене.
  expect(await screen.findByText(`30 ${resolveRu('admin.tariffs.daysShort')}`)).toBeTruthy();

  fireEvent.click(screen.getByText(resolveRu('admin.tariffs.tabBasic') as string));
  fillName('Бесплатный');
  fireEvent.click(screen.getByText(resolveRu('admin.tariffs.saveButton') as string));

  await waitFor(() => expect(created.length).toBe(1));
  const payload = created[0] as { period_prices: { days: number; price_kopeks: number }[] };
  expect(payload.period_prices).toEqual([{ days: 30, price_kopeks: 0 }]);
});
