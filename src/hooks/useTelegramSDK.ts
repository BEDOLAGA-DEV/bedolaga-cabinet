import { useCallback, useMemo } from 'react';
import {
  useSignal,
  isFullscreen as isFullscreenSignal,
  viewportHeight as viewportHeightSignal,
  viewportStableHeight as viewportStableHeightSignal,
  isViewportExpanded as isViewportExpandedSignal,
  viewportSafeAreaInsets,
  viewportContentSafeAreaInsets,
  requestFullscreen as sdkRequestFullscreen,
  exitFullscreen as sdkExitFullscreen,
  disableVerticalSwipes as sdkDisableVerticalSwipes,
  enableVerticalSwipes as sdkEnableVerticalSwipes,
  expandViewport,
  retrieveLaunchParams,
  retrieveRawInitData,
  themeParamsState,
} from '@telegram-apps/sdk-react';

const FULLSCREEN_CACHE_KEY = 'cabinet_fullscreen_enabled';

export const getCachedFullscreenEnabled = (): boolean => {
  try {
    return localStorage.getItem(FULLSCREEN_CACHE_KEY) === 'true';
  } catch {
    return false;
  }
};

export const setCachedFullscreenEnabled = (enabled: boolean) => {
  try {
    localStorage.setItem(FULLSCREEN_CACHE_KEY, String(enabled));
  } catch {}
};

let _isInTelegram: boolean | null = null;
function detectTelegram(): boolean {
  if (_isInTelegram === null) {
    try {
      retrieveLaunchParams();
      _isInTelegram = true;
    } catch {
      _isInTelegram = false;
    }
  }
  return _isInTelegram;
}

export function isInTelegramWebApp(): boolean {
  return detectTelegram();
}

export function isTelegramMobile(): boolean {
  try {
    const { tgWebAppPlatform } = retrieveLaunchParams();
    return tgWebAppPlatform === 'ios' || tgWebAppPlatform === 'android';
  } catch {
    return false;
  }
}

export function getTelegramInitData(): string | null {
  try {
    return retrieveRawInitData() || null;
  } catch {
    return null;
  }
}

function isDarkHexColor(hex: string): boolean {
  const m = hex.replace('#', '');
  const full = m.length === 3 ? m.replace(/(.)/g, '$1$1') : m;
  if (full.length !== 6) return false;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  // Perceived sRGB luminance; below 0.5 reads as a dark surface.
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
}

/**
 * The Telegram client's effective color scheme ('light' | 'dark'), derived from
 * the theme background color. Returns null outside Telegram or before theme params load.
 */
export function getTelegramColorScheme(): 'light' | 'dark' | null {
  if (!detectTelegram()) return null;
  try {
    const bg = themeParamsState()?.bgColor;
    return bg ? (isDarkHexColor(bg) ? 'dark' : 'light') : null;
  } catch {
    return null;
  }
}

/**
 * The user's Telegram client language as a 2-letter code (e.g. 'en'), or null
 * outside Telegram / when unavailable.
 */
export function getTelegramLanguageCode(): string | null {
  if (!detectTelegram()) return null;
  try {
    const user = retrieveLaunchParams().tgWebAppData?.user as { languageCode?: string } | undefined;
    const code = user?.languageCode;
    return code ? code.split('-')[0].toLowerCase() : null;
  } catch {
    return null;
  }
}

export type TelegramPlatform =
  | 'android'
  | 'ios'
  | 'tdesktop'
  | 'macos'
  | 'weba'
  | 'webk'
  | 'unigram'
  | 'unknown'
  | undefined;

const defaultInsets = { top: 0, bottom: 0, left: 0, right: 0 };

export function useTelegramSDK() {
  const inTelegram = detectTelegram();

  const platform = useMemo<TelegramPlatform>(() => {
    try {
      return retrieveLaunchParams().tgWebAppPlatform as TelegramPlatform;
    } catch {
      return undefined;
    }
  }, []);

  const isMobile = platform === 'ios' || platform === 'android';

  // Always call useSignal unconditionally (Rules of Hooks).
  // When not in Telegram, the signals will have their default values.
  const fullscreenValue = useSignal(isFullscreenSignal);
  const heightValue = useSignal(viewportHeightSignal);
  const stableHeightValue = useSignal(viewportStableHeightSignal);
  const expandedValue = useSignal(isViewportExpandedSignal);
  const safeInsets = useSignal(viewportSafeAreaInsets);
  const contentSafeInsets = useSignal(viewportContentSafeAreaInsets);

  const isFullscreen = inTelegram ? (fullscreenValue ?? false) : false;
  const viewportHeight = inTelegram ? (heightValue ?? 0) : 0;
  const viewportStableHeight = inTelegram ? (stableHeightValue ?? 0) : 0;
  const isExpanded = inTelegram ? (expandedValue ?? true) : true;

  const safeAreaInset = useMemo(() => {
    if (!inTelegram || !safeInsets) return defaultInsets;
    return {
      top: safeInsets.top || 0,
      bottom: safeInsets.bottom || 0,
      left: safeInsets.left || 0,
      right: safeInsets.right || 0,
    };
  }, [inTelegram, safeInsets]);

  const contentSafeAreaInset = useMemo(() => {
    if (!inTelegram || !contentSafeInsets) return defaultInsets;
    return {
      top: contentSafeInsets.top || 0,
      bottom: contentSafeInsets.bottom || 0,
      left: contentSafeInsets.left || 0,
      right: contentSafeInsets.right || 0,
    };
  }, [inTelegram, contentSafeInsets]);

  const requestFullscreen = useCallback(() => {
    if (!inTelegram) return;
    try {
      sdkRequestFullscreen();
    } catch {}
  }, [inTelegram]);

  const exitFullscreen = useCallback(() => {
    if (!inTelegram) return;
    try {
      sdkExitFullscreen();
    } catch {}
  }, [inTelegram]);

  const toggleFullscreen = useCallback(() => {
    if (isFullscreen) {
      exitFullscreen();
    } else {
      requestFullscreen();
    }
  }, [isFullscreen, requestFullscreen, exitFullscreen]);

  const expand = useCallback(() => {
    if (!inTelegram) return;
    try {
      expandViewport();
    } catch {}
  }, [inTelegram]);

  const disableVerticalSwipes = useCallback(() => {
    if (!inTelegram) return;
    try {
      sdkDisableVerticalSwipes();
    } catch {}
  }, [inTelegram]);

  const enableVerticalSwipes = useCallback(() => {
    if (!inTelegram) return;
    try {
      sdkEnableVerticalSwipes();
    } catch {}
  }, [inTelegram]);

  const isFullscreenSupported = inTelegram;

  return {
    isTelegramWebApp: inTelegram,
    isFullscreen,
    isFullscreenSupported,
    safeAreaInset,
    contentSafeAreaInset,
    viewportHeight,
    viewportStableHeight,
    viewportWidth: 0,
    isExpanded,
    platform,
    isMobile,
    requestFullscreen,
    exitFullscreen,
    toggleFullscreen,
    expand,
    disableVerticalSwipes,
    enableVerticalSwipes,
    viewport: null,
    miniApp: null,
  };
}
