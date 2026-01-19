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
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
  </svg>
)

const AndroidIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24a11.463 11.463 0 00-8.94 0L5.65 5.67c-.19-.29-.58-.38-.87-.2-.28.18-.37.54-.22.83L6.4 9.48A10.78 10.78 0 003 18h18a10.78 10.78 0 00-3.4-8.52zM7 15.25a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5zm10 0a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5z"/>
  </svg>
)

const WindowsIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 12V6.75l6-1.32v6.48L3 12zm17-9v8.75l-10 .15V5.21L20 3zM3 13l6 .09v6.81l-6-1.15V13zm17 .25V22l-10-1.91V13.1l10 .15z"/>
  </svg>
)

const MacosIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
    <path d="M4 4h16a2 2 0 012 2v10a2 2 0 01-2 2h-6v2h2a1 1 0 110 2H8a1 1 0 110-2h2v-2H4a2 2 0 01-2-2V6a2 2 0 012-2zm0 2v10h16V6H4z"/>
  </svg>
)

const LinuxIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C9.5 2 8 4.5 8 7c0 1.5.5 3 1 4-1.5 1-3 3-3 5 0 .5 0 1 .5 1.5-.5.5-1.5 1-1.5 2 0 1.5 2 2.5 4 2.5h6c2 0 4-1 4-2.5 0-1-1-1.5-1.5-2 .5-.5.5-1 .5-1.5 0-2-1.5-4-3-5 .5-1 1-2.5 1-4 0-2.5-1.5-5-4-5zm-2 5c.5 0 1 .5 1 1s-.5 1-1 1-1-.5-1-1 .5-1 1-1zm4 0c.5 0 1 .5 1 1s-.5 1-1 1-1-.5-1-1 .5-1 1-1zm-2 3c1 0 2 .5 2 1s-1 1-2 1-2-.5-2-1 1-1 2-1z"/>
  </svg>
)

const TvIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="13" rx="2" ry="2"/>
    <polyline points="8 21 12 17 16 21"/>
  </svg>
)

const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const BackIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
)

const CopyIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
)

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
)

const LinkIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
  </svg>
)

const ChevronIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
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

function isValidExternalUrl(url: string | undefined): boolean {
  if (!url) return false
  const lowerUrl = url.toLowerCase().trim()
  if (dangerousSchemes.some(scheme => lowerUrl.startsWith(scheme))) {
    return false
  }
  return lowerUrl.startsWith('http://') || lowerUrl.startsWith('https://')
}

function isValidDeepLink(url: string | undefined): boolean {
  if (!url) return false
  const lowerUrl = url.toLowerCase().trim()
  if (dangerousSchemes.some(scheme => lowerUrl.startsWith(scheme))) {
    return false
  }
  return lowerUrl.includes('://')
}

