// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CONSENT_DOCUMENTS, consentRequiredError } from '../test/consentRequiredError';

/**
 * Страница /tg (Mini App открыт по ссылке из бота) для НОВОГО пользователя:
 * бэк отвечает 428 с объектом в detail. Раньше объект уходил в текст ошибки и
 * ронял дерево React (#31). Ожидание: чекбоксы согласия и повтор входа с ними.
 */

// `t` стабильна между рендерами, как у настоящего i18next: она в зависимостях эффекта.
const { loginWithTelegram, navigate, translation } = vi.hoisted(() => ({
  loginWithTelegram: vi.fn(),
  navigate: vi.fn(),
  translation: {
    t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key),
    i18n: { language: 'ru', changeLanguage: () => Promise.resolve() },
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => translation,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useNavigate: () => navigate,
}));

vi.mock('../store/auth', () => ({
  useAuthStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ loginWithTelegram, isAuthenticated: false, isLoading: false }),
}));

vi.mock('../hooks/useTelegramSDK', () => ({
  isInTelegramWebApp: () => true,
  getTelegramInitData: () => 'init-data',
}));

vi.mock('../api/branding', () => ({
  brandingApi: {
    getBranding: () => Promise.resolve({ name: 'VPN', logo_letter: 'V', has_custom_logo: false }),
    getLogoUrl: () => null,
  },
}));

async function renderRedirect() {
  const { default: TelegramRedirect } = await import('./TelegramRedirect');
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/tg?redirect=/subscription']}>
        <Routes>
          <Route path="/tg" element={<TelegramRedirect />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  loginWithTelegram.mockReset();
  navigate.mockReset();
});

afterEach(() => cleanup());

describe('TelegramRedirect: 428 «нужно согласие»', () => {
  it('показывает чекбоксы вместо падения и повторяет вход с галочками', async () => {
    loginWithTelegram
      .mockRejectedValueOnce(consentRequiredError())
      .mockResolvedValueOnce(undefined);

    await renderRedirect();

    const checkboxes = await screen.findAllByRole('checkbox', {}, { timeout: 3000 });
    expect(checkboxes).toHaveLength(CONSENT_DOCUMENTS.length);
    for (const checkbox of checkboxes) fireEvent.click(checkbox);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Продолжить' }));
    });

    await waitFor(() => expect(loginWithTelegram).toHaveBeenCalledTimes(2));
    expect(loginWithTelegram.mock.calls[1]).toEqual(['init-data', CONSENT_DOCUMENTS]);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/subscription'));
  });
});
