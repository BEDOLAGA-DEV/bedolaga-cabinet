// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlatformProvider } from '@/platform/PlatformProvider';
import type { PartnerSettings } from '@/api/partners';
import type { SettingDefinition } from '@/api/adminSettings';
import { usePermissionStore } from '@/store/permissions';

/**
 * Настройка, закреплённая в .env, из кабинета не меняется: сервер пишет её в базу,
 * но в память не применяет, и после перезагрузки всё возвращается. Раньше форма
 * молча принимала такую правку. Теперь сервер отдаёт такие поля в env_locked, а
 * форма показывает пометку и отключает переключатель.
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

const state: { payload: PartnerSettings } = {
  payload: {
    withdrawal_enabled: true,
    withdrawal_min_amount_kopeks: 100000,
    withdrawal_cooldown_days: 30,
    withdrawal_requisites_text: '',
    partner_section_visible: true,
    referral_program_enabled: true,
    env_locked: [],
  },
};

const referralState = {
  settings: [
    {
      key: 'REFERRAL_COMMISSION_PERCENT',
      name: 'Referral Commission Percent',
      category: { key: 'REFERRAL', label: 'Реферальная система' },
      type: 'int',
      is_optional: false,
      current: 5,
      original: 5,
      has_override: false,
      read_only: false,
      env_locked: false,
      choices: [],
    },
  ] as SettingDefinition[],
  writes: [] as Array<{ key: string; value: unknown }>,
  reads: 0,
};

vi.mock('@/api/adminSettings', () => ({
  adminSettingsApi: {
    getSettings: () => {
      referralState.reads += 1;
      return Promise.resolve(referralState.settings);
    },
    updateSetting: (key: string, value: unknown) => {
      referralState.writes.push({ key, value });
      return Promise.resolve(referralState.settings[0]);
    },
    resetSetting: () => Promise.resolve(referralState.settings[0]),
  },
}));

vi.mock('@/api/partners', () => ({
  partnerApi: {
    getPartnerSettings: () => Promise.resolve(state.payload),
    updatePartnerSettings: () => Promise.resolve(state.payload),
  },
}));

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

(globalThis as Record<string, unknown>).__APP_VERSION__ ??= '0.0.0-test';

afterEach(() => {
  cleanup();
  state.payload = { ...state.payload, env_locked: [] };
  referralState.settings[0] = { ...referralState.settings[0], env_locked: false };
  referralState.writes.length = 0;
  referralState.reads = 0;
  usePermissionStore.getState().reset();
});

async function renderPage() {
  const Page = (await import('./AdminPartnerSettings')).default;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <PlatformProvider>
        <MemoryRouter initialEntries={['/admin/partners/settings']}>
          <Routes>
            <Route path="/admin/partners/settings" element={<Page />} />
            <Route path="/admin/settings" element={<div>Системные настройки открыты</div>} />
          </Routes>
        </MemoryRouter>
      </PlatformProvider>
    </QueryClientProvider>,
  );
  await screen.findByLabelText(/Раздел партнёрки виден в кабинете/);
}

describe('поля, закреплённые в .env', () => {
  it('переключатель отключён и помечен «Задано в .env»', async () => {
    state.payload = { ...state.payload, env_locked: ['partner_section_visible'] };
    await renderPage();

    const visible = screen.getByLabelText(/Раздел партнёрки виден в кабинете/) as HTMLInputElement;
    expect(visible.disabled).toBe(true);
    expect(screen.getAllByText('Задано в .env')).toHaveLength(1);

    const program = screen.getByLabelText(/Реферальная программа включена/) as HTMLInputElement;
    expect(program.disabled).toBe(false);
  });

  it('без env_locked ничего не отключено и пометок нет', async () => {
    await renderPage();
    expect(
      (screen.getByLabelText(/Раздел партнёрки виден в кабинете/) as HTMLInputElement).disabled,
    ).toBe(false);
    expect(screen.queryByText('Задано в .env')).toBeNull();
  });
});

describe('основные реферальные настройки и права доступа', () => {
  it('не запрашивает и не показывает системные настройки без settings:read', async () => {
    await renderPage();
    expect(screen.queryByText('REFERRAL_COMMISSION_PERCENT')).toBeNull();
    expect(referralState.reads).toBe(0);
    expect(screen.queryByRole('button', { name: 'Настройки системы' })).toBeNull();
  });

  it('показывает реферальные значения без возможности правки при settings:read', async () => {
    usePermissionStore.setState({ permissions: ['settings:read'] });
    await renderPage();
    await screen.findByText('REFERRAL_COMMISSION_PERCENT');
    expect(referralState.reads).toBe(1);
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '5' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Настройки системы' }));
    expect(screen.getByText('Системные настройки открыты')).toBeTruthy();
  });

  it('разрешает редактирование при settings:edit и не обходит env_locked', async () => {
    usePermissionStore.setState({ permissions: ['settings:read', 'settings:edit'] });
    await renderPage();
    await screen.findByText('REFERRAL_COMMISSION_PERCENT');
    fireEvent.click(screen.getByRole('button', { name: '5' }));
    const input = screen.getByDisplayValue('5') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '7' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() =>
      expect(referralState.writes).toEqual([{ key: 'REFERRAL_COMMISSION_PERCENT', value: '7' }]),
    );
  });

  it('оставляет поле, закреплённое в .env, только для просмотра', async () => {
    usePermissionStore.setState({ permissions: ['settings:read', 'settings:edit'] });
    referralState.settings[0] = { ...referralState.settings[0], env_locked: true };
    await renderPage();
    await screen.findByText('REFERRAL_COMMISSION_PERCENT');
    expect(screen.queryByRole('button', { name: '5' })).toBeNull();
    expect(screen.getByText('ENV')).toBeTruthy();
  });
});
