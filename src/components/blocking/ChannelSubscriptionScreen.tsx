import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useBlockingStore } from '../../store/blocking';
import { apiClient, isChannelSubscriptionError } from '../../api/client';
import { usePlatform } from '../../platform';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { TelegramIcon, ClockIcon, CheckIcon } from '@/components/icons';

const CHECK_COOLDOWN_SECONDS = 5;

export default function ChannelSubscriptionScreen() {
  const { t } = useTranslation();
  const channelInfo = useBlockingStore((state) => state.channelInfo);
  const clearBlocking = useBlockingStore((state) => state.clearBlocking);
  const [isChecking, setIsChecking] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const isCheckingRef = useRef(false);
  const { openLink, openTelegramLink } = usePlatform();

  // Route channel links through the platform adapter: inside the Telegram
  // WebView a raw window.open is intercepted by the client and the link
  // silently fails to open. t.me links use openTelegramLink; others openLink.
  const openChannel = useCallback(
    (url: string | undefined | null) => {
      if (!url) return;
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return;
        if (parsed.hostname === 't.me' || parsed.hostname.endsWith('.t.me')) {
          openTelegramLink(url);
        } else {
          openLink(url);
        }
      } catch {
        // invalid URL, do nothing
      }
    },
    [openLink, openTelegramLink],
  );

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

  const screenRef = useFocusTrap<HTMLDivElement>(true, { lockScroll: false });

  return (
    <div
      ref={screenRef}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="channel-sub-title"
      tabIndex={-1}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-dark-950 p-6"
    >
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="mb-8">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
            <TelegramIcon className="h-12 w-12 text-blue-400" />
          </div>
        </div>

        {/* Title */}
        <h1 id="channel-sub-title" className="mb-4 text-2xl font-bold text-white">
          {t('blocking.channel.title')}
        </h1>

        {/* Message */}
        <p className="mb-6 text-lg text-dark-400">
          {channelInfo?.message || t('blocking.channel.defaultMessage')}
        </p>

        {/* Channel list (only unsubscribed channels) */}
        {channels.length > 0 && (
          <div className="mb-6 space-y-3">
            {channels.map((ch) => (
              <div
                key={ch.channel_id}
                className="flex items-center justify-between rounded-xl border border-error-500/30 bg-error-500/10 p-3"
              >
                <span className="text-sm font-medium text-white">{ch.title || ch.channel_id}</span>
                {ch.channel_link && (
                  <button
                    onClick={() => openChannel(ch.channel_link)}
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
            onClick={() => openChannel(channelInfo.channel_link)}
            className="mb-6 flex w-full items-center justify-center gap-3 rounded-xl bg-accent-500 px-6 py-4 font-semibold text-white transition-colors duration-200 hover:bg-accent-400"
          >
            {t('blocking.channel.openChannel')}
          </button>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-4 rounded-xl border border-error-500/30 bg-error-500/10 p-3">
            <p className="text-sm text-error-400">{error}</p>
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
              <ClockIcon className="h-5 w-5 text-dark-500" />
              {t('blocking.channel.waitSeconds', { seconds: cooldown })}
            </>
          ) : (
            <>
              <CheckIcon className="h-5 w-5" />
              {t('blocking.channel.checkSubscription')}
            </>
          )}
        </button>

        {/* Hint */}
        <p className="mt-4 text-sm text-dark-500">{t('blocking.channel.hint')}</p>
      </div>
    </div>
  );
}
