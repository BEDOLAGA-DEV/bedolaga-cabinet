import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { brandingApi } from '../api/branding';
import { copyToClipboard } from '../utils/clipboard';
import {
  CheckIcon,
  CopyIcon,
  ExclamationIcon,
  ExternalLinkIcon,
  LinkIcon,
} from '@/components/icons';

type Status = 'countdown' | 'fallback' | 'error';

// App schemes configuration - same as miniapp
const appSchemes = [
  { scheme: 'happ://', icon: 'H', name: 'Happ' },
  { scheme: 'incy://', icon: 'I', name: 'INCY' },
  { scheme: 'flclash://', icon: 'F', name: 'FlClash' },
  { scheme: 'clash://', icon: 'C', name: 'Clash Meta' },
  { scheme: 'sing-box://', icon: 'S', name: 'sing-box' },
  { scheme: 'v2rayng://', icon: 'V', name: 'v2rayNG' },
  { scheme: 'sub://', icon: 'R', name: 'Shadowrocket' },
  { scheme: 'shadowrocket://', icon: 'R', name: 'Shadowrocket' },
  { scheme: 'hiddify://', icon: 'H', name: 'Hiddify' },
  { scheme: 'streisand://', icon: 'S', name: 'Streisand' },
  { scheme: 'quantumult://', icon: 'Q', name: 'Quantumult X' },
  { scheme: 'surge://', icon: 'S', name: 'Surge' },
  { scheme: 'loon://', icon: 'L', name: 'Loon' },
  { scheme: 'nekobox://', icon: 'N', name: 'NekoBox' },
  { scheme: 'v2box://', icon: 'V', name: 'V2Box' },
];

const COUNTDOWN_SECONDS = 5;

// Validate deep link to prevent javascript: and other dangerous schemes
const isValidDeepLink = (url: string): boolean => {
  if (!url) return false;
  const lowerUrl = url.toLowerCase().trim();
  // Block dangerous schemes
  // eslint-disable-next-line no-script-url -- listing dangerous schemes to block them
  const dangerousSchemes = ['javascript:', 'data:', 'vbscript:', 'file:'];
  if (dangerousSchemes.some((scheme) => lowerUrl.startsWith(scheme))) {
    return false;
  }
  // Only allow known app schemes
  return appSchemes.some((app) => lowerUrl.startsWith(app.scheme));
};

