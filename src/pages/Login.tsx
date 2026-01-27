import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../store/auth'
import { authApi } from '../api/auth'
import { brandingApi, getCachedBranding, setCachedBranding, preloadLogo, isLogoPreloaded, type BrandingInfo, type EmailAuthEnabled } from '../api/branding'
import { getAndClearReturnUrl } from '../utils/token'
import LanguageSwitcher from '../components/LanguageSwitcher'
import TelegramLoginButton from '../components/TelegramLoginButton'

export default function Login() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { isAuthenticated, loginWithTelegram, loginWithEmail, registerWithEmail } = useAuthStore()

  // Extract referral code from URL
  const referralCode = searchParams.get('ref') || ''

  const [authMode, setAuthMode] = useState<'login' | 'register'>(() =>
    referralCode ? 'register' : 'login'
  )
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isTelegramWebApp, setIsTelegramWebApp] = useState(false)
  const [logoLoaded, setLogoLoaded] = useState(() => isLogoPreloaded())
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('')
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false)
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false)
  const [forgotPasswordError, setForgotPasswordError] = useState('')

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

  // Fetch branding with unified cache
  const cachedBranding = useMemo(() => getCachedBranding(), [])

  const { data: branding } = useQuery<BrandingInfo>({
    queryKey: ['branding'],
    queryFn: async () => {
      const data = await brandingApi.getBranding()
      setCachedBranding(data)
      preloadLogo(data)
      return data
    },
    staleTime: 60000,
    initialData: cachedBranding ?? undefined,
  })

  // Check if email auth is enabled
  const { data: emailAuthConfig } = useQuery<EmailAuthEnabled>({
    queryKey: ['email-auth-enabled'],
    queryFn: brandingApi.getEmailAuthEnabled,
    staleTime: 60000,
  })
  const isEmailAuthEnabled = emailAuthConfig?.enabled ?? true

  const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || ''

  // If email auth is disabled but user came with ref param, redirect to bot
  useEffect(() => {
    if (referralCode && emailAuthConfig?.enabled === false && botUsername) {
      window.location.href = `https://t.me/${botUsername}?start=ref_${referralCode}`
    }
  }, [referralCode, emailAuthConfig, botUsername])

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
          // Log only status code to avoid leaking sensitive data
          const status = (err as { response?: { status?: number } })?.response?.status
          console.warn('Telegram auth failed with status:', status)
          setError(t('auth.telegramRequired'))
        } finally {
          setIsLoading(false)
        }
      }
    }

    tryTelegramAuth()
  }, [loginWithTelegram, navigate, t, getReturnUrl])

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Валидация email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setError(t('auth.invalidEmail', 'Please enter a valid email address'))
      return
    }

    if (authMode === 'register') {
      // Валидация для регистрации
      if (password !== confirmPassword) {
        setError(t('auth.passwordMismatch', 'Passwords do not match'))
        return
      }
      if (password.length < 8) {
        setError(t('auth.passwordTooShort', 'Password must be at least 8 characters'))
        return
      }
    }

    setIsLoading(true)

    try {
      if (authMode === 'login') {
        await loginWithEmail(email, password)
        navigate(getReturnUrl(), { replace: true })
      } else {
        const result = await registerWithEmail(email, password, firstName || undefined, referralCode || undefined)
        // Show "check your email" screen
        setRegisteredEmail(result.email)
      }
    } catch (err: unknown) {
      const error = err as { response?: { status?: number; data?: { detail?: string } } }
      const status = error.response?.status
      const detail = error.response?.data?.detail

      if (status === 400 && detail?.includes('already registered')) {
        setError(t('auth.emailAlreadyRegistered', 'This email is already registered'))
      } else if (status === 401 || status === 403) {
        if (detail?.includes('verify your email')) {
          setError(t('auth.emailNotVerified', 'Please verify your email first'))
        } else {
          setError(t('auth.invalidCredentials', 'Invalid email or password'))
        }
      } else if (status === 429) {
        setError(t('auth.tooManyAttempts', 'Too many attempts. Please try again later'))
      } else {
        setError(detail || t('common.error'))
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotPasswordError('')

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!forgotPasswordEmail.trim() || !emailRegex.test(forgotPasswordEmail.trim())) {
      setForgotPasswordError(t('auth.invalidEmail', 'Please enter a valid email address'))
      return
    }

    setForgotPasswordLoading(true)
    try {
      await authApi.forgotPassword(forgotPasswordEmail.trim())
      setForgotPasswordSent(true)
    } catch (err: unknown) {
      const error = err as { response?: { status?: number; data?: { detail?: string } } }
      const detail = error.response?.data?.detail
      setForgotPasswordError(detail || t('common.error'))
    } finally {
      setForgotPasswordLoading(false)
    }
  }

  const closeForgotPasswordModal = () => {
    setShowForgotPassword(false)
    setForgotPasswordEmail('')
    setForgotPasswordSent(false)
    setForgotPasswordError('')
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
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center mb-6 shadow-lg shadow-accent-500/30 overflow-hidden relative">
            {/* Always show letter as fallback */}
            <span className={`text-white font-bold text-2xl absolute transition-opacity duration-200 ${branding?.has_custom_logo && logoLoaded ? 'opacity-0' : 'opacity-100'}`}>
              {appLogo}
            </span>
            {/* Logo image with smooth fade-in */}
            {branding?.has_custom_logo && logoUrl && (
              <img
                src={logoUrl}
                alt={appName || 'Logo'}
                className={`w-full h-full object-cover absolute transition-opacity duration-200 ${logoLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setLogoLoaded(true)}
              />
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

          {/* Referral Banner - only show when email auth is enabled */}
          {referralCode && isEmailAuthEnabled && (
            <div className="mt-4 p-3 rounded-xl bg-accent-500/10 border border-accent-500/30">
              <div className="flex items-center gap-2 text-accent-400">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
                <span className="text-sm font-medium">{t('auth.referralInvite')}</span>
              </div>
            </div>
          )}
        </div>

        {/* Check Email Screen */}
        {registeredEmail ? (
          <div className="card text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-success-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-success-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-dark-50 mb-2">
              {t('auth.checkEmail', 'Check your email')}
            </h2>
            <p className="text-dark-400 mb-4">
              {t('auth.verificationSent', 'We sent a verification link to:')}
            </p>
            <p className="text-accent-400 font-medium mb-6">{registeredEmail}</p>
            <p className="text-sm text-dark-500 mb-6">
              {t('auth.clickLinkToVerify', 'Click the link in the email to verify your account and log in.')}
            </p>
            <button
              onClick={() => {
                setRegisteredEmail(null)
                setAuthMode('login')
              }}
              className="btn-secondary w-full"
            >
              {t('auth.backToLogin', 'Back to login')}
            </button>
          </div>
        ) : (
        /* Card */
        <div className="card">
          {error && (
            <div className="bg-error-500/10 border border-error-500/30 text-error-400 px-4 py-3 rounded-xl text-sm mb-6">
              {error}
            </div>
          )}

          {/* Telegram auth — always visible */}
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

          {/* Email auth — only when enabled */}
          {isEmailAuthEnabled && (
            <>
              {/* Divider */}
              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-dark-700" />
                <span className="text-xs text-dark-500 uppercase">{t('auth.or', 'or')}</span>
                <div className="flex-1 h-px bg-dark-700" />
              </div>

              <div className="space-y-5">
                {/* Login / Register toggle */}
                <div className="flex bg-dark-800 rounded-lg p-1">
                  <button
                    type="button"
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                      authMode === 'login'
                        ? 'bg-accent-500 text-white'
                        : 'text-dark-400 hover:text-dark-200'
                    }`}
                    onClick={() => setAuthMode('login')}
                  >
                    {t('auth.login')}
                  </button>
                  <button
                    type="button"
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                      authMode === 'register'
                        ? 'bg-accent-500 text-white'
                        : 'text-dark-400 hover:text-dark-200'
                    }`}
                    onClick={() => setAuthMode('register')}
                  >
                    {t('auth.register', 'Register')}
                  </button>
                </div>

                <form className="space-y-4" onSubmit={handleEmailSubmit}>
                  {/* First name field - only for registration */}
                  {authMode === 'register' && (
                    <div>
                      <label htmlFor="firstName" className="label">
                        {t('auth.firstName', 'First Name')}
                      </label>
                      <input
                        id="firstName"
                        name="firstName"
                        type="text"
                        autoComplete="given-name"
                        className="input"
                        placeholder={t('auth.firstNamePlaceholder', 'Your name (optional)')}
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                      />
                    </div>
                  )}

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
                      autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                      required
                      className="input"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  {/* Confirm password - only for registration */}
                  {authMode === 'register' && (
                    <div>
                      <label htmlFor="confirmPassword" className="label">
                        {t('auth.confirmPassword', 'Confirm Password')}
                      </label>
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        autoComplete="new-password"
                        required
                        className="input"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                  )}

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
                      authMode === 'login' ? t('auth.login') : t('auth.register', 'Register')
                    )}
                  </button>
                </form>

                {/* Verification notice for registration */}
                {authMode === 'register' && (
                  <p className="text-center text-xs text-dark-500">
                    {t('auth.verificationEmailNotice', 'After registration, a verification email will be sent to your address')}
                  </p>
                )}

                {/* Forgot password link - only for login */}
                {authMode === 'login' && (
                  <div className="text-center space-y-2">
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-sm text-accent-400 hover:text-accent-300 transition-colors"
                    >
                      {t('auth.forgotPassword', 'Forgot password?')}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        )}
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={closeForgotPasswordModal} />
          <div className="relative bg-dark-900 rounded-2xl p-6 w-full max-w-md border border-dark-700">
            <button
              onClick={closeForgotPasswordModal}
              className="absolute top-4 right-4 text-dark-400 hover:text-dark-200 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {forgotPasswordSent ? (
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-success-500/20 flex items-center justify-center">
                  <svg className="w-8 h-8 text-success-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-dark-50 mb-2">
                  {t('auth.checkEmail', 'Check your email')}
                </h3>
                <p className="text-dark-400 mb-4">
                  {t('auth.passwordResetSent', 'If an account exists with this email, we sent password reset instructions.')}
                </p>
                <button onClick={closeForgotPasswordModal} className="btn-primary w-full">
                  {t('common.close', 'Close')}
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-bold text-dark-50 mb-2">
                  {t('auth.forgotPassword', 'Forgot password?')}
                </h3>
                <p className="text-dark-400 mb-6">
                  {t('auth.forgotPasswordHint', 'Enter your email and we will send you instructions to reset your password.')}
                </p>

                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label htmlFor="forgotEmail" className="label">Email</label>
                    <input
                      id="forgotEmail"
                      type="email"
                      value={forgotPasswordEmail}
                      onChange={(e) => setForgotPasswordEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="input"
                      autoFocus
                    />
                  </div>

                  {forgotPasswordError && (
                    <div className="bg-error-500/10 border border-error-500/30 text-error-400 px-4 py-3 rounded-xl text-sm">
                      {forgotPasswordError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={forgotPasswordLoading}
                    className="btn-primary w-full"
                  >
                    {forgotPasswordLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {t('common.loading')}
                      </span>
                    ) : (
                      t('auth.sendResetLink', 'Send reset link')
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
