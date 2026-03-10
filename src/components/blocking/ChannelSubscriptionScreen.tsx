import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useBlockingStore } from '../../store/blocking';
import { apiClient, isChannelSubscriptionError } from '../../api/client';

const CHECK_COOLDOWN_SECONDS = 5;

function safeOpenUrl(url: string | undefined | null): void {
  if (!url) return;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      window.open(url, '_blank', 'noopener');
    }
  } catch {
    // invalid URL, do nothing
  }
}

export default function ChannelSubscriptionScreen() {
  const { t } = useTranslation();
  const channelInfo = useBlockingStore((state) => state.channelInfo);
  const clearBlocking = useBlockingStore((state) => state.clearBlocking);
  const [isChecking, setIsChecking] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const isCheckingRef = useRef(false);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  const allChannels = channelInfo?.channels ?? [];
  const channels = allChannels.filter((ch) => !ch.is_subscribed);

  const checkSubscription = useCallback(async () => {
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;
    setIsChecking(true);
    setError(null);

    try {
      await apiClient.get('/cabinet/auth/me');
      clearBlocking();
      window.location.reload();
    } catch (err: unknown) {
      if (isChannelSubscriptionError(err)) {
        setError(t('blocking.channel.notSubscribed'));
      } else {
        setError(t('blocking.channel.checkError'));
      }
    } finally {
      isCheckingRef.current = false;
      setIsChecking(false);
      setCooldown(CHECK_COOLDOWN_SECONDS);
    }
  }, [clearBlocking, t]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-dark-950 p-6">
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="mb-8">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
            <svg className="h-12 w-12 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className="mb-4 text-2xl font-bold text-white">{t('blocking.channel.title')}</h1>

        {/* Message */}
        <p className="mb-6 text-lg text-gray-400">
          {channelInfo?.message || t('blocking.channel.defaultMessage')}
        </p>

        {/* Channel list (only unsubscribed channels) */}
        {channels.length > 0 && (
          <div className="mb-6 space-y-3">
            {channels.map((ch) => (
              <div
                key={ch.channel_id}
                className="flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/10 p-3"
              >
                <span className="text-sm font-medium text-white">{ch.title || ch.channel_id}</span>
                {ch.channel_link && (
                  <button
                    onClick={() => safeOpenUrl(ch.channel_link)}
                    className="rounded-lg bg-blue-500/20 px-3 py-1 text-xs font-medium text-blue-400 hover:bg-blue-500/30"
                  >
                    {t('blocking.channel.openChannel')}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Fallback: single channel (legacy) */}
        {channels.length === 0 && channelInfo?.channel_link && (
          <button
            onClick={() => safeOpenUrl(channelInfo.channel_link)}
            className="mb-6 flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-4 font-semibold text-white transition-all duration-200 hover:from-blue-600 hover:to-cyan-600"
          >
            {t('blocking.channel.openChannel')}
          </button>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Check subscription button */}
        <button
          onClick={checkSubscription}
          disabled={isChecking || cooldown > 0}
          className="flex w-full items-center justify-center gap-3 rounded-xl bg-dark-800 px-6 py-4 font-semibold text-white transition-all duration-200 hover:bg-dark-700 disabled:bg-dark-800 disabled:opacity-60"
        >
          {isChecking ? (
            <>
              <svg
                className="h-5 w-5 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              {t('blocking.channel.checking')}
            </>
          ) : cooldown > 0 ? (
            <>
              <svg
                className="h-5 w-5 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {t('blocking.channel.waitSeconds', { seconds: cooldown })}
            </>
          ) : (
            <>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              {t('blocking.channel.checkSubscription')}
            </>
          )}
        </button>

        {/* Hint */}
        <p className="mt-4 text-sm text-gray-500">{t('blocking.channel.hint')}</p>
      </div>
    </div>
  );
}
