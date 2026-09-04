// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ruLocale from '@/locales/ru.json';
import { DEFAULT_THEME_COLORS, type ThemeColors } from '@/types/theme';
import { THEME_PRESETS } from './constants';

/**
 * Ручная настройка цветов темы в админке.
 *
 * Редактор держит черновик отдельно от сохранённого снимка и показывает
 * «Сохранить», пока они расходятся. Для живого превью он же пишет черновик в
 * кэш запроса `theme-colors` (с задержкой 150 мс), а эффект синхронизации с
 * сервером слушает тот же кэш. Эхо собственной записи не должно превращать
 * черновик в «сохранённое»: иначе кнопка исчезает, PATCH не уходит, а после
 * перезагрузки цвета откатываются.
 */

function resolveRu(key: string): string | undefined {
  const value = key
    .split('.')
    .reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], ruLocale);
  return typeof value === 'string' ? value : undefined;
}

/** Строка из ru.json, обязанная существовать: забытый перевод валит тест, а не маскируется ключом. */
function ru(key: string): string {
  const value = resolveRu(key);
  if (value === undefined) throw new Error(`ru.json: нет строки ${key}`);
  return value;
}

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown> | string) => {
      const fallback = typeof options === 'string' ? options : (options?.defaultValue as string);
      return resolveRu(key) ?? fallback ?? key;
    },
    i18n: { language: 'ru', changeLanguage: () => Promise.resolve() },
  }),
  Trans: ({ children }: { children?: unknown }) => children ?? null,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const state: { serverColors: ThemeColors; patches: Partial<ThemeColors>[] } = {
  serverColors: DEFAULT_THEME_COLORS,
  patches: [],
};

vi.mock('@/api/themeColors', () => ({
  themeColorsApi: {
    getColors: () => Promise.resolve(state.serverColors),
    updateColors: (patch: Partial<ThemeColors>) => {
      state.patches.push(patch);
      state.serverColors = { ...state.serverColors, ...patch };
      return Promise.resolve(state.serverColors);
    },
    resetColors: () => {
      state.serverColors = DEFAULT_THEME_COLORS;
      return Promise.resolve(state.serverColors);
    },
    getEnabledThemes: () => Promise.resolve({ dark: true, light: true }),
    updateEnabledThemes: (themes: { dark?: boolean; light?: boolean }) =>
      Promise.resolve({ dark: true, light: true, ...themes }),
  },
}));

function presetColors(id: string): ThemeColors {
  const preset = THEME_PRESETS.find((candidate) => candidate.id === id);
  if (!preset) throw new Error(`THEME_PRESETS: нет пресета ${id}`);
  return preset.colors as ThemeColors;
}

const OCEAN = presetColors('ocean');
const DEBOUNCE_MS = 150;

const SAVE = ru('common.save');
const CUSTOM_COLORS = ru('admin.settings.customColors');

// jsdom без pretendToBeVisual не даёт requestAnimationFrame, а превью на нём.
if (typeof globalThis.requestAnimationFrame !== 'function') {
  globalThis.requestAnimationFrame = (cb: FrameRequestCallback) =>
    window.setTimeout(() => cb(performance.now()), 0);
  globalThis.cancelAnimationFrame = (id: number) => window.clearTimeout(id);
}

async function renderThemeTab() {
  const { ThemeTab } = await import('./ThemeTab');
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <ThemeTab />
    </QueryClientProvider>,
  );

  fireEvent.click(await screen.findByText(CUSTOM_COLORS));

  // Первый пикер в разметке — акцентный цвет; ждём, пока в него приедут
  // серверные значения, а не начальные дефолты черновика.
  const accentInput = await waitFor(() => {
    const inputs = screen.getAllByPlaceholderText('#000000') as HTMLInputElement[];
    expect(inputs[0].value.toLowerCase()).toBe(state.serverColors.accent.toLowerCase());
    return inputs[0];
  });

  return { accentInput, queryClient };
}

async function letDebounceFire() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_MS * 2));
  });
}

beforeEach(() => {
  state.patches = [];
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ThemeTab: ручная настройка цветов', () => {
  it.each([
    ['сохранённые цвета — дефолтные (свежая установка или после сброса)', DEFAULT_THEME_COLORS],
    ['сохранённые цвета уже кастомные', OCEAN],
  ])('изменённый цвет можно сохранить: %s', async (_label, saved) => {
    state.serverColors = saved;
    const { accentInput } = await renderThemeTab();

    fireEvent.change(accentInput, { target: { value: '#ff0000' } });
    expect(screen.getByText(SAVE)).toBeTruthy();

    // Через 150 мс черновик уходит в кэш `theme-colors` для превью — и
    // возвращается в эффект синхронизации. Кнопка обязана пережить это эхо.
    await letDebounceFire();
    expect(screen.queryByText(SAVE)).not.toBeNull();

    fireEvent.click(screen.getByText(SAVE));

    await waitFor(() => expect(state.patches).toHaveLength(1));
    expect(state.patches[0]).toMatchObject({ accent: '#ff0000' });
    await waitFor(() => expect(screen.queryByText(SAVE)).toBeNull());
  });

  it('без локальных правок новые серверные цвета подхватываются в редактор', async () => {
    state.serverColors = DEFAULT_THEME_COLORS;
    const { accentInput, queryClient } = await renderThemeTab();

    // Так выглядит refetch или сохранение из другой вкладки.
    act(() => {
      queryClient.setQueryData(['theme-colors'], OCEAN);
    });

    await waitFor(() => expect(accentInput.value.toLowerCase()).toBe(OCEAN.accent.toLowerCase()));
    expect(screen.queryByText(SAVE)).toBeNull();
  });
});
