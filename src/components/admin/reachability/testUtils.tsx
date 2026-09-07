import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router';
import type { Unit } from '@/api/reachability';
import ruLocale from '@/locales/ru.json';
import { PlatformProvider } from '@/platform/PlatformProvider';

/** Общая обвязка тестов раздела: настоящая ru.json, провайдеры платформы, запросов и роутера. */

export function resolveRu(key: string): string | undefined {
  const value = key
    .split('.')
    .reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], ruLocale);
  return typeof value === 'string' ? value : undefined;
}

/** Фабрика для `vi.mock('react-i18next', ...)`: строки из ru.json, плейсхолдеры подставляются. */
/** Плюральная форма ru для i18next: _one / _few / _many. */
function ruPlural(count: number): 'one' | 'few' | 'many' {
  const abs = Math.abs(count);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return 'one';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'few';
  return 'many';
}

export function i18nMock() {
  return {
    useTranslation: () => ({
      t: (key: string, options?: Record<string, unknown> | string) => {
        const opts = typeof options === 'string' ? { defaultValue: options } : (options ?? {});
        const plural =
          typeof opts.count === 'number' ? resolveRu(`${key}_${ruPlural(opts.count)}`) : undefined;
        const template =
          plural ?? resolveRu(key) ?? (opts.defaultValue as string | undefined) ?? key;
        return template.replace(/{{(\w+)}}/g, (_m, name) => String(opts[name] ?? ''));
      },
      i18n: { language: 'ru', changeLanguage: () => Promise.resolve() },
    }),
    Trans: ({ children }: { children?: unknown }) => children ?? null,
    initReactI18next: { type: '3rdParty', init: () => {} },
  };
}

export function installMatchMedia(): void {
  if (typeof window.matchMedia === 'function') return;
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

export function renderWithProviders(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <PlatformProvider>
        <MemoryRouter initialEntries={['/admin/reachability']}>{ui}</MemoryRouter>
      </PlatformProvider>
    </QueryClientProvider>,
  );
}

export const unit = (
  op_key: string,
  dpi: 'on' | 'off',
  region_code: string,
  probeable = true,
): Unit => ({
  op_key,
  operator: op_key.split('|')[0],
  name: op_key.split('|')[0].toUpperCase(),
  region: region_code.toUpperCase(),
  region_code,
  dpi,
  channel_state: dpi === 'on' ? 'DPI_ON' : 'DPI_OFF',
  probeable,
  in_catalog: true,
});
