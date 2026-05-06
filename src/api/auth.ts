import apiClient from './client';
import { getYandexCid } from '../utils/yandexCid';
import type {
  AuthResponse,
  LinkCallbackResponse,
  LinkedProvidersResponse,
  MergePreviewResponse,
  MergeResponse,
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
    const response = await apiClient.get<{ providers: OAuthProvider[] }>(
      '/cabinet/auth/oauth/providers',
    );
    return response.data;
  },

  getOAuthAuthorizeUrl: async (
    provider: string,
  ): Promise<{ authorize_url: string; state: string }> => {
    const response = await apiClient.get<{ authorize_url: string; state: string }>(
      `/cabinet/auth/oauth/${encodeURIComponent(provider)}/authorize`,
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

  linkProviderInit: async (provider: string): Promise<{ authorize_url: string; state: string }> => {
    const response = await apiClient.get<{ authorize_url: string; state: string }>(
      `/cabinet/auth/account/link/${encodeURIComponent(provider)}/init`,
    );
    return response.data;
  },

  linkProviderCallback: async (
    provider: string,
    code: string,
    state: string,
    deviceId?: string,
  ): Promise<LinkCallbackResponse> => {
    const response = await apiClient.post<LinkCallbackResponse>(
      `/cabinet/auth/account/link/${encodeURIComponent(provider)}/callback`,
      {
        code,
        state,
        device_id: deviceId,
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
  ): Promise<ServerCompleteResponse> => {
    const response = await apiClient.post<ServerCompleteResponse>(
      '/cabinet/auth/account/link/server-complete',
      {
        code,
        state,
        device_id: deviceId,
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
