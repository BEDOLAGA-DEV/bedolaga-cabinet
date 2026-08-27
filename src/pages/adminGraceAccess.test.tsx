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

import enLocale from '@/locales/en.json';
import faLocale from '@/locales/fa.json';
import ruLocale from '@/locales/ru.json';
import zhLocale from '@/locales/zh.json';

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

  it('о полностью закреплённом в .env разделе сообщает одной строкой', async () => {
    // Пример .env отдавал все ключи grace раскомментированными: у скопировавших
    // его раздел нередактируем целиком, и двенадцать замков этого не объясняют.
    state.overview = overview({
      env_locked: Object.keys(config()),
    });
    await renderPage();

    expect(screen.getByText('Раздел открыт только на чтение')).toBeTruthy();
  });

  it('частичная блокировка общего баннера не показывает', async () => {
    state.overview = overview({ env_locked: ['duration_hours'] });
    await renderPage();

    expect(screen.queryByText('Раздел открыт только на чтение')).toBeNull();
  });

  it('«Отцепить» можно сохранить', async () => {
    // Пропуск любой пустой строки делал безопасное значение единственным,
    // которое нельзя было записать: внешний сквад навсегда оставался keep.
    state.overview = overview({ config: config({ external_squad_uuid: 'keep' }) });
    await renderPage();

    fireEvent.change(screen.getByLabelText('Внешний сквад'), { target: { value: 'detach' } });
    fireEvent.click(saveButton());

    await waitFor(() => expect(state.saves).toEqual([{ external_squad_uuid: '' }]));
  });

  it('сквад можно очистить', async () => {
    await renderPage();

    fireEvent.change(screen.getByLabelText('Сквад для истёкшей подписки'), {
      target: { value: '' },
    });
    fireEvent.click(saveButton());

    await waitFor(() => expect(state.saves).toEqual([{ expired_squad_uuid: '' }]));
  });

  it('аварийный сквад из пробелов не сохраняется как «Отцепить»', async () => {
    await renderPage();

    fireEvent.change(screen.getByLabelText('Внешний сквад'), { target: { value: 'custom' } });
    fireEvent.change(screen.getByLabelText('Аварийный сквад'), { target: { value: '   ' } });

    expect(saveButton().disabled).toBe(true);
    expect(state.saves).toEqual([]);
  });

  it('о неполной конфигурации при выключенном grace говорит спокойно', async () => {
    // Красная рамка на свежей установке приучает не читать этот блок вовсе.
    state.overview = overview({
      issues: [{ field: 'expired_squad_uuid', code: 'squad_required', severity: 'warning' }],
    });
    await renderPage();

    expect(screen.getByText('Понадобится перед включением')).toBeTruthy();
    expect(screen.queryByText('Проблемы конфигурации')).toBeNull();
  });

  it('ту же нехватку при работающем grace показывает как аварию', async () => {
    state.overview = overview({
      issues: [{ field: 'expired_squad_uuid', code: 'squad_required', severity: 'error' }],
    });
    await renderPage();

    expect(screen.getByText('Проблемы конфигурации')).toBeTruthy();
  });

  it('о недоступной панели говорит прямо', async () => {
    state.squads = { available: false, items: [] };
    await renderPage();

    expect(screen.getAllByText(/Панель недоступна/).length).toBeGreaterThan(0);
  });

  it('живая панель без сквадов недоступной не объявляется', async () => {
    // get_all_squads глотал ошибки и отдавал [], так что «панель лежит» и
    // «сквадов нет» выглядели одинаково; подпись обязана различать их.
    state.squads = { available: true, items: [] };
    await renderPage();

    expect(screen.queryByText(/Панель недоступна/)).toBeNull();
  });

  it('без права на список сессий объясняет, какого права не хватает', async () => {
    const api = await import('@/api/adminGraceAccess');
    vi.spyOn(api.adminGraceAccessApi, 'getSessions').mockRejectedValue(
      Object.assign(new Error('Forbidden'), {
        isAxiosError: true,
        response: { status: 403, data: { detail: 'Permission denied' } },
      }),
    );

    await renderPage();

    expect(await screen.findByText(/Нужно право users:read/)).toBeTruthy();
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

  it('выбор «Аварийный сквад» не сбрасывается обратно на «Отцепить»', async () => {
    // Вариант начинается с пустого поля, и вывод варианта из самого значения
    // возвращал бы список к «Отцепить» сразу после выбора.
    await renderPage();

    const select = screen.getByLabelText('Внешний сквад') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'custom' } });

    expect(select.value).toBe('custom');
    expect(screen.getByLabelText('Аварийный сквад')).toBeTruthy();
  });

  it('пустой аварийный сквад не сохраняется как «Отцепить»', async () => {
    await renderPage();

    fireEvent.change(screen.getByLabelText('Внешний сквад'), { target: { value: 'custom' } });

    expect(saveButton().disabled).toBe(true);
    expect(state.saves).toEqual([]);
  });

  it('числовое поле можно очистить и набрать заново', async () => {
    // Строго числовое состояние возвращает в пустую клетку прежнее число, и
    // первый набранный символ дописывается к нему.
    await renderPage();

    const field = screen.getByLabelText('Длительность, часов') as HTMLInputElement;
    fireEvent.change(field, { target: { value: '' } });

    expect(field.value).toBe('');
    expect(saveButton().disabled).toBe(true);

    fireEvent.change(field, { target: { value: '5' } });
    expect(field.value).toBe('5');
  });

  it('сквад, которого нет в панели, переживает позднюю загрузку списка', async () => {
    // Список приходит после первого рендера; состояние, посчитанное по пустому
    // списку, показало бы настроенный UUID как «не выбрано» — за один шаг до потери.
    let release: (value: GraceSquadsResponse) => void = () => {};
    const pending = new Promise<GraceSquadsResponse>((resolve) => {
      release = resolve;
    });
    const api = await import('@/api/adminGraceAccess');
    vi.spyOn(api.adminGraceAccessApi, 'getSquads').mockReturnValueOnce(pending);

    await renderPage();
    release({ available: true, items: [{ uuid: LIMITED_UUID, name: 'Другой', members_count: 0 }] });

    // Ждём именно применения списка: у второго сквада UUID из него, и он обязан
    // превратиться в выпадающий список. Без этого проверка успевает пройти до
    // загрузки и зеленеет независимо от поведения.
    await waitFor(() =>
      expect(screen.getByLabelText('Сквад для исчерпанного трафика').tagName).toBe('SELECT'),
    );

    const field = screen.getByLabelText('Сквад для истёкшей подписки') as HTMLInputElement;
    expect(field.tagName).toBe('INPUT');
    expect(field.value).toBe(EXPIRED_UUID);
  });

  it("сохранённое 'Keep' не считается кривым UUID", async () => {
    // Рантайм сравнивает значение в нижнем регистре; строгое сравнение помечало бы
    // рабочую настройку как ошибку и запрещало включение режима.
    state.overview = overview({ config: config({ mode: 'true', external_squad_uuid: 'Keep' }) });
    await renderPage();

    expect((screen.getByLabelText('Внешний сквад') as HTMLSelectElement).value).toBe('keep');
    expect(screen.queryByText(/Некорректный UUID/)).toBeNull();
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

  it('ошибку валидации 422 показывает текстом, а не роняет экран', async () => {
    // У FastAPI detail при 422 — список объектов; в JSX он попадал бы как массив.
    await renderPage();
    const api = await import('@/api/adminGraceAccess');
    const rejection = Object.assign(new Error('Request failed'), {
      isAxiosError: true,
      response: {
        status: 422,
        data: {
          detail: [{ loc: ['body', 'duration_hours'], msg: 'Input should be less than 8760' }],
        },
      },
    });
    vi.spyOn(api.adminGraceAccessApi, 'update').mockRejectedValueOnce(rejection);

    fireEvent.change(screen.getByLabelText('Длительность, часов'), { target: { value: '99999' } });
    fireEvent.click(saveButton());

    expect(await screen.findByText('duration_hours: Input should be less than 8760')).toBeTruthy();
  });

  it('ошибка сервера показывается, а не проглатывается', async () => {
    await renderPage();
    const api = await import('@/api/adminGraceAccess');
    vi.spyOn(api.adminGraceAccessApi, 'update').mockRejectedValueOnce(
      Object.assign(new Error('Request failed'), {
        isAxiosError: true,
        response: { status: 400, data: { detail: 'Grace access cannot be enabled' } },
      }),
    );

    fireEvent.change(screen.getByLabelText('Длительность, часов'), { target: { value: '48' } });
    fireEvent.click(saveButton());

    expect(await screen.findByText('Grace access cannot be enabled')).toBeTruthy();
  });
});