function detectPlatform(): string | null {
  if (typeof window === 'undefined' || !navigator?.userAgent) {
    return null
  }
  const ua = navigator.userAgent.toLowerCase()
  if (/iphone|ipad|ipod/.test(ua)) return 'ios'
  if (/android/.test(ua)) {
    if (/tv|television|smart-tv|smarttv/.test(ua)) return 'androidTV'
    return 'android'
  }
  if (/macintosh|mac os x/.test(ua)) return 'macos'
  if (/windows/.test(ua)) return 'windows'
  if (/linux/.test(ua)) return 'linux'
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

  useEffect(() => {
    setDetectedPlatform(detectPlatform())
  }, [])

  // Lock body scroll when modal is open
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalStyle
    }
  }, [])

  const getLocalizedText = (text: LocalizedText | undefined): string => {
    if (!text) return ''
    const lang = i18n.language || 'en'
    return text[lang] || text['en'] || text['ru'] || Object.values(text)[0] || ''
  }

  const getPlatformName = (platformKey: string): string => {
    if (!appConfig?.platformNames?.[platformKey]) {
      return platformKey
    }
    return getLocalizedText(appConfig.platformNames[platformKey])
  }

  const availablePlatforms = useMemo(() => {
    if (!appConfig?.platforms) return []
    const available = platformOrder.filter(
      (key) => appConfig.platforms[key] && appConfig.platforms[key].length > 0
    )
    if (detectedPlatform && available.includes(detectedPlatform)) {
      const filtered = available.filter(p => p !== detectedPlatform)
      return [detectedPlatform, ...filtered]
    }
    return available
  }, [appConfig, detectedPlatform])

  const platformApps = useMemo(() => {
    if (!selectedPlatform || !appConfig?.platforms?.[selectedPlatform]) return []
    return appConfig.platforms[selectedPlatform]
  }, [selectedPlatform, appConfig])

  const copySubscriptionLink = async () => {
    if (!appConfig?.subscriptionUrl) return
    try {
      await navigator.clipboard.writeText(appConfig.subscriptionUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
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

  const handleConnect = (app: AppInfo) => {
    if (!app.deepLink || !isValidDeepLink(app.deepLink)) {
      console.warn('Invalid or missing deep link:', app.deepLink)
      return
    }
    const lang = i18n.language?.startsWith('ru') ? 'ru' : 'en'
    const redirectUrl = `${window.location.origin}/miniapp/redirect.html?url=${encodeURIComponent(app.deepLink)}&lang=${lang}`
    const isCustomScheme = !/^https?:\/\//i.test(app.deepLink)
    const tg = (window as unknown as { Telegram?: { WebApp?: { openLink?: (url: string, options?: object) => void } } }).Telegram?.WebApp
    if (isCustomScheme && tg?.openLink) {
      try {
        tg.openLink(redirectUrl, { try_instant_view: false, try_browser: true })
        return
      } catch (e) {
        console.warn('tg.openLink failed:', e)
      }
    }
    window.location.href = redirectUrl
  }

  // Modal wrapper - centered on desktop, top on mobile
  const ModalWrapper = ({ children }: { children: React.ReactNode }) => (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-start sm:items-center justify-center overflow-y-auto"
      style={{
        padding: '1rem',
        paddingTop: 'calc(3rem + env(safe-area-inset-top, 0px))',
        paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))'
      }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-dark-900 rounded-2xl border border-dark-700/50 overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )

  // Loading state
  if (isLoading) {
    return (
      <ModalWrapper>
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-3 border-accent-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </ModalWrapper>
    )
  }

  // Error state
  if (error || !appConfig) {
    return (
      <ModalWrapper>
        <div className="text-center p-6">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-error-500/10 flex items-center justify-center">
            <span className="text-2xl">😕</span>
          </div>
          <p className="text-dark-300 mb-4 text-sm">{t('common.error')}</p>
          <button onClick={onClose} className="btn-primary text-sm px-6">
            {t('common.close')}
          </button>
        </div>
      </ModalWrapper>
    )
  }

  // No subscription
  if (!appConfig.hasSubscription) {
    return (
      <ModalWrapper>
        <div className="text-center p-6">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-warning-500/10 flex items-center justify-center">
            <span className="text-2xl">📱</span>
          </div>
          <h3 className="font-semibold text-dark-100 mb-1">{t('subscription.connection.title')}</h3>
          <p className="text-dark-400 text-sm mb-4">{t('subscription.connection.noSubscription')}</p>
          <button onClick={onClose} className="btn-primary text-sm px-6">
            {t('common.close')}
          </button>
        </div>
      </ModalWrapper>
    )
  }

  // Step 1: Select platform
  if (!selectedPlatform) {
    return (
      <ModalWrapper>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent-500/10 flex items-center justify-center">
              <span className="text-lg">📱</span>
            </div>
            <div>
              <h2 className="font-semibold text-dark-100 text-sm">{t('subscription.connection.title')}</h2>
              <p className="text-xs text-dark-500">{t('subscription.connection.selectDevice')}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-dark-800 text-dark-400">
            <CloseIcon />
          </button>
        </div>

        {/* Platforms grid */}
        <div className="p-4">
          <div className="grid grid-cols-3 gap-2">
            {availablePlatforms.map((platform) => {
              const IconComponent = platformIconComponents[platform]
              const isDetected = platform === detectedPlatform
              return (
                <button
                  key={platform}
                  onClick={() => setSelectedPlatform(platform)}
                  className={`relative p-3 rounded-xl border transition-all flex flex-col items-center gap-2 ${
                    isDetected
                      ? 'bg-accent-500/10 border-accent-500/50'
                      : 'bg-dark-800/50 border-dark-700/50 hover:border-dark-600'
                  }`}
                >
                  {isDetected && (
                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[8px] font-medium bg-accent-500 text-white whitespace-nowrap">
                      {t('subscription.connection.yourDevice')}
                    </div>
                  )}
                  <div className={isDetected ? 'text-accent-400' : 'text-dark-400'}>
                    {IconComponent && <IconComponent />}
                  </div>
                  <span className={`text-xs font-medium ${isDetected ? 'text-accent-300' : 'text-dark-300'}`}>
                    {getPlatformName(platform)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Copy link */}
        <div className="px-4 pb-4">
          <button
            onClick={copySubscriptionLink}
            className={`w-full p-2.5 rounded-xl border-2 border-dashed transition-all flex items-center justify-center gap-2 text-sm ${
              copied
                ? 'border-success-500/50 bg-success-500/10 text-success-400'
                : 'border-dark-700 hover:border-accent-500/50 text-dark-400'
            }`}
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
            {copied ? t('subscription.connection.copied') : t('subscription.connection.copyLink')}
          </button>
        </div>
      </ModalWrapper>
    )
  }

  // Step 2: Select app
  if (!selectedApp) {
    return (
      <ModalWrapper>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-800">
          <div className="flex items-center gap-2">
            <button onClick={() => setSelectedPlatform(null)} className="p-2 -ml-2 rounded-xl hover:bg-dark-800 text-dark-400">
              <BackIcon />
            </button>
            <div>
              <h2 className="font-semibold text-dark-100 text-sm">{getPlatformName(selectedPlatform)}</h2>
              <p className="text-xs text-dark-500">{t('subscription.connection.selectApp')}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-dark-800 text-dark-400">
            <CloseIcon />
          </button>
        </div>

        {/* Apps list */}
        <div className="p-4 max-h-[50vh] overflow-y-auto">
          {platformApps.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-dark-800 flex items-center justify-center">
                <span className="text-xl">📭</span>
              </div>
              <p className="text-dark-500 text-sm">{t('subscription.connection.noApps')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {platformApps.map((app) => (
                <button
                  key={app.id}
                  onClick={() => setSelectedApp(app)}
                  className="w-full p-3 rounded-xl bg-dark-800/50 border border-dark-700/50 hover:border-dark-600 transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-dark-700 flex items-center justify-center text-base">
                      {app.isFeatured ? '⭐' : '📦'}
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-dark-100 text-sm">{app.name}</span>
                        {app.isFeatured && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-accent-500/20 text-accent-400">
                            {t('subscription.connection.featured')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-dark-500">
                    <ChevronIcon />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </ModalWrapper>
    )
  }

  // Step 3: App instructions
  return (
    <ModalWrapper>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-dark-800">
        <div className="flex items-center gap-2">
          <button onClick={() => setSelectedApp(null)} className="p-2 -ml-2 rounded-xl hover:bg-dark-800 text-dark-400">
            <BackIcon />
          </button>
          <div>
            <h2 className="font-semibold text-dark-100 text-sm">{selectedApp.name}</h2>
            <p className="text-xs text-dark-500">{t('subscription.connection.instructions') || 'Инструкция'}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-dark-800 text-dark-400">
          <CloseIcon />
        </button>
      </div>

      {/* Instructions */}
      <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
        {/* Step 1: Install */}
        {selectedApp.installationStep && (
          <div className="p-3 rounded-xl bg-dark-800/50 border border-dark-700/50">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-accent-500/20 flex items-center justify-center text-xs font-bold text-accent-400 shrink-0 mt-0.5">1</div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-dark-100 text-sm mb-1">{t('subscription.connection.installApp')}</h3>
                <p className="text-xs text-dark-400 mb-2">
                  {getLocalizedText(selectedApp.installationStep.description)}
                </p>
                {selectedApp.installationStep.buttons && selectedApp.installationStep.buttons.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedApp.installationStep.buttons
                      .filter((btn) => isValidExternalUrl(btn.buttonLink))
                      .map((btn, idx) => (
                      <a
                        key={idx}
                        href={btn.buttonLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-700 text-dark-200 text-xs hover:bg-dark-600 transition-all"
                      >
                        <LinkIcon />
                        {getLocalizedText(btn.buttonText)}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Add subscription */}
        {selectedApp.addSubscriptionStep && (
          <div className="p-3 rounded-xl bg-dark-800/50 border border-dark-700/50">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-accent-500/20 flex items-center justify-center text-xs font-bold text-accent-400 shrink-0 mt-0.5">2</div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-dark-100 text-sm mb-1">{t('subscription.connection.addSubscription')}</h3>
                <p className="text-xs text-dark-400 mb-2">
                  {getLocalizedText(selectedApp.addSubscriptionStep.description)}
                </p>
                <div className="space-y-1.5">
                  {selectedApp.deepLink && (
                    <button
                      onClick={() => handleConnect(selectedApp)}
                      className="btn-primary w-full py-2 text-sm flex items-center justify-center gap-2"
                    >
                      <LinkIcon />
                      {t('subscription.connection.addToApp', { appName: selectedApp.name })}
                    </button>
                  )}
                  <button
                    onClick={copySubscriptionLink}
                    className={`w-full p-2 rounded-lg border transition-all flex items-center justify-center gap-2 text-xs ${
                      copied
                        ? 'border-success-500/50 bg-success-500/10 text-success-400'
                        : 'border-dark-700 hover:border-dark-600 bg-dark-800/50 text-dark-300'
                    }`}
                  >
                    {copied ? <CheckIcon /> : <CopyIcon />}
                    {copied ? t('subscription.connection.copied') : t('subscription.connection.copyLink')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Connect */}
        {selectedApp.connectAndUseStep && (
          <div className="p-3 rounded-xl bg-dark-800/50 border border-dark-700/50">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-success-500/20 flex items-center justify-center text-xs font-bold text-success-400 shrink-0 mt-0.5">3</div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-dark-100 text-sm mb-1">{t('subscription.connection.connectVpn')}</h3>
                <p className="text-xs text-dark-400">
                  {getLocalizedText(selectedApp.connectAndUseStep.description)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-dark-800">
        <button onClick={onClose} className="btn-secondary w-full text-sm">
          {t('common.close')}
        </button>
      </div>
    </ModalWrapper>
  )
}
