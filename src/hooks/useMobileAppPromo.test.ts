/* eslint-disable no-script-url -- test fixtures intentionally include unsafe URLs to verify the sanitizer rejects them */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import {
  detectPromoOs,
  sanitizeStoreUrl,
  getStoreUrlFor,
  useMobileAppPromo,
  __resetMobileAppPromoStore,
} from './useMobileAppPromo';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/hooks/useTelegramSDK', () => ({
  isInTelegramWebApp: vi.fn(() => false),
}));

import { isInTelegramWebApp } from '@/hooks/useTelegramSDK';

const UA = {
  IPHONE:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  IPAD_LEGACY:
    'Mozilla/5.0 (iPad; CPU OS 12_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1.2 Mobile/15E148 Safari/604.1',
  IPAD_PRETENDS_MAC:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  MAC_DESKTOP:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  ANDROID_CHROME:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  WINDOWS_CHROME:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
} as const;

// Stubbed env values (overridable per test via `setEnv`).
let envOverrides: Record<string, string | undefined> = {};

vi.stubGlobal('import', { meta: { env: {} } });

beforeEach(() => {
  __resetMobileAppPromoStore();
  localStorage.clear();
  envOverrides = {};
  vi.stubEnv('VITE_APP_STORE_URL', '');
  vi.stubEnv('VITE_PLAY_STORE_URL', '');
  vi.stubEnv('VITE_MAC_APP_STORE_URL', '');
  vi.mocked(isInTelegramWebApp).mockReturnValue(false);
  // Default to "no touch" so Mac UA stays Mac.
  setNavigator(UA.MAC_DESKTOP, 0, false);
  // Reset matchMedia so a previous test's `setStandaloneDisplay(true)` does
  // not leak into later cases.
  setStandaloneDisplay(false);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function setEnv(
  key: 'VITE_APP_STORE_URL' | 'VITE_PLAY_STORE_URL' | 'VITE_MAC_APP_STORE_URL',
  value: string,
) {
  envOverrides[key] = value;
  vi.stubEnv(key, value);
}

function setNavigator(userAgent: string, maxTouchPoints = 0, standalone = false) {
  Object.defineProperty(window.navigator, 'userAgent', {
    configurable: true,
    get: () => userAgent,
  });
  Object.defineProperty(window.navigator, 'maxTouchPoints', {
    configurable: true,
    get: () => maxTouchPoints,
  });
  Object.defineProperty(window.navigator, 'standalone', {
    configurable: true,
    get: () => standalone,
  });
}

function setStandaloneDisplay(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: query === '(display-mode: standalone)' ? matches : false,
      media: query,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
      onchange: null,
    }),
  });
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

describe('detectPromoOs', () => {
  it('returns null for empty UA', () => {
    expect(detectPromoOs(undefined, 0)).toBeNull();
    expect(detectPromoOs('', 0)).toBeNull();
  });

  it('detects iPhone as ios', () => {
    expect(detectPromoOs(UA.IPHONE, 5)).toBe('ios');
  });

  it('detects legacy iPad UA as ios', () => {
    expect(detectPromoOs(UA.IPAD_LEGACY, 5)).toBe('ios');
  });

  it('detects iPadOS 13+ pretending to be Mac as ios via touch points', () => {
    expect(detectPromoOs(UA.IPAD_PRETENDS_MAC, 5)).toBe('ios');
  });

  it('detects real Mac (no touch) as macos', () => {
    expect(detectPromoOs(UA.MAC_DESKTOP, 0)).toBe('macos');
  });

  it('detects Android as android', () => {
    expect(detectPromoOs(UA.ANDROID_CHROME, 5)).toBe('android');
  });

  it('returns null for desktop Windows / Linux', () => {
    expect(detectPromoOs(UA.WINDOWS_CHROME, 0)).toBeNull();
  });

  it('prefers ios when both iPhone and Macintosh appear (iPhone UA wins first)', () => {
    expect(detectPromoOs(UA.IPHONE, 5)).toBe('ios');
  });
});

// ---------------------------------------------------------------------------
// URL sanitizer (M-SEC1)
// ---------------------------------------------------------------------------

