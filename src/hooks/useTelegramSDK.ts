import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { init, viewport, miniApp, swipeBehavior, themeParams } from '@tma.js/sdk-react';

// SDK initialization state
let sdkInitialized = false;
let initCleanup: VoidFunction | null = null;

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

/**
 * Check if we're actually running inside Telegram Mini App
 */
export function isInTelegramWebApp(): boolean {
  const webApp = window.Telegram?.WebApp;
  return Boolean(webApp?.initData && webApp.initData.length > 0);
}

/**
 * Check if running on mobile Telegram client (iOS/Android)
 */
export function isTelegramMobile(): boolean {
  const webApp = window.Telegram?.WebApp;
  if (!webApp?.platform) return false;
  return webApp.platform === 'ios' || webApp.platform === 'android';
}

/**
 * Get Telegram init data for authentication
 * Returns the raw initData string used for backend authentication
 */
export function getTelegramInitData(): string | null {
  const webApp = window.Telegram?.WebApp;
  return webApp?.initData || null;
}

/**
 * Initialize Telegram SDK
 * Call this once at app startup (in main.tsx)
 */
export function initTelegramSDK() {
  // Only run in Telegram context
  if (!isInTelegramWebApp()) {
    return;
  }

  // Prevent double initialization
  if (sdkInitialized) {
    return;
  }

  try {
    // Initialize the SDK
    initCleanup = init();
    sdkInitialized = true;

    // Mount mini app and call ready (sync)
    miniApp.mount();
    miniApp.ready();

    // Mount theme params and bind CSS variables (sync)
    try {
      themeParams.mount();
      themeParams.bindCssVars();
    } catch {
      // Theme params may already be mounted or not supported
    }

    // Disable vertical swipes if supported (sync)
    try {
      if (swipeBehavior.isSupported()) {
        swipeBehavior.mount();
        swipeBehavior.disableVertical();
      }
    } catch {
      // Swipe behavior not available
    }

    // Mount viewport and bind CSS variables (async)
    viewport
      .mount()
      .then(() => {
        viewport.bindCssVars();
        // Expand the mini app
        viewport.expand();

        // Auto-enter fullscreen if enabled in settings (mobile only)
        const fullscreenEnabled = getCachedFullscreenEnabled();
        if (fullscreenEnabled && isTelegramMobile()) {
          try {
            const isFullscreen = viewport.isFullscreen();
            if (!isFullscreen) {
              viewport.requestFullscreen().catch((e) => {
                console.warn('Auto-fullscreen failed:', e);
              });
            }
          } catch {
            // Viewport signal not available
          }
        }
      })
      .catch((err) => {
        console.warn('Viewport mount failed:', err);
      });
  } catch (e) {
    console.warn('Telegram SDK initialization failed:', e);
  }
}

/**
 * Cleanup SDK (call on app unmount if needed)
 */
export function cleanupTelegramSDK() {
  if (initCleanup) {
    initCleanup();
    initCleanup = null;
    sdkInitialized = false;
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

// Default values for when SDK is not available
const defaultInsets = { top: 0, bottom: 0, left: 0, right: 0 };

/**
 * Helper to subscribe to SDK signals using useSyncExternalStore pattern
 * Safely handles unmounted components by returning default values
 */
function useSDKSignal<T>(
  signal: { (): T; sub(fn: VoidFunction): VoidFunction } | null,
  defaultValue: T,
): T {
  return useSyncExternalStore(
    (callback) => {
      if (!signal) return () => {};
      try {
        return signal.sub(callback);
      } catch {
        // Signal not available (component unmounted)
        return () => {};
      }
    },
    () => {
      if (!signal) return defaultValue;
      try {
        return signal();
      } catch {
        // Signal not available (component unmounted)
        return defaultValue;
      }
    },
    () => defaultValue,
  );
}

/**
 * Hook for Telegram SDK integration
 * Provides fullscreen mode, safe area insets, platform info, and other features
 */
export function useTelegramSDK() {
  const inTelegram = isInTelegramWebApp();
  const isReady = inTelegram && sdkInitialized;

  // Get platform from window.Telegram.WebApp (always available in Telegram)
  const platform = useMemo<TelegramPlatform>(() => {
    if (!inTelegram) return undefined;
    return window.Telegram?.WebApp?.platform as TelegramPlatform;
  }, [inTelegram]);

  // Use SDK signals for reactive state
  const isFullscreen = useSDKSignal(isReady ? viewport.isFullscreen : null, false);
  const safeAreaInsets = useSDKSignal(isReady ? viewport.safeAreaInsets : null, defaultInsets);
  const contentSafeAreaInsets = useSDKSignal(
    isReady ? viewport.contentSafeAreaInsets : null,
    defaultInsets,
  );
  const viewportHeight = useSDKSignal(isReady ? viewport.height : null, 0);
  const viewportStableHeight = useSDKSignal(isReady ? viewport.stableHeight : null, 0);
  const viewportWidth = useSDKSignal(isReady ? viewport.width : null, 0);
  const isExpanded = useSDKSignal(isReady ? viewport.isExpanded : null, true);

  const requestFullscreen = useCallback(() => {
    if (!isReady) return;
    viewport.requestFullscreen().catch((e) => {
      console.warn('Fullscreen not supported:', e);
    });
  }, [isReady]);

  const exitFullscreen = useCallback(() => {
    if (!isReady) return;
    viewport.exitFullscreen().catch((e) => {
      console.warn('Exit fullscreen failed:', e);
    });
  }, [isReady]);

  const toggleFullscreen = useCallback(() => {
    if (isFullscreen) {
      exitFullscreen();
    } else {
      requestFullscreen();
    }
  }, [isFullscreen, requestFullscreen, exitFullscreen]);

  const expand = useCallback(() => {
    if (!isReady) return;
    try {
      viewport.expand();
    } catch {
      // Viewport not available
    }
  }, [isReady]);

  const disableVerticalSwipes = useCallback(() => {
    if (!isReady) return;
    try {
      if (swipeBehavior.isSupported()) {
        swipeBehavior.disableVertical();
      }
    } catch {
      // Swipe behavior not available
    }
  }, [isReady]);

  const enableVerticalSwipes = useCallback(() => {
    if (!isReady) return;
    try {
      if (swipeBehavior.isSupported()) {
        swipeBehavior.enableVertical();
      }
    } catch {
      // Swipe behavior not available
    }
  }, [isReady]);

  // Check if fullscreen is supported (Bot API 8.0+)
  const isFullscreenSupported = useMemo(() => {
    if (!isReady) return false;
    try {
      return typeof viewport.requestFullscreen === 'function';
    } catch {
      return false;
    }
  }, [isReady]);

  // Check if it's mobile platform
  const isMobile = platform === 'ios' || platform === 'android';

  return {
    isTelegramWebApp: inTelegram,
    isFullscreen,
    isFullscreenSupported,
    safeAreaInset: safeAreaInsets,
    contentSafeAreaInset: contentSafeAreaInsets,
    viewportHeight,
    viewportStableHeight,
    viewportWidth,
    isExpanded,
    platform,
    isMobile,
    requestFullscreen,
    exitFullscreen,
    toggleFullscreen,
    expand,
    disableVerticalSwipes,
    enableVerticalSwipes,
    // Expose raw SDK components for advanced usage
    viewport: isReady ? viewport : null,
    miniApp: isReady ? miniApp : null,
  };
}
