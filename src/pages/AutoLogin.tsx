import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { authApi } from '../api/auth';
import { useAuthStore } from '../store/auth';

export default function AutoLogin() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setTokens, setUser, checkAdminStatus } = useAuthStore();
  const [error, setError] = useState(false);
  const attemptedRef = useRef(false);

  const token = searchParams.get('token');

  useEffect(() => {
    // Prevent referrer leaking the token
    const meta = document.createElement('meta');
    meta.name = 'referrer';
    meta.content = 'no-referrer';
    document.head.appendChild(meta);
    return () => {
      document.head.removeChild(meta);
    };
  }, []);

  useEffect(() => {
    if (!token || attemptedRef.current) {
      if (!token) setError(true);
      return;
    }
    attemptedRef.current = true;

    authApi
      .autoLogin(token)
      .then(async (response) => {
        setTokens(response.access_token, response.refresh_token);
        setUser(response.user);
        await checkAdminStatus();
        navigate('/', { replace: true });
      })
      .catch(() => {
        setError(true);
      });
  }, [token, navigate, setTokens, setUser, checkAdminStatus]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-dark-950 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-dark-800/50 bg-dark-900/50 p-8 text-center">
        {error ? (
          <div className="space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-error-500/10">
              <svg
                className="h-8 w-8 text-error-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-sm text-dark-300">{t('landing.autoLoginFailed')}</p>
            <button
              type="button"
              onClick={() => navigate('/login', { replace: true })}
              className="rounded-xl bg-accent-500 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-400"
            >
              {t('auth.login', 'Login')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-dark-600 border-t-accent-500" />
            <p className="text-sm text-dark-300">{t('landing.autoLoginProcessing')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
