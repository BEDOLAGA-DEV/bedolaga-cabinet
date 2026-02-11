import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth';
import { authApi } from '../api/auth';
import { isValidEmail } from '../utils/validation';
import {
  brandingApi,
  getCachedBranding,
  setCachedBranding,
  preloadLogo,
  isLogoPreloaded,
  type BrandingInfo,
  type EmailAuthEnabled,
} from '../api/branding';
import { getAndClearReturnUrl } from '../utils/token';
import { isInTelegramWebApp, getTelegramInitData, useTelegramSDK } from '../hooks/useTelegramSDK';
import LanguageSwitcher from '../components/LanguageSwitcher';
import TelegramLoginButton from '../components/TelegramLoginButton';
import OAuthProviderIcon from '../components/OAuthProviderIcon';
import { saveOAuthState } from './OAuthCallback';

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const {
    isAuthenticated,
    isLoading: isAuthInitializing,
    loginWithTelegram,
    loginWithEmail,
    registerWithEmail,
  } = useAuthStore();

  // Extract referral code from URL
  const referralCode = searchParams.get('ref') || '';

  const [authMode, setAuthMode] = useState<'login' | 'register'>(() =>
    referralCode ? 'register' : 'login',
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTelegramWebApp, setIsTelegramWebApp] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(() => isLogoPreloaded());
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordError, setForgotPasswordError] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(() => !!referralCode);

  // Telegram safe area insets
  const { safeAreaInset, contentSafeAreaInset } = useTelegramSDK();
  const safeTop = Math.max(safeAreaInset.top, contentSafeAreaInset.top);
  const safeBottom = Math.max(safeAreaInset.bottom, contentSafeAreaInset.bottom);

  // Получаем URL для возврата после авторизации
  const getReturnUrl = useCallback(() => {
    // Сначала проверяем state от React Router
    const stateFrom = (location.state as { from?: string })?.from;
    if (stateFrom && stateFrom !== '/login') {
      return stateFrom;
    }
    // Затем проверяем сохранённый URL в sessionStorage (от safeRedirectToLogin)
    const savedUrl = getAndClearReturnUrl();
    if (savedUrl && savedUrl !== '/login') {
      return savedUrl;
    }
    // По умолчанию на главную
    return '/';
  }, [location.state]);

  // Fetch branding with unified cache
  const cachedBranding = useMemo(() => getCachedBranding(), []);

  const { data: branding } = useQuery<BrandingInfo>({
    queryKey: ['branding'],
    queryFn: async () => {
      const data = await brandingApi.getBranding();
      setCachedBranding(data);
      await preloadLogo(data);
      return data;
    },
    staleTime: 60000,
    initialData: cachedBranding ?? undefined,
  });

  // Check if email auth is enabled
  const { data: emailAuthConfig } = useQuery<EmailAuthEnabled>({
    queryKey: ['email-auth-enabled'],
    queryFn: brandingApi.getEmailAuthEnabled,
    staleTime: 60000,
  });
  const isEmailAuthEnabled = emailAuthConfig?.enabled ?? true;

  // Fetch enabled OAuth providers
  const { data: oauthData } = useQuery({
    queryKey: ['oauth-providers'],
    queryFn: authApi.getOAuthProviders,
    staleTime: 60000,
  });
  const oauthProviders = Array.isArray(oauthData?.providers) ? oauthData.providers : [];

  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  const handleOAuthLogin = async (provider: string) => {
    setError('');
    setOauthLoading(provider);
    try {
      const { authorize_url, state } = await authApi.getOAuthAuthorizeUrl(provider);

      // Validate redirect URL — only allow HTTPS to prevent open redirect
      try {
        const parsed = new URL(authorize_url);
        if (parsed.protocol !== 'https:') {
          throw new Error('Invalid OAuth redirect URL');
        }
      } catch {
        throw new Error('Invalid OAuth redirect URL');
      }

      saveOAuthState(state, provider);
      window.location.href = authorize_url;
    } catch {
      setError(t('auth.oauthError', 'Authorization was denied or failed'));
      setOauthLoading(null);
    }
  };

  const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || '';

  // If email auth is disabled but user came with ref param, redirect to bot
  useEffect(() => {
    if (referralCode && emailAuthConfig?.enabled === false && botUsername) {
      window.location.href = `https://t.me/${botUsername}?start=${encodeURIComponent(referralCode)}`;
    }
  }, [referralCode, emailAuthConfig, botUsername]);

  const appName = branding ? branding.name : import.meta.env.VITE_APP_NAME || 'VPN';
  const appLogo = branding?.logo_letter || import.meta.env.VITE_APP_LOGO || 'V';
  const logoUrl = branding ? brandingApi.getLogoUrl(branding) : null;

  // Set document title
  useEffect(() => {
    document.title = appName || 'VPN';
  }, [appName]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(getReturnUrl(), { replace: true });
    }
  }, [isAuthenticated, navigate, getReturnUrl]);

  // Try Telegram WebApp authentication on mount (with auto-retry on 401)
  // Wait for auth store initialization to complete to avoid race conditions
  // with stale tokens triggering interceptor refresh/redirect loops
  useEffect(() => {
    // Don't attempt Telegram auth until store initialization is done
    if (isAuthInitializing) return;

    const tryTelegramAuth = async () => {
      const initData = getTelegramInitData();
      if (!isInTelegramWebApp() || !initData) return;

      setIsTelegramWebApp(true);
      setIsLoading(true);

      const MAX_RETRIES = 1;
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          await loginWithTelegram(initData);
          navigate(getReturnUrl(), { replace: true });
          return;
        } catch (err) {
          const error = err as { response?: { status?: number; data?: { detail?: string } } };
          const status = error.response?.status;
          const detail = error.response?.data?.detail;
          if (import.meta.env.DEV)
            console.warn(`Telegram auth attempt ${attempt + 1} failed:`, status, detail);

          if (status === 401 && attempt < MAX_RETRIES) {
            await new Promise((r) => setTimeout(r, 1500));
            continue;
          }

          // Show backend error detail if available, otherwise generic message
          setError(detail || t('auth.telegramRequired'));
        }
      }

      setIsLoading(false);
    };

    tryTelegramAuth();
  }, [isAuthInitializing, loginWithTelegram, navigate, t, getReturnUrl]);

  // Manual retry for Telegram Mini App auth
  const handleRetryTelegramAuth = async () => {
    const initData = getTelegramInitData();
    if (!initData) {
      setError(t('auth.telegramRequired'));
      return;
    }

    setError('');
    setIsLoading(true);
    try {
      await loginWithTelegram(initData);
      navigate(getReturnUrl(), { replace: true });
    } catch (err) {
      const error = err as { response?: { status?: number; data?: { detail?: string } } };
      const status = error.response?.status;
      const detail = error.response?.data?.detail;
      if (import.meta.env.DEV) console.warn('Telegram auth retry failed:', status, detail);
      setError(
        detail ||
          t('auth.telegramRetryFailed', 'Authorization failed. Close the app and try again.'),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Валидация email
    if (!email.trim() || !isValidEmail(email.trim())) {
      setError(t('auth.invalidEmail', 'Please enter a valid email address'));
      return;
    }

    if (authMode === 'register') {
      // Валидация для регистрации
      if (password !== confirmPassword) {
        setError(t('auth.passwordMismatch', 'Passwords do not match'));
        return;
      }
      if (password.length < 8) {
        setError(t('auth.passwordTooShort', 'Password must be at least 8 characters'));
        return;
      }
    }

    setIsLoading(true);

    try {
      if (authMode === 'login') {
        await loginWithEmail(email, password);
        navigate(getReturnUrl(), { replace: true });
      } else {
        const result = await registerWithEmail(
          email,
          password,
          firstName || undefined,
          referralCode || undefined,
        );
        // Show "check your email" screen
        setRegisteredEmail(result.email);
      }
    } catch (err: unknown) {
      const error = err as { response?: { status?: number; data?: { detail?: string } } };
      const status = error.response?.status;
      const detail = error.response?.data?.detail;

      if (status === 400 && detail?.includes('already registered')) {
        setError(t('auth.emailAlreadyRegistered', 'This email is already registered'));
      } else if (status === 401 || status === 403) {
        if (detail?.includes('verify your email')) {
          setError(t('auth.emailNotVerified', 'Please verify your email first'));
        } else {
          setError(t('auth.invalidCredentials', 'Invalid email or password'));
        }
      } else if (status === 429) {
        setError(t('auth.tooManyAttempts', 'Too many attempts. Please try again later'));
      } else {
        setError(detail || t('common.error'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotPasswordError('');

    if (!forgotPasswordEmail.trim() || !isValidEmail(forgotPasswordEmail.trim())) {
      setForgotPasswordError(t('auth.invalidEmail', 'Please enter a valid email address'));
      return;
    }

    setForgotPasswordLoading(true);
    try {
      await authApi.forgotPassword(forgotPasswordEmail.trim());
      setForgotPasswordSent(true);
    } catch (err: unknown) {
      const error = err as { response?: { status?: number; data?: { detail?: string } } };
      const detail = error.response?.data?.detail;
      setForgotPasswordError(detail || t('common.error'));
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const closeForgotPasswordModal = () => {
    setShowForgotPassword(false);
    setForgotPasswordEmail('');
    setForgotPasswordSent(false);
    setForgotPasswordError('');
  };

  return (
    <div
      className="flex min-h-[100dvh] items-center justify-center px-4 sm:px-6 lg:px-8"
      style={{
        paddingTop:
          safeTop > 0 ? `${safeTop + 16}px` : 'calc(1rem + env(safe-area-inset-top, 0px))',
        paddingBottom:
          safeBottom > 0 ? `${safeBottom + 16}px` : 'calc(1rem + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent-500/10 via-transparent to-transparent" />

      {/* Language switcher */}
      <div
        className="fixed right-3 z-50"
        style={{
          top: safeTop > 0 ? `${safeTop + 12}px` : 'calc(12px + env(safe-area-inset-top, 0px))',
        }}
      >
        <LanguageSwitcher />
      </div>

      <div className="relative w-full max-w-md space-y-5">
        {/* Logo & branding */}
        <div className="text-center">
          <div className="relative mx-auto mb-3 flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-dark-700/50 bg-dark-800/80 shadow-md">
            {/* Letter fallback */}
            <span
              className={`absolute text-lg font-bold text-accent-400 transition-opacity duration-200 ${branding?.has_custom_logo && logoLoaded ? 'opacity-0' : 'opacity-100'}`}
            >
              {appLogo}
            </span>
            {/* Logo image */}
            {branding?.has_custom_logo && logoUrl && (
              <img
                src={logoUrl}
                alt={appName || 'Logo'}
                className={`absolute h-full w-full object-contain transition-opacity duration-200 ${logoLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setLogoLoaded(true)}
              />
            )}
          </div>
          {appName && <h1 className="text-2xl font-bold text-dark-50">{appName}</h1>}

          {/* Referral Banner */}
          {referralCode && isEmailAuthEnabled && (
            <div className="mt-3 rounded-xl border border-accent-500/30 bg-accent-500/10 p-2.5">
              <div className="flex items-center justify-center gap-2 text-accent-400">
                <svg
                  className="h-4 w-4 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                  />
                </svg>
                <span className="text-xs font-medium">{t('auth.referralInvite')}</span>
              </div>
            </div>
          )}
        </div>

        {/* Check Email Screen */}
        {registeredEmail ? (
          <div className="card text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-success-500/20">
              <svg
                className="h-7 w-7 text-success-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-lg font-bold text-dark-50">
              {t('auth.checkEmail', 'Check your email')}
            </h2>
            <p className="mb-3 text-sm text-dark-400">
              {t('auth.verificationSent', 'We sent a verification link to:')}
            </p>
            <p className="mb-4 text-sm font-medium text-accent-400">{registeredEmail}</p>
            <p className="mb-5 text-xs text-dark-500">
              {t(
                'auth.clickLinkToVerify',
                'Click the link in the email to verify your account and log in.',
              )}
            </p>
            <button
              onClick={() => {
                setRegisteredEmail(null);
                setAuthMode('login');
              }}
              className="btn-secondary w-full"
            >
              {t('auth.backToLogin', 'Back to login')}
            </button>
          </div>
        ) : (
          /* Main auth card */
          <div className="card">
            {error && (
              <div className="mb-4 rounded-xl border border-error-500/30 bg-error-500/10 px-4 py-2.5 text-sm text-error-400">
                {error}
              </div>
            )}

            {/* Telegram auth section */}
            <div className="space-y-3">
              {isLoading && isTelegramWebApp ? (
                <div className="py-6 text-center">
                  <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
                  <p className="text-sm text-dark-400">{t('auth.authenticating')}</p>
                </div>
              ) : isTelegramWebApp && error ? (
                <div className="space-y-3 text-center">
                  <button
                    onClick={handleRetryTelegramAuth}
                    className="btn-primary mx-auto flex items-center gap-2 px-5 py-2.5"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                      />
                    </svg>
                    {t('auth.tryAgain')}
                  </button>
                  <p className="text-xs text-dark-500">
                    {t(
                      'auth.telegramReopenHint',
                      'If the problem persists, close and reopen the app',
                    )}
                  </p>
                </div>
              ) : (
                <TelegramLoginButton botUsername={botUsername} />
              )}
            </div>

            {/* OAuth providers - compact icon row */}
            {oauthProviders.length > 0 && (
              <>
                <div className="my-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-dark-700" />
                  <span className="text-xs text-dark-500">{t('auth.or', 'or')}</span>
                  <div className="h-px flex-1 bg-dark-700" />
                </div>
                <div className="flex items-stretch gap-2">
                  {oauthProviders.map((provider) => (
                    <button
                      key={provider.name}
                      type="button"
                      onClick={() => handleOAuthLogin(provider.name)}
                      disabled={oauthLoading !== null}
                      className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-xl border border-dark-700 bg-dark-800/80 py-2.5 transition-all hover:border-dark-600 hover:bg-dark-700 disabled:opacity-50"
                      title={provider.display_name}
                    >
                      {oauthLoading === provider.name ? (
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-dark-400 border-t-white" />
                      ) : (
                        <OAuthProviderIcon provider={provider.name} className="h-5 w-5" />
                      )}
                      <span className="text-[10px] leading-none text-dark-500">
                        {provider.display_name}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Email auth section - collapsible */}
            {isEmailAuthEnabled && (
              <>
                <div className="my-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-dark-700" />
                  <button
                    type="button"
                    onClick={() => setShowEmailForm(!showEmailForm)}
                    className="flex items-center gap-1.5 rounded-full border border-dark-700 bg-dark-800/60 px-3.5 py-1.5 text-xs font-medium text-dark-300 transition-all hover:border-dark-600 hover:bg-dark-700 hover:text-dark-200"
                  >
                    <svg
                      className="h-3.5 w-3.5 text-dark-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                      />
                    </svg>
                    <span>{t('auth.loginWithEmail')}</span>
                    <svg
                      className={`h-3 w-3 text-dark-400 transition-transform duration-300 ${showEmailForm ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div className="h-px flex-1 bg-dark-700" />
                </div>

                {/* Collapsible email form */}
                <div
                  className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                    showEmailForm ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                  }`}
                  style={{ transform: 'translateZ(0)' }}
                >
                  <div className="overflow-hidden">
                    <div className="space-y-4 pb-1 pt-1">
                      {showForgotPassword ? (
                        /* Forgot password screen - replaces login/register */
                        forgotPasswordSent ? (
                          <div className="space-y-4 text-center">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-success-500/20">
                              <svg
                                className="h-6 w-6 text-success-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={1.5}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                                />
                              </svg>
                            </div>
                            <p className="text-sm font-medium text-dark-100">
                              {t('auth.checkEmail', 'Check your email')}
                            </p>
                            <p className="text-xs text-dark-400">
                              {t(
                                'auth.passwordResetSent',
                                'If an account exists with this email, we sent password reset instructions.',
                              )}
                            </p>
                            <button
                              type="button"
                              onClick={closeForgotPasswordModal}
                              className="text-sm text-accent-400 transition-colors hover:text-accent-300"
                            >
                              {t('common.back', 'Back')}
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <p className="text-center text-sm text-dark-400">
                              {t(
                                'auth.forgotPasswordHint',
                                'Enter your email and we will send you instructions to reset your password.',
                              )}
                            </p>
                            <form onSubmit={handleForgotPassword} className="space-y-3">
                              <div>
                                <label htmlFor="forgotEmail" className="label">
                                  Email
                                </label>
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
                                <p className="text-sm text-error-400">{forgotPasswordError}</p>
                              )}
                              <button
                                type="submit"
                                disabled={forgotPasswordLoading}
                                className="btn-primary w-full py-2.5"
                              >
                                {forgotPasswordLoading ? (
                                  <span className="flex items-center justify-center gap-2">
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                    {t('common.loading')}
                                  </span>
                                ) : (
                                  t('auth.sendResetLink', 'Send reset link')
                                )}
                              </button>
                            </form>
                            <div className="text-center">
                              <button
                                type="button"
                                onClick={closeForgotPasswordModal}
                                className="text-sm text-dark-400 transition-colors hover:text-dark-200"
                              >
                                {t('common.back', 'Back')}
                              </button>
                            </div>
                          </div>
                        )
                      ) : (
                        /* Normal login / register */
                        <>
                          <div className="flex rounded-lg bg-dark-800 p-1">
                            <button
                              type="button"
                              className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
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
                              className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
                                authMode === 'register'
                                  ? 'bg-accent-500 text-white'
                                  : 'text-dark-400 hover:text-dark-200'
                              }`}
                              onClick={() => setAuthMode('register')}
                            >
                              {t('auth.register', 'Register')}
                            </button>
                          </div>

                          <form className="space-y-3" onSubmit={handleEmailSubmit}>
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
                                  placeholder={t(
                                    'auth.firstNamePlaceholder',
                                    'Your name (optional)',
                                  )}
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
                                autoComplete={
                                  authMode === 'login' ? 'current-password' : 'new-password'
                                }
                                required
                                className="input"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                              />
                            </div>

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
                              className="btn-primary w-full py-2.5"
                            >
                              {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                  {t('common.loading')}
                                </span>
                              ) : authMode === 'login' ? (
                                t('auth.login')
                              ) : (
                                t('auth.register', 'Register')
                              )}
                            </button>
                          </form>

                          {authMode === 'register' && (
                            <p className="text-center text-xs text-dark-500">
                              {t(
                                'auth.verificationEmailNotice',
                                'After registration, a verification email will be sent to your address',
                              )}
                            </p>
                          )}

                          {authMode === 'login' && (
                            <div className="text-center">
                              <button
                                type="button"
                                onClick={() => setShowForgotPassword(true)}
                                className="text-sm text-accent-400 transition-colors hover:text-accent-300"
                              >
                                {t('auth.forgotPassword', 'Forgot password?')}
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
