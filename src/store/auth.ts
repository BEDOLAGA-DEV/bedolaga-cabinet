import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CampaignBonusInfo, RegisterResponse, User } from '../types';
import { authApi } from '../api/auth';
import { apiClient } from '../api/client';
import {
  captureCampaignFromUrl,
  consumeCampaignSlug,
  getPendingCampaignSlug,
} from '../utils/campaign';
import {
  captureReferralFromUrl,
  consumeReferralCode,
  getPendingReferralCode,
} from '../utils/referral';
import { tokenStorage, isTokenValid, tokenRefreshManager } from '../utils/token';
import { usePermissionStore } from './permissions';

export interface TelegramWidgetData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  pendingCampaignBonus: CampaignBonusInfo | null;

  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  setIsAdmin: (isAdmin: boolean) => void;
  clearCampaignBonus: () => void;
  logout: () => void;
  initialize: () => Promise<void>;
  refreshUser: () => Promise<void>;
  checkAdminStatus: () => Promise<void>;
  loginWithTelegram: (initData: string) => Promise<void>;
  loginWithTelegramWidget: (data: TelegramWidgetData) => Promise<void>;
  loginWithTelegramOIDC: (idToken: string) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  loginWithOAuth: (
    provider: string,
    code: string,
    state: string,
    deviceId?: string | null,
  ) => Promise<void>;
  loginWithDeepLink: (token: string, campaignSlug?: string | null) => Promise<void>;
  registerWithEmail: (
    email: string,
    password: string,
    firstName?: string,
    referralCode?: string,
  ) => Promise<RegisterResponse>;
}

