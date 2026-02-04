import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { subscriptionApi } from '../api/subscription';
import { useTelegramWebApp } from '../hooks/useTelegramWebApp';
import { useBackButton, useHaptic } from '@/platform';
import type { AppInfo, AppConfig, LocalizedText } from '../types';

interface ConnectionModalProps {
  onClose: () => void;
}

// Icons
const CloseIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const CopyIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
    />
  </svg>
);

const CheckIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const LinkIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
    />
  </svg>
);

const ChevronIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

const BackIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);

// App icons
const HappIcon = () => (
  <svg className="h-6 w-6" viewBox="0 0 50 50" fill="currentColor">
    <path d="M22.3264 3H12.3611L9.44444 20.1525L21.3542 8.22034L22.3264 3Z" />
    <path d="M10.9028 20.1525L22.8125 8.22034L20.8681 21.1469H28.4028L27.9167 21.6441L20.8681 28.8531H19.4097V30.5932L7.5 42.5254L10.9028 20.1525Z" />
    <path d="M41.0417 8.22034L28.8889 20.1525L31.684 3H41.7708L41.0417 8.22034Z" />
    <path d="M30.3472 20.1525L42.5 8.22034L38.6111 30.3446L26.9444 42.5254L29.0104 28.8531H22.3264L29.6181 21.1469H30.3472V20.1525Z" />
    <path d="M40.0694 30.3446L28.4028 42.5254L27.9167 47H37.8819L40.0694 30.3446Z" />
    <path d="M18.6806 47H8.47222L8.95833 42.5254L20.8681 30.5932L18.6806 47Z" />
  </svg>
);

const ClashMetaIcon = () => (
  <svg className="h-6 w-6" viewBox="0 0 50 50" fill="currentColor">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M4.99239 5.21742C4.0328 5.32232 3.19446 5.43999 3.12928 5.47886C2.94374 5.58955 2.96432 33.4961 3.14997 33.6449C3.2266 33.7062 4.44146 34.002 5.84976 34.3022C7.94234 34.7483 8.60505 34.8481 9.47521 34.8481C10.3607 34.8481 10.5706 34.8154 10.7219 34.6541C10.8859 34.479 10.9066 33.7222 10.9338 26.9143L10.9638 19.3685L11.2759 19.1094C11.6656 18.7859 12.1188 18.7789 12.5285 19.0899C12.702 19.2216 14.319 20.624 16.1219 22.2061C17.9247 23.7883 19.5136 25.1104 19.6527 25.144C19.7919 25.1777 20.3714 25.105 20.9406 24.9825C22.6144 24.6221 23.3346 24.5424 24.9233 24.5421C26.4082 24.5417 27.8618 24.71 29.2219 25.0398C29.6074 25.1333 30.0523 25.1784 30.2107 25.1399C30.369 25.1016 31.1086 24.5336 31.8543 23.8777C33.3462 22.5653 33.6461 22.3017 35.4359 20.7293C36.1082 20.1388 36.6831 19.6313 36.7137 19.6017C37.5681 18.7742 38.0857 18.6551 38.6132 19.1642L38.9383 19.478V34.5138L39.1856 34.6809C39.6343 34.9843 41.2534 34.9022 43.195 34.4775C44.1268 34.2737 45.2896 34.0291 45.779 33.9339C46.2927 33.8341 46.7276 33.687 46.8079 33.5861C47.0172 33.3228 47.0109 5.87708 46.8014 5.6005C46.6822 5.4431 46.2851 5.37063 44.605 5.1996C43.477 5.08482 42.2972 5.00505 41.983 5.02223L41.4121 5.05368L35.4898 10.261C27.3144 17.4495 27.7989 17.0418 27.5372 16.9533C27.4148 16.912 26.1045 16.8746 24.6253 16.8702C22.0674 16.8626 21.9233 16.8513 21.6777 16.6396C21.0693 16.115 17.2912 12.8028 14.5726 10.4108C12.9548 8.98729 10.9055 7.18761 10.0186 6.41134L8.40584 5L7.5715 5.01331C7.11256 5.02072 5.95198 5.11252 4.99239 5.21742Z"
    />
  </svg>
);

