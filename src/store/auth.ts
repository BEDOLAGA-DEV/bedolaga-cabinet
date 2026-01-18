import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '../types'
import { authApi } from '../api/auth'
import { tokenStorage, isTokenValid, tokenRefreshManager } from '../utils/token'

export interface TelegramWidgetData {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  isAdmin: boolean

  setTokens: (accessToken: string, refreshToken: string) => void
  setUser: (user: User) => void
  setIsAdmin: (isAdmin: boolean) => void
  logout: () => void
  initialize: () => Promise<void>
  refreshUser: () => Promise<void>
  checkAdminStatus: () => Promise<void>
  loginWithTelegram: (initData: string) => Promise<void>
  loginWithTelegramWidget: (data: TelegramWidgetData) => Promise<void>
  loginWithEmail: (email: string, password: string) => Promise<void>
}

// Блокировка для предотвращения race condition при инициализации
let initializePromise: Promise<void> | null = null
let isInitializing = false

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      isLoading: true,
      isAdmin: false,

      setTokens: (accessToken, refreshToken) => {
        tokenStorage.setTokens(accessToken, refreshToken)
        set({
          accessToken,
          refreshToken,
          isAuthenticated: true,
        })
      },

      setUser: (user) => {
        set({ user })
      },

      setIsAdmin: (isAdmin) => {
        set({ isAdmin })
      },

      logout: () => {
        const { refreshToken } = get()
        if (refreshToken) {
          authApi.logout(refreshToken).catch((error) => {
            console.error('[Auth] Logout API call failed:', error)
          })
        }
        tokenStorage.clearTokens()
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
          isAdmin: false,
        })
      },

      checkAdminStatus: async () => {
        try {
          const token = tokenStorage.getAccessToken()
          if (!token || !isTokenValid(token)) {
            set({ isAdmin: false })
            return
          }
          const response = await fetch('/api/cabinet/auth/me/is-admin', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
          if (response.ok) {
            const data = await response.json()
            set({ isAdmin: data.is_admin })
          }
        } catch (error) {
          console.error('[Auth] Failed to check admin status:', error)
          set({ isAdmin: false })
        }
      },

      refreshUser: async () => {
        try {
          const user = await authApi.getMe()
          set({ user })
        } catch (error) {
          console.error('[Auth] Failed to refresh user:', error)
        }
      },

      initialize: async () => {
        // Защита от race condition - если уже идёт инициализация, ждём её завершения
        if (isInitializing && initializePromise) {
          return initializePromise
        }

        isInitializing = true
        initializePromise = (async () => {
          try {
            set({ isLoading: true })

            // Миграция токенов из localStorage (для обратной совместимости)
            tokenStorage.migrateFromLocalStorage()

            const accessToken = tokenStorage.getAccessToken()
            const refreshToken = tokenStorage.getRefreshToken()

            if (!accessToken || !refreshToken) {
              set({ isLoading: false, isAuthenticated: false })
              return
            }

            // Проверяем валидность токена перед использованием
            if (!isTokenValid(accessToken)) {
              // Используем централизованный менеджер для refresh
              const newToken = await tokenRefreshManager.refreshAccessToken()
              if (newToken) {
                const user = await authApi.getMe()
                set({
                  accessToken: newToken,
                  refreshToken,
                  user,
                  isAuthenticated: true,
                  isLoading: false,
                })
                get().checkAdminStatus()
              } else {
                tokenStorage.clearTokens()
                set({
                  accessToken: null,
                  refreshToken: null,
                  user: null,
                  isAuthenticated: false,
                  isLoading: false,
                })
              }
              return
            }

            try {
              const user = await authApi.getMe()
              set({
                accessToken,
                refreshToken,
                user,
                isAuthenticated: true,
                isLoading: false,
              })
              get().checkAdminStatus()
            } catch (error) {
              console.error('[Auth] getMe failed, trying refresh:', error)
              // Token might be invalid on server, try to refresh
              const newToken = await tokenRefreshManager.refreshAccessToken()
              if (newToken) {
                try {
                  const user = await authApi.getMe()
                  set({
                    accessToken: newToken,
                    refreshToken,
                    user,
                    isAuthenticated: true,
                    isLoading: false,
                  })
                  get().checkAdminStatus()
                } catch (userError) {
                  console.error('[Auth] getMe failed after refresh:', userError)
                  tokenStorage.clearTokens()
                  set({
                    accessToken: null,
                    refreshToken: null,
                    user: null,
                    isAuthenticated: false,
                    isLoading: false,
                  })
                }
              } else {
                // Refresh failed, logout
                tokenStorage.clearTokens()
                set({
                  accessToken: null,
                  refreshToken: null,
                  user: null,
                  isAuthenticated: false,
                  isLoading: false,
                })
              }
            }
          } finally {
            isInitializing = false
            initializePromise = null
          }
        })()

        return initializePromise
      },

      loginWithTelegram: async (initData) => {
        const response = await authApi.loginTelegram(initData)
        tokenStorage.setTokens(response.access_token, response.refresh_token)
        set({
          accessToken: response.access_token,
          refreshToken: response.refresh_token,
          user: response.user,
          isAuthenticated: true,
        })
        get().checkAdminStatus()
      },

      loginWithTelegramWidget: async (data) => {
        const response = await authApi.loginTelegramWidget(data)
        tokenStorage.setTokens(response.access_token, response.refresh_token)
        set({
          accessToken: response.access_token,
          refreshToken: response.refresh_token,
          user: response.user,
          isAuthenticated: true,
        })
        get().checkAdminStatus()
      },

      loginWithEmail: async (email, password) => {
        const response = await authApi.loginEmail(email, password)
        tokenStorage.setTokens(response.access_token, response.refresh_token)
        set({
          accessToken: response.access_token,
          refreshToken: response.refresh_token,
          user: response.user,
          isAuthenticated: true,
        })
        get().checkAdminStatus()
      },
    }),
    {
      name: 'cabinet-auth',
      partialize: (state) => ({
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    }
  )
)

// Initialize auth on app load
useAuthStore.getState().initialize()
