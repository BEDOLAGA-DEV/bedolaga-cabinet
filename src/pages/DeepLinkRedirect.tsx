import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { brandingApi } from '../api/branding'

type Status = 'countdown' | 'fallback' | 'error'

// App schemes configuration - same as miniapp
const appSchemes = [
  { scheme: 'happ://', icon: 'H', name: 'Happ' },
  { scheme: 'flclash://', icon: 'F', name: 'FlClash' },
  { scheme: 'clash://', icon: 'C', name: 'Clash Meta' },
  { scheme: 'sing-box://', icon: 'S', name: 'sing-box' },
  { scheme: 'v2rayng://', icon: 'V', name: 'v2rayNG' },
  { scheme: 'sub://', icon: 'R', name: 'Shadowrocket' },
  { scheme: 'shadowrocket://', icon: 'R', name: 'Shadowrocket' },
  { scheme: 'hiddify://', icon: 'H', name: 'Hiddify' },
  { scheme: 'streisand://', icon: 'S', name: 'Streisand' },
  { scheme: 'quantumult://', icon: 'Q', name: 'Quantumult X' },
  { scheme: 'surge://', icon: 'S', name: 'Surge' },
  { scheme: 'loon://', icon: 'L', name: 'Loon' },
  { scheme: 'nekobox://', icon: 'N', name: 'NekoBox' },
  { scheme: 'v2box://', icon: 'V', name: 'V2Box' },
]

const COUNTDOWN_SECONDS = 5

// Validate deep link to prevent javascript: and other dangerous schemes
const isValidDeepLink = (url: string): boolean => {
  if (!url) return false
  const lowerUrl = url.toLowerCase().trim()
  // Block dangerous schemes
  const dangerousSchemes = ['javascript:', 'data:', 'vbscript:', 'file:']
  if (dangerousSchemes.some(scheme => lowerUrl.startsWith(scheme))) {
    return false
  }
  // Only allow known app schemes
  return appSchemes.some(app => lowerUrl.startsWith(app.scheme))
}