const ShadowrocketIcon = () => (
  <svg
    className="h-6 w-6"
    viewBox="0 0 50 50"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21.2394 36.832L16.5386 39.568C16.5386 39.568 13.7182 36.832 11.8379 33.184C9.95756 29.536 16.5386 23.152 16.5386 23.152M21.2394 36.832H28.7606M21.2394 36.832C21.2394 36.832 15.5985 24.064 17.4788 16.768C19.3591 9.472 25 4 25 4C25 4 30.6409 9.472 32.5212 16.768C34.4015 24.064 28.7606 36.832 28.7606 36.832M28.7606 36.832L33.4614 39.568C33.4614 39.568 36.2818 36.832 38.1621 33.184C40.0424 29.536 33.4614 23.152 33.4614 23.152M25 46L26.8803 40.528H23.1197L25 46ZM25.9402 17.68C26.4594 18.1837 26.4594 19.0003 25.9402 19.504C25.4209 20.0077 24.5791 20.0077 24.0598 19.504C23.5406 19.0003 23.5406 18.1837 24.0598 17.68C24.5791 17.1763 25.4209 17.1763 25.9402 17.68Z" />
  </svg>
);

const StreisandIcon = () => (
  <svg className="h-6 w-6" viewBox="0 0 50 50" fill="currentColor">
    <path d="M25 46L24.2602 47.0076C24.7027 47.3325 25.3054 47.3306 25.7459 47.0031L25 46ZM6.14773 32.1591H4.89773C4.89773 32.557 5.0872 32.9312 5.40797 33.1667L6.14773 32.1591ZM43.6136 32.1591L44.3595 33.1622C44.6767 32.9263 44.8636 32.5543 44.8636 32.1591H43.6136ZM6.14773 19.9886L5.42485 18.9689C5.09421 19.2032 4.89773 19.5834 4.89773 19.9886H6.14773ZM25 6.625L25.729 5.6096L25.0046 5.08952L24.2771 5.60522L25 6.625ZM43.6136 19.9886H44.8636C44.8636 19.586 44.6697 19.208 44.3426 18.9732L43.6136 19.9886ZM25 46L25.7398 44.9924L6.88748 31.1515L6.14773 32.1591L5.40797 33.1667L24.2602 47.0076L25 46ZM43.6136 32.1591L42.8678 31.156L24.2541 44.9969L25 46L25.7459 47.0031L44.3595 33.1622L43.6136 32.1591Z" />
  </svg>
);

const getAppIcon = (appName: string): React.ReactNode => {
  const name = appName.toLowerCase();
  if (name.includes('happ')) return <HappIcon />;
  if (name.includes('shadowrocket') || name.includes('rocket')) return <ShadowrocketIcon />;
  if (name.includes('streisand')) return <StreisandIcon />;
  if (name.includes('clash') || name.includes('meta') || name.includes('verge'))
    return <ClashMetaIcon />;
  return <span className="text-lg">📦</span>;
};

const platformOrder = ['ios', 'android', 'windows', 'macos', 'linux', 'androidTV', 'appleTV'];
// eslint-disable-next-line no-script-url -- listing dangerous schemes to block them
const dangerousSchemes = ['javascript:', 'data:', 'vbscript:', 'file:'];

function isValidExternalUrl(url: string | undefined): boolean {
  if (!url) return false;
  const lowerUrl = url.toLowerCase().trim();
  if (dangerousSchemes.some((scheme) => lowerUrl.startsWith(scheme))) return false;
  return lowerUrl.startsWith('http://') || lowerUrl.startsWith('https://');
}

function isValidDeepLink(url: string | undefined): boolean {
  if (!url) return false;
  const lowerUrl = url.toLowerCase().trim();
  if (dangerousSchemes.some((scheme) => lowerUrl.startsWith(scheme))) return false;
  return lowerUrl.includes('://');
}

function detectPlatform(): string | null {
  if (typeof window === 'undefined' || !navigator?.userAgent) return null;
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return /tv|television/.test(ua) ? 'androidTV' : 'android';
  if (/macintosh|mac os x/.test(ua)) return 'macos';
  if (/windows/.test(ua)) return 'windows';
  if (/linux/.test(ua)) return 'linux';
  return null;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  });
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

