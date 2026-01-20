import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useBlockingStore } from '../../store/blocking'
import { apiClient } from '../../api/client'

const CHECK_COOLDOWN_SECONDS = 5

export default function ChannelSubscriptionScreen() {
  const { t } = useTranslation()
  const { channelInfo, clearBlocking } = useBlockingStore()
  const [isChecking, setIsChecking] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return

    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [cooldown])

  const openChannel = useCallback(() => {
    if (channelInfo?.channel_link) {
      window.open(channelInfo.channel_link, '_blank')
    }
  }, [channelInfo?.channel_link])

  const checkSubscription = useCallback(async () => {
    if (isChecking || cooldown > 0) return

    setIsChecking(true)
    setError(null)

    try {
      // Make any authenticated request - if channel check passes, it will succeed
      await apiClient.get('/cabinet/auth/me')
      // If we get here, subscription is valid - reload page
      clearBlocking()
      window.location.reload()
    } catch (err: unknown) {
      // Check if it's still a channel subscription error
      const error = err as { response?: { status?: number; data?: { detail?: { code?: string } } } }
      if (error.response?.status === 403 && error.response?.data?.detail?.code === 'channel_subscription_required') {
        setError(t('blocking.channel.notSubscribed', 'Вы ещё не подписались на канал'))
      } else {
        // Other error - might be network issue
        setError(t('blocking.channel.checkError', 'Ошибка проверки. Попробуйте позже.'))
      }
    } finally {
      setIsChecking(false)
      setCooldown(CHECK_COOLDOWN_SECONDS)
    }
  }, [isChecking, cooldown, clearBlocking, t])

  return (
    <div className="fixed inset-0 z-[100] bg-dark-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
            <svg
              className="w-12 h-12 text-blue-400"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-white mb-4">
          {t('blocking.channel.title', 'Подписка на канал')}
        </h1>

        {/* Message */}
        <p className="text-gray-400 mb-8 text-lg">
          {channelInfo?.message || t('blocking.channel.defaultMessage', 'Для продолжения работы подпишитесь на наш канал')}
        </p>

        {/* Error message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Buttons */}
        <div className="space-y-4">
          {/* Open channel button */}
          <button
            onClick={openChannel}
            disabled={!channelInfo?.channel_link}
            className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-gray-600 disabled:to-gray-600 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-3"
          >
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
            {t('blocking.channel.openChannel', 'Открыть канал')}
          </button>

          {/* Check subscription button */}
          <button
            onClick={checkSubscription}
            disabled={isChecking || cooldown > 0}
            className="w-full py-4 px-6 bg-dark-800 hover:bg-dark-700 disabled:bg-dark-800 disabled:opacity-60 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-3"
          >
            {isChecking ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('blocking.channel.checking', 'Проверяем...')}
              </>
            ) : cooldown > 0 ? (
              <>
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t('blocking.channel.waitSeconds', 'Подождите {{seconds}} сек.', { seconds: cooldown })}
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {t('blocking.channel.checkSubscription', 'Проверить подписку')}
              </>
            )}
          </button>
        </div>

        {/* Hint */}
        <p className="text-gray-500 text-sm mt-6">
          {t('blocking.channel.hint', 'После подписки нажмите кнопку проверки')}
        </p>
      </div>
    </div>
  )
}
