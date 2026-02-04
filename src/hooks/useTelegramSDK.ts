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
} from '@telegram-apps/sdk-react';

const FULLSCREEN_CACHE_KEY = 'cabinet_fullscreen_enabled';

/**
 * Get cached fullscreen setting
 */
export const getCachedFullscreenEnabled = (): boolean => {
  try {
    return localStorage.getItem(FULLSCREEN_CACHE_KEY) === 'true';
  } catch {
    return false;
  }
};

/**
 * Set cached fullscreen setting
 */
export const setCachedFullscreenEnabled = (enabled: boolean) => {
  try {
    localStorage.setItem(FULLSCREEN_CACHE_KEY, String(enabled));
  } catch {
    // localStorage not available
  }
};

// Cached detection result (evaluated once at module load)
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

/**
 * Check if we're actually running inside Telegram Mini App
 */
export function isInTelegramWebApp(): boolean {
  return detectTelegram();
}

/**
 * Check if running on mobile Telegram client (iOS/Android)
 */
export function isTelegramMobile(): boolean {
  try {
    const { tgWebAppPlatform } = retrieveLaunchParams();
    return tgWebAppPlatform === 'ios' || tgWebAppPlatform === 'android';
  } catch {
    return false;
  }
}

/**
 * Get Telegram init data for authentication
 */
export function getTelegramInitData(): string | null {
  try {
    return retrieveRawInitData() || null;
  } catch {
    return null;
  }
}

/**
 * Type for platform values
 */
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

// Default values
const defaultInsets = { top: 0, bottom: 0, left: 0, right: 0 };

/**
 * Hook for Telegram WebApp integration
 * Uses @telegram-apps/sdk-react v3 signals
 */
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
    } catch {
      // Not supported
    }
  }, [inTelegram]);

  const exitFullscreen = useCallback(() => {
    if (!inTelegram) return;
    try {
      sdkExitFullscreen();
    } catch {
      // Not supported
    }
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
    } catch {
      // Not supported
    }
  }, [inTelegram]);

  const disableVerticalSwipes = useCallback(() => {
    if (!inTelegram) return;
    try {
      sdkDisableVerticalSwipes();
    } catch {
      // Not supported
    }
  }, [inTelegram]);

  const enableVerticalSwipes = useCallback(() => {
    if (!inTelegram) return;
    try {
      sdkEnableVerticalSwipes();
    } catch {
      // Not supported
    }
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
