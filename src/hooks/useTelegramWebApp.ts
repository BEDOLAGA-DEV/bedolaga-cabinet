import { useEffect, useState, useCallback } from 'react';

const FULLSCREEN_CACHE_KEY = 'cabinet_fullscreen_enabled';

/**
 * Check if running on mobile Telegram client (iOS/Android)
 * Fullscreen mode should only be applied on mobile platforms
 */
export function isTelegramMobile(): boolean {
  const webApp = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;
  if (!webApp?.platform) return false;

  // Only iOS and Android are mobile platforms
  // tdesktop, macos, web, unknown - all are desktop/non-mobile
  return webApp.platform === 'ios' || webApp.platform === 'android';
}

// Get cached fullscreen setting
export const getCachedFullscreenEnabled = (): boolean => {
  try {
    return localStorage.getItem(FULLSCREEN_CACHE_KEY) === 'true';
  } catch {
    return false;
  }
};

// Set cached fullscreen setting
export const setCachedFullscreenEnabled = (enabled: boolean) => {
  try {
    localStorage.setItem(FULLSCREEN_CACHE_KEY, String(enabled));
  } catch {
    // localStorage not available
  }
};

/**
 * Hook for Telegram WebApp API integration
 * Provides fullscreen mode, safe area insets, and other WebApp features
 */
export function useTelegramWebApp() {
  // Initialize synchronously to avoid flash/flicker on first render
  const webApp = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;
  const inTelegram = isInTelegramWebApp();

  const [isFullscreen, setIsFullscreen] = useState(
    () => (inTelegram && webApp?.isFullscreen) || false,
  );
  const [isTelegramWebApp, setIsTelegramWebApp] = useState(() => inTelegram);
  const [safeAreaInset, setSafeAreaInset] = useState(
    () => (inTelegram && webApp?.safeAreaInset) || { top: 0, bottom: 0, left: 0, right: 0 },
  );
  const [contentSafeAreaInset, setContentSafeAreaInset] = useState(
    () =>
      (inTelegram && webApp?.contentSafeAreaInset) || {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
      },
  );

  useEffect(() => {
    // Only run Telegram-specific code if we're actually in Telegram
    const isActuallyInTelegram = isInTelegramWebApp();
    if (!webApp || !isActuallyInTelegram) {
      setIsTelegramWebApp(false);
      return;
    }

    setIsTelegramWebApp(true);
    setIsFullscreen(webApp.isFullscreen || false);
    setSafeAreaInset(webApp.safeAreaInset || { top: 0, bottom: 0, left: 0, right: 0 });
    setContentSafeAreaInset(
      webApp.contentSafeAreaInset || { top: 0, bottom: 0, left: 0, right: 0 },
    );

    // Expand WebApp to full height
    webApp.expand();
    webApp.ready();

    // Listen for fullscreen changes
    const handleFullscreenChanged = () => {
      setIsFullscreen(webApp.isFullscreen || false);
      setSafeAreaInset(webApp.safeAreaInset || { top: 0, bottom: 0, left: 0, right: 0 });
      setContentSafeAreaInset(
        webApp.contentSafeAreaInset || { top: 0, bottom: 0, left: 0, right: 0 },
      );
    };

    // Listen for safe area changes
    const handleSafeAreaChanged = () => {
      setSafeAreaInset(webApp.safeAreaInset || { top: 0, bottom: 0, left: 0, right: 0 });
      setContentSafeAreaInset(
        webApp.contentSafeAreaInset || { top: 0, bottom: 0, left: 0, right: 0 },
      );
    };

    webApp.onEvent('fullscreenChanged', handleFullscreenChanged);
    webApp.onEvent('safeAreaChanged', handleSafeAreaChanged);
    webApp.onEvent('contentSafeAreaChanged', handleSafeAreaChanged);

    return () => {
      webApp.offEvent('fullscreenChanged', handleFullscreenChanged);
      webApp.offEvent('safeAreaChanged', handleSafeAreaChanged);
      webApp.offEvent('contentSafeAreaChanged', handleSafeAreaChanged);
    };
  }, [webApp]);

  const requestFullscreen = useCallback(() => {
    if (webApp?.requestFullscreen) {
      try {
        webApp.requestFullscreen();
      } catch (e) {
        console.warn('Fullscreen not supported:', e);
      }
    }
  }, [webApp]);

  const exitFullscreen = useCallback(() => {
    if (webApp?.exitFullscreen) {
      try {
        webApp.exitFullscreen();
      } catch (e) {
        console.warn('Exit fullscreen failed:', e);
      }
    }
  }, [webApp]);

  const toggleFullscreen = useCallback(() => {
    if (isFullscreen) {
      exitFullscreen();
    } else {
      requestFullscreen();
    }
  }, [isFullscreen, requestFullscreen, exitFullscreen]);

  const disableVerticalSwipes = useCallback(() => {
    try {
      if (webApp?.disableVerticalSwipes && webApp.version && webApp.version >= '7.7') {
        webApp.disableVerticalSwipes();
      }
    } catch {
      // Not supported in this version
    }
  }, [webApp]);

  const enableVerticalSwipes = useCallback(() => {
    try {
      if (webApp?.enableVerticalSwipes && webApp.version && webApp.version >= '7.7') {
        webApp.enableVerticalSwipes();
      }
    } catch {
      // Not supported in this version
    }
  }, [webApp]);

  // Check if fullscreen is supported (Bot API 8.0+)
  const isFullscreenSupported = Boolean(webApp?.requestFullscreen);

  return {
    isTelegramWebApp,
    isFullscreen,
    isFullscreenSupported,
    safeAreaInset,
    contentSafeAreaInset,
    requestFullscreen,
    exitFullscreen,
    toggleFullscreen,
    disableVerticalSwipes,
    enableVerticalSwipes,
    webApp,
  };
}

/**
 * Check if we're actually running inside Telegram Mini App
 * (not just the script loaded on a regular webpage)
 */
export function isInTelegramWebApp(): boolean {
  const webApp = window.Telegram?.WebApp;
  // Check if initData exists - it's empty when not in Telegram
  return Boolean(webApp?.initData && webApp.initData.length > 0);
}

/**
 * Initialize Telegram WebApp on app start
 * Call this in main.tsx or App.tsx
 */
export function initTelegramWebApp() {
  const webApp = window.Telegram?.WebApp;
  // Only initialize if we're actually in Telegram
  if (!webApp || !isInTelegramWebApp()) {
    return;
  }

  webApp.ready();
  webApp.expand();

  // Disable vertical swipes to prevent accidental closing (requires Bot API 7.7+)
  try {
    if (webApp.disableVerticalSwipes && webApp.version && webApp.version >= '7.7') {
      webApp.disableVerticalSwipes();
    }
  } catch {
    // Swipe control not supported in this version
  }

  // Auto-enter fullscreen if enabled in settings (use cached value for instant response)
  // Only apply fullscreen on mobile Telegram (iOS/Android) - desktop doesn't need it
  const fullscreenEnabled = getCachedFullscreenEnabled();
  if (fullscreenEnabled && isTelegramMobile() && webApp.requestFullscreen && !webApp.isFullscreen) {
    try {
      webApp.requestFullscreen();
    } catch (e) {
      console.warn('Auto-fullscreen failed:', e);
    }
  }
}
