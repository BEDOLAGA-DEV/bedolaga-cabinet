// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { PlatformProvider } from '@/platform/PlatformProvider';
import { afterEach, expect, it, vi } from 'vitest';
import type { TariffDetail } from '@/api/tariffs';

/**
 * Правка тарифа: тот же объект, что и на создании, но здесь у поля выгодного
 * периода есть «прошлое значение», которое надо уметь снять. Сохранение без
 * изменений везёт сохранённые дни, снятая звёздочка — ноль («снять выделение»).
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

const stored: Partial<TariffDetail> = {
  id: 7,
  name: 'Базовый',
  description: '',
  is_active: true,
  is_highlighted: false,
  is_daily: false,
  traffic_limit_gb: 100,
  device_limit: 1,
  device_price_kopeks: 0,
  max_device_limit: 0,
  tier_level: 1,
  period_prices: [
    { days: 30, price_kopeks: 39900 },
    { days: 365, price_kopeks: 199900 },
  ],
  highlight_period_days: 365,
  allowed_squads: [],
  external_squad_uuid: null,
  promo_groups: [],
  daily_price_kopeks: 0,
  lava_product_id: null,
  traffic_topup_enabled: false,
  max_topup_traffic_gb: 0,
  traffic_topup_packages: {},
  traffic_reset_mode: null,
  show_in_gift: true,
};

const updated: Record<string, unknown>[] = [];
let rejectSave = false;

vi.mock('@/api/tariffs', () => ({
  tariffsApi: {
    getServers: () => Promise.resolve([]),
    getExternalSquads: () => Promise.resolve([]),
    getPromoGroups: () => Promise.resolve([]),
    getTariff: () => Promise.resolve(stored),
    createTariff: () => Promise.reject(new Error('на правке создания быть не должно')),
    updateTariff: (_id: number, payload: Record<string, unknown>) => {
      updated.push(payload);
      if (rejectSave)
        return Promise.reject({ response: { status: 409, data: { detail: 'tariff_changed' } } });
      return Promise.resolve(stored);
    },
  },
}));

import AdminTariffCreate from './AdminTariffCreate';

afterEach(() => {
  delete stored.bs_traffic_settings;
  rejectSave = false;
  updated.length = 0;
  cleanup();
});

it('preserves separate BS settings when saving an existing tariff', async () => {
  stored.bs_traffic_settings = {
    squad_uuids: ['11111111-1111-4111-8111-111111111111'],
    limit_gb: 10,
    topup_enabled: true,
    topup_packages: { '5': 12345 },
    max_topup_gb: 100,
  };
  renderEditPage();
  await openPeriodsTab();
  fireEvent.click(screen.getByText(resolveRu('admin.tariffs.tabExtra') as string));
  const toggle = await screen.findByLabelText(resolveRu('admin.tariffs.bs.configure') as string);
  fireEvent.click(toggle);
  fireEvent.click(toggle);
  const payload = await save();
  expect(payload.bs_traffic_settings).toEqual({ ...stored.bs_traffic_settings, enabled: true });
  expect(payload.traffic_topup_packages).toEqual({});
  expect(payload.traffic_limit_gb).toBe(100);
});

it('stops BS sales while preserving settings and ordinary traffic', async () => {
  stored.bs_traffic_settings = {
    squad_uuids: ['11111111-1111-4111-8111-111111111111'],
    limit_gb: 0,
    topup_enabled: false,
    topup_packages: {},
    max_topup_gb: 0,
  };
  renderEditPage();
  await openPeriodsTab();
  fireEvent.click(screen.getByText(resolveRu('admin.tariffs.tabExtra') as string));
  fireEvent.click(await screen.findByLabelText(resolveRu('admin.tariffs.bs.configure') as string));
  const payload = await save();
  expect(payload.bs_traffic_settings).toEqual({ ...stored.bs_traffic_settings, enabled: false });
  expect(payload.traffic_limit_gb).toBe(100);
});

it('keeps form input and shows a conflict instead of silently overwriting', async () => {
  rejectSave = true;
  renderEditPage();
  await openPeriodsTab();
  await save();
  const alert = await screen.findByRole('alert');
  expect(alert.textContent).toContain(resolveRu('admin.tariffs.editConflict'));
  expect(screen.getByDisplayValue('Базовый')).toBeTruthy();
  expect(updated).toHaveLength(1);
});

function renderEditPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <PlatformProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/admin/tariffs/7/edit']}>
          <Routes>
            <Route path="/admin/tariffs/:id/edit" element={<AdminTariffCreate />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </PlatformProvider>,
  );
}

async function openPeriodsTab() {
  fireEvent.click(await screen.findByText(resolveRu('admin.tariffs.tabPeriods') as string));
  await screen.findByText(`365 ${resolveRu('admin.tariffs.daysShort')}`);
}

async function save() {
  fireEvent.click(screen.getByText(resolveRu('admin.tariffs.tabBasic') as string));
  fireEvent.click(screen.getByText(resolveRu('admin.tariffs.saveButton') as string));
  await waitFor(() => expect(updated.length).toBe(1));
  return updated[0];
}

it('сохранение без изменений везёт сохранённый выгодный период', async () => {
  renderEditPage();
  await openPeriodsTab();

  const payload = await save();

  expect(payload.highlight_period_days).toBe(365);
});

it('снятая звёздочка уезжает нулём — «снять выделение»', async () => {
  renderEditPage();
  await openPeriodsTab();
  const pressed = screen
    .getAllByTitle(resolveRu('admin.tariffs.bestValueHint') as string)
    .find((button) => button.getAttribute('aria-pressed') === 'true');
  expect(pressed).toBeTruthy();
  fireEvent.click(pressed as HTMLElement);

  const payload = await save();

  expect(payload.highlight_period_days).toBe(0);
});

it('звёздочка на другом периоде уезжает его днями', async () => {
  renderEditPage();
  await openPeriodsTab();
  const other = screen
    .getAllByTitle(resolveRu('admin.tariffs.bestValueHint') as string)
    .find((button) => button.getAttribute('aria-pressed') !== 'true');
  fireEvent.click(other as HTMLElement);

  const payload = await save();

  expect(payload.highlight_period_days).toBe(30);
});

it('sends the opened tariff version with the form', async () => {
  stored.edit_version = 'a'.repeat(64);
  try {
    renderEditPage();
    await openPeriodsTab();
    const payload = await save();
    expect(payload.expected_version).toBe(stored.edit_version);
  } finally {
    delete stored.edit_version;
  }
});

it('reopens disabled BS settings off and restores saved terms on enable', async () => {
  stored.bs_traffic_settings = {
    enabled: false,
    squad_uuids: ['11111111-1111-4111-8111-111111111111'],
    limit_gb: 10,
    topup_enabled: true,
    topup_packages: { '5': 12345 },
    max_topup_gb: 100,
  };
  renderEditPage();
  await openPeriodsTab();
  fireEvent.click(screen.getByText(resolveRu('admin.tariffs.tabExtra') as string));
  const toggle = await screen.findByLabelText(resolveRu('admin.tariffs.bs.configure') as string);
  expect((toggle as HTMLInputElement).checked).toBe(false);
  fireEvent.click(toggle);
  const payload = await save();
  expect(payload.bs_traffic_settings).toEqual({ ...stored.bs_traffic_settings, enabled: true });
});
