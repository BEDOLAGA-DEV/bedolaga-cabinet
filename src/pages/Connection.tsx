import { useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { openLink as sdkOpenLink } from '@telegram-apps/sdk-react';
import { subscriptionApi } from '../api/subscription';
import { useTelegramSDK } from '../hooks/useTelegramSDK';
import { useHaptic } from '@/platform';
import { SettingsIcon } from '@/components/icons';
import { resolveTemplate, hasTemplates } from '../utils/templateEngine';
import { isHappCryptolinkMode, resolveConnectionUrlForUi } from '../utils/connectionLink';
import { useAuthStore } from '../store/auth';
import type { AppConfig, RemnawavePlatformData } from '../types';
import InstallationGuide from '../components/connection/InstallationGuide';

export default function Connection() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const subId = searchParams.get('sub') ? Number(searchParams.get('sub')) : undefined;
  const user = useAuthStore((state) => state.user);
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const { isTelegramWebApp } = useTelegramSDK();
  const { impact: hapticImpact } = useHaptic();

  const hapticRef = useRef(hapticImpact);
  hapticRef.current = hapticImpact;

  const {
    data: appConfig,
    isLoading,
    error,
  } = useQuery<AppConfig>({
    queryKey: ['appConfig', subId],
    queryFn: () => subscriptionApi.getAppConfig(subId),
  });
  const { data: connectionLink, isLoading: isConnectionLinkLoading } = useQuery({
    queryKey: ['connectionLink', subId],
    queryFn: () => subscriptionApi.getConnectionLink(subId),
    retry: false,
    staleTime: 0,
  });

  const qrConnectionUrl = useMemo(
    () =>
      resolveConnectionUrlForUi({
        mode: connectionLink?.connect_mode,
        happSchemeLink: connectionLink?.happ_scheme_link,
        displayLink: connectionLink?.display_link,
        subscriptionUrl: connectionLink?.subscription_url,
        happCryptLink: connectionLink?.happ_cryptolink,
        happCryptoLink: connectionLink?.happ_crypto_link,
        happLink: connectionLink?.happ_link,
        fallbackUrl: appConfig?.subscriptionUrl,
      }),
    [
      appConfig?.subscriptionUrl,
      connectionLink?.connect_mode,
      connectionLink?.display_link,
      connectionLink?.happ_cryptolink,
      connectionLink?.happ_crypto_link,
      connectionLink?.happ_link,
      connectionLink?.happ_scheme_link,
      connectionLink?.subscription_url,
    ],
  );

  const handleGoBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleOpenQR = useCallback(() => {
    if (!qrConnectionUrl) return;
    navigate('/connection/qr', {
      replace: !isTelegramWebApp,
      state: {
        url: qrConnectionUrl,
        hideLink: connectionLink?.hide_link ?? appConfig?.hideLink ?? false,
        subscriptionId: subId,
      },
    });
  }, [
    navigate,
    qrConnectionUrl,
    connectionLink?.hide_link,
    appConfig?.hideLink,
    isTelegramWebApp,
    subId,
  ]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleGoBack();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleGoBack]);

  const resolveUrl = useCallback(
    (url: string): string => {
      if (!hasTemplates(url) || !appConfig?.subscriptionUrl) return url;
      return resolveTemplate(url, {
        subscriptionUrl: appConfig.subscriptionUrl,
        username: user?.username ?? undefined,
      });
    },
    [appConfig?.subscriptionUrl, user?.username],
  );

  const openDeepLink = useCallback(
    (deepLink: string) => {
      let resolved = deepLink;
      if (isHappCryptolinkMode(connectionLink?.connect_mode) && qrConnectionUrl) {
        // In HAPP cryptolink mode always open the resolved happ://crypt... URL.
        resolved = qrConnectionUrl;
      } else if (hasTemplates(resolved)) {
        resolved = resolveUrl(resolved);
      }
      const isHttpUrl = /^https?:\/\//i.test(resolved);
      const finalUrlForTelegram = isHttpUrl
        ? resolved
        : `${window.location.origin}/miniapp/redirect.html?url=${encodeURIComponent(resolved)}&lang=${i18n.language || 'en'}`;

      if (isTelegramWebApp) {
        try {
          sdkOpenLink(finalUrlForTelegram, { tryInstantView: false });
          return;
        } catch {
          // SDK not available, fallback
        }
      }

      // In regular browsers open deeplink directly (without intermediate redirect page).
      window.location.href = resolved;
    },
    [isTelegramWebApp, i18n.language, resolveUrl, connectionLink?.connect_mode, qrConnectionUrl],
  );

  // Check if any platform has configured apps
  const hasApps = useMemo(() => {
    if (!appConfig?.platforms) return false;
    return Object.values(appConfig.platforms).some(
      (p: RemnawavePlatformData) => p.apps && p.apps.length > 0,
    );
  }, [appConfig?.platforms]);

  if (isLoading || isConnectionLinkLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-accent-500/30 border-t-accent-500" />
      </div>
    );
  }

  if (error || !appConfig || !hasApps) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-dark-800">
          <svg
            className="h-8 w-8 text-dark-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
            />
          </svg>
        </div>
        <h3 className="mb-2 text-xl font-bold text-dark-100">
          {t('subscription.connection.notConfigured')}
        </h3>
        <p className="mb-6 max-w-sm text-dark-400">
          {isAdmin
            ? t('subscription.connection.notConfiguredAdmin')
            : t('subscription.connection.notConfiguredUser')}
        </p>
        {isAdmin && (
          <Link to="/admin/apps" className="btn-primary inline-flex items-center gap-2 px-6 py-2.5">
            <SettingsIcon className="h-4 w-4" />
            {t('subscription.connection.goToApps')}
          </Link>
        )}
      </div>
    );
  }

  // No subscription
  if (!appConfig.hasSubscription) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        <h3 className="mb-2 text-xl font-bold text-dark-100">
          {t('subscription.connection.title')}
        </h3>
        <p className="mb-4 text-dark-400">{t('subscription.connection.noSubscription')}</p>
        <button onClick={handleGoBack} className="btn-primary px-6 py-2">
          {t('common.close')}
        </button>
      </div>
    );
  }

  return (
    <InstallationGuide
      appConfig={appConfig}
      onOpenDeepLink={openDeepLink}
      isTelegramWebApp={isTelegramWebApp}
      onGoBack={handleGoBack}
      onOpenQR={handleOpenQR}
    />
  );
}
