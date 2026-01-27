import { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authApi } from '../api/auth';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function ResetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'form' | 'loading' | 'success' | 'error'>('form');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError(t('resetPassword.invalidToken', 'Invalid or missing reset token'));
      return;
    }

    if (password.length < 8) {
      setError(t('auth.passwordTooShort', 'Password must be at least 8 characters'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch', 'Passwords do not match'));
      return;
    }

    setStatus('loading');

    try {
      await authApi.resetPassword(token, password);
      setStatus('success');
      setTimeout(() => navigate('/login', { replace: true }), 2000);
    } catch (err: unknown) {
      setStatus('error');
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || t('common.error'));
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-8 sm:py-12">
        <div className="fixed inset-0 bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950" />
        <div className="fixed right-4 top-4 z-50">
          <LanguageSwitcher />
        </div>
        <div className="relative w-full max-w-md text-center">
          <div className="card">
            <div className="mb-4 text-5xl text-error-400">!</div>
            <h2 className="mb-2 text-xl font-semibold text-dark-50">
              {t('resetPassword.invalidToken', 'Invalid reset link')}
            </h2>
            <p className="mb-6 text-dark-400">
              {t(
                'resetPassword.tokenExpiredOrInvalid',
                'This password reset link is invalid or has expired.',
              )}
            </p>
            <Link to="/login" className="btn-primary inline-block w-full">
              {t('auth.backToLogin', 'Back to login')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8 sm:py-12">
      <div className="fixed inset-0 bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent-500/10 via-transparent to-transparent" />
      <div className="fixed right-4 top-4 z-50">
        <LanguageSwitcher />
      </div>

      <div className="relative w-full max-w-md">
        <div className="card">
          {status === 'success' ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-success-500/20">
                <svg
                  className="h-8 w-8 text-success-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="mb-2 text-xl font-bold text-dark-50">
                {t('resetPassword.success', 'Password changed!')}
              </h2>
              <p className="mb-4 text-dark-400">
                {t('resetPassword.redirectingToLogin', 'Redirecting to login...')}
              </p>
              <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
            </div>
          ) : (
            <>
              <h2 className="mb-2 text-center text-xl font-bold text-dark-50">
                {t('resetPassword.title', 'Set new password')}
              </h2>
              <p className="mb-6 text-center text-dark-400">
                {t('resetPassword.enterNewPassword', 'Enter your new password below.')}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="password" className="label">
                    {t('auth.password', 'Password')}
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input"
                    autoComplete="new-password"
                    disabled={status === 'loading'}
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="label">
                    {t('auth.confirmPassword', 'Confirm Password')}
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input"
                    autoComplete="new-password"
                    disabled={status === 'loading'}
                  />
                </div>

                {error && (
                  <div className="rounded-xl border border-error-500/30 bg-error-500/10 px-4 py-3 text-sm text-error-400">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="btn-primary w-full"
                >
                  {status === 'loading' ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      {t('common.loading')}
                    </span>
                  ) : (
                    t('resetPassword.setPassword', 'Set new password')
                  )}
                </button>
              </form>

              <div className="mt-4 text-center">
                <Link
                  to="/login"
                  className="text-sm text-dark-400 transition-colors hover:text-dark-200"
                >
                  {t('auth.backToLogin', 'Back to login')}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
