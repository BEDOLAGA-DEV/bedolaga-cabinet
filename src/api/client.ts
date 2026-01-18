import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { tokenStorage, isTokenExpired } from '../utils/token'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

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

// Флаг для предотвращения множественных refresh запросов
let isRefreshing = false
let refreshSubscribers: ((token: string) => void)[] = []

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb)
}

const onTokenRefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token))
  refreshSubscribers = []
}

const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = tokenStorage.getRefreshToken()
  if (!refreshToken) return null

  try {
    const response = await axios.post(`${API_BASE_URL}/cabinet/auth/refresh`, {
      refresh_token: refreshToken,
    })

    const { access_token } = response.data
    tokenStorage.setAccessToken(access_token)
    return access_token
  } catch {
    tokenStorage.clearTokens()
    window.location.href = '/login'
    return null
  }
}

// Request interceptor - add auth token with expiration check
apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  let token = tokenStorage.getAccessToken()

  // Проверяем срок действия токена перед запросом
  if (token && isTokenExpired(token)) {
    // Токен истёк или скоро истечёт - обновляем
    if (!isRefreshing) {
      isRefreshing = true
      const newToken = await refreshAccessToken()
      isRefreshing = false

      if (newToken) {
        token = newToken
        onTokenRefreshed(newToken)
      } else {
        return config
      }
    } else {
      // Другой запрос уже обновляет токен - ждём
      token = await new Promise<string>((resolve) => {
        subscribeTokenRefresh(resolve)
      })
    }
  }

  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }

  const telegramInitData = getTelegramInitData()
  if (telegramInitData && config.headers) {
    config.headers['X-Telegram-Init-Data'] = telegramInitData
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

      if (!isRefreshing) {
        isRefreshing = true
        const newToken = await refreshAccessToken()
        isRefreshing = false

        if (newToken) {
          onTokenRefreshed(newToken)
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`
          }
          return apiClient(originalRequest)
        }
      } else {
        // Ждём завершения refresh от другого запроса
        const token = await new Promise<string>((resolve) => {
          subscribeTokenRefresh(resolve)
        })
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${token}`
        }
        return apiClient(originalRequest)
      }
    }

    return Promise.reject(error)
  }
)

export default apiClient
