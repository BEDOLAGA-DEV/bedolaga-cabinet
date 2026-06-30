export const STORAGE_KEYS = {
  THEME: 'cabinet-theme',
  ENABLED_THEMES: 'cabinet-enabled-themes',
  FAVORITE_SETTINGS: 'admin_favorite_settings',
  USER_THEME_PREFS: 'user_theme_preferences',
} as const;

// WebSocket
export const WS = {
  MAX_RECONNECT_ATTEMPTS: 5,
  PING_INTERVAL_MS: 25000,
  MAX_RECONNECT_DELAY_MS: 30000,
} as const;

// UI
export const UI = {
  RESEND_COOLDOWN_SEC: 60,
  TELEGRAM_HEADER_ANDROID_PX: 48,
  TELEGRAM_HEADER_IOS_PX: 45,
  MOBILE_HEADER_HEIGHT_PX: 64,
  DESKTOP_HEADER_HEIGHT_PX: 56,
} as const;

// API
export const API = {
  TIMEOUT_MS: 30000,
  BALANCE_STALE_TIME_MS: 30000,
  TRAFFIC_CACHE_MS: 30000,
  TRAFFIC_WARN_PERCENT: 70,
  TRAFFIC_CRITICAL_PERCENT: 90,
} as const;

// Backend liveness probe (ServiceUnavailableScreen detection/recovery).
export const HEALTH = {
  // Tolerant of cold mobile connections (radio wake + DNS + TLS + first byte). A hardcoded
  // 5s here used to falsely flag slow devices as "service unavailable" while the real 30s
  // API requests would have succeeded.
  PROBE_TIMEOUT_MS: 12000,
  // Re-probe before declaring the backend down so a single cold-connection blip can't blank
  // the app. Total worst case to show the screen on a genuine outage stays under the API timeout.
  CONFIRM_RETRIES: 1,
  CONFIRM_RETRY_DELAY_MS: 1500,
  // Recovery poll while the screen is shown — quick feedback once the backend answers again.
  RECOVERY_POLL_INTERVAL_MS: 5000,
} as const;
