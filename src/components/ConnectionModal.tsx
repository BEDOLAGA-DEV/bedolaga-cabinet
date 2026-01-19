import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { subscriptionApi } from '../api/subscription'
import type { AppInfo, AppConfig, LocalizedText } from '../types'

interface ConnectionModalProps {
  onClose: () => void
}

// Platform SVG Icons
const IosIcon = () => (
  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
  </svg>
)

const AndroidIcon = () => (
  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24a11.463 11.463 0 00-8.94 0L5.65 5.67c-.19-.29-.58-.38-.87-.2-.28.18-.37.54-.22.83L6.4 9.48A10.78 10.78 0 003 18h18a10.78 10.78 0 00-3.4-8.52zM7 15.25a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5zm10 0a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5z"/>
  </svg>
)

const WindowsIcon = () => (
  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 12V6.75l6-1.32v6.48L3 12zm17-9v8.75l-10 .15V5.21L20 3zM3 13l6 .09v6.81l-6-1.15V13zm17 .25V22l-10-1.91V13.1l10 .15z"/>
  </svg>
)

const MacosIcon = () => (
  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
    <path d="M4 4h16a2 2 0 012 2v10a2 2 0 01-2 2h-6v2h2a1 1 0 110 2H8a1 1 0 110-2h2v-2H4a2 2 0 01-2-2V6a2 2 0 012-2zm0 2v10h16V6H4zm8 2.5a1 1 0 011 1v3a1 1 0 11-2 0v-3a1 1 0 011-1z"/>
  </svg>
)

const LinuxIcon = () => (
  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C9.5 2 8 4.5 8 7c0 1.5.5 3 1 4-1.5 1-3 3-3 5 0 .5 0 1 .5 1.5-.5.5-1.5 1-1.5 2 0 1.5 2 2.5 4 2.5h6c2 0 4-1 4-2.5 0-1-1-1.5-1.5-2 .5-.5.5-1 .5-1.5 0-2-1.5-4-3-5 .5-1 1-2.5 1-4 0-2.5-1.5-5-4-5zm-2 5c.5 0 1 .5 1 1s-.5 1-1 1-1-.5-1-1 .5-1 1-1zm4 0c.5 0 1 .5 1 1s-.5 1-1 1-1-.5-1-1 .5-1 1-1zm-2 3c1 0 2 .5 2 1s-1 1-2 1-2-.5-2-1 1-1 2-1z"/>
  </svg>
)

const TvIcon = () => (
  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="13" rx="2" ry="2"/>
    <polyline points="8 21 12 17 16 21"/>
    <line x1="12" y1="17" x2="12" y2="13"/>
  </svg>
)

// Platform icon components map
const platformIconComponents: Record<string, React.FC> = {
  ios: IosIcon,
  android: AndroidIcon,
  macos: MacosIcon,
  windows: WindowsIcon,
  linux: LinuxIcon,
  androidTV: TvIcon,
  appleTV: TvIcon,
}

// Platform order for display
const platformOrder = ['ios', 'android', 'windows', 'macos', 'linux', 'androidTV', 'appleTV']

// Dangerous schemes that should never be allowed
const dangerousSchemes = ['javascript:', 'data:', 'vbscript:', 'file:']

/**
 * Validate URL to prevent XSS via javascript: and other dangerous schemes
 * Only allows http, https, and known app store URLs
 */
function isValidExternalUrl(url: string | undefined): boolean {
  if (!url) return false
  const lowerUrl = url.toLowerCase().trim()

  // Block dangerous schemes
  const dangerousSchemes = ['javascript:', 'data:', 'vbscript:', 'file:']
  if (dangerousSchemes.some(scheme => lowerUrl.startsWith(scheme))) {
    return false
  }

  // Allow only http/https URLs
  return lowerUrl.startsWith('http://') || lowerUrl.startsWith('https://')
}

/**
 * Validate deep link URL - blocks dangerous schemes only
 * Allows any custom app scheme (clash://, hiddify://, etc.)
 */
function isValidDeepLink(url: string | undefined): boolean {
  if (!url) return false
  const lowerUrl = url.toLowerCase().trim()

  // Block dangerous schemes
  if (dangerousSchemes.some(scheme => lowerUrl.startsWith(scheme))) {
    return false
  }

  // Allow any URL that has a scheme (contains ://)
  return lowerUrl.includes('://')
}