export default function DeepLinkRedirect() {
  const { i18n } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<Status>('countdown')
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS)
  const [copied, setCopied] = useState(false)
  const fallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Get branding
  const { data: branding } = useQuery({
    queryKey: ['branding'],
    queryFn: brandingApi.getBranding,
    staleTime: 60000,
  })

  const projectName = branding ? branding.name : (import.meta.env.VITE_APP_NAME || 'VPN')
  const logoLetter = branding?.logo_letter || import.meta.env.VITE_APP_LOGO || 'V'
  const logoUrl = branding ? brandingApi.getLogoUrl(branding) : null

  // Get parameters
  const deepLink = searchParams.get('url') || searchParams.get('deeplink') || ''
  const subscriptionUrl = searchParams.get('sub') || ''
  const appParam = searchParams.get('app') || ''

  // Detect app from deep link
  const appInfo = deepLink
    ? appSchemes.find(a => deepLink.toLowerCase().startsWith(a.scheme))
    : null
  const appName = appInfo?.name || appParam || 'VPN'
  const appIcon = appInfo?.icon || appName[0]?.toUpperCase() || 'V'

  // Translations
  const texts = {
    en: {
      connecting: 'Connecting to',
      redirecting: 'Redirecting in',
      seconds: 'seconds',
      manual: 'If nothing happens, click the button below.',
      openApp: 'Open App',
      copyLink: 'Copy subscription link',
      copied: 'Copied!',
      tryAgain: 'Try again',
      backToCabinet: 'Back to cabinet',
      errorTitle: 'Error',
      errorDesc: 'Connection link is missing',
      goToSubscription: 'Go to subscription',
      howToAdd: 'How to add manually:',
      step1: 'Copy the link using the button above',
      step2: 'Open the app',
      step3: 'Find "+" or "Add subscription"',
      step4: 'Select "From clipboard" or "Paste link"',
    },
    ru: {
      connecting: 'Подключение к',
      redirecting: 'Перенаправление через',
      seconds: 'сек',
      manual: 'Если ничего не происходит, нажмите кнопку ниже.',
      openApp: 'Открыть приложение',
      copyLink: 'Скопировать ссылку подписки',
      copied: 'Скопировано!',
      tryAgain: 'Попробовать снова',
      backToCabinet: 'Вернуться в кабинет',
      errorTitle: 'Ошибка',
      errorDesc: 'Ссылка для подключения не найдена',
      goToSubscription: 'Перейти к подписке',
      howToAdd: 'Как добавить вручную:',
      step1: 'Скопируйте ссылку кнопкой выше',
      step2: 'Откройте приложение',
      step3: 'Найдите "+" или "Добавить подписку"',
      step4: 'Выберите "Из буфера" или "Вставить ссылку"',
    }
  }

  const lang = i18n.language?.startsWith('ru') ? 'ru' : 'en'
  const txt = texts[lang]

  // Open deep link - same as miniapp, just window.location.href
  const openDeepLink = useCallback(() => {
    if (!deepLink || !isValidDeepLink(deepLink)) return
    window.location.href = deepLink
  }, [deepLink])

  // Countdown timer effect
  useEffect(() => {
    if (!deepLink || !isValidDeepLink(deepLink)) {
      setStatus('error')
      return
    }

    if (status !== 'countdown') return

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          openDeepLink()
          // Show fallback after a delay - store ref for cleanup
          fallbackTimeoutRef.current = setTimeout(() => setStatus('fallback'), 2000)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      clearInterval(timer)
      // Cleanup fallback timeout on unmount
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current)
        fallbackTimeoutRef.current = null
      }
    }
  }, [deepLink, status, openDeepLink])

  const handleCopyLink = async () => {
    const linkToCopy = subscriptionUrl || deepLink
    // Clear previous timeout to prevent stacking
    if (copiedTimeoutRef.current) {
      clearTimeout(copiedTimeoutRef.current)
    }
    try {
      await navigator.clipboard.writeText(linkToCopy)
      setCopied(true)
      copiedTimeoutRef.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = linkToCopy
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      copiedTimeoutRef.current = setTimeout(() => setCopied(false), 2000)
    }
  }

  // Cleanup copied timeout on unmount
  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) {
        clearTimeout(copiedTimeoutRef.current)
      }
    }
  }, [])

  // Progress percentage
  const progress = ((COUNTDOWN_SECONDS - countdown) / COUNTDOWN_SECONDS) * 100

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent-500/10 via-transparent to-transparent" />

      <div className="relative text-center max-w-sm w-full">
        {/* Logo with pulse animation */}
        <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center mb-6 shadow-lg shadow-accent-500/30 overflow-hidden animate-pulse">
          {branding?.has_custom_logo && logoUrl ? (
            <img src={logoUrl} alt={projectName || 'Logo'} className="w-full h-full object-cover" />
          ) : (
            <span className="text-white font-bold text-3xl">{logoLetter}</span>
          )}
        </div>

        <h1 className="text-2xl font-bold text-dark-50 mb-1">{projectName || 'VPN'}</h1>

        {status !== 'error' && (
          <p className="text-dark-400 mb-6">{txt.connecting} {appName}...</p>
        )}

        {/* Countdown State */}
        {status === 'countdown' && (
          <div className="card !bg-dark-800/80 backdrop-blur-sm p-6">
            {/* App icon */}
            <div className="w-16 h-16 rounded-2xl bg-accent-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-accent-400">{appIcon}</span>
            </div>

            {/* Spinner */}
            <div className="w-12 h-12 border-3 border-dark-700 border-t-accent-500 rounded-full animate-spin mx-auto mb-4" />

            {/* Timer */}
            <div className="mb-4">
              <p className="text-sm text-dark-500 mb-2">{txt.redirecting}</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-4xl font-bold text-accent-400">{countdown}</span>
                <span className="text-dark-400">{txt.seconds}</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1.5 bg-dark-700 rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-gradient-to-r from-accent-400 to-accent-600 rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>

            <p className="text-sm text-dark-500 mb-4">{txt.manual}</p>

            {/* Open now button */}
            <button
              onClick={openDeepLink}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
              {txt.openApp}
            </button>
          </div>
        )}

        {/* Fallback State - App didn't open */}
        {status === 'fallback' && (
          <div className="card !bg-dark-800/80 backdrop-blur-sm p-6">
            {/* App icon */}
            <div className="w-16 h-16 rounded-2xl bg-accent-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-accent-400">{appIcon}</span>
            </div>

            <div className="space-y-3">
              {/* Copy subscription link */}
              <button
                onClick={handleCopyLink}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2"
              >
                {copied ? (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {txt.copied}
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    {txt.copyLink}
                  </>
                )}
              </button>

              {/* Try again button */}
              <button
                onClick={openDeepLink}
                className="btn-secondary w-full flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
                {txt.tryAgain}
              </button>

              {/* Back to cabinet */}
              <button
                onClick={() => navigate('/subscription')}
                className="w-full text-sm text-dark-500 hover:text-dark-300 transition-colors py-2"
              >
                {txt.backToCabinet}
              </button>
            </div>

            {/* Instructions */}
            <div className="mt-6 p-4 rounded-xl bg-dark-900/50 border border-dark-700 text-left">
              <h3 className="text-sm font-medium text-dark-200 mb-2">{txt.howToAdd}</h3>
              <ol className="text-xs text-dark-400 space-y-1.5 list-decimal list-inside">
                <li>{txt.step1}</li>
                <li>{txt.step2} {appName}</li>
                <li>{txt.step3}</li>
                <li>{txt.step4}</li>
              </ol>
            </div>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="card !bg-dark-800/80 backdrop-blur-sm p-6">
            <div className="w-16 h-16 rounded-full bg-error-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-error-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <p className="text-dark-200 font-medium mb-2">{txt.errorTitle}</p>
            <p className="text-sm text-dark-400 mb-6">{txt.errorDesc}</p>
            <button
              onClick={() => navigate('/subscription')}
              className="btn-primary w-full"
            >
              {txt.goToSubscription}
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 flex items-center justify-center gap-2 text-dark-600">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
          </svg>
          <span className="text-xs">VPN Config Redirect</span>
        </div>
      </div>
    </div>
  )
}
