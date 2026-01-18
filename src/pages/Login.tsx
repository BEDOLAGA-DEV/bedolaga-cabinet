import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../store/auth'
import { brandingApi, type BrandingInfo } from '../api/branding'
import { getAndClearReturnUrl } from '../utils/token'
import LanguageSwitcher from '../components/LanguageSwitcher'
import TelegramLoginButton from '../components/TelegramLoginButton'

const BRANDING_CACHE_KEY = 'cabinet-branding-cache'
const BRANDING_CACHE_TTL = 1000 * 60 * 60 // 1 hour

const getCachedBranding = (): BrandingInfo | undefined => {
  if (typeof window === 'undefined') {
    return undefined
  }
  try {
    const raw = localStorage.getItem(BRANDING_CACHE_KEY)
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as { data?: BrandingInfo; timestamp?: number }
    if (!parsed?.data || !parsed.timestamp) return undefined
    if (Date.now() - parsed.timestamp > BRANDING_CACHE_TTL) {
      localStorage.removeItem(BRANDING_CACHE_KEY)
      return undefined
    }
    return parsed.data
  } catch {
    return undefined
  }
}

const cacheBranding = (data: BrandingInfo) => {
  if (typeof window === 'undefined') {
    return
  }
  try {
    localStorage.setItem(
      BRANDING_CACHE_KEY,
      JSON.stringify({ data, timestamp: Date.now() })
    )
  } catch {
    // Ignore storage errors (e.g., private mode)
  }
}

export default function Login() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, loginWithTelegram, loginWithEmail } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'telegram' | 'email'>('telegram')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isTelegramWebApp, setIsTelegramWebApp] = useState(false)

  // Получаем URL для возврата после авторизации
  const getReturnUrl = useCallback(() => {
    // Сначала проверяем state от React Router
    const stateFrom = (location.state as { from?: string })?.from
    if (stateFrom && stateFrom !== '/login') {
      return stateFrom
    }
    // Затем проверяем сохранённый URL в sessionStorage (от safeRedirectToLogin)
    const savedUrl = getAndClearReturnUrl()
    if (savedUrl && savedUrl !== '/login') {
      return savedUrl
    }
    // По умолчанию на главную
    return '/'
  }, [location.state])

  // Fetch branding
  const cachedBranding = useMemo(() => getCachedBranding(), [])

  const { data: branding } = useQuery<BrandingInfo>({
    queryKey: ['branding'],
    queryFn: brandingApi.getBranding,
    staleTime: 60000,
    placeholderData: cachedBranding,
  })

  useEffect(() => {
    if (branding) {
      cacheBranding(branding)
    }
  }, [branding])

  const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || ''
  const appName = branding ? branding.name : (import.meta.env.VITE_APP_NAME || 'VPN')
  const appLogo = branding?.logo_letter || import.meta.env.VITE_APP_LOGO || 'V'
  const logoUrl = branding ? brandingApi.getLogoUrl(branding) : null

  // Set document title
  useEffect(() => {
    document.title = appName || 'VPN'
  }, [appName])

  useEffect(() => {
    if (isAuthenticated) {
      navigate(getReturnUrl(), { replace: true })
    }
  }, [isAuthenticated, navigate, getReturnUrl])

  // Try Telegram WebApp authentication on mount
  useEffect(() => {
    const tryTelegramAuth = async () => {
      const tg = window.Telegram?.WebApp
      if (tg?.initData) {
        setIsTelegramWebApp(true)
        tg.ready()
        tg.expand()
        setIsLoading(true)
        try {
          await loginWithTelegram(tg.initData)
          navigate(getReturnUrl(), { replace: true })
        } catch (err) {
          console.error('Telegram auth failed:', err)
          setError(t('auth.telegramRequired'))
        } finally {
          setIsLoading(false)
        }
      }
    }

    tryTelegramAuth()
  }, [loginWithTelegram, navigate, t, getReturnUrl])

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await loginWithEmail(email, password)
      navigate(getReturnUrl(), { replace: true })
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      setError(error.response?.data?.detail || t('common.error'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-8 px-4 sm:py-12 sm:px-6 lg:px-8">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent-500/10 via-transparent to-transparent" />

      {/* Language switcher */}
      <div className="fixed top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>

      <div className="relative max-w-md w-full space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center mb-6 shadow-lg shadow-accent-500/30 overflow-hidden">
            {branding?.has_custom_logo && logoUrl ? (
              <img src={logoUrl} alt={appName || 'Logo'} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-bold text-2xl">{appLogo}</span>
            )}
          </div>
          {appName && (
            <h1 className="text-3xl font-bold text-dark-50">
              {appName}
            </h1>
          )}
          <p className="mt-2 text-dark-400">
            {t('auth.loginSubtitle')}
          </p>
        </div>

        {/* Card */}
        <div className="card">
          {/* Tabs */}
          <div className="flex mb-6">
            <button
              className={`flex-1 py-3 text-sm font-medium transition-all border-b-2 ${
                activeTab === 'telegram'
                  ? 'border-accent-500 text-accent-400'
                  : 'border-transparent text-dark-500 hover:text-dark-300'
              }`}
              onClick={() => setActiveTab('telegram')}
            >
              Telegram
            </button>
            <button
              className={`flex-1 py-3 text-sm font-medium transition-all border-b-2 ${
                activeTab === 'email'
                  ? 'border-accent-500 text-accent-400'
                  : 'border-transparent text-dark-500 hover:text-dark-300'
              }`}
              onClick={() => setActiveTab('email')}
            >
              Email
            </button>
          </div>

          {error && (
            <div className="bg-error-500/10 border border-error-500/30 text-error-400 px-4 py-3 rounded-xl text-sm mb-6">
              {error}
            </div>
          )}

          {activeTab === 'telegram' ? (
            <div className="space-y-6">
              <p className="text-center text-sm text-dark-400">
                {t('auth.registerHint')}
              </p>

              {isLoading && isTelegramWebApp ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm text-dark-400">{t('auth.authenticating')}</p>
                </div>
              ) : (
                <TelegramLoginButton botUsername={botUsername} />
              )}
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleEmailLogin}>
              <div>
                <label htmlFor="email" className="label">
                  {t('auth.email')}
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="password" className="label">
                  {t('auth.password')}
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full py-3"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('common.loading')}
                  </span>
                ) : (
                  t('auth.login')
                )}
              </button>

              <p className="text-center text-xs text-dark-500">
                {t('auth.registerHint')}
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
