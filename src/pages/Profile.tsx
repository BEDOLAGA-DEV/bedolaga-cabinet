import { uiLocale } from '@/utils/uiLocale';
import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { usePlatform } from '@/platform';
import { copyToClipboard } from '@/utils/clipboard';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/auth';
import { displayName } from '../utils/displayName';
import { authApi } from '../api/auth';
import { isValidEmail } from '../utils/validation';
import { getApiErrorMessage } from '../utils/api-error';
import {
  notificationsApi,
  type NotificationSettings,
  type NotificationSettingsUpdate,
} from '../api/notifications';
import { referralApi } from '../api/referral';
import { brandingApi, type EmailAuthEnabled } from '../api/branding';
import { UI } from '../config/constants';
import { Card } from '@/components/data-display/Card';
import { Button } from '@/components/primitives/Button';
import { Switch } from '@/components/primitives/Switch';
import { staggerContainer, staggerItem } from '@/components/motion/transitions';
import { CopyIcon, CheckIcon, ShareIcon, ArrowRightIcon, PencilIcon } from '@/components/icons';

export default function Profile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const queryClient = useQueryClient();

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Inline email change flow
  const [changeEmailStep, setChangeEmailStep] = useState<'email' | 'code' | 'success' | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [changeCode, setChangeCode] = useState('');
  const [changeError, setChangeError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verificationResendCooldown, setVerificationResendCooldown] = useState(0);
  const newEmailInputRef = useRef<HTMLInputElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

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
  const isEmailVerificationEnabled = emailAuthConfig?.verification_enabled ?? true;

  // Build referral link for cabinet
  const referralLink = referralInfo?.referral_code
    ? `${window.location.origin}/login?ref=${referralInfo.referral_code}`
    : '';

  const copyReferralLink = () => {
    if (referralLink) {
      void copyToClipboard(referralLink);
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
    openTelegramLink(telegramUrl);
  };

  const resendVerificationMutation = useMutation({
    mutationFn: authApi.resendVerification,
    onSuccess: () => {
      setSuccess(t('profile.verificationResent'));
      setError(null);
      setVerificationResendCooldown(UI.RESEND_COOLDOWN_SEC);
    },
    onError: (err: unknown) => {
      setError(getApiErrorMessage(err, t('common.error')));
      setSuccess(null);
    },
  });

  // Email change mutations
  const requestEmailChangeMutation = useMutation({
    mutationFn: (emailAddr: string) => authApi.requestEmailChange(emailAddr),
    onSuccess: async (data) => {
      setChangeError(null);
      if (data.expires_in_minutes === 0) {
        // Unverified email was replaced directly
        setChangeEmailStep('success');
        const updatedUser = await authApi.getMe();
        setUser(updatedUser);
      } else {
        setChangeEmailStep('code');
        setResendCooldown(UI.RESEND_COOLDOWN_SEC);
      }
    },
    onError: (err: unknown) => {
      const detail = getApiErrorMessage(err, '');
      if (detail.includes('already registered') || detail.includes('already in use')) {
        setChangeError(t('profile.changeEmail.emailAlreadyUsed'));
      } else if (detail.includes('same as current')) {
        setChangeError(t('profile.changeEmail.sameEmail'));
      } else if (detail.includes('rate limit') || detail.includes('too many')) {
        setChangeError(t('profile.changeEmail.tooManyRequests'));
      } else {
        setChangeError(detail || t('common.error'));
      }
    },
  });

  const verifyEmailChangeMutation = useMutation({
    mutationFn: (verificationCode: string) => authApi.verifyEmailChange(verificationCode),
    onSuccess: async () => {
      setChangeError(null);
      setChangeEmailStep('success');
      const updatedUser = await authApi.getMe();
      setUser(updatedUser);
      // Note: auth user lives in the zustand store, not in React Query —
      // the explicit setUser above IS the refresh. No ['user'] query exists.
    },
    onError: (err: unknown) => {
      const detail = getApiErrorMessage(err, '');
      if (detail.includes('invalid') || detail.includes('wrong')) {
        setChangeError(t('profile.changeEmail.invalidCode'));
      } else if (detail.includes('expired')) {
        setChangeError(t('profile.changeEmail.codeExpired'));
      } else {
        setChangeError(detail || t('common.error'));
      }
    },
  });

  // Resend cooldown timers
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (verificationResendCooldown <= 0) return;
    const timer = setInterval(() => {
      setVerificationResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [verificationResendCooldown]);

  // Auto-focus inputs on step change (skip on Telegram — keyboard hides bottom nav)
  const { platform: profilePlatform, openTelegramLink } = usePlatform();
  useEffect(() => {
    if (profilePlatform === 'telegram') return;
    const timer = setTimeout(() => {
      if (changeEmailStep === 'email') newEmailInputRef.current?.focus();
      else if (changeEmailStep === 'code') codeInputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, [changeEmailStep, profilePlatform]);

  // Auto-close success after 3s
  useEffect(() => {
    if (changeEmailStep !== 'success') return;
    const timer = setTimeout(() => resetChangeEmail(), 3000);
    return () => clearTimeout(timer);
  }, [changeEmailStep]);

  const resetChangeEmail = () => {
    setChangeEmailStep(null);
    setNewEmail('');
    setChangeCode('');
    setChangeError(null);
    setResendCooldown(0);
  };

  const handleSendChangeCode = () => {
    setChangeError(null);
    if (!newEmail.trim()) {
      setChangeError(t('profile.emailRequired'));
      return;
    }
    if (!isValidEmail(newEmail.trim())) {
      setChangeError(t('profile.invalidEmail'));
      return;
    }
    if (user?.email && newEmail.toLowerCase().trim() === user.email.toLowerCase()) {
      setChangeError(t('profile.changeEmail.sameEmail'));
      return;
    }
    requestEmailChangeMutation.mutate(newEmail.trim());
  };

  const handleVerifyChangeCode = () => {
    setChangeError(null);
    if (!changeCode.trim()) {
      setChangeError(t('profile.changeEmail.enterCode'));
      return;
    }
    if (changeCode.trim().length < 4) {
      setChangeError(t('profile.changeEmail.invalidCode'));
      return;
    }
    verifyEmailChangeMutation.mutate(changeCode.trim());
  };

  const handleResendChangeCode = () => {
    if (resendCooldown > 0) return;
    requestEmailChangeMutation.mutate(newEmail.trim());
  };

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
              <span className="font-medium text-dark-100">{displayName(user)}</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-dark-400">{t('profile.registeredAt')}</span>
              <span className="font-medium text-dark-100">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString(uiLocale()) : '-'}
              </span>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Connected Accounts Link */}
      <motion.div variants={staggerItem}>
        <Card interactive onClick={() => navigate('/profile/accounts')}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-dark-100">
                {t('profile.accounts.goToAccounts')}
              </h2>
              <p className="text-sm text-dark-400">{t('profile.accounts.subtitle')}</p>
            </div>
            <ArrowRightIcon className="h-5 w-5 text-dark-400" />
          </div>
        </Card>
      </motion.div>

      {/* Referral Link Widget — self-animated: mounts after the referral queries
          resolve, when the parent stagger orchestration has already finished and
          would leave it stuck at opacity 0 */}
      {referralTerms?.is_enabled && referralLink && (
        <motion.div variants={staggerItem} initial="initial" animate="animate">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-dark-100">{t('referral.yourLink')}</h2>
              <Link
                to="/referral"
                className="flex items-center gap-1 text-accent-400 transition-colors hover:text-accent-300"
              >
                <span className="text-sm">{t('referral.title')}</span>
                <ArrowRightIcon className="h-4 w-4" />
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
                  <ShareIcon className="h-4 w-4" />
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
                    ) : isEmailVerificationEnabled ? (
                      <span className="badge-warning">{t('profile.notVerified')}</span>
                    ) : null}
                  </div>
                </div>

                {!user.email_verified && isEmailVerificationEnabled && (
                  <div className="rounded-linear border border-warning-500/30 bg-warning-500/10 p-4">
                    <p className="mb-4 text-sm text-warning-400">
                      {t('profile.verificationRequired')}
                    </p>
                    <div className="flex items-center gap-3">
                      <Button
                        onClick={() => resendVerificationMutation.mutate()}
                        loading={resendVerificationMutation.isPending}
                        disabled={verificationResendCooldown > 0}
                      >
                        {verificationResendCooldown > 0
                          ? t('profile.resendIn', { seconds: verificationResendCooldown })
                          : t('profile.resendVerification')}
                      </Button>
                      <button
                        onClick={() => setChangeEmailStep('email')}
                        className="text-sm text-accent-400 transition-colors hover:text-accent-300"
                      >
                        {t('profile.changeEmail.button')}
                      </button>
                    </div>
                  </div>
                )}

                {user.email_verified && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-dark-400">{t('profile.canLoginWithEmail')}</p>
                    <button
                      onClick={() => setChangeEmailStep('email')}
                      className="flex items-center gap-2 text-sm text-accent-400 transition-colors hover:text-accent-300"
                    >
                      <PencilIcon />
                      <span>{t('profile.changeEmail.button')}</span>
                    </button>
                  </div>
                )}

                {/* Inline email change flow */}
                <AnimatePresence>
                  {changeEmailStep === 'email' && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-3 border-t border-dark-800/50 pt-4">
                        <label className="block text-sm font-medium text-dark-400">
                          {t('profile.changeEmail.newEmail')}
                        </label>
                        <input
                          ref={newEmailInputRef}
                          type="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSendChangeCode();
                            }
                          }}
                          placeholder="new@email.com"
                          className="input w-full"
                          autoComplete="email"
                        />
                        {changeError && <p className="text-sm text-error-400">{changeError}</p>}
                        <div className="flex items-center gap-3">
                          <Button
                            onClick={handleSendChangeCode}
                            loading={requestEmailChangeMutation.isPending}
                            disabled={!newEmail.trim()}
                          >
                            {t('profile.changeEmail.sendCode')}
                          </Button>
                          <button
                            onClick={resetChangeEmail}
                            className="text-sm text-dark-400 hover:text-dark-200"
                          >
                            {t('common.cancel')}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {changeEmailStep === 'code' && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-3 border-t border-dark-800/50 pt-4">
                        <div className="rounded-linear border border-accent-500/30 bg-accent-500/10 p-3">
                          <p className="text-sm text-accent-400">
                            {t('profile.changeEmail.codeSentTo', { email: newEmail })}
                          </p>
                        </div>
                        <label className="block text-sm font-medium text-dark-400">
                          {t('profile.changeEmail.verificationCode')}
                        </label>
                        <input
                          ref={codeInputRef}
                          type="text"
                          inputMode="numeric"
                          value={changeCode}
                          onChange={(e) => setChangeCode(e.target.value.replace(/\D/g, ''))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleVerifyChangeCode();
                            }
                          }}
                          placeholder="000000"
                          maxLength={6}
                          className="input w-full text-center text-2xl tracking-[0.5em]"
                          autoComplete="one-time-code"
                        />
                        {changeError && <p className="text-sm text-error-400">{changeError}</p>}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Button
                              onClick={handleVerifyChangeCode}
                              loading={verifyEmailChangeMutation.isPending}
                              disabled={!changeCode.trim()}
                            >
                              {t('profile.changeEmail.verify')}
                            </Button>
                            <button
                              onClick={() => {
                                setChangeEmailStep('email');
                                setChangeCode('');
                                setChangeError(null);
                              }}
                              className="text-sm text-dark-400 hover:text-dark-200"
                            >
                              {t('common.back')}
                            </button>
                          </div>
                          <button
                            onClick={handleResendChangeCode}
                            disabled={resendCooldown > 0 || requestEmailChangeMutation.isPending}
                            className={`text-sm ${resendCooldown > 0 ? 'text-dark-500' : 'text-accent-400 hover:text-accent-300'}`}
                          >
                            {resendCooldown > 0
                              ? t('profile.changeEmail.resendIn', { seconds: resendCooldown })
                              : t('profile.changeEmail.resendCode')}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {changeEmailStep === 'success' && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-dark-800/50 pt-4">
                        <div className="flex items-center gap-3 rounded-linear border border-success-500/30 bg-success-500/10 p-4">
                          <CheckIcon />
                          <div>
                            <p className="font-medium text-success-400">
                              {t('profile.changeEmail.success')}
                            </p>
                            <p className="text-sm text-dark-400">{newEmail}</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-dark-400">{t('profile.linkEmailDescription')}</p>
                <Button variant="primary" onClick={() => navigate('/profile/accounts')}>
                  {t('profile.linkEmail')}
                </Button>
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
    </motion.div>
  );
}
