// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { PlatformProvider } from '@/platform/PlatformProvider';
import { afterEach, expect, it, vi } from 'vitest';

/**
 * Тариф не создавался из кабинета: «ничего не выделено» форма кодировала нулём
 * и на создании, и на правке, а сервер на создании ноль отвергал.
 *
 * Выделение выгодного периода необязательно. На создании поле без отметки
 * просто не уходит (нет «прошлого значения», которое надо снимать), с отметкой —
 * уходят дни. Ноль остаётся только у правки, где он значит «снять выделение».
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

const created: Record<string, unknown>[] = [];

vi.mock('@/api/tariffs', () => ({
  tariffsApi: {
    getServers: () => Promise.resolve([]),
    getExternalSquads: () => Promise.resolve([]),
    getPromoGroups: () => Promise.resolve([]),
    getTariff: () => Promise.resolve(null),
    createTariff: (payload: Record<string, unknown>) => {
      created.push(payload);
      return Promise.resolve({ id: 1 });
    },
    updateTariff: (_id: number, payload: Record<string, unknown>) => {
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

function priceInput(): HTMLInputElement {
  const label = screen.getAllByText(resolveRu('admin.tariffs.priceLabel') as string)[0];
  return label.parentElement!.querySelector('input') as HTMLInputElement;
}

function daysInput(): HTMLInputElement {
  const label = screen.getByText(resolveRu('admin.tariffs.daysLabel') as string);
  return label.parentElement!.querySelector('input') as HTMLInputElement;
}

async function addPeriod(days: string) {
  fireEvent.click(screen.getByText(resolveRu('admin.tariffs.periodTariff') as string));
  fireEvent.click(await screen.findByText(resolveRu('admin.tariffs.tabPeriods') as string));
  fireEvent.change(daysInput(), { target: { value: days } });
  fireEvent.change(priceInput(), { target: { value: '399' } });
  fireEvent.click(screen.getByText(resolveRu('admin.tariffs.addButton') as string));
  await screen.findByText(`${days} ${resolveRu('admin.tariffs.daysShort')}`);
}

async function save(name: string) {
  fireEvent.click(screen.getByText(resolveRu('admin.tariffs.tabBasic') as string));
  fireEvent.change(document.getElementById('tariff-name') as HTMLInputElement, {
    target: { value: name },
  });
  fireEvent.click(screen.getByText(resolveRu('admin.tariffs.saveButton') as string));
  await waitFor(() => expect(created.length).toBe(1));
  return created[0];
}

it('без отметки выгодного периода поле на создании не уходит вовсе', async () => {
  renderPage();
  await addPeriod('30');

  const payload = await save('Базовый');

  expect(payload.highlight_period_days).toBeUndefined();
});

it('отмеченный выгодный период уходит днями', async () => {
  renderPage();
  await addPeriod('30');
  fireEvent.click(screen.getByTitle(resolveRu('admin.tariffs.bestValueHint') as string));

  const payload = await save('Базовый');

  expect(payload.highlight_period_days).toBe(30);
});
