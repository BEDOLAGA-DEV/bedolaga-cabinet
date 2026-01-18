import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { tokenStorage, isTokenExpired, tokenRefreshManager, safeRedirectToLogin } from '../utils/token'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

// Настраиваем endpoint для refresh
tokenRefreshManager.setRefreshEndpoint(`${API_BASE_URL}/cabinet/auth/refresh`)

// CSRF token management
const CSRF_COOKIE_NAME = 'csrf_token'
const CSRF_HEADER_NAME = 'X-CSRF-Token'

function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(^| )${CSRF_COOKIE_NAME}=([^;]+)`))
  return match ? match[2] : null
}

function generateCsrfToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

function ensureCsrfToken(): string {
  let token = getCsrfToken()
  if (!token) {
    token = generateCsrfToken()
    // Set cookie with SameSite=Strict for CSRF protection
    document.cookie = `${CSRF_COOKIE_NAME}=${token}; path=/; SameSite=Strict; Secure`
  }
  return token
}

const getTelegramInitData = (): string | null => {
  if (typeof window === 'undefined') return null

  const initData = window.Telegram?.WebApp?.initData
  if (initData) {
    tokenStorage.setTelegramInitData(initData)
    return initData
  }

  return tokenStorage.getTelegramInitData()
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - add auth token with expiration check
apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  let token = tokenStorage.getAccessToken()

  // Проверяем срок действия токена перед запросом
  if (token && isTokenExpired(token)) {
    // Используем централизованный менеджер для refresh
    const newToken = await tokenRefreshManager.refreshAccessToken()
    if (newToken) {
      token = newToken
    } else {
      // Refresh не удался - редирект на логин
      tokenStorage.clearTokens()
      safeRedirectToLogin()
      return config
    }
  }

  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }

  const telegramInitData = getTelegramInitData()
  if (telegramInitData && config.headers) {
    config.headers['X-Telegram-Init-Data'] = telegramInitData
  }

  // Add CSRF token for state-changing methods
  const method = config.method?.toUpperCase()
  if (method && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method) && config.headers) {
    config.headers[CSRF_HEADER_NAME] = ensureCsrfToken()
  }

  return config
})

// Response interceptor - handle 401 as fallback
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // Если получили 401 и ещё не пробовали refresh (на случай если проверка exp не сработала)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      const newToken = await tokenRefreshManager.refreshAccessToken()
      if (newToken) {
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`
        }
        return apiClient(originalRequest)
      } else {
        // Refresh не удался
        tokenStorage.clearTokens()
        safeRedirectToLogin()
      }
    }

    return Promise.reject(error)
  }
)

export default apiClient