describe('sanitizeStoreUrl', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('returns undefined for empty / null / undefined values', () => {
    expect(sanitizeStoreUrl(undefined)).toBeUndefined();
    expect(sanitizeStoreUrl('')).toBeUndefined();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('accepts https URLs', () => {
    expect(sanitizeStoreUrl('https://apps.apple.com/app/id123')).toBe(
      'https://apps.apple.com/app/id123',
    );
  });

  it('accepts http URLs (for dev)', () => {
    expect(sanitizeStoreUrl('http://localhost:3000/app')).toBe('http://localhost:3000/app');
  });

  it('rejects javascript: URLs and warns', () => {
    expect(sanitizeStoreUrl('javascript:alert(1)')).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy.mock.calls[0]?.[0]).toContain('Ignoring unsafe store URL');
  });

  it('rejects data: URLs', () => {
    expect(sanitizeStoreUrl('data:text/html,<script>alert(1)</script>')).toBeUndefined();
  });

  it('rejects malformed URLs', () => {
    expect(sanitizeStoreUrl('not a url')).toBeUndefined();
  });

  it('only warns once per invalid URL value (idempotent within a session)', () => {
    sanitizeStoreUrl('javascript:1');
    sanitizeStoreUrl('javascript:1');
    sanitizeStoreUrl('javascript:1');
    expect(warnSpy).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// getStoreUrlFor (reads env via sanitizer)
// ---------------------------------------------------------------------------

describe('getStoreUrlFor', () => {
  it('returns the iOS env value when os=ios', () => {
    setEnv('VITE_APP_STORE_URL', 'https://apps.apple.com/app/id1');
    expect(getStoreUrlFor('ios')).toBe('https://apps.apple.com/app/id1');
  });

  it('returns the Android env value when os=android', () => {
    setEnv('VITE_PLAY_STORE_URL', 'https://play.google.com/store/apps/details?id=x');
    expect(getStoreUrlFor('android')).toBe('https://play.google.com/store/apps/details?id=x');
  });

  it('returns the macOS env value when os=macos', () => {
    setEnv('VITE_MAC_APP_STORE_URL', 'https://apps.apple.com/app/id2');
    expect(getStoreUrlFor('macos')).toBe('https://apps.apple.com/app/id2');
  });

  it('returns undefined when env is empty', () => {
    expect(getStoreUrlFor('ios')).toBeUndefined();
    expect(getStoreUrlFor('android')).toBeUndefined();
    expect(getStoreUrlFor('macos')).toBeUndefined();
  });

  it('returns undefined for null os', () => {
    expect(getStoreUrlFor(null)).toBeUndefined();
  });

  it('returns undefined when env contains an unsafe scheme', () => {
    setEnv('VITE_APP_STORE_URL', 'javascript:alert(1)');
    expect(getStoreUrlFor('ios')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// useMobileAppPromo (the hook)
// ---------------------------------------------------------------------------

describe('useMobileAppPromo', () => {
  it('shows the banner for iOS users with a configured App Store URL', () => {
    setEnv('VITE_APP_STORE_URL', 'https://apps.apple.com/app/id1');
    setNavigator(UA.IPHONE, 5);

    const { result } = renderHook(() => useMobileAppPromo());

    expect(result.current.show).toBe(true);
    expect(result.current.os).toBe('ios');
    expect(result.current.storeUrl).toBe('https://apps.apple.com/app/id1');
  });

  it('shows the banner for Android users with a Play Store URL', () => {
    setEnv('VITE_PLAY_STORE_URL', 'https://play.google.com/store/apps/details?id=x');
    setNavigator(UA.ANDROID_CHROME, 5);

    const { result } = renderHook(() => useMobileAppPromo());

    expect(result.current.show).toBe(true);
    expect(result.current.os).toBe('android');
  });

  it('shows the banner for macOS users with a Mac App Store URL', () => {
    setEnv('VITE_MAC_APP_STORE_URL', 'https://apps.apple.com/app/id2');
    setNavigator(UA.MAC_DESKTOP, 0);

    const { result } = renderHook(() => useMobileAppPromo());

    expect(result.current.show).toBe(true);
    expect(result.current.os).toBe('macos');
  });

  it('hides the banner on desktop Windows even with all URLs set', () => {
    setEnv('VITE_APP_STORE_URL', 'https://apps.apple.com/app/id1');
    setEnv('VITE_PLAY_STORE_URL', 'https://play.google.com/store/apps/details?id=x');
    setNavigator(UA.WINDOWS_CHROME, 0);

    const { result } = renderHook(() => useMobileAppPromo());

    expect(result.current.show).toBe(false);
    expect(result.current.os).toBeNull();
  });

  it('hides the banner inside the Telegram WebApp', () => {
    setEnv('VITE_APP_STORE_URL', 'https://apps.apple.com/app/id1');
    setNavigator(UA.IPHONE, 5);
    vi.mocked(isInTelegramWebApp).mockReturnValue(true);

    const { result } = renderHook(() => useMobileAppPromo());

    expect(result.current.show).toBe(false);
  });

  it('hides the banner for iOS in PWA standalone mode', () => {
    setEnv('VITE_APP_STORE_URL', 'https://apps.apple.com/app/id1');
    setNavigator(UA.IPHONE, 5, /* standalone */ true);

    const { result } = renderHook(() => useMobileAppPromo());

    expect(result.current.show).toBe(false);
  });

  it('does NOT use standalone detection for macOS (display-mode is irrelevant there)', () => {
    setEnv('VITE_MAC_APP_STORE_URL', 'https://apps.apple.com/app/id2');
    setNavigator(UA.MAC_DESKTOP, 0);
    setStandaloneDisplay(true); // Pretend matchMedia says standalone — should not matter on macOS.

    const { result } = renderHook(() => useMobileAppPromo());

    expect(result.current.show).toBe(true);
  });

  it('hides the banner when no URL is configured for the detected OS', () => {
    // iOS user, only Android URL set.
    setEnv('VITE_PLAY_STORE_URL', 'https://play.google.com/store/apps/details?id=x');
    setNavigator(UA.IPHONE, 5);

    const { result } = renderHook(() => useMobileAppPromo());

    expect(result.current.show).toBe(false);
    expect(result.current.os).toBe('ios');
    expect(result.current.storeUrl).toBeUndefined();
  });

  it('hides the banner when the env URL is an unsafe scheme', () => {
    setEnv('VITE_APP_STORE_URL', 'javascript:alert(1)');
    setNavigator(UA.IPHONE, 5);
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { result } = renderHook(() => useMobileAppPromo());

    expect(result.current.show).toBe(false);
    expect(result.current.storeUrl).toBeUndefined();
  });

  it('hides the banner after dismiss() and persists the flag', () => {
    setEnv('VITE_APP_STORE_URL', 'https://apps.apple.com/app/id1');
    setNavigator(UA.IPHONE, 5);

    const { result } = renderHook(() => useMobileAppPromo());
    expect(result.current.show).toBe(true);

    act(() => result.current.dismiss());

    expect(result.current.show).toBe(false);
    expect(localStorage.getItem('cabinet_mobile_app_banner_dismissed_at')).not.toBeNull();
  });

  it('respects the 7-day dismiss TTL: stale dismissals do not suppress the banner', () => {
    setEnv('VITE_APP_STORE_URL', 'https://apps.apple.com/app/id1');
    setNavigator(UA.IPHONE, 5);

    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
    localStorage.setItem('cabinet_mobile_app_banner_dismissed_at', String(eightDaysAgo));

    const { result } = renderHook(() => useMobileAppPromo());

    expect(result.current.show).toBe(true);
  });

  it('respects fresh dismissals (less than 7 days old)', () => {
    setEnv('VITE_APP_STORE_URL', 'https://apps.apple.com/app/id1');
    setNavigator(UA.IPHONE, 5);

    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    localStorage.setItem('cabinet_mobile_app_banner_dismissed_at', String(oneHourAgo));

    const { result } = renderHook(() => useMobileAppPromo());

    expect(result.current.show).toBe(false);
  });

  it('syncs dismiss across multiple subscribers (singleton store)', () => {
    setEnv('VITE_APP_STORE_URL', 'https://apps.apple.com/app/id1');
    setNavigator(UA.IPHONE, 5);

    const a = renderHook(() => useMobileAppPromo());
    const b = renderHook(() => useMobileAppPromo());

    expect(a.result.current.show).toBe(true);
    expect(b.result.current.show).toBe(true);

    act(() => a.result.current.dismiss());

    expect(a.result.current.show).toBe(false);
    expect(b.result.current.show).toBe(false);
  });

  it('reacts to cross-tab dismiss via the storage event', () => {
    setEnv('VITE_APP_STORE_URL', 'https://apps.apple.com/app/id1');
    setNavigator(UA.IPHONE, 5);

    const { result } = renderHook(() => useMobileAppPromo());
    expect(result.current.show).toBe(true);

    act(() => {
      localStorage.setItem('cabinet_mobile_app_banner_dismissed_at', String(Date.now()));
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'cabinet_mobile_app_banner_dismissed_at',
          newValue: String(Date.now()),
        }),
      );
    });

    expect(result.current.show).toBe(false);
  });
});
