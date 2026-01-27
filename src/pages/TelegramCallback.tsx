import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/auth';

export default function TelegramCallback() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');
  const { loginWithTelegramWidget, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
      return;
    }

    const authenticate = async () => {
      // Get auth data from URL params
      const id = searchParams.get('id');
      const firstName = searchParams.get('first_name');
      const lastName = searchParams.get('last_name');
      const username = searchParams.get('username');
      const photoUrl = searchParams.get('photo_url');
      const authDate = searchParams.get('auth_date');
      const hash = searchParams.get('hash');

      // Validate required fields
      if (!id || !firstName || !authDate || !hash) {
        setError(t('auth.telegramRequired'));
        return;
      }

      // Parse and validate numeric fields
      const parsedId = parseInt(id, 10);
      const parsedAuthDate = parseInt(authDate, 10);

      if (Number.isNaN(parsedId) || Number.isNaN(parsedAuthDate)) {
        setError(t('auth.telegramRequired'));
        return;
      }

      try {
        await loginWithTelegramWidget({
          id: parsedId,
          first_name: firstName,
          last_name: lastName || undefined,
          username: username || undefined,
          photo_url: photoUrl || undefined,
          auth_date: parsedAuthDate,
          hash: hash,
        });
        navigate('/');
      } catch (err: unknown) {
        const error = err as { response?: { data?: { detail?: string } } };
        setError(error.response?.data?.detail || t('common.error'));
      }
    };

    authenticate();
  }, [searchParams, loginWithTelegramWidget, navigate, isAuthenticated, t]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
        <div className="w-full max-w-md text-center">
          <div className="mb-4 text-5xl text-red-500">✗</div>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">{t('auth.loginFailed')}</h2>
          <p className="mb-6 text-sm text-gray-500">{error}</p>
          <button onClick={() => navigate('/login')} className="btn-primary">
            {t('auth.tryAgain')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="border-primary-600 mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2"></div>
        <h2 className="text-lg font-semibold text-gray-900">{t('auth.authenticating')}</h2>
        <p className="mt-2 text-sm text-gray-500">{t('common.loading')}</p>
      </div>
    </div>
  );
}
