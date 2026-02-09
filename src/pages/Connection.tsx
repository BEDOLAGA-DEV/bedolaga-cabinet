import { useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { openLink as sdkOpenLink } from '@telegram-apps/sdk-react';
import { subscriptionApi } from '../api/subscription';
import { useTelegramSDK } from '../hooks/useTelegramSDK';
import { useHaptic } from '@/platform';
import { resolveTemplate, hasTemplates } from '../utils/templateEngine';
import { useAuthStore } from '../store/auth';
import type { AppConfig, RemnawavePlatformData } from '../types';
import InstallationGuide from '../components/connection/InstallationGuide';

export default function Connection() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuthStore();
  const { isTelegramWebApp } = useTelegramSDK();
  const { impact: hapticImpact } = useHaptic();

  const hapticRef = useRef(hapticImpact);
  hapticRef.current = hapticImpact;

  const {
    data: appConfig,
    isLoading,
    error,
  } = useQuery<AppConfig>({
    queryKey: ['appConfig'],
    queryFn: () => subscriptionApi.getAppConfig(),
  });

  const handleGoBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

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
      if (hasTemplates(resolved)) {
        resolved = resolveUrl(resolved);
      }

      const finalUrl = `${window.location.origin}/miniapp/redirect.html?url=${encodeURIComponent(resolved)}&lang=${i18n.language || 'en'}`;

      if (isTelegramWebApp) {
        try {
          sdkOpenLink(finalUrl, { tryInstantView: false });
          return;
        } catch {
          // SDK not available, fallback
        }
      }

      window.location.href = finalUrl;
    },
    [isTelegramWebApp, i18n.language, resolveUrl],
  );

  // Check if any platform has configured apps
  const hasApps = useMemo(() => {
    if (!appConfig?.platforms) return false;
    return Object.values(appConfig.platforms).some(
      (p: RemnawavePlatformData) => p.apps && p.apps.length > 0,
    );
  }, [appConfig?.platforms]);

  // Loading
  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-accent-500/30 border-t-accent-500" />
      </div>
    );
  }

  // Error
  if (error || !appConfig) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        <p className="mb-4 text-lg text-dark-300">{t('common.error')}</p>
        <button onClick={handleGoBack} className="btn-primary px-6 py-2">
          {t('common.close')}
        </button>
      </div>
    );
  }

  // No apps configured — check before subscription since empty config also has no subscription
  if (!hasApps) {
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
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
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
    />
  );
}
