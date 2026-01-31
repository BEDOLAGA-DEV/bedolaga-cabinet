import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/auth';
import { authApi } from '../api/auth';
import {
  notificationsApi,
  NotificationSettings,
  NotificationSettingsUpdate,
} from '../api/notifications';
import { referralApi } from '../api/referral';
import { brandingApi, type EmailAuthEnabled } from '../api/branding';
import ChangeEmailModal from '../components/ChangeEmailModal';
import { Card } from '@/components/data-display/Card';
import { Button } from '@/components/primitives/Button';
import { Switch } from '@/components/primitives/Switch';
import { staggerContainer, staggerItem } from '@/components/motion/transitions';

// Icons
const CopyIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
    />
  </svg>
);

const CheckIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const ShareIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 8l5-5m0 0l5 5m-5-5v12" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);

const PencilIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
    />
  </svg>
);

export default function Profile() {
  const { t } = useTranslation();
  const { user, setUser } = useAuthStore();
  const queryClient = useQueryClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showChangeEmailModal, setShowChangeEmailModal] = useState(false);

  // Referral data
  const { data: referralInfo } = useQuery({
    queryKey: ['referral-info'],
    queryFn: referralApi.getReferralInfo,
  });

  const { data: referralTerms } = useQuery({
    queryKey: ['referral-terms'],
    queryFn: referralApi.getReferralTerms,
  });

  const { data: branding } = useQuery({
    queryKey: ['branding'],
    queryFn: brandingApi.getBranding,
    staleTime: 60000,
  });

  // Check if email auth is enabled
  const { data: emailAuthConfig } = useQuery<EmailAuthEnabled>({
    queryKey: ['email-auth-enabled'],
    queryFn: brandingApi.getEmailAuthEnabled,
    staleTime: 60000,
  });
  const isEmailAuthEnabled = emailAuthConfig?.enabled ?? true;

  // Build referral link for cabinet
  const referralLink = referralInfo?.referral_code
    ? `${window.location.origin}/login?ref=${referralInfo.referral_code}`
    : '';

  const copyReferralLink = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareReferralLink = () => {
    if (!referralLink) return;
    const shareText = t('referral.shareMessage', {
      percent: referralInfo?.commission_percent || 0,
      botName: branding?.name || import.meta.env.VITE_APP_NAME || 'Cabinet',
    });

    if (navigator.share) {
      navigator
        .share({
          title: t('referral.title'),
          text: shareText,
          url: referralLink,
        })
        .catch(() => {});
      return;
    }

    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareText)}`;
    window.open(telegramUrl, '_blank', 'noopener,noreferrer');
  };

  const registerEmailMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.registerEmail(email, password),
    onSuccess: async () => {
      setSuccess(t('profile.emailSent'));
      setError(null);
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      const updatedUser = await authApi.getMe();
      setUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      const detail = err.response?.data?.detail;
      if (detail?.includes('already registered')) {
        setError(t('profile.emailAlreadyRegistered'));
      } else if (detail?.includes('already have a verified email')) {
        setError(t('profile.alreadyHaveEmail'));
      } else {
        setError(detail || t('common.error'));
      }
      setSuccess(null);
    },
  });

  const resendVerificationMutation = useMutation({
    mutationFn: authApi.resendVerification,
    onSuccess: () => {
      setSuccess(t('profile.verificationResent'));
      setError(null);
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      setError(err.response?.data?.detail || t('common.error'));
      setSuccess(null);
    },
  });

  const { data: notificationSettings, isLoading: notificationsLoading } = useQuery({
    queryKey: ['notification-settings'],
    queryFn: notificationsApi.getSettings,
  });

  const updateNotificationsMutation = useMutation({
    mutationFn: notificationsApi.updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
    },
  });

  const handleNotificationToggle = (key: keyof NotificationSettings, value: boolean) => {
    const update: NotificationSettingsUpdate = { [key]: value };
    updateNotificationsMutation.mutate(update);
  };

  const handleNotificationValue = (key: keyof NotificationSettings, value: number) => {
    const update: NotificationSettingsUpdate = { [key]: value };
    updateNotificationsMutation.mutate(update);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setError(t('profile.invalidEmail', 'Please enter a valid email address'));
      return;
    }

    if (!password || password.length < 8) {
      setError(t('profile.passwordMinLength'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('profile.passwordsMismatch'));
      return;
    }

    registerEmailMutation.mutate({ email, password });
  };

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <motion.div variants={staggerItem}>
        <h1 className="text-2xl font-bold text-dark-50 sm:text-3xl">{t('profile.title')}</h1>
      </motion.div>

      {/* User Info Card */}
      <motion.div variants={staggerItem}>
        <Card>
          <h2 className="mb-6 text-lg font-semibold text-dark-100">{t('profile.accountInfo')}</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-dark-800/50 py-3">
              <span className="text-dark-400">{t('profile.telegramId')}</span>
              <span className="font-medium text-dark-100">{user?.telegram_id}</span>
            </div>
            {user?.username && (
              <div className="flex items-center justify-between border-b border-dark-800/50 py-3">
                <span className="text-dark-400">{t('profile.username')}</span>
                <span className="font-medium text-dark-100">@{user.username}</span>
              </div>
            )}
            <div className="flex items-center justify-between border-b border-dark-800/50 py-3">
              <span className="text-dark-400">{t('profile.name')}</span>
              <span className="font-medium text-dark-100">
                {user?.first_name} {user?.last_name}
              </span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-dark-400">{t('profile.registeredAt')}</span>
              <span className="font-medium text-dark-100">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
              </span>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Referral Link Widget */}
      {referralTerms?.is_enabled && referralLink && (
        <motion.div variants={staggerItem}>
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-dark-100">{t('referral.yourLink')}</h2>
              <Link
                to="/referral"
                className="flex items-center gap-1 text-accent-400 transition-colors hover:text-accent-300"
              >
                <span className="text-sm">{t('referral.title')}</span>
                <ArrowRightIcon />
              </Link>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <input type="text" readOnly value={referralLink} className="input w-full text-sm" />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={copyReferralLink}
                  variant={copied ? 'primary' : 'primary'}
                  className={copied ? 'bg-success-500 hover:bg-success-500' : ''}
                >
                  {copied ? <CheckIcon /> : <CopyIcon />}
                  <span className="ml-2">
                    {copied ? t('referral.copied') : t('referral.copyLink')}
                  </span>
                </Button>
                <Button onClick={shareReferralLink} variant="secondary">
                  <ShareIcon />
                  <span className="ml-2 hidden sm:inline">{t('referral.shareButton')}</span>
                </Button>
              </div>
            </div>
            <p className="mt-3 text-sm text-dark-500">
              {t('referral.shareHint', { percent: referralInfo?.commission_percent || 0 })}
            </p>
          </Card>
        </motion.div>
      )}

      {/* Email Section - only show when email auth is enabled */}
      {isEmailAuthEnabled && (
        <motion.div variants={staggerItem}>
          <Card>
            <h2 className="mb-6 text-lg font-semibold text-dark-100">{t('profile.emailAuth')}</h2>

            {user?.email ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-dark-800/50 py-3">
                  <span className="text-dark-400">Email</span>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-dark-100">{user.email}</span>
                    {user.email_verified ? (
                      <span className="badge-success">{t('profile.verified')}</span>
                    ) : (
                      <span className="badge-warning">{t('profile.notVerified')}</span>
                    )}
                  </div>
                </div>

                {!user.email_verified && (
                  <div className="rounded-linear border border-warning-500/30 bg-warning-500/10 p-4">
                    <p className="mb-4 text-sm text-warning-400">
                      {t('profile.verificationRequired')}
                    </p>
                    <Button
                      onClick={() => resendVerificationMutation.mutate()}
                      loading={resendVerificationMutation.isPending}
                    >
                      {t('profile.resendVerification')}
                    </Button>
                  </div>
                )}

                {user.email_verified && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-dark-400">{t('profile.canLoginWithEmail')}</p>
                    <button
                      onClick={() => setShowChangeEmailModal(true)}
                      className="flex items-center gap-2 text-sm text-accent-400 transition-colors hover:text-accent-300"
                    >
                      <PencilIcon />
                      <span>{t('profile.changeEmail.button')}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <p className="mb-6 text-sm text-dark-400">{t('profile.linkEmailDescription')}</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="label">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="label">{t('auth.password')}</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('profile.passwordPlaceholder')}
                      className="input"
                    />
                    <p className="mt-2 text-xs text-dark-500">{t('profile.passwordHint')}</p>
                  </div>

                  <div>
                    <label className="label">{t('auth.confirmPassword')}</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t('profile.confirmPasswordPlaceholder')}
                      className="input"
                    />
                  </div>

                  {error && (
                    <div className="rounded-linear border border-error-500/30 bg-error-500/10 p-4 text-sm text-error-400">
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="rounded-linear border border-success-500/30 bg-success-500/10 p-4 text-sm text-success-400">
                      {success}
                    </div>
                  )}

                  <Button type="submit" fullWidth loading={registerEmailMutation.isPending}>
                    {t('profile.linkEmail')}
                  </Button>
                </form>
              </div>
            )}

            {(error || success) && user?.email && (
              <div className="mt-4">
                {error && (
                  <div className="rounded-linear border border-error-500/30 bg-error-500/10 p-4 text-sm text-error-400">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="rounded-linear border border-success-500/30 bg-success-500/10 p-4 text-sm text-success-400">
                    {success}
                  </div>
                )}
              </div>
            )}
          </Card>
        </motion.div>
      )}

      {/* Notification Settings */}
      <motion.div variants={staggerItem}>
        <Card>
          <h2 className="mb-6 text-lg font-semibold text-dark-100">
            {t('profile.notifications.title')}
          </h2>

          {notificationsLoading ? (
            <div className="flex justify-center py-4">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
            </div>
          ) : notificationSettings ? (
            <div className="space-y-6">
              {/* Subscription Expiry */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-dark-100">
                      {t('profile.notifications.subscriptionExpiry')}
                    </p>
                    <p className="text-sm text-dark-400">
                      {t('profile.notifications.subscriptionExpiryDesc')}
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.subscription_expiry_enabled}
                    onCheckedChange={(checked) =>
                      handleNotificationToggle('subscription_expiry_enabled', checked)
                    }
                  />
                </div>
                {notificationSettings.subscription_expiry_enabled && (
                  <div className="flex items-center gap-3 pl-4">
                    <span className="text-sm text-dark-400">
                      {t('profile.notifications.daysBeforeExpiry')}
                    </span>
                    <select
                      value={notificationSettings.subscription_expiry_days}
                      onChange={(e) =>
                        handleNotificationValue('subscription_expiry_days', Number(e.target.value))
                      }
                      className="input w-20 py-1"
                    >
                      {[1, 2, 3, 5, 7, 14].map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Traffic Warning */}
              <div className="space-y-3 border-t border-dark-800/50 pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-dark-100">
                      {t('profile.notifications.trafficWarning')}
                    </p>
                    <p className="text-sm text-dark-400">
                      {t('profile.notifications.trafficWarningDesc')}
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.traffic_warning_enabled}
                    onCheckedChange={(checked) =>
                      handleNotificationToggle('traffic_warning_enabled', checked)
                    }
                  />
                </div>
                {notificationSettings.traffic_warning_enabled && (
                  <div className="flex items-center gap-3 pl-4">
                    <span className="text-sm text-dark-400">
                      {t('profile.notifications.atPercent')}
                    </span>
                    <select
                      value={notificationSettings.traffic_warning_percent}
                      onChange={(e) =>
                        handleNotificationValue('traffic_warning_percent', Number(e.target.value))
                      }
                      className="input w-20 py-1"
                    >
                      {[50, 70, 80, 90, 95].map((p) => (
                        <option key={p} value={p}>
                          {p}%
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Balance Low */}
              <div className="space-y-3 border-t border-dark-800/50 pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-dark-100">
                      {t('profile.notifications.balanceLow')}
                    </p>
                    <p className="text-sm text-dark-400">
                      {t('profile.notifications.balanceLowDesc')}
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.balance_low_enabled}
                    onCheckedChange={(checked) =>
                      handleNotificationToggle('balance_low_enabled', checked)
                    }
                  />
                </div>
                {notificationSettings.balance_low_enabled && (
                  <div className="flex items-center gap-3 pl-4">
                    <span className="text-sm text-dark-400">
                      {t('profile.notifications.threshold')}
                    </span>
                    <input
                      type="number"
                      value={notificationSettings.balance_low_threshold}
                      onChange={(e) =>
                        handleNotificationValue('balance_low_threshold', Number(e.target.value))
                      }
                      min={0}
                      className="input w-24 py-1"
                    />
                  </div>
                )}
              </div>

              {/* News */}
              <div className="flex items-center justify-between border-t border-dark-800/50 pt-6">
                <div>
                  <p className="font-medium text-dark-100">{t('profile.notifications.news')}</p>
                  <p className="text-sm text-dark-400">{t('profile.notifications.newsDesc')}</p>
                </div>
                <Switch
                  checked={notificationSettings.news_enabled}
                  onCheckedChange={(checked) => handleNotificationToggle('news_enabled', checked)}
                />
              </div>

              {/* Promo Offers */}
              <div className="flex items-center justify-between border-t border-dark-800/50 pt-6">
                <div>
                  <p className="font-medium text-dark-100">
                    {t('profile.notifications.promoOffers')}
                  </p>
                  <p className="text-sm text-dark-400">
                    {t('profile.notifications.promoOffersDesc')}
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.promo_offers_enabled}
                  onCheckedChange={(checked) =>
                    handleNotificationToggle('promo_offers_enabled', checked)
                  }
                />
              </div>
            </div>
          ) : (
            <p className="text-dark-400">{t('profile.notifications.unavailable')}</p>
          )}
        </Card>
      </motion.div>

      {/* Change Email Modal */}
      {showChangeEmailModal && user?.email && (
        <ChangeEmailModal
          onClose={() => setShowChangeEmailModal(false)}
          currentEmail={user.email}
        />
      )}
    </motion.div>
  );
}
