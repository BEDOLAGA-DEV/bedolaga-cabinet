// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CONSENT_DOCUMENTS, consentRequiredError } from '../test/consentRequiredError';

/**
 * Кнопка «Войти через Telegram» (OIDC-попап) на веб-экране входа для НОВОГО
 * пользователя: бэк отвечает 428 с объектом в detail. Раньше объект попадал в
 * текст ошибки под кнопкой и ронял дерево React (#31) — именно так выглядит
 * «Something went wrong» после удаления аккаунта и повторного входа из веба.
 * Ожидание: чекбоксы согласия и повтор входа с тем же id_token и галочками.
 */

// `t` стабильна между рендерами, как у настоящего i18next: она в зависимостях эффектов.
const { loginWithTelegramOIDC, navigate, translation } = vi.hoisted(() => ({
  loginWithTelegramOIDC: vi.fn(),
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
    selector({
      loginWithTelegramOIDC,
      loginWithTelegramWidget: vi.fn(),
      loginWithDeepLink: vi.fn(),
    }),
}));

vi.mock('../api/branding', () => ({
  brandingApi: {
    getTelegramWidgetConfig: () =>
      Promise.resolve({
        bot_username: 'bot',
        oidc_enabled: true,
        oidc_client_id: '42',
        request_access: false,
        size: 'large',
        radius: 20,
        userpic: true,
      }),
  },
}));

vi.mock('../api/auth', () => ({ authApi: {} }));

type OIDCCallback = (data: { id_token?: string; error?: string }) => void;
const SCRIPT_ID = 'telegram-login-oidc-script';

function installTelegramLoginStub(): {
  init: ReturnType<typeof vi.fn>;
  callback: () => OIDCCallback;
} {
  let captured: OIDCCallback | undefined;
  const init = vi.fn((_config: unknown, callback: OIDCCallback) => {
    captured = callback;
  });
  (window as unknown as { Telegram: unknown }).Telegram = { Login: { init, open: vi.fn() } };
  // Скрипт «уже загружен»: компонент тогда сразу зовёт Telegram.Login.init,
  // а не ждёт onload внешнего скрипта, который jsdom никогда не выполнит.
  const script = document.createElement('script');
  script.id = SCRIPT_ID;
  document.head.appendChild(script);
  return {
    init,
    callback: () => {
      if (!captured) throw new Error('Telegram.Login.init was not called');
      return captured;
    },
  };
}

async function renderButton() {
  const { default: TelegramLoginButton } = await import('./TelegramLoginButton');
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TelegramLoginButton />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  loginWithTelegramOIDC.mockReset();
  navigate.mockReset();
});

afterEach(() => {
  cleanup();
  document.getElementById(SCRIPT_ID)?.remove();
  (window as unknown as { Telegram?: unknown }).Telegram = undefined;
});

describe('TelegramLoginButton (OIDC): 428 «нужно согласие»', () => {
  it('показывает чекбоксы вместо падения и повторяет вход с тем же id_token', async () => {
    loginWithTelegramOIDC
      .mockRejectedValueOnce(consentRequiredError())
      .mockResolvedValueOnce(undefined);
    const stub = installTelegramLoginStub();

    await renderButton();
    await waitFor(() => expect(stub.init).toHaveBeenCalled());

    await act(async () => {
      stub.callback()({ id_token: 'tok' });
    });

    const checkboxes = await screen.findAllByRole('checkbox');
    expect(checkboxes).toHaveLength(CONSENT_DOCUMENTS.length);
    for (const checkbox of checkboxes) fireEvent.click(checkbox);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Продолжить' }));
    });

    await waitFor(() => expect(loginWithTelegramOIDC).toHaveBeenCalledTimes(2));
    expect(loginWithTelegramOIDC.mock.calls[1]).toEqual(['tok', CONSENT_DOCUMENTS]);
    expect(navigate).toHaveBeenCalledWith('/');
  });
});
