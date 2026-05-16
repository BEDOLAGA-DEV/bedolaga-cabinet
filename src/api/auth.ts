import apiClient from './client';
import { getYandexCid } from '../utils/yandexCid';
import type {
  AppleOAuthUserPayload,
  AuthResponse,
  LinkCallbackResponse,
  LinkedProvidersResponse,
  MergePreviewResponse,
  MergeResponse,
  OAuthAuthorizeResponse,
  OAuthClientType,
  OAuthProvider,
  RegisterResponse,
  ServerCompleteResponse,
  TokenResponse,
  User,
} from '../types';

export const authApi = {
  loginTelegram: async (
    initData: string,
    campaignSlug?: string | null,
    referralCode?: string | null,
  ): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/cabinet/auth/telegram', {
      init_data: initData,
      campaign_slug: campaignSlug || undefined,
      referral_code: referralCode || undefined,
      yandex_cid: getYandexCid() || undefined,
    });
    return response.data;
  },

  loginTelegramWidget: async (
    data: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      photo_url?: string;
      auth_date: number;
      hash: string;
    },
    campaignSlug?: string | null,
    referralCode?: string | null,
  ): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/cabinet/auth/telegram/widget', {
      ...data,
      campaign_slug: campaignSlug || undefined,
      referral_code: referralCode || undefined,
      yandex_cid: getYandexCid() || undefined,
    });
    return response.data;
  },

  loginTelegramOIDC: async (
    idToken: string,
    campaignSlug?: string | null,
    referralCode?: string | null,
  ): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/cabinet/auth/telegram/oidc', {
      id_token: idToken,
      campaign_slug: campaignSlug || undefined,
      referral_code: referralCode || undefined,
      yandex_cid: getYandexCid() || undefined,
    });
    return response.data;
  },

  loginEmail: async (
    email: string,
    password: string,
    campaignSlug?: string | null,
    referralCode?: string | null,
  ): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/cabinet/auth/email/login', {
      email,
      password,
      campaign_slug: campaignSlug || undefined,
      referral_code: referralCode || undefined,
      yandex_cid: getYandexCid() || undefined,
    });
    return response.data;
  },

  registerEmail: async (
    email: string,
    password: string,
  ): Promise<{
    message: string;
    email?: string;
    merge_required?: boolean;
    merge_token?: string;
  }> => {
    const response = await apiClient.post('/cabinet/auth/email/register', {
      email,
      password,
      yandex_cid: getYandexCid() || undefined,
    });
    return response.data;
  },

  registerEmailStandalone: async (data: {
    email: string;
    password: string;
    first_name?: string;
    language?: string;
    referral_code?: string;
    campaign_slug?: string;
  }): Promise<RegisterResponse> => {
    const response = await apiClient.post<RegisterResponse>(
      '/cabinet/auth/email/register/standalone',
      { ...data, yandex_cid: getYandexCid() || undefined },
    );
    return response.data;
  },

  verifyEmail: async (token: string, campaignSlug?: string | null): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/cabinet/auth/email/verify', {
      token,
      campaign_slug: campaignSlug || undefined,
    });
    return response.data;
  },

  resendVerification: async (): Promise<{ message: string }> => {
    const response = await apiClient.post('/cabinet/auth/email/resend');
    return response.data;
  },

  refreshToken: async (refreshToken: string): Promise<TokenResponse> => {
    const response = await apiClient.post<TokenResponse>('/cabinet/auth/refresh', {
      refresh_token: refreshToken,
    });
    return response.data;
  },

  logout: async (refreshToken: string): Promise<void> => {
    await apiClient.post('/cabinet/auth/logout', {
      refresh_token: refreshToken,
    });
  },

  forgotPassword: async (email: string): Promise<{ message: string }> => {
    const response = await apiClient.post('/cabinet/auth/password/forgot', { email });
    return response.data;
  },

  resetPassword: async (token: string, password: string): Promise<{ message: string }> => {
    const response = await apiClient.post('/cabinet/auth/password/reset', {
      token,
      password,
    });
    return response.data;
  },

  getMe: async (): Promise<User> => {
    const response = await apiClient.get<User>('/cabinet/auth/me');
    return response.data;
  },

  requestEmailChange: async (
    newEmail: string,
  ): Promise<{ message: string; new_email: string; expires_in_minutes: number }> => {
    const response = await apiClient.post('/cabinet/auth/email/change', {
      new_email: newEmail,
    });
    return response.data;
  },

  verifyEmailChange: async (code: string): Promise<{ message: string; email: string }> => {
    const response = await apiClient.post('/cabinet/auth/email/change/verify', {
      code,
    });
    return response.data;
  },

  getOAuthProviders: async (): Promise<{ providers: OAuthProvider[] }> => {
    try {
      const response = await apiClient.get<{ providers: OAuthProvider[] }>(
        '/cabinet/auth/oauth/providers',
      );
      // #region agent log
      fetch('http://127.0.0.1:7838/ingest/b66444f4-4002-4c2a-9afb-14fa0c7c2198', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '24d8ec' },
        body: JSON.stringify({
          sessionId: '24d8ec',
          runId: 'initial',
          hypothesisId: 'H1,H2',
          location: 'src/api/auth.ts:getOAuthProviders',
          message: 'oauth providers loaded',
          data: {
            providerNames: response.data.providers.map((provider) => provider.name),
            providerCount: response.data.providers.length,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      return response.data;
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7838/ingest/b66444f4-4002-4c2a-9afb-14fa0c7c2198', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '24d8ec' },
        body: JSON.stringify({
          sessionId: '24d8ec',
          runId: 'initial',
          hypothesisId: 'H1,H2',
          location: 'src/api/auth.ts:getOAuthProviders',
          message: 'oauth providers failed',
          data: {
            status: (error as { response?: { status?: number } }).response?.status,
            code: (error as { code?: string }).code,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      throw error;
    }
  },

  getOAuthAuthorizeUrl: async (
    provider: string,
    clientType?: OAuthClientType,
  ): Promise<OAuthAuthorizeResponse> => {
    const response = await apiClient.get<OAuthAuthorizeResponse>(
      `/cabinet/auth/oauth/${encodeURIComponent(provider)}/authorize`,
      {
        params: clientType ? { client_type: clientType } : undefined,
      },
    );
    return response.data;
  },

  oauthCallback: async (
    provider: string,
    code: string,
    state: string,
    deviceId?: string | null,
    campaignSlug?: string | null,
    referralCode?: string | null,
    user?: AppleOAuthUserPayload | string | null,
  ): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>(
      `/cabinet/auth/oauth/${encodeURIComponent(provider)}/callback`,
      {
        code,
        state,
        device_id: deviceId || undefined,
        campaign_slug: campaignSlug || undefined,
        referral_code: referralCode || undefined,
        yandex_cid: getYandexCid() || undefined,
        user: user ?? undefined,
      },
    );
    return response.data;
  },

  getLinkedProviders: async (): Promise<LinkedProvidersResponse> => {
    const response = await apiClient.get<LinkedProvidersResponse>(
      '/cabinet/auth/account/linked-providers',
    );
    return response.data;
  },

  linkProviderInit: async (
    provider: string,
    clientType?: OAuthClientType,
  ): Promise<OAuthAuthorizeResponse> => {
    const response = await apiClient.get<OAuthAuthorizeResponse>(
      `/cabinet/auth/account/link/${encodeURIComponent(provider)}/init`,
      {
        params: clientType ? { client_type: clientType } : undefined,
      },
    );
    return response.data;
  },

  linkProviderCallback: async (
    provider: string,
    code: string,
    state: string,
    deviceId?: string,
    user?: AppleOAuthUserPayload | string | null,
  ): Promise<LinkCallbackResponse> => {
    const response = await apiClient.post<LinkCallbackResponse>(
      `/cabinet/auth/account/link/${encodeURIComponent(provider)}/callback`,
      {
        code,
        state,
        device_id: deviceId,
        user: user ?? undefined,
      },
    );
    return response.data;
  },

  linkTelegram: async (
    data:
      | { init_data: string }
      | { id_token: string }
      | {
          id: number;
          first_name: string;
          last_name?: string;
          username?: string;
          photo_url?: string;
          auth_date: number;
          hash: string;
        },
  ): Promise<LinkCallbackResponse> => {
    const response = await apiClient.post<LinkCallbackResponse>(
      '/cabinet/auth/account/link/telegram',
      data,
    );
    return response.data;
  },

  linkServerComplete: async (
    code: string,
    state: string,
    deviceId?: string,
    user?: AppleOAuthUserPayload | string | null,
  ): Promise<ServerCompleteResponse> => {
    const response = await apiClient.post<ServerCompleteResponse>(
      '/cabinet/auth/account/link/server-complete',
      {
        code,
        state,
        device_id: deviceId,
        user: user ?? undefined,
      },
    );
    return response.data;
  },

  unlinkProvider: async (provider: string): Promise<{ success: boolean }> => {
    const response = await apiClient.post<{ success: boolean }>(
      `/cabinet/auth/account/unlink/${encodeURIComponent(provider)}`,
    );
    return response.data;
  },

  autoLogin: async (token: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/cabinet/auth/login/auto', { token });
    return response.data;
  },

  requestDeepLinkToken: async (): Promise<{
    token: string;
    bot_username: string;
    expires_in: number;
  }> => {
    const response = await apiClient.post<{
      token: string;
      bot_username: string;
      expires_in: number;
    }>('/cabinet/auth/deeplink/request');
    return response.data;
  },

  pollDeepLinkToken: async (token: string, campaignSlug?: string | null): Promise<AuthResponse> => {
    // validateStatus: only treat 200 as success.
    // Server returns 202 for "pending" and 410 for "expired" —
    // these must reject so the polling catch-block can handle them.
    // Without this, axios resolves on 202 (it's 2xx), causing
    // loginWithDeepLink to set undefined tokens + isAuthenticated=true,
    // which triggers checkAdminStatus() → 401 → safeRedirectToLogin() → infinite reload.
    const response = await apiClient.post<AuthResponse>(
      '/cabinet/auth/deeplink/poll',
      { token, campaign_slug: campaignSlug || undefined },
      { validateStatus: (status) => status === 200 },
    );
    return response.data;
  },

  getMergePreview: async (mergeToken: string): Promise<MergePreviewResponse> => {
    const response = await apiClient.get<MergePreviewResponse>(
      `/cabinet/auth/merge/${encodeURIComponent(mergeToken)}`,
    );
    return response.data;
  },

  executeMerge: async (
    mergeToken: string,
    keepSubscriptionFrom: number,
  ): Promise<MergeResponse> => {
    const response = await apiClient.post<MergeResponse>(
      `/cabinet/auth/merge/${encodeURIComponent(mergeToken)}`,
      {
        keep_subscription_from: keepSubscriptionFrom,
      },
    );
    return response.data;
  },
};
