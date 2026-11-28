// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import PublicLegal, { type PublicLegalDoc } from './PublicLegal';

const state = vi.hoisted(() => ({ language: 'ru', get: vi.fn() }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: state.language } }),
}));
vi.mock('../components/LanguageSwitcher', () => ({ default: () => null }));
vi.mock('../api/client', () => ({ default: { get: (...args: unknown[]) => state.get(...args) } }));
vi.mock('../api/infoPages', () => ({
  infoPagesApi: { getTabReplacements: async () => ({}), getPages: async () => [] },
}));
let client: QueryClient;
beforeEach(() => {
  state.language = 'ru';
  state.get.mockReset();
  state.get.mockImplementation(
    async (path: string, config?: { params?: { language?: string } }) => {
      if (path.endsWith('/visibility'))
        return { data: { faq: true, rules: true, offer: true, privacy: true } };
      const language = config?.params?.language;
      if (path.endsWith('/faq'))
        return {
          data: [{ id: 1, title: `FAQ-${language}`, content: `Answer-${language}`, order: 0 }],
        };
      return { data: { content: `<p>Document-${language}</p>`, updated_at: null } };
    },
  );
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(() => {
  cleanup();
  client.clear();
});

it.each(['offer', 'privacy', 'recurrent'] as PublicLegalDoc[])(
  'reloads %s in the selected language with a warm document cache',
  async (doc) => {
    const element = () => (
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <PublicLegal doc={doc} />
        </MemoryRouter>
      </QueryClientProvider>
    );
    const view = render(element());
    expect(await screen.findByText('Document-ru')).toBeTruthy();
    state.language = 'en-US';
    view.rerender(element());
    expect(await screen.findByText('Document-en')).toBeTruthy();
    expect(screen.queryByText('Document-ru')).toBeNull();
    state.language = 'ru';
    view.rerender(element());
    expect(await screen.findByText('Document-ru')).toBeTruthy();
  },
);
