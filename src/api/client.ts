import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

const TELEGRAM_INIT_STORAGE_KEY = 'telegram_init_data'

const getTelegramInitData = (): string | null => {
  if (typeof window === 'undefined') return null

  const initData = window.Telegram?.WebApp?.initData
  if (initData) {
    try {
      localStorage.setItem(TELEGRAM_INIT_STORAGE_KEY, initData)
    } catch {
      /* ignore storage errors */
    }
    return initData
  }

  try {
    return localStorage.getItem(TELEGRAM_INIT_STORAGE_KEY)
  } catch {
    return null
  }
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - add auth token
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('access_token')
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }

  const telegramInitData = getTelegramInitData()
  if (telegramInitData && config.headers) {
    config.headers['X-Telegram-Init-Data'] = telegramInitData
  }
  return config
})

// Response interceptor - handle 401, refresh token
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/cabinet/auth/refresh`, {
            refresh_token: refreshToken,
          })

          const { access_token } = response.data
          localStorage.setItem('access_token', access_token)

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${access_token}`
          }

          return apiClient(originalRequest)
        } catch (refreshError) {
          // Refresh failed, clear tokens and redirect to login
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          localStorage.removeItem('user')
          window.location.href = '/login'
          return Promise.reject(refreshError)
        }
      }
    }

    return Promise.reject(error)
  }
)

export default apiClient

