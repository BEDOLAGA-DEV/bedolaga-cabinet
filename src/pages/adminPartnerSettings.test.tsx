// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlatformProvider } from '@/platform/PlatformProvider';
import type { PartnerSettings } from '@/api/partners';

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
});

async function renderPage() {
  const Page = (await import('./AdminPartnerSettings')).default;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <PlatformProvider>
        <MemoryRouter initialEntries={['/admin/partners/settings']}>
          <Page />
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
