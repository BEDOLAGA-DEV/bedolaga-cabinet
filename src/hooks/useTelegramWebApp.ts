import { useEffect, useState, useCallback } from 'react'

const FULLSCREEN_CACHE_KEY = 'cabinet_fullscreen_enabled'

// Get cached fullscreen setting
export const getCachedFullscreenEnabled = (): boolean => {
  try {
    return localStorage.getItem(FULLSCREEN_CACHE_KEY) === 'true'
  } catch {
    return false
  }
}

// Set cached fullscreen setting
export const setCachedFullscreenEnabled = (enabled: boolean) => {
  try {
    localStorage.setItem(FULLSCREEN_CACHE_KEY, String(enabled))
  } catch {
    // localStorage not available
  }
}

/**
 * Hook for Telegram WebApp API integration
 * Provides fullscreen mode, safe area insets, and other WebApp features
 */
export function useTelegramWebApp() {
  // Initialize synchronously to avoid flash/flicker on first render
  const webApp = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined

  const [isFullscreen, setIsFullscreen] = useState(() => webApp?.isFullscreen || false)
  const [isTelegramWebApp, setIsTelegramWebApp] = useState(() => !!webApp)
  const [safeAreaInset, setSafeAreaInset] = useState(() => webApp?.safeAreaInset || { top: 0, bottom: 0, left: 0, right: 0 })
  const [contentSafeAreaInset, setContentSafeAreaInset] = useState(() => webApp?.contentSafeAreaInset || { top: 0, bottom: 0, left: 0, right: 0 })

  useEffect(() => {
    if (!webApp) {
      setIsTelegramWebApp(false)
      return
    }

    setIsTelegramWebApp(true)
    setIsFullscreen(webApp.isFullscreen || false)
    setSafeAreaInset(webApp.safeAreaInset || { top: 0, bottom: 0, left: 0, right: 0 })
    setContentSafeAreaInset(webApp.contentSafeAreaInset || { top: 0, bottom: 0, left: 0, right: 0 })

    // Expand WebApp to full height
    webApp.expand()
    webApp.ready()

    // Listen for fullscreen changes
    const handleFullscreenChanged = () => {
      setIsFullscreen(webApp.isFullscreen || false)
      setSafeAreaInset(webApp.safeAreaInset || { top: 0, bottom: 0, left: 0, right: 0 })
      setContentSafeAreaInset(webApp.contentSafeAreaInset || { top: 0, bottom: 0, left: 0, right: 0 })
    }

    // Listen for safe area changes
    const handleSafeAreaChanged = () => {
      setSafeAreaInset(webApp.safeAreaInset || { top: 0, bottom: 0, left: 0, right: 0 })
      setContentSafeAreaInset(webApp.contentSafeAreaInset || { top: 0, bottom: 0, left: 0, right: 0 })
    }

    webApp.onEvent('fullscreenChanged', handleFullscreenChanged)
    webApp.onEvent('safeAreaChanged', handleSafeAreaChanged)
    webApp.onEvent('contentSafeAreaChanged', handleSafeAreaChanged)

    return () => {
      webApp.offEvent('fullscreenChanged', handleFullscreenChanged)
      webApp.offEvent('safeAreaChanged', handleSafeAreaChanged)
      webApp.offEvent('contentSafeAreaChanged', handleSafeAreaChanged)
    }
  }, [webApp])

  const requestFullscreen = useCallback(() => {
    if (webApp?.requestFullscreen) {
      try {
        webApp.requestFullscreen()
      } catch (e) {
        console.warn('Fullscreen not supported:', e)
      }
    }
  }, [webApp])

  const exitFullscreen = useCallback(() => {
    if (webApp?.exitFullscreen) {
      try {
        webApp.exitFullscreen()
      } catch (e) {
        console.warn('Exit fullscreen failed:', e)
      }
    }
  }, [webApp])

  const toggleFullscreen = useCallback(() => {
    if (isFullscreen) {
      exitFullscreen()
    } else {
      requestFullscreen()
    }
  }, [isFullscreen, requestFullscreen, exitFullscreen])

  const disableVerticalSwipes = useCallback(() => {
    if (webApp?.disableVerticalSwipes) {
      webApp.disableVerticalSwipes()
    }
  }, [webApp])

  const enableVerticalSwipes = useCallback(() => {
    if (webApp?.enableVerticalSwipes) {
      webApp.enableVerticalSwipes()
    }
  }, [webApp])

  // Check if fullscreen is supported (Bot API 8.0+)
  const isFullscreenSupported = Boolean(webApp?.requestFullscreen)

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
  }
}

/**
 * Initialize Telegram WebApp on app start
 * Call this in main.tsx or App.tsx
 */
export function initTelegramWebApp() {
  const webApp = window.Telegram?.WebApp
  if (webApp) {
    webApp.ready()
    webApp.expand()

    // Disable vertical swipes to prevent accidental closing
    if (webApp.disableVerticalSwipes) {
      webApp.disableVerticalSwipes()
    }

    // Auto-enter fullscreen if enabled in settings (use cached value for instant response)
    const fullscreenEnabled = getCachedFullscreenEnabled()
    if (fullscreenEnabled && webApp.requestFullscreen && !webApp.isFullscreen) {
      try {
        webApp.requestFullscreen()
      } catch (e) {
        console.warn('Auto-fullscreen failed:', e)
      }
    }
  }
}
