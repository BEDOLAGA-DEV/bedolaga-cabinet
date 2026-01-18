import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../store/auth'
import { brandingApi } from '../api/branding'

// Validate redirect URL to prevent open redirect attacks
const getSafeRedirectUrl = (url: string | null): string => {
  if (!url) return '/'
  // Only allow relative paths starting with /
  // Block protocol-relative URLs (//evil.com) and absolute URLs
  if (!url.startsWith('/') || url.startsWith('//')) {
    return '/'
  }
  // Additional check for encoded characters that could bypass validation
  try {
    const decoded = decodeURIComponent(url)
    if (!decoded.startsWith('/') || decoded.startsWith('//') || decoded.includes('://')) {
      return '/'
    }
  } catch {
    return '/'
  }
  return url
}

const MAX_RETRY_ATTEMPTS = 3
const RETRY_COUNT_KEY = 'telegram_redirect_retry_count'

export default function TelegramRedirect() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { loginWithTelegram, isAuthenticated, isLoading: authLoading } = useAuthStore()
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'not-telegram'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [retryCount, setRetryCount] = useState(() => {
    const stored = sessionStorage.getItem(RETRY_COUNT_KEY)
    return stored ? parseInt(stored, 10) : 0
  })

  // Get branding for nice display
  const { data: branding } = useQuery({
    queryKey: ['branding'],
    queryFn: brandingApi.getBranding,
    staleTime: 60000,
  })

  const appName = branding ? branding.name : (import.meta.env.VITE_APP_NAME || 'VPN')
  const logoLetter = branding?.logo_letter || import.meta.env.VITE_APP_LOGO || 'V'
  const logoUrl = branding ? brandingApi.getLogoUrl(branding) : null

  // Get redirect target from URL params (validated)
  const redirectTo = getSafeRedirectUrl(searchParams.get('redirect'))

  useEffect(() => {
    // If already authenticated, redirect immediately
    if (isAuthenticated && !authLoading) {
      setStatus('success')
      setTimeout(() => navigate(redirectTo), 500)
      return
    }

    const initTelegram = async () => {
      // Check if running in Telegram WebApp
      const tg = window.Telegram?.WebApp

      if (!tg?.initData) {
        // Not in Telegram, show message and redirect to login
        setStatus('not-telegram')
        setTimeout(() => navigate('/login'), 2000)
        return
      }

      // Initialize Telegram WebApp
      tg.ready()
      tg.expand()

      // Set theme colors if available
      if (tg.themeParams) {
        document.documentElement.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#1a1a2e')
        document.documentElement.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#ffffff')
      }

      try {
        await loginWithTelegram(tg.initData)
        setStatus('success')

        // Small delay for nice UX
        setTimeout(() => {
          navigate(redirectTo)
        }, 800)
      } catch (err: unknown) {
        console.error('Telegram auth failed:', err)
        const error = err as { response?: { data?: { detail?: string } } }
        setErrorMessage(error.response?.data?.detail || t('auth.telegramRequired'))
        setStatus('error')
      }
    }

    // Small delay to show loading screen
    setTimeout(initTelegram, 300)
  }, [loginWithTelegram, navigate, isAuthenticated, authLoading, redirectTo, t])

  // Handle retry with limit to prevent infinite loops
  const handleRetry = () => {
    if (retryCount >= MAX_RETRY_ATTEMPTS) {
      setErrorMessage('Превышено количество попыток. Попробуйте позже.')
      sessionStorage.removeItem(RETRY_COUNT_KEY)
      return
    }
    const newCount = retryCount + 1
    setRetryCount(newCount)
    sessionStorage.setItem(RETRY_COUNT_KEY, String(newCount))
    setStatus('loading')
    setErrorMessage('')
    window.location.reload()
  }

  // Clear retry count on successful auth
  useEffect(() => {
    if (status === 'success') {
      sessionStorage.removeItem(RETRY_COUNT_KEY)
    }
  }, [status])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent-500/10 via-transparent to-transparent" />

      <div className="relative text-center max-w-sm w-full">
        {/* Logo */}
        <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center mb-6 shadow-lg shadow-accent-500/30 overflow-hidden">
          {branding?.has_custom_logo && logoUrl ? (
            <img src={logoUrl} alt={appName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-white font-bold text-3xl">{logoLetter}</span>
          )}
        </div>

        <h1 className="text-2xl font-bold text-dark-50 mb-2">{appName}</h1>

        {/* Loading State */}
        {status === 'loading' && (
          <div className="mt-8">
            <div className="w-10 h-10 border-3 border-accent-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-dark-400">{t('auth.authenticating')}</p>
            <p className="text-sm text-dark-500 mt-2">{t('common.loading')}</p>
          </div>
        )}

        {/* Success State */}
        {status === 'success' && (
          <div className="mt-8">
            <div className="w-16 h-16 rounded-full bg-success-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-success-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <p className="text-dark-200">{t('auth.loginSuccess')}</p>
            <p className="text-sm text-dark-500 mt-2">Перенаправление...</p>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="mt-8">
            <div className="w-16 h-16 rounded-full bg-error-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-error-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-dark-200 mb-2">{t('auth.loginFailed')}</p>
            <p className="text-sm text-error-400 mb-6">{errorMessage}</p>
            <div className="flex flex-col gap-3">
              <button onClick={handleRetry} className="btn-primary w-full">
                {t('auth.tryAgain')}
              </button>
              <button onClick={() => navigate('/login')} className="btn-secondary w-full">
                Войти другим способом
              </button>
            </div>
          </div>
        )}

        {/* Not in Telegram State */}
        {status === 'not-telegram' && (
          <div className="mt-8">
            <div className="w-16 h-16 rounded-full bg-warning-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-warning-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <p className="text-dark-200 mb-2">Откройте в Telegram</p>
            <p className="text-sm text-dark-400 mb-6">
              Для автоматического входа откройте это приложение через бота в Telegram
            </p>
            <p className="text-sm text-dark-500">Перенаправление на страницу входа...</p>
          </div>
        )}

        {/* Telegram branding */}
        <div className="mt-12 flex items-center justify-center gap-2 text-dark-600">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
          </svg>
          <span className="text-xs">Telegram Mini App</span>
        </div>
      </div>
    </div>
  )
}
