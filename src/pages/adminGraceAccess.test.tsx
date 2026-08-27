// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlatformProvider } from '@/platform/PlatformProvider';
import type {
  GraceAccessConfig,
  GraceAccessOverview,
  GraceSquadsResponse,
} from '@/api/adminGraceAccess';

/**
 * Grace access rewrites live panel state on a timer, and its two worst failure
 * modes are silent: a mode saved without a squad UUID makes the bot start with
 * grace disabled, and the mode itself only takes effect after a restart.
 *
 * These tests hold that contract — what reaches the wire, what is refused before
 * it gets there, and what the screen says about the gap between the running mode
 * and the saved one — rather than the layout.
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
    t: (key: string, options?: Record<string, unknown>) => {
      // Настоящая ru.json, а не выдуманные строки: иначе забытый перевод остаётся
      // незамеченным — компонент рисует ключ, а тест сверяется с той же выдумкой.
      const template = resolveRu(key) ?? (options?.defaultValue as string) ?? key;
      return template.replace(/{{(\w+)}}/g, (_m, name) => String(options?.[name] ?? ''));
    },
    i18n: { language: 'ru', changeLanguage: () => Promise.resolve() },
  }),
  Trans: ({ children }: { children?: unknown }) => children ?? null,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const EXPIRED_UUID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
const LIMITED_UUID = '17b2c1de-9f47-4a3d-8c11-5b6a0f9e2d34';

const config = (overrides: Partial<GraceAccessConfig> = {}): GraceAccessConfig => ({
  mode: 'false',
  duration_hours: 72,
  expired_squad_uuid: EXPIRED_UUID,
  limited_squad_uuid: LIMITED_UUID,
  external_squad_uuid: '',
  traffic_gb: 1,
  trial_enabled: false,
  daily_enabled: false,
  free_enabled: false,
  reconcile_interval_seconds: 60,
  reconcile_batch_size: 200,
  candidate_lookback_minutes: 30,
  ...overrides,
});

const overview = (overrides: Partial<GraceAccessOverview> = {}): GraceAccessOverview => ({
  config: config(),
  env_locked: [],
  restart_only: ['mode', 'reconcile_interval_seconds'],
  runtime: { running_mode: 'false', configured_mode: 'false', restart_required: false },
  stats: { states: {}, open: 0, open_errors: 0, completed_errors: 0 },
  issues: [],
  recent_errors: [],
  ...overrides,
});

const state: {
  overview: GraceAccessOverview;
  squads: GraceSquadsResponse;
  saves: unknown[];
} = {
  overview: overview(),
  squads: { available: true, items: [] },
  saves: [],
};

vi.mock('@/api/adminGraceAccess', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/adminGraceAccess')>();
  return {
    ...original,
    adminGraceAccessApi: {
      getOverview: () => Promise.resolve(state.overview),
      getSquads: () => Promise.resolve(state.squads),
      getSessions: () => Promise.resolve({ items: [], total: 0, page: 1, limit: 20 }),
      update: (patch: unknown) => {
        state.saves.push(patch);
        return Promise.resolve(state.overview);
      },
    },
  };
});

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
  state.overview = overview();
  state.squads = { available: true, items: [] };
  state.saves = [];
});

async function renderPage() {
  const Page = (await import('./AdminGraceAccess')).default;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <PlatformProvider>
        <MemoryRouter initialEntries={['/admin/grace-access']}>
          <Page />
        </MemoryRouter>
      </PlatformProvider>
    </QueryClientProvider>,
  );
  await screen.findByText('Режим');
}

const saveButton = () => screen.getByRole('button', { name: 'Сохранить' }) as HTMLButtonElement;
const modeCard = (label: string) => screen.getByRole('button', { name: new RegExp(label) });

describe('раздел grace-доступа', () => {
  it('до правок сохранять нечего', async () => {
    await renderPage();

    expect(saveButton().disabled).toBe(true);
  });

  it('отправляет только изменённое поле', async () => {
    // Форма на экране целиком; отправка всех полей затирала бы правки из бота.
    await renderPage();

    fireEvent.change(screen.getByLabelText('Длительность, часов'), { target: { value: '48' } });
    fireEvent.click(saveButton());

    await waitFor(() => expect(state.saves).toEqual([{ duration_hours: 48 }]));
  });

  it('не даёт включить режим без сквада и называет поле', async () => {
    state.overview = overview({ config: config({ expired_squad_uuid: '' }) });
    await renderPage();

    fireEvent.click(modeCard('Включён'));

    expect(saveButton().disabled).toBe(true);
    expect(screen.getAllByText(/Сквад для истёкшей подписки/).length).toBeGreaterThan(0);
    expect(state.saves).toEqual([]);
  });

  it('не даёт включить режим с трафиком меньше гигабайта', async () => {
    await renderPage();

    fireEvent.change(screen.getByLabelText('Трафик, ГБ'), { target: { value: '0' } });
    fireEvent.click(modeCard('Включён'));

    expect(saveButton().disabled).toBe(true);
  });

  it('выключить можно и при неполной конфигурации', async () => {
    // Иначе сломанная конфигурация запирала бы админа во включённом режиме.
    state.overview = overview({
      config: config({ mode: 'true', expired_squad_uuid: '' }),
      runtime: { running_mode: 'true', configured_mode: 'true', restart_required: false },
    });
    await renderPage();

    fireEvent.click(modeCard('Слив'));
    fireEvent.click(saveButton());

    await waitFor(() => expect(state.saves).toEqual([{ mode: 'drain' }]));
  });

  it('сообщает про перезапуск, когда работающий режим отличается от сохранённого', async () => {
    state.overview = overview({
      config: config({ mode: 'true' }),
      runtime: { running_mode: 'false', configured_mode: 'true', restart_required: true },
    });
    await renderPage();

    expect(screen.getByText('Нужен перезапуск бота')).toBeTruthy();
    expect(screen.getByText(/работает режим «Выключен», сохранён «Включён»/)).toBeTruthy();
  });

  it('без расхождения режимов баннера нет', async () => {
    await renderPage();

    expect(screen.queryByText('Нужен перезапуск бота')).toBeNull();
  });

  it('показывает проблемы конфигурации, даже когда grace выключен', async () => {
    // Иначе о пустом скваде узнают из одной строки в логе при следующем старте.
    state.overview = overview({
      config: config({ expired_squad_uuid: '' }),
      issues: [{ field: 'expired_squad_uuid', code: 'squad_required', severity: 'error' }],
    });
    await renderPage();

    expect(screen.getByText('Проблемы конфигурации')).toBeTruthy();
  });

  it('поле, закреплённое в .env, не редактируется', async () => {
    // Запись легла бы в БД, а после перезапуска победил бы файл.
    state.overview = overview({ env_locked: ['duration_hours'] });
    await renderPage();

    expect((screen.getByLabelText('Длительность, часов') as HTMLInputElement).disabled).toBe(true);
    expect(screen.getAllByText('Значение закреплено в .env — здесь его не изменить').length).toBe(
      1,
    );
  });

  it('недоступная панель оставляет ввод UUID руками', async () => {
    state.squads = { available: false, items: [] };
    await renderPage();

    const field = screen.getByLabelText('Сквад для истёкшей подписки') as HTMLInputElement;
    expect(field.tagName).toBe('INPUT');
    expect(field.value).toBe(EXPIRED_UUID);
  });

  it('сквады из панели выбираются списком', async () => {
    state.squads = {
      available: true,
      items: [{ uuid: EXPIRED_UUID, name: 'Grace', members_count: 4 }],
    };
    await renderPage();

    const field = screen.getByLabelText('Сквад для истёкшей подписки') as HTMLSelectElement;
    expect(field.tagName).toBe('SELECT');
    expect(field.value).toBe(EXPIRED_UUID);
  });

  it('сквад, которого нет в панели, остаётся видимым и правимым', async () => {
    // Сквады переименовывают и удаляют; молчаливый сброс поля терял бы рабочую настройку.
    state.squads = {
      available: true,
      items: [{ uuid: LIMITED_UUID, name: 'Другой', members_count: 0 }],
    };
    await renderPage();

    const field = screen.getByLabelText('Сквад для истёкшей подписки') as HTMLInputElement;
    expect(field.tagName).toBe('INPUT');
    expect(field.value).toBe(EXPIRED_UUID);
  });

  it('«оставить как есть» отправляется как keep', async () => {
    await renderPage();

    fireEvent.change(screen.getByLabelText('Внешний сквад'), { target: { value: 'keep' } });
    fireEvent.click(saveButton());

    await waitFor(() => expect(state.saves).toEqual([{ external_squad_uuid: 'keep' }]));
  });

  it('отмена возвращает форму к сохранённому', async () => {
    await renderPage();

    fireEvent.change(screen.getByLabelText('Длительность, часов'), { target: { value: '48' } });
    fireEvent.click(screen.getByRole('button', { name: 'Отменить' }));

    expect((screen.getByLabelText('Длительность, часов') as HTMLInputElement).value).toBe('72');
    expect(saveButton().disabled).toBe(true);
  });

  it('ошибка сервера показывается, а не проглатывается', async () => {
    await renderPage();
    const api = await import('@/api/adminGraceAccess');
    vi.spyOn(api.adminGraceAccessApi, 'update').mockRejectedValueOnce({
      response: { data: { detail: 'Grace access cannot be enabled' } },
    });

    fireEvent.change(screen.getByLabelText('Длительность, часов'), { target: { value: '48' } });
    fireEvent.click(saveButton());

    expect(await screen.findByText('Grace access cannot be enabled')).toBeTruthy();
  });
});