export default function ConnectionModal({ onClose }: ConnectionModalProps) {
  const { t, i18n } = useTranslation();
  const [selectedApp, setSelectedApp] = useState<AppInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const [showAppSelector, setShowAppSelector] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

  const { isTelegramWebApp, isFullscreen, safeAreaInset, contentSafeAreaInset } =
    useTelegramWebApp();
  const { impact: hapticImpact } = useHaptic();
  const isMobileScreen = useIsMobile();
  const isMobile = isMobileScreen;
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Ref для хранения актуального обработчика BackButton (фикс мигания)
  const backButtonHandlerRef = useRef<() => void>(() => {});
  // Ref for haptic to avoid recreating handleBackButton
  const hapticRef = useRef(hapticImpact);
  hapticRef.current = hapticImpact;

  // Prevent scroll events from bubbling to parent/Telegram
  const handleScrollContainerWheel = useCallback((e: React.WheelEvent) => {
    const container = e.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isAtTop = scrollTop === 0;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;

    // Prevent scroll propagation when not at boundaries, or when scrolling away from boundary
    if ((!isAtTop && !isAtBottom) || (isAtTop && e.deltaY > 0) || (isAtBottom && e.deltaY < 0)) {
      e.stopPropagation();
    }
  }, []);

  const safeBottom = isTelegramWebApp
    ? Math.max(safeAreaInset.bottom, contentSafeAreaInset.bottom)
    : 0;
  const safeTop = isTelegramWebApp
    ? Math.max(safeAreaInset.top, contentSafeAreaInset.top) + (isFullscreen ? 45 : 0)
    : 0;

  const {
    data: appConfig,
    isLoading,
    error,
  } = useQuery<AppConfig>({
    queryKey: ['appConfig'],
    queryFn: () => subscriptionApi.getAppConfig(),
  });

  const detectedPlatform = useMemo(() => detectPlatform(), []);

  useEffect(() => {
    if (!appConfig?.platforms || selectedApp) return;
    let platform = detectedPlatform;
    if (!platform || !appConfig.platforms[platform]?.length) {
      platform = platformOrder.find((p) => appConfig.platforms[p]?.length > 0) || null;
    }
    if (!platform || !appConfig.platforms[platform]?.length) return;
    const apps = appConfig.platforms[platform];
    const app = apps.find((a) => a.isFeatured) || apps[0];
    if (app) setSelectedApp(app);
  }, [appConfig, detectedPlatform, selectedApp]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleBack = useCallback(() => {
    if (selectedPlatform) {
      setSelectedPlatform(null);
    } else {
      setShowAppSelector(false);
    }
  }, [selectedPlatform]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (showAppSelector) handleBack();
        else handleClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleClose, handleBack, showAppSelector]);

  // Обновляем ref при изменении логики (без перезапуска эффекта BackButton)
  useEffect(() => {
    backButtonHandlerRef.current = showAppSelector ? handleBack : handleClose;
  }, [showAppSelector, handleBack, handleClose]);

  // BackButton using platform hook - always close/back, ref provides current handler
  const handleBackButton = useCallback(() => {
    hapticRef.current('light');
    backButtonHandlerRef.current();
  }, []);

  useBackButton(handleBackButton);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const getLocalizedText = (text: LocalizedText | undefined): string => {
    if (!text) return '';
    const lang = i18n.language || 'en';
    return text[lang] || text['en'] || text['ru'] || Object.values(text)[0] || '';
  };

  const availablePlatforms = useMemo(() => {
    if (!appConfig?.platforms) return [];
    const available = platformOrder.filter((key) => appConfig.platforms[key]?.length > 0);
    if (detectedPlatform && available.includes(detectedPlatform)) {
      return [detectedPlatform, ...available.filter((p) => p !== detectedPlatform)];
    }
    return available;
  }, [appConfig, detectedPlatform]);

  const copySubscriptionLink = async () => {
    if (!appConfig?.subscriptionUrl) return;
    try {
      await navigator.clipboard.writeText(appConfig.subscriptionUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = appConfig.subscriptionUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConnect = (app: AppInfo) => {
    if (!app.deepLink || !isValidDeepLink(app.deepLink)) return;
    const deepLink = app.deepLink;

    // All deep links (including custom schemes like happ://, clash://, etc.)
    // go through redirect.html. Telegram's openLink opens the redirect page
    // in an external browser, which then performs window.location.href to the
    // actual deep link URL. This works for both http(s) and custom schemes.
    const redirectUrl = `${window.location.origin}/miniapp/redirect.html?url=${encodeURIComponent(deepLink)}&lang=${i18n.language || 'en'}`;

    const tg = (
      window as unknown as {
        Telegram?: { WebApp?: { openLink?: (url: string, options?: object) => void } };
      }
    ).Telegram?.WebApp;

    if (tg?.openLink) {
      try {
        tg.openLink(redirectUrl, { try_instant_view: false, try_browser: true });
        return;
      } catch {
        /* fallback */
      }
    }
    window.location.href = redirectUrl;
  };

  // Wrapper component
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    if (isMobile) {
      const content = (
        <div
          className="fixed inset-0 z-[9999] flex flex-col bg-dark-900"
          style={{
            paddingTop: safeTop ? `${safeTop}px` : 'env(safe-area-inset-top, 0px)',
            paddingBottom: safeBottom ? `${safeBottom}px` : 'env(safe-area-inset-bottom, 0px)',
          }}
        >
          {children}
        </div>
      );
      if (typeof document !== 'undefined') return createPortal(content, document.body);
      return content;
    }

    // Desktop centered - positioned higher
    return (
      <div
        className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[8vh]"
        onClick={handleClose}
      >
        <div
          className="relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-dark-700/50 bg-dark-900 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    );
  };

  // Loading
  if (isLoading) {
    return (
      <Wrapper>
        <div className="flex flex-1 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-accent-500/30 border-t-accent-500" />
        </div>
      </Wrapper>
    );
  }

  // Error
  if (error || !appConfig) {
    return (
      <Wrapper>
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
          <p className="mb-4 text-lg text-dark-300">{t('common.error')}</p>
          <button onClick={handleClose} className="btn-primary px-6 py-2">
            {t('common.close')}
          </button>
        </div>
      </Wrapper>
    );
  }

  // No subscription
  if (!appConfig.hasSubscription) {
    return (
      <Wrapper>
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
          <h3 className="mb-2 text-xl font-bold text-dark-100">
            {t('subscription.connection.title')}
          </h3>
          <p className="mb-4 text-dark-400">{t('subscription.connection.noSubscription')}</p>
          <button onClick={handleClose} className="btn-primary px-6 py-2">
            {t('common.close')}
          </button>
        </div>
      </Wrapper>
    );
  }

  // App selector
  if (showAppSelector) {
    const platformNames: Record<string, string> = {
      ios: 'iOS',
      android: 'Android',
      windows: 'Windows',
      macos: 'macOS',
      linux: 'Linux',
      androidTV: 'Android TV',
      appleTV: 'Apple TV',
    };

    const platformIcons: Record<string, React.ReactNode> = {
      ios: (
        <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
        </svg>
      ),
      android: (
        <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24c-1.39-.59-2.94-.92-4.58-.92s-3.19.33-4.58.92L5.5 5.67c-.16-.28-.54-.37-.83-.22-.31.16-.43.54-.26.85l1.84 3.18C3.38 11.11 1.5 14.12 1.5 17.5h21c0-3.38-1.88-6.39-4.9-8.02zM7 15.25c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25zm10 0c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25z" />
        </svg>
      ),
      windows: (
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 12V6.75l6-1.32v6.48L3 12zm17-9v8.75l-10 .15V5.21L20 3zM3 13l6 .09v6.81l-6-1.15V13zm17 .25V22l-10-1.91V13.1l10 .15z" />
        </svg>
      ),
      macos: (
        <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
        </svg>
      ),
      linux: (
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489.117.779.456 1.462 1.047 1.993.545.487 1.183.805 1.894.983.718.178 1.463.201 2.215.201.752 0 1.498-.023 2.215-.201.711-.178 1.349-.496 1.894-.983.591-.531.93-1.214 1.047-1.993.123-.805-.009-1.657-.287-2.489-.589-1.77-1.831-3.47-2.716-4.521-.75-1.067-.974-1.928-1.05-3.02-.065-1.491 1.056-5.965-3.17-6.298-.165-.013-.325-.021-.48-.021zm-.126 1.09c.99.063 1.783.569 2.172 1.443.376.844.413 1.903.199 2.999-.215 1.096-.687 2.23-1.357 3.18-.669.95-1.405 1.705-2.017 2.379-.611.674-1.074 1.252-1.316 1.857-.242.605-.262 1.233-.006 1.873.256.64.755 1.198 1.36 1.547.606.35 1.247.536 1.88.536.634 0 1.275-.186 1.88-.536.606-.349 1.105-.907 1.36-1.547.256-.64.236-1.268-.006-1.873-.242-.605-.705-1.183-1.316-1.857-.612-.674-1.348-1.429-2.017-2.379-.67-.95-1.142-2.084-1.357-3.18-.214-1.096-.177-2.155.199-2.999.389-.874 1.182-1.38 2.172-1.443z" />
        </svg>
      ),
      androidTV: (
        <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z" />
        </svg>
      ),
      appleTV: (
        <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z" />
        </svg>
      ),
    };

    // Step 1: Platform selection
    if (!selectedPlatform) {
      return (
        <Wrapper>
          <div className="flex items-center gap-3 border-b border-dark-800 p-4">
            {!isTelegramWebApp && (
              <button
                onClick={handleBack}
                className="-ml-2 rounded-xl p-2 text-dark-300 hover:bg-dark-800"
              >
                <BackIcon />
              </button>
            )}
            <h2 className="text-lg font-bold text-dark-100">
              {t('subscription.connection.selectPlatform')}
            </h2>
          </div>
          <div className="space-y-2 p-4">
            {availablePlatforms.map((platform) => {
              const apps = appConfig.platforms[platform];
              if (!apps?.length) return null;
              const isCurrentPlatform = platform === detectedPlatform;
              const appCount = apps.length;

              return (
                <button
                  key={platform}
                  onClick={() => setSelectedPlatform(platform)}
                  className={`flex w-full items-center gap-4 rounded-xl p-4 transition-all active:scale-[0.98] ${
                    isCurrentPlatform
                      ? 'bg-accent-500/10 ring-1 ring-accent-500/30'
                      : 'bg-dark-800/50 hover:bg-dark-800'
                  }`}
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                      isCurrentPlatform
                        ? 'bg-accent-500/20 text-accent-400'
                        : 'bg-dark-700 text-dark-300'
                    }`}
                  >
                    {platformIcons[platform] || <span className="text-xl">📱</span>}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-medium ${isCurrentPlatform ? 'text-accent-400' : 'text-dark-100'}`}
                      >
                        {platformNames[platform] || platform}
                      </span>
                      {isCurrentPlatform && (
                        <span className="rounded-full bg-accent-500/10 px-2 py-0.5 text-xs text-accent-500">
                          {t('subscription.connection.yourDevice')}
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-dark-400">
                      {appCount}{' '}
                      {appCount === 1
                        ? t('subscription.connection.app')
                        : t('subscription.connection.apps')}
                    </span>
                  </div>
                  <ChevronIcon />
                </button>
              );
            })}
          </div>
        </Wrapper>
      );
    }

    // Step 2: App selection for chosen platform
    const apps = appConfig.platforms[selectedPlatform] || [];
    const isCurrentPlatform = selectedPlatform === detectedPlatform;

    return (
      <Wrapper>
        <div className="flex items-center gap-3 border-b border-dark-800 p-4">
          {!isTelegramWebApp && (
            <button
              onClick={handleBack}
              className="-ml-2 rounded-xl p-2 text-dark-300 hover:bg-dark-800"
            >
              <BackIcon />
            </button>
          )}
          <div className="flex-1">
            <h2 className="text-lg font-bold text-dark-100">
              {platformNames[selectedPlatform] || selectedPlatform}
            </h2>
            {isCurrentPlatform && (
              <span className="text-xs text-accent-500">
                {t('subscription.connection.yourDevice')}
              </span>
            )}
          </div>
        </div>
        <div
          ref={scrollContainerRef}
          className={`${isMobile ? 'flex-1' : 'max-h-[60vh]'} overflow-y-auto p-4`}
          style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
          onWheel={handleScrollContainerWheel}
        >
          <div className="grid grid-cols-3 gap-3">
            {apps.map((app) => {
              const isSelected = selectedApp?.id === app.id;
              return (
                <button
                  key={app.id}
                  onClick={() => {
                    setSelectedApp(app);
                    setShowAppSelector(false);
                    setSelectedPlatform(null);
                  }}
                  className={`relative flex flex-col items-center rounded-xl p-4 transition-all active:scale-95 ${
                    isSelected
                      ? 'bg-accent-500/15 ring-2 ring-accent-500/50'
                      : 'bg-dark-800/50 hover:bg-dark-800'
                  }`}
                >
                  {/* Featured badge */}
                  {app.isFeatured && (
                    <div className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-accent-500 shadow-lg">
                      <svg
                        className="h-3.5 w-3.5 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </div>
                  )}
                  {/* App icon */}
                  <div
                    className={`mb-3 flex h-14 w-14 items-center justify-center rounded-2xl transition-colors ${
                      isSelected
                        ? 'bg-accent-500/20 text-accent-400'
                        : 'bg-dark-700/80 text-dark-300'
                    }`}
                  >
                    {getAppIcon(app.name)}
                  </div>
                  {/* App name */}
                  <span
                    className={`line-clamp-2 text-center text-sm font-medium leading-tight ${
                      isSelected ? 'text-accent-400' : 'text-dark-200'
                    }`}
                  >
                    {app.name}
                  </span>
                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute bottom-2 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-accent-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </Wrapper>
    );
  }

  // Main view
  return (
    <Wrapper>
      <div className="border-b border-dark-800 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-dark-100">{t('subscription.connection.title')}</h2>
          {!isTelegramWebApp && (
            <button
              onClick={handleClose}
              className="-mr-2 rounded-xl p-2 text-dark-400 hover:bg-dark-800"
            >
              <CloseIcon />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowAppSelector(true)}
          className="flex w-full items-center gap-3 rounded-xl bg-dark-800/50 p-3 transition-colors hover:bg-dark-800"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-500/10 text-accent-400">
            {selectedApp && getAppIcon(selectedApp.name)}
          </div>
          <div className="flex-1 text-left">
            <div className="font-medium text-dark-100">{selectedApp?.name}</div>
            <div className="text-sm text-dark-400">{t('subscription.connection.changeApp')}</div>
          </div>
          <ChevronIcon />
        </button>
      </div>

      <div
        className={`${isMobile ? 'flex-1' : 'max-h-[50vh]'} space-y-4 overflow-y-auto p-4`}
        style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
        onWheel={handleScrollContainerWheel}
      >
        {selectedApp?.installationStep && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-500/20 text-xs font-bold text-accent-400">
                1
              </span>
              <span className="font-medium text-dark-100">
                {t('subscription.connection.installApp')}
              </span>
            </div>
            <p className="ml-8 text-sm text-dark-400">
              {getLocalizedText(selectedApp.installationStep.description)}
            </p>
            {selectedApp.installationStep.buttons &&
              selectedApp.installationStep.buttons.length > 0 && (
                <div className="ml-8 flex flex-wrap gap-2">
                  {selectedApp.installationStep.buttons
                    .filter((btn) => isValidExternalUrl(btn.buttonLink))
                    .map((btn, idx) => (
                      <a
                        key={idx}
                        href={btn.buttonLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-dark-800 px-3 py-1.5 text-sm text-dark-200 hover:bg-dark-700"
                      >
                        {getLocalizedText(btn.buttonText)}
                      </a>
                    ))}
                </div>
              )}
          </div>
        )}

        {selectedApp?.addSubscriptionStep && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-500/20 text-xs font-bold text-accent-400">
                2
              </span>
              <span className="font-medium text-dark-100">
                {t('subscription.connection.addSubscription')}
              </span>
            </div>
            <p className="ml-8 text-sm text-dark-400">
              {getLocalizedText(selectedApp.addSubscriptionStep.description)}
            </p>
            <div className="ml-8 space-y-2">
              {selectedApp.deepLink && (
                <button
                  onClick={() => handleConnect(selectedApp)}
                  className="btn-primary flex h-11 w-full items-center justify-center gap-2 text-sm font-semibold"
                >
                  <LinkIcon />
                  {t('subscription.connection.addToApp', { appName: selectedApp.name })}
                </button>
              )}
              {/* Copy link button - hidden when hideLink is true */}
              {!appConfig?.hideLink && (
                <button
                  onClick={copySubscriptionLink}
                  className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-all ${
                    copied
                      ? 'border-success-500 bg-success-500/10 text-success-400'
                      : 'border-dark-600 text-dark-300 hover:bg-dark-800'
                  }`}
                >
                  {copied ? <CheckIcon /> : <CopyIcon />}
                  {copied
                    ? t('subscription.connection.copied')
                    : t('subscription.connection.copyLink')}
                </button>
              )}
            </div>
          </div>
        )}

        {selectedApp?.connectAndUseStep && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success-500/20 text-xs font-bold text-success-400">
                3
              </span>
              <span className="font-medium text-dark-100">
                {t('subscription.connection.connectVpn')}
              </span>
            </div>
            <p className="ml-8 text-sm text-dark-400">
              {getLocalizedText(selectedApp.connectAndUseStep.description)}
            </p>
          </div>
        )}
      </div>
    </Wrapper>
  );
}