const initState = {
  promise: null as Promise<void> | null,
  isInitializing: false,
  isInitialized: false,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      isLoading: true,
      isAdmin: false,
      pendingCampaignBonus: null,

      clearCampaignBonus: () => set({ pendingCampaignBonus: null }),

      setTokens: (accessToken, refreshToken) => {
        if (!accessToken || !refreshToken) {
          throw new Error('Invalid tokens: cannot store empty credentials');
        }
        tokenStorage.setTokens(accessToken, refreshToken);
        set({
          accessToken,
          refreshToken,
          isAuthenticated: true,
        });
      },

      setUser: (user) => {
        set({ user });
      },

      setIsAdmin: (isAdmin) => {
        set({ isAdmin });
      },

      logout: () => {
        const refreshToken = tokenStorage.getRefreshToken();
        if (refreshToken) {
          authApi.logout(refreshToken).catch(() => {});
        }
        tokenStorage.clearTokens();
        usePermissionStore.getState().reset();
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
          isAdmin: false,
        });
      },

      checkAdminStatus: async () => {
        try {
          const token = tokenStorage.getAccessToken();
          if (!token || !isTokenValid(token)) {
            set({ isAdmin: false });
            usePermissionStore.getState().reset();
            return;
          }
          const response = await apiClient.get<{ is_admin: boolean }>('/cabinet/auth/me/is-admin');
          set({ isAdmin: response.data.is_admin });
          if (response.data.is_admin) {
            await usePermissionStore.getState().fetchPermissions();
          } else {
            usePermissionStore.getState().reset();
          }
        } catch {
          set({ isAdmin: false });
          usePermissionStore.getState().reset();
        }
      },

      refreshUser: async () => {
        try {
          const user = await authApi.getMe();
          set({ user });
        } catch {}
      },

      initialize: async () => {
        if (initState.isInitialized) {
          return;
        }

        if (initState.isInitializing && initState.promise) {
          return initState.promise;
        }

        initState.isInitializing = true;
        initState.promise = (async () => {
          try {
            set({ isLoading: true });

            tokenStorage.migrateFromLocalStorage();

            const accessToken = tokenStorage.getAccessToken();
            const refreshToken = tokenStorage.getRefreshToken();

            if (!refreshToken) {
              set({ isLoading: false, isAuthenticated: false });
              return;
            }

            if (!isTokenValid(accessToken)) {
              const newToken = await tokenRefreshManager.refreshAccessToken();
              if (newToken) {
                const user = await authApi.getMe();
                await get().checkAdminStatus();
                set({
                  accessToken: newToken,
                  refreshToken,
                  user,
                  isAuthenticated: true,
                  isLoading: false,
                });
              } else {
                tokenStorage.clearTokens();
                set({
                  accessToken: null,
                  refreshToken: null,
                  user: null,
                  isAuthenticated: false,
                  isLoading: false,
                });
              }
              return;
            }

            try {
              const user = await authApi.getMe();
              await get().checkAdminStatus();
              set({
                accessToken,
                refreshToken,
                user,
                isAuthenticated: true,
                isLoading: false,
              });
            } catch {
              const newToken = await tokenRefreshManager.refreshAccessToken();
              if (newToken) {
                try {
                  const user = await authApi.getMe();
                  await get().checkAdminStatus();
                  set({
                    accessToken: newToken,
                    refreshToken,
                    user,
                    isAuthenticated: true,
                    isLoading: false,
                  });
                } catch {
                  tokenStorage.clearTokens();
                  set({
                    accessToken: null,
                    refreshToken: null,
                    user: null,
                    isAuthenticated: false,
                    isLoading: false,
                  });
                }
              } else {
                tokenStorage.clearTokens();
                set({
                  accessToken: null,
                  refreshToken: null,
                  user: null,
                  isAuthenticated: false,
                  isLoading: false,
                });
              }
            }
          } finally {
            initState.isInitializing = false;
            initState.isInitialized = true;
            initState.promise = null;
          }
        })();

        return initState.promise;
      },

      loginWithTelegram: async (initData) => {
        const campaignSlug = getPendingCampaignSlug();
        const referralCode = getPendingReferralCode();
        const response = await authApi.loginTelegram(initData, campaignSlug, referralCode);
        // Clear only after successful auth — retry keeps the slugs
        consumeCampaignSlug();
        consumeReferralCode();
        tokenStorage.setTokens(response.access_token, response.refresh_token);
        set({
          accessToken: response.access_token,
          refreshToken: response.refresh_token,
          user: response.user,
          isAuthenticated: true,
          pendingCampaignBonus: response.campaign_bonus || null,
        });
        await get().checkAdminStatus();
      },

      loginWithTelegramWidget: async (data) => {
        const campaignSlug = getPendingCampaignSlug();
        const referralCode = getPendingReferralCode();
        const response = await authApi.loginTelegramWidget(data, campaignSlug, referralCode);
        consumeCampaignSlug();
        consumeReferralCode();
        tokenStorage.setTokens(response.access_token, response.refresh_token);
        set({
          accessToken: response.access_token,
          refreshToken: response.refresh_token,
          user: response.user,
          isAuthenticated: true,
          pendingCampaignBonus: response.campaign_bonus || null,
        });
        await get().checkAdminStatus();
      },

      loginWithTelegramOIDC: async (idToken) => {
        const campaignSlug = getPendingCampaignSlug();
        const referralCode = getPendingReferralCode();
        const response = await authApi.loginTelegramOIDC(idToken, campaignSlug, referralCode);
        consumeCampaignSlug();
        consumeReferralCode();
        tokenStorage.setTokens(response.access_token, response.refresh_token);
        set({
          accessToken: response.access_token,
          refreshToken: response.refresh_token,
          user: response.user,
          isAuthenticated: true,
          pendingCampaignBonus: response.campaign_bonus || null,
        });
        await get().checkAdminStatus();
      },

      loginWithEmail: async (email, password) => {
        const campaignSlug = getPendingCampaignSlug();
        const referralCode = getPendingReferralCode();
        const response = await authApi.loginEmail(email, password, campaignSlug, referralCode);
        consumeCampaignSlug();
        consumeReferralCode();
        tokenStorage.setTokens(response.access_token, response.refresh_token);
        set({
          accessToken: response.access_token,
          refreshToken: response.refresh_token,
          user: response.user,
          isAuthenticated: true,
          pendingCampaignBonus: response.campaign_bonus || null,
        });
        await get().checkAdminStatus();
      },

      loginWithOAuth: async (provider, code, state, deviceId) => {
        const campaignSlug = getPendingCampaignSlug();
        const referralCode = getPendingReferralCode();
        const response = await authApi.oauthCallback(
          provider,
          code,
          state,
          deviceId,
          campaignSlug,
          referralCode,
        );
        consumeCampaignSlug();
        consumeReferralCode();
        tokenStorage.setTokens(response.access_token, response.refresh_token);
        set({
          accessToken: response.access_token,
          refreshToken: response.refresh_token,
          user: response.user,
          isAuthenticated: true,
          pendingCampaignBonus: response.campaign_bonus || null,
        });
        await get().checkAdminStatus();
      },

      loginWithDeepLink: async (token, campaignSlug) => {
        const response = await authApi.pollDeepLinkToken(token, campaignSlug);
        if (!response.access_token || !response.refresh_token) {
          throw new Error('Invalid auth response: missing tokens');
        }
        tokenStorage.setTokens(response.access_token, response.refresh_token);
        set({
          accessToken: response.access_token,
          refreshToken: response.refresh_token,
          user: response.user,
          isAuthenticated: true,
          pendingCampaignBonus: response.campaign_bonus || null,
        });
        await get().checkAdminStatus();
      },

      registerWithEmail: async (email, password, firstName, referralCode) => {
        const code = referralCode || getPendingReferralCode() || undefined;
        const campaignSlug = getPendingCampaignSlug() || undefined;
        const response = await authApi.registerEmailStandalone({
          email,
          password,
          first_name: firstName,
          language: navigator.language.split('-')[0] || 'ru',
          referral_code: code,
          campaign_slug: campaignSlug,
        });
        consumeReferralCode();
        return response;
      },
    }),
    {
      name: 'cabinet-auth',
      partialize: (state) => ({
        user: state.user,
      }),
    },
  ),
);

captureCampaignFromUrl();
captureReferralFromUrl();

useAuthStore.getState().initialize();
