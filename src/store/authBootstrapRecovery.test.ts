// @vitest-environment jsdom
import axios, { AxiosError, AxiosHeaders } from 'axios';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

function jwt(exp: number): string {
  return `masked.${btoa(JSON.stringify({ exp }))}.signature`;
}

beforeEach(() => {
  vi.resetModules();
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(() => vi.restoreAllMocks());

it.each([false, true])(
  'finishes bootstrap without losing tokens when getMe is offline (expired=%s)',
  async (expired) => {
    const { tokenStorage } = await import('../utils/token');
    const { authApi } = await import('../api/auth');
    const { useAuthStore } = await import('./auth');
    const access = jwt(expired ? 1 : Date.now() / 1000 + 3600);
    const refreshed = jwt(Date.now() / 1000 + 7200);
    tokenStorage.setTokens(access, 'masked-refresh');
    vi.spyOn(axios, 'post').mockResolvedValue({ data: { access_token: refreshed } });
    vi.spyOn(authApi, 'getMe').mockRejectedValue(new AxiosError('Offline', 'ERR_NETWORK'));

    await expect(useAuthStore.getState().initialize()).resolves.toBeUndefined();

    expect(tokenStorage.getRefreshToken()).toBe('masked-refresh');
    expect(tokenStorage.getAccessToken()).toBe(expired ? refreshed : access);
    expect(useAuthStore.getState().isLoading).toBe(false);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  },
);

it('keeps the refreshed session when getMe fails offline after an initial authentication rejection', async () => {
  const { tokenStorage } = await import('../utils/token');
  const { authApi } = await import('../api/auth');
  const { useAuthStore } = await import('./auth');
  const refreshed = jwt(Date.now() / 1000 + 7200);
  tokenStorage.setTokens(jwt(Date.now() / 1000 + 3600), 'masked-refresh');
  vi.spyOn(axios, 'post').mockResolvedValue({ data: { access_token: refreshed } });
  vi.spyOn(authApi, 'getMe')
    .mockRejectedValueOnce({ response: { status: 401 } })
    .mockRejectedValueOnce(new AxiosError('Offline', 'ERR_NETWORK'));

  await useAuthStore.getState().initialize();

  expect(tokenStorage.getRefreshToken()).toBe('masked-refresh');
  expect(tokenStorage.getAccessToken()).toBe(refreshed);
  expect(useAuthStore.getState().isLoading).toBe(false);
});

it('clears a session whose refresh credentials are rejected', async () => {
  const { tokenStorage } = await import('../utils/token');
  const { useAuthStore } = await import('./auth');
  tokenStorage.setTokens(jwt(1), 'masked-refresh');
  vi.spyOn(axios, 'post').mockRejectedValue({ response: { status: 401 } });

  await useAuthStore.getState().initialize();

  expect(tokenStorage.getRefreshToken()).toBeNull();
  expect(useAuthStore.getState().isAuthenticated).toBe(false);
  expect(useAuthStore.getState().isLoading).toBe(false);
});

it('can resume initialization after a temporary profile failure', async () => {
  const { tokenStorage } = await import('../utils/token');
  const { authApi } = await import('../api/auth');
  const { apiClient } = await import('../api/client');
  const { useAuthStore } = await import('./auth');
  tokenStorage.setTokens(jwt(Date.now() / 1000 + 3600), 'masked-refresh');
  const user = { id: 42 } as Awaited<ReturnType<typeof authApi.getMe>>;
  const getMe = vi
    .spyOn(authApi, 'getMe')
    .mockRejectedValue(new AxiosError('Offline', 'ERR_NETWORK'));
  vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { is_admin: false } });
  vi.spyOn(axios, 'post').mockResolvedValue({
    data: { access_token: jwt(Date.now() / 1000 + 7200) },
  });

  await useAuthStore.getState().initialize();
  expect(useAuthStore.getState().isAuthenticated).toBe(false);
  getMe.mockResolvedValue(user);
  await useAuthStore.getState().initialize();

  expect(useAuthStore.getState().isAuthenticated).toBe(true);
  expect(useAuthStore.getState().user?.id).toBe(42);
});

it.each([502, 503, 504])(
  'keeps expired credentials and allows retry after gateway status %s',
  async (status) => {
    const { tokenStorage } = await import('../utils/token');
    const { useAuthStore } = await import('./auth');
    const { useBlockingStore } = await import('./blocking');
    tokenStorage.setTokens(jwt(1), 'masked-refresh');
    const headers = new AxiosHeaders();
    vi.spyOn(axios, 'post').mockRejectedValue(
      new AxiosError('Gateway unavailable', 'ERR_BAD_RESPONSE', undefined, undefined, {
        status,
        statusText: '',
        data: '',
        headers,
        config: { headers },
      }),
    );

    await useAuthStore.getState().initialize();

    expect(tokenStorage.getRefreshToken()).toBe('masked-refresh');
    expect(useAuthStore.getState().isLoading).toBe(false);
    expect(useBlockingStore.getState().blockingType).toBe('backend_unavailable');
  },
);

it.each([502, 503, 504])(
  'preserves a valid session when the profile endpoint returns gateway status %s',
  async (status) => {
    const { tokenStorage } = await import('../utils/token');
    const { apiClient } = await import('../api/client');
    const { useAuthStore } = await import('./auth');
    const { useBlockingStore } = await import('./blocking');
    const access = jwt(Date.now() / 1000 + 3600);
    tokenStorage.setTokens(access, 'masked-refresh');
    const adapter = apiClient.defaults.adapter;
    apiClient.defaults.adapter = async (config) => {
      throw new AxiosError('Gateway unavailable', 'ERR_BAD_RESPONSE', config, undefined, {
        status,
        statusText: '',
        data: '',
        headers: new AxiosHeaders(),
        config,
      });
    };
    vi.spyOn(axios, 'post').mockRejectedValue({ response: { status: 502 } });
    try {
      await useAuthStore.getState().initialize();
      expect(tokenStorage.getRefreshToken()).toBe('masked-refresh');
      expect(tokenStorage.getAccessToken()).toBe(access);
      expect(useAuthStore.getState().isLoading).toBe(false);
      expect(useBlockingStore.getState().blockingType).toBe('backend_unavailable');
    } finally {
      apiClient.defaults.adapter = adapter;
    }
  },
);
