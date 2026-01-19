import { useEffect, useState, useCallback } from 'react'

/**
 * Hook for Telegram WebApp API integration
 * Provides fullscreen mode, safe area insets, and other WebApp features
 */
export function useTelegramWebApp() {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isTelegramWebApp, setIsTelegramWebApp] = useState(false)
  const [safeAreaInset, setSafeAreaInset] = useState({ top: 0, bottom: 0, left: 0, right: 0 })
  const [contentSafeAreaInset, setContentSafeAreaInset] = useState({ top: 0, bottom: 0, left: 0, right: 0 })

  const webApp = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined

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
  }
}
