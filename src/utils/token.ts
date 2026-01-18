/**
 * Утилиты для безопасной работы с JWT токенами
 */

import axios from 'axios'

const TOKEN_KEYS = {
  ACCESS: 'access_token',
  REFRESH: 'refresh_token',
  USER: 'user',
  TELEGRAM_INIT: 'telegram_init_data',
} as const

interface JWTPayload {
  exp?: number
  iat?: number
  sub?: string
  [key: string]: unknown
}

/**
 * Декодирует JWT токен без верификации подписи
 * Используется только для чтения payload на клиенте
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const payload = parts[1]
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

/**
 * Проверяет, истёк ли срок действия токена
 * @param token JWT токен
 * @param bufferSeconds Буфер в секундах до истечения (по умолчанию 30 сек)
 */
export function isTokenExpired(token: string | null, bufferSeconds = 30): boolean {
  if (!token) return true

  const payload = decodeJWT(token)
  if (!payload?.exp) return true

  const now = Math.floor(Date.now() / 1000)
  return payload.exp <= now + bufferSeconds
}

/**
 * Проверяет, валиден ли токен (не истёк и корректный формат)
 */
export function isTokenValid(token: string | null): boolean {
  if (!token) return false
  return !isTokenExpired(token)
}

/**
 * Безопасное хранилище токенов
 * Использует sessionStorage вместо localStorage для защиты от XSS
 * Токены не сохраняются между сессиями браузера
 */
export const tokenStorage = {
  getAccessToken(): string | null {
    try {
      return sessionStorage.getItem(TOKEN_KEYS.ACCESS)
    } catch {
      return null
    }
  },

  getRefreshToken(): string | null {
    try {
      return sessionStorage.getItem(TOKEN_KEYS.REFRESH)
    } catch {
      return null
    }
  },

  setTokens(accessToken: string, refreshToken: string): void {
    try {
      sessionStorage.setItem(TOKEN_KEYS.ACCESS, accessToken)
      sessionStorage.setItem(TOKEN_KEYS.REFRESH, refreshToken)
    } catch {
      console.error('Failed to save tokens to sessionStorage')
    }
  },

  setAccessToken(accessToken: string): void {
    try {
      sessionStorage.setItem(TOKEN_KEYS.ACCESS, accessToken)
    } catch {
      console.error('Failed to save access token to sessionStorage')
    }
  },

  clearTokens(): void {
    try {
      sessionStorage.removeItem(TOKEN_KEYS.ACCESS)
      sessionStorage.removeItem(TOKEN_KEYS.REFRESH)
      sessionStorage.removeItem(TOKEN_KEYS.USER)
      // Также очищаем localStorage для миграции со старой версии
      localStorage.removeItem(TOKEN_KEYS.ACCESS)
      localStorage.removeItem(TOKEN_KEYS.REFRESH)
      localStorage.removeItem(TOKEN_KEYS.USER)
    } catch {
      // ignore
    }
  },

  /**
   * Миграция токенов из localStorage в sessionStorage
   * Вызывается при инициализации для обратной совместимости
   */
  migrateFromLocalStorage(): void {
    try {
      const accessToken = localStorage.getItem(TOKEN_KEYS.ACCESS)
      const refreshToken = localStorage.getItem(TOKEN_KEYS.REFRESH)

      if (accessToken && !sessionStorage.getItem(TOKEN_KEYS.ACCESS)) {
        sessionStorage.setItem(TOKEN_KEYS.ACCESS, accessToken)
      }
      if (refreshToken && !sessionStorage.getItem(TOKEN_KEYS.REFRESH)) {
        sessionStorage.setItem(TOKEN_KEYS.REFRESH, refreshToken)
      }

      // Удаляем из localStorage после миграции
      localStorage.removeItem(TOKEN_KEYS.ACCESS)
      localStorage.removeItem(TOKEN_KEYS.REFRESH)
    } catch {
      // ignore
    }
  },

  getTelegramInitData(): string | null {
    try {
      return sessionStorage.getItem(TOKEN_KEYS.TELEGRAM_INIT)
    } catch {
      return null
    }
  },

  setTelegramInitData(data: string): void {
    try {
      sessionStorage.setItem(TOKEN_KEYS.TELEGRAM_INIT, data)
    } catch {
      // ignore
    }
  },
}

/**
 * Централизованный менеджер обновления токенов
 * Предотвращает множественные параллельные refresh запросы
 */
