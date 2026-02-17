import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CampaignBonusInfo, RegisterResponse, User } from '../types';
import { authApi } from '../api/auth';
import { apiClient } from '../api/client';
import { captureCampaignFromUrl, consumeCampaignSlug } from '../utils/campaign';
import { tokenStorage, isTokenValid, tokenRefreshManager } from '../utils/token';

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
  loginWithEmail: (email: string, password: string) => Promise<void>;
  loginWithOAuth: (provider: string, code: string, state: string) => Promise<void>;
  registerWithEmail: (
    email: string,
    password: string,
    firstName?: string,
    referralCode?: string,
  ) => Promise<RegisterResponse>;
}

// Блокировка для предотвращения race condition при инициализации
// Используем объект для атомарности операций
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
        // Get refresh token from secure storage, not zustand state
        const refreshToken = tokenStorage.getRefreshToken();
        if (refreshToken) {
          authApi.logout(refreshToken).catch(() => {
            // Logout API call failed - ignore silently
          });
        }
        tokenStorage.clearTokens();
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
            return;
          }
          // Используем apiClient для единообразной обработки ошибок
          const response = await apiClient.get<{ is_admin: boolean }>('/cabinet/auth/me/is-admin');
          set({ isAdmin: response.data.is_admin });
        } catch {
          set({ isAdmin: false });
        }
      },

      refreshUser: async () => {
        try {
          const user = await authApi.getMe();
          set({ user });
        } catch {
          // Failed to refresh user - ignore silently
        }
      },

      initialize: async () => {
        // Защита от race condition - если уже инициализировано, выходим
        if (initState.isInitialized) {
          return;
        }

        // Если уже идёт инициализация, ждём её завершения
        if (initState.isInitializing && initState.promise) {
          return initState.promise;
        }

        initState.isInitializing = true;
        initState.promise = (async () => {
          try {
            set({ isLoading: true });

            // Миграция токенов из localStorage (для обратной совместимости)
            tokenStorage.migrateFromLocalStorage();

            const accessToken = tokenStorage.getAccessToken();
            const refreshToken = tokenStorage.getRefreshToken();

            if (!refreshToken) {
              set({ isLoading: false, isAuthenticated: false });
              return;
            }

            // No access token or it's expired — try refresh
            // This handles Mini App reopens where sessionStorage was cleared
            // but refresh token persists in localStorage
            if (!isTokenValid(accessToken)) {
              // Используем централизованный менеджер для refresh
              const newToken = await tokenRefreshManager.refreshAccessToken();
              if (newToken) {
                const user = await authApi.getMe();
                // Сначала проверяем admin статус, потом снимаем isLoading
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
              // Сначала проверяем admin статус, потом снимаем isLoading
              await get().checkAdminStatus();
              set({
                accessToken,
                refreshToken,
                user,
                isAuthenticated: true,
                isLoading: false,
              });
            } catch {
              // Token might be invalid on server, try to refresh
              const newToken = await tokenRefreshManager.refreshAccessToken();
              if (newToken) {
                try {
                  const user = await authApi.getMe();
                  // Сначала проверяем admin статус, потом снимаем isLoading
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
                // Refresh failed, logout
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
        const campaignSlug = consumeCampaignSlug();
        const response = await authApi.loginTelegram(initData, campaignSlug);
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
        const campaignSlug = consumeCampaignSlug();
        const response = await authApi.loginTelegramWidget(data, campaignSlug);
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
        const campaignSlug = consumeCampaignSlug();
        const response = await authApi.loginEmail(email, password, campaignSlug);
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

      loginWithOAuth: async (provider, code, state) => {
        const campaignSlug = consumeCampaignSlug();
        const response = await authApi.oauthCallback(provider, code, state, campaignSlug);
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
        // Registration now returns message, not tokens
        // User must verify email before they can login
        // Campaign slug stays in localStorage — consumed during verify_email step
        const response = await authApi.registerEmailStandalone({
          email,
          password,
          first_name: firstName,
          language: navigator.language.split('-')[0] || 'ru',
          referral_code: referralCode,
        });
        return response;
      },
    }),
    {
      name: 'cabinet-auth',
      // Only persist user info for UI caching
      // Tokens are stored securely in sessionStorage via tokenStorage
      partialize: (state) => ({
        user: state.user,
      }),
    },
  ),
);

// Capture campaign slug from URL before auth initialization
captureCampaignFromUrl();

// Initialize auth on app load
useAuthStore.getState().initialize();
