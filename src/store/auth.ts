import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '../types'
import { authApi } from '../api/auth'

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
        localStorage.setItem('access_token', accessToken)
        localStorage.setItem('refresh_token', refreshToken)
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
          authApi.logout(refreshToken).catch(console.error)
        }
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
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
          const response = await fetch('/api/cabinet/auth/me/is-admin', {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('access_token')}`,
            },
          })
          if (response.ok) {
            const data = await response.json()
            set({ isAdmin: data.is_admin })
          }
        } catch (error) {
          console.error('Failed to check admin status:', error)
          set({ isAdmin: false })
        }
      },

      refreshUser: async () => {
        try {
          const user = await authApi.getMe()
          set({ user })
        } catch (error) {
          console.error('Failed to refresh user:', error)
        }
      },

      initialize: async () => {
        set({ isLoading: true })
        const accessToken = localStorage.getItem('access_token')
        const refreshToken = localStorage.getItem('refresh_token')

        if (!accessToken || !refreshToken) {
          set({ isLoading: false, isAuthenticated: false })
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
          // Check admin status
          get().checkAdminStatus()
        } catch (error) {
          // Token might be expired, try to refresh
          try {
            const response = await authApi.refreshToken(refreshToken)
            localStorage.setItem('access_token', response.access_token)
            const user = await authApi.getMe()
            set({
              accessToken: response.access_token,
              refreshToken,
              user,
              isAuthenticated: true,
              isLoading: false,
            })
            // Check admin status
            get().checkAdminStatus()
          } catch {
            // Refresh failed, logout
            localStorage.removeItem('access_token')
            localStorage.removeItem('refresh_token')
            set({
              accessToken: null,
              refreshToken: null,
              user: null,
              isAuthenticated: false,
              isLoading: false,
            })
          }
        }
      },

      loginWithTelegram: async (initData) => {
        const response = await authApi.loginTelegram(initData)
        localStorage.setItem('access_token', response.access_token)
        localStorage.setItem('refresh_token', response.refresh_token)
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
        localStorage.setItem('access_token', response.access_token)
        localStorage.setItem('refresh_token', response.refresh_token)
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
        localStorage.setItem('access_token', response.access_token)
        localStorage.setItem('refresh_token', response.refresh_token)
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
