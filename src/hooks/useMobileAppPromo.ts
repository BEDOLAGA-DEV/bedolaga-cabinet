import { useCallback, useEffect, useState } from 'react';
import { isInTelegramWebApp } from '@/hooks/useTelegramSDK';

export type PromoOs = 'ios' | 'android' | 'macos' | null;
/** @deprecated Use {@link PromoOs}. Kept for backwards compatibility. */
export type MobileOs = PromoOs;

const DISMISS_KEY = 'cabinet_mobile_app_banner_dismissed_at';
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DISMISS_EVENT = 'cabinet:mobile-app-banner-dismissed';

function detectPromoOs(): PromoOs {
  if (typeof navigator === 'undefined' || !navigator.userAgent) return null;
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  // iPadOS 13+ reports a desktop macOS UA by default. Treat any "macintosh"
  // UA with multi-touch as iOS (iPad), otherwise as real macOS.
  if (/macintosh|mac os x/.test(ua)) {
    const hasTouch = (navigator.maxTouchPoints ?? 0) > 1;
    return hasTouch ? 'ios' : 'macos';
  }
  return null;
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

function getStoreUrlFor(os: PromoOs): string | undefined {
  if (os === 'ios') return import.meta.env.VITE_APP_STORE_URL || undefined;
  if (os === 'android') return import.meta.env.VITE_PLAY_STORE_URL || undefined;
  if (os === 'macos') return import.meta.env.VITE_MAC_APP_STORE_URL || undefined;
  return undefined;
}

export interface MobileAppPromo {
  show: boolean;
  os: PromoOs;
  storeUrl: string | undefined;
  dismiss: () => void;
}

/**
 * Decides whether to show the "download our app" banner. Targets iOS, Android,
 * and macOS users when a matching store URL env var is configured. Hidden
 * inside the Telegram Mini App, in PWA standalone mode, and when dismissed
 * within the last 7 days. Store URLs come from VITE_APP_STORE_URL (iOS),
 * VITE_PLAY_STORE_URL (Android), and VITE_MAC_APP_STORE_URL (macOS).
 */
export function useMobileAppPromo(): MobileAppPromo {
  const [dismissedAt, setDismissedAt] = useState<number>(() => readDismissedAt());

  // Keep state in sync if another tab — or another consumer of this hook in
  // the same tab — dismisses the banner.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === DISMISS_KEY) {
        setDismissedAt(readDismissedAt());
      }
    };
    const onInAppDismiss = () => setDismissedAt(readDismissedAt());
    window.addEventListener('storage', onStorage);
    window.addEventListener(DISMISS_EVENT, onInAppDismiss);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(DISMISS_EVENT, onInAppDismiss);
    };
  }, []);

  const os = detectPromoOs();
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
    setDismissedAt(now);
    try {
      window.dispatchEvent(new Event(DISMISS_EVENT));
    } catch {
      // Event constructor unavailable (very old browsers) — local update still applies.
    }
  }, []);

  return { show, os, storeUrl, dismiss };
}
