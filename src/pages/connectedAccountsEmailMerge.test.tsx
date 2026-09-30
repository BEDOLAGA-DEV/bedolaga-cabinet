// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlatformProvider } from '@/platform/PlatformProvider';

/**
 * Привязка почты, которая уже числится за другим аккаунтом: на ящик приходит код.
 *
 * Если тот аккаунт живой — код даёт токен объединения и ведёт на страницу слияния.
 * Если он удалён — объединять нечего: бэкенд сразу привязывает почту и отвечает
 * `email_linked: true`. Раньше кабинет знал только первый ответ и на втором молча
 * оставлял форму с кодом, хотя почта уже была привязана.
 */

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ru', changeLanguage: () => Promise.resolve() },
  }),
  Trans: ({ children }: { children?: unknown }) => children ?? null,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const api = vi.hoisted(() => ({
  getLinkedProviders: vi.fn(),
  registerEmail: vi.fn(),
  verifyEmailMerge: vi.fn(),
  getMe: vi.fn(),
}));

vi.mock('../api/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/auth')>();
  return { ...actual, authApi: { ...actual.authApi, ...api } };
});

vi.mock('../api/branding', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/branding')>();
  return {
    ...actual,
    brandingApi: {
      ...actual.brandingApi,
      getEmailAuthEnabled: vi.fn().mockResolvedValue({ enabled: true }),
      getTelegramWidgetConfig: vi.fn().mockResolvedValue({ enabled: false }),
    },
  };
});

const showToast = vi.hoisted(() => vi.fn());
vi.mock('../components/Toast', () => ({ useToast: () => ({ showToast }) }));

beforeEach(() => {
  for (const fn of Object.values(api)) fn.mockReset();
  showToast.mockReset();
  api.getLinkedProviders.mockResolvedValue({
    providers: [{ provider: 'email', linked: false, identifier: null }],
  });
  api.registerEmail.mockResolvedValue({
    message: 'A confirmation code was sent to that email address.',
    merge_required: true,
    merge_verification: 'email_code',
    merge_token: null,
  });
  api.getMe.mockResolvedValue({ id: 1, email: 'returning@example.com', email_verified: true });
});
afterEach(cleanup);

async function submitCode() {
  const ConnectedAccounts = (await import('./ConnectedAccounts')).default;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <PlatformProvider>
        <MemoryRouter initialEntries={['/profile/accounts']}>
          <Routes>
            <Route path="/profile/accounts" element={<ConnectedAccounts />} />
            <Route path="/merge/:token" element={<div>merge page</div>} />
          </Routes>
        </MemoryRouter>
      </PlatformProvider>
    </QueryClientProvider>,
  );

  fireEvent.click(await screen.findByRole('button', { name: 'profile.accounts.link' }));
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'returning@example.com' } });
  fireEvent.change(screen.getByLabelText('auth.password'), { target: { value: 'new-password' } });
  fireEvent.change(screen.getByLabelText('auth.confirmPassword'), {
    target: { value: 'new-password' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'profile.linkEmail' }));

  const codeInput = await screen.findByLabelText('profile.emailMergeCodeLabel');
  fireEvent.change(codeInput, { target: { value: '654321' } });
  fireEvent.click(screen.getByRole('button', { name: 'profile.emailMergeConfirm' }));
}

describe('ConnectedAccounts — код для почты, занятой другим аккаунтом', () => {
  it('удалённый владелец: почта привязана сразу, без страницы объединения', async () => {
    api.verifyEmailMerge.mockResolvedValue({
      message: 'Email linked successfully',
      merge_required: false,
      email_linked: true,
      email: 'returning@example.com',
    });

    await submitCode();

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith({
        type: 'success',
        message: 'emailVerification.successMessage',
      }),
    );
    expect(api.getMe).toHaveBeenCalled();
    expect(screen.queryByText('merge page')).toBeNull();
    await waitFor(() => expect(screen.queryByLabelText('profile.emailMergeCodeLabel')).toBeNull());
  });

  it('живой владелец: как раньше, ведёт на страницу объединения', async () => {
    api.verifyEmailMerge.mockResolvedValue({
      message: 'Account merge confirmed',
      merge_required: true,
      merge_token: 'tok-123',
    });

    await submitCode();

    expect(await screen.findByText('merge page')).toBeTruthy();
    expect(showToast).not.toHaveBeenCalled();
  });
});
