import { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { authApi } from '../api/auth';
import { useAuthStore } from '../store/auth';
import { consumeCampaignSlug } from '../utils/campaign';
import { tokenStorage } from '../utils/token';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function VerifyEmail() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');
  const { setTokens, setUser, checkAdminStatus } = useAuthStore();
  const hasVerified = useRef(false);

  useEffect(() => {
    if (hasVerified.current) return;

    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setError(t('common.error'));
      return;
    }

    hasVerified.current = true;
    let redirectTimer: ReturnType<typeof setTimeout>;

    const verify = async () => {
      try {
        const campaignSlug = consumeCampaignSlug();
        const response = await authApi.verifyEmail(token, campaignSlug);
        // Save tokens and log user in
        tokenStorage.setTokens(response.access_token, response.refresh_token);
        setTokens(response.access_token, response.refresh_token);
        setUser(response.user);
        if (response.campaign_bonus) {
          useAuthStore.setState({ pendingCampaignBonus: response.campaign_bonus });
        }
        checkAdminStatus();
        setStatus('success');
        // Redirect to dashboard after short delay
        redirectTimer = setTimeout(() => navigate('/', { replace: true }), 1500);
      } catch (err: unknown) {
        setStatus('error');
        const error = err as { response?: { data?: { detail?: string } } };
        setError(error.response?.data?.detail || t('emailVerification.failed'));
      }
    };

    verify();

    return () => clearTimeout(redirectTimer);
  }, [searchParams, t, navigate, setTokens, setUser, checkAdminStatus]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8 sm:py-12">
      {/* Language switcher in corner */}
      <div className="fixed right-4 top-4 z-50">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-md text-center">
        {status === 'loading' && (
          <div>
            <div className="border-primary-600 mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2"></div>
            <h2 className="text-lg font-semibold text-gray-900 sm:text-xl">
              {t('emailVerification.verifying')}
            </h2>
            <p className="mt-2 text-sm text-gray-500 sm:text-base">
              {t('emailVerification.pleaseWait')}
            </p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <div className="mb-4 text-5xl text-green-500 sm:text-6xl">✓</div>
            <h2 className="text-lg font-semibold text-gray-900 sm:text-xl">
              {t('emailVerification.success')}
            </h2>
            <p className="mt-2 text-sm text-gray-500 sm:text-base">
              {t('emailVerification.redirecting', 'Redirecting to dashboard...')}
            </p>
            <div className="mt-4">
              <div className="border-primary-600 mx-auto h-6 w-6 animate-spin rounded-full border-b-2"></div>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div className="mb-4 text-5xl text-red-500 sm:text-6xl">✗</div>
            <h2 className="text-lg font-semibold text-gray-900 sm:text-xl">
              {t('emailVerification.failed')}
            </h2>
            <p className="mt-2 text-sm text-gray-500 sm:text-base">{error}</p>
            <div className="mt-6">
              <Link to="/login" className="btn-secondary">
                {t('emailVerification.goToLogin')}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
