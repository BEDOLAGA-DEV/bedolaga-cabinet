// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { AxiosError, AxiosHeaders } from 'axios';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Login from './Login';
import type { BrandingInfo } from '../api/branding';

const logo = vi.hoisted(() => ({
  cached: null as BrandingInfo | null,
  blob: null as string | null,
  preload: vi.fn<() => Promise<void>>(),
  fetch: vi.fn<() => Promise<BrandingInfo>>(),
}));

const telegram = vi.hoisted(() => ({ active: false, initData: '', t: (key: string) => key }));

const auth = vi.hoisted(() => ({
  emailEnabled: true,
  isAuthenticated: false,
  isLoading: false,
  loginWithTelegram: vi.fn(),
  loginWithEmail: vi.fn(),
  registerWithEmail: vi.fn(),
}));
vi.mock('../store/auth', () => ({
  useAuthStore: (selector: (state: typeof auth) => unknown) => selector(auth),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: telegram.t, i18n: { language: 'ru' } }),
}));
vi.mock('../hooks/useTelegramSDK', () => ({
  isInTelegramWebApp: () => telegram.active,
  getTelegramInitData: () => telegram.initData,
  useTelegramSDK: () => ({
    safeAreaInset: { top: 0, bottom: 0 },
    contentSafeAreaInset: { top: 0, bottom: 0 },
  }),
}));
vi.mock('../components/LanguageSwitcher', () => ({ default: () => null }));
vi.mock('../components/TelegramLoginButton', () => ({ default: () => null }));
vi.mock('../components/LegalFooter', () => ({ default: () => null }));
vi.mock('../api/branding', () => ({
  getCachedBranding: () => logo.cached,
  setCachedBranding: vi.fn(),
  preloadLogo: () => logo.preload(),
  isLogoPreloaded: () => false,
  brandingApi: {
    getLogoUrl: () => logo.blob,
    getBranding: () => logo.fetch(),
    getEmailAuthEnabled: async () => ({ enabled: auth.emailEnabled }),
    getFooterEnabled: async () => false,
  },
}));
vi.mock('../api/auth', () => ({ authApi: { getOAuthProviders: async () => ({ providers: [] }) } }));
vi.mock('../api/info', () => ({
  infoApi: { getLegalConsentConfig: async () => ({ documents: [] }) },
}));

