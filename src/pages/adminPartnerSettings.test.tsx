// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlatformProvider } from '@/platform/PlatformProvider';
import type { PartnerSettings, PartnerSettingsUpdate } from '@/api/partners';

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

const basePayload: PartnerSettings = {
  withdrawal_enabled: true,
  withdrawal_min_amount_kopeks: 100000,
  withdrawal_cooldown_days: 30,
  withdrawal_requisites_text: '',
  partner_section_visible: true,
  referral_program_enabled: true,
  env_locked: [],
};

const state: { payload: PartnerSettings; updates: PartnerSettingsUpdate[] } = {
  payload: { ...basePayload },
  updates: [],
};

vi.mock('@/api/partners', () => ({
  partnerApi: {
    getPartnerSettings: () => Promise.resolve(state.payload),
    updatePartnerSettings: (update: PartnerSettingsUpdate) => {
      state.updates.push(update);
      return Promise.resolve(state.payload);
    },
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
  state.payload = { ...basePayload };
  state.updates = [];
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

/**
 * Вывод средств. При выключенном выводе его поля отключены и в запрос не
 * попадают: иначе значение вне границ сервера, введённое до выключения,
 * отклоняло весь запрос (422), хотя кнопка «Сохранить» была доступна.
 */
describe('вывод средств', () => {
  const MIN_AMOUNT = /Мин\. сумма вывода/;
  const COOLDOWN = /Кулдаун между выводами/;
  const REQUISITES = /Текст для поля реквизитов/;
  const FIELD_KEYS = new Map<RegExp, keyof PartnerSettingsUpdate>([
    [MIN_AMOUNT, 'withdrawal_min_amount_kopeks'],
    [COOLDOWN, 'withdrawal_cooldown_days'],
    [REQUISITES, 'withdrawal_requisites_text'],
  ]);
  const WITHDRAWAL_KEYS = [...FIELD_KEYS.values()];

  const toggle = () => screen.getByLabelText(/Вывод средств включён/) as HTMLInputElement;
  const field = (label: RegExp) => screen.getByLabelText(label) as HTMLInputElement;
  const saveButton = () => screen.getByRole('button', { name: 'Сохранить' }) as HTMLButtonElement;

  async function renderWithWithdrawal(enabled: boolean) {
    state.payload = { ...state.payload, withdrawal_enabled: enabled };
    await renderPage();
    await waitFor(() => expect(toggle().checked).toBe(enabled));
  }

  function type(label: RegExp, value: string) {
    fireEvent.change(field(label), { target: { value } });
  }

  async function save(): Promise<PartnerSettingsUpdate> {
    fireEvent.click(saveButton());
    await waitFor(() => expect(state.updates).toHaveLength(1));
    return state.updates[0];
  }

  it('включение отправляет флаг и поля вывода', async () => {
    await renderWithWithdrawal(false);
    fireEvent.click(toggle());
    type(MIN_AMOUNT, '50000');
    type(COOLDOWN, '7');
    type(REQUISITES, 'Карта или СБП');

    expect(await save()).toMatchObject({
      withdrawal_enabled: true,
      withdrawal_min_amount_kopeks: 50000,
      withdrawal_cooldown_days: 7,
      withdrawal_requisites_text: 'Карта или СБП',
    });
  });

  it('выключение отправляет только флаг — поля вывода на сервере остаются прежними', async () => {
    await renderWithWithdrawal(true);
    fireEvent.click(toggle());

    const update = await save();
    expect(update.withdrawal_enabled).toBe(false);
    for (const key of WITHDRAWAL_KEYS) expect(update).not.toHaveProperty(key);
  });

  it('при выключенном выводе остальные настройки сохраняются', async () => {
    await renderWithWithdrawal(false);
    fireEvent.click(screen.getByLabelText(/Раздел партнёрки виден в кабинете/));

    const update = await save();
    expect(update).toMatchObject({ withdrawal_enabled: false, partner_section_visible: false });
    for (const key of WITHDRAWAL_KEYS) expect(update).not.toHaveProperty(key);
  });

  it.each([
    [MIN_AMOUNT, '0'],
    [MIN_AMOUNT, '100000000'],
    [COOLDOWN, '0'],
    [COOLDOWN, '365'],
  ])('граница %s = %s сохраняется', async (label, value) => {
    await renderWithWithdrawal(true);
    type(label, value);

    expect(saveButton().disabled).toBe(false);
    expect(await save()).toHaveProperty(String(FIELD_KEYS.get(label)), Number(value));
  });

  it.each([
    [MIN_AMOUNT, '-1'],
    [MIN_AMOUNT, '100000001'],
    [MIN_AMOUNT, ''],
    [COOLDOWN, '-1'],
    [COOLDOWN, '366'],
    [COOLDOWN, ''],
  ])('при включённом выводе %s = «%s» не отправляется', async (label, value) => {
    await renderWithWithdrawal(true);
    type(label, value);

    expect(saveButton().disabled).toBe(true);
    fireEvent.click(saveButton());
    expect(state.updates).toHaveLength(0);
  });

  it.each([
    [COOLDOWN, '366'],
    [COOLDOWN, '-1'],
    [MIN_AMOUNT, '100000001'],
    [MIN_AMOUNT, '-1'],
  ])('недопустимое %s = %s перед выключением на сервер не уходит', async (label, value) => {
    await renderWithWithdrawal(true);
    type(label, value);
    expect(saveButton().disabled).toBe(true);

    fireEvent.click(toggle());
    expect(saveButton().disabled).toBe(false);

    const update = await save();
    expect(update.withdrawal_enabled).toBe(false);
    for (const key of WITHDRAWAL_KEYS) expect(update).not.toHaveProperty(key);
  });
});
