import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/auth';
import { authApi } from '../api/auth';
import {
  peekLinkOAuthState,
  clearLinkOAuthState,
  loadOAuthState,
  clearOAuthState,
  getErrorDetail,
} from '../utils/oauth';
import type { ServerCompleteResponse } from '../types';

type CallbackMode = 'login' | 'link-browser' | 'link-server';

export default function OAuthCallback() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');
  const [errorMode, setErrorMode] = useState<CallbackMode>('login');
  const [serverLinkResult, setServerCompleteResponse] = useState<ServerCompleteResponse | null>(
    null,
  );
  const loginWithOAuth = useAuthStore((state) => state.loginWithOAuth);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasRun = useRef(false);

  // Handle merge redirect via useEffect (not in render)
  useEffect(() => {
    if (serverLinkResult?.merge_required && serverLinkResult.merge_token) {
      navigate(`/merge/${serverLinkResult.merge_token}`, { replace: true });
    }
  }, [serverLinkResult, navigate]);

  useEffect(() => {
    // Prevent double-fire from React StrictMode
    if (hasRun.current) return;
    hasRun.current = true;

    const code = searchParams.get('code');
    const urlState = searchParams.get('state');
    const deviceId = searchParams.get('device_id');

    if (!code || !urlState) {
      setError(t('auth.oauthError', 'Authorization was denied or failed'));
      return;
    }

    // Determine callback mode:
    // 1. Link state in sessionStorage → browser linking flow
    // 2. Login state in sessionStorage → login flow
    // 3. Neither → opened from external browser (Mini App flow) → server-complete
    let mode: CallbackMode = 'link-server';
    let provider: string | undefined;
    let state: string | undefined;

    const linkSaved = peekLinkOAuthState();
    if (linkSaved && linkSaved.state === urlState) {
      clearLinkOAuthState();
      mode = 'link-browser';
      provider = linkSaved.provider;
      state = linkSaved.state;
    } else {
      const loginSaved = loadOAuthState();
      if (loginSaved && loginSaved.state === urlState) {
        clearOAuthState();
        mode = 'login';
        provider = loginSaved.provider;
        state = loginSaved.state;
      }
    }

    const handle = async () => {
      // Clear sensitive OAuth params (code, state) from URL immediately for all modes
      window.history.replaceState({}, '', '/auth/oauth/callback');

      if (mode === 'link-browser' && provider && state) {
        // Browser linking: user is authenticated, complete via JWT-protected endpoint
        try {
          const response = await authApi.linkProviderCallback(
            provider,
            code,
            state,
            deviceId ?? undefined,
          );
          if (response.merge_required && response.merge_token) {
            navigate(`/merge/${response.merge_token}`, { replace: true });
          } else {
            navigate('/profile/accounts', { replace: true });
          }
        } catch (err: unknown) {
          setErrorMode('link-browser');
          setError(getErrorDetail(err) || t('profile.accounts.linkError'));
        }
        return;
      }

      if (mode === 'login' && provider && state) {
        // Login flow
        if (isAuthenticated) {
          navigate('/', { replace: true });
          return;
        }
        try {
          await loginWithOAuth(provider, code, state, deviceId);
          navigate('/', { replace: true });
        } catch (err: unknown) {
          const detail = getErrorDetail(err);
          setError(detail || t('auth.oauthError', 'Authorization was denied or failed'));
        }
        return;
      }

      // mode === 'link-server': No sessionStorage state found.
      // This happens when OAuth was opened in external browser from Mini App.
      // Complete linking via state-token-authenticated server endpoint.
      try {
        // Provider is resolved server-side from the state token in Redis.
        const response = await authApi.linkServerComplete(code, urlState, deviceId ?? undefined);
        setServerCompleteResponse(response);
      } catch (err: unknown) {
        setErrorMode('link-server');
        setError(getErrorDetail(err) || t('profile.accounts.linkError'));
      }
    };

    handle();
  }, [searchParams, loginWithOAuth, navigate, isAuthenticated, t]);

  // Server-complete result: show success with "Return to Telegram" link
  // (merge redirect is handled by the useEffect above)
  if (
    serverLinkResult &&
    serverLinkResult.success &&
    !(serverLinkResult.merge_required && serverLinkResult.merge_token)
  ) {
    const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || '';
    const telegramLink = botUsername ? `https://t.me/${botUsername}` : '';

    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-8">
        <div className="fixed inset-0 bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950" />
        <div className="relative w-full max-w-md text-center">
          <div className="card">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-success-500/20">
              <svg
                className="h-8 w-8 text-success-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="mb-2 text-lg font-semibold text-dark-50">
              {t('profile.accounts.linkSuccess')}
            </h2>
            <p className="mb-6 text-sm text-dark-400">{t('profile.accounts.returnToTelegram')}</p>
            {telegramLink && (
              <a
                href={telegramLink}
                className="btn-primary inline-block w-full rounded-lg bg-accent-500 px-6 py-3 text-center font-medium text-dark-950 no-underline transition-colors hover:bg-accent-400"
              >
                {t('profile.accounts.openTelegram')}
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    const isServerMode = errorMode === 'link-server';
    const isLinkBrowserMode = errorMode === 'link-browser';
    const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || '';
    const telegramLink = botUsername ? `https://t.me/${botUsername}` : '';

    const errorAction =
      isServerMode && telegramLink ? (
        <a
          href={telegramLink}
          className="btn-primary inline-block w-full rounded-lg bg-accent-500 px-6 py-3 text-center font-medium text-dark-950 no-underline transition-colors hover:bg-accent-400"
        >
          {t('profile.accounts.openTelegram')}
        </a>
      ) : isLinkBrowserMode ? (
        <button
          onClick={() => navigate('/profile/accounts', { replace: true })}
          className="btn-primary w-full"
        >
          {t('profile.accounts.backToAccounts', 'Back to accounts')}
        </button>
      ) : (
        <button
          onClick={() => navigate('/login', { replace: true })}
          className="btn-primary w-full"
        >
          {t('auth.backToLogin', 'Back to login')}
        </button>
      );

    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-8">
        <div className="fixed inset-0 bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950" />
        <div className="relative w-full max-w-md text-center">
          <div className="card">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-error-500/20">
              <svg
                className="h-8 w-8 text-error-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-lg font-semibold text-dark-50">{t('auth.loginFailed')}</h2>
            <p className="mb-6 text-sm text-dark-400">{error}</p>
            {errorAction}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="fixed inset-0 bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950" />
      <div className="relative text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
        <h2 className="text-lg font-semibold text-dark-50">{t('auth.authenticating')}</h2>
        <p className="mt-2 text-sm text-dark-400">{t('common.loading')}</p>
      </div>
    </div>
  );
}