type LocaleTree = { admin: { graceAccess: unknown; nav: { graceAccess: unknown } } };

describe('переводы раздела', () => {
  /**
   * locales.test.ts сверяет только en и ru, поэтому ключ, добавленный в русскую
   * локаль и забытый в zh/fa, доезжает до прода: экран рисует сам ключ.
   */
  const flatten = (node: unknown, prefix = ''): string[] =>
    typeof node === 'object' && node !== null
      ? Object.entries(node).flatMap(([key, value]) =>
          flatten(value, prefix ? `${prefix}.${key}` : key),
        )
      : [prefix];

  const russian = flatten((ruLocale as LocaleTree).admin.graceAccess).sort();

  it.each([
    ['en', enLocale],
    ['zh', zhLocale],
    ['fa', faLocale],
  ])('%s содержит те же ключи, что и ru', (_language, locale) => {
    expect(flatten((locale as LocaleTree).admin.graceAccess).sort()).toEqual(russian);
  });

  it('пункт меню переведён везде', () => {
    for (const locale of [ruLocale, enLocale, zhLocale, faLocale]) {
      expect(typeof (locale as LocaleTree).admin.nav.graceAccess).toBe('string');
    }
  });
});

describe('changedFields', () => {
  /**
   * Разделение «пустое число» и «пустая строка» стоило того, чтобы закрепить его
   * отдельно от разметки: пропуск любой пустой строки делал «Отцепить»
   * единственным значением, которое нельзя было записать.
   */
  it('пропускает недобранное число, но не пустой сквад', async () => {
    const { changedFields } = await import('./AdminGraceAccess');
    const stored = config({ external_squad_uuid: 'keep', duration_hours: 72 });

    const patch = changedFields({ ...stored, external_squad_uuid: '', duration_hours: '' }, stored);

    expect(patch).toEqual({ external_squad_uuid: '' });
  });

  it('одинаковые значения не отправляет', async () => {
    const { changedFields } = await import('./AdminGraceAccess');
    const stored = config();

    expect(changedFields({ ...stored }, stored)).toEqual({});
  });
});
