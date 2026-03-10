import apiClient from './client';
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
  // Telegram WebApp authentication
  loginTelegram: async (
    initData: string,
    campaignSlug?: string | null,
    referralCode?: string | null,
  ): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/cabinet/auth/telegram', {
      init_data: initData,
      campaign_slug: campaignSlug || undefined,
      referral_code: referralCode || undefined,
    });
    return response.data;
  },

  // Telegram Login Widget authentication
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
    });
    return response.data;
  },

  // Telegram OIDC authentication (popup flow with id_token)
  loginTelegramOIDC: async (
    idToken: string,
    campaignSlug?: string | null,
    referralCode?: string | null,
  ): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/cabinet/auth/telegram/oidc', {
      id_token: idToken,
      campaign_slug: campaignSlug || undefined,
      referral_code: referralCode || undefined,
    });
    return response.data;
  },

  // Email login
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
    });
    return response.data;
  },

  // Register email (link to existing Telegram account)
  registerEmail: async (
    email: string,
    password: string,
  ): Promise<{ message: string; email: string }> => {
    const response = await apiClient.post('/cabinet/auth/email/register', {
      email,
      password,
    });
    return response.data;
  },

  // Register standalone email account (no Telegram required)
  // Returns message - user must verify email before login
  registerEmailStandalone: async (data: {
    email: string;
    password: string;
    first_name?: string;
    language?: string;
    referral_code?: string;
  }): Promise<RegisterResponse> => {
    const response = await apiClient.post<RegisterResponse>(
      '/cabinet/auth/email/register/standalone',
      data,
    );
    return response.data;
  },

  // Verify email and get auth tokens
  verifyEmail: async (token: string, campaignSlug?: string | null): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/cabinet/auth/email/verify', {
      token,
      campaign_slug: campaignSlug || undefined,
    });
    return response.data;
  },

  // Resend verification email
  resendVerification: async (): Promise<{ message: string }> => {
    const response = await apiClient.post('/cabinet/auth/email/resend');
    return response.data;
  },

  // Refresh token
  refreshToken: async (refreshToken: string): Promise<TokenResponse> => {
    const response = await apiClient.post<TokenResponse>('/cabinet/auth/refresh', {
      refresh_token: refreshToken,
    });
    return response.data;
  },

  // Logout
  logout: async (refreshToken: string): Promise<void> => {
    await apiClient.post('/cabinet/auth/logout', {
      refresh_token: refreshToken,
    });
  },

  // Forgot password
  forgotPassword: async (email: string): Promise<{ message: string }> => {
    const response = await apiClient.post('/cabinet/auth/password/forgot', { email });
    return response.data;
  },

  // Reset password
  resetPassword: async (token: string, password: string): Promise<{ message: string }> => {
    const response = await apiClient.post('/cabinet/auth/password/reset', {
      token,
      password,
    });
    return response.data;
  },

  // Get current user
  getMe: async (): Promise<User> => {
    const response = await apiClient.get<User>('/cabinet/auth/me');
    return response.data;
  },

  // Request email change - sends verification code to new email
  requestEmailChange: async (
    newEmail: string,
  ): Promise<{ message: string; new_email: string; expires_in_minutes: number }> => {
    const response = await apiClient.post('/cabinet/auth/email/change', {
      new_email: newEmail,
    });
    return response.data;
  },

  // Verify email change with code
  verifyEmailChange: async (code: string): Promise<{ message: string; email: string }> => {
    const response = await apiClient.post('/cabinet/auth/email/change/verify', {
      code,
    });
    return response.data;
  },

  // OAuth: get enabled providers
  getOAuthProviders: async (): Promise<{ providers: OAuthProvider[] }> => {
    const response = await apiClient.get<{ providers: OAuthProvider[] }>(
      '/cabinet/auth/oauth/providers',
    );
    return response.data;
  },

  // OAuth: get authorization URL
  getOAuthAuthorizeUrl: async (
    provider: string,
  ): Promise<{ authorize_url: string; state: string }> => {
    const response = await apiClient.get<{ authorize_url: string; state: string }>(
      `/cabinet/auth/oauth/${encodeURIComponent(provider)}/authorize`,
    );
    return response.data;
  },

  // OAuth: callback (exchange code for tokens)
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
      },
    );
    return response.data;
  },

  // Account linking
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

  // Link Telegram account (Mini App initData, OIDC id_token, or Login Widget data)
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

  // Server-side OAuth linking completion (no JWT needed — auth via state token)
  // Used when OAuth opens in external browser from Telegram Mini App
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

  // Auto-login from guest purchase success page
  autoLogin: async (token: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/cabinet/auth/login/auto', { token });
    return response.data;
  },

  // Account merge (no JWT required)
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