export default function DeepLinkRedirect() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<Status>('countdown');
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [copied, setCopied] = useState(false);
  const fallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get branding
  const { data: branding } = useQuery({
    queryKey: ['branding'],
    queryFn: brandingApi.getBranding,
    staleTime: 60000,
  });

  const projectName = branding ? branding.name : import.meta.env.VITE_APP_NAME || 'VPN';
  const logoLetter = branding?.logo_letter || import.meta.env.VITE_APP_LOGO || 'V';
  const logoUrl = branding ? brandingApi.getLogoUrl(branding) : null;

  // Parse raw query string to preserve '+' chars in base64 crypto links.
  // URLSearchParams decodes '+' as space, breaking ss://, vless:// etc.
  // decodeURIComponent does NOT treat '+' as space, so parsing raw pairs is correct.
  const getRawParam = (key: string): string => {
    const search = window.location.search.substring(1);
    for (const pair of search.split('&')) {
      const idx = pair.indexOf('=');
      if (idx === -1) continue;
      if (decodeURIComponent(pair.substring(0, idx)) === key) {
        return decodeURIComponent(pair.substring(idx + 1));
      }
    }
    return '';
  };

  // Get parameters
  const deepLink = getRawParam('url') || getRawParam('deeplink') || '';
  const subscriptionUrl = getRawParam('sub') || '';
  const appParam = searchParams.get('app') || '';

  // Detect app from deep link
  const appInfo = deepLink
    ? appSchemes.find((a) => deepLink.toLowerCase().startsWith(a.scheme))
    : null;
  const appName = appInfo?.name || appParam || 'VPN';
  const appIcon = appInfo?.icon || appName[0]?.toUpperCase() || 'V';

  // Open deep link - same as miniapp, just window.location.href
  const openDeepLink = useCallback(() => {
    if (!deepLink || !isValidDeepLink(deepLink)) return;
    window.location.href = deepLink;
  }, [deepLink]);

  // Countdown timer effect
  useEffect(() => {
    if (!deepLink || !isValidDeepLink(deepLink)) {
      setStatus('error');
      return;
    }

    if (status !== 'countdown') return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          openDeepLink();
          // Show fallback after a delay - store ref for cleanup
          fallbackTimeoutRef.current = setTimeout(() => setStatus('fallback'), 2000);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      // Cleanup fallback timeout on unmount
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
        fallbackTimeoutRef.current = null;
      }
    };
  }, [deepLink, status, openDeepLink]);

  const handleCopyLink = async () => {
    const linkToCopy = subscriptionUrl || deepLink;
    // Clear previous timeout to prevent stacking
    if (copiedTimeoutRef.current) {
      clearTimeout(copiedTimeoutRef.current);
    }
    await copyToClipboard(linkToCopy);
    setCopied(true);
    copiedTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
  };

  // Cleanup copied timeout on unmount
  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) {
        clearTimeout(copiedTimeoutRef.current);
      }
    };
  }, []);

  // Progress percentage
  const progress = ((COUNTDOWN_SECONDS - countdown) / COUNTDOWN_SECONDS) * 100;

  return (
    <div className="min-h-viewport flex items-center justify-center p-4">
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent-500/10 via-transparent to-transparent" />

      <div className="relative w-full max-w-sm text-center">
        {/* Logo with pulse animation */}
        <div className="mx-auto mb-6 flex h-20 w-20 animate-pulse items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-accent-400 to-accent-600 shadow-lg shadow-accent-500/30">
          {branding?.has_custom_logo && logoUrl ? (
            <img src={logoUrl} alt={projectName || 'Logo'} className="h-full w-full object-cover" />
          ) : (
            <span className="text-3xl font-bold text-white">{logoLetter}</span>
          )}
        </div>

        <h1 className="mb-1 text-2xl font-bold text-dark-50">{projectName || 'VPN'}</h1>

        {status !== 'error' && (
          <p className="mb-6 text-dark-400">
            {t('deepLink.connecting')} {appName}...
          </p>
        )}

        {/* Countdown State */}
        {status === 'countdown' && (
          <div className="card !bg-dark-800/80 p-6 backdrop-blur-sm">
            {/* App icon */}
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-500/20">
              <span className="text-2xl font-bold text-accent-400">{appIcon}</span>
            </div>

            {/* Spinner */}
            <div className="border-3 mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-dark-700 border-t-accent-500" />

            {/* Timer */}
            <div className="mb-4">
              <p className="mb-2 text-sm text-dark-500">{t('deepLink.redirecting')}</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-4xl font-bold text-accent-400">{countdown}</span>
                <span className="text-dark-400">{t('deepLink.seconds')}</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-dark-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent-400 to-accent-600 transition-all duration-1000 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>

            <p className="mb-4 text-sm text-dark-500">{t('deepLink.manual')}</p>

            {/* Open now button */}
            <button
              onClick={openDeepLink}
              className="btn-primary flex w-full items-center justify-center gap-2 py-3"
            >
              <ExternalLinkIcon className="h-5 w-5" />
              {t('deepLink.openApp')}
            </button>
          </div>
        )}

        {/* Fallback State - App didn't open */}
        {status === 'fallback' && (
          <div className="card !bg-dark-800/80 p-6 backdrop-blur-sm">
            {/* App icon */}
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-500/20">
              <span className="text-2xl font-bold text-accent-400">{appIcon}</span>
            </div>

            <div className="space-y-3">
              {/* Copy subscription link */}
              <button
                onClick={handleCopyLink}
                className="btn-primary flex w-full items-center justify-center gap-2 py-3"
              >
                {copied ? (
                  <>
                    <CheckIcon className="h-5 w-5" />
                    {t('deepLink.copied')}
                  </>
                ) : (
                  <>
                    <CopyIcon className="h-5 w-5" />
                    {t('deepLink.copyLink')}
                  </>
                )}
              </button>

              {/* Try again button */}
              <button
                onClick={openDeepLink}
                className="btn-secondary flex w-full items-center justify-center gap-2"
              >
                <ExternalLinkIcon className="h-5 w-5" />
                {t('deepLink.tryAgain')}
              </button>

              {/* Back to cabinet */}
              <button
                onClick={() => navigate('/subscriptions')}
                className="w-full py-2 text-sm text-dark-500 transition-colors hover:text-dark-300"
              >
                {t('deepLink.backToCabinet')}
              </button>
            </div>

            {/* Instructions */}
            <div className="mt-6 rounded-xl border border-dark-700 bg-dark-900/50 p-4 text-left">
              <h3 className="mb-2 text-sm font-medium text-dark-200">{t('deepLink.howToAdd')}</h3>
              <ol className="list-inside list-decimal space-y-1.5 text-xs text-dark-400">
                <li>{t('deepLink.step1')}</li>
                <li>
                  {t('deepLink.step2')} {appName}
                </li>
                <li>{t('deepLink.step3')}</li>
                <li>{t('deepLink.step4')}</li>
              </ol>
            </div>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="card !bg-dark-800/80 p-6 backdrop-blur-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-error-500/20">
              <ExclamationIcon className="h-8 w-8 text-error-400" />
            </div>
            <p className="mb-2 font-medium text-dark-200">{t('deepLink.errorTitle')}</p>
            <p className="mb-6 text-sm text-dark-400">{t('deepLink.errorDesc')}</p>
            <button onClick={() => navigate('/subscriptions')} className="btn-primary w-full">
              {t('deepLink.goToSubscription')}
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 flex items-center justify-center gap-2 text-dark-600">
          <LinkIcon className="h-4 w-4" />
          <span className="text-xs">VPN Config Redirect</span>
        </div>
      </div>
    </div>
  );
}
