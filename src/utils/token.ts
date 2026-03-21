import axios from 'axios';

const TOKEN_KEYS = {
  ACCESS: 'access_token',
  REFRESH: 'refresh_token',
  USER: 'user',
  TELEGRAM_INIT: 'telegram_init_data',
} as const;

interface JWTPayload {
  exp?: number;
  iat?: number;
  sub?: string;
  [key: string]: unknown;
}

export function decodeJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string | null, bufferSeconds = 30): boolean {
  if (!token) return true;

  const payload = decodeJWT(token);
  if (!payload?.exp) return true;

  const now = Math.floor(Date.now() / 1000);
  return payload.exp <= now + bufferSeconds;
}

export function isTokenValid(token: string | null): boolean {
  if (!token) return false;
  return !isTokenExpired(token);
}

export const tokenStorage = {
  getAccessToken(): string | null {
    try {
      return sessionStorage.getItem(TOKEN_KEYS.ACCESS);
    } catch {
      return null;
    }
  },

  getRefreshToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEYS.REFRESH) || sessionStorage.getItem(TOKEN_KEYS.REFRESH);
    } catch {
      return null;
    }
  },

  setTokens(accessToken: string, refreshToken: string): void {
    try {
      sessionStorage.setItem(TOKEN_KEYS.ACCESS, accessToken);
      localStorage.setItem(TOKEN_KEYS.REFRESH, refreshToken);
      sessionStorage.removeItem(TOKEN_KEYS.REFRESH);
    } catch {}
  },

  setAccessToken(accessToken: string): void {
    try {
      sessionStorage.setItem(TOKEN_KEYS.ACCESS, accessToken);
    } catch {
      console.error('Failed to save access token to sessionStorage');
    }
  },

  clearTokens(): void {
    try {
      sessionStorage.removeItem(TOKEN_KEYS.ACCESS);
      sessionStorage.removeItem(TOKEN_KEYS.REFRESH);
      sessionStorage.removeItem(TOKEN_KEYS.USER);
      localStorage.removeItem(TOKEN_KEYS.ACCESS);
      localStorage.removeItem(TOKEN_KEYS.REFRESH);
      localStorage.removeItem(TOKEN_KEYS.USER);
    } catch {}
  },

  migrateFromLocalStorage(): void {
    try {
      const accessToken = localStorage.getItem(TOKEN_KEYS.ACCESS);
      if (accessToken && !sessionStorage.getItem(TOKEN_KEYS.ACCESS)) {
        sessionStorage.setItem(TOKEN_KEYS.ACCESS, accessToken);
      }
      localStorage.removeItem(TOKEN_KEYS.ACCESS);

      const refreshInSession = sessionStorage.getItem(TOKEN_KEYS.REFRESH);
      if (refreshInSession && !localStorage.getItem(TOKEN_KEYS.REFRESH)) {
        localStorage.setItem(TOKEN_KEYS.REFRESH, refreshInSession);
      }
      sessionStorage.removeItem(TOKEN_KEYS.REFRESH);
    } catch {}
  },

  getTelegramInitData(): string | null {
    try {
      return sessionStorage.getItem(TOKEN_KEYS.TELEGRAM_INIT);
    } catch {
      return null;
    }
  },

  setTelegramInitData(data: string): void {
    try {
      sessionStorage.setItem(TOKEN_KEYS.TELEGRAM_INIT, data);
    } catch {}
  },
};

function extractTelegramUserId(initData: string): string | null {
  try {
    const params = new URLSearchParams(initData);
    const userJson = params.get('user');
    if (!userJson) return null;
    const user = JSON.parse(userJson);
    return user.id != null ? String(user.id) : null;
  } catch {
    return null;
  }
}

const TG_USER_ID_KEY = 'tg_user_id';

export function clearStaleSessionIfNeeded(freshInitData: string | null): void {
  if (!freshInitData) return;

  try {
    const currentTgUserId = extractTelegramUserId(freshInitData);
    const storedTgUserId = localStorage.getItem(TG_USER_ID_KEY);

    if (storedTgUserId && currentTgUserId && storedTgUserId !== currentTgUserId) {
      sessionStorage.removeItem(TOKEN_KEYS.ACCESS);
      sessionStorage.removeItem(TOKEN_KEYS.REFRESH);
      sessionStorage.removeItem(TOKEN_KEYS.USER);
      localStorage.removeItem(TOKEN_KEYS.REFRESH);
      localStorage.removeItem('cabinet-auth');
    }

    if (currentTgUserId) {
      localStorage.setItem(TG_USER_ID_KEY, currentTgUserId);
    }

    sessionStorage.setItem(TOKEN_KEYS.TELEGRAM_INIT, freshInitData);
    localStorage.removeItem(TOKEN_KEYS.TELEGRAM_INIT);
  } catch {}
}

class TokenRefreshManager {
  private isRefreshing = false;
  private refreshPromise: Promise<string | null> | null = null;
  private subscribers: ((token: string | null) => void)[] = [];
  private refreshEndpoint = '/api/cabinet/auth/refresh';

  setRefreshEndpoint(endpoint: string): void {
    this.refreshEndpoint = endpoint;
  }

  async refreshAccessToken(): Promise<string | null> {
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) {
      return null;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.doRefresh(refreshToken);

    try {
      const result = await this.refreshPromise;
      this.notifySubscribers(result);
      return result;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  // Uses plain axios (not apiClient) to avoid circular dependency
  private async doRefresh(refreshToken: string): Promise<string | null> {
    try {
      const response = await axios.post<{ access_token?: string }>(
        this.refreshEndpoint,
        { refresh_token: refreshToken },
        { headers: { 'Content-Type': 'application/json' } },
      );

      const newAccessToken = response.data.access_token;

      if (newAccessToken) {
        tokenStorage.setAccessToken(newAccessToken);
        return newAccessToken;
      }

      return null;
    } catch {
      return null;
    }
  }

  subscribe(callback: (token: string | null) => void): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
    };
  }

  private notifySubscribers(token: string | null): void {
    this.subscribers.forEach((cb) => cb(token));
    this.subscribers = [];
  }

  get isRefreshInProgress(): boolean {
    return this.isRefreshing;
  }

  async waitForRefresh(): Promise<string | null> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }
    return tokenStorage.getAccessToken();
  }
}

export const tokenRefreshManager = new TokenRefreshManager();

const RETURN_URL_KEY = 'auth_return_url';

export function saveReturnUrl(): void {
  if (typeof window !== 'undefined') {
    const currentPath = window.location.pathname + window.location.search;
    if (currentPath && currentPath !== '/login') {
      sessionStorage.setItem(RETURN_URL_KEY, currentPath);
    }
  }
}

export function getAndClearReturnUrl(): string | null {
  if (typeof window !== 'undefined') {
    const url = sessionStorage.getItem(RETURN_URL_KEY);
    sessionStorage.removeItem(RETURN_URL_KEY);
    return url;
  }
  return null;
}

export function safeRedirectToLogin(): void {
  if (typeof window !== 'undefined') {
    // Guard: don't redirect if already on /login to prevent infinite reload loops
    if (window.location.pathname === '/login') return;
    saveReturnUrl();
    window.location.href = '/login';
  }
}

export function isValidRedirectUrl(url: string): boolean {
  if (!url) return false;

  if (url.startsWith('/') && !url.startsWith('//')) {
    return true;
  }

  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.origin === window.location.origin;
  } catch {
    return false;
  }
}
