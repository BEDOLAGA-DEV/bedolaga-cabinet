import { useCallback, useSyncExternalStore } from 'react';
import { isInTelegramWebApp } from '@/hooks/useTelegramSDK';

export type PromoOs = 'ios' | 'android' | 'macos' | null;
/** @deprecated Use {@link PromoOs}. Kept for backwards compatibility. */
export type MobileOs = PromoOs;

const DISMISS_KEY = 'cabinet_mobile_app_banner_dismissed_at';
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// ---- Pure helpers (exported for tests) ---------------------------------

/**
 * @internal Exposed for unit tests. Detects the user's OS from a UA string and
 * the touch-points count, accounting for iPadOS 13+'s desktop-Safari UA quirk.
 */
export function detectPromoOs(userAgent: string | undefined, maxTouchPoints: number): PromoOs {
  if (!userAgent) return null;
  const ua = userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  // iPadOS 13+ reports a desktop macOS UA by default. Treat any "macintosh"
  // UA with multi-touch as iOS (iPad), otherwise as real macOS.
  if (/macintosh|mac os x/.test(ua)) {
    return maxTouchPoints > 1 ? 'ios' : 'macos';
  }
  return null;
}

/**
 * @internal Exposed for unit tests. Returns the raw env value only if it parses
 * as an `http(s)` URL. Anything else (empty, `javascript:`, malformed) becomes
 * `undefined` and a single console warning is emitted per invalid value.
 */
const _warnedUrls = new Set<string>();
export function sanitizeStoreUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return raw;
    }
  } catch {
    // Falls through to the warning below.
  }
  if (!_warnedUrls.has(raw)) {
    _warnedUrls.add(raw);
    console.warn(`[useMobileAppPromo] Ignoring unsafe store URL (must be http/https): ${raw}`);
  }
  return undefined;
}

/** @internal Exposed for tests. */
export function getStoreUrlFor(os: PromoOs): string | undefined {
  if (os === 'ios') return sanitizeStoreUrl(import.meta.env.VITE_APP_STORE_URL);
  if (os === 'android') return sanitizeStoreUrl(import.meta.env.VITE_PLAY_STORE_URL);
  if (os === 'macos') return sanitizeStoreUrl(import.meta.env.VITE_MAC_APP_STORE_URL);
  return undefined;
}

function readDismissedAt(): number {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return 0;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (window.matchMedia?.('(display-mode: standalone)').matches) return true;
  } catch {
    // matchMedia may throw on very old browsers
  }
  // iOS Safari sets navigator.standalone when launched from Home Screen
  const navStandalone = (navigator as Navigator & { standalone?: boolean }).standalone;
  return navStandalone === true;
}

// ---- Singleton dismiss store -------------------------------------------
// One source of truth for `dismissedAt`, shared by every hook instance and
// kept in sync with `localStorage` (this tab + cross-tab via `storage` event).

let _dismissedAt: number | null = null;
const _listeners = new Set<() => void>();

function getDismissedAtSnapshot(): number {
  if (_dismissedAt === null) {
    _dismissedAt = readDismissedAt();
  }
  return _dismissedAt;
}

function notify() {
  _listeners.forEach((fn) => fn());
}

function subscribeDismiss(fn: () => void): () => void {
  _listeners.add(fn);
  return () => {
    _listeners.delete(fn);
  };
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === DISMISS_KEY) {
      _dismissedAt = readDismissedAt();
      notify();
    }
  });
}

/** @internal Test-only: reset the singleton between cases. */
export function __resetMobileAppPromoStore(): void {
  _dismissedAt = null;
  _listeners.clear();
  _warnedUrls.clear();
}

// ---- Public hook -------------------------------------------------------

export interface MobileAppPromo {
  show: boolean;
  os: PromoOs;
  storeUrl: string | undefined;
  dismiss: () => void;
}

/**
 * Decides whether to show the "download our app" banner. Targets iOS, Android,
 * and macOS users when a matching store URL env var is configured. Hidden
 * inside the Telegram Mini App, in PWA standalone mode (iOS/Android only), and
 * when dismissed within the last 7 days. Store URLs come from
 * VITE_APP_STORE_URL (iOS), VITE_PLAY_STORE_URL (Android), and
 * VITE_MAC_APP_STORE_URL (macOS); non-http(s) values are rejected.
 *
 * All consumers share a single dismiss state via {@link useSyncExternalStore},
 * so dismissing the banner once updates every place that renders it.
 */
export function useMobileAppPromo(): MobileAppPromo {
  const dismissedAt = useSyncExternalStore(
    subscribeDismiss,
    getDismissedAtSnapshot,
    getDismissedAtSnapshot,
  );

  const os =
    typeof navigator !== 'undefined'
      ? detectPromoOs(navigator.userAgent, navigator.maxTouchPoints ?? 0)
      : null;
  const storeUrl = getStoreUrlFor(os);
  const inTelegram = isInTelegramWebApp();
  // PWA standalone semantics only apply to iOS/Android (where the cabinet may
  // be installed to the home screen). On macOS the user is in a regular Safari
  // tab promoting a Mac App Store app, which is unrelated to display-mode.
  const hidesWhenInstalled = os === 'ios' || os === 'android';
  const standalone = hidesWhenInstalled && isStandaloneDisplay();
  const recentlyDismissed = dismissedAt > 0 && Date.now() - dismissedAt < DISMISS_TTL_MS;

  const show = Boolean(os && storeUrl) && !inTelegram && !standalone && !recentlyDismissed;

  const dismiss = useCallback(() => {
    const now = Date.now();
    try {
      localStorage.setItem(DISMISS_KEY, String(now));
    } catch {
      // localStorage unavailable — banner will reappear next mount.
    }
    _dismissedAt = now;
    notify();
  }, []);

  return { show, os, storeUrl, dismiss };
}
