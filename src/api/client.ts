import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { retrieveRawInitData } from '@telegram-apps/sdk-react';
import {
  tokenStorage,
  isTokenExpired,
  tokenRefreshManager,
  safeRedirectToLogin,
} from '../utils/token';
import { useBlockingStore } from '../store/blocking';
import { reportPossibleBackendDown, markBackendReached } from './health';
import { API } from '../config/constants';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

tokenRefreshManager.setRefreshEndpoint(`${API_BASE_URL}/cabinet/auth/refresh`);

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'X-CSRF-Token';

function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(^| )${CSRF_COOKIE_NAME}=([^;]+)`));
  return match ? match[2] : null;
}

function generateCsrfToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function ensureCsrfToken(): string {
  let token = getCsrfToken();
  if (!token) {
    token = generateCsrfToken();
    document.cookie = `${CSRF_COOKIE_NAME}=${token}; path=/; SameSite=Strict; Secure`;
  }
  return token;
}

const getTelegramInitData = (): string | null => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = retrieveRawInitData();
    if (raw) {
      tokenStorage.setTelegramInitData(raw);
      return raw;
    }
  } catch {}

  return tokenStorage.getTelegramInitData();
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API.TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

const AUTH_ENDPOINTS = [
  '/cabinet/auth/telegram',
  '/cabinet/auth/telegram/widget',
  '/cabinet/auth/email/login',
  '/cabinet/auth/email/register/standalone',
  '/cabinet/auth/email/verify',
  '/cabinet/auth/refresh',
  '/cabinet/auth/password/forgot',
  '/cabinet/auth/password/reset',
  '/cabinet/auth/oauth/',
  '/cabinet/auth/merge/',
  '/cabinet/auth/account/link/server-complete',
  '/cabinet/auth/deeplink/',
  '/cabinet/auth/login/auto',
  '/cabinet/landing/',
];

function isAuthEndpoint(url: string | undefined): boolean {
  if (!url) return false;
  return AUTH_ENDPOINTS.some((endpoint) => url.startsWith(endpoint));
}

apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  // Let axios set the correct multipart/form-data header with boundary for FormData
  if (config.data instanceof FormData && config.headers) {
    delete config.headers['Content-Type'];
  }

  if (!isAuthEndpoint(config.url)) {
    let token = tokenStorage.getAccessToken();

    if (token && isTokenExpired(token)) {
      const newToken = await tokenRefreshManager.refreshAccessToken();
      if (newToken) {
        token = newToken;
      } else if (tokenRefreshManager.lastFailureWasTransport) {
        // Backend unreachable (not a rejected token): keep the session intact so
        // the ServiceUnavailableScreen can auto-recover once the backend returns,
        // instead of wiping tokens and stranding the user on /login. Let the
        // request go out with the stale token; it will fail and be handled.
        return config;
      } else {
        tokenStorage.clearTokens();
        safeRedirectToLogin();
        return config;
      }
    } else if (!token && tokenStorage.getRefreshToken()) {
      const newToken = await tokenRefreshManager.refreshAccessToken();
      if (newToken) {
        token = newToken;
      }
    }

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  const isTelegramAuthEndpoint =
    config.url?.startsWith('/cabinet/auth/telegram') ||
    config.url?.startsWith('/cabinet/auth/account/link/telegram');
  if (isTelegramAuthEndpoint) {
    const telegramInitData = getTelegramInitData();
    if (telegramInitData && config.headers) {
      config.headers['X-Telegram-Init-Data'] = telegramInitData;
    }
  }

  const method = config.method?.toUpperCase();
  if (method && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method) && config.headers) {
    config.headers[CSRF_HEADER_NAME] = ensureCsrfToken();
  }

  return config;
});

export interface MaintenanceError {
  code: 'maintenance';
  message: string;
  reason?: string;
}

export interface ChannelSubscriptionError {
  code: 'channel_subscription_required';
  message: string;
  channel_link?: string;
  channels?: Array<{
    channel_id: string;
    channel_link?: string;
    title?: string;
    is_subscribed: boolean;
  }>;
}

export interface BlacklistedError {
  code: 'blacklisted';
  message: string;
}

export interface AccountDeletedError {
  code: 'account_deleted';
  message: string;
  bot_username?: string;
  telegram_deep_link?: string;
}

export function isMaintenanceError(
  error: unknown,
): error is { response: { status: 503; data: { detail: MaintenanceError } } } {
  if (!error || typeof error !== 'object') return false;
  const err = error as AxiosError<{ detail: MaintenanceError }>;
  return err.response?.status === 503 && err.response?.data?.detail?.code === 'maintenance';
}

export function isChannelSubscriptionError(
  error: unknown,
): error is { response: { status: 403; data: { detail: ChannelSubscriptionError } } } {
  if (!error || typeof error !== 'object') return false;
  const err = error as AxiosError<{ detail: ChannelSubscriptionError }>;
  return (
    err.response?.status === 403 &&
    err.response?.data?.detail?.code === 'channel_subscription_required'
  );
}

export function isBlacklistedError(
  error: unknown,
): error is { response: { status: 403; data: { detail: BlacklistedError } } } {
  if (!error || typeof error !== 'object') return false;
  const err = error as AxiosError<{ detail: BlacklistedError }>;
  return err.response?.status === 403 && err.response?.data?.detail?.code === 'blacklisted';
}

export function isAccountDeletedError(
  error: unknown,
): error is { response: { status: 403; data: { detail: AccountDeletedError } } } {
  if (!error || typeof error !== 'object') return false;
  const err = error as AxiosError<{ detail: AccountDeletedError }>;
  return err.response?.status === 403 && err.response?.data?.detail?.code === 'account_deleted';
}

apiClient.interceptors.response.use(
  (response) => {
    // First successful response means the app reached the backend at least once
    // (it bootstrapped). Recovery from a later outage can then just lift the
    // overlay instead of hard-reloading and losing unsaved UI state.
    markBackendReached();
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Transport-level failure: no HTTP response at all (backend unreachable, DNS
    // failure, connection refused, timeout). All the coded guards below need
    // `error.response`, so this case had zero handling and produced a blank
    // screen during bootstrap. Confirm the outage with a liveness probe (so a
    // one-off blip doesn't blank an already-loaded app) and, if confirmed, flip
    // the full-screen ServiceUnavailableScreen. Fire-and-forget — the original
    // request still rejects now. Axios cancellations are not outages.
    if (!error.response && error.code !== 'ERR_CANCELED') {
      void reportPossibleBackendDown();
      return Promise.reject(error);
    }

    if (isMaintenanceError(error)) {
      const detail = (error.response?.data as { detail: MaintenanceError }).detail;
      useBlockingStore.getState().setMaintenance({
        message: detail.message,
        reason: detail.reason,
      });
      return Promise.reject(error);
    }

    if (isChannelSubscriptionError(error)) {
      const detail = (error.response?.data as { detail: ChannelSubscriptionError }).detail;
      useBlockingStore.getState().setChannelSubscription({
        message: detail.message,
        channel_link: detail.channel_link,
        channels: detail.channels,
      });
      return Promise.reject(error);
    }

    if (isBlacklistedError(error)) {
      const detail = (error.response?.data as { detail: BlacklistedError }).detail;
      useBlockingStore.getState().setBlacklisted({
        message: detail.message,
      });
      return Promise.reject(error);
    }

    if (isAccountDeletedError(error)) {
      const detail = (error.response?.data as { detail: AccountDeletedError }).detail;
      // Surface the deleted-account screen. The auth flow (initData login)
      // is allowed to auto-revive; this branch is for token-bearing
      // sessions where the user is already in the cabinet but their row
      // got marked DELETED out-of-band, and for password-only logins
      // that can't be silently revived.
      useBlockingStore.getState().setAccountDeleted({
        message: detail.message,
        bot_username: detail.bot_username,
        telegram_deep_link: detail.telegram_deep_link,
      });
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      const requestUrl = originalRequest.url || '';

      if (isAuthEndpoint(requestUrl)) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      const newToken = await tokenRefreshManager.refreshAccessToken();
      if (newToken) {
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        return apiClient(originalRequest);
      } else if (tokenRefreshManager.lastFailureWasTransport) {
        // Backend died between the 401 and the refresh: keep the session so the
        // ServiceUnavailableScreen can recover, rather than logging the user out.
      } else {
        tokenStorage.clearTokens();
        safeRedirectToLogin();
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
