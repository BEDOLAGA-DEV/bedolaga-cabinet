import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/auth'
import { authApi } from '../api/auth'
import { notificationsApi, NotificationSettings, NotificationSettingsUpdate } from '../api/notifications'

export default function Profile() {
  const { t } = useTranslation()
  const { user, setUser } = useAuthStore()
  const queryClient = useQueryClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const registerEmailMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.registerEmail(email, password),
    onSuccess: async () => {
      setSuccess(t('profile.emailSent'))
      setError(null)
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      const updatedUser = await authApi.getMe()
      setUser(updatedUser)
      queryClient.invalidateQueries({ queryKey: ['user'] })
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      setError(err.response?.data?.detail || t('common.error'))
      setSuccess(null)
    },
  })

  const resendVerificationMutation = useMutation({
    mutationFn: authApi.resendVerification,
    onSuccess: () => {
      setSuccess(t('profile.verificationResent'))
      setError(null)
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      setError(err.response?.data?.detail || t('common.error'))
      setSuccess(null)
    },
  })

  const { data: notificationSettings, isLoading: notificationsLoading } = useQuery({
    queryKey: ['notification-settings'],
    queryFn: notificationsApi.getSettings,
  })

  const updateNotificationsMutation = useMutation({
    mutationFn: notificationsApi.updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] })
    },
  })

  const handleNotificationToggle = (key: keyof NotificationSettings, value: boolean) => {
    const update: NotificationSettingsUpdate = { [key]: value }
    updateNotificationsMutation.mutate(update)
  }

  const handleNotificationValue = (key: keyof NotificationSettings, value: number) => {
    const update: NotificationSettingsUpdate = { [key]: value }
    updateNotificationsMutation.mutate(update)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!email.trim()) {
      setError(t('profile.emailRequired'))
      return
    }

    if (!password || password.length < 8) {
      setError(t('profile.passwordMinLength'))
      return
    }

    if (password !== confirmPassword) {
      setError(t('profile.passwordsMismatch'))
      return
    }

    registerEmailMutation.mutate({ email, password })
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-dark-50">{t('profile.title')}</h1>

      {/* User Info Card */}
      <div className="bento-card">
        <h2 className="text-lg font-semibold text-dark-100 mb-6">{t('profile.accountInfo')}</h2>
        <div className="space-y-4">
          <div className="flex justify-between items-center py-3 border-b border-dark-800/50">
            <span className="text-dark-400">{t('profile.telegramId')}</span>
            <span className="text-dark-100 font-medium">{user?.telegram_id}</span>
          </div>
          {user?.username && (
            <div className="flex justify-between items-center py-3 border-b border-dark-800/50">
              <span className="text-dark-400">{t('profile.username')}</span>
              <span className="text-dark-100 font-medium">@{user.username}</span>
            </div>
          )}
          <div className="flex justify-between items-center py-3 border-b border-dark-800/50">
            <span className="text-dark-400">{t('profile.name')}</span>
            <span className="text-dark-100 font-medium">
              {user?.first_name} {user?.last_name}
            </span>
          </div>
          <div className="flex justify-between items-center py-3">
            <span className="text-dark-400">{t('profile.registeredAt')}</span>
            <span className="text-dark-100 font-medium">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Email Section */}
      <div className="bento-card">
        <h2 className="text-lg font-semibold text-dark-100 mb-6">{t('profile.emailAuth')}</h2>

        {user?.email ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-dark-800/50">
              <span className="text-dark-400">Email</span>
              <div className="flex items-center gap-3">
                <span className="text-dark-100 font-medium">{user.email}</span>
                {user.email_verified ? (
                  <span className="badge-success">{t('profile.verified')}</span>
                ) : (
                  <span className="badge-warning">{t('profile.notVerified')}</span>
                )}
              </div>
            </div>

            {!user.email_verified && (
              <div className="bg-warning-500/10 border border-warning-500/30 rounded-xl p-4">
                <p className="text-sm text-warning-400 mb-4">
                  {t('profile.verificationRequired')}
                </p>
                <button
                  onClick={() => resendVerificationMutation.mutate()}
                  disabled={resendVerificationMutation.isPending}
                  className="btn-primary"
                >
                  {resendVerificationMutation.isPending
                    ? t('common.loading')
                    : t('profile.resendVerification')}
                </button>
              </div>
            )}

            {user.email_verified && (
              <p className="text-sm text-dark-400">{t('profile.canLoginWithEmail')}</p>
            )}
          </div>
        ) : (
          <div>
            <p className="text-sm text-dark-400 mb-6">{t('profile.linkEmailDescription')}</p>

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
                <p className="text-xs text-dark-500 mt-2">{t('profile.passwordHint')}</p>
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
                <div className="bg-error-500/10 border border-error-500/30 text-error-400 p-4 rounded-xl text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-success-500/10 border border-success-500/30 text-success-400 p-4 rounded-xl text-sm">
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={registerEmailMutation.isPending}
                className="btn-primary w-full"
              >
                {registerEmailMutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('common.loading')}
                  </span>
                ) : (
                  t('profile.linkEmail')
                )}
              </button>
            </form>
          </div>
        )}

        {(error || success) && user?.email && (
          <div className="mt-4">
            {error && (
              <div className="bg-error-500/10 border border-error-500/30 text-error-400 p-4 rounded-xl text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-success-500/10 border border-success-500/30 text-success-400 p-4 rounded-xl text-sm">
                {success}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notification Settings */}
      <div className="bento-card">
        <h2 className="text-lg font-semibold text-dark-100 mb-6">{t('profile.notifications.title')}</h2>

        {notificationsLoading ? (
          <div className="flex justify-center py-4">
            <div className="w-6 h-6 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notificationSettings ? (
          <div className="space-y-6">
            {/* Subscription Expiry */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-dark-100">{t('profile.notifications.subscriptionExpiry')}</p>
                  <p className="text-sm text-dark-400">{t('profile.notifications.subscriptionExpiryDesc')}</p>
                </div>
                <button
                  onClick={() => handleNotificationToggle('subscription_expiry_enabled', !notificationSettings.subscription_expiry_enabled)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    notificationSettings.subscription_expiry_enabled ? 'bg-accent-500' : 'bg-dark-600'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      notificationSettings.subscription_expiry_enabled ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
              </div>
              {notificationSettings.subscription_expiry_enabled && (
                <div className="flex items-center gap-3 pl-4">
                  <span className="text-sm text-dark-400">{t('profile.notifications.daysBeforeExpiry')}</span>
                  <select
                    value={notificationSettings.subscription_expiry_days}
                    onChange={(e) => handleNotificationValue('subscription_expiry_days', Number(e.target.value))}
                    className="input w-20 py-1"
                  >
                    {[1, 2, 3, 5, 7, 14].map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Traffic Warning */}
            <div className="space-y-3 border-t border-dark-800/50 pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-dark-100">{t('profile.notifications.trafficWarning')}</p>
                  <p className="text-sm text-dark-400">{t('profile.notifications.trafficWarningDesc')}</p>
                </div>
                <button
                  onClick={() => handleNotificationToggle('traffic_warning_enabled', !notificationSettings.traffic_warning_enabled)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    notificationSettings.traffic_warning_enabled ? 'bg-accent-500' : 'bg-dark-600'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      notificationSettings.traffic_warning_enabled ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
              </div>
              {notificationSettings.traffic_warning_enabled && (
                <div className="flex items-center gap-3 pl-4">
                  <span className="text-sm text-dark-400">{t('profile.notifications.atPercent')}</span>
                  <select
                    value={notificationSettings.traffic_warning_percent}
                    onChange={(e) => handleNotificationValue('traffic_warning_percent', Number(e.target.value))}
                    className="input w-20 py-1"
                  >
                    {[50, 70, 80, 90, 95].map((p) => (
                      <option key={p} value={p}>{p}%</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Balance Low */}
            <div className="space-y-3 border-t border-dark-800/50 pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-dark-100">{t('profile.notifications.balanceLow')}</p>
                  <p className="text-sm text-dark-400">{t('profile.notifications.balanceLowDesc')}</p>
                </div>
                <button
                  onClick={() => handleNotificationToggle('balance_low_enabled', !notificationSettings.balance_low_enabled)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    notificationSettings.balance_low_enabled ? 'bg-accent-500' : 'bg-dark-600'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      notificationSettings.balance_low_enabled ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
              </div>
              {notificationSettings.balance_low_enabled && (
                <div className="flex items-center gap-3 pl-4">
                  <span className="text-sm text-dark-400">{t('profile.notifications.threshold')}</span>
                  <input
                    type="number"
                    value={notificationSettings.balance_low_threshold}
                    onChange={(e) => handleNotificationValue('balance_low_threshold', Number(e.target.value))}
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
              <button
                onClick={() => handleNotificationToggle('news_enabled', !notificationSettings.news_enabled)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  notificationSettings.news_enabled ? 'bg-accent-500' : 'bg-dark-600'
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    notificationSettings.news_enabled ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {/* Promo Offers */}
            <div className="flex items-center justify-between border-t border-dark-800/50 pt-6">
              <div>
                <p className="font-medium text-dark-100">{t('profile.notifications.promoOffers')}</p>
                <p className="text-sm text-dark-400">{t('profile.notifications.promoOffersDesc')}</p>
              </div>
              <button
                onClick={() => handleNotificationToggle('promo_offers_enabled', !notificationSettings.promo_offers_enabled)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  notificationSettings.promo_offers_enabled ? 'bg-accent-500' : 'bg-dark-600'
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    notificationSettings.promo_offers_enabled ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>
        ) : (
          <p className="text-dark-400">{t('profile.notifications.unavailable')}</p>
        )}
      </div>
    </div>
  )
}
