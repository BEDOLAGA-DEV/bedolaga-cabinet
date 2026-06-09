import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useBlockingStore } from '../../store/blocking';
import { apiClient, isChannelSubscriptionError } from '../../api/client';
import { usePlatform } from '../../platform';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { TelegramIcon, ClockIcon, CheckIcon, RestartIcon } from '@/components/icons';
import { Button } from '@/components/primitives';
import BlockingShell from './BlockingShell';

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

  // Check-subscription button — 3 states (checking / cooldown / idle).
  let checkIcon: ReactNode;
  let checkLabel: string;
  if (isChecking) {
    checkIcon = <RestartIcon className="h-5 w-5 animate-spin" />;
    checkLabel = t('blocking.channel.checking');
  } else if (cooldown > 0) {
    checkIcon = <ClockIcon className="h-5 w-5" />;
    checkLabel = t('blocking.channel.waitSeconds', { seconds: cooldown });
  } else {
    checkIcon = <CheckIcon className="h-5 w-5" />;
    checkLabel = t('blocking.channel.checkSubscription');
  }

  return (
    <BlockingShell
      screenRef={screenRef}
      titleId="channel-sub-title"
      accent="info"
      ariaLive="polite"
      icon={<TelegramIcon className="h-9 w-9" />}
      title={t('blocking.channel.title')}
      description={channelInfo?.message || t('blocking.channel.defaultMessage')}
      footer={t('blocking.channel.hint')}
      actions={
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          onClick={checkSubscription}
          disabled={isChecking || cooldown > 0}
          leftIcon={checkIcon}
        >
          {checkLabel}
        </Button>
      }
    >
      {/* Channel list (only unsubscribed channels) */}
      {channels.length > 0 && (
        <div className="space-y-2">
          {channels.map((ch) => (
            <div
              key={ch.channel_id}
              className="flex items-center justify-between gap-3 rounded-xl border border-error-500/30 bg-error-500/10 p-3"
            >
              <span className="truncate text-sm font-medium text-dark-50">
                {ch.title || ch.channel_id}
              </span>
              {ch.channel_link && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="shrink-0"
                  onClick={() => openChannel(ch.channel_link)}
                >
                  {t('blocking.channel.openChannel')}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Fallback: single channel (legacy) */}
      {channels.length === 0 && channelInfo?.channel_link && (
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={() => openChannel(channelInfo.channel_link)}
        >
          {t('blocking.channel.openChannel')}
        </Button>
      )}

      {/* Error message */}
      {error && (
        <div className="rounded-xl border border-error-500/30 bg-error-500/10 p-3">
          <p className="text-sm text-error-400">{error}</p>
        </div>
      )}
    </BlockingShell>
  );
}
