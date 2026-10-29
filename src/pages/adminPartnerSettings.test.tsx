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
  withdrawal_reminder_enabled: false,
  withdrawal_reminder_minutes: 60,
  withdrawal_reminder_cooldown_minutes: 30,
  withdrawal_reminder_check_interval_seconds: 300,
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
 * Напоминания о заявках на вывод. При выключенных напоминаниях поля сроков
 * отключены и в запрос не попадают: иначе значение вне границ сервера,
 * введённое до выключения, отклоняло весь запрос (422), хотя кнопка
 * «Сохранить» была доступна.
 */
describe('напоминания о заявках на вывод', () => {
  const MINUTES = /Первое напоминание через/;
  const COOLDOWN = /Повтор напоминаний/;
  const INTERVAL = /Интервал проверки/;
  const FIELD_KEYS = new Map<RegExp, keyof PartnerSettingsUpdate>([
    [MINUTES, 'withdrawal_reminder_minutes'],
    [COOLDOWN, 'withdrawal_reminder_cooldown_minutes'],
    [INTERVAL, 'withdrawal_reminder_check_interval_seconds'],
  ]);
  const TIMING_KEYS = [...FIELD_KEYS.values()];

  const toggle = () =>
    screen.getByLabelText(/Напоминать о заявках без решения/) as HTMLInputElement;
  const field = (label: RegExp) => screen.getByLabelText(label) as HTMLInputElement;
  const saveButton = () => screen.getByRole('button', { name: 'Сохранить' }) as HTMLButtonElement;

  async function renderWithReminders(enabled: boolean) {
    state.payload = { ...state.payload, withdrawal_reminder_enabled: enabled };
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

  it('включение отправляет флаг и сроки', async () => {
    await renderWithReminders(false);
    fireEvent.click(toggle());
    type(MINUTES, '90');
    type(COOLDOWN, '45');
    type(INTERVAL, '120');

    expect(await save()).toMatchObject({
      withdrawal_reminder_enabled: true,
      withdrawal_reminder_minutes: 90,
      withdrawal_reminder_cooldown_minutes: 45,
      withdrawal_reminder_check_interval_seconds: 120,
    });
  });

  it('выключение отправляет только флаг — сроки на сервере остаются прежними', async () => {
    await renderWithReminders(true);
    fireEvent.click(toggle());

    const update = await save();
    expect(update.withdrawal_reminder_enabled).toBe(false);
    for (const key of TIMING_KEYS) expect(update).not.toHaveProperty(key);
  });

  it.each([
    [MINUTES, '1'],
    [MINUTES, '10080'],
    [COOLDOWN, '1'],
    [COOLDOWN, '10080'],
    [INTERVAL, '30'],
    [INTERVAL, '3600'],
  ])('граница %s = %s сохраняется', async (label, value) => {
    await renderWithReminders(true);
    type(label, value);

    expect(saveButton().disabled).toBe(false);
    expect(await save()).toHaveProperty(String(FIELD_KEYS.get(label)), Number(value));
  });

  it.each([
    [MINUTES, '0'],
    [MINUTES, '10081'],
    [COOLDOWN, '0'],
    [COOLDOWN, '10081'],
    [INTERVAL, '29'],
    [INTERVAL, '3601'],
    [INTERVAL, ''],
  ])('при включённых напоминаниях %s = «%s» не отправляется', async (label, value) => {
    await renderWithReminders(true);
    type(label, value);

    expect(saveButton().disabled).toBe(true);
    fireEvent.click(saveButton());
    expect(state.updates).toHaveLength(0);
  });

  it.each([
    [INTERVAL, '1'],
    [MINUTES, '0'],
    [COOLDOWN, '10081'],
  ])('недопустимое %s = %s перед выключением на сервер не уходит', async (label, value) => {
    await renderWithReminders(true);
    type(label, value);
    expect(saveButton().disabled).toBe(true);

    fireEvent.click(toggle());
    expect(saveButton().disabled).toBe(false);

    const update = await save();
    expect(update.withdrawal_reminder_enabled).toBe(false);
    for (const key of TIMING_KEYS) expect(update).not.toHaveProperty(key);
  });

  it('поля из .env отключены и помечены', async () => {
    state.payload = {
      ...state.payload,
      env_locked: [
        'withdrawal_reminder_enabled',
        'withdrawal_reminder_minutes',
        'withdrawal_reminder_cooldown_minutes',
        'withdrawal_reminder_check_interval_seconds',
      ],
    };
    await renderWithReminders(true);

    expect(toggle().disabled).toBe(true);
    for (const label of FIELD_KEYS.keys()) expect(field(label).disabled).toBe(true);
    expect(screen.getAllByText('Задано в .env')).toHaveLength(4);
  });

  it('закреплённый в .env срок отключён, остальные редактируются', async () => {
    state.payload = {
      ...state.payload,
      env_locked: ['withdrawal_reminder_check_interval_seconds'],
    };
    await renderWithReminders(true);

    expect(field(INTERVAL).disabled).toBe(true);
    expect(field(MINUTES).disabled).toBe(false);
    expect(field(COOLDOWN).disabled).toBe(false);
    expect(toggle().disabled).toBe(false);
  });
});
