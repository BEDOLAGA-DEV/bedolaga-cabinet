import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { subscriptionApi } from '../api/subscription'
import { useTelegramWebApp } from '../hooks/useTelegramWebApp'
import type { AppInfo, AppConfig, LocalizedText } from '../types'

interface ConnectionModalProps {
  onClose: () => void
}

const CloseIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const CopyIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
)

const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
)

const LinkIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
  </svg>
)

const ChevronIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
)

const BackIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
)

const HappIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 50 50" fill="currentColor">
    <path d="M22.3264 3H12.3611L9.44444 20.1525L21.3542 8.22034L22.3264 3Z"/>
    <path d="M10.9028 20.1525L22.8125 8.22034L20.8681 21.1469H28.4028L27.9167 21.6441L20.8681 28.8531H19.4097V30.5932L7.5 42.5254L10.9028 20.1525Z"/>
    <path d="M41.0417 8.22034L28.8889 20.1525L31.684 3H41.7708L41.0417 8.22034Z"/>
    <path d="M30.3472 20.1525L42.5 8.22034L38.6111 30.3446L26.9444 42.5254L29.0104 28.8531H22.3264L29.6181 21.1469H30.3472V20.1525Z"/>
    <path d="M40.0694 30.3446L28.4028 42.5254L27.9167 47H37.8819L40.0694 30.3446Z"/>
    <path d="M18.6806 47H8.47222L8.95833 42.5254L20.8681 30.5932L18.6806 47Z"/>
  </svg>
)

const ClashMetaIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 50 50" fill="currentColor">
    <path fillRule="evenodd" clipRule="evenodd" d="M4.99239 5.21742C4.0328 5.32232 3.19446 5.43999 3.12928 5.47886C2.94374 5.58955 2.96432 33.4961 3.14997 33.6449C3.2266 33.7062 4.44146 34.002 5.84976 34.3022C7.94234 34.7483 8.60505 34.8481 9.47521 34.8481C10.3607 34.8481 10.5706 34.8154 10.7219 34.6541C10.8859 34.479 10.9066 33.7222 10.9338 26.9143L10.9638 19.3685L11.2759 19.1094C11.6656 18.7859 12.1188 18.7789 12.5285 19.0899C12.702 19.2216 14.319 20.624 16.1219 22.2061C17.9247 23.7883 19.5136 25.1104 19.6527 25.144C19.7919 25.1777 20.3714 25.105 20.9406 24.9825C22.6144 24.6221 23.3346 24.5424 24.9233 24.5421C26.4082 24.5417 27.8618 24.71 29.2219 25.0398C29.6074 25.1333 30.0523 25.1784 30.2107 25.1399C30.369 25.1016 31.1086 24.5336 31.8543 23.8777C33.3462 22.5653 33.6461 22.3017 35.4359 20.7293C36.1082 20.1388 36.6831 19.6313 36.7137 19.6017C37.5681 18.7742 38.0857 18.6551 38.6132 19.1642L38.9383 19.478V34.5138L39.1856 34.6809C39.6343 34.9843 41.2534 34.9022 43.195 34.4775C44.1268 34.2737 45.2896 34.0291 45.779 33.9339C46.2927 33.8341 46.7276 33.687 46.8079 33.5861C47.0172 33.3228 47.0109 5.87708 46.8014 5.6005C46.6822 5.4431 46.2851 5.37063 44.605 5.1996C43.477 5.08482 42.2972 5.00505 41.983 5.02223L41.4121 5.05368L35.4898 10.261C27.3144 17.4495 27.7989 17.0418 27.5372 16.9533C27.4148 16.912 26.1045 16.8746 24.6253 16.8702C22.0674 16.8626 21.9233 16.8513 21.6777 16.6396C21.0693 16.115 17.2912 12.8028 14.5726 10.4108C12.9548 8.98729 10.9055 7.18761 10.0186 6.41134L8.40584 5L7.5715 5.01331C7.11256 5.02072 5.95198 5.11252 4.99239 5.21742Z"/>
  </svg>
)

const ShadowrocketIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.2394 36.832L16.5386 39.568C16.5386 39.568 13.7182 36.832 11.8379 33.184C9.95756 29.536 16.5386 23.152 16.5386 23.152M21.2394 36.832H28.7606M21.2394 36.832C21.2394 36.832 15.5985 24.064 17.4788 16.768C19.3591 9.472 25 4 25 4C25 4 30.6409 9.472 32.5212 16.768C34.4015 24.064 28.7606 36.832 28.7606 36.832M28.7606 36.832L33.4614 39.568C33.4614 39.568 36.2818 36.832 38.1621 33.184C40.0424 29.536 33.4614 23.152 33.4614 23.152M25 46L26.8803 40.528H23.1197L25 46ZM25.9402 17.68C26.4594 18.1837 26.4594 19.0003 25.9402 19.504C25.4209 20.0077 24.5791 20.0077 24.0598 19.504C23.5406 19.0003 23.5406 18.1837 24.0598 17.68C24.5791 17.1763 25.4209 17.1763 25.9402 17.68Z"/>
  </svg>
)

const StreisandIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 50 50" fill="currentColor">
    <path d="M25 46L24.2602 47.0076C24.7027 47.3325 25.3054 47.3306 25.7459 47.0031L25 46ZM6.14773 32.1591H4.89773C4.89773 32.557 5.0872 32.9312 5.40797 33.1667L6.14773 32.1591ZM43.6136 32.1591L44.3595 33.1622C44.6767 32.9263 44.8636 32.5543 44.8636 32.1591H43.6136ZM6.14773 19.9886L5.42485 18.9689C5.09421 19.2032 4.89773 19.5834 4.89773 19.9886H6.14773ZM25 6.625L25.729 5.6096L25.0046 5.08952L24.2771 5.60522L25 6.625ZM43.6136 19.9886H44.8636C44.8636 19.586 44.6697 19.208 44.3426 18.9732L43.6136 19.9886ZM25 46L25.7398 44.9924L6.88748 31.1515L6.14773 32.1591L5.40797 33.1667L24.2602 47.0076L25 46ZM43.6136 32.1591L42.8678 31.156L24.2541 44.9969L25 46L25.7459 47.0031L44.3595 33.1622L43.6136 32.1591Z"/>
  </svg>
)

const getAppIcon = (appName: string): React.ReactNode => {
  const name = appName.toLowerCase()
  if (name.includes('happ')) return <HappIcon />
  if (name.includes('shadowrocket') || name.includes('rocket')) return <ShadowrocketIcon />
  if (name.includes('streisand')) return <StreisandIcon />
  if (name.includes('clash') || name.includes('meta') || name.includes('verge')) return <ClashMetaIcon />
  return <span className="text-lg">📦</span>
}

const platformOrder = ['ios', 'android', 'windows', 'macos', 'linux', 'androidTV', 'appleTV']
const dangerousSchemes = ['javascript:', 'data:', 'vbscript:', 'file:']

function isValidExternalUrl(url: string | undefined): boolean {
  if (!url) return false
  const lowerUrl = url.toLowerCase().trim()
  if (dangerousSchemes.some(scheme => lowerUrl.startsWith(scheme))) return false
  return lowerUrl.startsWith('http://') || lowerUrl.startsWith('https://')
}

function isValidDeepLink(url: string | undefined): boolean {
  if (!url) return false
  const lowerUrl = url.toLowerCase().trim()
  if (dangerousSchemes.some(scheme => lowerUrl.startsWith(scheme))) return false
  return lowerUrl.includes('://')
}

function detectPlatform(): string | null {
  if (typeof window === 'undefined' || !navigator?.userAgent) return null
  const ua = navigator.userAgent.toLowerCase()
  if (/iphone|ipad|ipod/.test(ua)) return 'ios'
  if (/android/.test(ua)) return /tv|television/.test(ua) ? 'androidTV' : 'android'
  if (/macintosh|mac os x/.test(ua)) return 'macos'
  if (/windows/.test(ua)) return 'windows'
  if (/linux/.test(ua)) return 'linux'
  return null
}

function useIsMobile() {
  // Initialize synchronously to avoid flash between desktop/mobile layouts
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < 768
  })
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return isMobile
}