class TokenRefreshManager {
  private isRefreshing = false
  private refreshPromise: Promise<string | null> | null = null
  private subscribers: ((token: string | null) => void)[] = []
  private refreshEndpoint = '/api/cabinet/auth/refresh'

  setRefreshEndpoint(endpoint: string): void {
    this.refreshEndpoint = endpoint
  }

  /**
   * Обновляет access token используя refresh token
   * При множественных вызовах возвращает один и тот же Promise
   */
  async refreshAccessToken(): Promise<string | null> {
    // Если уже идёт refresh - возвращаем существующий Promise
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise
    }

    const refreshToken = tokenStorage.getRefreshToken()
    if (!refreshToken) {
      return null
    }

    this.isRefreshing = true
    this.refreshPromise = this.doRefresh(refreshToken)

    try {
      const result = await this.refreshPromise
      this.notifySubscribers(result)
      return result
    } finally {
      this.isRefreshing = false
      this.refreshPromise = null
    }
  }

  private async doRefresh(refreshToken: string): Promise<string | null> {
    try {
      // Используем чистый axios (не apiClient) чтобы избежать циклической зависимости
      const response = await axios.post<{ access_token?: string }>(
        this.refreshEndpoint,
        { refresh_token: refreshToken },
        { headers: { 'Content-Type': 'application/json' } }
      )

      const newAccessToken = response.data.access_token

      if (newAccessToken) {
        tokenStorage.setAccessToken(newAccessToken)
        return newAccessToken
      }

      return null
    } catch {
      // Token refresh failed - don't log sensitive error details
      return null
    }
  }

  /**
   * Подписка на результат refresh (для ожидающих запросов)
   */
  subscribe(callback: (token: string | null) => void): () => void {
    this.subscribers.push(callback)
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback)
    }
  }

  private notifySubscribers(token: string | null): void {
    this.subscribers.forEach((cb) => cb(token))
    this.subscribers = []
  }

  /**
   * Проверяет, идёт ли сейчас refresh
   */
  get isRefreshInProgress(): boolean {
    return this.isRefreshing
  }

  /**
   * Ожидает завершения текущего refresh (если есть)
   */
  async waitForRefresh(): Promise<string | null> {
    if (this.refreshPromise) {
      return this.refreshPromise
    }
    return tokenStorage.getAccessToken()
  }
}

export const tokenRefreshManager = new TokenRefreshManager()

/**
 * Ключ для сохранения URL для возврата после логина
 */
const RETURN_URL_KEY = 'auth_return_url'

/**
 * Сохраняет URL для возврата после авторизации
 */
export function saveReturnUrl(): void {
  if (typeof window !== 'undefined') {
    const currentPath = window.location.pathname + window.location.search
    // Не сохраняем /login как return URL
    if (currentPath && currentPath !== '/login') {
      sessionStorage.setItem(RETURN_URL_KEY, currentPath)
    }
  }
}

/**
 * Получает и очищает сохранённый URL для возврата
 */
export function getAndClearReturnUrl(): string | null {
  if (typeof window !== 'undefined') {
    const url = sessionStorage.getItem(RETURN_URL_KEY)
    sessionStorage.removeItem(RETURN_URL_KEY)
    return url
  }
  return null
}

/**
 * Безопасный редирект на страницу логина
 * Валидирует URL чтобы предотвратить open redirect уязвимость
 * Сохраняет текущий URL для возврата после авторизации
 */
export function safeRedirectToLogin(): void {
  // Разрешённые пути для редиректа (относительные пути нашего приложения)
  const loginPath = '/login'

  // Проверяем, что мы на том же origin
  if (typeof window !== 'undefined') {
    // Сохраняем текущий URL для возврата после логина
    saveReturnUrl()
    // Используем только относительный путь для безопасности
    window.location.href = loginPath
  }
}

/**
 * Валидирует URL для редиректа
 * Возвращает true только для безопасных URL (относительные пути или тот же origin)
 */
export function isValidRedirectUrl(url: string): boolean {
  // Пустой URL - небезопасен
  if (!url) return false

  // Относительные пути всегда безопасны
  if (url.startsWith('/') && !url.startsWith('//')) {
    return true
  }

  try {
    const parsed = new URL(url, window.location.origin)
    // Разрешаем только тот же origin
    return parsed.origin === window.location.origin
  } catch {
    return false
  }
}
