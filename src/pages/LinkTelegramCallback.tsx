import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { authApi } from '../api/auth';
import { useToast } from '../components/Toast';
import { LINK_TELEGRAM_STATE_KEY } from './ConnectedAccounts';
import { getErrorDetail } from '../utils/oauth';

export default function LinkTelegramCallback() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    // Clear sensitive data from URL immediately
    window.history.replaceState({}, '', '/auth/link/telegram/callback');

    const linkAccount = async () => {
      // 1. Validate CSRF state
      const csrfState = searchParams.get('csrf_state');
      const savedState = sessionStorage.getItem(LINK_TELEGRAM_STATE_KEY);
      sessionStorage.removeItem(LINK_TELEGRAM_STATE_KEY);

      if (!csrfState || !savedState || csrfState !== savedState) {
        showToast({ type: 'error', message: t('profile.accounts.linkError') });
        navigate('/profile/accounts', { replace: true });
        return;
      }

      // 2. Validate required Telegram fields
      const id = searchParams.get('id');
      const firstName = searchParams.get('first_name');
      const authDate = searchParams.get('auth_date');
      const hash = searchParams.get('hash');

      if (!id || !firstName || !authDate || !hash) {
        showToast({ type: 'error', message: t('profile.accounts.linkError') });
        navigate('/profile/accounts', { replace: true });
        return;
      }

      const parsedId = parseInt(id, 10);
      const parsedAuthDate = parseInt(authDate, 10);

      if (Number.isNaN(parsedId) || Number.isNaN(parsedAuthDate)) {
        showToast({ type: 'error', message: t('profile.accounts.linkError') });
        navigate('/profile/accounts', { replace: true });
        return;
      }

      try {
        const response = await authApi.linkTelegram({
          id: parsedId,
          first_name: firstName,
          last_name: searchParams.get('last_name') || undefined,
          username: searchParams.get('username') || undefined,
          photo_url: searchParams.get('photo_url') || undefined,
          auth_date: parsedAuthDate,
          hash,
        });

        if (response.merge_required && response.merge_token) {
          navigate(`/merge/${response.merge_token}`, { replace: true });
        } else {
          showToast({ type: 'success', message: t('profile.accounts.linkSuccess') });
          navigate('/profile/accounts', { replace: true });
        }
      } catch (err: unknown) {
        showToast({
          type: 'error',
          message: getErrorDetail(err) || t('profile.accounts.linkError'),
        });
        navigate('/profile/accounts', { replace: true });
      }
    };

    linkAccount();
  }, [searchParams, navigate, showToast, t]);

  return (
    <div className="min-h-viewport flex items-center justify-center">
      <div className="fixed inset-0 bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950" />
      <div className="relative text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
        <h2 className="text-lg font-semibold text-dark-50">
          {t('profile.accounts.linkingTelegram')}
        </h2>
        <p className="mt-2 text-sm text-dark-400">{t('common.loading')}</p>
      </div>
    </div>
  );
}