export default function ConnectionModal({ onClose }: ConnectionModalProps) {
  const { t, i18n } = useTranslation()
  const [selectedApp, setSelectedApp] = useState<AppInfo | null>(null)
  const [copied, setCopied] = useState(false)
  const [detectedPlatform, setDetectedPlatform] = useState<string | null>(null)
  const [showAppSelector, setShowAppSelector] = useState(false)

  const { isTelegramWebApp, isFullscreen, safeAreaInset, contentSafeAreaInset } = useTelegramWebApp()
  const isMobileScreen = useIsMobile()
  // Use mobile layout only on small screens, even in Telegram Desktop
  const isMobile = isMobileScreen

  const safeBottom = isTelegramWebApp ? Math.max(safeAreaInset.bottom, contentSafeAreaInset.bottom) : 0
  // In fullscreen mode, add +45px for Telegram native controls (close/menu buttons in corners)
  const safeTop = isTelegramWebApp ? Math.max(safeAreaInset.top, contentSafeAreaInset.top) + (isFullscreen ? 45 : 0) : 0

  const { data: appConfig, isLoading, error } = useQuery<AppConfig>({
    queryKey: ['appConfig'],
    queryFn: () => subscriptionApi.getAppConfig(),
  })

  useEffect(() => {
    setDetectedPlatform(detectPlatform())
  }, [])

  useEffect(() => {
    if (!appConfig?.platforms || selectedApp) return
    const platform = detectedPlatform || platformOrder.find(p => appConfig.platforms[p]?.length > 0)
    if (!platform || !appConfig.platforms[platform]?.length) return
    const apps = appConfig.platforms[platform]
    const app = apps.find(a => a.isFeatured) || apps[0]
    if (app) setSelectedApp(app)
  }, [appConfig, detectedPlatform, selectedApp])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const getLocalizedText = (text: LocalizedText | undefined): string => {
    if (!text) return ''
    const lang = i18n.language || 'en'
    return text[lang] || text['en'] || text['ru'] || Object.values(text)[0] || ''
  }

  const availablePlatforms = useMemo(() => {
    if (!appConfig?.platforms) return []
    const available = platformOrder.filter(key => appConfig.platforms[key]?.length > 0)
    if (detectedPlatform && available.includes(detectedPlatform)) {
      return [detectedPlatform, ...available.filter(p => p !== detectedPlatform)]
    }
    return available
  }, [appConfig, detectedPlatform])

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
    if (!app.deepLink || !isValidDeepLink(app.deepLink)) return
    const lang = i18n.language?.startsWith('ru') ? 'ru' : 'en'
    const redirectUrl = `${window.location.origin}/miniapp/redirect.html?url=${encodeURIComponent(app.deepLink)}&lang=${lang}`
    const tg = (window as unknown as { Telegram?: { WebApp?: { openLink?: (url: string, options?: object) => void } } }).Telegram?.WebApp
    if (tg?.openLink) {
      try {
        tg.openLink(redirectUrl, { try_instant_view: false, try_browser: true })
        return
      } catch { /* fallback */ }
    }
    window.location.href = redirectUrl
  }

  // Desktop modal wrapper - compact centered modal with max height
  const DesktopWrapper = ({ children }: { children: React.ReactNode }) => (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md max-h-[85vh] bg-dark-900/95 backdrop-blur-xl rounded-3xl border border-dark-700/50 shadow-2xl flex flex-col overflow-hidden animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Desktop close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-2 rounded-xl bg-dark-800/80 hover:bg-dark-700 text-dark-400 hover:text-dark-200 transition-colors"
        >
          <CloseIcon />
        </button>
        {children}
      </div>
    </div>
  )

  // Mobile fullscreen wrapper - like React Native Modal with animationType="slide"
  // Use portal to render directly in body, avoiding transform/filter issues with fixed positioning
  const MobileWrapper = ({ children }: { children: React.ReactNode }) => {
    const content = (
      <>
        {/* Backdrop */}
        <div className="fixed inset-0 z-[9998] bg-black/50 animate-fade-in" onClick={onClose} />
        {/* Modal - fullscreen overlay */}
        <div
          className="fixed inset-0 z-[9999] bg-dark-900/95 backdrop-blur-xl flex flex-col animate-slide-up"
          style={{
            paddingTop: safeTop ? `${safeTop}px` : 'env(safe-area-inset-top, 0px)',
            paddingBottom: safeBottom ? `${safeBottom}px` : 'env(safe-area-inset-bottom, 0px)'
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-4 z-10 p-2.5 rounded-full bg-dark-800/80 text-dark-200 active:bg-dark-700"
            style={{ top: safeTop ? `${safeTop + 16}px` : 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
          >
            <CloseIcon />
          </button>
          {children}
        </div>
      </>
    )
    
    if (typeof document !== 'undefined') {
      return createPortal(content, document.body)
    }
    return content
  }

  const Wrapper = isMobile ? MobileWrapper : DesktopWrapper

  // Loading
  if (isLoading) {
    return (
      <Wrapper>
        <div className={`${isMobile ? 'flex-1' : ''} flex items-center justify-center p-12`}>
          <div className="w-10 h-10 border-3 border-accent-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </Wrapper>
    )
  }

  // Error
  if (error || !appConfig) {
    return (
      <Wrapper>
        <div className={`${isMobile ? 'flex-1' : ''} flex flex-col items-center justify-center p-8 text-center`}>
          <div className="text-5xl mb-4">😕</div>
          <p className="text-dark-300 text-lg mb-6">{t('common.error')}</p>
          <button onClick={onClose} className="btn-primary px-8 py-3 text-base">{t('common.close')}</button>
        </div>
      </Wrapper>
    )
  }

  // No subscription
  if (!appConfig.hasSubscription) {
    return (
      <Wrapper>
        <div className={`${isMobile ? 'flex-1' : ''} flex flex-col items-center justify-center p-8 text-center`}>
          <div className="text-5xl mb-4">📱</div>
          <h3 className="font-bold text-dark-100 text-xl mb-2">{t('subscription.connection.title')}</h3>
          <p className="text-dark-400 mb-6">{t('subscription.connection.noSubscription')}</p>
          <button onClick={onClose} className="btn-primary px-8 py-3 text-base">{t('common.close')}</button>
        </div>
      </Wrapper>
    )
  }

  // App selector
  if (showAppSelector) {
    const platformNames: Record<string, string> = {
      ios: 'iOS',
      android: 'Android',
      windows: 'Windows',
      macos: 'macOS',
      linux: 'Linux',
      androidTV: 'Android TV',
      appleTV: 'Apple TV'
    }

    return (
      <Wrapper>
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-dark-800">
          <button onClick={() => setShowAppSelector(false)} className="p-2 -ml-2 rounded-xl hover:bg-dark-800 text-dark-300">
            <BackIcon />
          </button>
          <h2 className="font-bold text-dark-100 text-lg">{t('subscription.connection.selectApp')}</h2>
        </div>

        {/* Apps grouped by platform */}
        <div className={`${isMobile ? 'flex-1' : 'max-h-[60vh]'} overflow-y-auto p-4 space-y-5`}>
          {availablePlatforms.map(platform => {
            const apps = appConfig.platforms[platform]
            if (!apps?.length) return null
            const isCurrentPlatform = platform === detectedPlatform

            return (
              <div key={platform}>
                {/* Platform header */}
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className={`text-sm font-semibold ${isCurrentPlatform ? 'text-accent-400' : 'text-dark-400'}`}>
                    {platformNames[platform] || platform}
                  </span>
                  {isCurrentPlatform && (
                    <span className="text-xs text-accent-500 bg-accent-500/10 px-2 py-0.5 rounded-full">
                      {t('subscription.connection.yourDevice')}
                    </span>
                  )}
                </div>

                {/* Apps for this platform */}
                <div className="space-y-2">
                  {apps.map(app => (
                    <button
                      key={app.id}
                      onClick={() => { setSelectedApp(app); setShowAppSelector(false) }}
                      className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all ${
                        selectedApp?.id === app.id
                          ? 'bg-accent-500/15 ring-2 ring-accent-500/50'
                          : 'bg-dark-800/40 hover:bg-dark-800/70 active:bg-dark-800'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-dark-700 flex items-center justify-center text-dark-200">
                        {getAppIcon(app.name)}
                      </div>
                      <span className="font-medium text-dark-100 flex-1 text-left">{app.name}</span>
                      {app.isFeatured && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-accent-500/20 text-accent-400">
                          {t('subscription.connection.featured')}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </Wrapper>
    )
  }

  // Main view
  return (
    <Wrapper>
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <h2 className="text-lg font-bold text-dark-100 flex-1">{t('subscription.connection.title')}</h2>
      </div>

      <div className="px-4 pb-4 border-b border-dark-800">
        <button
          onClick={() => setShowAppSelector(true)}
          className="w-full flex items-center gap-4 p-3 rounded-2xl bg-dark-800/50 hover:bg-dark-800 transition-colors"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-500/30 to-accent-600/10 flex items-center justify-center text-accent-400">
            {selectedApp && getAppIcon(selectedApp.name)}
          </div>
          <div className="flex-1 text-left">
            <div className="font-bold text-dark-100 text-lg">{selectedApp?.name}</div>
            <div className="text-sm text-accent-400">{t('subscription.connection.changeApp') || 'Сменить приложение'}</div>
          </div>
          <ChevronIcon />
        </button>
      </div>

      {/* Content */}
      <div className={`${isMobile ? 'flex-1' : 'max-h-[60vh]'} overflow-y-auto p-4 space-y-4`}>
        {/* Step 1 */}
        {selectedApp?.installationStep && (
          <div className="p-4 rounded-2xl bg-dark-800/30">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-accent-500/20 flex items-center justify-center text-sm font-bold text-accent-400">1</div>
              <h3 className="font-semibold text-dark-100">{t('subscription.connection.installApp')}</h3>
            </div>
            <p className="text-dark-300 mb-3 leading-relaxed">{getLocalizedText(selectedApp.installationStep.description)}</p>
            {selectedApp.installationStep.buttons && selectedApp.installationStep.buttons.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedApp.installationStep.buttons.filter(btn => isValidExternalUrl(btn.buttonLink)).map((btn, idx) => (
                  <a
                    key={idx}
                    href={btn.buttonLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-dark-700 text-dark-200 text-sm font-medium hover:bg-dark-600 transition-colors"
                  >
                    <LinkIcon />
                    {getLocalizedText(btn.buttonText)}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2 */}
        {selectedApp?.addSubscriptionStep && (
          <div className="p-4 rounded-2xl bg-dark-800/30">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-accent-500/20 flex items-center justify-center text-sm font-bold text-accent-400">2</div>
              <h3 className="font-semibold text-dark-100">{t('subscription.connection.addSubscription')}</h3>
            </div>
            <p className="text-dark-300 mb-4 leading-relaxed">{getLocalizedText(selectedApp.addSubscriptionStep.description)}</p>

            <div className="space-y-3">
              {selectedApp.deepLink && (
                <button
                  onClick={() => handleConnect(selectedApp)}
                  className="btn-primary w-full py-3 text-base font-semibold flex items-center justify-center gap-2"
                >
                  <LinkIcon />
                  {t('subscription.connection.addToApp', { appName: selectedApp.name })}
                </button>
              )}
              <button
                onClick={copySubscriptionLink}
                className={`w-full py-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 text-base font-medium ${
                  copied
                    ? 'border-success-500 bg-success-500/10 text-success-400'
                    : 'border-dark-600 hover:border-dark-500 text-dark-300 hover:text-dark-200'
                }`}
              >
                {copied ? <CheckIcon /> : <CopyIcon />}
                {copied ? t('subscription.connection.copied') : t('subscription.connection.copyLink')}
              </button>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {selectedApp?.connectAndUseStep && (
          <div className="p-4 rounded-2xl bg-success-500/5 border border-success-500/20">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-success-500/20 flex items-center justify-center text-sm font-bold text-success-400">3</div>
              <h3 className="font-semibold text-dark-100">{t('subscription.connection.connectVpn')}</h3>
            </div>
            <p className="text-dark-300 leading-relaxed">{getLocalizedText(selectedApp.connectAndUseStep.description)}</p>
          </div>
        )}
      </div>

    </Wrapper>
  )
}