let client: QueryClient;
beforeEach(() => {
  vi.clearAllMocks();
  auth.emailEnabled = true;
  telegram.active = false;
  telegram.initData = '';
  auth.loginWithTelegram.mockReset();
  logo.cached = null;
  logo.blob = null;
  logo.preload.mockResolvedValue(undefined);
  logo.fetch.mockImplementation(
    async () =>
      logo.cached ?? { name: 'Test', has_custom_logo: false, logo_letter: 'T', logo_url: null },
  );
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

it('displays a delayed logo with unchanged cached branding without user interaction', async () => {
  logo.cached = {
    name: 'Example Cabinet',
    logo_letter: 'E',
    logo_url: '/cabinet/branding/logo',
    has_custom_logo: true,
  };
  let finish!: () => void;
  const loading = new Promise<void>((resolve) => {
    finish = resolve;
  });
  logo.preload.mockReturnValue(loading);
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  await waitFor(() => expect(client.isFetching()).toBe(1));
  expect(screen.queryByRole('img', { name: 'Example Cabinet' })).toBeNull();
  await act(async () => {
    logo.blob = 'blob:example-logo';
    finish();
    await loading;
  });
  const image = await screen.findByRole('img', { name: 'Example Cabinet' });
  expect(image.getAttribute('src')).toBe('blob:example-logo');
  fireEvent.load(image);
  expect(image.className).toContain('opacity-100');
});
afterEach(() => {
  cleanup();
  client.clear();
});

function error(status: number, detail: unknown) {
  const headers = new AxiosHeaders();
  const config = { headers };
  return new AxiosError(
    'Request failed',
    'ERR_BAD_REQUEST',
    config,
    {},
    {
      status,
      statusText: '',
      headers,
      config,
      data: { detail },
    },
  );
}

it('shows the successful logo retry after the cached preload failed', async () => {
  logo.cached = {
    name: 'Retry Cabinet',
    logo_letter: 'R',
    logo_url: '/cabinet/branding/logo',
    has_custom_logo: true,
  };
  let finishBranding!: (branding: BrandingInfo) => void;
  logo.fetch.mockReturnValue(
    new Promise<BrandingInfo>((resolve) => {
      finishBranding = resolve;
    }),
  );
  logo.preload
    .mockImplementationOnce(async () => {})
    .mockImplementationOnce(async () => {
      logo.blob = 'blob:retried-logo';
    });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  await waitFor(() => expect(logo.preload).toHaveBeenCalledOnce());
  await act(async () => {
    if (!logo.cached) throw new Error('Missing test branding');
    finishBranding(logo.cached);
  });
  const image = await screen.findByRole('img', { name: 'Retry Cabinet' });
  expect(image.getAttribute('src')).toBe('blob:retried-logo');
});

it.each([
  ['register', 403, { code: 'registration_invite_required' }, 'auth.registrationInviteRequired'],
  [
    'login',
    403,
    { code: 'email_auth_disabled', message: 'Email authentication is disabled' },
    'auth.emailAuthDisabled',
  ],
  ['login', 401, 'Invalid credentials', 'auth.invalidCredentials'],
  ['login', 403, 'Please verify your email first', 'auth.emailNotVerified'],
  ['register', 429, 'Rate limit', 'auth.tooManyAttempts'],
  ['register', 400, 'Email already registered', 'auth.emailAlreadyRegistered'],
] as const)('shows the correct reason for %s %s %j', async (mode, status, detail, expected) => {
  auth.registerWithEmail.mockRejectedValue(error(status, detail));
  auth.loginWithEmail.mockRejectedValue(error(status, detail));
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  if (mode === 'register') fireEvent.click(screen.getByRole('button', { name: 'auth.register' }));
  fireEvent.change(screen.getByLabelText('auth.email'), {
    target: { value: 'reader@example.com' },
  });
  fireEvent.change(screen.getByLabelText('auth.password'), { target: { value: 'test-password' } });
  if (mode === 'register')
    fireEvent.change(screen.getByLabelText('auth.confirmPassword'), {
      target: { value: 'test-password' },
    });
  const form = screen.getByLabelText('auth.email').closest('form');
  if (!form) throw new Error('Email form not rendered');
  fireEvent.submit(form);
  expect(await screen.findByText(expected)).toBeTruthy();
  if (expected !== 'auth.invalidCredentials')
    expect(screen.queryByText('auth.invalidCredentials')).toBeNull();
  expect(mode === 'register' ? auth.registerWithEmail : auth.loginWithEmail).toHaveBeenCalledOnce();
});

it.each([true, false])(
  'uses the effective email toggle without forcing Telegram (enabled=%s)',
  async (enabled) => {
    auth.emailEnabled = enabled;
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await waitFor(() => expect(client.isFetching()).toBe(0));
    expect(Boolean(screen.queryByRole('button', { name: 'auth.loginWithEmail' }))).toBe(enabled);
    expect(auth.loginWithTelegram).not.toHaveBeenCalled();
  },
);

it('reads refreshed Telegram credentials after a rejected first attempt', async () => {
  telegram.active = true;
  telegram.initData = 'auth_date=1&hash=stale';
  auth.loginWithTelegram
    .mockImplementationOnce(async () => {
      telegram.initData = 'auth_date=2&hash=fresh';
      throw error(401, 'Invalid or expired Telegram authentication data');
    })
    .mockResolvedValueOnce(undefined);
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  await waitFor(() => expect(auth.loginWithTelegram).toHaveBeenCalledTimes(2), { timeout: 2500 });
  expect(auth.loginWithTelegram.mock.calls.map(([credential]) => credential)).toEqual([
    'auth_date=1&hash=stale',
    'auth_date=2&hash=fresh',
  ]);
});
