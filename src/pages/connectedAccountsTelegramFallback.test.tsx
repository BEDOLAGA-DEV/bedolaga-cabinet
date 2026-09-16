// @vitest-environment jsdom
import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

/**
 * Привязка Telegram в «Способах входа», когда telegram.org не грузится (в РФ без
 * VPN — обычное дело): вместо виджета должна остаться подсказка и ссылка на бота.
 * Раньше карточка оставалась пустой — подсказка появлялась и тут же пропадала.
 */
const translation = vi.hoisted(() => ({
  t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key),
  i18n: { language: 'ru', changeLanguage: () => Promise.resolve() },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => translation,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

vi.mock('../api/branding', () => ({
  brandingApi: {
    getTelegramWidgetConfig: () =>
      Promise.resolve({ bot_username: 'zeroping_bot', oidc_enabled: false }),
  },
}));

vi.mock('../components/Toast', () => ({ useToast: () => ({ showToast: vi.fn() }) }));

import { TelegramLinkWidget } from './ConnectedAccounts';

describe('привязка Telegram без telegram.org', () => {
  it('скрипт виджета не загрузился — видна подсказка и ссылка на бота', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(
      <StrictMode>
        <QueryClientProvider client={client}>
          <MemoryRouter>
            <TelegramLinkWidget />
          </MemoryRouter>
        </QueryClientProvider>
      </StrictMode>,
    );

    const script = await waitFor(() => {
      const el = container.querySelector('script[data-telegram-login]') as HTMLScriptElement;
      expect(el).toBeTruthy();
      return el;
    });
    act(() => {
      script.onerror?.(new Event('error'));
    });

    expect(await screen.findByText('profile.accounts.telegramLinkUnavailable')).toBeTruthy();
    // Не «появилась и пропала»: после всех эффектов подсказка на месте.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(screen.queryByText('profile.accounts.telegramLinkUnavailable')).toBeTruthy();
    expect(screen.queryByText('@zeroping_bot')).toBeTruthy();
  });
});