// Detect user's platform from user agent
function detectPlatform(): string | null {
  if (typeof window === 'undefined' || !navigator?.userAgent) {
    return null
  }

  const ua = navigator.userAgent.toLowerCase()

  // Check for mobile devices first
  if (/iphone|ipad|ipod/.test(ua)) {
    return 'ios'
  }
  if (/android/.test(ua)) {
    // Check if it's Android TV
    if (/tv|television|smart-tv|smarttv/.test(ua)) {
      return 'androidTV'
    }
    return 'android'
  }

  // Desktop platforms
  if (/macintosh|mac os x/.test(ua)) {
    return 'macos'
  }
  if (/windows/.test(ua)) {
    return 'windows'
  }
  if (/linux/.test(ua)) {
    return 'linux'
  }

  return null
}

export default function ConnectionModal({ onClose }: ConnectionModalProps) {
  const { t, i18n } = useTranslation()
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null)
  const [selectedApp, setSelectedApp] = useState<AppInfo | null>(null)
  const [copied, setCopied] = useState(false)
  const [detectedPlatform, setDetectedPlatform] = useState<string | null>(null)

  const { data: appConfig, isLoading, error } = useQuery<AppConfig>({
    queryKey: ['appConfig'],
    queryFn: () => subscriptionApi.getAppConfig(),
  })

  // Auto-detect platform on mount
  useEffect(() => {
    const detected = detectPlatform()
    setDetectedPlatform(detected)
  }, [])

  // Helper to get localized text
  const getLocalizedText = (text: LocalizedText | undefined): string => {
    if (!text) return ''
    const lang = i18n.language || 'en'
    return text[lang] || text['en'] || text['ru'] || Object.values(text)[0] || ''
  }

  // Get platform name
  const getPlatformName = (platformKey: string): string => {
    if (!appConfig?.platformNames?.[platformKey]) {
      return platformKey
    }
    return getLocalizedText(appConfig.platformNames[platformKey])
  }

  // Get available platforms sorted (detected platform first)
  const availablePlatforms = useMemo(() => {
    if (!appConfig?.platforms) return []
    const available = platformOrder.filter(
      (key) => appConfig.platforms[key] && appConfig.platforms[key].length > 0
    )
    // Move detected platform to the front
    if (detectedPlatform && available.includes(detectedPlatform)) {
      const filtered = available.filter(p => p !== detectedPlatform)
      return [detectedPlatform, ...filtered]
    }
    return available
  }, [appConfig, detectedPlatform])

  // Get apps for selected platform
  const platformApps = useMemo(() => {
    if (!selectedPlatform || !appConfig?.platforms?.[selectedPlatform]) return []
    return appConfig.platforms[selectedPlatform]
  }, [selectedPlatform, appConfig])

  // Copy subscription link
  const copySubscriptionLink = async () => {
    if (!appConfig?.subscriptionUrl) return
    try {
      await navigator.clipboard.writeText(appConfig.subscriptionUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = appConfig.subscriptionUrl
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Handle deep link click - use miniapp redirect page like in miniapp index.html
  const handleConnect = (app: AppInfo) => {
    // Validate deep link to prevent XSS
    if (!app.deepLink || !isValidDeepLink(app.deepLink)) {
      console.warn('Invalid or missing deep link:', app.deepLink)
      return
    }

    const lang = i18n.language?.startsWith('ru') ? 'ru' : 'en'
    const redirectUrl = `${window.location.origin}/miniapp/redirect.html?url=${encodeURIComponent(app.deepLink)}&lang=${lang}`

    // Check if it's a custom URL scheme (not http/https)
    const isCustomScheme = !/^https?:\/\//i.test(app.deepLink)
    const tg = (window as any).Telegram?.WebApp

    if (isCustomScheme && tg?.openLink) {
      // For custom URL schemes - open redirect page in external browser via Telegram
      // try_browser: true - показывает диалог для перехода во внешний браузер (важно для мобильных)
      try {
        tg.openLink(redirectUrl, { try_instant_view: false, try_browser: true })
        return
      } catch (e) {
        console.warn('tg.openLink failed:', e)
      }
    }

    // Fallback - direct navigation
    window.location.href = redirectUrl
  }

  // Modal wrapper classes - bottom sheet on mobile, centered on desktop
  const modalOverlayClass = "fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center sm:justify-center"
  const modalCardClass = "w-full sm:max-w-lg sm:mx-4 bg-dark-850 sm:rounded-2xl rounded-t-2xl rounded-b-none border-t border-x sm:border border-dark-700/50 shadow-2xl overflow-hidden"
  const modalContentClass = "p-4 sm:p-6 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-6"
  // Allow the sheet to almost fill the viewport height on phones
  const modalScrollableClass = "h-[calc(100vh-1rem)] sm:h-auto sm:max-h-[85vh]"

  if (isLoading) {
    return (
      <div className={modalOverlayClass} onClick={onClose}>
        <div className={modalCardClass} onClick={(e) => e.stopPropagation()}>
          <div className={modalContentClass}>
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !appConfig) {
    return (
      <div className={modalOverlayClass} onClick={onClose}>
        <div className={modalCardClass} onClick={(e) => e.stopPropagation()}>
          <div className={modalContentClass}>
            <div className="text-center py-8">
              <p className="text-error-400">{t('common.error')}</p>
              <button onClick={onClose} className="btn-secondary mt-4">
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!appConfig.hasSubscription) {
    return (
      <div className={modalOverlayClass} onClick={onClose}>
        <div className={modalCardClass} onClick={(e) => e.stopPropagation()}>
          <div className={modalContentClass}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-dark-100">
                {t('subscription.connection.title')}
              </h2>
              <button onClick={onClose} className="btn-icon">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="text-center py-8">
              <p className="text-dark-400">{t('subscription.connection.noSubscription')}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Step 1: Select platform
  if (!selectedPlatform) {
    return (
      <div className={modalOverlayClass} onClick={onClose}>
        <div className={`${modalCardClass} ${modalScrollableClass} flex flex-col animate-slide-up`} onClick={(e) => e.stopPropagation()}>
          {/* Header - fixed */}
          <div className="flex justify-between items-center p-4 sm:p-6 pb-0 flex-shrink-0">
            <h2 className="text-lg font-semibold text-dark-100">
              {t('subscription.connection.title')}
            </h2>
            <button onClick={onClose} className="btn-icon">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 pt-3 sm:pt-4">
            <p className="text-dark-400 text-sm sm:text-base mb-3 sm:mb-4">{t('subscription.connection.selectDevice')}</p>

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {availablePlatforms.map((platform) => {
                const IconComponent = platformIconComponents[platform]
                return (
                  <button
                    key={platform}
                    onClick={() => setSelectedPlatform(platform)}
                    className={`p-3 sm:p-4 rounded-xl border transition-all text-left group ${
                      platform === detectedPlatform
                        ? 'bg-accent-500/10 border-accent-500/50 hover:border-accent-500'
                        : 'bg-dark-800/50 border-dark-700 hover:border-accent-500/50 hover:bg-dark-700/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className={`${
                        platform === detectedPlatform ? 'text-accent-400' : 'text-dark-400 group-hover:text-dark-200'
                      } transition-colors`}>
                        {IconComponent && <IconComponent />}
                      </div>
                      {platform === detectedPlatform && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-accent-500/20 text-accent-400">
                          {t('subscription.connection.yourDevice')}
                        </span>
                      )}
                    </div>
                    <p className="text-dark-200 font-medium mt-2">{getPlatformName(platform)}</p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Footer - fixed with safe area */}
          <div className="flex-shrink-0 p-4 sm:p-6 pt-3 sm:pt-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-6 border-t border-dark-700/50">
            <button
              onClick={copySubscriptionLink}
              className="w-full p-2.5 sm:p-3 rounded-xl bg-dark-800/50 border border-dark-700 hover:border-accent-500/50 transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              {copied ? (
                <>
                  <svg className="w-5 h-5 text-success-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-success-400">{t('subscription.connection.copied')}</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span className="text-dark-300">{t('subscription.connection.copyLink')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Step 2: Select app (if not selected yet)
  if (!selectedApp) {
    return (
      <div className={modalOverlayClass} onClick={onClose}>
        <div className={`${modalCardClass} ${modalScrollableClass} flex flex-col animate-slide-up`} onClick={(e) => e.stopPropagation()}>
          {/* Header - fixed */}
          <div className="flex justify-between items-center p-4 sm:p-6 pb-0 flex-shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedPlatform(null)}
                className="btn-icon"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              <h2 className="text-lg font-semibold text-dark-100">
                {getPlatformName(selectedPlatform)}
              </h2>
            </div>
            <button onClick={onClose} className="btn-icon">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 pt-3 sm:pt-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-6">
            <p className="text-dark-400 text-sm sm:text-base mb-3 sm:mb-4">{t('subscription.connection.selectApp')}</p>

            {platformApps.length === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <p className="text-dark-500">{t('subscription.connection.noApps')}</p>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {platformApps.map((app) => (
                  <button
                    key={app.id}
                    onClick={() => setSelectedApp(app)}
                    className="w-full p-3 sm:p-4 rounded-xl bg-dark-800/50 border border-dark-700 hover:border-accent-500/50 hover:bg-dark-700/50 transition-all text-left flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-dark-100 font-medium">{app.name}</span>
                        {app.isFeatured && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-accent-500/20 text-accent-400">
                            {t('subscription.connection.featured')}
                          </span>
                        )}
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-dark-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Step 3: Show app instructions and connect button
  return (
    <div className={modalOverlayClass} onClick={onClose}>
      <div className={`${modalCardClass} ${modalScrollableClass} flex flex-col animate-slide-up`} onClick={(e) => e.stopPropagation()}>
        {/* Header - fixed */}
        <div className="flex justify-between items-center p-4 sm:p-6 pb-0 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedApp(null)}
              className="btn-icon"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <h2 className="text-lg font-semibold text-dark-100">
              {selectedApp.name}
            </h2>
          </div>
          <button onClick={onClose} className="btn-icon">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 pt-3 sm:pt-4">
          <div className="space-y-4 sm:space-y-6">
            {/* Step 1: Install */}
            {selectedApp.installationStep && (
              <div className="space-y-2 sm:space-y-3">
                <h3 className="text-sm font-medium text-accent-400">
                  {t('subscription.connection.installApp')}
                </h3>
                <p className="text-sm text-dark-400">
                  {getLocalizedText(selectedApp.installationStep.description)}
                </p>
                {selectedApp.installationStep.buttons && selectedApp.installationStep.buttons.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedApp.installationStep.buttons
                      .filter((btn) => isValidExternalUrl(btn.buttonLink))
                      .map((btn, idx) => (
                      <a
                        key={idx}
                        href={btn.buttonLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-dark-700 text-dark-200 text-sm hover:bg-dark-600 transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                        </svg>
                        {getLocalizedText(btn.buttonText)}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Additional before add subscription */}
            {selectedApp.additionalBeforeAddSubscriptionStep && (
              <div className="space-y-2 p-3 rounded-xl bg-dark-800/50 border border-dark-700">
                {selectedApp.additionalBeforeAddSubscriptionStep.title && (
                  <h4 className="text-sm font-medium text-dark-200">
                    {getLocalizedText(selectedApp.additionalBeforeAddSubscriptionStep.title)}
                  </h4>
                )}
                <p className="text-xs text-dark-400">
                  {getLocalizedText(selectedApp.additionalBeforeAddSubscriptionStep.description)}
                </p>
              </div>
            )}

            {/* Step 2: Add subscription */}
            {selectedApp.addSubscriptionStep && (
              <div className="space-y-2 sm:space-y-3">
                <h3 className="text-sm font-medium text-accent-400">
                  {t('subscription.connection.addSubscription')}
                </h3>
                <p className="text-sm text-dark-400">
                  {getLocalizedText(selectedApp.addSubscriptionStep.description)}
                </p>

                {/* Connect button */}
                {selectedApp.deepLink && (
                  <button
                    onClick={() => handleConnect(selectedApp)}
                    className="btn-primary w-full py-2.5 sm:py-3 flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                    {t('subscription.connection.addToApp', { appName: selectedApp.name })}
                  </button>
                )}

                {/* Copy link fallback */}
                <button
                  onClick={copySubscriptionLink}
                  className="w-full p-2.5 sm:p-3 rounded-xl bg-dark-800/50 border border-dark-700 hover:border-accent-500/50 transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  {copied ? (
                    <>
                      <svg className="w-5 h-5 text-success-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-success-400">{t('subscription.connection.copied')}</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span className="text-dark-300">{t('subscription.connection.copyLink')}</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Additional after add subscription */}
            {selectedApp.additionalAfterAddSubscriptionStep && (
              <div className="space-y-2 p-3 rounded-xl bg-dark-800/50 border border-dark-700">
                {selectedApp.additionalAfterAddSubscriptionStep.title && (
                  <h4 className="text-sm font-medium text-dark-200">
                    {getLocalizedText(selectedApp.additionalAfterAddSubscriptionStep.title)}
                  </h4>
                )}
                <p className="text-xs text-dark-400">
                  {getLocalizedText(selectedApp.additionalAfterAddSubscriptionStep.description)}
                </p>
              </div>
            )}

            {/* Step 3: Connect */}
            {selectedApp.connectAndUseStep && (
              <div className="space-y-2 sm:space-y-3">
                <h3 className="text-sm font-medium text-accent-400">
                  {t('subscription.connection.connectVpn')}
                </h3>
                <p className="text-sm text-dark-400">
                  {getLocalizedText(selectedApp.connectAndUseStep.description)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer - fixed with safe area */}
        <div className="flex-shrink-0 p-4 sm:p-6 pt-3 sm:pt-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-6 border-t border-dark-700/50">
          <button onClick={onClose} className="btn-secondary w-full text-sm sm:text-base">
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  )
}
